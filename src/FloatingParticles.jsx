import React, { useEffect, useState } from "react";

const PETAL_SHAPES = [
  'ellipse(45% 30% at 50% 50%)',
  'polygon(50% 0%, 80% 30%, 100% 60%, 80% 100%, 50% 85%, 20% 100%, 0% 60%, 20% 30%)',
  'polygon(50% 0%, 75% 25%, 90% 55%, 70% 90%, 30% 90%, 10% 55%, 25% 25%)',
  'ellipse(35% 45% at 50% 50%)',
];

const PAPER_SHAPES = [
  'polygon(5% 0%, 95% 5%, 100% 90%, 8% 95%)',
  'polygon(0% 10%, 90% 0%, 100% 85%, 15% 100%)',
  'polygon(10% 0%, 100% 5%, 95% 100%, 0% 90%)',
];

const DUST_SHAPES = [
  'circle(50% at 50% 50%)',
  'ellipse(40% 50% at 50% 50%)',
  'ellipse(50% 35% at 50% 50%)',
];

const THEME_CONFIG = {
  default: {
    count: 12,
    color: 'var(--main-color)',
    peakOpacity: 0.06,
    size: [6, 18],
    blur: 10,
    speed: [18, 30],
    shapes: DUST_SHAPES,
    rotate: false,
  },
  milktea: {
    count: 10,
    color: 'var(--honey-color)',
    peakOpacity: 0.1,
    size: [16, 32],
    blur: 8,
    speed: [16, 26],
    shapes: PETAL_SHAPES,
    rotate: true,
  },
  romantic: {
    count: 20,
    color: 'var(--main-color)',
    peakOpacity: 0.2,
    size: [12, 28],
    blur: 6,
    speed: [12, 22],
    shapes: PETAL_SHAPES,
    rotate: true,
  },
  night: {
    count: 14,
    color: 'var(--main-color)',
    peakOpacity: 0.1,
    size: [4, 14],
    blur: 3,
    speed: [14, 28],
    shapes: [...PAPER_SHAPES, 'circle(50% at 50% 50%)'],
    rotate: true,
  },
  matrix: {
    count: 6,
    color: 'var(--main-color)',
    peakOpacity: 0.08,
    size: [3, 8],
    blur: 2,
    speed: [8, 16],
    shapes: ['circle(50% at 50% 50%)'],
    rotate: false,
  },
};

export default function FloatingParticles({ theme }) {
  const [particles, setParticles] = useState([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const config = THEME_CONFIG[theme] || THEME_CONFIG.default;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) { setParticles([]); return; }
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const count = isMobile ? Math.max(4, Math.floor(config.count / 2)) : config.count;
    const newParticles = Array.from({ length: count }).map((_, i) => {
      const rotation = config.rotate ? Math.random() * 360 : 0;
      const rotateSpeed = config.rotate ? (Math.random() - 0.5) * 180 : 0;
      return {
        id: i,
        x: Math.random() * 100,
        size: Math.random() * (config.size[1] - config.size[0]) + config.size[0],
        duration: Math.random() * (config.speed[1] - config.speed[0]) + config.speed[0],
        delay: Math.random() * 5,
        shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
        rotStart: rotation,
        rotEnd: rotation + rotateSpeed,
      };
    });
    setParticles(newParticles);
  }, [theme, config.count, config.size, config.speed, prefersReducedMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * (config.shapes === PETAL_SHAPES ? 1.4 : 1),
            filter: `blur(${config.blur}px)`,
            backgroundColor: config.color,
            clipPath: p.shape,
            willChange: 'transform, opacity',
            contain: 'layout style',
            '--rot-start': `${p.rotStart}deg`,
            '--rot-end': `${p.rotEnd}deg`,
            '--peak-opacity': config.peakOpacity,
            animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
