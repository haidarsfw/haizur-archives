import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const getModeName = (code) => {
  const map = {
    typing: "Type Ours", quiz: "Who?", archive: "Archive", memory: "Rewind",
    finish: "Complete Us", stats: "Word War", sky: "Late Nights", boss: "Paragraphs", letters: "Love Notes",
    'chat-browser': "Browse", museum: "Museum", 'platform-quiz': "Where?", 'time-capsule': "On This Day"
  };
  return map[code] || "Menu";
};

export default function LiveCursor({ users = {} }) {
  const userList = Object.keys(users || {});
  const isSheOnline = userList.length > 0;

  const partner = userList.length > 0 ? users[userList[0]] : null;

  return (
    <>
      {/* Status badge */}
      {isSheOnline ? (
        <div className="fixed bottom-4 left-4 z-50" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 2px 8px var(--shadow-color)',
          transform: 'rotate(-1deg)',
          position: 'relative',
        }}>
          {/* Tape strip at top */}
          <div style={{
            position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%) rotate(1deg)',
            width: 40, height: 10,
            background: 'var(--tape-color, rgba(212, 160, 84, 0.5))',
            borderRadius: 1, opacity: 0.8,
          }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--success-color)',
            }} />
            <div className="animate-pulse" style={{
              position: 'absolute', inset: -1,
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--success-color)', opacity: 0.4,
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-dim-card)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontFamily: 'var(--font-mono)',
            }}>
              Online
            </span>
            <span style={{
              fontSize: 14, fontWeight: 400, color: 'var(--text-on-card)',
              fontFamily: 'var(--font-handwritten)',
            }}>
              {partner?.role === 'princess'
                ? `Princess is in ${getModeName(partner.status)}`
                : `My Prince is in ${getModeName(partner.status)}`}
            </span>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-4 left-4 z-50" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: 0.3,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--sub-color)',
          }} />
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', textTransform: 'lowercase',
          }}>
            offline
          </span>
        </div>
      )}

      {/* Ghost cursors */}
      <AnimatePresence>
        {userList.map((userId) => {
            const user = users[userId];
            const isPrincess = user.role === 'princess';
            const label = isPrincess ? "Princess" : "My Prince";
            const color = isPrincess ? "var(--partner-princess)" : "var(--partner-prince)";

            return (
            <motion.div
                key={userId}
                className="fixed z-50 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ left: `${user.x}%`, top: `${user.y}%`, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "tween", ease: "linear", duration: 0.1 }}
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="transform -translate-x-1 -translate-y-1" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}>
                    <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.4818 12.3673H5.65376Z" fill={color} stroke="white" strokeWidth="1.5" />
                </svg>
                <div style={{
                    position: 'absolute', left: 18, top: 18,
                    padding: '4px 10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-card)',
                    fontSize: 11, fontWeight: 600,
                    fontFamily: 'var(--font-handwritten)',
                    color: 'var(--text-on-card)',
                    boxShadow: '0 1px 3px var(--shadow-color)',
                    whiteSpace: 'nowrap',
                    transform: 'rotate(1deg)',
                    display: 'flex', flexDirection: 'column', gap: 1,
                    borderLeft: `2px solid ${color}`,
                }}>
                    <span>{label}</span>
                    <span style={{
                      opacity: 0.6, fontSize: 9,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{getModeName(user.status)}</span>
                </div>
            </motion.div>
            );
        })}
      </AnimatePresence>
    </>
  );
}
