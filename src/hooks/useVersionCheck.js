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

    // Poll for new deploys. Reload as soon as we detect a mismatch.
    useEffect(() => {
        let reloading = false;
        const check = () => {
            if (reloading || !currentVersionRef.current) return;
            fetch("/version.json", { cache: "no-store" })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (!data || !data.version) return;
                    if (data.version !== currentVersionRef.current) {
                        reloading = true;
                        // Reload with a cache-busting query to force a fresh bundle.
                        const url = new URL(window.location.href);
                        url.searchParams.set("v", data.version);
                        window.location.replace(url.toString());
                    }
                })
                .catch(() => { /* offline is fine */ });
        };
        const id = setInterval(check, POLL_MS);
        const onFocus = () => check();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(id);
            window.removeEventListener("focus", onFocus);
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
