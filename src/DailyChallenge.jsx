import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { loadFullHistory, loadStats, SPEAKERS, PLATFORMS } from './dataLoader';
import PlatformIcon from './PlatformIcons';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CHALLENGE_TYPES = [
    { day: 1, type: 'quiz', title: 'Guess Who Monday', desc: 'Who said it? 5 questions', icon: '💭' },
    { day: 2, type: 'speed', title: 'Type It Tuesday', desc: '30 second speed typing challenge', icon: '⌨️' },
    { day: 3, type: 'timeline', title: 'Timeline Wednesday', desc: 'Order these messages chronologically', icon: '⏱️' },
    { day: 4, type: 'finish', title: 'Finish Thursday', desc: 'Complete the sentence challenge', icon: '✏️' },
    { day: 5, type: 'platform', title: 'Platform Friday', desc: 'Which platform was this sent on?', icon: '🎯' },
    { day: 6, type: 'freeplay', title: 'Weekend Freeplay', desc: 'Play any game mode you want!', icon: '🎮' },
    { day: 0, type: 'freeplay', title: 'Weekend Freeplay', desc: 'Explore all game modes!', icon: '🎮' },
];

export default function DailyChallenge({ theme, onNavigate }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const challenge = CHALLENGE_TYPES.find(c => c.day === dayOfWeek) || CHALLENGE_TYPES[5];
    const dateStr = today.toISOString().split('T')[0];

    useEffect(() => {
        loadFullHistory().then(data => {
            const msgs = (data || []).filter(m => m.text && m.text.length > 10 && m.text.length < 150);
            setHistory(msgs);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    // Generate seed-based questions for the day
    const dailySeed = useMemo(() => {
        const d = dateStr.replace(/-/g, '');
        return parseInt(d) || Date.now();
    }, [dateStr]);

    const seededRandom = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    useEffect(() => {
        if (history.length < 20 || challenge.type === 'freeplay') return;
        const qs = [];
        for (let i = 0; i < 5; i++) {
            const seed = dailySeed + i * 137;
            const idx = Math.floor(seededRandom(seed) * history.length);
            const msg = history[idx];
            if (challenge.type === 'quiz' || challenge.type === 'finish') {
                qs.push({ msg, type: challenge.type, id: i });
            } else if (challenge.type === 'platform') {
                const platforms = Object.keys(PLATFORMS);
                const wrongPlatforms = platforms.filter(p => p !== msg.platform).sort(() => seededRandom(seed + 50) - 0.5).slice(0, 3);
                const options = [msg.platform, ...wrongPlatforms].sort(() => seededRandom(seed + 100) - 0.5);
                qs.push({ msg, type: 'platform', options, id: i });
            } else {
                qs.push({ msg, type: challenge.type, id: i });
            }
        }
        setQuestions(qs);
    }, [history, dailySeed, challenge.type]);

    const handleAnswer = (answer) => {
        if (showResult) return;
        setSelected(answer);
        setShowResult(true);
        const q = questions[currentQ];
        let correct = false;
        if (q.type === 'quiz') correct = answer === q.msg.speaker;
        else if (q.type === 'platform') correct = answer === q.msg.platform;
        else if (q.type === 'finish') correct = answer === q.msg.text;
        if (correct) setScore(s => s + 1);
    };

    const nextQuestion = () => {
        if (currentQ + 1 >= questions.length) { setGameComplete(true); return; }
        setCurrentQ(c => c + 1);
        setSelected(null);
        setShowResult(false);
    };

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Loading challenge...</div>
        </div>
    );

    // Freeplay mode
    if (challenge.type === 'freeplay') return (
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, fontStyle: 'italic', color: 'var(--text-color)', margin: '0 0 8px' }}>{challenge.title}</h2>
            <p style={{ fontSize: 16, color: 'var(--sub-color)', fontFamily: 'var(--font-handwritten)', marginBottom: 32 }}>It's the weekend! Explore any game mode 🎉</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {[
                    { id: 'quiz', icon: '💭', label: 'Who?' },
                    { id: 'memory', icon: '🎲', label: 'Rewind' },
                    { id: 'emoji-decoder', icon: '🧩', label: 'Emoji' },
                    { id: 'chat-roulette', icon: '🎰', label: 'Roulette' },
                    { id: 'word-cloud', icon: '☁️', label: 'Words' },
                    { id: 'timeline-race', icon: '⏱️', label: 'Timeline' },
                ].map(g => (
                    <button key={g.id} onClick={() => onNavigate?.(g.id)}
                        style={{ padding: '20px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-card)', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{g.icon}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-on-card)', fontFamily: 'var(--font-body)' }}>{g.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );

    // Game complete
    if (gameComplete) return (
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>{score >= 4 ? '🏆' : score >= 2 ? '⭐' : '💪'}</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, fontStyle: 'italic', color: 'var(--text-color)', margin: '0 0 8px' }}>Challenge Complete!</h2>
                <div style={{ fontSize: 48, color: 'var(--main-color)', fontFamily: 'var(--font-display)', margin: '16px 0' }}>{score}/5</div>
                <p style={{ fontSize: 16, color: 'var(--sub-color)', fontFamily: 'var(--font-handwritten)' }}>
                    {score === 5 ? 'Perfect! You know each other so well! 💕' : score >= 3 ? 'Great job! Pretty impressive! ✨' : 'Keep exploring, you\'ll get better! 🌱'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 16 }}>come back tomorrow for a new challenge!</p>
            </motion.div>
        </div>
    );

    const q = questions[currentQ];
    if (!q || !q.msg) return null;

    return (
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'var(--font-body)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{dateStr} · {DAYS[dayOfWeek]}</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, fontStyle: 'italic', color: 'var(--text-color)', margin: '0 0 6px' }}>
                    {challenge.icon} {challenge.title}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--sub-color)', fontFamily: 'var(--font-handwritten)' }}>{challenge.desc}</p>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                    {questions.map((_, i) => (
                        <div key={i} style={{ width: 32, height: 4, borderRadius: 2, background: i === currentQ ? 'var(--main-color)' : i < currentQ ? 'var(--success-color)' : 'var(--bg-tertiary)' }} />
                    ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>Score: {score}/{currentQ + (showResult ? 1 : 0)}</div>
            </div>

            {/* Question */}
            <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-card)', padding: 28, marginBottom: 20, boxShadow: '0 4px 16px var(--shadow-color)' }}>
                <p style={{ margin: 0, fontSize: 18, color: 'var(--text-on-card)', fontFamily: 'var(--font-handwritten)', lineHeight: 1.6 }}>"{q.msg.text}"</p>
                {showResult && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim-card)', fontFamily: 'var(--font-mono)' }}>{q.msg.date}{q.msg.platform && ` · ${PLATFORMS[q.msg.platform]?.label}`}</div>}
            </motion.div>

            {/* Answer Options */}
            {q.type === 'quiz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['p1', 'p2'].map(s => {
                        const correct = q.msg.speaker === s;
                        const bg = showResult ? (correct ? 'rgba(92,184,112,0.15)' : selected === s ? 'rgba(224,85,85,0.15)' : 'var(--bg-card)') : 'var(--bg-card)';
                        return (
                            <button key={s} onClick={() => handleAnswer(s)} style={{ padding: '16px 20px', borderRadius: 'var(--radius-card)', background: bg, border: `2px solid ${showResult && correct ? 'var(--success-color)' : showResult && selected === s ? 'var(--error-color)' : 'var(--border-color)'}`, color: 'var(--text-on-card)', fontSize: 16, cursor: showResult ? 'default' : 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
                                {SPEAKERS[s]?.emoji} {SPEAKERS[s]?.name}
                                {showResult && correct && ' ✅'}
                                {showResult && selected === s && !correct && ' ❌'}
                            </button>
                        );
                    })}
                </div>
            )}

            {q.type === 'platform' && q.options && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {q.options.map(p => {
                        const correct = q.msg.platform === p;
                        const bg = showResult ? (correct ? 'rgba(92,184,112,0.15)' : selected === p ? 'rgba(224,85,85,0.15)' : 'var(--bg-card)') : 'var(--bg-card)';
                        return (
                            <button key={p} onClick={() => handleAnswer(p)} style={{ padding: '14px', borderRadius: 'var(--radius-card)', background: bg, border: `2px solid ${showResult && correct ? 'var(--success-color)' : showResult && selected === p ? 'var(--error-color)' : 'var(--border-color)'}`, cursor: showResult ? 'default' : 'pointer', fontSize: 14, color: PLATFORMS[p]?.color, fontFamily: 'var(--font-mono)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><PlatformIcon platform={p} size={14} /> {PLATFORMS[p]?.label}</span>
                                {showResult && correct && ' ✅'}
                            </button>
                        );
                    })}
                </div>
            )}

            {showResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: 20 }}>
                    <button onClick={nextQuestion} style={{ padding: '14px 36px', background: 'var(--main-color)', color: 'var(--bg-color)', border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600 }}>
                        {currentQ + 1 >= questions.length ? 'See Results' : 'Next →'}
                    </button>
                </motion.div>
            )}
        </div>
    );
}
