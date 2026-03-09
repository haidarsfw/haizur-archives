import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { loadFullHistoryRaw, SPEAKERS, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";
import MediaRenderer from "./MediaRenderer";

export default function TimeCapsule() {
  const [memories, setMemories] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const options = { month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    loadFullHistoryRaw()
      .then(fullHistory => {
        if (!fullHistory) { setIsLoading(false); return; }

        const found = fullHistory.filter(msg => {
          if (!msg.date || !msg.date.raw) return false;
          return msg.date.raw.endsWith(`-${month}-${day}`);
        });

        setMemories(found);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load time capsule data:', err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <div style={{ color: 'var(--main-color)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Calendar header */}
      <div style={{
        textAlign: 'center', padding: '20px 24px 24px', flexShrink: 0,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: -8, left: 0, right: 0, height: 8,
          background: 'var(--bg-card)',
          clipPath: 'polygon(0% 0%, 3% 60%, 6% 20%, 9% 70%, 12% 10%, 16% 80%, 19% 30%, 22% 90%, 25% 0%, 28% 60%, 32% 25%, 35% 85%, 38% 15%, 42% 70%, 45% 5%, 48% 55%, 52% 20%, 55% 75%, 58% 10%, 62% 65%, 65% 30%, 68% 80%, 72% 5%, 75% 60%, 78% 25%, 82% 75%, 85% 15%, 88% 65%, 92% 10%, 95% 55%, 98% 20%, 100% 0%, 100% 100%, 0% 100%)',
          zIndex: 1,
        }} />
        <div style={{
          fontSize: 13, color: 'var(--text-dim-card)', textTransform: 'uppercase',
          letterSpacing: '0.14em', fontWeight: 400, marginBottom: 8,
          fontFamily: 'var(--font-mono)',
        }}>
          On This Day
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--text-on-card)', margin: 0,
        }}>
          {currentDate}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-dim-card)', marginTop: 8, fontFamily: 'var(--font-handwritten)' }}>
          {memories.length > 0
            ? `${memories.length} messages from the past`
            : 'No messages found for today'
          }
        </p>
      </div>

      {/* Messages */}
      <div className="thread-line" style={{
        flex: 1, overflowY: 'auto', padding: '24px 20px 80px 32px',
      }}>
        {memories.map((msg, idx) => {
          const isP1 = msg.speaker === 'p1';
          const prevMsg = memories[idx - 1];
          const showSpeaker = !prevMsg || prevMsg.speaker !== msg.speaker;
          const platformInfo = PLATFORMS[msg.platform];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className="thread-pin"
              style={{
                marginBottom: showSpeaker ? 14 : 5,
                padding: '10px 16px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              {showSpeaker && (
                <div style={{
                  fontSize: 13, color: 'var(--text-dim)', marginBottom: 5,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--font-mono)',
                }}>
                  <span>{SPEAKERS[msg.speaker]?.name}</span>
                  {platformInfo && (
                    <PlatformIcon platform={msg.platform} size={13} />
                  )}
                </div>
              )}
              <MediaRenderer message={msg} />
              <div style={{
                fontSize: 16, lineHeight: 1.6, wordBreak: 'break-word',
                color: 'var(--text-color)',
                fontFamily: isP1 ? 'var(--font-body)' : 'var(--font-handwritten)',
                fontWeight: isP1 ? 400 : 400,
              }}>
                {msg.type === 'text' || !msg.type ? msg.text : (!msg.mediaPath && msg.text ? msg.text : null)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
