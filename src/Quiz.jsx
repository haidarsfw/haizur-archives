import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakerNames } from "./words";
import { loadRawChatData, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function Quiz({ theme, otherUsers = {}, session = {}, updateSession }) {
  const [gameState, setGameState] = useState("playing");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [rawChatData, setRawChatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRawChatData()
      .then(data => {
        setRawChatData(data || { p1: [], p2: [] });
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load quiz data:', err);
        setIsLoading(false);
      });
  }, []);

  const seed = session.gameData?.quizSeed || Date.now();

  const currentQuestion = useMemo(() => {
    if (!rawChatData) return null;
    const localSeed = seed + questionIndex;
    const speakers = ['p1', 'p2'];
    const randomSpeaker = speakers[Math.floor(seededRandom(localSeed) * speakers.length)];
    const messages = rawChatData[randomSpeaker];
    if (!messages || messages.length === 0) return null;
    const msgIndex = Math.floor(seededRandom(localSeed + 1) * messages.length);
    const msgObj = messages[msgIndex];
    return { text: msgObj.text, answer: randomSpeaker, platform: msgObj.platform, date: msgObj.date };
  }, [seed, questionIndex, rawChatData]);

  const nextQuestion = () => {
    setQuestionIndex(i => i + 1);
    setGameState("playing");
  };

  const handleGuess = (guess) => {
    if (gameState !== "playing") return;
    if (guess === currentQuestion?.answer) {
      setGameState("correct");
      setScore(s => s + 1);
      setStreak(s => s + 1);
      setTimeout(nextQuestion, 1000);
    } else {
      setGameState("wrong");
      setStreak(0);
      setTimeout(nextQuestion, 1500);
    }
  };

  const newGame = () => {
    if (updateSession) {
      updateSession({ gameData: { ...session.gameData, quizSeed: Date.now() } });
    }
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setGameState("playing");
  };

  const getButtonColor = (speakerKey) => {
    if (gameState === "playing") return "bg-[var(--sub-color)] hover:bg-[var(--text-color)] text-[var(--bg-color)]";
    if (gameState === "correct") return speakerKey === currentQuestion?.answer ? "bg-[var(--main-color)] text-[var(--bg-color)] scale-110" : "opacity-20";
    if (gameState === "wrong") return speakerKey === currentQuestion?.answer ? "bg-[var(--main-color)] text-[var(--bg-color)]" : "bg-[var(--error-color)] text-white";
  };

  const formatName = (name) => name ? name.toLowerCase() : "???";

  const partner = Object.values(otherUsers).find(u => u.status === 'quiz');

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-[var(--main-color)] text-xl animate-pulse">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] px-4">
      {partner && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}
          />
          <span style={{ color: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}>
            {partner.role === 'princess' ? 'She' : 'He'}'s playing too!
          </span>
        </div>
      )}

      {/* Score */}
      <div className="flex gap-6 md:gap-12 text-xl md:text-2xl font-bold mb-8 md:mb-16" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="flex flex-col items-center"><span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--sub-color)', textTransform: 'uppercase' }}>Score</span><span className="text-[var(--text-color)]">{score}</span></div>
        <div className="flex flex-col items-center"><span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--sub-color)', textTransform: 'uppercase' }}>Streak</span><span style={{ color: streak > 2 ? 'var(--main-color)' : 'var(--text-color)' }}>{streak}</span></div>
        <button
          onClick={newGame}
          style={{ fontSize: 14, padding: '8px 18px', background: 'var(--sub-color)', color: 'var(--bg-color)', border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
        >
          new game
        </button>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.text}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)', padding: '40px 44px',
            boxShadow: '0 3px 12px var(--shadow-color)',
            fontFamily: 'var(--font-mono)', fontSize: 'clamp(18px, 4vw, 26px)',
            textAlign: 'center', lineHeight: 1.8, color: 'var(--text-on-card)',
            maxWidth: 640, marginBottom: 36,
          }}
        >
          "{currentQuestion?.text}"
        </motion.div>
      </AnimatePresence>

      {/* Answer buttons */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full justify-center px-4">
        {['p1', 'p2'].map((key, i) => (
          <button key={key} onClick={() => handleGuess(key)} style={{
            padding: '20px 40px', borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-color)',
            background: gameState === 'playing' ? 'var(--bg-card)' : (key === currentQuestion?.answer ? 'var(--main-color)' : (gameState === 'wrong' ? 'var(--error-color)' : 'var(--bg-secondary)')),
            color: gameState !== 'playing' && key === currentQuestion?.answer ? 'var(--bg-color)' : (gameState === 'wrong' && key !== currentQuestion?.answer ? '#fff' : 'var(--text-on-card)'),
            fontSize: 22, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-handwritten)',
            transform: `rotate(${i === 0 ? '-1.5' : '1.2'}deg)`,
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px var(--shadow-color)',
            opacity: gameState !== 'playing' && key !== currentQuestion?.answer && gameState === 'correct' ? 0.3 : 1,
          }}>
            {formatName(speakerNames[key])}
          </button>
        ))}
      </div>

      {/* Result */}
      <div className="h-8 mt-12 font-bold text-xl">
        {gameState === "correct" && <span className="animate-stamp-press" style={{ color: 'var(--success-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22 }}>Correct!</span>}
        {gameState === "wrong" && <span style={{ color: 'var(--error-color)', fontFamily: 'var(--font-handwritten)', fontSize: 22 }}>Nope! It was {formatName(speakerNames[currentQuestion?.answer])}</span>}
      </div>

      {/* Platform + date (shown after answer) */}
      {gameState !== "playing" && currentQuestion?.platform && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--sub-color)', fontFamily: 'var(--font-mono)',
          }}
        >
          <PlatformIcon platform={currentQuestion.platform} size={13} />
          <span>{PLATFORMS[currentQuestion.platform]?.label}</span>
          {currentQuestion.date && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ opacity: 0.6 }}>{typeof currentQuestion.date === 'object' ? currentQuestion.date?.raw || '' : currentQuestion.date}</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
