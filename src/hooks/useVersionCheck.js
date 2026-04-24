import { useEffect, useRef, useState } from "react";

const STORE_KEY = "haizur-last-version";
const POLL_MS = 60_000;

// Watches /version.json for changes. When the deployed version differs from
// the one this tab loaded, auto-reloads. On initial load, if the stored
// "last seen" version differs from the one we just fetched, flags the
// what's-new modal to open so the user sees a summary of the changes.
export const useVersionCheck = () => {
    const [notes, setNotes] = useState(null);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const currentVersionRef = useRef(null);

    // Initial fetch + first-load decision.
    useEffect(() => {
        let cancelled = false;
        fetch("/version.json", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data || !data.version) return;
                currentVersionRef.current = data.version;
                setNotes(data);
                let prev = null;
                try { prev = localStorage.getItem(STORE_KEY); } catch { /* noop */ }
                if (prev && prev !== data.version) {
                    setShowWhatsNew(true);
                } else if (!prev) {
                    try { localStorage.setItem(STORE_KEY, data.version); } catch { /* noop */ }
                }
            })
            .catch(() => { /* offline is fine */ });
        return () => { cancelled = true; };
    }, []);

    // Poll for new deploys. Only reload when the user is clearly idle —
    // tab hidden OR last activity > 45s ago. Prevents mid-typing interruptions
    // (previous bug: version.json bump caused full reloads while user was
    // mid-chat, yanking scroll to old messages and losing in-flight drafts).
    useEffect(() => {
        let reloading = false;
        let lastActivity = Date.now();
        let pendingVersion = null;

        const bumpActivity = () => { lastActivity = Date.now(); };
        const activityEvents = ["keydown", "pointerdown", "touchstart", "wheel", "scroll", "input"];
        activityEvents.forEach((ev) => window.addEventListener(ev, bumpActivity, { passive: true }));

        const isTypingNow = () => {
            const tag = document.activeElement?.tagName;
            return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
        };

        const reloadIfSafe = () => {
            if (reloading || !pendingVersion) return;
            const idle = document.hidden || (Date.now() - lastActivity) > 45_000;
            if (!idle) return;
            if (isTypingNow()) return;
            reloading = true;
            const url = new URL(window.location.href);
            url.searchParams.set("v", pendingVersion);
            window.location.replace(url.toString());
        };

        const check = () => {
            if (reloading || !currentVersionRef.current) return;
            fetch("/version.json", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (!data || !data.version) return;
                    if (data.version !== currentVersionRef.current) {
                        pendingVersion = data.version;
                        reloadIfSafe();
                    }
                })
                .catch(() => { /* offline is fine */ });
        };

        // Re-check safety periodically so a pending reload eventually fires
        // when user goes idle.
        const safetyTick = setInterval(reloadIfSafe, 15_000);

        const id = setInterval(check, POLL_MS);
        const onFocus = () => check();
        const onVisibility = () => { if (document.hidden) reloadIfSafe(); };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearInterval(id);
            clearInterval(safetyTick);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
            activityEvents.forEach((ev) => window.removeEventListener(ev, bumpActivity));
        };
    }, []);

    const dismiss = () => {
        setShowWhatsNew(false);
        const current = currentVersionRef.current;
        if (current) {
            try { localStorage.setItem(STORE_KEY, current); } catch { /* noop */ }
        }
    };

    return { notes, showWhatsNew, dismiss };
};
