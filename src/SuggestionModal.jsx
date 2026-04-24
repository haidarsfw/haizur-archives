import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    deleteDoc,
} from "firebase/firestore";
import { firestore } from "./firebase";

const PLACEHOLDER_EXAMPLE = `contoh: "adainn tema yang lucu kak biar vibesnya engga sedih.."`;
const SPECIAL_NOTE = "kakak mau buat memori yang bikin azhura engga lupain, mau yang memorable sampe azhura gabisa lupain, yaa walau pelupa.. <3";

function formatTs(ts) {
    if (!ts) return "";
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return `Hari ini, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        if (d.toDateString() === yesterday.toDateString()) return `Kemarin, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
}

function senderLabel(s) {
    if (s === "haidar") return "⭐ Haidar";
    if (s === "princess") return "👸 Princess";
    return s || "—";
}

export default function SuggestionModal({ currentRole, onClose }) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const q = query(collection(firestore, "suggestions"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => { console.log("suggestions:", err?.message); });
        return () => unsub();
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    useEffect(() => {
        setTimeout(() => textareaRef.current?.focus(), 180);
    }, []);

    const handleSubmit = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (!currentRole) { setError("Pilih role dulu"); return; }
        setSending(true);
        try {
            await addDoc(collection(firestore, "suggestions"), {
                text: trimmed,
                sender: currentRole,
                timestamp: serverTimestamp(),
                readBy: [currentRole],
            });
            setText("");
            setError(null);
            textareaRef.current?.focus();
        } catch (err) {
            console.error("suggestion send:", err);
            setError("Gagal kirim, coba lagi");
        }
        setSending(false);
    };

    const markRead = async (id, currentReadBy) => {
        if (!currentRole) return;
        if ((currentReadBy || []).includes(currentRole)) return;
        try {
            await updateDoc(doc(firestore, "suggestions", id), {
                readBy: arrayUnion(currentRole),
            });
        } catch { /* noop */ }
    };

    const deleteSuggestion = async (id) => {
        try { await deleteDoc(doc(firestore, "suggestions", id)); }
        catch { setError("Gagal hapus"); }
    };

    // Categorize: received (from partner) vs sent (from me)
    const received = items.filter(s => s.sender !== currentRole);
    const sent = items.filter(s => s.sender === currentRole);
    const unreadReceived = received.filter(s => !(s.readBy || []).includes(currentRole));

    // Auto-mark received as read when modal opens (short debounce so user sees badge briefly)
    useEffect(() => {
        if (!currentRole) return;
        const t = setTimeout(() => {
            unreadReceived.forEach(s => markRead(s.id, s.readBy));
        }, 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadReceived.length, currentRole]);

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="suggestion-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.72)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    zIndex: 9000,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 16,
                }}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 16 }}
                    transition={{ type: "spring", damping: 24, stiffness: 320 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: "min(460px, 100%)",
                        maxHeight: "90vh",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
                        display: "flex", flexDirection: "column",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: "16px 18px 12px",
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex", alignItems: "flex-start", gap: 12,
                    }}>
                        <div style={{ fontSize: 24, lineHeight: 1 }}>✉️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 20, fontWeight: 700,
                                color: "var(--text-on-card)",
                                lineHeight: 1.15,
                            }}>
                                Saran / pesan
                            </div>
                            <div style={{
                                fontSize: 12,
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-handwritten)",
                                marginTop: 2,
                                lineHeight: 1.35,
                            }}>
                                Tulis saran atau pesan untuk partnermu. Dia bakal lihat saat buka tombol ✉️ ini juga.
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            style={{
                                width: 30, height: 30,
                                borderRadius: "50%",
                                background: "transparent",
                                border: "1px solid var(--border-color)",
                                color: "var(--text-color)",
                                cursor: "pointer",
                                fontSize: 13,
                                flexShrink: 0,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Compose */}
                    <div style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--border-color)",
                    }}>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={PLACEHOLDER_EXAMPLE}
                            rows={3}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "var(--radius-card)",
                                background: "var(--bg-secondary)",
                                color: "var(--text-color)",
                                border: "1px solid var(--border-color)",
                                outline: "none",
                                fontSize: 13,
                                fontFamily: "var(--font-body)",
                                lineHeight: 1.5,
                                resize: "vertical",
                                minHeight: 72,
                                maxHeight: 160,
                            }}
                        />
                        <div style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 10,
                        }}>
                            <span style={{
                                fontSize: 10.5, color: "var(--text-dim)",
                                fontFamily: "var(--font-mono)",
                                letterSpacing: "0.04em",
                                marginRight: "auto",
                            }}>
                                {text.length > 0 ? `${text.length} karakter` : "Klik kotak di atas untuk mulai menulis"}
                            </span>
                            <button
                                onClick={handleSubmit}
                                disabled={sending || !text.trim()}
                                style={{
                                    padding: "7px 18px",
                                    borderRadius: 999,
                                    background: sending || !text.trim() ? "var(--bg-secondary)" : "var(--main-color)",
                                    color: sending || !text.trim() ? "var(--text-dim)" : "var(--bg-color)",
                                    border: "none",
                                    cursor: sending || !text.trim() ? "not-allowed" : "pointer",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-handwritten)",
                                    transition: "all 0.15s",
                                }}
                            >
                                {sending ? "Mengirim…" : "Kirim ✉️"}
                            </button>
                        </div>

                        {/* Special note — pinned love-letter style */}
                        <div style={{
                            marginTop: 14,
                            padding: "14px 16px",
                            borderRadius: "var(--radius-card)",
                            background: "rgba(212, 160, 84, 0.08)",
                            border: "1px solid rgba(212, 160, 84, 0.35)",
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
                        }}>
                            <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>💌</span>
                            <div>
                                <div style={{
                                    fontSize: 10,
                                    letterSpacing: "0.08em",
                                    color: "var(--main-color)",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 700,
                                    marginBottom: 6,
                                }}>
                                    CATATAN KECIL
                                </div>
                                <div style={{
                                    fontSize: 18,
                                    color: "var(--text-color)",
                                    fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                                    fontStyle: "italic",
                                    fontWeight: 500,
                                    lineHeight: 1.45,
                                    letterSpacing: "0.005em",
                                }}>
                                    “{SPECIAL_NOTE}”
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                marginTop: 8,
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "var(--error-color, #ef4444)",
                                fontSize: 11,
                                fontFamily: "var(--font-mono)",
                            }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* List */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "10px 14px 16px",
                        minHeight: 180,
                    }}>
                        {items.length === 0 ? (
                            <div style={{
                                textAlign: "center",
                                padding: "30px 10px 20px",
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-handwritten)",
                                fontSize: 13,
                                lineHeight: 1.5,
                            }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>💌</div>
                                Belum ada saran. Tulis yang pertama di atas.
                            </div>
                        ) : (
                            <>
                                {received.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{
                                            fontSize: 10, letterSpacing: "0.08em",
                                            color: "var(--main-color)", fontFamily: "var(--font-mono)",
                                            fontWeight: 700,
                                            padding: "0 4px 6px",
                                        }}>
                                            DARI {currentRole === "haidar" ? "PRINCESS" : "HAIDAR"} ({received.length})
                                        </div>
                                        {received.map((s) => {
                                            const isUnread = !(s.readBy || []).includes(currentRole);
                                            return (
                                                <div
                                                    key={s.id}
                                                    style={{
                                                        padding: "10px 12px",
                                                        borderRadius: "var(--radius-card)",
                                                        background: isUnread ? "rgba(212, 160, 84, 0.08)" : "var(--bg-secondary)",
                                                        border: `1px solid ${isUnread ? "var(--main-color)" : "var(--border-color)"}`,
                                                        marginBottom: 8,
                                                        transition: "background 0.25s, border-color 0.25s",
                                                    }}
                                                >
                                                    <div style={{
                                                        fontSize: 13,
                                                        color: "var(--text-color)",
                                                        lineHeight: 1.5,
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word",
                                                        fontFamily: "var(--font-body)",
                                                    }}>
                                                        {s.text}
                                                    </div>
                                                    <div style={{
                                                        marginTop: 6,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        fontSize: 10,
                                                        color: "var(--text-dim)",
                                                        fontFamily: "var(--font-mono)",
                                                        letterSpacing: "0.03em",
                                                    }}>
                                                        <span>{senderLabel(s.sender)}</span>
                                                        <span>{formatTs(s.timestamp)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {sent.length > 0 && (
                                    <div>
                                        <div style={{
                                            fontSize: 10, letterSpacing: "0.08em",
                                            color: "var(--text-dim)", fontFamily: "var(--font-mono)",
                                            fontWeight: 600,
                                            padding: "4px 4px 6px",
                                        }}>
                                            DARIKU ({sent.length})
                                        </div>
                                        {sent.map((s) => (
                                            <div
                                                key={s.id}
                                                style={{
                                                    padding: "10px 12px",
                                                    borderRadius: "var(--radius-card)",
                                                    background: "var(--bg-secondary)",
                                                    border: "1px solid var(--border-color)",
                                                    marginBottom: 8,
                                                    opacity: 0.88,
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: 13,
                                                    color: "var(--text-color)",
                                                    lineHeight: 1.5,
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak: "break-word",
                                                    fontFamily: "var(--font-body)",
                                                }}>
                                                    {s.text}
                                                </div>
                                                <div style={{
                                                    marginTop: 6,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    fontSize: 10,
                                                    color: "var(--text-dim)",
                                                    fontFamily: "var(--font-mono)",
                                                }}>
                                                    <span>{formatTs(s.timestamp)}</span>
                                                    <button
                                                        onClick={() => deleteSuggestion(s.id)}
                                                        style={{
                                                            padding: "2px 8px",
                                                            fontSize: 10,
                                                            background: "transparent",
                                                            color: "var(--text-dim)",
                                                            border: "1px solid var(--border-color)",
                                                            borderRadius: 6,
                                                            cursor: "pointer",
                                                            fontFamily: "var(--font-mono)",
                                                        }}
                                                    >
                                                        tarik kembali
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
