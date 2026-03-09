import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadNightSkyData, SPEAKERS, PLATFORMS } from "./dataLoader";
import PlatformIcon from "./PlatformIcons";

// Shooting star component
function ShootingStar() {
  const [key, setKey] = useState(0);
  const [pos, setPos] = useState({ x: 20, y: 10 });

  useEffect(() => {
    const interval = setInterval(() => {
      setPos({ x: Math.random() * 80 + 10, y: Math.random() * 30 + 5 });
      setKey(k => k + 1);
    }, 4000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key={key}
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], x: 120, y: 60 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: 2,
        height: 2,
        background: '#fff',
        borderRadius: '50%',
        boxShadow: '0 0 6px 2px rgba(255,255,255,0.6), -20px 0 12px rgba(255,255,255,0.3), -40px 0 8px rgba(255,255,255,0.1)',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  );
}

// Moon component (crescent)
function Moon() {
  return (
    <div style={{
      position: 'absolute',
      top: '8%',
      right: '12%',
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 65% 40%, #ffeedd 0%, #e8d5b8 40%, rgba(232,213,184,0.3) 70%, transparent 100%)',
      boxShadow: '0 0 40px rgba(255,238,221,0.15), 0 0 80px rgba(255,238,221,0.08)',
      zIndex: 3,
      pointerEvents: 'none',
    }}>
      {/* Inner shadow to create crescent effect */}
      <div style={{
        position: 'absolute',
        top: -8,
        left: 12,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: '#0a0e1e',
        boxShadow: '0 0 20px rgba(10,14,30,0.5)',
      }} />
    </div>
  );
}

// Static background stars (distant, small, many) — pure CSS animations for performance
function BackgroundStars() {
  const stars = useRef(
    Array.from({ length: 120 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      maxOpacity: Math.random() * 0.5 + 0.2,
      minOpacity: (Math.random() * 0.5 + 0.2) * 0.4,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
    }))
  ).current;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      {stars.map((star, i) => (
        <div
          key={i}
          className="bg-star-twinkle"
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#fff',
            '--star-max': star.maxOpacity,
            '--star-min': star.minOpacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

const STAR_RENDER_LIMIT = 250;

function sampleStars(data) {
  const starColors = [
    '#fff', '#fff', '#fff', '#ffeedd', '#ddeeff',
    '#ffddcc', '#ffd700', '#c8e6ff', '#ffe4f0',
  ];
  // Shuffle and take up to STAR_RENDER_LIMIT
  const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, STAR_RENDER_LIMIT);
  return shuffled.map((msg) => ({
    ...msg,
    x: Math.random() * 88 + 6,
    y: Math.random() * 75 + 15,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 4,
    color: starColors[Math.floor(Math.random() * starColors.length)],
    glow: Math.random() > 0.7,
  }));
}

export default function NightSky({ otherUsers = {} }) {
  const [hoveredStar, setHoveredStar] = useState(null);
  const [nightSkyData, setNightSkyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stars, setStars] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    loadNightSkyData()
      .then(data => {
        const d = data || [];
        setNightSkyData(d);
        setTotalCount(d.length);
        setStars(sampleStars(d));
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load night sky data:', err);
        setIsLoading(false);
      });
  }, []);

  const shuffleStars = () => {
    if (nightSkyData.length > 0) {
      setHoveredStar(null);
      setStars(sampleStars(nightSkyData));
    }
  };

  // Focus close button when tooltip opens & handle Escape key
  useEffect(() => {
    if (hoveredStar) {
      // Delay focus slightly to allow AnimatePresence to mount the element
      const raf = requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setHoveredStar(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [hoveredStar]);

  const partner = Object.values(otherUsers).find(u => u.status === 'sky');

  if (isLoading) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #070b1a 0%, #0d1528 50%, #060810 100%)',
      }}>
        <div style={{ color: '#b8a0d0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }} className="animate-pulse">
          Loading stars...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      flex: 1,
      minHeight: 500,
      position: 'relative',
      overflow: 'hidden',
      // Force dark night sky background regardless of theme
      background: 'linear-gradient(180deg, #070b1a 0%, #0d1528 30%, #101832 50%, #0d1528 70%, #060810 100%)',
      borderRadius: 'var(--radius-card)',
    }}>
      {/* Nebula glow effects */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(100, 60, 180, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 75% 60%, rgba(60, 100, 180, 0.05) 0%, transparent 40%),
          radial-gradient(ellipse at 50% 80%, rgba(180, 60, 100, 0.03) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Film grain - subtle for night */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.04,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        backgroundSize: '256px',
        mixBlendMode: 'soft-light',
        pointerEvents: 'none',
        zIndex: 10,
      }} />

      {/* Background distant stars */}
      <BackgroundStars />

      {/* Moon */}
      <Moon />

      {/* Shooting stars */}
      <ShootingStar />
      <ShootingStar />

      {/* Horizon glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(20, 15, 40, 0.5) 60%, rgba(30, 20, 50, 0.8) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Partner indicator */}
      {partner && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, zIndex: 30,
        }}>
          <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#b8a0d0' }} />
          <span style={{ color: '#b8a0d0', fontFamily: 'var(--font-handwritten)' }}>
            Stargazing together ✨
          </span>
        </div>
      )}

      {/* Title */}
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center',
        pointerEvents: 'none', zIndex: 10, padding: '0 16px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--night-text, #e8e0f0)', letterSpacing: '0.02em', margin: 0, opacity: 0.8,
          textShadow: '0 0 20px rgba(180, 160, 220, 0.3)',
        }}>
          Late Nights
        </h2>
        <p style={{
          fontSize: 15, color: 'var(--night-sub, rgba(200, 190, 220, 0.6))', marginTop: 6,
          fontFamily: 'var(--font-handwritten)',
        }}>
          {totalCount.toLocaleString()} messages sent after midnight — tap a star
          {totalCount > STAR_RENDER_LIMIT && (
            <span style={{ opacity: 0.5 }}> (showing {stars.length})</span>
          )}
        </p>
        <button
          onClick={shuffleStars}
          style={{
            marginTop: 8, padding: '6px 16px', fontSize: 13,
            background: 'rgba(180,160,220,0.15)', color: '#b8a0d0',
            border: '1px solid rgba(180,160,220,0.2)', borderRadius: 'var(--radius-full)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)',
          }}
        >
          Shuffle Stars
        </button>
      </div>

      {/* Interactive Stars (actual messages) */}
      {stars.map((star, idx) => {
        const isP1 = star.speaker === 'p1';
        return (
          <motion.div
            key={idx}
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${Math.max(star.size * 2.5, 14)}px`,
              height: `${Math.max(star.size * 2.5, 14)}px`,
              background: star.color,
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 4,
              boxShadow: star.glow
                ? `0 0 ${star.size * 4}px ${star.color}, 0 0 ${star.size * 8}px rgba(255,255,255,0.2)`
                : `0 0 ${star.size * 2}px rgba(255,255,255,0.3)`,
            }}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: 3 + star.delay,
              repeat: Infinity,
              delay: star.delay,
            }}
            whileHover={{ scale: 2, opacity: 1 }}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => setHoveredStar(hoveredStar === star ? null : star)}
          />
        );
      })}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredStar && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 20, padding: '16px',
            }}
            onClick={() => setHoveredStar(null)}
          >
            <div
              role="dialog"
              aria-label="Star message detail"
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '32px 28px', maxWidth: 420, textAlign: 'center',
                background: 'rgba(15, 12, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(180, 160, 220, 0.15)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(180,160,220,0.05)',
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: 400, color: '#b8a0d0',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14,
                fontFamily: 'var(--font-mono)',
              }}>
                {hoveredStar.date} · {hoveredStar.time}
                {hoveredStar.platform && (
                  <span style={{ marginLeft: 8 }}>
                    <PlatformIcon platform={hoveredStar.platform} size={14} />
                  </span>
                )}
              </div>
              <p style={{
                margin: 0, fontSize: 20, lineHeight: 1.6,
                color: '#e8e0f0', fontFamily: 'var(--font-handwritten)',
                fontWeight: 400,
              }}>
                "{hoveredStar.text}"
              </p>
              <div style={{
                marginTop: 16, fontSize: 14, color: 'rgba(200,190,220,0.6)',
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
              }}>
                — {SPEAKERS[hoveredStar.speaker]?.name}
              </div>
              <button
                ref={closeButtonRef}
                style={{
                  marginTop: 16, padding: '10px 24px', fontSize: 14,
                  background: 'rgba(180,160,220,0.15)', color: '#b8a0d0',
                  border: '1px solid rgba(180,160,220,0.2)', borderRadius: 'var(--radius-card)',
                  fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
                onClick={() => setHoveredStar(null)}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
