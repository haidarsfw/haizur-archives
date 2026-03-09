import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loadUnified, releaseCache, PLATFORMS, SPEAKERS } from './dataLoader';
import MediaRenderer from './MediaRenderer';
import PlatformIcon, { SecondaryBadge } from './PlatformIcons';

// IG account mapping
const IG_ACCOUNTS = {
    'haidarsfw': { handle: '@haidarsfw', isSecondary: false },
    'veirfouls': { handle: '@veirfouls', isSecondary: true },
    'Nabila Azhura': { handle: '@azhuraasc', isSecondary: false },
    'otherzurraa': { handle: '@otherzurraa', isSecondary: true },
};

const PLATFORM_TABS = [
    { id: 'all', label: 'All' },
    {
        id: 'whatsapp_all', label: 'WhatsApp', subTabs: [
            { id: 'whatsapp_all', label: 'All' },
            { id: 'whatsapp', label: 'WA' },
            { id: 'whatsapp2', label: 'WA', isSecondary: true },
        ]
    },
    {
        id: 'instagram_all', label: 'Instagram', subTabs: [
            { id: 'instagram_all', label: 'All' },
            { id: 'instagram_main', label: 'Main' },
            { id: 'instagram_alt', label: 'Second' },
        ]
    },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'imessage', label: 'iMessage' },
    { id: 'discord', label: 'Discord' },
];

// Map sub-platform IDs to icon platform for PlatformIcon component
const PLATFORM_ICON_MAP = {
    all: null,
    whatsapp_all: 'whatsapp',
    whatsapp: 'whatsapp',
    whatsapp2: 'whatsapp2',
    instagram_all: 'instagram',
    instagram_main: 'instagram',
    instagram_alt: 'instagram',
    tiktok: 'tiktok',
    imessage: 'imessage',
    discord: 'discord',
};

const CONTENT_TABS = [
    { id: 'all', label: 'All', icon: '💬' },
    { id: 'photos', label: 'Photos', icon: '📸' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: 'audio', label: 'Voice', icon: '🎙️' },
    { id: 'stickers', label: 'Stickers', icon: '🏷️' },
    { id: 'calls', label: 'Calls', icon: '📞' },
];

const BATCH_SIZE = 80;
const GRID_BATCH = 60;

// Virtualized grid: renders items incrementally using IntersectionObserver
function VirtualizedGrid({ displayed, filtered, contentType }) {
    const [visibleCount, setVisibleCount] = useState(GRID_BATCH);
    const sentinelRef = useRef(null);

    // Reset visible count when content changes
    useEffect(() => {
        setVisibleCount(GRID_BATCH);
    }, [contentType, filtered.length]);

    // IntersectionObserver to load more items
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + GRID_BATCH, displayed.length));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [displayed.length]);

    const visibleItems = displayed.slice(0, visibleCount);

    return (
        <>
            <div style={{
                padding: '8px 0 4px', fontSize: 13,
                color: 'var(--sub-color)', fontFamily: 'var(--font-mono)',
            }}>
                {filtered.length} {contentType === 'video_notes' ? 'video notes' : contentType}
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 8, padding: '8px 0',
            }}>
                {visibleItems.map((msg, i) => (
                    <div key={i} style={{
                        aspectRatio: contentType === 'video_notes' ? undefined : '1',
                        overflow: 'hidden',
                        borderRadius: contentType === 'video_notes' ? '50%' : 'var(--radius-card)',
                        background: 'var(--bg-card)',
                        border: contentType === 'video_notes' ? '3px solid var(--main-color)' : '1px solid var(--border-color)',
                        position: 'relative', cursor: 'pointer',
                        ...(contentType === 'video_notes' ? { width: 140, height: 140, margin: '0 auto' } : {}),
                    }}>
                        <MediaRenderer message={msg} gridMode />
                        {contentType !== 'video_notes' && (
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                padding: '16px 8px 6px',
                                fontSize: 11, color: '#fff',
                                fontFamily: 'var(--font-mono)',
                                pointerEvents: 'none',
                            }}>
                                {msg.date} · {SPEAKERS[msg.speaker]?.name}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {visibleCount < displayed.length && (
                <div ref={sentinelRef} style={{
                    textAlign: 'center', padding: '16px',
                    color: 'var(--sub-color)', fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                }}>
                    Loading more... ({visibleCount}/{displayed.length.toLocaleString()})
                </div>
            )}
        </>
    );
}


export default function ChatBrowser({ theme, initialTarget, initialTargetState, clearTargetState, savedState, currentRole }) {
    const [allMessages, setAllMessages] = useState([]);
    const [displayed, setDisplayed] = useState([]);
    const [platform, setPlatform] = useState('all');
    const [subPlatform, setSubPlatform] = useState(null);
    const platformIndexRef = useRef(null); // Pre-computed platform -> messages map
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(''); // Sidebar highlight only
    const [jumpDate, setJumpDate] = useState(null); // Triggers scroll-to-date
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [loadProgress, setLoadProgress] = useState('Connecting...');
    const [dateRange, setDateRange] = useState({ min: '', max: '' });
    const [speakerFilter, setSpeakerFilter] = useState('all'); // 'all', 'p1', 'p2'
    const [contentType, setContentType] = useState('all');
    const [sortOrder, setSortOrder] = useState('oldest'); // 'oldest', 'newest'
    const [highlightedIdx, setHighlightedIdx] = useState(null);
    const [navError, setNavError] = useState(null);
    const scrollRef = useRef(null);
    const loadMoreRef = useRef(null);
    const searchInputRef = useRef(null);
    const navigationInProgress = useRef(false);
    const timestampIndexRef = useRef(null); // O(1) lookup Map for target matching
    const displayOffset = useRef(0); // Tracks where displayed window starts in filtered array

    // Load data with retry and abort on unmount
    useEffect(() => {
        let retries = 0;
        const maxRetries = 3;
        let cancelled = false;
        let retryTimeout = null;

        const load = () => {
            if (cancelled) return;
            setLoadProgress(`Loading messages${retries > 0 ? ` (attempt ${retries + 1})` : ''}...`);
            setIsLoading(true);
            setLoadError(false);

            loadUnified().then(data => {
                if (cancelled) return;
                if (!data || !Array.isArray(data) || data.length === 0) {
                    throw new Error('Empty or invalid data');
                }
                setLoadProgress(`Sorting ${data.length.toLocaleString()} messages...`);
                data.sort((a, b) => a.timestamp - b.timestamp || (a.seq ?? 0) - (b.seq ?? 0)); // Sort by timestamp, then seq for same-timestamp messages

                // Build pre-computed platform index for O(1) platform switching
                const index = new Map();
                index.set('all', data);
                const buckets = { whatsapp: [], whatsapp2: [], instagram: [], tiktok: [], imessage: [], discord: [] };
                const igMain = []; // @haidarsfw + @azhuraasc (Nabila Azhura)
                const igAlt = [];  // @veirfouls + @otherzurraa
                for (const m of data) {
                    if (buckets[m.platform]) buckets[m.platform].push(m);
                    if (m.platform === 'instagram') {
                        const raw = m.speakerRaw;
                        if (raw === 'haidarsfw' || raw === 'Nabila Azhura') igMain.push(m);
                        else if (raw === 'veirfouls' || raw === 'otherzurraa') igAlt.push(m);
                        else igMain.push(m); // Al Khalifah Media etc. go into Main for sub-tab, All for top
                    }
                }
                for (const [k, v] of Object.entries(buckets)) index.set(k, v);
                index.set('whatsapp_all', [...buckets.whatsapp, ...buckets.whatsapp2].sort((a, b) => a.timestamp - b.timestamp || (a.seq ?? 0) - (b.seq ?? 0)));
                index.set('instagram_all', buckets.instagram);
                index.set('instagram_main', igMain);
                index.set('instagram_alt', igAlt);
                platformIndexRef.current = index;

                // Build O(1) lookup map for navigation targets
                const tsIndex = new Map();
                for (let i = 0; i < data.length; i++) {
                    const m = data[i];
                    const key = `${m.timestamp}|${m.text}|${m.speaker}`;
                    if (!tsIndex.has(key)) tsIndex.set(key, i);
                }
                timestampIndexRef.current = tsIndex;

                setAllMessages(data);
                if (data.length > 0) {
                    setDateRange({
                        min: data[0].date,
                        max: data[data.length - 1].date,
                    });
                }
                setIsLoading(false);
            }).catch(err => {
                if (cancelled) return;
                console.error('Chat load failed:', err);
                if (retries < maxRetries) {
                    retries++;
                    setLoadProgress(`Retrying in 2s... (attempt ${retries + 1}/${maxRetries + 1})`);
                    retryTimeout = setTimeout(load, 2000);
                } else {
                    setLoadError(true);
                    setIsLoading(false);
                }
            });
        };
        load();

        return () => {
            cancelled = true;
            if (retryTimeout) clearTimeout(retryTimeout);
            // Free the large unified.json cache when leaving ChatBrowser
            releaseCache('unified');
        };
    }, []);

    // Save per-platform scroll positions on unmount (filters cleared on exit)
    useEffect(() => {
        return () => {
            if (savedState) {
                savedState.current = {
                    scrollPositions: {
                        ...savedState.current?.scrollPositions,
                        [platform]: {
                            scrollTop: scrollRef.current?.scrollTop || 0,
                            displayOffset: displayOffset.current,
                            displayedLen: displayed.length,
                        },
                    },
                    lastPlatform: platform,
                    // Filters are NOT saved (cleared on exit)
                };
            }
        };
    }, [platform, displayed.length]);

    // Restore last platform + scroll on mount (no initialTarget)
    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current || !savedState?.current || allMessages.length === 0) return;
        if (initialTarget?.current || initialTargetState) return; // initialTarget takes precedence
        restoredRef.current = true;
        const lastPlatform = savedState.current?.lastPlatform || 'all';
        setPlatform(lastPlatform);
        // Restore scroll for this platform after render
        const platformScroll = savedState.current?.scrollPositions?.[lastPlatform];
        if (platformScroll) {
            requestAnimationFrame(() => {
                displayOffset.current = platformScroll.displayOffset || 0;
                requestAnimationFrame(() => {
                    if (scrollRef.current) scrollRef.current.scrollTop = platformScroll.scrollTop || 0;
                });
            });
        }
    }, [allMessages]);

    // Unified navigation: consume target, match, set display window, scroll — all in one effect
    useEffect(() => {
        if (allMessages.length === 0) return;
        const target = initialTarget?.current || initialTargetState;
        if (!target) return;

        console.log('[Nav] Target received:', { text: target.text?.slice(0, 40), ts: target.timestamp, date: target.date });
        navigationInProgress.current = true;

        // Clear the ref immediately so we don't re-process
        if (initialTarget?.current) initialTarget.current = null;

        // Defer clearing parent state to avoid re-render interference
        if (clearTargetState) setTimeout(() => clearTargetState(), 100);

        // Match against allMessages directly (platform-independent)
        const searchPool = allMessages;
        let idx = -1;

        // 0. O(1) direct lookup via precomputed Map
        if (target.timestamp && target.text && timestampIndexRef.current) {
            const key = `${target.timestamp}|${target.text}|${target.speaker}`;
            const mapIdx = timestampIndexRef.current.get(key);
            if (mapIdx !== undefined) idx = mapIdx;
        }
        // 1. Timestamp + exact text + speaker (±5s)
        if (idx < 0 && target.timestamp && target.text) {
            idx = searchPool.findIndex(m => m.text === target.text && m.speaker === target.speaker && Math.abs((m.timestamp || 0) - target.timestamp) < 5000);
        }
        // 2. Date + time + text + speaker + platform (exact)
        if (idx < 0 && target.time && target.date && target.text) {
            idx = searchPool.findIndex(m => m.date === target.date && m.time === target.time && m.text === target.text && m.speaker === target.speaker && (!target.platform || m.platform === target.platform));
        }
        // 3. Date + time + text + speaker (no platform)
        if (idx < 0 && target.time && target.date && target.text) {
            idx = searchPool.findIndex(m => m.date === target.date && m.time === target.time && m.text === target.text && m.speaker === target.speaker);
        }
        // 4. Date + speaker + text startsWith (first 40 chars)
        if (idx < 0 && target.date && target.text && target.text.length >= 10) {
            const prefix = target.text.substring(0, 40);
            idx = searchPool.findIndex(m => m.date === target.date && m.speaker === target.speaker && m.text && m.text.startsWith(prefix));
        }
        // 5. Timestamp + speaker (±30s wider window)
        if (idx < 0 && target.timestamp) {
            idx = searchPool.findIndex(m => m.speaker === target.speaker && Math.abs((m.timestamp || 0) - target.timestamp) < 30000);
        }
        // 6. Date + time + speaker (no text)
        if (idx < 0 && target.time && target.date) {
            idx = searchPool.findIndex(m => m.date === target.date && m.time === target.time && m.speaker === target.speaker);
        }
        // 7. Text + speaker (global, no date)
        if (idx < 0 && target.text) {
            idx = searchPool.findIndex(m => m.text === target.text && m.speaker === target.speaker);
        }

        if (idx < 0) {
            console.warn('[Nav] FAILED:', { text: target.text?.slice(0, 40), ts: target.timestamp, pool: searchPool.length });
            navigationInProgress.current = false;
            setNavError('Message not found');
            setTimeout(() => setNavError(null), 4000);
            // Fallback: jump to the target date
            if (target.date) {
                const dateIdx = allMessages.findIndex(m => m.date === target.date || m.date > target.date);
                if (dateIdx >= 0) {
                    const startIdx = Math.max(0, dateIdx - BATCH_SIZE * 3);
                    const endIdx = Math.min(allMessages.length, dateIdx + BATCH_SIZE * 5);
                    displayOffset.current = startIdx;
                    flushSync(() => {
                        setPlatform('all');
                        setSubPlatform(null);
                        setDisplayed(allMessages.slice(startIdx, endIdx));
                    });
                    if (target.date) setSelectedDate(target.date);
                    requestAnimationFrame(() => {
                        const el = scrollRef.current?.querySelector(`[data-msg-idx="${dateIdx}"]`);
                        if (el) el.scrollIntoView({ block: 'start' });
                    });
                }
            }
            return;
        }

        console.log('[Nav] Match found at idx:', idx);

        // Window: load ±400 messages around the target
        const startIdx = Math.max(0, idx - BATCH_SIZE * 5);
        const endIdx = Math.min(allMessages.length, idx + BATCH_SIZE * 5);
        displayOffset.current = startIdx;

        // Commit platform switch + display window synchronously in one flushSync
        flushSync(() => {
            setPlatform('all');
            setSubPlatform(null);
            setDisplayed(allMessages.slice(startIdx, endIdx));
        });

        if (target.date) setSelectedDate(target.date);
        setHighlightedIdx(idx);
        setTimeout(() => setHighlightedIdx(null), 8000);

        // Scroll with RAF retry (up to 5 attempts) — element may not be painted yet
        let attempts = 0;
        const tryScroll = () => {
            const el = scrollRef.current?.querySelector(`[data-msg-idx="${idx}"]`);
            if (el) {
                el.scrollIntoView({ block: 'center' });
                console.log('[Nav] Scrolled to element');
                navigationInProgress.current = false;
            } else if (attempts < 5) {
                attempts++;
                requestAnimationFrame(tryScroll);
            } else {
                console.warn('[Nav] Element not found after 5 attempts');
                navigationInProgress.current = false;
            }
        };
        requestAnimationFrame(tryScroll);

        // Safety timeout: clear navigation lock after 3s no matter what
        const safetyTimer = setTimeout(() => {
            navigationInProgress.current = false;
        }, 3000);

        return () => clearTimeout(safetyTimer);
    }, [allMessages, initialTargetState]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Keyboard shortcut: Ctrl+F to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Resolve effective platform from sub-tab or main tab
    const effectivePlatform = subPlatform || platform;

    // Filter logic — useMemo so filtered is always synchronous with current state
    const filtered = useMemo(() => {
        // Use pre-computed platform index for O(1) lookup
        let msgs = platformIndexRef.current?.get(effectivePlatform) || allMessages;
        if (speakerFilter !== 'all') msgs = msgs.filter(m => m.speaker === speakerFilter);
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            msgs = msgs.filter(m => m.text && m.text.toLowerCase().includes(q));
        }
        if (contentType === 'photos') {
            msgs = msgs.filter(m => m.mediaPath &&
                (m.type === 'image' || m.isLivePhoto ||
                    (m.type === 'sticker' && /PHOTO-/i.test(m.mediaPath)) ||
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(m.mediaPath)));
        } else if (contentType === 'videos') {
            msgs = msgs.filter(m => m.mediaPath && m.type === 'video' && !m.isLivePhoto);
        } else if (contentType === 'audio') {
            msgs = msgs.filter(m => m.mediaPath && (m.type === 'audio' || /\.(mp3|m4a|ogg|wav|caf|opus)$/i.test(m.mediaPath)));
        } else if (contentType === 'stickers') {
            msgs = msgs.filter(m => m.type === 'sticker' && (
                (m.mediaPath && !/PHOTO-/i.test(m.mediaPath))
                || (m.text && /https?:\/\//i.test(m.text))
            ));
        } else if (contentType === 'calls') {
            msgs = msgs.filter(m => m.type === 'call');
        }
        if (sortOrder === 'newest') msgs = [...msgs].reverse();
        return msgs;
    }, [allMessages, effectivePlatform, debouncedSearch, speakerFilter, contentType, sortOrder]);

    // Update displayed batch when filter results change
    useEffect(() => {
        if (navigationInProgress.current) return; // unified nav effect will handle display
        if (debouncedSearch.trim()) {
            displayOffset.current = 0;
            setDisplayed(filtered.slice(0, BATCH_SIZE * 3));
        } else {
            displayOffset.current = 0;
            setDisplayed(filtered.slice(0, BATCH_SIZE));
        }
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [filtered, debouncedSearch, contentType]);

    // Jump-to-date: scroll to first message on that date
    useEffect(() => {
        if (!jumpDate || filtered.length === 0) return;
        const targetDate = jumpDate;
        setJumpDate(null);

        const idx = filtered.findIndex(m => m.date === targetDate || m.date > targetDate);
        if (idx < 0) return;

        const startIdx = Math.max(0, idx - BATCH_SIZE * 3);
        const endIdx = Math.min(filtered.length, idx + BATCH_SIZE * 5);
        displayOffset.current = startIdx;
        flushSync(() => {
            setDisplayed(filtered.slice(startIdx, endIdx));
        });

        const el = scrollRef.current?.querySelector(`[data-msg-idx="${idx}"]`);
        if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, [jumpDate, filtered]);

    const loadMore = useCallback(() => {
        if (navigationInProgress.current) return;
        const currentEnd = displayOffset.current + displayed.length;
        const newEnd = Math.min(filtered.length, currentEnd + BATCH_SIZE);
        setDisplayed(filtered.slice(displayOffset.current, newEnd));
    }, [filtered, displayed.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && displayed.length < filtered.length) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [displayed.length, filtered.length, loadMore]);

    const handleDateChange = (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        if (date) setJumpDate(date);
    };

    // Platform change: save current scroll, restore new platform's scroll
    const handlePlatformChange = (newPlatform) => {
        if (savedState?.current) {
            if (!savedState.current.scrollPositions) savedState.current.scrollPositions = {};
            savedState.current.scrollPositions[effectivePlatform] = {
                scrollTop: scrollRef.current?.scrollTop || 0,
                displayOffset: displayOffset.current,
                displayedLen: displayed.length,
            };
        }
        // Find if this tab has sub-tabs
        const tab = PLATFORM_TABS.find(t => t.id === newPlatform);
        startTransition(() => {
            setPlatform(newPlatform);
            setSubPlatform(tab?.subTabs ? tab.subTabs[0].id : null);
        });
        // Restore saved scroll for new platform
        const restoreKey = tab?.subTabs ? tab.subTabs[0].id : newPlatform;
        const saved = savedState?.current?.scrollPositions?.[restoreKey];
        if (saved) {
            requestAnimationFrame(() => {
                displayOffset.current = saved.displayOffset || 0;
                if (scrollRef.current) scrollRef.current.scrollTop = saved.scrollTop || 0;
            });
        }
    };

    // Sub-platform change within a grouped tab
    const handleSubPlatformChange = (newSubPlatform) => {
        if (savedState?.current) {
            if (!savedState.current.scrollPositions) savedState.current.scrollPositions = {};
            savedState.current.scrollPositions[effectivePlatform] = {
                scrollTop: scrollRef.current?.scrollTop || 0,
                displayOffset: displayOffset.current,
                displayedLen: displayed.length,
            };
        }
        startTransition(() => {
            setSubPlatform(newSubPlatform);
        });
        const saved = savedState?.current?.scrollPositions?.[newSubPlatform];
        if (saved) {
            requestAnimationFrame(() => {
                displayOffset.current = saved.displayOffset || 0;
                if (scrollRef.current) scrollRef.current.scrollTop = saved.scrollTop || 0;
            });
        }
    };

    // Quick jump buttons
    const jumpToFirst = () => {
        if (allMessages.length > 0) {
            const d = allMessages[0].date;
            setSelectedDate(d);
            setJumpDate(d);
        }
    };
    const jumpToLast = () => {
        if (allMessages.length > 0) {
            const d = allMessages[allMessages.length - 1].date;
            setSelectedDate(d);
            setJumpDate(d);
        }
    };
    const jumpToRandom = () => {
        const dates = [...new Set(allMessages.map(m => m.date))];
        if (dates.length > 0) {
            const d = dates[Math.floor(Math.random() * dates.length)];
            setSelectedDate(d);
            setJumpDate(d);
        }
    };

    // Platform counts (including combined/sub-tab counts)
    const platformCounts = useMemo(() => {
        const counts = {};
        allMessages.forEach(m => {
            counts[m.platform] = (counts[m.platform] || 0) + 1;
        });
        counts.all = allMessages.length;
        // Combined counts for grouped tabs
        counts.whatsapp_all = (counts.whatsapp || 0) + (counts.whatsapp2 || 0);
        counts.instagram_all = counts.instagram || 0;
        // Sub-tab counts from pre-computed index
        if (platformIndexRef.current) {
            counts.instagram_main = platformIndexRef.current.get('instagram_main')?.length || 0;
            counts.instagram_alt = platformIndexRef.current.get('instagram_alt')?.length || 0;
        }
        return counts;
    }, [allMessages]);

    // Month labels for jump sidebar
    const monthLabels = useMemo(() => {
        if (allMessages.length === 0) return [];
        const months = new Map();
        allMessages.forEach(m => {
            if (!m.date) return;
            const ym = m.date.substring(0, 7);
            if (!months.has(ym)) months.set(ym, m.date);
        });
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([ym, firstDate]) => {
            const [y, m] = ym.split('-');
            return { ym, firstDate, label: names[parseInt(m) - 1], year: y.slice(2) };
        });
    }, [allMessages]);

    // Determine if current view is filtered (search, speaker, content, platform, sort)
    const isFilteredView = debouncedSearch.trim() !== ''
        || speakerFilter !== 'all'
        || contentType !== 'all'
        || effectivePlatform !== 'all'
        || sortOrder === 'newest';

    // Click a search result → clear filters → navigate to that message in full context
    const handleSearchResultClick = useCallback((msg) => {
        if (!isFilteredView || navigationInProgress.current) return;
        navigationInProgress.current = true;

        // Find index in allMessages via O(1) lookup
        let idx = -1;
        if (msg.timestamp && timestampIndexRef.current) {
            const key = `${msg.timestamp}|${msg.text}|${msg.speaker}`;
            const mapIdx = timestampIndexRef.current.get(key);
            if (mapIdx !== undefined) idx = mapIdx;
        }
        // Linear fallback
        if (idx < 0) {
            idx = allMessages.findIndex(m =>
                m.timestamp === msg.timestamp && m.text === msg.text && m.speaker === msg.speaker
            );
        }

        if (idx < 0) {
            navigationInProgress.current = false;
            setNavError('Message not found in full history');
            setTimeout(() => setNavError(null), 4000);
            return;
        }

        // Window: ±400 messages around target
        const startIdx = Math.max(0, idx - BATCH_SIZE * 5);
        const endIdx = Math.min(allMessages.length, idx + BATCH_SIZE * 5);

        // Clear all filters + set display window in one synchronous batch
        displayOffset.current = startIdx;
        flushSync(() => {
            setSearchInput('');
            setDebouncedSearch('');
            setSpeakerFilter('all');
            setContentType('all');
            setSortOrder('oldest');
            setPlatform('all');
            setSubPlatform(null);
            setDisplayed(allMessages.slice(startIdx, endIdx));
        });

        if (msg.date) setSelectedDate(msg.date);
        setHighlightedIdx(idx);
        setTimeout(() => setHighlightedIdx(null), 8000);

        // Scroll with RAF retry
        let attempts = 0;
        const tryScroll = () => {
            const el = scrollRef.current?.querySelector(`[data-msg-idx="${idx}"]`);
            if (el) {
                el.scrollIntoView({ block: 'center' });
                navigationInProgress.current = false;
            } else if (attempts < 5) {
                attempts++;
                requestAnimationFrame(tryScroll);
            } else {
                navigationInProgress.current = false;
            }
        };
        requestAnimationFrame(tryScroll);

        // Safety timeout
        setTimeout(() => { navigationInProgress.current = false; }, 3000);
    }, [isFilteredView, allMessages]);

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: 400, gap: 16 }}>
                <div style={{ color: 'var(--main-color)', fontSize: 18, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                    {loadProgress}
                </div>
                <div style={{ width: 200, height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        style={{ width: '50%', height: '100%', background: 'var(--main-color)', borderRadius: 2 }}
                    />
                </div>
                <div style={{ fontSize: 13, color: 'var(--sub-color)', fontFamily: 'var(--font-mono)' }}>
                    This may take a moment — loading 346K+ messages
                </div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: 400, gap: 20 }}>
                <div style={{ fontSize: 48 }}>😔</div>
                <div style={{ color: 'var(--text-color)', fontSize: 20, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                    Failed to load messages
                </div>
                <div style={{ color: 'var(--sub-color)', fontSize: 14, fontFamily: 'var(--font-mono)', textAlign: 'center', maxWidth: 400 }}>
                    The chat data is very large (60MB). Try refreshing or check your connection.
                </div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '14px 32px', background: 'var(--main-color)', color: 'var(--bg-color)',
                        border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // Role-based alignment: current user's messages go right
    const isCurrentUser = (msg) => {
        if (currentRole === 'azhura') return msg.speaker === 'p2';
        return msg.speaker === 'p1'; // default: haidar = p1 = right
    };

    return (
        <div style={{
            width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto',
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)',
            fontFamily: 'var(--font-body)',
        }}>
            {/* Platform Tabs — Horizontal scrollable with counts */}
            <div role="tablist" aria-label="Platform filter" style={{
                display: 'flex', gap: 8, padding: '10px 16px',
                overflowX: 'auto', flexShrink: 0,
                WebkitOverflowScrolling: 'touch',
            }} className="no-scrollbar">
                {PLATFORM_TABS.map((tab) => {
                    const isActive = platform === tab.id;
                    const iconPlatform = PLATFORM_ICON_MAP[tab.id];
                    return (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => handlePlatformChange(tab.id)}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid',
                                borderColor: isActive ? 'var(--main-color)' : 'var(--border-color)',
                                background: isActive ? 'var(--main-color-dim)' : 'transparent',
                                color: isActive ? 'var(--main-color)' : 'var(--text-dim)',
                                fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
                                cursor: 'pointer', transition: 'all 0.2s',
                                fontFamily: 'var(--font-body)',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            {iconPlatform ? <PlatformIcon platform={iconPlatform} size={16} /> : <span>💬</span>}
                            <span>{tab.label}</span>
                            {platformCounts[tab.id] > 0 && (
                                <span style={{
                                    fontSize: 11, opacity: 0.6,
                                    fontFamily: 'var(--font-mono)',
                                    background: isActive ? 'var(--main-color)' : 'var(--bg-tertiary)',
                                    color: isActive ? 'var(--bg-color)' : 'var(--text-dim)',
                                    padding: '2px 6px', borderRadius: 'var(--radius-full)',
                                }}>
                                    {platformCounts[tab.id] >= 1000 ? Math.floor(platformCounts[tab.id] / 1000) + 'K' : platformCounts[tab.id]}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sub-tabs for grouped platforms (WhatsApp, Instagram) */}
            {(() => {
                const activeTab = PLATFORM_TABS.find(t => t.id === platform);
                if (!activeTab?.subTabs) return null;
                return (
                    <div role="tablist" aria-label="Sub-platform filter" style={{
                        display: 'flex', gap: 6, padding: '0 16px 8px',
                        overflowX: 'auto', flexShrink: 0,
                    }} className="no-scrollbar">
                        {activeTab.subTabs.map(sub => {
                            const isActive = subPlatform === sub.id;
                            const subIcon = PLATFORM_ICON_MAP[sub.id];
                            return (
                                <button
                                    key={sub.id}
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => handleSubPlatformChange(sub.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 'var(--radius-full)',
                                        border: 'none',
                                        background: isActive ? 'var(--main-color)' : 'var(--bg-tertiary)',
                                        color: isActive ? 'var(--bg-color)' : 'var(--text-dim)',
                                        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: 'var(--font-mono)',
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}
                                >
                                    {sub.id !== activeTab.subTabs[0].id && subIcon && (
                                        <PlatformIcon platform={subIcon} size={13} />
                                    )}
                                    <span>{sub.label}</span>
                                    {platformCounts[sub.id] > 0 && (
                                        <span style={{
                                            fontSize: 10, opacity: 0.7,
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {platformCounts[sub.id] >= 1000 ? Math.floor(platformCounts[sub.id] / 1000) + 'K' : platformCounts[sub.id]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Content Type Tabs — Photos, Videos, etc */}
            <div role="tablist" aria-label="Content type filter" style={{
                display: 'flex', gap: 6, padding: '4px 16px 8px',
                overflowX: 'auto', flexShrink: 0,
            }} className="no-scrollbar">
                {CONTENT_TABS.map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={contentType === tab.id}
                        onClick={() => setContentType(tab.id)}
                        style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: contentType === tab.id ? 'var(--main-color)' : 'var(--bg-tertiary)',
                            color: contentType === tab.id ? 'var(--bg-color)' : 'var(--text-dim)',
                            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Search + Filters Row */}
            <div style={{
                display: 'flex', gap: 8, padding: '6px 16px', flexShrink: 0,
                alignItems: 'center', flexWrap: 'wrap',
            }}>
                {/* Search */}
                <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search messages... (Ctrl+F)"
                        style={{
                            width: '100%', padding: '10px 14px 10px 36px',
                            borderRadius: 0,
                            border: 'none',
                            borderBottom: '1.5px solid var(--sub-color)',
                            background: 'transparent',
                            color: 'var(--text-color)',
                            fontSize: 15, outline: 'none',
                            fontFamily: 'var(--font-mono)',
                        }}
                    />
                    <span style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 14, opacity: 0.4,
                    }}>🔍</span>
                </div>

                {/* Speaker filter */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {[
                        { id: 'all', label: 'Both' },
                        { id: 'p1', label: SPEAKERS.p1?.name || 'P1' },
                        { id: 'p2', label: SPEAKERS.p2?.name || 'P2' },
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSpeakerFilter(s.id)}
                            style={{
                                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                                border: '1px solid',
                                borderColor: speakerFilter === s.id ? 'var(--main-color)' : 'var(--border-color)',
                                background: speakerFilter === s.id ? 'var(--main-color-dim)' : 'transparent',
                                color: speakerFilter === s.id ? 'var(--main-color)' : 'var(--text-dim)',
                                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Sort toggle */}
                <button
                    onClick={() => setSortOrder(s => s === 'oldest' ? 'newest' : 'oldest')}
                    style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-color)',
                        background: 'transparent', color: 'var(--text-dim)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    }}
                >
                    {sortOrder === 'oldest' ? '↑ Oldest' : '↓ Newest'}
                </button>

                {/* Date picker */}
                <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    min={dateRange.min}
                    max={dateRange.max}
                    style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-on-card)',
                        fontSize: 13, outline: 'none',
                        fontFamily: 'var(--font-body)',
                        width: 130,
                    }}
                />
                {selectedDate && (
                    <button
                        onClick={() => setSelectedDate('')}
                        style={{
                            padding: '6px 12px', borderRadius: 'var(--radius-md)',
                            background: 'var(--error-color)', color: '#fff',
                            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Quick Jump Buttons */}
            <div style={{
                display: 'flex', gap: 8, padding: '4px 16px 8px',
                alignItems: 'center', flexShrink: 0,
            }}>
                <span style={{ fontSize: 12, color: 'var(--sub-color)', fontFamily: 'var(--font-mono)' }}>Jump:</span>
                <button onClick={jumpToFirst} style={quickJumpStyle}>First msg</button>
                <button onClick={jumpToLast} style={quickJumpStyle}>Last msg</button>
                <button onClick={jumpToRandom} style={quickJumpStyle}>🎲 Random</button>
                {/* Results count */}
                <div style={{
                    marginLeft: 'auto', fontSize: 13, color: 'var(--sub-color)',
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                }}>
                    {searchInput && searchInput !== debouncedSearch ? (
                        <span style={{ color: 'var(--main-color)' }}>Searching...</span>
                    ) : (
                        <>
                            {filtered.length.toLocaleString()} {debouncedSearch ? 'results' : 'messages'}
                            {allMessages.length > 0 && filtered.length !== allMessages.length && !debouncedSearch && (
                                <span style={{ opacity: 0.5 }}> / {allMessages.length.toLocaleString()}</span>
                            )}
                            {debouncedSearch && ` for "${debouncedSearch}"`}
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Chat Messages */}
                <div
                    ref={scrollRef}
                    style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}
                >
                    {displayed.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px',
                            color: 'var(--sub-color)', fontSize: 16,
                        }}>
                            {allMessages.length === 0 ? (
                                <div>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20 }}>
                                        No messages loaded
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 8 }}>
                                        Try refreshing the page
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20 }}>
                                        No messages match your filters
                                    </div>
                                    <button
                                        onClick={() => { setSearchInput(''); setPlatform('all'); setSelectedDate(''); setSpeakerFilter('all'); setContentType('all'); }}
                                        style={{
                                            marginTop: 16, padding: '10px 24px',
                                            background: 'var(--main-color)', color: 'var(--bg-color)',
                                            border: 'none', borderRadius: 'var(--radius-card)',
                                            cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14,
                                        }}
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media Grid View for photos/videos/stickers/video_notes */}
                    {(contentType === 'photos' || contentType === 'videos' || contentType === 'stickers' || contentType === 'video_notes') && displayed.length > 0 ? (
                        <VirtualizedGrid displayed={displayed} filtered={filtered} contentType={contentType} />
                    ) : (
                        /* Regular Chat View */
                        <div>
                            {displayed.map((msg, i) => {
                                const isMine = isCurrentUser(msg);
                                const absIdx = displayOffset.current + i;
                                const prevMsg = displayed[i - 1];
                                const showDate = !prevMsg || prevMsg.date !== msg.date;
                                const showSpeaker = !prevMsg || prevMsg.speaker !== msg.speaker || showDate;
                                const platformInfo = PLATFORMS[msg.platform];
                                const isHighlighted = highlightedIdx === absIdx;

                                return (
                                    <div key={absIdx} data-msg-idx={absIdx} className="chat-msg-wrap">
                                        {showDate && (
                                            <div style={{ position: 'relative', padding: '24px 0 14px' }}>
                                                <div className="torn-paper-divider" style={{ margin: '0 0 10px' }} />
                                                <div style={{
                                                    textAlign: 'center',
                                                    fontSize: 14, color: 'var(--sub-color)',
                                                    fontFamily: 'var(--font-handwritten)',
                                                    fontWeight: 400,
                                                    transform: 'rotate(-1deg)',
                                                }}>
                                                    {msg.date}
                                                </div>
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: isMine ? 'flex-end' : 'flex-start',
                                            marginBottom: showSpeaker ? 10 : 3,
                                        }}>
                                            {showSpeaker && (
                                                <div style={{
                                                    fontSize: 13, color: 'var(--sub-color)',
                                                    marginBottom: 3, padding: '0 10px',
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                }}>
                                                    <span>{SPEAKERS[msg.speaker]?.emoji}</span>
                                                    <span>{SPEAKERS[msg.speaker]?.name}</span>
                                                    {msg.time && <span style={{ opacity: 0.5 }}>{msg.time.slice(0, 5)}</span>}
                                                    {platformInfo && (
                                                        <PlatformIcon platform={msg.platform} size={13} />
                                                    )}
                                                    {/* Instagram account indicator */}
                                                    {msg.platform === 'instagram' && msg.speakerRaw && IG_ACCOUNTS[msg.speakerRaw] && (
                                                        <span style={{
                                                            fontSize: 10, opacity: 0.5,
                                                            fontFamily: 'var(--font-mono)',
                                                            display: 'inline-flex', alignItems: 'center', gap: 1,
                                                        }}>
                                                            {IG_ACCOUNTS[msg.speakerRaw].handle}
                                                            {IG_ACCOUNTS[msg.speakerRaw].isSecondary && <SecondaryBadge size={10} />}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div
                                                onClick={isFilteredView ? () => handleSearchResultClick(msg) : undefined}
                                                style={{
                                                maxWidth: '80%',
                                                padding: '12px 18px',
                                                borderRadius: 'var(--radius-card)',
                                                background: isMine ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                                color: isMine ? 'var(--text-on-card)' : 'var(--text-color)',
                                                fontSize: 16, lineHeight: 1.5,
                                                fontFamily: 'var(--font-body)',
                                                wordBreak: 'break-word',
                                                position: 'relative',
                                                border: '1px solid var(--border-color)',
                                                cursor: isFilteredView ? 'pointer' : 'default',
                                                boxShadow: isHighlighted
                                                    ? '0 0 12px rgba(212, 160, 84, 0.4), inset 0 0 0 1px var(--main-color)'
                                                    : '0 1px 4px var(--shadow-color)',
                                                outline: isHighlighted ? '2.5px solid var(--main-color)' : 'none',
                                                outlineOffset: isHighlighted ? '3px' : 0,
                                                animation: isHighlighted ? 'highlight-pulse 1.5s ease-in-out 3' : 'none',
                                                transition: 'outline 0.3s, outline-offset 0.3s, box-shadow 0.3s',
                                            }}>
                                                <MediaRenderer message={msg} />
                                                {msg.type === 'text' || !msg.type
                                                    ? (msg.text || '...')
                                                    : (msg.text
                                                        && !['[Voice Note]', '[Audio]', '[Sticker]', '[Video]', '[Video Note]', '[Photo]', '[Document]'].includes(msg.text)
                                                        && !(msg.type === 'sticker' && msg.text.includes('tenor.com'))
                                                        && !((msg.type === 'image' || msg.type === 'video') && !msg.mediaPath)
                                                        ? msg.text
                                                        : null)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {displayed.length < filtered.length && (
                        <div ref={loadMoreRef} style={{
                            textAlign: 'center', padding: '20px',
                            color: 'var(--sub-color)', fontSize: 14,
                        }}>
                            Loading more... ({displayed.length}/{filtered.length.toLocaleString()})
                        </div>
                    )}
                </div>

                {/* Month Jump Sidebar */}
                {monthLabels.length > 0 && contentType === 'all' && (
                    <div style={{
                        width: 40, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden',
                        display: 'flex', flexDirection: 'column', gap: 0,
                        padding: '4px 0', alignItems: 'center',
                        borderLeft: '1px solid var(--border-color)',
                    }} className="no-scrollbar">
                        {monthLabels.map(({ ym, firstDate, label, year }) => (
                            <button
                                key={ym}
                                onClick={() => { setSelectedDate(firstDate); setJumpDate(firstDate); }}
                                title={`Jump to ${label} 20${year}`}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 600,
                                    color: selectedDate && selectedDate.startsWith(ym) ? 'var(--main-color)' : 'var(--text-dim)',
                                    padding: '3px 4px', lineHeight: 1.2, textAlign: 'center',
                                    whiteSpace: 'nowrap', width: '100%',
                                    transition: 'color 0.15s',
                                }}
                            >
                                <div>{label}</div>
                                <div style={{ fontSize: 7, opacity: 0.5 }}>{year}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Nav error toast */}
            <AnimatePresence>
                {navError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 60, padding: '10px 20px',
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-full)', boxShadow: '0 4px 20px var(--shadow-color)',
                            fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--warning-color)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {navError}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const quickJumpStyle = {
    padding: '4px 10px', borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-color)',
    background: 'transparent', color: 'var(--text-dim)',
    fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
};
