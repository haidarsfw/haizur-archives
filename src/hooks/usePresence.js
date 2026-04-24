import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { ref, set, onValue, onDisconnect, update } from 'firebase/database';

const HEARTBEAT_INTERVAL = 10000; // 10 seconds — trade write volume for snappier online dot
const ACTIVITY_THROTTLE_MS = 5000;

export function usePresence(role) {
    const [partnerPresence, setPartnerPresence] = useState(null);
    const heartbeatRef = useRef(null);
    const roleRef = useRef(role);
    useEffect(() => { roleRef.current = role; }, [role]);

    useEffect(() => {
        if (!role) return;

        const partnerRole = role === 'haidar' ? 'azhura' : 'haidar';
        const myPresenceRef = ref(db, `presence/${role}`);
        const partnerPresenceRef = ref(db, `presence/${partnerRole}`);

        // Set online
        const goOnline = () => {
            // First read existing data to preserve lastLogin if recently logged in,
            // or we just set it now.
            set(myPresenceRef, {
                online: true,
                lastSeen: Date.now(),
                lastLogin: Date.now(), // Update login time
                chatActive: false,
                role,
            });
        };

        goOnline();

        // Set offline on disconnect
        onDisconnect(myPresenceRef).set({
            online: false,
            lastSeen: Date.now(),
            chatActive: false,
            role,
        });

        // Heartbeat
        heartbeatRef.current = setInterval(() => {
            update(myPresenceRef, {
                online: true,
                lastSeen: Date.now(),
                role,
            });
        }, HEARTBEAT_INTERVAL);

        // Bump lastSeen on real user activity (throttled) — guarantees the
        // online dot stays green even if the heartbeat interval is paused
        // by browser throttling in inactive tabs.
        let lastActivityWrite = 0;
        const onActivity = () => {
            const now = Date.now();
            if (now - lastActivityWrite < ACTIVITY_THROTTLE_MS) return;
            lastActivityWrite = now;
            update(myPresenceRef, { online: true, lastSeen: now, role });
        };
        const events = ["keydown", "pointerdown", "touchstart", "scroll"];
        events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

        const onVisibility = () => {
            if (!document.hidden) onActivity();
        };
        document.addEventListener("visibilitychange", onVisibility);

        // Listen for partner
        const unsubscribe = onValue(partnerPresenceRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setPartnerPresence(data);
            }
        });

        // Cleanup
        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            events.forEach((ev) => window.removeEventListener(ev, onActivity));
            document.removeEventListener("visibilitychange", onVisibility);
            set(myPresenceRef, {
                online: false,
                lastSeen: Date.now(),
                chatActive: false,
                role,
            });
            unsubscribe();
        };
    }, [role]);

    return partnerPresence;
}

// Mark chat tab as active / inactive. Called by LiveChat.jsx based on tab
// visibility + focus. Server-side /api/notify reads this to skip pushing when
// the recipient is clearly watching the chat already.
export function useChatActiveSignal(role, isActive) {
    const lastRef = useRef(null);
    useEffect(() => {
        if (!role) return;
        // Skip redundant writes
        const key = `${role}:${isActive ? 1 : 0}`;
        if (lastRef.current === key) return;
        lastRef.current = key;
        try {
            update(ref(db, `presence/${role}`), {
                chatActive: !!isActive,
                lastSeen: Date.now(),
            });
        } catch { /* noop */ }
    }, [role, isActive]);
}

export function formatLastSeen(presence) {
    if (!presence || !presence.lastSeen) return null;

    // Treat as online when lastSeen is fresh regardless of `online` flag,
    // because onDisconnect sometimes races with fast navigations.
    const diff = Date.now() - presence.lastSeen;
    if (diff < 45000) return 'Online now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
