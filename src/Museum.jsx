import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadUnified, loadStats, PLATFORMS, SPEAKERS } from './dataLoader';
import PlatformIcon from './PlatformIcons';
import { ImageViewer } from './MediaRenderer';

const TABS = [
    { id: 'milestones', label: 'Milestones', icon: '🏆' },
    { id: 'gallery', label: 'Gallery', icon: '📷' },
    { id: 'stickers', label: 'Stickers', icon: '🎨' },
    { id: 'links', label: 'Links', icon: '🔗' },
    { id: 'calls', label: 'Calls', icon: '📞' },
    { id: 'firsts', label: 'Firsts', icon: '✨' },
];

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function MilestonesView({ messages, stats }) {
    const milestones = useMemo(() => {
        if (!messages.length) return [];
        const items = [];
        const thresholds = [1, 100, 1000, 5000, 10000, 25000, 50000, 100000, 150000, 200000, 250000, 300000, 333131];
        thresholds.forEach(n => {
            if (n <= messages.length && messages[n - 1]) {
                const msg = messages[n - 1];
                items.push({
                    count: n,
                    message: msg,
                    label: n === 1 ? 'First ever message' :
                        n === 333131 ? 'Latest message' :
                            `Message #${formatNumber(n)}`,
                });
            }
        });
        return items;
    }, [messages]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {milestones.map((m, i) => (
                <motion.div
                    key={m.count}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card"
                    style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{
                        position: 'absolute', top: 10, right: 14,
                        fontSize: 13, color: 'var(--sub-color)',
                        fontFamily: 'var(--font-display)', fontWeight: 400,
                    }}>
                        {m.message.date}
                    </div>
                    <div style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--main-color)',
                        fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                        letterSpacing: '0.05em', marginBottom: 8,
                    }}>
                        {m.label}
                    </div>
                    <div style={{
                        fontSize: 16, color: 'var(--text-color)', lineHeight: 1.5,
                        fontStyle: 'italic',
                    }}>
                        "{m.message.text?.length > 120 ? m.message.text.slice(0, 120) + '...' : m.message.text || '[media]'}"
                    </div>
                    <div style={{
                        display: 'flex', gap: 8, alignItems: 'center', marginTop: 10,
                        fontSize: 13, color: 'var(--text-dim)',
                    }}>
                        <span>{SPEAKERS[m.message.speaker]?.emoji}</span>
                        <span>{SPEAKERS[m.message.speaker]?.name}</span>
                        <span style={{ opacity: 0.4 }}>via</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <PlatformIcon platform={m.message.platform} size={13} /> {PLATFORMS[m.message.platform]?.label}
                        </span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function StickersView({ messages }) {
    const [selectedSticker, setSelectedSticker] = useState(null);

    const stickers = useMemo(() => {
        return messages
            .filter(m => m.type === 'sticker' && m.text && m.text.includes('http'))
            .map(m => ({
                url: m.text.replace(/^\[|\]$/g, ''),
                speaker: m.speaker,
                date: m.date,
                platform: m.platform,
            }))
            .slice(0, 200);
    }, [messages]);

    return (
        <>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            }}>
                {stickers.map((s, i) => (
                    <motion.div
                        key={i}
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedSticker(s)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSticker(s); } }}
                        style={{
                            aspectRatio: '1', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-card)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <img
                            src={s.url}
                            alt="sticker"
                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                            loading="lazy"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    </motion.div>
                ))}
            </div>

            {stickers.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--sub-color)', padding: 40, fontSize: 16 }}>
                    No stickers found
                </div>
            )}

            <AnimatePresence>
                {selectedSticker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedSticker(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            padding: 20,
                        }}
                    >
                        <motion.img
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.5 }}
                            src={selectedSticker.url}
                            alt="sticker"
                            style={{ maxWidth: 280, maxHeight: 280, objectFit: 'contain' }}
                        />
                        <div style={{
                            marginTop: 18, color: '#fff', fontSize: 15,
                            textAlign: 'center', opacity: 0.7,
                        }}>
                            {SPEAKERS[selectedSticker.speaker]?.emoji} {SPEAKERS[selectedSticker.speaker]?.name} — {selectedSticker.date}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function LinksView({ messages }) {
    const links = useMemo(() => {
        const items = [];
        messages.filter(m => m.type === 'tiktok_link').forEach(m => {
            items.push({ type: 'tiktok', text: m.text, speaker: m.speaker, date: m.date, platform: m.platform });
        });
        messages.filter(m => m.type === 'music_link').forEach(m => {
            items.push({ type: 'music', text: m.text, speaker: m.speaker, date: m.date, platform: m.platform });
        });
        messages.filter(m => m.type === 'text' && m.text && /https?:\/\/\S+/.test(m.text)).forEach(m => {
            const urlMatch = m.text.match(/https?:\/\/\S+/);
            if (urlMatch) {
                const url = urlMatch[0];
                if (url.includes('tiktok') || url.includes('spotify') || url.includes('youtu')) {
                    items.push({ type: 'shared', text: url, speaker: m.speaker, date: m.date, platform: m.platform });
                }
            }
        });
        return items.slice(0, 100);
    }, [messages]);

    const getIcon = (type) => {
        if (type === 'tiktok') return '🎵';
        if (type === 'music') return '🎶';
        return '🔗';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {links.map((link, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                        padding: '14px 18px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    }}
                >
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                    }}>
                        <span>{getIcon(link.type)}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-dim-card)' }}>
                            {SPEAKERS[link.speaker]?.name} — {link.date}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 14, color: 'var(--main-color)',
                        wordBreak: 'break-all', lineHeight: 1.4,
                    }}>
                        {link.text?.length > 80 ? link.text.slice(0, 80) + '...' : link.text}
                    </div>
                </motion.div>
            ))}
            {links.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--sub-color)', padding: 40, fontSize: 16 }}>
                    No links found
                </div>
            )}
        </div>
    );
}

function CallsView({ messages, stats }) {
    const calls = useMemo(() => {
        return messages.filter(m => m.type === 'call').sort((a, b) => a.timestamp - b.timestamp);
    }, [messages]);

    return (
        <div>
            {stats?.callStats && (
                <div className="glass-card" style={{
                    padding: 24, marginBottom: 18,
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
                    textAlign: 'center',
                }}>
                    <div>
                        <div style={{
                            fontSize: 36, fontWeight: 400, color: 'var(--main-color)',
                            fontFamily: 'var(--font-display)',
                        }}>
                            {stats.callStats.totalCalls}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                            calls
                        </div>
                    </div>
                    <div>
                        <div style={{
                            fontSize: 36, fontWeight: 400, color: 'var(--main-color)',
                            fontFamily: 'var(--font-display)',
                        }}>
                            {Math.round(stats.callStats.totalMinutes / 60)}h
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                            total time
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {calls.map((call, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{
                            padding: '12px 16px', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span>📞</span>
                            <div>
                                <div style={{ fontSize: 15, color: 'var(--text-color)' }}>
                                    {SPEAKERS[call.speaker]?.name}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                    {call.text || 'Voice/Video call'}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            fontSize: 13, color: 'var(--sub-color)',
                            textAlign: 'right',
                        }}>
                            <div>{call.date}</div>
                            <div>
                                <PlatformIcon platform={call.platform} size={14} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {calls.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--sub-color)', padding: 40, fontSize: 16 }}>
                    No calls recorded
                </div>
            )}
        </div>
    );
}

function FirstsView({ messages }) {
    const firsts = useMemo(() => {
        if (!messages.length) return [];
        const items = [];
        const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
        const seenPlatforms = new Set();
        sorted.forEach(m => {
            if (!seenPlatforms.has(m.platform) && m.text) {
                seenPlatforms.add(m.platform);
                items.push({ label: `First ${PLATFORMS[m.platform]?.label || m.platform} message`, message: m });
            }
        });
        const loveMsg = sorted.find(m => m.text && /sayang/i.test(m.text));
        if (loveMsg) items.push({ label: 'First "sayang"', message: loveMsg });
        const firstCall = sorted.find(m => m.type === 'call');
        if (firstCall) items.push({ label: 'First call', message: firstCall });
        const firstSticker = sorted.find(m => m.type === 'sticker');
        if (firstSticker) items.push({ label: 'First sticker', message: firstSticker });
        return items;
    }, [messages]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {firsts.map((f, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="glass-card"
                    style={{ padding: '20px 24px' }}
                >
                    <div style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--main-color)',
                        fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                        letterSpacing: '0.05em', marginBottom: 8,
                    }}>
                        {f.label}
                    </div>
                    <div style={{
                        fontSize: 16, color: 'var(--text-color)', lineHeight: 1.5,
                        fontStyle: 'italic',
                    }}>
                        "{f.message.text?.length > 100 ? f.message.text.slice(0, 100) + '...' : f.message.text || '[media]'}"
                    </div>
                    <div style={{
                        display: 'flex', gap: 8, alignItems: 'center', marginTop: 10,
                        fontSize: 13, color: 'var(--text-dim)',
                    }}>
                        <span>{SPEAKERS[f.message.speaker]?.emoji}</span>
                        <span>{SPEAKERS[f.message.speaker]?.name}</span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span>{f.message.date}</span>
                        <PlatformIcon platform={f.message.platform} size={13} />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function GalleryView({ messages }) {
    const photos = useMemo(() => {
        return messages
            .filter(m => m.type === 'image' && m.mediaPath)
            .slice(0, 300);
    }, [messages]);

    if (photos.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--sub-color)', padding: 40, fontSize: 16 }}>
                No photos found
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8,
        }}>
            {photos.map((photo, i) => {
                const src = photo.mediaPath.startsWith('http') ? photo.mediaPath : `/${photo.mediaPath}`;
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.01 }}
                        style={{
                            aspectRatio: '1', borderRadius: 'var(--radius-md)',
                            overflow: 'hidden', position: 'relative',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        <ImageViewer
                            src={src}
                            alt={`${SPEAKERS[photo.speaker]?.name} — ${photo.date}`}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover', maxHeight: 'none',
                                borderRadius: 0,
                            }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '16px 8px 6px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                            fontSize: 10, color: '#fff',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex', justifyContent: 'space-between',
                        }}>
                            <span>{SPEAKERS[photo.speaker]?.name}</span>
                            <span style={{ opacity: 0.7 }}>{photo.date}</span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

export default function Museum({ theme }) {
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('milestones');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([loadUnified(), loadStats()])
            .then(([unified, statsData]) => {
                const sorted = [...unified].sort((a, b) => a.timestamp - b.timestamp);
                setMessages(sorted);
                setStats(statsData);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load museum data:', err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center" style={{ minHeight: 400 }}>
                <div style={{ color: 'var(--main-color)', fontSize: 18, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                    Loading museum...
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto',
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)',
            fontFamily: 'var(--font-body)',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--text-color)', margin: 0,
                }}>
                    Museum
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-dim)', margin: '6px 0 0', fontFamily: 'var(--font-handwritten)' }}>
                    {formatNumber(messages.length)} memories across {Object.keys(PLATFORMS).length} platforms
                </p>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Museum sections" style={{
                display: 'flex', gap: 8, padding: '12px 16px',
                overflowX: 'auto', flexShrink: 0,
            }} className="no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-card)',
                            border: '1px solid',
                            borderColor: activeTab === tab.id ? 'var(--main-color)' : 'var(--border-color)',
                            background: activeTab === tab.id ? 'var(--main-color-dim)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--main-color)' : 'var(--text-dim)',
                            fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap',
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'var(--font-handwritten)',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '10px 16px 80px',
            }} className="no-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'milestones' && <MilestonesView messages={messages} stats={stats} />}
                        {activeTab === 'gallery' && <GalleryView messages={messages} />}
                        {activeTab === 'stickers' && <StickersView messages={messages} />}
                        {activeTab === 'links' && <LinksView messages={messages} />}
                        {activeTab === 'calls' && <CallsView messages={messages} stats={stats} />}
                        {activeTab === 'firsts' && <FirstsView messages={messages} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
