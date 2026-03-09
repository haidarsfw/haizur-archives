import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFullHistory, SPEAKERS, PLATFORMS } from './dataLoader';
import PlatformIcon from './PlatformIcons';

export default function ChatRoulette({ theme }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [spinCount, setSpinCount] = useState(0);
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        loadFullHistory().then(data => {
            const textMsgs = (data || []).filter(m => m.text && m.text.length > 5 && m.text.length < 300);
            setHistory(textMsgs);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    const spin = () => {
        if (spinning || history.length === 0) return;
        setSpinning(true);
        setResult(null);

        // Animate through several random messages quickly
        let count = 0;
        const maxCount = 12 + Math.floor(Math.random() * 8);
        const interval = setInterval(() => {
            const idx = Math.floor(Math.random() * history.length);
            setResult(history[idx]);
            count++;
            if (count >= maxCount) {
                clearInterval(interval);
                // Final pick
                const finalIdx = Math.floor(Math.random() * history.length);
                setResult(history[finalIdx]);
                setSpinning(false);
                setSpinCount(c => c + 1);
            }
        }, 80 + count * 15);
    };

    const toggleFavorite = () => {
        if (!result) return;
        setFavorites(prev => {
            const exists = prev.find(f => f.text === result.text && f.date === result.date);
            if (exists) return prev.filter(f => f !== exists);
            return [...prev, result];
        });
    };

    const isFavorited = result && favorites.some(f => f.text === result.text && f.date === result.date);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                    Loading messages...
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 20px 80px',
            fontFamily: 'var(--font-body)', textAlign: 'center',
        }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
                    fontStyle: 'italic', color: 'var(--text-color)', margin: 0,
                }}>
                    Chat Roulette
                </h2>
                <p style={{ fontSize: 15, color: 'var(--sub-color)', marginTop: 6, fontFamily: 'var(--font-handwritten)' }}>
                    spin to discover a random message from your history 🎰
                </p>
                <div style={{
                    fontSize: 13, color: 'var(--text-dim)', marginTop: 8,
                    fontFamily: 'var(--font-mono)',
                }}>
                    {history.length.toLocaleString()} messages in the pool
                    {spinCount > 0 && <span> · {spinCount} spins</span>}
                    {favorites.length > 0 && <span> · ❤️ {favorites.length} saved</span>}
                </div>
            </div>

            {/* Slot Machine Display */}
            <div style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '40px 28px',
                minHeight: 200,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px var(--shadow-color)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative slots border */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                    background: 'var(--gradient-primary)',
                }} />

                <AnimatePresence mode="wait">
                    {result ? (
                        <motion.div
                            key={result.text + result.date}
                            initial={{ opacity: 0, y: spinning ? -20 : 0, scale: spinning ? 0.95 : 1 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: spinning ? 0.05 : 0.3 }}
                        >
                            <p style={{
                                margin: 0, fontSize: spinning ? 16 : 20, lineHeight: 1.6,
                                color: 'var(--text-on-card)',
                                fontFamily: 'var(--font-handwritten)', fontWeight: 400,
                                filter: spinning ? 'blur(1px)' : 'none',
                                transition: 'filter 0.2s',
                            }}>
                                "{result.text}"
                            </p>
                            {!spinning && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    style={{
                                        marginTop: 16, display: 'flex', gap: 12,
                                        justifyContent: 'center', alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <span style={{
                                        fontFamily: 'var(--font-display)', fontStyle: 'italic',
                                        fontSize: 15, color: 'var(--main-color)',
                                    }}>
                                        — {SPEAKERS[result.speaker]?.name}
                                    </span>
                                    <span style={{
                                        fontSize: 13, color: 'var(--text-dim-card)',
                                        fontFamily: 'var(--font-mono)',
                                    }}>
                                        {result.date}
                                    </span>
                                    {result.platform && (
                                        <span style={{
                                            fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4,
                                        }}>
                                            <PlatformIcon platform={result.platform} size={13} /> {PLATFORMS[result.platform]?.label}
                                        </span>
                                    )}
                                    {result.time && (
                                        <span style={{ fontSize: 12, color: 'var(--text-dim-card)', fontFamily: 'var(--font-mono)' }}>
                                            {result.time.slice(0, 5)}
                                        </span>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div style={{ fontSize: 56, marginBottom: 12 }}>🎰</div>
                            <p style={{
                                fontSize: 16, color: 'var(--sub-color)',
                                fontFamily: 'var(--font-handwritten)',
                            }}>
                                press spin to reveal a random message
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div style={{
                display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={spin}
                    disabled={spinning}
                    style={{
                        padding: '16px 40px', background: 'var(--main-color)',
                        color: 'var(--bg-color)', border: 'none',
                        borderRadius: 'var(--radius-card)', cursor: spinning ? 'wait' : 'pointer',
                        fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 700,
                        boxShadow: '0 4px 16px var(--shadow-color)',
                        opacity: spinning ? 0.7 : 1,
                    }}
                >
                    {spinning ? '🎰 Spinning...' : '🎰 Spin!'}
                </motion.button>
                {result && !spinning && (
                    <button
                        onClick={toggleFavorite}
                        style={{
                            padding: '16px 20px', background: 'transparent',
                            color: isFavorited ? 'var(--error-color)' : 'var(--text-dim)',
                            border: `1px solid ${isFavorited ? 'var(--error-color)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-card)', cursor: 'pointer',
                            fontSize: 18,
                        }}
                    >
                        {isFavorited ? '❤️' : '🤍'}
                    </button>
                )}
            </div>

            {/* Saved Favorites */}
            {favorites.length > 0 && (
                <div style={{ marginTop: 40, textAlign: 'left' }}>
                    <div style={{
                        fontFamily: 'var(--font-handwritten)', fontSize: 18,
                        color: 'var(--sub-color-light)', marginBottom: 12,
                    }}>
                        ❤️ saved messages ({favorites.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {favorites.slice(-5).reverse().map((fav, i) => (
                            <div key={i} style={{
                                padding: '12px 16px', background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-card)',
                                border: '1px solid var(--border-color)',
                                fontSize: 14, color: 'var(--text-on-card)',
                            }}>
                                "{fav.text.length > 80 ? fav.text.slice(0, 80) + '...' : fav.text}"
                                <div style={{ fontSize: 11, color: 'var(--text-dim-card)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                                    {SPEAKERS[fav.speaker]?.name} · {fav.date}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
