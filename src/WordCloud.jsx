import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { loadStats, loadFullHistory, SPEAKERS } from './dataLoader';

export default function WordCloud({ theme }) {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWord, setSelectedWord] = useState(null);
    const [wordDetail, setWordDetail] = useState(null);

    useEffect(() => {
        Promise.all([loadStats(), loadFullHistory()]).then(([s, h]) => {
            setStats(s); setHistory(h || []); setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    const words = useMemo(() => {
        if (!stats?.topWords) return [];
        const entries = Object.entries(stats.topWords);
        const max = entries[0]?.[1] || 1;
        return entries.slice(0, 60).map(([word, count], i) => ({
            word, count,
            size: Math.max(14, Math.min(56, (count / max) * 56)),
            rotation: (Math.random() - 0.5) * 20,
            color: i < 5 ? 'var(--main-color)' : i < 15 ? 'var(--accent-color)' : i < 30 ? 'var(--text-dim)' : 'var(--sub-color)',
            delay: i * 0.03,
        }));
    }, [stats]);

    const handleWordClick = (w) => {
        setSelectedWord(w.word);
        const term = w.word.toLowerCase();
        let p1 = 0, p2 = 0; const ex = [];
        history.forEach(m => {
            if (!m.text) return;
            if (m.text.toLowerCase().includes(term)) {
                if (m.speaker === 'p1') p1++; else p2++;
                if (ex.length < 3 && m.text.length > 10 && m.text.length < 200) ex.push(m);
            }
        });
        setWordDetail({ word: w.word, totalCount: w.count, p1Count: p1, p2Count: p2, examples: ex });
    };

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Building word cloud...</div>
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'var(--font-body)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, fontStyle: 'italic', color: 'var(--text-color)', margin: 0 }}>Word Cloud</h2>
                <p style={{ fontSize: 15, color: 'var(--sub-color)', marginTop: 6, fontFamily: 'var(--font-handwritten)' }}>your most used words — tap any word for details ☁️</p>
            </div>

            <div style={{
                position: 'relative', width: '100%', minHeight: 420, background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px var(--shadow-color)', overflow: 'hidden', padding: 20,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                gap: '4px 8px', alignContent: 'center',
            }}>
                {words.map((w, i) => (
                    <motion.button key={w.word} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: w.delay, duration: 0.4, type: 'spring' }} whileHover={{ scale: 1.15 }}
                        onClick={() => handleWordClick(w)}
                        style={{
                            fontSize: w.size, color: selectedWord === w.word ? 'var(--bg-color)' : w.color,
                            background: selectedWord === w.word ? 'var(--main-color)' : 'transparent',
                            border: 'none', cursor: 'pointer',
                            fontFamily: i < 10 ? 'var(--font-handwritten)' : 'var(--font-body)',
                            fontWeight: i < 5 ? 700 : 400, padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                            transform: `rotate(${w.rotation * 0.3}deg)`, lineHeight: 1.2,
                        }}>
                        {w.word}
                    </motion.button>
                ))}
            </div>

            {wordDetail && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key={wordDetail.word}
                    style={{
                        marginTop: 24, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-card)', padding: 28, boxShadow: '0 4px 16px var(--shadow-color)'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, fontStyle: 'italic', color: 'var(--main-color)', margin: 0 }}>
                                "{wordDetail.word}"</h3>
                            <div style={{ fontSize: 14, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                                used {wordDetail.totalCount.toLocaleString()} times</div>
                        </div>
                        <button onClick={() => { setSelectedWord(null); setWordDetail(null); }}
                            style={{ background: 'none', border: 'none', color: 'var(--sub-color)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 14, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            <span>{SPEAKERS.p1?.name}: {wordDetail.p1Count.toLocaleString()}</span>
                            <span>vs</span>
                            <span>{SPEAKERS.p2?.name}: {wordDetail.p2Count.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 16, borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex', background: 'var(--bg-secondary)' }}>
                            <div style={{ width: `${(wordDetail.p1Count / (wordDetail.p1Count + wordDetail.p2Count || 1)) * 100}%`, background: 'var(--main-color)', borderRadius: 'var(--radius-full) 0 0 var(--radius-full)' }} />
                            <div style={{ flex: 1, background: 'var(--accent-color)', borderRadius: '0 var(--radius-full) var(--radius-full) 0' }} />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 13, color: 'var(--main-color)', fontFamily: 'var(--font-handwritten)' }}>
                            {wordDetail.p1Count > wordDetail.p2Count ? `${SPEAKERS.p1?.name} says it more!` : wordDetail.p2Count > wordDetail.p1Count ? `${SPEAKERS.p2?.name} says it more!` : 'Perfectly balanced!'}
                        </div>
                    </div>
                    {wordDetail.examples.length > 0 && (
                        <div>
                            <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 15, color: 'var(--sub-color-light)', marginBottom: 10 }}>example messages:</div>
                            {wordDetail.examples.map((msg, i) => (
                                <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-card)', fontSize: 14, color: 'var(--text-color)', lineHeight: 1.5, marginBottom: 8 }}>
                                    "{msg.text}"
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{SPEAKERS[msg.speaker]?.name} · {msg.date}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
