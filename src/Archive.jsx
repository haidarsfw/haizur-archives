import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { speakerNames } from "./words";
import { loadFullHistory } from "./dataLoader";
import ErrorState from "./ErrorState";

export default function Archive({ theme, otherUsers = {} }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [fullHistory, setFullHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadFullHistory()
      .then(data => {
        setFullHistory(data || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load archive data:', err);
        setLoadError('Failed to load archive data. Please try again.');
        setIsLoading(false);
      });
  }, []);

  const partner = Object.values(otherUsers).find(u => u.status === 'archive');

  const [searchError, setSearchError] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchError(null);
    if (!query.trim()) return;
    if (!fullHistory) {
      setSearchError("Archive data is still loading. Please wait a moment.");
      return;
    }
    const found = fullHistory.filter(msg => msg.text && msg.text.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
    setResults(found);
    setHasSearched(true);
  };

  const formatName = (key) => speakerNames[key] ? speakerNames[key].toLowerCase() : "???";

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[500px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <div className="animate-pulse" style={{
            color: 'var(--main-color)', fontFamily: 'var(--font-display)',
            fontStyle: 'italic', fontSize: 18,
          }}>
            Loading archive...
          </div>
          <div style={{
            width: 120, height: 3, borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)', overflow: 'hidden',
          }}>
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              style={{
                width: '50%', height: '100%',
                background: 'var(--main-color)', borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[500px]">
        <ErrorState
          title="Couldn't load archive"
          description={loadError}
          onRetry={() => {
            setLoadError(null);
            setIsLoading(true);
            loadFullHistory()
              .then(data => { setFullHistory(data || []); setIsLoading(false); })
              .catch(() => { setLoadError('Failed to load archive data. Please try again.'); setIsLoading(false); });
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', maxWidth: 'var(--width-content)', margin: '0 auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: 500, padding: '0 20px',
      fontFamily: 'var(--font-body)',
    }}>
      {partner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: 'var(--text-dim)', marginBottom: 18,
          fontFamily: 'var(--font-handwritten)',
        }}>
          <div className="animate-pulse" style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)',
          }} />
          <span style={{ color: partner.role === 'princess' ? 'var(--partner-princess)' : 'var(--partner-prince)' }}>
            {partner.role === 'princess' ? 'She' : 'He'}'s searching too!
          </span>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: 560, marginBottom: 28, marginTop: 14 }}>
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="search memory..."
          style={{
            width: '100%', padding: '16px 20px',
            border: 'none', borderBottom: '2px solid var(--sub-color)',
            background: 'transparent', color: 'var(--text-color)',
            fontSize: 20, outline: 'none',
            fontFamily: 'var(--font-mono)',
            transition: 'border-color 0.2s',
          }}
          autoFocus
        />
      </form>

      {/* Inline search error (replaces alert) */}
      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%', maxWidth: 560, marginBottom: 16,
            padding: '10px 16px', borderRadius: 'var(--radius-card)',
            background: 'var(--bg-card)', border: '1px solid var(--main-color)',
            color: 'var(--main-color)', fontSize: 14,
            fontFamily: 'var(--font-mono)', textAlign: 'center',
          }}
        >
          {searchError}
        </motion.div>
      )}

      {/* Results */}
      <div style={{ width: '100%', flexGrow: 1, overflowY: 'auto', paddingBottom: 80 }} className="no-scrollbar">
        {hasSearched && results.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--sub-color)', marginTop: 40,
            fontFamily: 'var(--font-handwritten)', fontSize: 20,
            transform: 'rotate(-1deg)',
          }}>
            no memories found for "{query}"
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((msg, idx) => {
            const isP1 = msg.speaker === 'p1';
            const rotations = [-0.4, 0.3, -0.2, 0.5, -0.3, 0.2, -0.5, 0.4];

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                style={{
                  padding: '14px 18px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 5px var(--shadow-color)',
                  transform: `rotate(${rotations[idx % rotations.length]}deg)`,
                }}
              >
                <div style={{
                  fontSize: 13, color: 'var(--text-dim-card)', marginBottom: 5,
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color: isP1 ? 'var(--main-color)' : 'var(--sub-color)' }}>
                    {formatName(msg.speaker)}
                  </span>
                </div>
                <div style={{
                  fontSize: 16, lineHeight: 1.6, wordBreak: 'break-word',
                  color: 'var(--text-on-card)',
                  fontFamily: isP1 ? 'var(--font-body)' : 'var(--font-handwritten)',
                  fontWeight: isP1 ? 400 : 400,
                }}>
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
