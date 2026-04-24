import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function formatTs(ts) {
    if (!ts) return "";
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
}

function deleterLabel(by) {
    if (by === "haidar") return "⭐ Haidar";
    if (by === "princess") return "👸 Princess";
    return "—";
}

function ContentPreview({ content }) {
    if (!content) return <span style={{ opacity: 0.5 }}>—</span>;
    if (content.image) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                    src={content.image}
                    alt="deleted"
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-handwritten)" }}>
                    📷 Foto{content.text ? ` · ${content.text}` : ""}
                </span>
            </div>
        );
    }
    if (content.sticker) {
        const isDataSticker = typeof content.sticker === "string" && content.sticker.startsWith("data:");
        return isDataSticker ? (
            <img src={content.sticker} alt="sticker" style={{ width: 44, height: 44, borderRadius: 8 }} />
        ) : (
            <span style={{ fontSize: 28 }}>{content.sticker}</span>
        );
    }
    if (content.voiceMessage) {
        return (
            <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-handwritten)", fontSize: 13 }}>
                🎵 Voice note {content.voiceDuration ? `· ${content.voiceDuration}s` : ""}
            </span>
        );
    }
    if (content.text) {
        return (
            <span style={{ color: "var(--text-color)", fontSize: 14, wordBreak: "break-word" }}>
                {content.text}
            </span>
        );
    }
    return <span style={{ opacity: 0.5 }}>—</span>;
}

/**
 * ChatArchivePanel — slide-in panel showing deleted messages with preserved content.
 *
 * Only messages with `deletedContent` appear (entries from before this feature had
 * their content nulled and are therefore not recoverable).
 */
export default function ChatArchivePanel({ items, onClose, onRestore }) {
    const [confirmingId, setConfirmingId] = useState(null);

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
                position: "absolute", top: 0, right: 0, bottom: 0,
                width: "min(360px, 92%)",
                zIndex: 32,
                background: "var(--bg-card)",
                borderLeft: "1px solid var(--border-color)",
                display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 30px var(--shadow-color)",
            }}
        >
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border-color)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🗄️</span>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                        <span style={{
                            fontFamily: "var(--font-handwritten)",
                            fontSize: 16, fontWeight: 700,
                            color: "var(--text-on-card)",
                        }}>
                            Pesan terhapus
                        </span>
                        <span style={{
                            fontSize: 11,
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-mono)",
                        }}>
                            {items.length} pesan bisa dipulihkan
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                        width: 32, height: 32,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-color)",
                        fontSize: 14,
                        cursor: "pointer",
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 20px" }}>
                {items.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-handwritten)",
                        fontSize: 14,
                        lineHeight: 1.5,
                    }}>
                        Belum ada pesan yang dihapus.
                        <br />
                        <span style={{ fontSize: 11, opacity: 0.7 }}>
                            Pesan yang dihapus sebelum fitur ini aktif tidak bisa dipulihkan.
                        </span>
                    </div>
                ) : items.map(item => {
                    const content = item.deletedContent || {};
                    return (
                        <div
                            key={item.id}
                            style={{
                                padding: 12,
                                borderRadius: "var(--radius-card)",
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                marginBottom: 8,
                            }}
                        >
                            <div style={{ marginBottom: 8 }}>
                                <ContentPreview content={content} />
                            </div>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                fontSize: 11,
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-mono)",
                                gap: 6,
                                marginBottom: 8,
                            }}>
                                <span>Dihapus oleh {deleterLabel(item.deletedBy)}</span>
                                <span>{formatTs(item.deletedAt)}</span>
                            </div>
                            <AnimatePresence mode="wait">
                                {confirmingId === item.id ? (
                                    <motion.div
                                        key="confirm"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.14 }}
                                        style={{ display: "flex", gap: 6 }}
                                    >
                                        <button
                                            onClick={() => { onRestore(item.id, content); setConfirmingId(null); }}
                                            style={{
                                                flex: 1,
                                                padding: "6px 10px",
                                                borderRadius: 8,
                                                background: "var(--main-color)",
                                                color: "var(--bg-color)",
                                                border: "none",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                fontFamily: "var(--font-handwritten)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Ya, pulihkan
                                        </button>
                                        <button
                                            onClick={() => setConfirmingId(null)}
                                            style={{
                                                padding: "6px 10px",
                                                borderRadius: 8,
                                                background: "transparent",
                                                color: "var(--text-dim)",
                                                border: "1px solid var(--border-color)",
                                                fontSize: 12,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Batal
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="restore"
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setConfirmingId(item.id)}
                                        style={{
                                            width: "100%",
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                            background: "transparent",
                                            color: "var(--main-color)",
                                            border: "1px solid var(--main-color)",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            fontFamily: "var(--font-handwritten)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        ↺ Pulihkan untuk keduanya
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
