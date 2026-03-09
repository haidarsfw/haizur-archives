import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakerNames } from "./words";
import { loadRawChatData, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function FinishSentence({ otherUsers = {}, session = {}, updateSession }) {
  const [gameState, setGameState] = useState("playing");
  const [score, setScore] = useState(0);
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
        console.error('Failed to load chat data:', err);
        setIsLoading(false);
      });
  }, []);

  const seed = session.gameData?.finishSeed || Date.now();

  const { question, options } = useMemo(() => {
    if (!rawChatData) return { question: null, options: [] };
    const localSeed = seed + questionIndex;
    const speakerKey = seededRandom(localSeed) > 0.5 ? 'p1' : 'p2';
    const messages = rawChatData[speakerKey];
    if (!messages || messages.length === 0) return { question: null, options: [] };

    let validMsg = null;
    let attempts = 0;
    while (!validMsg && attempts < 50) {
      const idx = Math.floor(seededRandom(localSeed + attempts) * messages.length);
      const r = messages[idx];
      if (r && r.text.split(' ').length >= 6) validMsg = r;
      attempts++;
    }
    if (!validMsg) return { question: null, options: [] };

    const words = validMsg.text.split(' ');
    const cutPoint = Math.max(2, Math.floor(words.length * 0.6));
    const startText = words.slice(0, cutPoint).join(' ');
    const endText = words.slice(cutPoint).join(' ');

    const decoys = [];
    let decoyAttempt = 0;
    while (decoys.length < 3 && decoyAttempt < 20) {
      const idx = Math.floor(seededRandom(localSeed + 100 + decoyAttempt) * messages.length);
      const r = messages[idx];
      if (r) {
        const rWords = r.text.split(' ');
        const rEnd = rWords.slice(Math.floor(rWords.length * 0.5)).join(' ');
        if (rEnd !== endText && rEnd.length > 3 && !decoys.includes(rEnd)) decoys.push(rEnd);
      }
      decoyAttempt++;
    }

    const allOptions = [...decoys, endText];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(localSeed + 200 + i) * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }

    return { question: { speaker: speakerKey, start: startText, answer: endText, platform: validMsg.platform, date: validMsg.date }, options: allOptions };
  }, [seed, questionIndex, rawChatData]);

  const nextQuestion = () => { setQuestionIndex(i => i + 1); setGameState("playing"); };

  const handleGuess = (opt) => {
    if (gameState !== "playing") return;
    if (opt === question?.answer) {
      setGameState("correct");
      setScore(s => s + 1);
      setTimeout(nextQuestion, 1500);
    } else {
      setGameState("wrong");
      setTimeout(nextQuestion, 2000);
    }
  };

  const newGame = () => {
    if (updateSession) {
      updateSession({ gameData: { ...session.gameData, finishSeed: Date.now() } });
    }
    setQuestionIndex(0);
    setScore(0);
    setGameState("playing");
  };

  const formatName = (key) => speakerNames[key] ? speakerNames[key].toLowerCase() : "???";

  const partner = Object.values(otherUsers).find(u => u.status === 'finish');

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-[var(--main-color)] text-xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  if (!question) return <div>Loading...</div>;

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

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--sub-color)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
        <span>Score: {score}</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>Finish for <span style={{ color: 'var(--main-color)' }}>{formatName(question.speaker)}</span></span>
        {question.platform && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <PlatformIcon platform={question.platform} size={13} /> {PLATFORMS[question.platform]?.label}
          </span>
        )}
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
          key={question.start}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 'clamp(18px, 4vw, 26px)',
            textAlign: 'center', color: 'var(--text-on-card)', marginBottom: 36,
            padding: '28px 32px',
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)',
            boxShadow: '0 3px 12px var(--shadow-color)',
            lineHeight: 1.6,
          }}
        >
          "{question.start}..."
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {options.map((opt, idx) => {
          const rotations = [-1.5, 1.2, -0.8, 1.8];
          const isCorrect = opt === question.answer;
          return (
            <button
              key={idx}
              onClick={() => handleGuess(opt)}
              disabled={gameState !== "playing"}
              style={{
                padding: '20px 24px', textAlign: 'left',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-color)',
                background: gameState === 'playing' ? 'var(--bg-card)' : (isCorrect ? 'var(--main-color)' : 'var(--bg-secondary)'),
                color: gameState !== 'playing' && isCorrect ? 'var(--bg-color)' : (gameState === 'playing' ? 'var(--text-on-card)' : 'var(--text-color)'),
                fontSize: 17, fontWeight: 500, cursor: gameState === 'playing' ? 'pointer' : 'default',
                fontFamily: 'var(--font-handwritten)',
                transform: `rotate(${rotations[idx]}deg)`,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px var(--shadow-color)',
                opacity: gameState === 'wrong' && !isCorrect ? 0.3 : 1,
              }}
            >
              ...{opt}
            </button>
          );
        })}
      </div>

      <div className="h-8 mt-8 font-bold text-xl">
        {gameState === "correct" && <span className="animate-stamp-press" style={{ color: 'var(--success-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22 }}>Correct!</span>}
        {gameState === "wrong" && <span style={{ color: 'var(--error-color)', fontFamily: 'var(--font-handwritten)', fontSize: 20 }}>Wrong! It was "...{question.answer}"</span>}
      </div>
    </div>
  );
}
