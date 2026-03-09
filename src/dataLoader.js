/**
 * dataLoader.js — Multi-platform data loader for "Ours"
 * Loads JSON data from /public/data/ with caching.
 */

const cache = {};
const loadingState = {}; // Track loading status per file

async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
        }
    }
}

export function getLoadingState(dataName) {
    return loadingState[dataName] || { isLoading: false, error: null };
}

export function releaseCache(dataName) {
    delete cache[dataName];
    // Clear derived caches when unified is released
    if (dataName === 'unified') {
        derivedFullHistoryCache = null;
        derivedFullHistoryRawCache = null;
        derivedHistoryByDateCache = null;
    }
}

export async function loadData(dataName) {
    if (cache[dataName]) {
        return cache[dataName];
    }
    loadingState[dataName] = { isLoading: true, error: null };
    try {
        const response = await fetchWithRetry(`/data/${dataName}.json`);
        const data = await response.json();
        cache[dataName] = data;
        loadingState[dataName] = { isLoading: false, error: null };
        return data;
    } catch (error) {
        loadingState[dataName] = { isLoading: false, error: error.message };
        console.error(`Error loading ${dataName}:`, error);
        throw error;
    }
}

// ─── Derived data caches (from unified.json) ────────────────────────
let derivedFullHistoryCache = null;
let derivedFullHistoryRawCache = null;
let derivedHistoryByDateCache = null;

// ─── Legacy loaders — now derived from unified.json ──────────────────
export const loadRawChatData = () => loadData('rawChatData');

// Returns fullHistory derived from unified (date as string — same as unified)
export const loadFullHistory = async () => {
    if (derivedFullHistoryCache) return derivedFullHistoryCache;
    const data = await loadUnified();
    if (!data) return data;
    // unified already has date as string and all needed fields
    derivedFullHistoryCache = data;
    return derivedFullHistoryCache;
};

// Returns fullHistory with date as object {raw, part1, part2} (for TimeCapsule)
export const loadFullHistoryRaw = async () => {
    if (derivedFullHistoryRawCache) return derivedFullHistoryRawCache;
    const data = await loadUnified();
    if (!data) return data;
    derivedFullHistoryRawCache = data.map(msg => ({
        ...msg,
        date: msg.date ? {
            raw: msg.date,
            part1: msg.date.slice(8, 10), // day
            part2: msg.date.slice(5, 7),  // month
        } : { raw: '', part1: '', part2: '' },
    }));
    return derivedFullHistoryRawCache;
};

// Returns messages grouped by date, derived from unified
export const loadHistoryByDate = async () => {
    if (derivedHistoryByDateCache) return derivedHistoryByDateCache;
    const data = await loadUnified();
    if (!data) return {};
    const byDate = {};
    for (const msg of data) {
        if (!msg.date) continue;
        if (!byDate[msg.date]) byDate[msg.date] = [];
        byDate[msg.date].push(msg);
    }
    derivedHistoryByDateCache = byDate;
    return derivedHistoryByDateCache;
};
// Standalone historyByDate loader (does NOT trigger unified.json load)
export const loadHistoryByDateStandalone = () => loadData('historyByDate');

export const loadNightSkyData = () => loadData('nightSkyData');

// ─── New multi-platform loaders ───────────────────────────────────────
export const loadUnified = () => loadData('unified');
export const loadStats = () => loadData('stats');
export const loadTimeline = () => loadData('timeline');
export const loadWordsData = () => loadData('wordsData');
export const loadBossMode = () => loadData('bossModeData');

// ─── Per-platform loaders ─────────────────────────────────────────────
export const loadWhatsApp = () => loadData('whatsapp');
export const loadWhatsApp2 = () => loadData('whatsapp2');
export const loadDiscord = () => loadData('discord');
export const loadTikTok = () => loadData('tiktok');
export const loadIMessage = () => loadData('imessage');
export const loadInstagram = () => loadData('instagram');
export const loadFaceTime = () => loadData('facetime');

// ─── Platform config ──────────────────────────────────────────────────
export const PLATFORMS = {
    whatsapp: { label: 'WhatsApp', icon: '📱', color: '#d4a054', cssClass: 'whatsapp' },
    whatsapp2: { label: 'WhatsApp 2', icon: '📱', color: '#d4a054', cssClass: 'whatsapp' },
    instagram: { label: 'Instagram', icon: '📸', color: '#c4724a', cssClass: 'instagram' },
    tiktok: { label: 'TikTok', icon: '🎵', color: '#d4a054', cssClass: 'tiktok' },
    imessage: { label: 'iMessage', icon: '💬', color: '#c4724a', cssClass: 'imessage' },
    discord: { label: 'Discord', icon: '🎮', color: '#d4a054', cssClass: 'discord' },
    facetime: { label: 'FaceTime', icon: '📹', color: '#34c759', cssClass: 'facetime' },
};

export const SPEAKERS = {
    p1: { name: 'Haidar', emoji: '' },
    p2: { name: 'Azhura', emoji: '' },
};
