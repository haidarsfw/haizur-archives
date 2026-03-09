import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFullHistory, SPEAKERS, PLATFORMS } from './dataLoader';
import PlatformIcon from './PlatformIcons';

export default function TimelineRace({ theme }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [round, setRound] = useState([]);
    const [userOrder, setUserOrder] = useState([]);
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        loadFullHistory().then(data => {
            // Filter to text messages with dates
            const textMsgs = (data || []).filter(m => m.text && m.text.length > 15 && m.text.length < 120 && m.date);
            setHistory(textMsgs);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    const generateRound = () => {
        if (history.length < 4) return;
        setChecking(false);
        setResult(null);
        setUserOrder([]);

        // Pick 4 messages from different dates
        const usedDates = new Set();
        const picks = [];
        let attempts = 0;
        while (picks.length < 4 && attempts < 200) {
            const idx = Math.floor(Math.random() * history.length);
            const msg = history[idx];
            if (!usedDates.has(msg.date)) {
                usedDates.add(msg.date);
                picks.push({ ...msg, originalIndex: picks.length });
            }
            attempts++;
        }
        if (picks.length < 4) return;

        // Sort by date for correct order
        const sorted = [...picks].sort((a, b) => a.date.localeCompare(b.date));
        // Assign correct position
        sorted.forEach((m, i) => { m.correctPos = i; });
        // Shuffle for display
        const shuffled = [...sorted].sort(() => Math.random() - 0.5);
        setRound(shuffled);
    };

    useEffect(() => {
        if (history.length >= 4) generateRound();
    }, [history]);

    const handlePick = (msg) => {
        if (checking) return;
        if (userOrder.includes(msg)) return;
        const newOrder = [...userOrder, msg];
        setUserOrder(newOrder);

        if (newOrder.length === 4) {
            setChecking(true);
            // Check if order is correct
            const isCorrect = newOrder.every((m, i) => m.correctPos === i);
            setResult(isCorrect);
            setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
            setStreak(isCorrect ? streak + 1 : 0);
        }
    };

    const undoLast = () => {
        if (checking) return;
        setUserOrder(prev => prev.slice(0, -1));
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                    Loading timeline...
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', maxWidth: 640, margin: '0 auto', padding: '0 20px 80px',
            fontFamily: 'var(--font-body)',
        }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
                    fontStyle: 'italic', color: 'var(--text-color)', margin: 0,
                }}>
                    Timeline Race
                </h2>
                <p style={{ fontSize: 15, color: 'var(--sub-color)', marginTop: 6, fontFamily: 'var(--font-handwritten)' }}>
                    put these messages in chronological order ⏱️
                </p>
                <div style={{
                    display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12,
                    fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-dim)',
                }}>
                    <span>Score: {score.correct}/{score.total}</span>
                    {streak > 1 && <span style={{ color: 'var(--main-color)' }}>🔥 {streak} streak</span>}
                </div>
            </div>

            {/* Selected Order */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: `2px solid ${userOrder[i] ? 'var(--main-color)' : 'var(--border-color)'}`,
                            background: userOrder[i] ? 'var(--main-color-dim)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 700, color: 'var(--main-color)',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {userOrder[i] ? i + 1 : ''}
                    </div>
                ))}
                {userOrder.length > 0 && !checking && (
                    <button
                        onClick={undoLast}
                        style={{
                            padding: '8px 12px', borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border-color)',
                            background: 'transparent', color: 'var(--text-dim)',
                            cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
                        }}
                    >
                        ↩ Undo
                    </button>
                )}
            </div>

            {/* Messages to order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {round.map((msg, i) => {
                    const orderIdx = userOrder.indexOf(msg);
                    const isPicked = orderIdx !== -1;
                    let borderCol = 'var(--border-color)';
                    let bg = 'var(--bg-card)';
                    if (checking) {
                        if (orderIdx !== -1 && orderIdx === msg.correctPos) {
                            bg = 'rgba(92, 184, 112, 0.15)'; borderCol = 'var(--success-color)';
                        } else if (orderIdx !== -1) {
                            bg = 'rgba(224, 85, 85, 0.15)'; borderCol = 'var(--error-color)';
                        }
                    }

                    return (
                        <motion.div
                            key={i}
                            whileHover={!checking ? { scale: 1.01 } : {}}
                            onClick={() => handlePick(msg)}
                            style={{
                                padding: '18px 20px', borderRadius: 'var(--radius-card)',
                                background: bg, border: `2px solid ${borderCol}`,
                                cursor: checking ? 'default' : 'pointer',
                                opacity: isPicked && !checking ? 0.5 : 1,
                                transition: 'all 0.2s',
                                position: 'relative',
                            }}
                        >
                            {isPicked && (
                                <span style={{
                                    position: 'absolute', top: -8, left: -8,
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'var(--main-color)', color: 'var(--bg-color)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                }}>
                                    {orderIdx + 1}
                                </span>
                            )}
                            <div style={{
                                fontSize: 15, color: 'var(--text-on-card)',
                                fontFamily: 'var(--font-body)', lineHeight: 1.5,
                            }}>
                                "{msg.text}"
                            </div>
                            <div style={{
                                marginTop: 8, fontSize: 12, color: 'var(--text-dim-card)',
                                fontFamily: 'var(--font-mono)', display: 'flex', gap: 8,
                            }}>
                                <span>{SPEAKERS[msg.speaker]?.name}</span>
                                {msg.platform && (
                                    <PlatformIcon platform={msg.platform} size={13} />
                                )}
                                {checking && (
                                    <span style={{ color: 'var(--main-color)', fontWeight: 600 }}>
                                        📅 {msg.date}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Result */}
            {checking && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginTop: 28 }}
                >
                    <div style={{
                        fontSize: 24, fontFamily: 'var(--font-display)', fontStyle: 'italic',
                        color: result ? 'var(--success-color)' : 'var(--error-color)',
                        marginBottom: 16,
                    }}>
                        {result ? '✨ Perfect order!' : '😅 Not quite right!'}
                    </div>
                    <button
                        onClick={generateRound}
                        style={{
                            padding: '14px 36px', background: 'var(--main-color)',
                            color: 'var(--bg-color)', border: 'none',
                            borderRadius: 'var(--radius-card)', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
                        }}
                    >
                        Next Round →
                    </button>
                </motion.div>
            )}
        </div>
    );
}
