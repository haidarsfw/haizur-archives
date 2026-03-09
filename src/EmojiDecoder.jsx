import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadRawChatData, SPEAKERS, PLATFORMS } from './dataLoader';

// Emoji patterns to extract
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

function extractEmojis(text) {
    return (text || '').match(EMOJI_REGEX) || [];
}

export default function EmojiDecoder({ theme }) {
    const [rawData, setRawData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [question, setQuestion] = useState(null);
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [showResult, setShowResult] = useState(false);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        loadRawChatData().then(data => {
            setRawData(data);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    // Build pool of emoji-rich messages
    const emojiPool = useMemo(() => {
        if (!rawData) return [];
        const pool = [];
        ['p1', 'p2'].forEach(speaker => {
            const msgs = rawData[speaker] || [];
            msgs.forEach(m => {
                const text = m?.text || (typeof m === 'string' ? m : '');
                if (!text || text.length < 10 || text.length > 200) return;
                const emojis = extractEmojis(text);
                if (emojis.length >= 1 && emojis.length <= 8) {
                    pool.push({ text, emojis, speaker });
                }
            });
        });
        return pool;
    }, [rawData]);

    const generateQuestion = () => {
        if (emojiPool.length < 4) return;
        setShowResult(false);
        setSelected(null);

        const correctIdx = Math.floor(Math.random() * emojiPool.length);
        const correct = emojiPool[correctIdx];

        // Get 3 wrong options
        const wrongIdxs = new Set();
        while (wrongIdxs.size < 3) {
            const idx = Math.floor(Math.random() * emojiPool.length);
            if (idx !== correctIdx) wrongIdxs.add(idx);
        }
        const wrongs = [...wrongIdxs].map(i => emojiPool[i]);

        // Shuffle options
        const allOpts = [correct, ...wrongs].sort(() => Math.random() - 0.5);

        setQuestion({
            emojis: correct.emojis,
            correctText: correct.text,
            speaker: correct.speaker,
        });
        setOptions(allOpts.map(o => ({
            display: o.text.replace(EMOJI_REGEX, '').trim(),
            original: o.text,
        })));
    };

    useEffect(() => {
        if (emojiPool.length >= 4) generateQuestion();
    }, [emojiPool]);

    const handleSelect = (opt) => {
        if (showResult) return;
        setSelected(opt.original);
        setShowResult(true);
        const isCorrect = opt.original === question.correctText;
        setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
        setStreak(isCorrect ? streak + 1 : 0);
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                    Loading emoji data...
                </div>
            </div>
        );
    }

    if (emojiPool.length < 4) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--sub-color)', fontFamily: 'var(--font-handwritten)', fontSize: 18 }}>
                Not enough emoji messages found! 🥺
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', maxWidth: 640, margin: '0 auto', padding: '0 20px 80px',
            fontFamily: 'var(--font-body)',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
                    fontStyle: 'italic', color: 'var(--text-color)', margin: 0,
                }}>
                    Emoji Decoder
                </h2>
                <p style={{ fontSize: 15, color: 'var(--sub-color)', marginTop: 6, fontFamily: 'var(--font-handwritten)' }}>
                    which message do these emojis belong to?
                </p>
                <div style={{
                    display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12,
                    fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-dim)',
                }}>
                    <span>Score: {score.correct}/{score.total}</span>
                    {streak > 1 && <span style={{ color: 'var(--main-color)' }}>🔥 {streak} streak</span>}
                </div>
            </div>

            {question && (
                <>
                    {/* Emoji Display */}
                    <motion.div
                        key={question.correctText}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            textAlign: 'center', fontSize: 48, padding: '32px 20px',
                            background: 'var(--bg-card)', borderRadius: 'var(--radius-card)',
                            border: '1px solid var(--border-color)', marginBottom: 24,
                            boxShadow: '0 4px 16px var(--shadow-color)',
                            letterSpacing: '8px',
                        }}
                    >
                        {question.emojis.join(' ')}
                        <div style={{
                            marginTop: 12, fontSize: 13, color: 'var(--text-dim)',
                            fontFamily: 'var(--font-handwritten)', letterSpacing: 0,
                        }}>
                            sent by {SPEAKERS[question.speaker]?.name}
                        </div>
                    </motion.div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {options.map((opt, i) => {
                            const isCorrect = opt.original === question.correctText;
                            const isSelected = selected === opt.original;
                            let bg = 'var(--bg-card)';
                            let borderCol = 'var(--border-color)';
                            if (showResult) {
                                if (isCorrect) { bg = 'rgba(92, 184, 112, 0.15)'; borderCol = 'var(--success-color)'; }
                                else if (isSelected) { bg = 'rgba(224, 85, 85, 0.15)'; borderCol = 'var(--error-color)'; }
                            }

                            return (
                                <motion.button
                                    key={i}
                                    whileHover={!showResult ? { scale: 1.01 } : {}}
                                    whileTap={!showResult ? { scale: 0.99 } : {}}
                                    onClick={() => handleSelect(opt)}
                                    style={{
                                        padding: '16px 20px', borderRadius: 'var(--radius-card)',
                                        background: bg, border: `2px solid ${borderCol}`,
                                        color: 'var(--text-on-card)', fontSize: 15,
                                        textAlign: 'left', cursor: showResult ? 'default' : 'pointer',
                                        fontFamily: 'var(--font-body)', lineHeight: 1.5,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {opt.display}
                                    {showResult && isCorrect && <span style={{ marginLeft: 8 }}>✅</span>}
                                    {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 8 }}>❌</span>}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Next button */}
                    {showResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', marginTop: 24 }}
                        >
                            <button
                                onClick={generateQuestion}
                                style={{
                                    padding: '14px 36px', background: 'var(--main-color)',
                                    color: 'var(--bg-color)', border: 'none',
                                    borderRadius: 'var(--radius-card)', cursor: 'pointer',
                                    fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
                                }}
                            >
                                Next →
                            </button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
