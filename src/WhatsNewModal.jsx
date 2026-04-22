import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WhatsNewModal({ notes, open, onDismiss }) {
    const highlights = (notes?.highlights) || [];
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                    onClick={onDismiss}
                >
                    <motion.div
                        initial={{ scale: 0.92, y: 16, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.92, y: 16, opacity: 0 }}
                        transition={{ type: "spring", damping: 22, stiffness: 340 }}
                        className="w-full max-w-md"
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-card)",
                            padding: "26px 24px 20px",
                            boxShadow: "0 20px 50px var(--shadow-color)",
                            position: "relative",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="whats-new-title"
                    >
                        <div
                            aria-hidden
                            style={{
                                position: "absolute", top: -10, left: "50%",
                                transform: "translateX(-50%) rotate(-2deg)",
                                width: 64, height: 14,
                                background: "var(--tape-color, rgba(212, 160, 84, 0.5))",
                                opacity: 0.85, borderRadius: 1,
                            }}
                        />

                        <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>✨</div>
                        <h2
                            id="whats-new-title"
                            style={{
                                margin: 0,
                                fontFamily: "var(--font-display)",
                                fontSize: 24, fontStyle: "italic",
                                color: "var(--text-on-card)",
                            }}
                        >
                            Ada yang baru
                        </h2>
                        <p
                            style={{
                                margin: "4px 0 18px",
                                fontFamily: "var(--font-handwritten)",
                                fontSize: 15, color: "var(--text-dim-card)",
                            }}
                        >
                            Web-nya habis di-update. Ini yang baru:
                        </p>

                        <ul
                            style={{
                                listStyle: "none", padding: 0, margin: 0,
                                display: "flex", flexDirection: "column", gap: 10,
                            }}
                        >
                            {highlights.map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.06 * i }}
                                    style={{
                                        display: "flex", gap: 10, alignItems: "flex-start",
                                        fontSize: 14, lineHeight: 1.5,
                                        color: "var(--text-on-card)",
                                        fontFamily: "var(--font-body)",
                                    }}
                                >
                                    <span style={{ color: "var(--main-color)", flexShrink: 0, marginTop: 1 }}>·</span>
                                    <span>{item}</span>
                                </motion.li>
                            ))}
                        </ul>

                        <button
                            onClick={onDismiss}
                            style={{
                                marginTop: 22, padding: "11px 24px",
                                background: "var(--main-color)", color: "var(--bg-color)",
                                border: "none", borderRadius: "var(--radius-card)",
                                cursor: "pointer",
                                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                                width: "100%",
                                transition: "transform 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                        >
                            oke, makasih :)
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
