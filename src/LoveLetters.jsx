import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LETTERS = [
  { id: 1, req: 10, title: "noob km", body: "ayoo pasti km bisa" },
  { id: 2, req: 30, title: "wow dik", body: "jujurly masih pelan sih tp aku sayang km bgt zura" },
  { id: 3, req: 50, title: "WHOAA", body: "km ngecit ya princess kok jago" },
  { id: 4, req: 70, title: "HAAH?!", body: "km kacau bgt sih sayang aku love km forever SAYAAAAAAAAAAAAANG" },
  { id: 5, req: 100, title: "GODLIKE", body: "100 WPM?! STOP! You're too powerful! Marry me right now." },
];

export default function LoveLetters({ otherUsers = {} }) {
  const [highScore, setHighScore] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const closeButtonRef = useRef(null);

  const partner = Object.values(otherUsers).find(u => u.status === 'letters');

  useEffect(() => {
    const saved = localStorage.getItem("haizur_highscore") || 0;
    setHighScore(parseInt(saved));
  }, []);

  // Focus the close button when modal opens
  useEffect(() => {
    if (selectedLetter && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [selectedLetter]);

  // Close modal on Escape key
  const handleModalKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSelectedLetter(null);
    }
    // Trap focus within modal
    if (e.key === 'Tab' && closeButtonRef.current) {
      e.preventDefault();
      closeButtonRef.current.focus();
    }
  }, []);

  return (
    <div style={{
      width: '100%', maxWidth: 'var(--width-narrow)', margin: '0 auto', padding: '0 24px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {partner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: 'var(--text-dim)', marginBottom: 18, justifyContent: 'center',
          fontFamily: 'var(--font-handwritten)',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--main-color)' }} className="animate-pulse" />
          Reading letters together
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          fontSize: 13, color: 'var(--sub-color-light)', textTransform: 'uppercase',
          letterSpacing: '0.14em', fontWeight: 400, marginBottom: 10,
          fontFamily: 'var(--font-mono)',
        }}>
          Secret Stash
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--text-color)', margin: 0,
        }}>
          Love Notes
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', marginTop: 10, fontFamily: 'var(--font-handwritten)' }}>
          Best: <span style={{ color: 'var(--main-color)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{highScore} WPM</span>
        </p>
      </div>

      {/* Letter list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {LETTERS.map((letter, idx) => {
          const isUnlocked = highScore >= letter.req;
          const rotations = [-0.8, 0.5, -0.3, 0.7, -0.5];

          return (
            <motion.button
              key={letter.id}
              whileHover={isUnlocked ? { x: 4, rotate: 0 } : {}}
              whileTap={isUnlocked ? { scale: 0.98 } : {}}
              onClick={() => isUnlocked && setSelectedLetter(letter)}
              style={{
                display: 'flex', alignItems: 'center', gap: 18,
                padding: '22px 24px', borderRadius: 'var(--radius-card)',
                border: '1px solid',
                borderColor: isUnlocked ? 'var(--main-color)' : 'var(--border-color)',
                background: isUnlocked ? 'var(--bg-card)' : 'var(--bg-secondary)',
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                opacity: isUnlocked ? 1 : 0.5,
                textAlign: 'left', transition: 'all 0.2s',
                transform: `rotate(${rotations[idx]}deg)`,
                boxShadow: isUnlocked ? '0 2px 8px var(--shadow-color)' : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: isUnlocked
                  ? 'radial-gradient(circle at 35% 35%, var(--main-color), var(--wax-seal-color, var(--main-color)))'
                  : 'var(--sub-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: isUnlocked ? 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)' : 'none',
                flexShrink: 0,
              }}>
                {isUnlocked ? '💌' : '🔒'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 17, fontWeight: 600,
                  color: isUnlocked ? 'var(--text-on-card)' : 'var(--sub-color)',
                  fontFamily: isUnlocked ? 'var(--font-handwritten)' : 'var(--font-body)',
                }}>
                  {isUnlocked ? letter.title : 'Locked'}
                </div>
                {!isUnlocked && (
                  <div style={{
                    fontSize: 14, color: 'var(--sub-color)', marginTop: 3,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Requires {letter.req} WPM
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--sub-color-light)',
              }}>
                {letter.req} wpm
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Reading Modal */}
      <AnimatePresence>
        {selectedLetter && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selectedLetter?.title || 'Love letter'}
            onKeyDown={handleModalKeyDown}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
              padding: 20,
            }}
            onClick={() => setSelectedLetter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              style={{
                padding: '48px 36px', maxWidth: 420, width: '100%',
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px solid var(--main-color)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 8px 36px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Wax seal */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
                background: 'radial-gradient(circle at 35% 35%, var(--main-color), var(--wax-seal-color, var(--main-color)))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
              }}>
                💌
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--main-color)', margin: '0 0 18px',
              }}>
                {selectedLetter.title}
              </h3>
              <p style={{
                fontSize: 18, lineHeight: 1.8, color: 'var(--text-on-card)',
                fontFamily: 'var(--font-handwritten)', fontWeight: 400,
                margin: 0,
              }}>
                "{selectedLetter.body}"
              </p>
              <button
                ref={closeButtonRef}
                onClick={() => setSelectedLetter(null)}
                style={{
                  marginTop: 32, width: '100%', padding: '14px 28px',
                  background: 'var(--main-color)', color: 'var(--bg-color)',
                  border: 'none', borderRadius: 'var(--radius-card)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
