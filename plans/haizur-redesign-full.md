# Haizur Archives — Full Frontend Redesign Implementation Plan

**Date**: February 26, 2026
**Status**: Ready for execution
**Scope**: Landing page redesign, fun facts, platform indicators, logo/favicon, CSS cleanup

---

## Table of Contents

1. [Context & Goals](#context--goals)
2. [Data Analysis Summary](#data-analysis-summary)
3. [Step 1: Parser Changes](#step-1-parser-changes--re-run)
4. [Step 2: Quiz & FinishSentence Updates](#step-2-update-quizjsx-and-finishsentencejsx)
5. [Step 3: Platform Indicators in Gamemodes](#step-3-platform-indicators-in-gamemodes)
6. [Step 4: Logo & Favicon](#step-4-logo-hz-monogram--favicon)
7. [Step 5: CSS Overhaul](#step-5-css-remove-dashed-borders--add-new-styles)
8. [Step 6: Landing Page Redesign](#step-6-landing-page-full-redesign-homescreenjsx)
9. [Step 7: Media Status](#step-7-media-verification--status)
10. [Files Modified](#files-modified-summary)
11. [Execution Order](#execution-order)
12. [Verification Checklist](#verification-checklist)

---

## Context & Goals

The current landing page feels **generic and impersonal** — identical small Polaroid boxes in a grid, ugly dashed-border platform badges (screenshot: the dotted boxes showing 📱163K, 📱3K, etc.), and no personality. The user wants:

1. **Immersive scroll experience** — longer page, each gamemode has a description alongside it (not just icons in a grid)
2. **Remove dashed border boxes** — the `platform-badge` CSS with `border: 1.5px dashed` is ugly
3. **Fun facts from actual chat data** — interspersed throughout the page (e.g., "you've said sayang 984 times")
4. **Personal touches** — her favorite color (pink), inside jokes, pet names
5. **Media visibility** — photos/videos/voicenotes should render where they exist
6. **Logo change** — from generic "H" wax seal to "hz" typography monogram
7. **Favicon change** — custom "hz" monogram in SVG
8. **Platform indicators everywhere** — every gamemode should show which platform a message came from
9. **Complete archive** — every message and attachment preserved

---

## Data Analysis Summary

From analyzing the **346,794 messages** across 6 platforms:

### Message Stats
- **Total messages**: 346,794 over 409 days
- **Average per day**: 848 messages
- **Haidar (p1)**: 189,637 msgs (54.7%) — texts more
- **Azhura (p2)**: 157,157 msgs (45.3%)

### Platform Breakdown
| Platform | Messages | % |
|----------|----------|---|
| WhatsApp | 163,328 | 47% |
| Instagram | 78,780 | 23% |
| TikTok | 50,541 | 15% |
| iMessage | 49,202 | 14% |
| WhatsApp 2 | 3,244 | 1% |
| Discord | 1,699 | <1% |

### Call Stats
- **674 calls** totaling **6,004 minutes** (~100 hours)

### Media Stats
- Images: 6,280 | Videos: 462 | Audio: 1,380 | Stickers: 7,522 | GIFs: 15

### Top Emojis
1. ☺️ — 2,446 times
2. 😭😭 — 1,903 times
3. 😭😭😭 — 1,400 times
4. 😭😭😭😭 — 1,059 times
5. 🥺🥺 — 619 times
6. ☹️ — 439 times
7. 🖕🏻 — 402 times (playful)
8. ❤️ — 200 times

### Top Meaningful Words
- "aku" (I/me): 15,982 | "sayang" (darling): 984 | "banget" (very): 3,977 | "sama" (together): 4,103

### Pet Names
- "zur" / "zuraa" / "zuurr": 1,028+ times
- "kak" / "kaka" (older brother): 1,288 times
- "sayang": 984 times

### Inside Jokes
- Azhura is playfully called "maling" (thief)
- Haidar is called "beriman" (faithful)
- "independent woman" — running joke about Azhura

### Patterns
- **Night owls**: Many messages at 3-4 AM
- **First message ever**: "jdhsh" on TikTok, January 4, 2025
- **Busiest month**: September 2025 (55,434 messages)
- **Language**: Indonesian (casual) with English sprinkled in

---

## Step 1: Parser Changes + Re-run

### File: `scripts/parseAllPlatforms.cjs`

### 1a. Change rawChatData format from strings to objects

**Why**: Quiz.jsx and FinishSentence.jsx load `rawChatData.json` to display messages. Currently messages are plain strings like `["msg1","msg2"]` so there's no way to show which platform a message came from. Changing to objects adds platform metadata.

**Location**: `generateGameData()` function, approximately line 807

**Before**:
```javascript
const rawChatData = {
    p1: textMessages.filter(m => m.speaker === 'p1').map(m => m.text),
    p2: textMessages.filter(m => m.speaker === 'p2').map(m => m.text)
};
```

**After**:
```javascript
const rawChatData = {
    p1: textMessages.filter(m => m.speaker === 'p1').map(m => ({
        text: m.text,
        platform: m.platform,
        date: m.date
    })),
    p2: textMessages.filter(m => m.speaker === 'p2').map(m => ({
        text: m.text,
        platform: m.platform,
        date: m.date
    }))
};
```

**Impact**: `words.js` (typing engine) uses its own hardcoded rawChatData, NOT the JSON file. Only Quiz.jsx and FinishSentence.jsx read `rawChatData.json`.

### 1b. Add `funFacts` array to stats.json

**Location**: Inside `generateStats()` function, before `return stats`

Add computation of:
```javascript
stats.funFacts = [];

// 1. Sayang count per speaker
const sayangP1 = allMessages.filter(m => m.speaker === 'p1' && m.text && m.text.toLowerCase().includes('sayang')).length;
const sayangP2 = allMessages.filter(m => m.speaker === 'p2' && m.text && m.text.toLowerCase().includes('sayang')).length;
stats.funFacts.push({ id: 'sayang', label: `you've said "sayang" ${sayangP1 + sayangP2} times`, sub: `haidar: ${sayangP1}, azhura: ${sayangP2}` });

// 2. Late night messages (22:00-05:00)
const lateNight = allMessages.filter(m => {
    if (!m.time) return false;
    const h = parseInt(m.time.split(':')[0]);
    return h >= 22 || h < 5;
}).length;
stats.funFacts.push({ id: 'latenight', label: `${lateNight.toLocaleString()} messages sent after midnight`, sub: 'sleep is overrated' });

// 3. Most messages in a single day
const dayCounts = {};
allMessages.forEach(m => { if (m.date) dayCounts[m.date] = (dayCounts[m.date] || 0) + 1; });
const busiestDay = Object.entries(dayCounts).sort((a,b) => b[1]-a[1])[0];
stats.funFacts.push({ id: 'busiestday', label: `busiest day: ${busiestDay[1].toLocaleString()} messages`, sub: busiestDay[0] });

// 4. Busiest month
// (use existing byMonth data if added)

// 5. Pet name counts
const zurCount = allMessages.filter(m => m.text && /\bzur(a|aa|aaa)?\b/i.test(m.text)).length;
const kakCount = allMessages.filter(m => m.text && /\bkak(a|aa)?\b/i.test(m.text)).length;
stats.funFacts.push({ id: 'petnames', label: `"zur" ${zurCount} times, "kak" ${kakCount} times`, sub: 'your favorite pet names' });

// 6. Consecutive day streak
const uniqueDates = [...new Set(allMessages.filter(m => m.date).map(m => m.date))].sort();
let maxStreak = 1, currentStreak = 1;
for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i-1]);
    const curr = new Date(uniqueDates[i]);
    const diff = (curr - prev) / (1000*60*60*24);
    if (diff === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 1;
}
stats.funFacts.push({ id: 'streak', label: `${maxStreak} day chat streak`, sub: 'never missed a day' });

// 7. First sayang
const firstSayang = allMessages.find(m => m.text && m.text.toLowerCase().includes('sayang'));
if (firstSayang) stats.funFacts.push({ id: 'firstsayang', label: `first "sayang" on ${firstSayang.date}`, sub: `by ${firstSayang.speaker === 'p1' ? 'Haidar' : 'Azhura'} on ${firstSayang.platform}` });
```

### 1c. Add `byMonth` breakdown to stats

```javascript
stats.byMonth = {};
for (const msg of allMessages) {
    if (!msg.date) continue;
    const ym = msg.date.substring(0, 7);
    if (!stats.byMonth[ym]) stats.byMonth[ym] = { total: 0, p1: 0, p2: 0 };
    stats.byMonth[ym].total++;
    stats.byMonth[ym][msg.speaker]++;
}
// Find busiest month
const busiestMonth = Object.entries(stats.byMonth).sort((a,b) => b[1].total - a[1].total)[0];
stats.funFacts.push({ id: 'busiestmonth', label: `busiest month: ${busiestMonth[0]}`, sub: `${busiestMonth[1].total.toLocaleString()} messages` });
```

### 1d. Re-run the parser

```bash
node scripts/parseAllPlatforms.cjs
```

Verify:
- `rawChatData.json` — first item should be an object with `text`, `platform`, `date` fields
- `stats.json` — should have `funFacts` array and `byMonth` object

---

## Step 2: Update Quiz.jsx and FinishSentence.jsx

### File: `src/Quiz.jsx`

**Changes**:

1. **Add PLATFORMS import** (line 4):
```javascript
import { loadRawChatData, PLATFORMS } from "./dataLoader";
```

2. **Fix message access** (line 41):
```javascript
// BEFORE:
const randomText = messages[msgIndex];
return { text: randomText, answer: randomSpeaker };

// AFTER:
const msgObj = messages[msgIndex];
return {
    text: msgObj.text || msgObj,  // fallback for string format
    answer: randomSpeaker,
    platform: msgObj.platform,
    date: msgObj.date
};
```

3. **Show platform icon after answer reveal** — after the guess buttons, when `gameState !== "playing"`, render:
```jsx
{gameState !== "playing" && currentQuestion?.platform && (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        marginTop: 12, fontSize: 13, color: 'var(--text-dim)',
        fontFamily: 'var(--font-mono)',
    }}>
        <span style={{ color: PLATFORMS[currentQuestion.platform]?.color }}>
            {PLATFORMS[currentQuestion.platform]?.icon}
        </span>
        <span>{PLATFORMS[currentQuestion.platform]?.label}</span>
        {currentQuestion.date && (
            <span style={{ opacity: 0.5, marginLeft: 4 }}>{currentQuestion.date}</span>
        )}
    </div>
)}
```

### File: `src/FinishSentence.jsx`

**Changes**:

1. **Add PLATFORMS import** (line 4):
```javascript
import { loadRawChatData, PLATFORMS } from "./dataLoader";
```

2. **Fix message access** — multiple locations where `messages[idx]` is treated as a string:
   - Line 43: `if (r && r.split(' ')` → `if (r && (r.text || r).split(' ')`
   - Actually, cleaner approach — **add a helper at the top of the useMemo**:
```javascript
const getText = (msg) => typeof msg === 'string' ? msg : msg?.text || '';
const getPlatform = (msg) => typeof msg === 'object' ? msg?.platform : null;
const getDate = (msg) => typeof msg === 'object' ? msg?.date : null;
```
   Then replace all `r.split(' ')` with `getText(r).split(' ')`, and `validMsg.split(' ')` with `getText(validMsg).split(' ')`.

3. **Add platform to question object** (line 73):
```javascript
return {
    question: {
        speaker: speakerKey,
        start: startText,
        answer: endText,
        platform: getPlatform(validMsg),
        date: getDate(validMsg)
    },
    options: allOptions
};
```

4. **Show platform icon** in the question display area, next to the speaker name:
```jsx
{question.platform && (
    <span style={{ color: PLATFORMS[question.platform]?.color, fontSize: 13, marginLeft: 8 }}>
        {PLATFORMS[question.platform]?.icon}
    </span>
)}
```

---

## Step 3: Platform Indicators in Gamemodes

### 3a. `src/MemoryLane.jsx` — Add platform icon + time to speaker header

**Current import** (line 4): `import { loadHistoryByDate } from "./dataLoader";`
**New import**: `import { loadHistoryByDate, PLATFORMS } from "./dataLoader";`

**In speaker header** (lines 160-169), after the speaker name span, add:
```jsx
{msg.platform && PLATFORMS[msg.platform] && (
    <span style={{ fontSize: 12, color: PLATFORMS[msg.platform]?.color, opacity: 0.7 }}>
        {PLATFORMS[msg.platform]?.icon}
    </span>
)}
{msg.time && (
    <span style={{ fontSize: 11, opacity: 0.4, fontFamily: 'var(--font-mono)' }}>
        {msg.time.slice(0, 5)}
    </span>
)}
```

**Data verification**: `historyByDate` entries already have `platform` and `time` fields. Confirmed from JSON structure.

### 3b. `src/BossMode.jsx` — Add platform icon next to date

**Add import**:
```javascript
import { PLATFORMS } from "./dataLoader";
```

**After the date span** (line 210-211), add:
```jsx
{currentBoss.platform && PLATFORMS[currentBoss.platform] && (
    <>
        <span style={{ opacity: 0.3, margin: '0 8px' }}>|</span>
        <span style={{ color: PLATFORMS[currentBoss.platform]?.color, fontSize: 13 }}>
            {PLATFORMS[currentBoss.platform]?.icon} {PLATFORMS[currentBoss.platform]?.label}
        </span>
    </>
)}
```

**Data verification**: `bossModeData.json` confirmed to have `platform` field on every entry.

### 3c. `src/StatsBattle.jsx` — Add per-platform breakdown

**Add import**:
```javascript
import { loadFullHistory, PLATFORMS } from "./dataLoader";
```

**Modify `calculateStats()`** (lines 32-45) to also compute platform counts:
```javascript
const calculateStats = (searchTerm) => {
    if (!searchTerm.trim() || !fullHistory) return;
    let countP1 = 0, countP2 = 0;
    const byPlatform = {};
    const term = searchTerm.toLowerCase().trim();
    fullHistory.forEach(msg => {
        if (msg.text && msg.text.includes(term)) {
            if (msg.speaker === 'p1') countP1++;
            else countP2++;
            const plat = msg.platform || 'unknown';
            byPlatform[plat] = (byPlatform[plat] || 0) + 1;
        }
    });
    setStats({ p1: countP1, p2: countP2, term, byPlatform });
};
```

**Render platform breakdown row** below the existing comparison bars:
```jsx
{stats?.byPlatform && (
    <div style={{
        display: 'flex', gap: 14, justifyContent: 'center',
        marginTop: 18, flexWrap: 'wrap',
    }}>
        {Object.entries(stats.byPlatform)
            .sort((a, b) => b[1] - a[1])
            .map(([plat, count]) => (
                <span key={plat} style={{
                    fontSize: 13, fontFamily: 'var(--font-mono)',
                    color: PLATFORMS[plat]?.color || 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    {PLATFORMS[plat]?.icon} {count}
                </span>
            ))
        }
    </div>
)}
```

### Gamemodes NOT needing changes:
- **TimeCapsule.jsx** — already shows `PLATFORMS[msg.platform]?.icon` next to speaker (line 117-120) ✅
- **NightSky.jsx** — already shows platform on hovered stars (line 152-154) ✅
- **ChatBrowser.jsx** — shows platform icon on "all" tab (line 268-277) ✅
- **Museum.jsx** — shows platform in milestone/call/first views ✅
- **LoveLetters.jsx** — contains hardcoded letter content, not actual chat messages — N/A

---

## Step 4: Logo "hz" Monogram + Favicon

### 4a. `index.html` — Favicon (line 7-8)

**Before**:
```html
<link rel="icon"
  href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◆</text></svg>" />
```

**After**:
```html
<link rel="icon"
  href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%23c4724a'/><text x='50' y='64' font-family='Georgia,serif' font-size='40' font-weight='400' font-style='italic' fill='%231c1410' text-anchor='middle' letter-spacing='-3'>hz</text></svg>" />
```

This creates a wax-seal-colored circle with italic serif "hz", matching the site aesthetic.

### 4b. `index.html` — Meta description (line 12-13)

```html
<meta name="description" content="346,794 messages across 6 platforms. Every conversation preserved." />
```

### 4c. `src/HomeScreen.jsx` — Wax seal (line 183-186)

**Before**:
```jsx
<motion.div className="wax-seal animate-gentle-bob"
    style={{ margin: '0 auto 20px', width: 72, height: 72, fontSize: 24 }}>
    H
</motion.div>
```

**After**:
```jsx
<motion.div className="wax-seal animate-gentle-bob"
    style={{ margin: '0 auto 20px', width: 72, height: 72, fontSize: 18, letterSpacing: '-0.05em' }}>
    hz
</motion.div>
```

### 4d. `src/RoleSelect.jsx` — Main wax seal (line 34-36)

**Before**: `H` (line 36)
**After**: `hz` with smaller font size (18 instead of 22)

**Keep**: Role selection cards still use `{role.initial}` (H for Haidar, A for Azhura) — these identify the user, not the site logo.

---

## Step 5: CSS — Remove Dashed Borders + Add New Styles

### File: `src/index.css`

### 5a. Replace `.platform-badge` style (lines ~740-758)

**Before** (ugly dashed borders):
```css
.platform-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1.5px dashed;        /* USER HATES THIS */
    border-radius: 3px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
```

**After** (clean pill style):
```css
.platform-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--radius-full);
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-mono);
    background: var(--main-color-dim);
    border: none;
}
```

Also update the per-platform badge rules to remove hardcoded background colors (already changed to `var(--main-color-dim)` / `rgba(196, 114, 74, 0.12)` in previous update).

### 5b. Add new CSS classes for redesigned landing page

```css
/* ─── Gamemode Showcase ─── */

.gamemode-showcase {
    display: flex;
    gap: 32px;
    align-items: center;
    padding: 32px 0;
    cursor: pointer;
    transition: transform 0.3s ease;
    border-bottom: 1px solid var(--border-color);
}

.gamemode-showcase:hover {
    transform: translateX(4px);
}

.gamemode-showcase:last-child {
    border-bottom: none;
}

@media (max-width: 768px) {
    .gamemode-showcase {
        flex-direction: column !important;
        text-align: center;
        gap: 20px;
    }
}

/* ─── Fun Fact Cards ─── */

.fun-fact-card {
    padding: 28px 24px;
    background: var(--bg-card);
    border-radius: var(--radius-card);
    border-left: 3px solid var(--main-color);
    margin: 20px 0;
    position: relative;
}

.fun-fact-card::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 60px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(212, 160, 84, 0.03));
    pointer-events: none;
}
```

---

## Step 6: Landing Page Full Redesign (`src/HomeScreen.jsx`)

This is the **largest change** — transforming the compact grid into an immersive scrollable experience.

### 6a. Expand SECTIONS array with longDesc and teaser

Each gamemode gets a personal description pulling from real chat data:

```javascript
const SECTIONS = [
    {
        id: 'chat-browser', icon: '💬', label: 'Browse',
        desc: 'Every conversation, searchable',
        longDesc: 'Scroll through all 346,794 messages across 6 platforms. Search any word, filter by date, and relive every single conversation from the very beginning.',
        teaser: 'From the first "jdhsh" on TikTok to yesterday',
    },
    {
        id: 'museum', icon: '🏛', label: 'Museum',
        desc: 'Milestones, gallery, firsts',
        longDesc: 'A curated collection of your firsts, milestones, shared photos, and most-used stickers. From message #1 to #346,794.',
        teaser: 'First message: "jdhsh" on TikTok, January 4, 2025',
    },
    {
        id: 'sky', icon: '🌙', label: 'Late Nights',
        desc: 'After midnight messages',
        longDesc: 'All those conversations that happened when you should have been sleeping. Tap a star to reveal a late-night message.',
        teaser: 'You two chat at 3-4 AM like it\'s nothing',
    },
    {
        id: 'quiz', icon: '💭', label: 'Who?',
        desc: 'Guess the speaker',
        longDesc: 'Can you tell who typed what? Guess whether it was kak Haidar or zuraa. Warning: you both type "BANGET" way too much.',
        teaser: '"harga diri gua masih lebih tinggi dri diskon shopee" — guess who?',
    },
    {
        id: 'memory', icon: '🎲', label: 'Rewind',
        desc: 'Relive a random day',
        longDesc: 'Travel back to any random day and relive the full conversation — every message, every platform, every voice note.',
        teaser: '312 unique days of conversations to explore',
    },
    {
        id: 'time-capsule', icon: '📅', label: 'On This Day',
        desc: 'Today in our history',
        longDesc: 'What were you talking about on this exact date last year? See your past selves, preserved in time.',
        teaser: 'Your own personal time machine',
    },
    {
        id: 'typing', icon: '⌨', label: 'Type Ours',
        desc: 'Type our words',
        longDesc: 'A typing test, but with your actual messages. Race each other typing the words you\'ve said to each other.',
        teaser: 'See how fast you can type your own conversations',
    },
    {
        id: 'finish', icon: '✏️', label: 'Complete Us',
        desc: 'Complete the sentence',
        longDesc: 'Given the first half of a real message, can you guess how it ends? Test how well you know each other\'s words.',
        teaser: 'Do you know how each other\'s sentences end?',
    },
    {
        id: 'stats', icon: '📊', label: 'Word War',
        desc: 'Who said it more',
        longDesc: 'Type any word and see who used it more. Try "sorry", "sayang", "banget", or anything else. Platform breakdown included.',
        teaser: '"sayang" — who said it more?',
    },
    {
        id: 'platform-quiz', icon: '🎯', label: 'Where?',
        desc: 'Which platform?',
        longDesc: 'Given a real message, guess which of the 6 platforms it was sent on. WhatsApp? Instagram? TikTok?',
        teaser: '6 platforms — can you tell them apart?',
    },
    {
        id: 'letters', icon: '✉', label: 'Love Notes',
        desc: 'Unlockable love notes',
        longDesc: 'Special letters unlocked by typing speed. The faster you type, the more notes you reveal.',
        teaser: 'Type fast enough to unlock them all',
    },
    {
        id: 'archive', icon: '🔍', label: 'Search',
        desc: 'Find any message',
        longDesc: 'Full-text search across your entire chat history. Find that one message you vaguely remember.',
        teaser: 'Every word, searchable',
    },
    {
        id: 'boss', icon: '🎮', label: 'Paragraphs',
        desc: 'Co-op typing challenge',
        longDesc: 'Long paragraphs from your actual conversations. Both players attack the boss by typing accurately. Co-op mode.',
        teaser: 'Type together to defeat the paragraph boss',
    },
];
```

### 6b. Remove platform pills with dashed borders

Delete the entire section that renders `platform-badge` elements (approximately lines 280-298 in current file). Replace with clean inline stats:

```jsx
{stats && (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
            fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
        }}
    >
        {Object.entries(stats.byPlatform)
            .filter(([, v]) => v.total > 0)
            .map(([platform, data]) => (
                <span key={platform} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <span style={{ color: PLATFORMS[platform]?.color }}>
                        {PLATFORMS[platform]?.icon}
                    </span>
                    <span>{formatNumber(data.total)}</span>
                </span>
            ))
        }
    </motion.div>
)}
```

### 6c. Create FunFact component + FUN_FACTS array

```jsx
const FUN_FACTS = [
    { emoji: '💕', stat: (s) => `you've said "sayang" ${s.funFacts?.find(f => f.id === 'sayang')?.label || '984 times'}`, sub: 'across all platforms' },
    { emoji: '📊', stat: (s) => `${s.avgMessagesPerDay} messages per day on average`, sub: "that's about one every 1.7 minutes you're awake" },
    { emoji: '📞', stat: (s) => `${Math.round(s.callStats.totalMinutes / 60)} hours on calls together`, sub: `${s.callStats.totalCalls} calls and counting` },
    { emoji: '😭', stat: () => `favorite emoji: 😭😭`, sub: 'used 1,903 times — dramatic much?' },
    { emoji: '🌙', stat: () => `chatting until 4 AM on the regular`, sub: 'sleep is overrated when you have each other' },
    { emoji: '🌐', stat: () => `6 platforms, 1 conversation`, sub: 'WhatsApp + Instagram + TikTok + iMessage + Discord' },
    { emoji: '📸', stat: (s) => `${s.mediaStats.images.toLocaleString()} photos shared`, sub: `plus ${s.mediaStats.videos} videos and ${s.mediaStats.audio.toLocaleString()} voice notes` },
    { emoji: '🫶', stat: () => `"zur" appears 1,028 times, "kak" 1,288 times`, sub: 'your favorite ways to call each other' },
];

function FunFact({ fact, stats, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="fun-fact-card"
            style={{
                textAlign: index % 2 === 0 ? 'left' : 'right',
                transform: `rotate(${index % 2 === 0 ? '-0.3' : '0.3'}deg)`,
            }}
        >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{fact.emoji}</div>
            <div style={{
                fontSize: 20, fontFamily: 'var(--font-handwritten)',
                color: 'var(--text-on-card)', lineHeight: 1.5,
            }}>
                {typeof fact.stat === 'function' ? fact.stat(stats) : fact.stat}
            </div>
            {fact.sub && (
                <div style={{
                    fontSize: 14, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-dim-card)', marginTop: 8, opacity: 0.7,
                }}>
                    {fact.sub}
                </div>
            )}
        </motion.div>
    );
}
```

### 6d. Replace nav-card grid with side-by-side GamemodeShowcase

Instead of `<div className="nav-grid">` with small Polaroid cards, create alternating left-right rows:

```jsx
function GamemodeShowcase({ section, index, onNavigate }) {
    const isEven = index % 2 === 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            onClick={() => onNavigate(section.id)}
            className="gamemode-showcase"
            style={{ flexDirection: isEven ? 'row' : 'row-reverse' }}
        >
            {/* Icon/visual side */}
            <div style={{
                flex: '0 0 160px', height: 160,
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 56,
                border: '1px solid var(--border-color)',
                transform: `rotate(${isEven ? '-2' : '2'}deg)`,
                boxShadow: '0 4px 16px var(--shadow-color)',
            }}>
                {section.icon}
            </div>
            {/* Description side */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 26,
                    fontStyle: 'italic', color: 'var(--text-color)', margin: 0,
                    fontWeight: 400,
                }}>
                    {section.label}
                </h3>
                <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 15,
                    color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.7,
                }}>
                    {section.longDesc}
                </p>
                {section.teaser && (
                    <p style={{
                        fontFamily: 'var(--font-handwritten)', fontSize: 15,
                        color: 'var(--main-color)', marginTop: 10,
                        transform: 'rotate(-0.5deg)', fontWeight: 400,
                    }}>
                        {section.teaser}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
```

### 6e. Assemble the new page layout

The scroll order:
1. **Hero** (85vh) — wax seal "hz", title "haizur", subtitle "archives", animated stats, clean platform strip
2. **Random quote** — already exists, keep as-is
3. **On This Day preview** — already exists, keep as-is
4. **Section divider**: "Explore"
5. **Alternating gamemodes + fun facts** — GamemodeShowcase components interleaved with FunFact cards (roughly every 2-3 gamemodes, insert a fun fact)
6. **Footer** — role switch, "haizur archives" text

```jsx
{/* Gamemodes + Fun Facts interleaved */}
{SECTIONS.map((section, i) => (
    <React.Fragment key={section.id}>
        <GamemodeShowcase section={section} index={i} onNavigate={onNavigate} />
        {/* Insert a fun fact every 2 gamemodes */}
        {i % 2 === 1 && Math.floor(i / 2) < FUN_FACTS.length && stats && (
            <FunFact fact={FUN_FACTS[Math.floor(i / 2)]} stats={stats} index={Math.floor(i / 2)} />
        )}
    </React.Fragment>
))}
```

---

## Step 7: Media Verification & Status

**Media is actually working correctly.** Here's the reality:

- **977 media files exist on disk** in `public/media/` (Instagram photos/videos/audio + iMessage voice notes)
- **930 messages in unified.json** have `mediaPath` pointing to these files
- **MediaRenderer.jsx** is properly integrated in ChatBrowser, MemoryLane, TimeCapsule, and Museum
- When a message with `mediaPath` appears, images render with click-to-lightbox, videos play inline, audio has controls
- **The other ~15,000+ media-type messages** (WhatsApp "image omitted", "video omitted", stickers without URLs) correctly show placeholders because the original files were never exported from WhatsApp/TikTok

**Why some media "doesn't show"**: Most media messages come from WhatsApp where the export only says "image omitted" — the actual image file was never included in the archive. Only Instagram DMs (which come with HTML + media folders) and iMessage voice notes had actual downloadable files. This is a data limitation, not a code bug.

**No changes needed** to parser or MediaRenderer.

---

## Files Modified (Summary)

| # | File | Type | Changes |
|---|------|------|---------|
| 1 | `scripts/parseAllPlatforms.cjs` | Parser | rawChatData → objects w/ platform+date; add funFacts + byMonth to stats |
| 2 | `src/Quiz.jsx` | Component | Access `.text` on messages; add PLATFORMS import; show platform icon after reveal |
| 3 | `src/FinishSentence.jsx` | Component | Access `.text` on messages; add PLATFORMS import; show platform icon in header |
| 4 | `src/MemoryLane.jsx` | Component | Add PLATFORMS import; show platform icon + time in speaker headers |
| 5 | `src/BossMode.jsx` | Component | Add PLATFORMS import; show platform icon next to date |
| 6 | `src/StatsBattle.jsx` | Component | Add PLATFORMS import; compute + render per-platform breakdown |
| 7 | `src/HomeScreen.jsx` | Component | **Full redesign**: SECTIONS w/ longDesc, fun facts, side-by-side layout, remove platform pills, "hz" seal |
| 8 | `src/RoleSelect.jsx` | Component | Wax seal "H" → "hz" |
| 9 | `src/index.css` | Styles | Remove `.platform-badge` dashed borders; add `.gamemode-showcase` + `.fun-fact-card` |
| 10 | `index.html` | HTML | Favicon → "hz" SVG; update meta description |

---

## Execution Order

```
1. Parser changes + re-run                      [Step 1]
     ↓
2. Quiz.jsx + FinishSentence.jsx                 [Step 2]  ← depends on new data format
     ↓
3. Platform indicators                           [Step 3]  ← independent per file
   (MemoryLane, BossMode, StatsBattle)
     ↓
4. Logo + favicon + meta                         [Step 4]  ← quick, independent
     ↓
5. CSS cleanup + new styles                      [Step 5]  ← before HomeScreen redesign
     ↓
6. HomeScreen.jsx full redesign                  [Step 6]  ← biggest change, uses stats data
     ↓
7. Build + verify                                [npx vite build + npm run dev]
```

Steps 3, 4, 5 can run in parallel since they're independent.

---

## Verification Checklist

After implementation, verify each of these:

### Data
- [ ] `rawChatData.json` — first item is `{ text: "...", platform: "...", date: "..." }`
- [ ] `stats.json` — has `funFacts` array with 7+ entries, has `byMonth` object

### Build
- [ ] `npx vite build` — zero errors, zero warnings

### Visual (run `npm run dev`)
- [ ] **Favicon**: Browser tab shows "hz" in wax-seal circle
- [ ] **Role Select**: Main seal shows "hz", role cards show H and A
- [ ] **Landing page hero**: Wax seal shows "hz"
- [ ] **Landing page stats**: Clean icon+number pairs, NO dashed borders
- [ ] **Landing page scroll**: Fun fact cards appear between gamemode showcases
- [ ] **Landing page gamemodes**: Side-by-side layout with longDesc and teaser text
- [ ] **Landing page mobile**: Stacks vertically on narrow screens
- [ ] **Rewind (MemoryLane)**: Platform icon + time visible next to speaker names
- [ ] **Who? (Quiz)**: Platform icon + date shown after answering
- [ ] **Complete Us (FinishSentence)**: Platform icon next to speaker name
- [ ] **Paragraphs (BossMode)**: Platform icon next to date
- [ ] **Word War (StatsBattle)**: Platform breakdown row below comparison bars
- [ ] **Browse (ChatBrowser)**: Media renders (images clickable, videos play, audio has controls)
- [ ] **Museum > Gallery**: Photo grid with lightbox working
- [ ] **Archive Search**: No crash on searching (null-safety working)
