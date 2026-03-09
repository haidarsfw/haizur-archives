import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadUnified, PLATFORMS, SPEAKERS } from './dataLoader';
import PlatformIcon from './PlatformIcons';

const PLATFORM_OPTIONS = ['whatsapp', 'instagram', 'tiktok', 'imessage', 'discord'];

export default function PlatformQuiz({ theme }) {
    const [messages, setMessages] = useState([]);
    const [current, setCurrent] = useState(null);
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        loadUnified().then(data => {
            const valid = data.filter(m =>
                m.type === 'text' && m.text && m.text.length > 15 && m.text.length < 200
                && !m.text.startsWith('http') && !m.text.includes('Camera_Image')
            );
            setMessages(valid);
            setIsLoading(false);
        }).catch(err => {
            console.error('Failed to load data:', err);
            setIsLoading(false);
        });
    }, []);

    const nextQuestion = useCallback(() => {
        if (messages.length === 0) return;
        setSelected(null);
        setShowResult(false);
        const msg = messages[Math.floor(Math.random() * messages.length)];
        setCurrent(msg);
        const correct = msg.platform;
        const wrong = PLATFORM_OPTIONS.filter(p => p !== correct);
        const shuffledWrong = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
        const allOptions = [correct, ...shuffledWrong].sort(() => Math.random() - 0.5);
        setOptions(allOptions);
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0 && !current) nextQuestion();
    }, [messages, current, nextQuestion]);

    const handleSelect = (platform) => {
        if (selected) return;
        setSelected(platform);
        setShowResult(true);
        setTotal(t => t + 1);
        const isCorrect = platform === current.platform;
        if (isCorrect) {
            setScore(s => s + 1);
            setStreak(s => {
                const newStreak = s + 1;
                setBestStreak(b => Math.max(b, newStreak));
                return newStreak;
            });
        } else {
            setStreak(0);
        }
        setTimeout(() => nextQuestion(), 1500);
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center" style={{ minHeight: 400 }}>
                <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                    Loading...
                </div>
            </div>
        );
    }

    if (!current) return null;

    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
        <div style={{
            width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto', padding: '0 24px 80px',
            fontFamily: 'var(--font-body)',
        }}>
            {/* Score bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', marginBottom: 28,
            }}>
                <div className="torn-paper-divider" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
                <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                        <div style={{
                            fontSize: 24, fontWeight: 400, color: 'var(--main-color)',
                            fontFamily: 'var(--font-display)', fontStyle: 'italic',
                        }}>
                            {score}/{total}
                        </div>
                        <div style={{
                            fontSize: 12, color: 'var(--sub-color-light)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
                        }}>
                            score
                        </div>
                    </div>
                    <div>
                        <div style={{
                            fontSize: 24, fontWeight: 400, color: 'var(--text-color)',
                            fontFamily: 'var(--font-display)', fontStyle: 'italic',
                        }}>
                            {accuracy}%
                        </div>
                        <div style={{
                            fontSize: 12, color: 'var(--sub-color-light)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
                        }}>
                            accuracy
                        </div>
                    </div>
                </div>
                {streak > 0 && (
                    <motion.div
                        key={streak}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            fontSize: 16, fontWeight: 700, color: 'var(--success-color)',
                            fontFamily: 'var(--font-handwritten)',
                        }}
                    >
                        {streak} streak!
                    </motion.div>
                )}
            </div>

            {/* Message card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.timestamp}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                    style={{ marginBottom: 36 }}
                >
                    <div style={{
                        fontSize: 13, color: 'var(--sub-color-light)', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        Which platform?
                    </div>

                    <div style={{
                        padding: '28px 24px', borderRadius: 'var(--radius-card)',
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        boxShadow: '0 3px 12px var(--shadow-color)',
                        position: 'relative',
                        transform: 'rotate(-0.3deg)',
                    }}>
                        <p style={{
                            margin: 0, fontSize: 17, lineHeight: 1.7,
                            color: 'var(--text-on-card)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            "{current.text}"
                        </p>
                        <div style={{
                            marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 14, color: 'var(--text-dim-card)',
                        }}>
                            <span>{SPEAKERS[current.speaker]?.emoji}</span>
                            <span style={{
                                fontWeight: 600,
                                fontFamily: 'var(--font-handwritten)',
                            }}>{SPEAKERS[current.speaker]?.name}</span>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{current.date}</span>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Platform options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {options.map((platform, idx) => {
                    const info = PLATFORMS[platform];
                    const isCorrect = platform === current.platform;
                    const isSelected = selected === platform;
                    const revealed = showResult;
                    const rotations = [-1.2, 0.8, -0.6, 1.4];

                    let borderColor = 'var(--border-color)';
                    let bg = 'var(--bg-card)';
                    if (revealed) {
                        if (isCorrect) {
                            borderColor = 'var(--success-color)';
                            bg = 'var(--success-color)';
                        } else if (isSelected && !isCorrect) {
                            borderColor = 'var(--error-color)';
                            bg = 'var(--error-color)';
                        }
                    }

                    return (
                        <motion.button
                            key={platform}
                            onClick={() => handleSelect(platform)}
                            whileTap={!selected ? { scale: 0.96 } : {}}
                            style={{
                                padding: '18px 16px',
                                borderRadius: 'var(--radius-card)',
                                border: `1px solid ${borderColor}`,
                                background: bg,
                                cursor: selected ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex', alignItems: 'center', gap: 12,
                                opacity: revealed && !isCorrect && !isSelected ? 0.3 : 1,
                                transform: `rotate(${rotations[idx]}deg)`,
                                boxShadow: '0 2px 6px var(--shadow-color)',
                                color: revealed && (isCorrect || isSelected) ? '#fff' : 'var(--text-on-card)',
                            }}
                        >
                            <PlatformIcon platform={platform} size={22} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{
                                    fontSize: 16, fontWeight: 600,
                                    fontFamily: 'var(--font-handwritten)',
                                }}>
                                    {info?.label}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {bestStreak > 2 && (
                <div style={{
                    textAlign: 'center', marginTop: 36, fontSize: 14,
                    color: 'var(--sub-color-light)', fontFamily: 'var(--font-mono)',
                }}>
                    best streak: {bestStreak}
                </div>
            )}
        </div>
    );
}
