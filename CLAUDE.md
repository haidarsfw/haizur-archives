# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haizur Archives — a personalized relationship archive webapp celebrating 346,794 messages across 6 platforms (WhatsApp, Instagram, TikTok, iMessage, Discord, FaceTime) over 409 days. Built as a personalized typing test with 19 interactive game modes and real-time multiplayer.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build (includes legacy polyfills for iOS 12+/Safari 12+)
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test runner is configured.

## Tech Stack

- **React 19** (functional components, hooks only) + **Vite 7**
- **Firebase**: Realtime Database (cursors, presence, game state) + Firestore (chat persistence)
- **Tailwind CSS 3** + CSS custom properties for theming
- **Framer Motion** for animations
- **Recharts** for WPM graphs
- No TypeScript, no router library — routing is state-based via `session.mode`

## Architecture

### Entry Point & Role Gate

`main.jsx` renders a `RoleGate` that checks `localStorage` for the user's role (`ours-role`). If no role is set, it shows `RoleSelect.jsx`; otherwise it renders `App.jsx` with `currentRole` prop. Roles are "haidar" or "azhura" (stored as p1/p2 internally). A root `ErrorBoundary` class component wraps everything.

### Routing & Mode System

There is no URL-based routing. `App.jsx` switches between 19 game modes based on `session.mode` (a local React state managed by `useSession`). Mode is intentionally **not synced from Firebase** to prevent race conditions when both players switch modes simultaneously — it only syncs if the partner's `modeChangedAt` timestamp is within 5 seconds. All other session fields (theme, timer, language) sync bidirectionally via Firebase RTDB at `session_v1`.

Browser history is managed manually via `window.history.pushState` with `#mode` hash fragments for back-button support.

### Lazy Loading

All game mode components except `HomeScreen`, `FloatingParticles`, and `LiveCursor` are lazy-loaded via `React.lazy()` with a shared `<Suspense>` fallback. Each non-home/non-typing mode is wrapped in a `ModeErrorBoundary` class component.

### Key Hooks

- **`useSession()`** — Shared game state + Firebase sync. Call `updateSession()` to merge updates and broadcast. Call `startNewGame()` to generate new word lists. Mode syncs to Firebase with a `modeChangedAt` timestamp but is ignored if stale (>5s).
- **`useEngine()`** — Typing test state machine (start → run → finish). Manages WPM calculation, accuracy, timer, and typed character tracking. State: `start` | `run` | `finish`.
- **`useMultiplayer()`** — Broadcasts cursor position and game progress to Firebase RTDB at `users/{myId}`. Throttled mousemove (50ms). Cleans up stale users after 60s (max 3 removals per tick).
- **`usePresence()`** — Heartbeat every 30s to `presence/{role}`. Provides `formatLastSeen()`. Partner presence detected by listening to the opposite role's node.

### Theme System

Nine themes (default/mahogany, milktea, romantic, night, matrix, pinky, ocean, sunset, coffee) controlled by `[data-theme]` attribute on the root div. All colors use CSS variables (`var(--main-color)`, `var(--bg-color)`, etc.) defined in `index.css`. Theme is persisted to `localStorage` key `haizur-theme`. Theme switching requires no component re-renders.

### Data Loading

`dataLoader.js` fetches JSON from `/public/data/*.json` with an in-memory cache and retry logic (3 retries with exponential backoff). Platform-specific loaders (`loadWhatsApp()`, `loadDiscord()`, etc.) and unified loaders (`loadStats()`, `loadTimeline()`). The `PLATFORMS` and `SPEAKERS` configs live here.

`src/words.js` contains the 13MB word list (all messages broken into words) and `generateWords()` function — this is bundled at build time.

### Mobile Input

Mobile detection via userAgent regex (not viewport). A `MobileInput` component in `App.jsx` renders an invisible `<input>` that triggers the iOS keyboard and processes all new characters immediately, with `autoCorrect="off"` and `autoCapitalize="off"` to work around iOS quirks.

### Multiplayer Separation of Concerns

- **RTDB**: Low-latency real-time data (cursors, game progress, presence, session sync)
- **Firestore**: Persistent data (chat messages in `LiveChat`)
- **No authentication** — public database, roles determined by localStorage ("haidar"/"azhura") and URL param `?princess=true` for cursor display

### Firebase Config

`firebase.js` reads config from `VITE_FIREBASE_*` env vars with hardcoded fallbacks. See `.env.example` for the full list.

## Adding a New Game Mode

1. Create `src/YourMode.jsx`
2. In `App.jsx`: add a `React.lazy()` import, add entry to `MODE_LABELS` and `MENU_ITEMS`, add a case in the mode switch inside `ModeErrorBoundary`
3. Use `session` from props for shared state, call `updateSession()` for synced changes

## Conventions

- Inline styles for theme-aware colors: `style={{ color: 'var(--main-color)' }}`
- Tailwind for layout and responsive design (`md:`, `lg:` prefixes)
- Framer Motion for enter/exit animations (`<motion.div>`, `<AnimatePresence>`)
- `useEffect` cleanup functions always returned for Firebase listeners
- Error handling via try-catch in useEffect hooks
- Custom Tailwind animations defined in `tailwind.config.js` (fade-in, slide-up, shimmer, gentle-bob, stamp-press)

## Notable Files

- `src/words.js` — 13MB word list (all messages broken into words), bundled at build time
- `src/LiveChat.jsx` — Feature-heavy chat component (reactions, read receipts, reply, delete, search)
- `src/index.css` — Global styles including all theme definitions and CSS variables
- `scripts/parseAllPlatforms.cjs` — Data parser for ingesting chat exports from all platforms
- `plans/haizur-redesign-full.md` — Comprehensive redesign spec with data analysis
