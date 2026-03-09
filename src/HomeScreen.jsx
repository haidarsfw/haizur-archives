import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { loadStats, loadHistoryByDateStandalone as loadHistoryByDate, releaseCache, PLATFORMS, SPEAKERS } from './dataLoader';
import { formatLastSeen } from './hooks/usePresence';
import PlatformIcon, { SecondaryBadge } from './PlatformIcons';

// IG account mapping: speakerRaw -> { handle, isSecondary }
const IG_ACCOUNTS = {
    'haidarsfw': { handle: '@haidarsfw', isSecondary: false },
    'veirfouls': { handle: '@veirfouls', isSecondary: true },
    'Nabila Azhura': { handle: '@azhuraasc', isSecondary: false },
    'otherzurraa': { handle: '@otherzurraa', isSecondary: true },
};

const SECTIONS = [
    {
        id: 'chat-browser', icon: '💬', label: 'Browse', desc: 'Every conversation, searchable',
        longDesc: 'Scroll through all 346,794 messages across every platform. Search, filter, and relive any moment.',
        teaser: '"the first IG DM that started it all"',
        color: '#5ba8cc',
    },
    {
        id: 'memory', icon: '🎲', label: 'Rewind', desc: 'Relive a random day',
        longDesc: 'Travel back to a random day and relive the full conversation from morning to night.',
        teaser: 'Every day from Jan 4, 2025 to today',
        color: '#d4956b',
    },
    {
        id: 'quiz', icon: '💭', label: 'Who?', desc: 'Guess the speaker',
        longDesc: "Can you tell who typed what? Warning: you both type 'BANGET' way too much.",
        teaser: '"tapi aku gatau kenapa"',
        color: '#5bbf8a',
    },
    {
        id: 'stats', icon: '📊', label: 'Word War', desc: 'Who said it more',
        longDesc: "Who says 'sorry' more? Who says 'sayang' more? The numbers don't lie.",
        teaser: '"sayang" — 1,365 times and counting',
        color: '#e8a0c0',
    },
    {
        id: 'museum', icon: '🏛', label: 'Museum', desc: 'Milestones, stickers, firsts',
        longDesc: 'A curated gallery of your firsts, photos, stickers, and milestones across every platform.',
        teaser: 'First message: "jdhsh" on TikTok',
        color: '#c9a87c',
    },
    {
        id: 'sky', icon: '🌙', label: 'Late Nights', desc: 'Messages sent after midnight',
        longDesc: 'The things you say when the world is asleep. 73K+ messages between 10PM and 5AM.',
        teaser: 'chatting until 4 AM on the regular',
        color: '#8b9ad4',
    },
    {
        id: 'time-capsule', icon: '📅', label: 'On This Day', desc: 'Today in our history',
        longDesc: "See what you were talking about on this exact date in previous months and years.",
        teaser: 'a daily time machine',
        color: '#4dbfb6',
    },
    {
        id: 'typing', icon: '⌨', label: 'Type Ours', desc: 'Type our words',
        longDesc: "A typing test, but every word is from your real conversations. How fast can you type your own love?",
        teaser: 'type your love story',
        color: '#e8a87c',
    },
    {
        id: 'finish', icon: '✏️', label: 'Complete Us', desc: 'Complete the sentence',
        longDesc: "Given the first half of a real message, can you pick the real ending?",
        teaser: '"aku tuh sebenernya..."',
        color: '#9ecbff',
    },
    {
        id: 'platform-quiz', icon: '🎯', label: 'Where?', desc: 'Where was this sent?',
        longDesc: 'Guess which platform a message was sent on. 6 platforms, 1 conversation.',
        teaser: 'WhatsApp? TikTok? Instagram?',
        color: '#cc5c8a',
    },
    {
        id: 'letters', icon: '✉', label: 'Love Notes', desc: 'Unlockable love notes',
        longDesc: 'Hidden letters that unlock as you explore. Some things are worth the wait.',
        teaser: 'for your eyes only',
        color: '#e895b8',
    },
    {
        id: 'archive', icon: '🔍', label: 'Search', desc: 'Find any message',
        longDesc: 'Full-text search across every message ever sent. Find that one thing you said that one time.',
        teaser: '"remember when you said..."',
        color: '#8a7668',
    },
    {
        id: 'boss', icon: '🎮', label: 'Paragraphs', desc: 'Hardcore co-op typing',
        longDesc: "Type out each other's longest messages as co-op boss fights. Only real paragraphs (≥200 chars) make it here.",
        teaser: 'those 3AM essay paragraphs',
        color: '#d48080',
    },
    {
        id: 'emoji-decoder', icon: '🧩', label: 'Emoji Decoder', desc: 'Decode emoji messages',
        longDesc: 'Given just the emojis from a real message, can you guess which message they belonged to? Your emoji game is about to be tested.',
        teaser: '✨🥺😭😋 = ???',
        color: '#c9b457',
    },
    {
        id: 'timeline-race', icon: '⏱️', label: 'Timeline Race', desc: 'Order by date',
        longDesc: 'Four real messages, one challenge: put them in the right chronological order. Tests how well you remember the flow of your story.',
        teaser: 'which came first?',
        color: '#57a0c9',
    },
    {
        id: 'chat-roulette', icon: '🎰', label: 'Chat Roulette', desc: 'Random message spin',
        longDesc: 'Spin the slot machine and land on a random message from your entire 346K+ message history. Save your favorites.',
        teaser: 'feeling lucky?',
        color: '#c95798',
    },
    {
        id: 'word-cloud', icon: '☁️', label: 'Word Cloud', desc: 'Your vocab visualized',
        longDesc: "An interactive cloud of your 60 most-used words, sized by frequency. Tap any word to see who says it more.",
        teaser: '\"aku\" × 15,982',
        color: '#7c57c9',
    },
    {
        id: 'daily-challenge', icon: '🏆', label: 'Daily Challenge', desc: 'New challenge every day',
        longDesc: 'A fresh challenge every day of the week — Quiz Monday, Speed Type Tuesday, Timeline Wednesday, and more. Come back daily!',
        teaser: 'today\'s challenge awaits',
        color: '#c9a057',
    },
];

// Hardcoded fun facts + dynamic ones from stats
const STATIC_FUN_FACTS = [
    { text: "848 messages per day on average", icon: '💬' },
    { text: "403 hours on calls together", icon: '📞' },
    { text: "6 platforms, 1 conversation", icon: '🌐' },
    { text: "chatting until 4 AM on the regular", icon: '🌙' },
    { text: "first message ever: \"jdhsh\" on TikTok", icon: '🎵' },
    { text: "6,280 photos shared", icon: '📸' },
    { text: "\"aku\" said 15,982 times — we really love talking about ourselves", icon: '🪞' },
    { text: "\"anjir\" appears 1,268 times — keeping it real", icon: '😤' },
    { text: "\"tidur\" mentioned 1,543 times — mostly at 3AM", icon: '💤' },
    { text: "7,522 stickers sent — a sticker for every mood", icon: '🏷️' },
    { text: "1,380 voice notes — sometimes typing isn't enough", icon: '🎤' },
    { text: "\"lucu\" (funny) said 1,138 times", icon: '😂' },
    { text: "\"makan\" (eat) mentioned 1,224 times — foodies confirmed", icon: '🍜' },
    { text: "\"takut\" (scared) said 1,248 times — scaredy cats", icon: '😱' },
    { text: "5,076 messages in one single day (July 18, 2025)", icon: '🏆' },
    { text: "462 videos shared across all platforms", icon: '🎬' },
    { text: "\"banget\" (very) used 3,977 times — VERY dramatic", icon: '🎭' },
    { text: "September 2025: 55,434 messages — the golden month", icon: '📅' },
    { text: "\"gamau\" (don't want) said 1,707 times — stubborn duo", icon: '🙅' },
    { text: "\"males\" (lazy) appears 1,427 times — relatable", icon: '🛋️' },
    { text: "963 calls, average 25 minutes each", icon: '☎️' },
    { text: "\"mama\" mentioned 961 times", icon: '👩' },
    { text: "\"gatau\" (don't know) 1,627 times — the universal answer", icon: '🤷' },
    { text: "15 GIFs total — apparently you prefer stickers", icon: '🖼️' },
    { text: "\"cape\" (tired) 978 times — sleep more!", icon: '😴' },
    { text: "265-day consecutive chat streak", icon: '🔥' },
    { text: "haidar sends 54.7% of all messages — the chatterbox", icon: '🗣️' },
    { text: "\"kamu\" (you) said 1,371 times — always about each other", icon: '💕' },
];

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return Math.floor(num / 1000).toLocaleString() + 'K';
    return num.toLocaleString();
}

function AnimatedNumber({ value, delay = 0, skipMotion }) {
    const [display, setDisplay] = useState(skipMotion ? value : 0);
    useEffect(() => {
        if (skipMotion) { setDisplay(value); return; }
        const timeout = setTimeout(() => {
            const end = value;
            const duration = 1200;
            const startTime = Date.now();
            const tick = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setDisplay(Math.floor(eased * end));
                if (progress < 1) requestAnimationFrame(tick);
            };
            tick();
        }, delay);
        return () => clearTimeout(timeout);
    }, [value, delay, skipMotion]);
    return <span>{display.toLocaleString()}</span>;
}

function FunFact({ fact, index, skipMotion }) {
    const isLeft = index % 2 === 0;
    return (
        <motion.div
            initial={skipMotion ? false : { opacity: 0, x: isLeft ? -30 : 30 }}
            whileInView={skipMotion ? undefined : { opacity: 1, x: 0 }}
            animate={skipMotion ? { opacity: 1, x: 0 } : undefined}
            viewport={skipMotion ? undefined : { once: true, margin: '-50px' }}
            transition={skipMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
            style={{
                alignSelf: isLeft ? 'flex-start' : 'flex-end',
                maxWidth: 480,
                width: '100%',
            }}
        >
            <div className="fun-fact-card" style={{
                borderLeftColor: isLeft ? 'var(--main-color)' : 'var(--sub-color)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{fact.icon}</span>
                    <span style={{
                        fontFamily: 'var(--font-handwritten)',
                        fontSize: 20,
                        fontWeight: 400,
                        color: 'var(--text-on-card)',
                        lineHeight: 1.5,
                    }}>
                        {fact.text}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function GamemodeShowcase({ section, index, onNavigate, skipMotion }) {
    const isReverse = index % 2 !== 0;
    return (
        <motion.div
            initial={skipMotion ? false : { opacity: 0, y: 24 }}
            whileInView={skipMotion ? undefined : { opacity: 1, y: 0 }}
            animate={skipMotion ? { opacity: 1, y: 0 } : undefined}
            viewport={skipMotion ? undefined : { once: true, margin: '-40px' }}
            transition={skipMotion ? { duration: 0 } : { duration: 0.5, delay: (index % 3) * 0.05 }}
            whileHover={{ y: -2 }}
            className={`gamemode-showcase ${isReverse ? 'reverse' : ''}`}
            onClick={() => onNavigate(section.id)}
        >
            <div className="showcase-icon" style={{
                transform: `rotate(${isReverse ? '2' : '-2'}deg)`,
            }}>
                {section.icon}
            </div>
            <div className="showcase-text">
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--text-color)',
                    margin: '0 0 8px',
                }}>
                    {section.label}
                </h3>
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    color: 'var(--sub-color)',
                    lineHeight: 1.6,
                    margin: '0 0 10px',
                }}>
                    {section.longDesc}
                </p>
                <span style={{
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 15,
                    color: 'var(--main-color)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                }}>
                    {section.teaser}
                </span>
            </div>
        </motion.div>
    );
}

function OnThisDayPreview({ historyByDate, onNavigate, skipMotion }) {
    const [todayMessages, setTodayMessages] = useState([]);

    useEffect(() => {
        if (!historyByDate) return;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const matches = [];
        for (const [date, msgs] of Object.entries(historyByDate)) {
            if (date.endsWith(`-${month}-${day}`)) {
                matches.push(...msgs.slice(0, 3).map(m => ({ ...m, year: date.split('-')[0], fullDate: date })));
            }
        }
        setTodayMessages(matches.slice(0, 4));
    }, [historyByDate]);

    if (todayMessages.length === 0) return null;

    return (
        <motion.div
            initial={skipMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={skipMotion ? { duration: 0 } : { delay: 1.8, duration: 0.6 }}
            style={{ marginBottom: 40 }}
        >
            <div className="section-divider" style={{ marginBottom: 20 }}>
                <span style={{
                    fontFamily: 'var(--font-handwritten)', fontSize: 20, fontWeight: 400,
                    color: 'var(--sub-color-light)',
                    transform: 'rotate(-1deg)', display: 'inline-block',
                }}>
                    On This Day
                </span>
            </div>
            <div className="thread-line" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 24 }}>
                {todayMessages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={skipMotion ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={skipMotion ? { duration: 0 } : { delay: 2.0 + i * 0.1 }}
                        whileHover={{ scale: 1.01 }}
                        className="thread-pin"
                        onClick={() => onNavigate('chat-browser', { date: msg.fullDate, text: msg.text, speaker: msg.speaker, time: msg.time, platform: msg.platform, timestamp: msg.timestamp })}
                        style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            padding: '14px 18px',
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-card)',
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ fontSize: 14, color: 'var(--text-dim-card)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            {msg.year}
                        </span>
                        <span style={{ fontSize: 15, color: 'var(--text-on-card)', lineHeight: 1.5, flex: 1 }}>
                            {msg.text.length > 90 ? msg.text.substring(0, 90) + '...' : msg.text}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {msg.platform && <PlatformIcon platform={msg.platform} size={13} />}
                            {msg.platform === 'instagram' && msg.speakerRaw && IG_ACCOUNTS[msg.speakerRaw] && (
                                <span style={{
                                    fontSize: 10, opacity: 0.5,
                                    fontFamily: 'var(--font-mono)',
                                    display: 'inline-flex', alignItems: 'center', gap: 1,
                                    color: 'var(--sub-color)',
                                }}>
                                    {IG_ACCOUNTS[msg.speakerRaw].handle}
                                    {IG_ACCOUNTS[msg.speakerRaw].isSecondary && <SecondaryBadge size={10} />}
                                </span>
                            )}
                            <span style={{ fontSize: 14, opacity: 0.5, color: 'var(--main-color)' }}>
                                {SPEAKERS[msg.speaker]?.name?.charAt(0)}
                            </span>
                        </span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

export default function HomeScreen({ onNavigate, theme, currentUser, partnerPresence, onSwitchRole, skipMotion }) {
    const [stats, setStats] = useState(null);
    const [historyByDate, setHistoryByDate] = useState(null);
    const [randomQuote, setRandomQuote] = useState(null);
    const [funFacts, setFunFacts] = useState(STATIC_FUN_FACTS);

    useEffect(() => {
        loadStats().then(data => {
            setStats(data);
            // Build dynamic fun facts from stats data
            const dynamic = [];
            if (data.funFacts) {
                const sayangFact = data.funFacts.find(f => f.id === 'sayang_total');
                if (sayangFact) dynamic.push({ text: `you've said "sayang" ${sayangFact.value.toLocaleString()} times`, icon: '💕' });

                const streakFact = data.funFacts.find(f => f.id === 'streak');
                if (streakFact) dynamic.push({ text: `${streakFact.value}-day streak of chatting every single day`, icon: '🔥' });

                const petFact = data.funFacts.find(f => f.id === 'pet_names');
                if (petFact) dynamic.push({ text: `pet names: "zur" ${petFact.value.zur?.toLocaleString()}x, "kak" ${petFact.value.kak?.toLocaleString()}x`, icon: '🥰' });

                const busiestMonth = data.funFacts.find(f => f.id === 'busiest_month');
                if (busiestMonth) {
                    const monthNames = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December' };
                    const [y, m] = (busiestMonth.month || '').split('-');
                    const monthName = monthNames[m] || m;
                    dynamic.push({ text: `busiest month: ${monthName} ${y} (${busiestMonth.value.toLocaleString()} messages)`, icon: '📈' });
                }

                const topEmoji = data.funFacts.find(f => f.id === 'top_emoji');
                if (topEmoji) {
                    // Append VS16 (\uFE0F) to force colored emoji rendering
                    const colorEmoji = topEmoji.emoji + '\uFE0F';
                    dynamic.push({ text: `favorite emoji: ${colorEmoji} (used ${topEmoji.value.toLocaleString()} times)`, icon: colorEmoji });
                }

                const busiestDay = data.funFacts.find(f => f.id === 'busiest_day');
                if (busiestDay) dynamic.push({ text: `${busiestDay.value.toLocaleString()} messages in a single day (${busiestDay.date})`, icon: '🤯' });
            }
            // Merge: alternate between static and dynamic
            const merged = [];
            const maxLen = Math.max(STATIC_FUN_FACTS.length, dynamic.length);
            for (let i = 0; i < maxLen; i++) {
                if (i < STATIC_FUN_FACTS.length) merged.push(STATIC_FUN_FACTS[i]);
                if (i < dynamic.length) merged.push(dynamic[i]);
            }
            setFunFacts(merged);
        }).catch(console.error);

        loadHistoryByDate().then(data => {
            setHistoryByDate(data);
            const candidates = [];
            for (const [date, msgs] of Object.entries(data)) {
                for (const m of msgs) {
                    if (!m.text || m.text.length < 10) continue;
                    if (m.type && m.type !== 'text') continue;
                    candidates.push({ ...m, date });
                }
            }
            if (candidates.length > 0) {
                setRandomQuote(candidates[Math.floor(Math.random() * candidates.length)]);
            }
        }).catch(console.error);

        return () => { releaseCache('historyByDate'); };
    }, []);

    // Interleave fun facts between gamemode showcases (memoized)
    const contentItems = useMemo(() => {
        const items = [];
        let factIndex = 0;
        const factsPerGap = Math.max(1, Math.ceil(funFacts.length / SECTIONS.length));
        SECTIONS.forEach((section, i) => {
            items.push({ type: 'gamemode', section, index: i });
            for (let f = 0; f < factsPerGap && factIndex < funFacts.length; f++) {
                items.push({ type: 'funfact', fact: funFacts[factIndex], index: factIndex });
                factIndex++;
            }
        });
        return items;
    }, [funFacts]);

    return (
        <div style={{
            width: '100%', maxWidth: 'var(--width-home)', margin: '0 auto',
            padding: '0 24px 100px', minHeight: '100dvh',
        }}>
            {/* --- HERO --- */}
            <div style={{
                minHeight: '85vh', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                position: 'relative',
            }}>
                {/* Partner presence */}
                {partnerPresence && (
                    <motion.div
                        initial={skipMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={skipMotion ? { duration: 0 } : { delay: 2.5 }}
                        style={{
                            position: 'absolute', top: 24, right: 0,
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 13, color: 'var(--text-dim)',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: partnerPresence.online ? 'var(--success-color)' : 'var(--sub-color)',
                            boxShadow: partnerPresence.online ? '0 0 8px var(--success-color)' : 'none',
                        }} />
                        {SPEAKERS[currentUser === 'haidar' ? 'p2' : 'p1']?.name}: {formatLastSeen(partnerPresence)}
                    </motion.div>
                )}

                {/* Title block */}
                <motion.div
                    initial={skipMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={skipMotion ? { duration: 0 } : { duration: 1.2, delay: 0.2 }}
                >
                    <motion.div
                        initial={skipMotion ? false : { opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={skipMotion ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}
                        className="wax-seal animate-gentle-bob"
                        style={{ margin: '0 auto 20px', width: 72, height: 72, fontSize: 18, letterSpacing: '-0.05em' }}
                    >
                        hz
                    </motion.div>

                    <motion.h1
                        initial={skipMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={skipMotion ? { duration: 0 } : { duration: 0.8, delay: 0.4 }}
                        className="warm-glow ink-splatter"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(56px, 12vw, 96px)',
                            fontWeight: 400,
                            fontStyle: 'italic',
                            lineHeight: 0.95,
                            margin: 0,
                            letterSpacing: '-0.02em',
                            color: 'var(--text-color)',
                        }}
                    >
                        haizur
                    </motion.h1>
                    <motion.div
                        initial={skipMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={skipMotion ? { duration: 0 } : { duration: 0.8, delay: 0.7 }}
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 16,
                            fontWeight: 400,
                            letterSpacing: '0.25em',
                            color: 'var(--main-color)',
                            marginTop: 12,
                            textTransform: 'uppercase',
                        }}
                    >
                        archives
                    </motion.div>
                </motion.div>

                {/* Ornamental line */}
                <motion.div
                    initial={skipMotion ? false : { width: 0 }}
                    animate={{ width: 64 }}
                    transition={skipMotion ? { duration: 0 } : { duration: 0.6, delay: 1.1 }}
                    style={{
                        height: 1, background: 'var(--main-color)', opacity: 0.3,
                        marginTop: 32, marginBottom: 32,
                    }}
                />

                {/* Stats row — Polaroid cards */}
                {stats && (
                    <motion.div
                        initial={skipMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={skipMotion ? { duration: 0 } : { delay: 1.3, duration: 0.8 }}
                        style={{
                            display: 'flex', gap: 20, justifyContent: 'center',
                            marginBottom: 36, flexWrap: 'wrap',
                        }}
                    >
                        {[
                            { value: stats.totalMessages, label: 'messages', rotation: -1.5 },
                            { value: stats.callStats ? Math.floor(stats.callStats.totalMinutes / 60) : 0, label: 'hours call', rotation: 1.2 },
                            { value: stats.totalDays, label: 'days', rotation: 0.8 },
                            { value: Object.keys(stats.byPlatform).filter(k => stats.byPlatform[k].total > 0).length, label: 'platforms', rotation: -0.5 },
                        ].map((stat, i) => (
                            <div key={stat.label} className="tape-top" style={{
                                textAlign: 'center',
                                background: 'var(--bg-card)',
                                padding: '24px 28px 10px',
                                border: '6px solid var(--bg-card)',
                                borderBottomWidth: 28,
                                boxShadow: '0 3px 12px var(--shadow-color)',
                                transform: `rotate(${stat.rotation}deg)`,
                            }}>
                                <div style={{
                                    fontSize: 36, fontWeight: 400, color: 'var(--text-on-card)',
                                    fontFamily: 'var(--font-display)',
                                }}>
                                    <AnimatedNumber value={stat.value} delay={1400 + i * 200} skipMotion={skipMotion} />
                                </div>
                                <div style={{
                                    fontSize: 16, color: 'var(--text-dim-card)',
                                    fontFamily: 'var(--font-handwritten)', marginTop: 4,
                                    transform: 'rotate(-1deg)',
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Clean platform stats (replacing dashed-border pills) */}
                {stats && (
                    <motion.div
                        initial={skipMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={skipMotion ? { duration: 0 } : { delay: 1.6, duration: 0.6 }}
                        style={{
                            display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
                        }}
                    >
                        {Object.entries(stats.byPlatform).filter(([, v]) => v.total > 0).map(([platform, data]) => (
                            <span
                                key={platform}
                                className="platform-stat"
                                style={{ color: PLATFORMS[platform]?.color }}
                            >
                                <PlatformIcon platform={platform} size={14} /> {formatNumber(data.total)}
                            </span>
                        ))}
                    </motion.div>
                )}

                {/* Scroll indicator */}
                <motion.div
                    initial={skipMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={skipMotion ? { duration: 0 } : { delay: 2.5 }}
                    style={{
                        position: 'absolute', bottom: 20,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                >
                    <span style={{ fontSize: 14, fontFamily: 'var(--font-handwritten)', color: 'var(--sub-color-light)', transform: 'rotate(-2deg)', display: 'inline-block' }}>
                        scroll down
                    </span>
                    <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ width: 1, height: 20, background: 'var(--sub-color)' }}
                    />
                </motion.div>
            </div>

            {/* --- RANDOM QUOTE --- */}
            {randomQuote && (
                <motion.div
                    initial={skipMotion ? false : { opacity: 0, y: 16 }}
                    whileInView={skipMotion ? undefined : { opacity: 1, y: 0 }}
                    animate={skipMotion ? { opacity: 1, y: 0 } : undefined}
                    viewport={skipMotion ? undefined : { once: true }}
                    transition={skipMotion ? { duration: 0 } : { duration: 0.6 }}
                    whileHover={{ scale: 1.01 }}
                    className="lined-paper"
                    onClick={() => onNavigate('chat-browser', { date: randomQuote.date, text: randomQuote.text, speaker: randomQuote.speaker, time: randomQuote.time, platform: randomQuote.platform, timestamp: randomQuote.timestamp })}
                    style={{
                        padding: '36px 28px 36px 52px', marginBottom: 40,
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-card)',
                        boxShadow: '0 3px 12px var(--shadow-warm)',
                        position: 'relative',
                        cursor: 'pointer',
                    }}
                >
                    <p style={{
                        margin: 0, fontSize: 22, lineHeight: '30px',
                        color: 'var(--text-on-card)',
                        fontFamily: 'var(--font-handwritten)', fontWeight: 400,
                    }}>
                        "{randomQuote.text}"
                    </p>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 16,
                        fontSize: 14, color: 'var(--text-dim-card)',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        <span style={{ fontWeight: 600 }}>{SPEAKERS[randomQuote.speaker]?.name}</span>
                        <span style={{ opacity: 0.3 }}>--</span>
                        <span>{randomQuote.date}</span>
                        {randomQuote.platform && (
                            <PlatformIcon platform={randomQuote.platform} size={14} />
                        )}
                        {randomQuote.platform === 'instagram' && randomQuote.speakerRaw && IG_ACCOUNTS[randomQuote.speakerRaw] && (
                            <span style={{
                                fontSize: 11, opacity: 0.6,
                                fontFamily: 'var(--font-mono)',
                                display: 'inline-flex', alignItems: 'center', gap: 2,
                            }}>
                                {IG_ACCOUNTS[randomQuote.speakerRaw].handle}
                                {IG_ACCOUNTS[randomQuote.speakerRaw].isSecondary && <SecondaryBadge size={11} />}
                            </span>
                        )}
                    </div>
                </motion.div>
            )}

            {/* --- ON THIS DAY --- */}
            <OnThisDayPreview historyByDate={historyByDate} onNavigate={onNavigate} skipMotion={skipMotion} />

            {/* --- GAMEMODE SHOWCASES + FUN FACTS --- */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: 12,
            }}>
                <div className="section-divider" style={{ marginBottom: 12 }}>
                    <span style={{
                        fontFamily: 'var(--font-handwritten)', fontSize: 20, fontWeight: 400,
                        color: 'var(--sub-color-light)',
                        transform: 'rotate(-1deg)', display: 'inline-block',
                    }}>
                        Explore
                    </span>
                </div>

                {contentItems.map((item, i) => {
                    if (item.type === 'gamemode') {
                        return (
                            <GamemodeShowcase
                                key={`gm-${item.section.id}`}
                                section={item.section}
                                index={item.index}
                                onNavigate={onNavigate}
                                skipMotion={skipMotion}
                            />
                        );
                    }
                    return (
                        <FunFact
                            key={`ff-${i}`}
                            fact={item.fact}
                            index={item.index}
                            skipMotion={skipMotion}
                        />
                    );
                })}
            </div>

            {/* --- FOOTER --- */}
            <motion.div
                initial={skipMotion ? false : { opacity: 0 }}
                whileInView={skipMotion ? undefined : { opacity: 1 }}
                animate={skipMotion ? { opacity: 1 } : undefined}
                viewport={skipMotion ? undefined : { once: true }}
                style={{
                    textAlign: 'center', padding: '48px 0 16px',
                    fontSize: 14, color: 'var(--sub-color)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                }}
            >
                {onSwitchRole && (
                    <button
                        onClick={onSwitchRole}
                        style={{
                            display: 'block', margin: '0 auto 16px', fontSize: 14,
                            color: 'var(--sub-color)', background: 'none', border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-handwritten)', letterSpacing: '0.05em',
                            borderBottom: '1px dashed var(--sub-color)',
                        }}
                    >
                        switch role
                    </button>
                )}
                <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>haizur archives</span>
            </motion.div>
        </div>
    );
}
