import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function usePresence(role) {
    const [partnerPresence, setPartnerPresence] = useState(null);
    const heartbeatRef = useRef(null);

    useEffect(() => {
        if (!role) return;

        const partnerRole = role === 'haidar' ? 'azhura' : 'haidar';
        const myPresenceRef = ref(db, `presence/${role}`);
        const partnerPresenceRef = ref(db, `presence/${partnerRole}`);

        // Set online
        const goOnline = () => {
            set(myPresenceRef, {
                online: true,
                lastSeen: Date.now(),
                role,
            });
        };

        goOnline();

        // Set offline on disconnect
        onDisconnect(myPresenceRef).set({
            online: false,
            lastSeen: Date.now(),
            role,
        });

        // Heartbeat
        heartbeatRef.current = setInterval(() => {
            set(myPresenceRef, {
                online: true,
                lastSeen: Date.now(),
                role,
            });
        }, HEARTBEAT_INTERVAL);

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
            set(myPresenceRef, {
                online: false,
                lastSeen: Date.now(),
                role,
            });
            unsubscribe();
        };
    }, [role]);

    return partnerPresence;
}

export function formatLastSeen(presence) {
    if (!presence) return null;

    if (presence.online) {
        // Check if heartbeat is recent (within 60s)
        const diff = Date.now() - (presence.lastSeen || 0);
        if (diff < 60000) return 'Online now';
    }

    if (!presence.lastSeen) return null;

    const diff = Date.now() - presence.lastSeen;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
