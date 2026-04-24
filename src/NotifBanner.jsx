import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { firestore } from "./firebase";

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * NotifBanner — inline pill in LiveChat that walks the user through
 * enabling push notifications + capturing their email address for
 * fallback email notifications.
 *
 * Three states:
 *  - subscribe permission + get FCM token
 *  - collect email
 *  - collapsed into a tiny status chip
 */
export default function NotifBanner({ role, webPush }) {
    const { state, token, subscribe, error, markPromptDismissed, isPromptDismissed } = webPush;
    const [email, setEmail] = useState("");
    const [savedEmail, setSavedEmail] = useState(null);
    const [hidden, setHidden] = useState(() => isPromptDismissed());
    const [collapsed, setCollapsed] = useState(false);
    const [busy, setBusy] = useState(false);

    // Watch notif-prefs/{role} for saved email
    useEffect(() => {
        if (!role) return;
        const unsub = onSnapshot(doc(firestore, "notif-prefs", role), (snap) => {
            const d = snap.data();
            setSavedEmail(d?.email || null);
        }, () => { /* noop */ });
        return () => unsub();
    }, [role]);

    const handleEnable = async () => {
        setBusy(true);
        await subscribe();
        setBusy(false);
    };

    const handleSaveEmail = async () => {
        const trimmed = email.trim();
        if (!SIMPLE_EMAIL_RE.test(trimmed)) return;
        setBusy(true);
        try {
            await setDoc(doc(firestore, "notif-prefs", role), {
                role,
                email: trimmed,
                emailAddedAt: serverTimestamp(),
            }, { merge: true });
            setSavedEmail(trimmed);
            setEmail("");
        } catch { /* noop */ }
        setBusy(false);
    };

    const dismiss = () => {
        setHidden(true);
        markPromptDismissed();
    };

    if (hidden) return null;
    if (state === "unsupported") return null;

    // Fully wired: push token + email saved → show tiny status chip
    const fullyEnabled = state === "granted" && !!token && !!savedEmail;

    if (fullyEnabled && collapsed) return null;

    if (fullyEnabled) {
        return (
            <div
                style={{
                    padding: "6px 12px",
                    margin: "8px 12px 0",
                    borderRadius: 999,
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "var(--text-on-card)",
                    fontSize: 11.5,
                    fontFamily: "var(--font-handwritten)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "space-between",
                }}
            >
                <span>✅ Notifikasi & email aktif ({savedEmail})</span>
                <button
                    onClick={() => { setCollapsed(true); dismiss(); }}
                    aria-label="Hide"
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim-card)",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: "0 4px",
                    }}
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                    margin: "8px 12px 0",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-card)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--main-color)",
                    boxShadow: "0 2px 10px var(--shadow-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{
                        fontFamily: "var(--font-handwritten)",
                        fontSize: 13, fontWeight: 600,
                        color: "var(--main-color)",
                    }}>
                        {state !== "granted" ? "🔔 Aktifkan notifikasi biar ga telat baca pesan" : "📧 Tambahin email kamu (backup notif)"}
                    </span>
                    <button
                        onClick={dismiss}
                        aria-label="Dismiss"
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-dim-card)",
                            fontSize: 13,
                            cursor: "pointer",
                            padding: "0 4px",
                        }}
                    >✕</button>
                </div>

                {state !== "granted" && (
                    <>
                        <div style={{ fontSize: 11.5, color: "var(--text-dim-card)", lineHeight: 1.4 }}>
                            Chrome + iOS (setelah install ke home screen) akan kirim push notifikasi real-time pas partner ngirim pesan.
                        </div>
                        <button
                            onClick={handleEnable}
                            disabled={busy || state === "denied"}
                            style={{
                                alignSelf: "flex-start",
                                padding: "6px 14px",
                                borderRadius: 999,
                                background: state === "denied" ? "var(--bg-tertiary, var(--bg-color))" : "var(--main-color)",
                                color: state === "denied" ? "var(--text-dim-card)" : "var(--bg-color)",
                                border: "none",
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: "var(--font-handwritten)",
                                cursor: state === "denied" ? "not-allowed" : "pointer",
                            }}
                        >
                            {busy ? "Mengaktifkan…" :
                                state === "denied" ? "Izin ditolak — buka setting browser" :
                                state === "granted" ? "Sudah diizinkan ✓" : "Aktifkan notifikasi"}
                        </button>
                        {error && (
                            <div style={{ fontSize: 10.5, color: "var(--error-color, #ef4444)", fontFamily: "var(--font-mono)" }}>
                                {error}
                            </div>
                        )}
                    </>
                )}

                {state === "granted" && !savedEmail && (
                    <>
                        <div style={{ fontSize: 11.5, color: "var(--text-dim-card)", lineHeight: 1.4 }}>
                            Kalau HP/browser mati, notif tetap masuk email. Isi sekali aja.
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="kamu@email.com"
                                autoComplete="email"
                                style={{
                                    flex: 1,
                                    padding: "6px 10px",
                                    borderRadius: 8,
                                    background: "var(--bg-color)",
                                    color: "var(--text-on-card)",
                                    border: "1px solid var(--border-color)",
                                    fontSize: 12,
                                    outline: "none",
                                    fontFamily: "var(--font-body)",
                                }}
                            />
                            <button
                                onClick={handleSaveEmail}
                                disabled={busy || !SIMPLE_EMAIL_RE.test(email.trim())}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    background: "var(--main-color)",
                                    color: "var(--bg-color)",
                                    border: "none",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-handwritten)",
                                    cursor: SIMPLE_EMAIL_RE.test(email.trim()) ? "pointer" : "not-allowed",
                                    opacity: SIMPLE_EMAIL_RE.test(email.trim()) ? 1 : 0.5,
                                }}
                            >
                                Simpan
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
