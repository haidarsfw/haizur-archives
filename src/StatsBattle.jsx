import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { speakerNames } from "./words";
import { loadFullHistory, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";

const RANDOM_WORDS = [
    "love", "sorry", "miss", "haha", "lol", "sleep", "hungry",
    "ok", "no", "yes", "please", "happy", "sad", "work", "busy",
    "food", "goodnight", "morning", "home", "wait"
];

export default function StatsBattle({ otherUsers = {} }) {
    const [query, setQuery] = useState("");
    const [stats, setStats] = useState(null);
    const [fullHistory, setFullHistory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFullHistory()
            .then(data => {
                setFullHistory(data || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load stats data:', err);
                setIsLoading(false);
            });
    }, []);

    const partner = Object.values(otherUsers).find(u => u.status === 'stats');

    const calculateStats = (searchTerm) => {
        if (!searchTerm.trim()) return;
        if (!fullHistory) return;
        let countP1 = 0;
        let countP2 = 0;
        const term = searchTerm.toLowerCase().trim();
        const byPlatform = {};
        fullHistory.forEach(msg => {
            const text = msg.text;
            if (text.includes(term)) {
                if (msg.speaker === 'p1') countP1++;
                else countP2++;
                const p = msg.platform || 'unknown';
                byPlatform[p] = (byPlatform[p] || 0) + 1;
            }
        });
        setStats({ p1: countP1, p2: countP2, term, byPlatform });
    };

    const handleSearch = (e) => { e.preventDefault(); calculateStats(query); };

    const handleRandom = () => {
        const randomWord = RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
        setQuery(randomWord);
        calculateStats(randomWord);
    };

    const getTotal = () => (stats ? stats.p1 + stats.p2 : 0);
    const getPercent = (val) => {
        const total = getTotal();
        if (total === 0) return 0;
        return Math.round((val / total) * 100);
    };

    const formatName = (key) => speakerNames[key] ? speakerNames[key].toLowerCase() : "???";

    if (isLoading) {
        return (
            <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[500px]">
                <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Loading stats...</div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minHeight: 500, padding: '0 20px 80px',
            fontFamily: 'var(--font-body)',
        }}>
            {partner && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 14, color: 'var(--text-dim)', marginBottom: 18,
                    fontFamily: 'var(--font-handwritten)',
                }}>
                    <div className="animate-pulse" style={{
                        width: 7, height: 7, borderRadius: '50%',
                        backgroundColor: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)',
                    }} />
                    <span style={{ color: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}>
                        {partner.role === 'princess' ? 'She' : 'He'}'s comparing stats too!
                    </span>
                </div>
            )}

            {/* Search */}
            <div style={{ width: '100%', maxWidth: 560, marginBottom: 44, marginTop: 28 }}>
                <form onSubmit={handleSearch} style={{ width: '100%', position: 'relative' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="compare a word (e.g. 'sorry')..."
                        style={{
                            width: '100%', padding: '16px 110px 16px 20px',
                            border: 'none', borderBottom: '2px solid var(--sub-color)',
                            background: 'transparent', color: 'var(--text-color)',
                            fontSize: 20, outline: 'none',
                            fontFamily: 'var(--font-mono)',
                            transition: 'border-color 0.2s',
                        }}
                        autoFocus
                    />
                    <button
                        type="submit"
                        style={{
                            position: 'absolute', right: 4, top: 8, bottom: 8,
                            padding: '0 24px', background: 'var(--sub-color)', color: 'var(--bg-color)',
                            border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer',
                            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}
                    >
                        Fight
                    </button>
                </form>
                <button
                    onClick={handleRandom}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        margin: '14px auto 0', background: 'none', border: 'none',
                        color: 'var(--sub-color)', fontSize: 15, cursor: 'pointer',
                        fontFamily: 'var(--font-handwritten)', fontWeight: 400,
                        transition: 'color 0.2s',
                    }}
                >
                    Try a random common word
                </button>
            </div>

            {/* Battle arena */}
            {stats && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        width: '100%', maxWidth: 640,
                        padding: 'clamp(16px, 4vw, 36px)', borderRadius: 'var(--radius-card)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 3px 12px var(--shadow-color)',
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, var(--border-color) 23px, var(--border-color) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, var(--border-color) 23px, var(--border-color) 24px)',
                        backgroundSize: '24px 24px',
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 36 }}>
                        <div style={{
                            fontSize: 13, color: 'var(--text-dim-card)', textTransform: 'uppercase',
                            letterSpacing: '0.14em', fontWeight: 400, marginBottom: 10,
                            fontFamily: 'var(--font-mono)',
                        }}>
                            Verdict
                        </div>
                        <h2 style={{
                            fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 400,
                            color: 'var(--text-on-card)', margin: 0, fontStyle: 'italic',
                            wordBreak: 'break-word',
                        }}>
                            Who says "<span style={{ color: 'var(--main-color)' }}>{stats.term}</span>" more?
                        </h2>
                    </div>

                    {getTotal() === 0 ? (
                        <div style={{
                            textAlign: 'center', color: 'var(--text-dim-card)',
                            fontFamily: 'var(--font-handwritten)', fontSize: 18,
                        }}>
                            Neither of you have said this word yet!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 4vw, 32px)' }}>
                            {/* Player 1 bar */}
                            <div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 8px', marginBottom: 8, padding: '0 4px' }}>
                                    <span style={{
                                        color: 'var(--main-color)', fontWeight: 400, fontSize: 18,
                                        fontFamily: 'var(--font-display)', fontStyle: 'italic',
                                    }}>{formatName('p1')}</span>
                                    <span style={{
                                        color: 'var(--text-on-card)', fontWeight: 600, fontSize: 16,
                                        fontFamily: 'var(--font-mono)',
                                    }}>{stats.p1} times</span>
                                </div>
                                <div style={{
                                    width: '100%', height: 40,
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-card)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-color)',
                                    position: 'relative',
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getPercent(stats.p1)}%` }}
                                        transition={{ duration: 1, type: "spring" }}
                                        style={{
                                            height: '100%', background: 'var(--main-color)',
                                            borderRadius: 'var(--radius-card)',
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--bg-color)', fontWeight: 700, fontSize: 14,
                                        fontFamily: 'var(--font-mono)',
                                    }}>{getPercent(stats.p1)}%</span>
                                </div>
                            </div>

                            {/* Player 2 bar */}
                            <div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 8px', marginBottom: 8, padding: '0 4px' }}>
                                    <span style={{
                                        color: 'var(--sub-color)', fontWeight: 400, fontSize: 18,
                                        fontFamily: 'var(--font-display)', fontStyle: 'italic',
                                    }}>{formatName('p2')}</span>
                                    <span style={{
                                        color: 'var(--text-on-card)', fontWeight: 600, fontSize: 16,
                                        fontFamily: 'var(--font-mono)',
                                    }}>{stats.p2} times</span>
                                </div>
                                <div style={{
                                    width: '100%', height: 40,
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-card)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-color)',
                                    position: 'relative',
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getPercent(stats.p2)}%` }}
                                        transition={{ duration: 1, type: "spring" }}
                                        style={{
                                            height: '100%', background: 'var(--sub-color)',
                                            borderRadius: 'var(--radius-card)',
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--bg-color)', fontWeight: 700, fontSize: 14,
                                        fontFamily: 'var(--font-mono)',
                                    }}>{getPercent(stats.p2)}%</span>
                                </div>
                            </div>

                            {/* Winner */}
                            <div style={{ textAlign: 'center', marginTop: 14 }}>
                                {stats.p1 > stats.p2 ? (
                                    <span className="animate-stamp-press" style={{
                                        fontFamily: 'var(--font-display)', fontStyle: 'italic',
                                        fontSize: 22, fontWeight: 400, color: 'var(--main-color)',
                                    }}>
                                        {formatName('p1')} wins the "{stats.term}" war!
                                    </span>
                                ) : stats.p2 > stats.p1 ? (
                                    <span className="animate-stamp-press" style={{
                                        fontFamily: 'var(--font-display)', fontStyle: 'italic',
                                        fontSize: 22, fontWeight: 400, color: 'var(--sub-color)',
                                    }}>
                                        {formatName('p2')} wins the "{stats.term}" war!
                                    </span>
                                ) : (
                                    <span style={{
                                        fontFamily: 'var(--font-handwritten)', fontSize: 22,
                                        color: 'var(--text-on-card)',
                                    }}>
                                        It's a tie! Soulmates fr.
                                    </span>
                                )}
                            </div>

                            {/* Platform breakdown */}
                            {stats.byPlatform && Object.keys(stats.byPlatform).length > 0 && (
                                <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
                                    marginTop: 20, paddingTop: 16,
                                    borderTop: '1px solid var(--border-color)',
                                }}>
                                    {Object.entries(stats.byPlatform)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([platform, count]) => (
                                        <div key={platform} style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            fontSize: 13, fontFamily: 'var(--font-mono)',
                                            color: PLATFORMS[platform]?.color || 'var(--sub-color)',
                                        }}>
                                            <PlatformIcon platform={platform} size={13} />
                                            <span>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
