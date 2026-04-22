// Web Audio synthesized sound kit. No audio assets — everything generated on the fly.
// Each cue is short, volume-clamped, and tuned to feel warm without being loud.

let _ctx = null;
let _enabled = null; // null = not yet resolved; true/false after first check
const _masterGain = 0.35;

const SOUNDS_KEY = 'haizur-sounds-enabled';

const getCtx = () => {
    if (_ctx) return _ctx;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        _ctx = new Ctx();
    } catch {
        _ctx = null;
    }
    return _ctx;
};

const shouldPlay = () => {
    if (_enabled === null) {
        try {
            const stored = localStorage.getItem(SOUNDS_KEY);
            if (stored === null) _enabled = true;
            else _enabled = stored === 'true';
        } catch { _enabled = true; }
        try {
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                _enabled = false;
            }
        } catch { /* noop */ }
    }
    return _enabled;
};

export const setSoundsEnabled = (value) => {
    _enabled = !!value;
    try { localStorage.setItem(SOUNDS_KEY, String(_enabled)); } catch { /* noop */ }
    if (_enabled) {
        const ctx = getCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { });
    }
};

export const getSoundsEnabled = () => shouldPlay();

// Resume the audio context after a user gesture. Browsers require this
// before any sound can be produced when the page loads in the background.
export const primeSounds = () => {
    if (!shouldPlay()) return;
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { });
};

// ── Primitive tone builder ──────────────────────────────────────────────
const tone = ({ freq, duration = 0.12, type = 'sine', gain = 0.3, attack = 0.005, release, delay = 0 }) => {
    if (!shouldPlay()) return;
    const ctx = getCtx();
    if (!ctx) return;
    const rel = release ?? Math.max(0.02, duration * 0.4);
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * _masterGain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + rel);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + rel + 0.05);
};

// Noise burst (filtered white noise) for swooshes/clicks.
const noise = ({ duration = 0.12, gain = 0.2, type = 'bandpass', freq = 1200, Q = 0.8, delay = 0 }) => {
    if (!shouldPlay()) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * _masterGain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + duration + 0.01);
};

// ── Named cues ───────────────────────────────────────────────────────────
// Two-note pluck — rising
export const playMessageSend = () => {
    tone({ freq: 523.25, duration: 0.07, type: 'triangle', gain: 0.25 });
    tone({ freq: 659.25, duration: 0.09, type: 'triangle', gain: 0.22, delay: 0.05 });
};

// Soft single bell with decay
export const playMessageReceive = () => {
    tone({ freq: 440, duration: 0.18, type: 'sine', gain: 0.3, release: 0.25 });
    tone({ freq: 880, duration: 0.10, type: 'sine', gain: 0.12, delay: 0.02 });
};

// Triple staccato ping
export const playNudge = () => {
    for (let i = 0; i < 3; i++) {
        tone({ freq: 783.99, duration: 0.05, type: 'square', gain: 0.2, delay: i * 0.07 });
    }
};

// Sparkle
export const playReaction = () => {
    noise({ duration: 0.08, gain: 0.15, freq: 3200, Q: 1.2 });
    tone({ freq: 1760, duration: 0.05, type: 'sine', gain: 0.15, delay: 0.02 });
};

// Warm swoosh
export const playMenuOpen = () => {
    noise({ duration: 0.22, gain: 0.12, freq: 600, Q: 0.6 });
    tone({ freq: 349.23, duration: 0.12, type: 'sine', gain: 0.1, delay: 0.04 });
};

// Descending close tone
export const playMenuClose = () => {
    tone({ freq: 523.25, duration: 0.06, type: 'sine', gain: 0.18 });
    tone({ freq: 392, duration: 0.12, type: 'sine', gain: 0.18, delay: 0.04 });
};

// Glassy triad
export const playThemeSwitch = () => {
    tone({ freq: 523.25, duration: 0.08, type: 'sine', gain: 0.2, delay: 0 });
    tone({ freq: 659.25, duration: 0.08, type: 'sine', gain: 0.2, delay: 0.05 });
    tone({ freq: 783.99, duration: 0.12, type: 'sine', gain: 0.2, delay: 0.1 });
};

// Soft chime on mode change
export const playModeChange = () => {
    tone({ freq: 739.99, duration: 0.16, type: 'sine', gain: 0.22, release: 0.2 });
    tone({ freq: 987.77, duration: 0.10, type: 'sine', gain: 0.1, delay: 0.03 });
};

// Upbeat double beep
export const playTypingTestStart = () => {
    tone({ freq: 659.25, duration: 0.08, type: 'triangle', gain: 0.22 });
    tone({ freq: 783.99, duration: 0.12, type: 'triangle', gain: 0.22, delay: 0.08 });
};

// Victory flourish
export const playTypingTestFinish = () => {
    tone({ freq: 523.25, duration: 0.09, type: 'triangle', gain: 0.22 });
    tone({ freq: 659.25, duration: 0.09, type: 'triangle', gain: 0.22, delay: 0.09 });
    tone({ freq: 783.99, duration: 0.09, type: 'triangle', gain: 0.22, delay: 0.18 });
    tone({ freq: 1046.5, duration: 0.18, type: 'triangle', gain: 0.25, delay: 0.27 });
};

// Low thud
export const playError = () => {
    tone({ freq: 220, duration: 0.10, type: 'sawtooth', gain: 0.2, release: 0.12 });
    tone({ freq: 146.83, duration: 0.10, type: 'sawtooth', gain: 0.18, delay: 0.05 });
};

// Click
export const playToggle = () => {
    noise({ duration: 0.04, gain: 0.18, freq: 1800, Q: 2 });
};

// Very soft tick for primary CTA hover
let _lastHover = 0;
export const playHover = () => {
    const now = Date.now();
    if (now - _lastHover < 180) return; // throttle
    _lastHover = now;
    tone({ freq: 2000, duration: 0.025, type: 'sine', gain: 0.06 });
};

// Heart pop — used by quick-affection sends
export const playHeart = () => {
    tone({ freq: 880, duration: 0.06, type: 'sine', gain: 0.2 });
    tone({ freq: 1318.51, duration: 0.14, type: 'sine', gain: 0.22, delay: 0.04, release: 0.2 });
};

// Effect-burst cue for confetti / hearts overlay on keyword
export const playEffectBurst = () => {
    for (let i = 0; i < 4; i++) {
        tone({ freq: 880 + i * 140, duration: 0.05, type: 'triangle', gain: 0.14, delay: i * 0.04 });
    }
};

export const SOUNDS = {
    messageSend: playMessageSend,
    messageReceive: playMessageReceive,
    nudge: playNudge,
    reaction: playReaction,
    menuOpen: playMenuOpen,
    menuClose: playMenuClose,
    themeSwitch: playThemeSwitch,
    modeChange: playModeChange,
    typingTestStart: playTypingTestStart,
    typingTestFinish: playTypingTestFinish,
    error: playError,
    toggle: playToggle,
    hover: playHover,
    heart: playHeart,
    effectBurst: playEffectBurst,
};

// Convenience: play by name. Used by useSounds() hook.
export const playSound = (name) => {
    const fn = SOUNDS[name];
    if (typeof fn === 'function') fn();
};
