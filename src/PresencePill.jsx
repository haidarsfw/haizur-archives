import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatLastSeen } from "./hooks/usePresence";

// Compact presence pill, anchored bottom-left. Collapses to a 36px dot on
// mobile so it does not steal the viewport; expands on tap to show the
// full card. Sits at z-30 so it never occludes the theme popup at z-50.
export default function PresencePill({ partnerPresence, currentRole, isMobile }) {
    const [expanded, setExpanded] = useState(false);
    const [tick, setTick] = useState(0); // re-compute time strings every 30s
    const rootRef = useRef(null);

    useEffect(() => {
        const id = setInterval(() => setTick((n) => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!expanded) return;
        const onClick = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setExpanded(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [expanded]);

    if (!partnerPresence) return null;

    const isOnline = !!partnerPresence.online;
    const partnerIsPrincess = currentRole === "haidar";
    const partnerName = partnerIsPrincess ? "Princess" : "My Prince";
    const initial = partnerIsPrincess ? "P" : "H";
    const statusShort = isOnline ? "online" : formatLastSeen(partnerPresence) || "offline";
    // Hint the stale-closure-aware re-render; `tick` is intentional.
    void tick;

    const formatTimeInfo = (ts) => {
        if (!ts) return "Unknown";
        const d = new Date(ts);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    };

    return (
        <div
            ref={rootRef}
            style={{
                position: "fixed",
                left: 16,
                bottom: isMobile ? 60 : 72,
                zIndex: 30,
                fontFamily: "var(--font-body)",
            }}
        >
            <motion.button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={`${partnerName} · ${statusShort}. Click to expand.`}
                aria-expanded={expanded}
                initial={false}
                animate={{ scale: 1 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: expanded ? "6px 12px 6px 8px" : "4px 10px 4px 6px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 999,
                    boxShadow: "0 4px 16px var(--shadow-color)",
                    cursor: "pointer",
                    color: "var(--text-on-card)",
                    maxWidth: 180,
                }}
            >
                {/* colored dot + initial */}
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, flexShrink: 0 }}>
                    <span style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: isOnline ? "var(--success-color)" : "var(--sub-color)",
                        opacity: isOnline ? 0.85 : 0.55,
                    }} />
                    {isOnline && (
                        <span className="animate-pulse" style={{
                            position: "absolute", inset: -3, borderRadius: "50%",
                            background: "var(--success-color)", opacity: 0.25,
                        }} />
                    )}
                    <span style={{
                        position: "relative",
                        fontSize: 11, fontWeight: 700,
                        color: "var(--bg-card)",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1,
                    }}>{initial}</span>
                </span>

                {/* label + short status */}
                <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 0, lineHeight: 1.15, overflow: "hidden", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-on-card)", fontFamily: "var(--font-handwritten)" }}>
                        {partnerName}
                    </span>
                    <span style={{ fontSize: 10.5, color: isOnline ? "var(--success-color)" : "var(--text-dim-card)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
                        {statusShort}
                    </span>
                </span>
            </motion.button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                        role="dialog"
                        aria-label={`${partnerName} presence details`}
                        style={{
                            position: "absolute",
                            bottom: "calc(100% + 8px)",
                            left: 0,
                            minWidth: 220,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-card)",
                            padding: "12px 14px",
                            boxShadow: "0 12px 30px var(--shadow-color)",
                            transform: "rotate(-0.5deg)",
                        }}
                    >
                        <div style={{
                            position: "absolute", top: -6, left: "50%",
                            transform: "translateX(-50%) rotate(1deg)",
                            width: 36, height: 8,
                            background: "var(--tape-color, rgba(212, 160, 84, 0.45))",
                            borderRadius: 1, opacity: 0.85,
                        }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "var(--success-color)" : "var(--sub-color)" }} />
                                <span style={{ fontSize: 15, fontFamily: "var(--font-handwritten)", color: "var(--text-on-card)", fontWeight: 600 }}>
                                    {partnerName}
                                </span>
                                <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)", color: isOnline ? "var(--success-color)" : "var(--text-dim-card)" }}>
                                    {isOnline ? "online now" : formatLastSeen(partnerPresence) || "offline"}
                                </span>
                            </div>

                            {!isOnline && partnerPresence.lastSeen && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                                    <span style={{ color: "var(--text-dim-card)" }}>last seen</span>
                                    <span style={{ color: "var(--text-dim-card)" }}>{formatTimeInfo(partnerPresence.lastSeen)}</span>
                                </div>
                            )}

                            {partnerPresence.lastLogin && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", paddingTop: 4, borderTop: "1px dashed var(--border-color)" }}>
                                    <span style={{ color: "var(--text-dim-card)" }}>last login</span>
                                    <span style={{ color: "var(--text-dim-card)" }}>{formatTimeInfo(partnerPresence.lastLogin)}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
