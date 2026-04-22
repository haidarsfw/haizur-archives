import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Keyword → burst config. Checks are case-insensitive, whole-word loose —
// substrings are fine so "miss you sooo much" still triggers.
const TRIGGERS = [
    { id: "hearts", test: (t) => /\b(miss you|love you|rindu|sayang|kangen|missya)\b/i.test(t), variant: "hearts" },
    { id: "confetti", test: (t) => /\b(haha+|lmao|lol|wkwk|hehe{2,})\b/i.test(t), variant: "confetti" },
    { id: "moon", test: (t) => /\b(good\s*night|gn|selamat\s*malam|good\s*nite|nini|oyasumi)\b/i.test(t), variant: "moon" },
    { id: "wave", test: (t) => /\b(hi|hello|halo|hai|hey|hola|heiii+)\b/i.test(t), variant: "wave" },
];

export const shouldTriggerEffect = (text) => {
    if (!text || typeof text !== "string") return null;
    for (const t of TRIGGERS) {
        if (t.test(text)) return t.variant;
    }
    return null;
};

const heartsBurst = (count = 12) => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: -60 + Math.random() * 120,
    y: -20 - Math.random() * 40,
    delay: i * 0.06,
    scale: 0.6 + Math.random() * 0.8,
    emoji: ["💗", "❤️", "🩷", "💞", "🫶"][i % 5],
}));

const confettiPieces = (count = 30) => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: -80 + Math.random() * 160,
    y: 40 + Math.random() * 120,
    rot: -120 + Math.random() * 240,
    delay: Math.random() * 0.1,
    color: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#a855f7"][i % 6],
}));

const waveHands = (count = 5) => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: -40 + i * 20,
    delay: i * 0.08,
}));

// One-shot effect — unmounts itself after the animation finishes.
export default function MessageEffect({ variant, anchorRect, onDone }) {
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => { setMounted(false); onDone?.(); }, variant === "moon" ? 1500 : 1800);
        return () => clearTimeout(t);
    }, [variant, onDone]);

    if (!mounted || !anchorRect) return null;

    const cx = anchorRect.left + anchorRect.width / 2;
    const cy = anchorRect.top + anchorRect.height / 2;

    const container = {
        position: "fixed",
        left: cx,
        top: cy,
        pointerEvents: "none",
        zIndex: 60,
    };

    if (variant === "hearts") {
        return (
            <div style={container} aria-hidden>
                {heartsBurst().map((h) => (
                    <motion.span
                        key={h.id}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: h.x, y: h.y - 100, scale: h.scale }}
                        transition={{ duration: 1.5, delay: h.delay, ease: "easeOut" }}
                        style={{ position: "absolute", fontSize: 22 }}
                    >
                        {h.emoji}
                    </motion.span>
                ))}
            </div>
        );
    }

    if (variant === "confetti") {
        return (
            <div style={container} aria-hidden>
                {confettiPieces().map((c) => (
                    <motion.span
                        key={c.id}
                        initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: c.x, y: c.y, rotate: c.rot }}
                        transition={{ duration: 1.3, delay: c.delay, ease: "easeOut" }}
                        style={{
                            position: "absolute",
                            width: 6,
                            height: 10,
                            background: c.color,
                            borderRadius: 2,
                        }}
                    />
                ))}
            </div>
        );
    }

    if (variant === "moon") {
        return (
            <div style={{ ...container, left: 0, top: 0 }} aria-hidden>
                <motion.div
                    initial={{ opacity: 0, x: -120, y: 40 }}
                    animate={{ opacity: [0, 0.8, 0], x: window.innerWidth + 60, y: 20 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    style={{
                        position: "fixed",
                        fontSize: 56,
                        filter: "drop-shadow(0 0 12px rgba(255,255,255,0.35))",
                    }}
                >
                    🌙
                </motion.div>
            </div>
        );
    }

    if (variant === "wave") {
        return (
            <div style={container} aria-hidden>
                {waveHands().map((h) => (
                    <motion.span
                        key={h.id}
                        initial={{ opacity: 0, y: 0, rotate: -30 }}
                        animate={{ opacity: [0, 1, 0], y: -60, rotate: [0, 30, -30, 0] }}
                        transition={{ duration: 1.0, delay: h.delay }}
                        style={{ position: "absolute", left: h.x, fontSize: 24 }}
                    >
                        👋
                    </motion.span>
                ))}
            </div>
        );
    }

    return null;
}

// Host container that manages the queue of active effects triggered during
// message rendering. Consumers call `trigger(messageId, variant, rect)`.
export function useMessageEffects(enabledRef) {
    const [effects, setEffects] = useState([]);
    const playedRef = useRef(new Set());

    const trigger = (messageId, variant, rect) => {
        if (enabledRef?.current === false) return;
        if (!messageId || !variant || !rect) return;
        if (playedRef.current.has(messageId)) return;
        playedRef.current.add(messageId);
        const id = `${messageId}-${Date.now()}`;
        setEffects((arr) => [...arr, { id, variant, rect }]);
    };

    const remove = (id) => setEffects((arr) => arr.filter((e) => e.id !== id));

    const node = (
        <AnimatePresence>
            {effects.map((e) => (
                <MessageEffect
                    key={e.id}
                    variant={e.variant}
                    anchorRect={e.rect}
                    onDone={() => remove(e.id)}
                />
            ))}
        </AnimatePresence>
    );

    return { trigger, node, playedRef };
}
