import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    EMOJI_CATEGORIES,
    EMOJI_DATA,
    applySkinTone,
    searchEmojis,
    emojisByCategory,
} from "./utils/emojiKeywords";

const RECENTS_KEY = "haizur-emoji-recents";
const TONE_KEY = "haizur-emoji-tone";
const MAX_RECENTS = 16;
const LONG_PRESS_MS = 350;

const TONE_LABELS = ["Default", "🏻", "🏼", "🏽", "🏾", "🏿"];

function loadRecents() {
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.slice(0, MAX_RECENTS) : [];
    } catch { return []; }
}

function saveRecents(list) {
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS))); } catch { /* noop */ }
}

function loadTone() {
    try {
        const n = parseInt(localStorage.getItem(TONE_KEY) || "0", 10);
        return isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
    } catch { return 0; }
}

function saveTone(n) {
    try { localStorage.setItem(TONE_KEY, String(n)); } catch { /* noop */ }
}

/**
 * ChatEmojiPicker — searchable emoji picker with skin-tone support.
 *
 * Props:
 *  - onPick(emoji): called with resolved emoji (skin-tone applied)
 *  - compact?: bool — smaller grid for inline use in reaction popup
 *  - onToneChange?(idx): notify when user changes default tone (optional)
 */
export default function ChatEmojiPicker({ onPick, compact = false }) {
    const [query, setQuery] = useState("");
    const [activeCat, setActiveCat] = useState("smileys");
    const [tone, setTone] = useState(() => loadTone());
    const [recents, setRecents] = useState(() => loadRecents());
    const [tonePopup, setTonePopup] = useState(null); // { emoji, anchorRect }
    const longPressTimer = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => { saveTone(tone); }, [tone]);

    const isSearching = query.trim().length > 0;
    const searchResults = useMemo(() => (
        isSearching ? searchEmojis(query) : []
    ), [query, isSearching]);

    const displayEmojis = useMemo(() => {
        if (isSearching) return searchResults;
        if (activeCat === "recent") {
            return recents.map(c => ({ char: c, category: "recent", keywords: [] }));
        }
        return emojisByCategory(activeCat);
    }, [isSearching, searchResults, activeCat, recents]);

    const pickEmoji = useCallback((emoji) => {
        const finalChar = emoji.tonable ? applySkinTone(emoji.char, tone) : emoji.char;
        setRecents(prev => {
            const next = [finalChar, ...prev.filter(c => c !== finalChar)].slice(0, MAX_RECENTS);
            saveRecents(next);
            return next;
        });
        onPick(finalChar);
    }, [tone, onPick]);

    const onPointerDown = (e, emoji) => {
        if (!emoji.tonable) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            setTonePopup({ emoji, anchorRect: { left: rect.left, top: rect.top, width: rect.width } });
        }, LONG_PRESS_MS);
    };
    const cancelLongPress = () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    useEffect(() => () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const handleToneSelect = (idx) => {
        if (tonePopup?.emoji) {
            // Apply tone as one-off to this emoji + update default
            setTone(idx);
            onPick(applySkinTone(tonePopup.emoji.char, idx));
            setRecents(prev => {
                const finalChar = applySkinTone(tonePopup.emoji.char, idx);
                const next = [finalChar, ...prev.filter(c => c !== finalChar)].slice(0, MAX_RECENTS);
                saveRecents(next);
                return next;
            });
        }
        setTonePopup(null);
    };

    const gridCols = compact ? 7 : 8;
    const buttonSize = compact ? 32 : 36;

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                display: "flex", flexDirection: "column",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                width: compact ? 300 : "100%",
                maxWidth: compact ? 300 : undefined,
            }}
        >
            {/* Search */}
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-color)" }}>
                <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari emoji…"
                    autoComplete="off"
                    style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "var(--bg-secondary)",
                        color: "var(--text-color)",
                        border: "1px solid var(--border-color)",
                        outline: "none",
                        fontSize: 13,
                        fontFamily: "var(--font-body)",
                    }}
                />
            </div>

            {/* Category tabs (hidden when searching) */}
            {!isSearching && (
                <div
                    style={{
                        display: "flex",
                        gap: 2,
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--border-color)",
                        overflowX: "auto",
                        flexShrink: 0,
                    }}
                >
                    {EMOJI_CATEGORIES.map(cat => {
                        const active = activeCat === cat.id;
                        const disabled = cat.id === "recent" && recents.length === 0;
                        if (disabled) return null;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCat(cat.id)}
                                title={cat.label}
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: 8,
                                    background: active ? "var(--main-color-dim, rgba(255,255,255,0.1))" : "transparent",
                                    border: "none",
                                    fontSize: 16,
                                    cursor: "pointer",
                                    opacity: active ? 1 : 0.7,
                                    transition: "opacity 0.15s, background 0.15s",
                                    flexShrink: 0,
                                }}
                            >
                                {cat.icon}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Emoji grid */}
            <div
                style={{
                    padding: 8,
                    maxHeight: compact ? 180 : 240,
                    overflowY: "auto",
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: 2,
                }}
            >
                {displayEmojis.length === 0 ? (
                    <div style={{
                        gridColumn: `span ${gridCols}`,
                        textAlign: "center",
                        padding: 24,
                        color: "var(--sub-color)",
                        fontSize: 12,
                    }}>
                        {isSearching ? "Tidak ada emoji yang cocok" : "Tidak ada emoji"}
                    </div>
                ) : displayEmojis.map((e, i) => {
                    const displayChar = e.tonable ? applySkinTone(e.char, tone) : e.char;
                    return (
                        <button
                            key={`${e.char}-${i}`}
                            onClick={() => pickEmoji(e)}
                            onPointerDown={(ev) => onPointerDown(ev, e)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onPointerCancel={cancelLongPress}
                            style={{
                                width: buttonSize,
                                height: buttonSize,
                                fontSize: compact ? 20 : 22,
                                borderRadius: 8,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.12s, transform 0.12s",
                                lineHeight: 1,
                                padding: 0,
                            }}
                            onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                            onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                        >
                            {displayChar}
                        </button>
                    );
                })}
            </div>

            {/* Skin-tone popover */}
            <AnimatePresence>
                {tonePopup && (
                    <>
                        <div
                            onClick={() => setTonePopup(null)}
                            style={{ position: "fixed", inset: 0, zIndex: 70 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                            transition={{ duration: 0.14 }}
                            style={{
                                position: "fixed",
                                left: Math.max(8, (tonePopup.anchorRect?.left || 0) - 20),
                                top: Math.max(8, (tonePopup.anchorRect?.top || 0) - 48),
                                zIndex: 71,
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 999,
                                padding: "4px 6px",
                                display: "flex",
                                gap: 2,
                                boxShadow: "0 8px 24px var(--shadow-color)",
                            }}
                        >
                            {TONE_LABELS.map((_, idx) => {
                                const display = applySkinTone(tonePopup.emoji.char, idx);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleToneSelect(idx)}
                                        title={idx === 0 ? "Default" : `Tone ${idx}`}
                                        style={{
                                            width: 30, height: 30,
                                            fontSize: 20,
                                            border: tone === idx ? "2px solid var(--main-color)" : "2px solid transparent",
                                            borderRadius: "50%",
                                            background: "transparent",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {display}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
