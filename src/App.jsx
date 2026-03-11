import React, { useEffect, useState, useRef, Suspense } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useEngine } from "./hooks/useEngine";
import { useMultiplayer } from "./hooks/useMultiplayer";
import { useSession } from "./hooks/useSession";
import { speakerNames } from "./words";
import { SPEAKERS, releaseCache } from "./dataLoader";

// Eagerly loaded (needed immediately)
import HomeScreen from "./HomeScreen";
import FloatingParticles from "./FloatingParticles";
import LiveCursor from "./LiveCursor";
import { usePresence, formatLastSeen } from "./hooks/usePresence";

// Lazy loaded (loaded on first visit)
const Quiz = React.lazy(() => import("./Quiz"));
const Archive = React.lazy(() => import("./Archive"));
const FinishSentence = React.lazy(() => import("./FinishSentence"));
const MemoryLane = React.lazy(() => import("./MemoryLane"));
const StatsBattle = React.lazy(() => import("./StatsBattle"));
const NightSky = React.lazy(() => import("./NightSky"));
const BossMode = React.lazy(() => import("./BossMode"));
const LoveLetters = React.lazy(() => import("./LoveLetters"));
const LiveChat = React.lazy(() => import("./LiveChat"));
const TimeCapsule = React.lazy(() => import("./TimeCapsule"));
const ChatBrowser = React.lazy(() => import("./ChatBrowser"));
const Museum = React.lazy(() => import("./Museum"));
const PlatformQuiz = React.lazy(() => import("./PlatformQuiz"));
const EmojiDecoder = React.lazy(() => import("./EmojiDecoder"));
const TimelineRace = React.lazy(() => import("./TimelineRace"));
const ChatRoulette = React.lazy(() => import("./ChatRoulette"));
const WordCloud = React.lazy(() => import("./WordCloud"));
const DailyChallenge = React.lazy(() => import("./DailyChallenge"));

// Suspense fallback — themed loading with spinner + skeleton chat bubbles
const LazyFallback = () => (
  <div className="w-full flex flex-col items-center justify-center min-h-[400px] gap-6 px-4">
    <div className="flex flex-col items-center gap-3">
      <div
        className="animate-spin"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--main-color)',
        }}
      />
      <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, opacity: 0.8 }}>
        Loading...
      </div>
    </div>
    <div className="w-full max-w-md flex flex-col gap-3 opacity-40">
      <div className="flex items-start gap-2">
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', flexShrink: 0 }} />
        <div style={{ maxWidth: '65%', width: '100%', height: 42, borderRadius: '4px 12px 12px 12px', background: 'var(--bg-card)' }} />
      </div>
      <div className="flex items-start gap-2 flex-row-reverse">
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', flexShrink: 0 }} />
        <div style={{ maxWidth: '55%', width: '100%', height: 42, borderRadius: '12px 4px 12px 12px', background: 'var(--bg-card)' }} />
      </div>
    </div>
  </div>
);

// Per-mode error boundary
class ModeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error(`Mode "${this.props.mode}" crashed:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex flex-col items-center justify-center min-h-[300px] gap-4 text-center p-8">
          <div style={{ fontSize: 48 }}>💔</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: 'var(--text-color)' }}>
            This mode crashed
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--sub-color)', maxWidth: 300 }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); this.props.onGoHome?.(); }}
            style={{ padding: '12px 28px', background: 'var(--main-color)', color: 'var(--bg-color)', border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600 }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MODE_LABELS = {
  typing: 'type ours', quiz: 'who?', archive: 'archive search', memory: 'rewind',
  finish: 'complete us', stats: 'word war', sky: 'late nights', boss: 'paragraphs',
  letters: 'love notes', 'time-capsule': 'on this day', 'chat-browser': 'browse',
  museum: 'museum', 'platform-quiz': 'where?', 'emoji-decoder': 'emoji decoder',
  'timeline-race': 'timeline race', 'chat-roulette': 'chat roulette',
  'word-cloud': 'word cloud', 'daily-challenge': 'daily challenge',
};

const MENU_ITEMS = [
  { mode: 'home', label: 'Home', icon: '🏠' },
  { mode: 'typing', label: 'Type Ours', icon: '⌨' },
  { mode: 'chat-browser', label: 'Browse', icon: '💬' },
  { mode: 'museum', label: 'Museum', icon: '🏛' },
  { mode: 'sky', label: 'Late Nights', icon: '🌙' },
  { mode: 'memory', label: 'Rewind', icon: '🎲' },
  { mode: 'quiz', label: 'Who?', icon: '💭' },
  { mode: 'archive', label: 'Archive Search', icon: '🔍' },
  { mode: 'stats', label: 'Word War', icon: '📊' },
  { mode: 'boss', label: 'Paragraphs', icon: '🎮' },
  { mode: 'finish', label: 'Complete Us', icon: '✏️' },
  { mode: 'time-capsule', label: 'On This Day', icon: '📅' },
  { mode: 'platform-quiz', label: 'Where?', icon: '🎯' },
  { mode: 'letters', label: 'Love Notes', icon: '✉' },
  { mode: 'emoji-decoder', label: 'Emoji Decoder', icon: '🧩' },
  { mode: 'timeline-race', label: 'Timeline Race', icon: '⏱️' },
  { mode: 'chat-roulette', label: 'Chat Roulette', icon: '🎰' },
  { mode: 'word-cloud', label: 'Word Cloud', icon: '☁️' },
  { mode: 'daily-challenge', label: 'Daily Challenge', icon: '🏆' },
];

// Mobile detection hook - checks user agent for actual mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      // Check user agent for actual mobile devices
      const userAgent = navigator.userAgent || '';
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    } catch (e) {
      // Fallback: assume not mobile if check fails
      setIsMobile(false);
    }
  }, []);

  return isMobile;
};

// Mobile Input Component - triggers native iOS keyboard
// Simple controlled input that processes all characters immediately
const MobileInput = ({ onKeyPress, isFocused }) => {
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-focus on mobile to show keyboard
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    // Process ALL new characters - fast typing needs this
    if (newValue.length > 0) {
      for (const char of newValue) {
        onKeyPress(char);
      }
      // Clear immediately after processing
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      onKeyPress('Backspace');
      setInputValue('');
    }
  };

  return (
    <div className="w-full flex justify-center mt-4 px-4">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        inputMode="text"
        enterKeyHint="done"
        placeholder="Tap here to type..."
        className="w-full max-w-md px-4 py-3 text-center text-lg bg-[var(--sub-color)] text-[var(--bg-color)] rounded-xl font-bold placeholder-[var(--bg-color)] opacity-80"
        style={{ fontSize: '16px' }}
      />
    </div>
  );
};

const TypingGame = ({ engine, uiOpacity, isFocused, otherUsers, session, handleKey, isMobile }) => {
  const { state, words, typed, timeLeft, wpm, rawWpm, accuracy, charStats, history, restart, setTimerDuration, setLanguage, language, timerDuration, setWords } = engine;
  const letterRefs = useRef({});
  const containerRef = useRef(null);
  const [lineOffset, setLineOffset] = useState(0);

  // 1. SYNC WORDS FROM SESSION - always use session words
  useEffect(() => {
    if (session.words) {
      setWords(session.words);
    }
  }, [session.words, setWords]);

  // Auto Scroll logic
  useEffect(() => {
    const currentIdx = typed.length;
    const currentLetter = letterRefs.current[currentIdx];
    if (currentLetter && containerRef.current) {
      const letterTop = currentLetter.offsetTop;
      // Use smaller line height on mobile
      const lineHeight = window.innerWidth < 768 ? 40 : 60;
      if (letterTop > lineHeight) setLineOffset(-(Math.floor(letterTop / lineHeight) * lineHeight));
      else setLineOffset(0);
    }
  }, [typed, words]);

  const getCaretPos = (index) => {
    const letter = letterRefs.current[index];
    if (!letter) return { left: 0, top: 10 };
    return { left: letter.offsetLeft - 2, top: letter.offsetTop + 8 };
  };

  const formatName = (name) => name ? name.toLowerCase() : "???";

  return (
    <>
      <div className="w-full max-w-6xl flex justify-end items-end px-10 mt-2 mb-8 select-none min-h-[60px]" style={{ opacity: uiOpacity }}>
        {state === "start" && (
          <div className="flex gap-6 text-[var(--sub-color)] text-base font-bold bg-[rgba(0,0,0,0.2)] px-6 py-3 rounded-full items-center">
            <div className="flex gap-4 border-r-2 border-[var(--sub-color)] pr-6">
              <button onClick={() => setLanguage('p1')} className={`hover:text-[var(--text-color)] ${language === 'p1' ? "text-[var(--main-color)]" : ""}`} aria-label={`Type as ${formatName(speakerNames.p1)}`}>{formatName(speakerNames.p1)}</button>
              <button onClick={() => setLanguage('p2')} className={`hover:text-[var(--text-color)] ${language === 'p2' ? "text-[var(--main-color)]" : ""}`} aria-label={`Type as ${formatName(speakerNames.p2)}`}>{formatName(speakerNames.p2)}</button>
            </div>
            <div className="flex gap-3">
              {[15, 30, 60].map(t => (
                <button key={t} onClick={() => setTimerDuration(t)} className={`${timerDuration === t ? "text-[var(--main-color)]" : ""} hover:text-[var(--text-color)]`}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-grow w-full max-w-5xl flex flex-col items-center justify-center relative">
        {/* LIVE RACE STATS - Show during typing */}
        {state === "run" && (
          <div className="w-full mb-4 px-2">
            <div className="flex justify-between items-center mb-2">
              <div className="text-5xl font-bold text-[var(--main-color)]">{timeLeft}</div>
              <div className="text-base text-[var(--sub-color)]">RACE IN PROGRESS</div>
            </div>

            {/* Progress bars */}
            <div className="space-y-2">
              {/* Your progress */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[var(--main-color)] w-14">YOU</span>
                <div className="flex-1 h-3 bg-[rgba(0,0,0,0.2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--main-color)] transition-all duration-100 rounded-full"
                    style={{ width: `${words ? (typed.length / words.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-[var(--main-color)] w-20 text-right">{wpm} WPM</span>
              </div>

              {/* Partner's progress */}
              {Object.keys(otherUsers).map(key => {
                const u = otherUsers[key];
                if (u.status !== 'typing' || !u.gameData) return null;
                const pProgress = u.gameData.progress || 0;
                const pWpm = u.gameData.wpm || 0;
                const pColor = 'var(--accent-color)';
                const label = u.role === 'princess' ? SPEAKERS.p2.name : SPEAKERS.p1.name;

                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm font-bold w-14" style={{ color: pColor }}>{label}</span>
                    <div className="flex-1 h-3 bg-[rgba(0,0,0,0.2)] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-100 rounded-full"
                        style={{
                          width: `${words ? (pProgress / words.length) * 100 : 0}%`,
                          backgroundColor: pColor
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold w-20 text-right" style={{ color: pColor }}>{pWpm} WPM</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state !== "finish" ? (
          <div className="relative w-full h-[120px] md:h-[180px] overflow-hidden px-2 md:px-0">
            <motion.div animate={{ y: lineOffset }} transition={{ type: "spring", stiffness: 200, damping: 25 }} className="relative text-[22px] md:text-[36px] leading-[40px] md:leading-[60px] tracking-wide outline-none word-break-fix" ref={containerRef}>

              {/* MY CARET */}
              <motion.div className="absolute w-[2px] md:w-[3px] h-[28px] md:h-[45px] bg-[var(--caret-color)] rounded-full z-10" layoutId="caret" animate={{ left: getCaretPos(typed.length).left, top: getCaretPos(typed.length).top }} transition={{ type: "spring", stiffness: 400, damping: 28 }} />

              {/* PARTNER'S GHOST CARET */}
              {Object.keys(otherUsers).map(key => {
                const u = otherUsers[key];
                if (u.status !== 'typing' || !u.gameData) return null;

                const pIndex = u.gameData.progress || 0;
                const pColor = 'var(--accent-color)';
                const pos = getCaretPos(pIndex);

                return (
                  <motion.div
                    key={key}
                    className="absolute w-[1px] md:w-[2px] h-[28px] md:h-[40px] rounded-full z-5 opacity-50"
                    style={{ backgroundColor: pColor }}
                    animate={{ left: pos.left + 2, top: pos.top }}
                    transition={{ duration: 0.1 }}
                  >
                    <div
                      className="absolute -left-8 top-0 text-[8px] md:text-[9px] font-bold px-1 rounded-sm opacity-70 whitespace-nowrap"
                      style={{ color: pColor }}
                    >
                      {u.role === 'princess' ? "♡" : "★"}
                    </div>
                  </motion.div>
                );
              })}

              {(words || "").split("").map((char, i) => {
                let color = "text-[var(--sub-color)]";
                if (i < typed.length) color = typed[i] === char ? "text-[var(--text-color)]" : "text-[var(--error-color)]";
                return <span key={i} ref={(el) => (letterRefs.current[i] = el)} className={`${color} relative select-none`}>{char}</span>;
              })}
            </motion.div>
          </div>
        ) : (
          <div className="w-full animate-fade-in flex flex-col items-center">
            <div className="grid grid-cols-4 gap-4 w-full mb-8">
              <div className="flex flex-col"><div className="text-3xl text-[var(--sub-color)]">wpm</div><div className="text-8xl font-bold text-[var(--main-color)]">{wpm}</div></div>
              <div className="flex flex-col"><div className="text-3xl text-[var(--sub-color)]">acc</div><div className="text-8xl font-bold text-[var(--main-color)]">{accuracy}%</div></div>
              <div className="col-span-2 flex flex-col justify-center gap-2 pl-10 border-l border-[var(--sub-color)] border-opacity-20">
                <div className="flex justify-between border-b border-[var(--sub-color)] border-opacity-30 pb-1"><span className="text-[var(--sub-color)]">raw</span><span className="text-[var(--text-color)] font-bold text-xl">{rawWpm}</span></div>
              </div>
            </div>
            <div className="w-full h-64 mb-8 bg-[rgba(0,0,0,0.15)] rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" stroke="var(--sub-color)" opacity={0.1} /><XAxis dataKey="time" stroke="var(--sub-color)" opacity={0.5} /><YAxis stroke="var(--sub-color)" opacity={0.5} domain={['dataMin', 'dataMax + 10']} /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--main-color)', color: 'var(--text-color)' }} /><Line type="monotone" dataKey="wpm" stroke="var(--main-color)" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
            </div>
            <button onClick={restart} className="px-10 py-3 bg-[var(--sub-color)] hover:bg-[var(--text-color)] text-[var(--bg-color)] font-bold rounded-lg transition text-lg">Restart Test</button>
          </div>
        )}
      </div>

      {/* Mobile Input - triggers native iOS keyboard */}
      {isMobile && state !== "finish" && (
        <MobileInput onKeyPress={handleKey} isFocused={isFocused} />
      )}
    </>
  );
};

export default function App({ currentRole, onSwitchRole }) {
  const engine = useEngine();
  const { session, updateSession, startNewGame, isConnected, partnerModeNotification } = useSession();
  const activeGame = session.mode;
  const theme = session.theme;
  const partnerPresence = usePresence(currentRole);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const scrollPositions = useRef({});
  const browseTarget = useRef(null);
  const [browseTargetState, setBrowseTargetState] = useState(null); // Persistent backup survives remounts
  const chatBrowserState = useRef(null); // Persist scroll + batch across mode switches
  const isMobile = useIsMobile();

  // Sync Engine with Session Data
  useEffect(() => {
    engine.setLanguage(session.language);
    engine.setTimerDuration(session.timer);
  }, [session.language, session.timer]);

  const otherUsers = useMultiplayer(activeGame, {
    progress: engine.typed.length,
    wpm: engine.wpm
  });

  const visitedModes = useRef(new Set());
  const [skipMotion, setSkipMotion] = useState(false);

  const switchGameGlobal = (mode, context) => {
    // Idempotency guard: don't switch to the same mode unless we have a navigation context
    if (mode === activeGame && !context) return;
    // Save current scroll position before switching
    scrollPositions.current[activeGame] = window.scrollY;
    if (context) {
      browseTarget.current = context;
      setBrowseTargetState(context); // Persistent backup in case ref is lost on remount
    }

    // Mark CURRENT mode as visited (so returning to it later skips animations)
    visitedModes.current.add(activeGame);
    // If target mode was already visited, skip entry animations
    if (visitedModes.current.has(mode)) {
      setSkipMotion(true);
      document.body.classList.add('skip-entry-anims'); // Apply synchronously before render
    }

    // Release cached data when leaving data-heavy modes
    const dataHeavyModes = ['archive', 'stats', 'timeline-race', 'chat-roulette', 'word-cloud', 'daily-challenge'];
    if (dataHeavyModes.includes(activeGame) && !dataHeavyModes.includes(mode) && mode !== 'chat-browser') {
        setTimeout(() => releaseCache('unified'), 100);
    }

    updateSession({ mode });
    setIsMenuOpen(false);
    setIsThemeOpen(false);
    setShowShortcuts(false);

    // Push to browser history for back button support
    window.history.pushState({ mode }, '', `#${mode}`);

    if (mode === 'typing') {
      startNewGame(session.language);
    }
    engine.restart();
  };

  // Skip entry animations temporarily when returning to a visited mode
  useEffect(() => {
    if (skipMotion) {
      document.body.classList.add('skip-entry-anims');
      const timer = setTimeout(() => {
        setSkipMotion(false);
        document.body.classList.remove('skip-entry-anims');
      }, 3000);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('skip-entry-anims');
      };
    }
  }, [skipMotion]);

  const switchThemeGlobal = (t) => {
    updateSession({ theme: t });
    try { localStorage.setItem('haizur-theme', t); } catch (e) { }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); setIsMenuOpen(p => !p); setShowShortcuts(false); if (engine.state === 'run') engine.restart(); return; }
      if (e.key === "?" && !isMenuOpen && activeGame !== 'typing') { e.preventDefault(); setShowShortcuts(p => !p); return; }
      if (isMenuOpen || showShortcuts || !isFocused) return;
      // Ctrl+Number for quick mode switch (works from ANY mode including typing)
      if (e.ctrlKey && !e.metaKey && !e.shiftKey && e.code >= 'Digit0' && e.code <= 'Digit9') {
        e.preventDefault();
        const digit = parseInt(e.code.charAt(5));
        const idx = digit === 0 ? 9 : digit - 1; // Ctrl+0 maps to 10th item (index 9)
        if (idx < MENU_ITEMS.length) {
          switchGameGlobal(MENU_ITEMS[idx].mode);
          return;
        }
      }
      if (e.ctrlKey || e.metaKey) return;
      // Skip shortcuts when user is typing in an input field
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
      if (e.key === "Tab") {
        e.preventDefault();
        if (activeGame === 'typing') startNewGame(session.language);
        engine.restart();
      }
      if (isMobile && activeGame === "typing") return;
      if (activeGame === "typing" && (e.key.length === 1 || e.key === "Backspace")) engine.handleKey(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [engine.handleKey, engine.restart, isFocused, isMenuOpen, activeGame, engine.state, isMobile, showShortcuts]);

  // Browser back button support
  useEffect(() => {
    const handlePopState = (e) => {
      const mode = e.state?.mode || 'home';
      visitedModes.current.add(activeGame);
      if (visitedModes.current.has(mode)) {
        setSkipMotion(true);
        document.body.classList.add('skip-entry-anims');
      }
      scrollPositions.current[activeGame] = window.scrollY;
      updateSession({ mode });
      engine.restart();
    };
    window.addEventListener('popstate', handlePopState);
    // Set initial history state
    window.history.replaceState({ mode: activeGame }, '', `#${activeGame}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeGame]);

  // Restore scroll position after mode switch (wait for React re-render + DOM paint)
  useEffect(() => {
    const saved = scrollPositions.current[activeGame];
    if (saved != null) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved, behavior: 'instant' });
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeGame]);

  useEffect(() => {
    const onBlur = () => setIsFocused(false); const onFocus = () => setIsFocused(true);
    window.addEventListener("blur", onBlur); window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("blur", onBlur); window.removeEventListener("focus", onFocus); };
  }, []);

  return (
    <div className={`w-full flex flex-col items-center transition-colors duration-500 relative min-h-screen ${activeGame === 'typing' ? 'overflow-hidden' : 'overflow-y-auto'}`} data-theme={theme} style={{ backgroundColor: 'var(--bg-color)', fontFamily: 'var(--font-body)' }} onClick={() => setIsFocused(true)}>

      <div className="grain-overlay" />
      <div className="paper-fibers" />
      <FloatingParticles theme={theme} />
      <LiveCursor users={otherUsers} />

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-center" onClick={() => setIsMenuOpen(false)}>
            <motion.div initial={{ scale: 0.9, rotate: -1 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg h-[70vh] overflow-y-auto shadow-2xl" style={{ borderRadius: 'var(--radius-card)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', backgroundImage: 'repeating-linear-gradient(transparent, transparent 29px, var(--sub-color) 29px, var(--sub-color) 30px)', backgroundPosition: '0 8px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              {/* Red margin line */}
              <div style={{ position: 'absolute', left: 44, top: 0, bottom: 0, width: 1, background: 'rgba(180, 60, 60, 0.15)', pointerEvents: 'none' }} />
              <div className="p-8 pl-14">
                <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 18, color: 'var(--text-dim-card)', marginBottom: 20, transform: 'rotate(-1deg)' }}>table of contents</div>
                <div className="flex flex-col gap-1 mb-8">
                  {MENU_ITEMS.map((item) => (
                    <button key={item.mode} onClick={() => switchGameGlobal(item.mode)} className="text-left transition-all group" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 'var(--radius-card)', background: activeGame === item.mode ? 'var(--main-color-dim)' : 'transparent', cursor: 'pointer', border: 'none' }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontFamily: 'var(--font-handwritten)', fontSize: 20, color: activeGame === item.mode ? 'var(--main-color)' : 'var(--text-on-card)', fontWeight: activeGame === item.mode ? 700 : 400 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 18, color: 'var(--text-dim-card)', marginBottom: 14, transform: 'rotate(-0.5deg)' }}>color palette</div>
                <div className="flex flex-wrap gap-3 mb-8">
                  {[{ id: 'default', label: 'Mahogany', emoji: '🪵' }, { id: 'milktea', label: 'Milktea', emoji: '🧋' }, { id: 'romantic', label: 'Cherry Blossom', emoji: '🌸' }, { id: 'night', label: 'Midnight', emoji: '🌙' }, { id: 'matrix', label: 'Terminal', emoji: '💻' }, { id: 'pinky', label: 'Pinky Cute', emoji: '🎀' }, { id: 'ocean', label: 'Ocean Breeze', emoji: '🌊' }, { id: 'sunset', label: 'Sunset Diary', emoji: '🌅' }, { id: 'coffee', label: 'Coffee Journal', emoji: '☕' }].map(t => <button key={t.id} onClick={() => switchThemeGlobal(t.id)} style={{ padding: '10px 20px', borderRadius: 'var(--radius-card)', border: `1.5px solid ${theme === t.id ? 'var(--main-color)' : 'var(--border-color)'}`, background: theme === t.id ? 'var(--main-color-dim)' : 'transparent', color: theme === t.id ? 'var(--main-color)' : 'var(--text-dim-card)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 14, transition: 'all 0.2s' }}>{t.emoji} {t.label}</button>)}
                </div>
              </div>
              {/* Torn paper bottom edge */}
              <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 8, background: 'var(--bg-card)', clipPath: 'polygon(0% 50%, 2% 0%, 5% 60%, 8% 10%, 12% 80%, 15% 20%, 18% 70%, 22% 5%, 25% 50%, 28% 15%, 32% 65%, 35% 0%, 38% 55%, 42% 10%, 45% 70%, 48% 20%, 52% 80%, 55% 5%, 58% 60%, 62% 15%, 65% 75%, 68% 0%, 72% 55%, 75% 20%, 78% 70%, 82% 10%, 85% 60%, 88% 0%, 92% 50%, 95% 15%, 98% 65%, 100% 0%, 100% 100%, 0% 100%)', pointerEvents: 'none' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Film strip style, shown on all pages except home */}
      {activeGame !== 'home' && (
        <div className="w-full film-strip flex justify-between items-center px-6 md:px-10 py-3 md:py-4 mt-2 md:mt-4 mb-2 md:mb-4" style={{ maxWidth: 'var(--width-home)' }}>
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => switchGameGlobal('home')} className="text-[var(--sub-color)] hover:text-[var(--main-color)] transition" title="Back to Home" aria-label="Back to Home">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="text-[var(--sub-color)] hover:text-[var(--text-color)] transition" aria-label="Open menu"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, letterSpacing: '-0.01em', fontStyle: 'italic', color: 'var(--text-color)' }}>haizur</div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ fontFamily: 'var(--font-handwritten)', fontWeight: 400, fontSize: 18, color: 'var(--main-color)', transform: 'rotate(-1.5deg)', display: 'inline-block' }}>
              {MODE_LABELS[activeGame] || activeGame}
            </div>
            <div title={isConnected ? 'Connected' : 'Offline'} style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? 'var(--success-color)' : 'var(--error-color)', boxShadow: isConnected ? '0 0 6px var(--success-color)' : 'none', flexShrink: 0 }} />
          </div>
        </div>
      )}

      <div className="flex-grow w-full flex flex-col items-center justify-center" style={{ contain: activeGame === 'sky' ? 'none' : 'content' }}>
        <Suspense fallback={<LazyFallback />}>
          <MotionConfig reducedMotion={skipMotion ? "always" : "never"}>
            <AnimatePresence mode={skipMotion ? "sync" : "wait"}>
              <motion.div
                key={activeGame}
                initial={visitedModes.current.has(activeGame) ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: visitedModes.current.has(activeGame) ? 0.05 : 0.25, ease: 'easeOut' }}
                className={`w-full flex flex-col items-center ${activeGame === 'sky' ? 'flex-grow' : 'justify-center flex-grow'}`}
              >
                {activeGame === 'home' && <HomeScreen onNavigate={switchGameGlobal} theme={theme} currentUser={currentRole} partnerPresence={partnerPresence} onSwitchRole={onSwitchRole} skipMotion={skipMotion} isMobile={isMobile} />}
                {activeGame === 'typing' && <TypingGame engine={engine} uiOpacity={isMenuOpen ? 0 : 1} isFocused={isFocused} otherUsers={otherUsers} session={session} handleKey={engine.handleKey} isMobile={isMobile} />}
                {activeGame !== 'home' && activeGame !== 'typing' && (
                  <ModeErrorBoundary key={activeGame} mode={activeGame} onGoHome={() => switchGameGlobal('home')}>
                    {activeGame === 'quiz' && <Quiz theme={theme} otherUsers={otherUsers} session={session} updateSession={updateSession} />}
                    {activeGame === 'archive' && <Archive theme={theme} otherUsers={otherUsers} />}
                    {activeGame === 'memory' && <MemoryLane theme={theme} otherUsers={otherUsers} session={session} updateSession={updateSession} />}
                    {activeGame === 'finish' && <FinishSentence theme={theme} otherUsers={otherUsers} session={session} updateSession={updateSession} />}
                    {activeGame === 'stats' && <StatsBattle otherUsers={otherUsers} />}
                    {activeGame === 'sky' && <NightSky otherUsers={otherUsers} />}
                    {activeGame === 'boss' && <BossMode otherUsers={otherUsers} session={session} updateSession={updateSession} />}
                    {activeGame === 'letters' && <LoveLetters otherUsers={otherUsers} />}
                    {activeGame === 'time-capsule' && <TimeCapsule theme={theme} />}
                    {activeGame === 'chat-browser' && <ChatBrowser theme={theme} initialTarget={browseTarget} initialTargetState={browseTargetState} clearTargetState={() => setBrowseTargetState(null)} savedState={chatBrowserState} currentRole={currentRole} isMobile={isMobile} />}
                    {activeGame === 'museum' && <Museum theme={theme} />}
                    {activeGame === 'platform-quiz' && <PlatformQuiz theme={theme} />}
                    {activeGame === 'emoji-decoder' && <EmojiDecoder theme={theme} />}
                    {activeGame === 'timeline-race' && <TimelineRace theme={theme} />}
                    {activeGame === 'chat-roulette' && <ChatRoulette theme={theme} />}
                    {activeGame === 'word-cloud' && <WordCloud theme={theme} />}
                    {activeGame === 'daily-challenge' && <DailyChallenge theme={theme} onNavigate={switchGameGlobal} />}
                  </ModeErrorBoundary>
                )}
              </motion.div>
            </AnimatePresence>
          </MotionConfig>
        </Suspense>
      </div>

      {/* Floating Theme Switcher Button */}
      <motion.button
        onClick={() => setIsThemeOpen(p => !p)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 left-4 md:bottom-5 md:left-5 z-40 w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 16px var(--shadow-color)',
        }}
        aria-label="Change theme"
      >
        <span style={{ fontSize: isMobile ? 15 : 20 }}>🎨</span>
      </motion.button>

      {/* Theme Switcher Popup */}
      <AnimatePresence>
        {isThemeOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsThemeOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-14 left-4 md:bottom-20 md:left-5 z-50"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: 16,
                boxShadow: '0 8px 32px var(--shadow-color)',
                minWidth: 180,
                maxHeight: '60vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 14, color: 'var(--text-dim-card)', marginBottom: 10 }}>color palette</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{ id: 'default', label: 'Mahogany', emoji: '🪵' }, { id: 'milktea', label: 'Milktea', emoji: '🧋' }, { id: 'romantic', label: 'Cherry Blossom', emoji: '🌸' }, { id: 'night', label: 'Midnight', emoji: '🌙' }, { id: 'matrix', label: 'Terminal', emoji: '💻' }, { id: 'pinky', label: 'Pinky Cute', emoji: '🎀' }, { id: 'ocean', label: 'Ocean Breeze', emoji: '🌊' }, { id: 'sunset', label: 'Sunset Diary', emoji: '🌅' }, { id: 'coffee', label: 'Coffee Journal', emoji: '☕' }].map(t => (
                  <button key={t.id} onClick={() => { switchThemeGlobal(t.id); setIsThemeOpen(false); }}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: theme === t.id ? 'var(--main-color-dim)' : 'transparent',
                      color: theme === t.id ? 'var(--main-color)' : 'var(--text-on-card)',
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                    <span>{t.emoji}</span> {t.label}
                    {theme === t.id && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="p-8 max-w-sm" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px var(--shadow-color)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: 'var(--text-color)', marginBottom: 20 }}>Keyboard Shortcuts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                {[['Esc', 'Toggle menu'], ['Tab', 'Restart / new words'], ['?', 'Show this help'], ['Ctrl+0-9', 'Quick switch mode']].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ background: 'var(--sub-color)', color: 'var(--bg-color)', padding: '4px 10px', borderRadius: 4, fontWeight: 700, minWidth: 40, textAlign: 'center', fontSize: 13 }}>{key}</span>
                    <span style={{ color: 'var(--text-on-card)' }}>{desc}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowShortcuts(false)} style={{ marginTop: 20, padding: '10px 24px', background: 'var(--main-color)', color: 'var(--bg-color)', border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, width: '100%' }}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button - Wax Seal Style */}
      <motion.button
        onClick={() => setIsChatOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat"
        className="fixed bottom-4 right-4 z-40 w-11 h-11 md:w-16 md:h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, var(--main-color), var(--wax-seal-color, var(--main-color)))',
          boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 16px rgba(212, 160, 84, 0.3)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <span className="text-base md:text-2xl" style={{ color: 'var(--bg-color)', textShadow: '0 1px 2px rgba(0,0,0,0.3)', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
          💬
        </span>
      </motion.button>

      {/* Chat Popup Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={() => setIsChatOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="w-full md:w-[450px] md:max-w-[90vw] max-h-[92vh] md:max-h-[85vh] overflow-hidden shadow-2xl"
              style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Torn paper top edge */}
              <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 8, background: 'var(--bg-card)', clipPath: 'polygon(0% 100%, 0% 50%, 3% 100%, 6% 40%, 9% 90%, 12% 20%, 16% 80%, 19% 50%, 22% 100%, 25% 30%, 28% 70%, 32% 100%, 35% 40%, 38% 85%, 42% 30%, 45% 90%, 48% 50%, 52% 100%, 55% 35%, 58% 80%, 62% 45%, 65% 95%, 68% 30%, 72% 75%, 75% 100%, 78% 45%, 82% 85%, 85% 30%, 88% 70%, 92% 100%, 95% 50%, 98% 80%, 100% 100%)', zIndex: 2 }} />
              {/* Parchment Header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--gradient-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--bg-card)', fontSize: 16 }}>💬</span>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--bg-card)', fontSize: 15, fontStyle: 'italic' }}>Correspondence</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'var(--font-mono)', marginLeft: 8 }}>live</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-base font-light transition-colors"
                  style={{ color: 'var(--bg-card)' }}
                >
                  ✕
                </motion.button>
              </div>
              <LiveChat theme={theme} isPopup={true} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeGame !== 'home' && (
        <div className="w-full max-w-6xl flex flex-col items-center gap-2 text-[var(--sub-color)] text-sm opacity-50 mb-6">
          <div className="flex gap-8 hide-on-mobile"><div className="flex items-center gap-2"><span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-2 py-0.5 rounded text-xs font-bold">tab</span> restart</div><div className="flex items-center gap-2"><span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-2 py-0.5 rounded text-xs font-bold">esc</span> menu</div><div className="flex items-center gap-2"><span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-2 py-0.5 rounded text-xs font-bold">?</span> help</div></div>
        </div>
      )}

      {/* Partner mode switch toast */}
      <AnimatePresence>
        {partnerModeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 60, padding: '10px 20px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)', boxShadow: '0 4px 20px var(--shadow-color)',
              fontFamily: 'var(--font-handwritten)', fontSize: 14, color: 'var(--main-color)',
              whiteSpace: 'nowrap',
            }}
          >
            Partner switched to {MODE_LABELS[partnerModeNotification] || partnerModeNotification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
