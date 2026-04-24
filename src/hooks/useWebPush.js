import { useState, useEffect, useCallback, useRef } from "react";
import { doc, setDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { firestore, firebaseConfigPublic, getMessagingIfSupported } from "../firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const PROMPT_DISMISSED_KEY = "haizur-notif-prompt-dismissed";

export const NOTIF_STATE = {
    UNSUPPORTED: "unsupported",
    DEFAULT: "default",
    DENIED: "denied",
    GRANTED: "granted",
};

/**
 * useWebPush — subscribes the current user to Firebase Cloud Messaging.
 *
 * - Registers /firebase-messaging-sw.js with the public Firebase config as
 *   query params so the worker can initialize without a build step.
 * - Requests permission, retrieves the FCM token, and writes it to Firestore
 *   at notif-prefs/{role}.fcmTokens[token] = true + lastSeenAt = serverTimestamp.
 * - Receives foreground messages so a browser notification can still appear
 *   while the tab is open (consumer decides whether to suppress).
 */
export function useWebPush(role) {
    const [state, setState] = useState(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return NOTIF_STATE.UNSUPPORTED;
        return Notification.permission;
    });
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);
    const registrationRef = useRef(null);
    const unsubOnMessageRef = useRef(null);

    const persistToken = useCallback(async (newToken) => {
        if (!role || !newToken) return;
        try {
            await setDoc(doc(firestore, "notif-prefs", role), {
                role,
                [`fcmTokens.${newToken}`]: {
                    createdAt: serverTimestamp(),
                    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
                },
                lastSeenAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.warn("persist FCM token failed:", err?.message);
        }
    }, [role]);

    const subscribe = useCallback(async () => {
        setError(null);
        if (typeof window === "undefined" || !("Notification" in window)) {
            setState(NOTIF_STATE.UNSUPPORTED);
            return null;
        }
        if (!("serviceWorker" in navigator)) {
            setError("Service worker not supported on this browser");
            setState(NOTIF_STATE.UNSUPPORTED);
            return null;
        }
        if (!VAPID_KEY) {
            setError("VITE_FIREBASE_VAPID_KEY env missing");
            return null;
        }

        try {
            const permission = await Notification.requestPermission();
            setState(permission);
            if (permission !== "granted") return null;

            // Register SW with public config as query params so the worker
            // can boot without knowing env vars.
            const cfg = firebaseConfigPublic;
            const params = new URLSearchParams({
                apiKey: cfg.apiKey || "",
                authDomain: cfg.authDomain || "",
                projectId: cfg.projectId || "",
                storageBucket: cfg.storageBucket || "",
                messagingSenderId: cfg.messagingSenderId || "",
                appId: cfg.appId || "",
            });
            const swUrl = `/firebase-messaging-sw.js?${params.toString()}`;

            let registration = registrationRef.current;
            if (!registration) {
                registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
                registrationRef.current = registration;
            }
            // Wait until the worker is active before requesting a token
            if (registration.installing || registration.waiting) {
                await new Promise((resolve) => {
                    const sw = registration.installing || registration.waiting;
                    if (!sw) return resolve();
                    sw.addEventListener("statechange", function onChange() {
                        if (sw.state === "activated") { sw.removeEventListener("statechange", onChange); resolve(); }
                    });
                });
            }

            const messaging = await getMessagingIfSupported();
            if (!messaging) {
                setError("Firebase Messaging not supported here");
                setState(NOTIF_STATE.UNSUPPORTED);
                return null;
            }

            const fetched = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });
            if (!fetched) {
                setError("No FCM token returned");
                return null;
            }
            setToken(fetched);
            await persistToken(fetched);

            // Foreground messages — consumer can choose to show toast
            if (unsubOnMessageRef.current) unsubOnMessageRef.current();
            unsubOnMessageRef.current = onMessage(messaging, (payload) => {
                const data = payload.data || payload.notification || {};
                const title = data.title || "Pesan baru";
                const body = data.body || "";
                // Best-effort browser notification for the foreground case.
                // The service worker handles background.
                if (Notification.permission === "granted") {
                    try {
                        new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
                    } catch { /* some browsers block in-page Notification() */ }
                }
            });
            return fetched;
        } catch (err) {
            console.error("useWebPush subscribe failed:", err);
            setError(err?.message || "Subscribe failed");
            return null;
        }
    }, [persistToken]);

    const unsubscribe = useCallback(async () => {
        if (!role || !token) return;
        try {
            await setDoc(doc(firestore, "notif-prefs", role), {
                [`fcmTokens.${token}`]: deleteField(),
            }, { merge: true });
        } catch { /* noop */ }
        setToken(null);
    }, [role, token]);

    // Cleanup foreground listener on unmount
    useEffect(() => () => {
        if (unsubOnMessageRef.current) { unsubOnMessageRef.current(); unsubOnMessageRef.current = null; }
    }, []);

    const markPromptDismissed = useCallback(() => {
        try { localStorage.setItem(PROMPT_DISMISSED_KEY, "1"); } catch { /* noop */ }
    }, []);

    const isPromptDismissed = useCallback(() => {
        try { return localStorage.getItem(PROMPT_DISMISSED_KEY) === "1"; } catch { return false; }
    }, []);

    return {
        state,
        token,
        error,
        subscribe,
        unsubscribe,
        markPromptDismissed,
        isPromptDismissed,
    };
}
