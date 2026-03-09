import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakerNames } from "./words";
import { loadBossMode as loadBossModeData, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

const MIN_PARAGRAPH_LENGTH = 200; // Show long paragraphs (>=200 chars, >=30 words)

export default function BossMode({ otherUsers = {}, session = {}, updateSession }) {
  const [bossIndex, setBossIndex] = useState(0);
  const [bossModeData, setBossModeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    loadBossModeData()
      .then(data => {
        const longMessages = (data || []).filter(m => m.text && m.text.length >= MIN_PARAGRAPH_LENGTH);
        setBossModeData(longMessages);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load paragraph data:', err);
        setIsLoading(false);
      });
  }, []);

  const currentParagraph = useMemo(() => {
    if (!bossModeData || bossModeData.length === 0) return null;
    const seed = (session.gameData?.bossSeed || Date.now()) + bossIndex;
    const idx = Math.floor(seededRandom(seed) * bossModeData.length);
    return bossModeData[idx];
  }, [session.gameData?.bossSeed, bossIndex, bossModeData]);

  const nextParagraph = () => {
    if (updateSession) {
      updateSession({ gameData: { ...session.gameData, bossSeed: Date.now() } });
    }
    setBossIndex(i => i + 1);
    setReadCount(c => c + 1);
  };

  useEffect(() => {
    if (!session.gameData?.bossSeed && !isLoading && bossModeData.length > 0) nextParagraph();
  }, [isLoading, bossModeData]);

  const formatName = (key) => speakerNames[key] ? speakerNames[key].toLowerCase() : "???";

  const partner = Object.values(otherUsers).find(u => u.status === 'boss');

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl flex flex-col items-center justify-center min-h-[400px]">
        <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Loading paragraphs...</div>
      </div>
    );
  }

  if (!currentParagraph) return (
    <div style={{
      textAlign: 'center', marginTop: 80, color: 'var(--sub-color)',
      fontFamily: 'var(--font-handwritten)', fontSize: 18,
    }}>
      No long paragraphs found! Write more essays to each other. 📝
    </div>
  );

  const wordCount = currentParagraph.text.split(/\s+/).length;
  const dateStr = typeof currentParagraph.date === 'object' ? currentParagraph.date?.raw || '' : (currentParagraph.date || '');

  return (
    <div style={{
      width: '100%', maxWidth: 760, margin: '0 auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: 400, padding: '0 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {partner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: 'var(--text-dim)', marginBottom: 14,
          fontFamily: 'var(--font-handwritten)',
        }}>
          <div className="animate-pulse" style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)',
          }} />
          <span style={{ color: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}>
            {partner.role === 'princess' ? 'She' : 'He'}'s reading with you!
          </span>
        </div>
      )}

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
          color: 'var(--main-color)', margin: 0, fontStyle: 'italic',
        }}>
          Paragraphs
        </h2>
        <p style={{
          fontSize: 15, color: 'var(--sub-color)', marginTop: 6,
          fontFamily: 'var(--font-handwritten)',
        }}>
          relive your longest messages
          {readCount > 0 && <span style={{ color: 'var(--main-color)', marginLeft: 8 }}>· {readCount} read</span>}
        </p>
      </div>

      {/* Paragraph container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentParagraph.text}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)',
            padding: 32,
            boxShadow: '0 4px 16px var(--shadow-color)',
            position: 'relative', width: '100%',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 29px, var(--border-color) 29px, var(--border-color) 30px)',
            backgroundSize: '100% 30px',
            backgroundPosition: '0 56px',
          }}
        >
          {/* Word count badge */}
          <div style={{
            position: 'absolute', top: -14, left: 18,
            background: 'var(--main-color)', color: 'var(--bg-color)',
            fontSize: 13, fontWeight: 700, padding: '6px 16px',
            borderRadius: 'var(--radius-card)',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            {wordCount} words
          </div>

          <div style={{
            marginTop: 20, marginBottom: 24,
            fontSize: 17, lineHeight: 1.8,
            color: 'var(--text-on-card)', fontWeight: 400,
            whiteSpace: 'pre-wrap',
            maxHeight: 400, overflowY: 'auto',
            fontFamily: 'var(--font-body)',
          }} className="no-scrollbar">
            {currentParagraph.text}
          </div>

          <div className="torn-paper-divider" style={{ margin: '0 0 14px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-dim-card)' }}>
              <span style={{
                fontWeight: 400, color: 'var(--main-color)',
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
              }}>
                {formatName(currentParagraph.speaker)}
              </span>
              <span style={{ opacity: 0.3, margin: '0 8px' }}>|</span>
              <span style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {dateStr || "Unknown Date"}
              </span>
              {currentParagraph.platform && (
                <>
                  <span style={{ opacity: 0.3, margin: '0 8px' }}>|</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <PlatformIcon platform={currentParagraph.platform} size={13} /> {PLATFORMS[currentParagraph.platform]?.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <div style={{ marginTop: 28 }}>
        <button
          onClick={nextParagraph}
          style={{
            padding: '16px 48px', background: 'var(--main-color)', color: 'var(--bg-color)',
            border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
            boxShadow: '0 2px 8px var(--shadow-color)', transition: 'all 0.2s',
          }}
        >
          Next Paragraph →
        </button>
      </div>

      {/* Stats */}
      <div style={{
        marginTop: 18, fontSize: 13, color: 'var(--sub-color)',
        fontFamily: 'var(--font-mono)', textAlign: 'center',
      }}>
        {bossModeData.length} long paragraphs available (≥{MIN_PARAGRAPH_LENGTH} chars, ≥30 words)
      </div>
    </div>
  );
}
