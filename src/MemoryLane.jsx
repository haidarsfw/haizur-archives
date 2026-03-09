import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakerNames } from "./words";
import { loadHistoryByDate, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";
import MediaRenderer from "./MediaRenderer";

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default function MemoryLane({ otherUsers = {}, session = {}, updateSession }) {
  const scrollRef = useRef(null);
  const [historyByDate, setHistoryByDate] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistoryByDate()
      .then(data => {
        setHistoryByDate(data || {});
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load history data:', err);
        setIsLoading(false);
      });
  }, []);

  const seed = session.gameData?.memorySeed || Date.now();

  const { currentDate, messages } = useMemo(() => {
    const dates = Object.keys(historyByDate);
    if (dates.length === 0) return { currentDate: null, messages: [] };
    const randomIndex = Math.floor(seededRandom(seed) * dates.length);
    const date = dates[randomIndex];
    const daysMessages = historyByDate[date];
    if (daysMessages.length < 5 && dates.length > 1) {
      const retryIndex = Math.floor(seededRandom(seed + 1) * dates.length);
      const retryDate = dates[retryIndex];
      return { currentDate: retryDate, messages: historyByDate[retryDate] };
    }
    return { currentDate: date, messages: daysMessages };
  }, [seed, historyByDate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [currentDate]);

  const pickRandomDate = () => {
    if (updateSession) {
      updateSession({ gameData: { ...session.gameData, memorySeed: Date.now() } });
    }
  };

  const formatName = (key) => speakerNames[key] ? speakerNames[key].toLowerCase() : "???";

  const partner = Object.values(otherUsers).find(u => u.status === 'memory');

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl flex flex-col items-center justify-center h-[500px]">
        <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Loading memories...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col items-center h-[500px] md:h-[600px] max-h-[70vh] md:max-h-[80vh] px-2 md:px-0">

      {partner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: 'var(--text-dim)', marginBottom: 14,
          fontFamily: 'var(--font-handwritten)',
        }}>
          <div
            className="animate-pulse"
            style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)',
            }}
          />
          <span style={{ color: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}>
            {partner.role === 'princess' ? 'She' : 'He'}'s reading with you
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '8px 12px',
        width: '100%', maxWidth: 680, marginBottom: 18, padding: '0 10px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize: 13, color: 'var(--sub-color-light)', textTransform: 'uppercase',
            letterSpacing: '0.14em', fontFamily: 'var(--font-mono)', fontWeight: 400,
          }}>
            Time Travel
          </span>
          <span style={{
            fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 400, color: 'var(--main-color)',
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentDate || "Loading..."}
          </span>
        </div>
        <button
          onClick={pickRandomDate}
          style={{
            padding: '10px 20px', background: 'var(--sub-color)', color: 'var(--bg-color)',
            border: 'none', borderRadius: 'var(--radius-card)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          Random
        </button>
      </div>

      <div className="torn-paper-divider" style={{ width: '100%', maxWidth: 680, marginBottom: 10 }} />

      {/* Chat container */}
      <div
        ref={scrollRef}
        className="thread-line no-scrollbar"
        style={{
          width: '100%', maxWidth: 680, flexGrow: 1, overflowY: 'auto',
          padding: 'clamp(16px, 3vw, 24px) clamp(12px, 3vw, 20px) 80px clamp(16px, 4vw, 32px)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 10px var(--shadow-color)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {messages.map((msg, idx) => {
            const isP1 = msg.speaker === 'p1';
            const prevMsg = messages[idx - 1];
            const showSpeaker = !prevMsg || prevMsg.speaker !== msg.speaker;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.01, 1) }}
                className="thread-pin"
                style={{
                  marginBottom: showSpeaker ? 12 : 4,
                  padding: '10px 16px',
                  background: isP1 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px var(--shadow-color)',
                  transform: `rotate(${isP1 ? '0.2' : '-0.3'}deg)`,
                }}
              >
                {showSpeaker && (
                  <div style={{
                    fontSize: 13, color: 'var(--text-dim-card)', marginBottom: 5,
                    fontFamily: 'var(--font-mono)',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 5px',
                  }}>
                    <span style={{ color: isP1 ? 'var(--main-color)' : 'var(--sub-color)' }}>
                      {formatName(msg.speaker)}
                    </span>
                    {msg.platform && (
                      <PlatformIcon platform={msg.platform} size={13} />
                    )}
                    {msg.time && (
                      <span style={{ opacity: 0.4, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {msg.time?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                )}
                <MediaRenderer message={msg} />
                <div style={{
                  fontSize: 'clamp(14px, 2.5vw, 16px)', lineHeight: 1.6, wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  color: 'var(--text-on-card)',
                  fontFamily: isP1 ? 'var(--font-body)' : 'var(--font-handwritten)',
                  fontWeight: isP1 ? 400 : 400,
                }}>
                  {msg.type === 'text' || !msg.type ? msg.text : (!msg.mediaPath && msg.text ? msg.text : null)}
                </div>
              </motion.div>
            );
          })}

          <div style={{
            textAlign: 'center', fontSize: 15, color: 'var(--text-dim-card)',
            marginTop: 36, marginBottom: 16,
            fontFamily: 'var(--font-handwritten)', fontWeight: 400,
            transform: 'rotate(-1deg)',
          }}>
            — end of {currentDate} —
          </div>
        </div>
      </div>
    </div>
  );
}
