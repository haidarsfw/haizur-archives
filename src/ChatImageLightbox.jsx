import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useHaptics } from './hooks/useHaptics';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 60;
const DOUBLE_TAP_MS = 280;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function buildDownloadName(sender, timestamp) {
    const safeSender = sender || 'image';
    let stamp = 'haizur';
    try {
        const d = timestamp?.toDate ? timestamp.toDate() : timestamp ? new Date(timestamp) : new Date();
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            stamp = `${y}${m}${day}-${h}${min}`;
        }
    } catch {
        // ignore — fallback already set
    }
    return `haizur-${stamp}-${safeSender}.jpg`;
}

export default function ChatImageLightbox({ images, startIndex = 0, onClose }) {
    const [index, setIndex] = useState(startIndex);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [savedToast, setSavedToast] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const reducedMotion = useReducedMotion();
    const haptic = useHaptics();

    const touchStateRef = useRef({
        mode: null, startX: 0, startY: 0,
        startPanX: 0, startPanY: 0,
        startDist: 0, startScale: 1,
        lastTapAt: 0,
    });
    const mouseStateRef = useRef({ dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
    const hideControlsTimer = useRef(null);

    const total = images.length;
    const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
    const current = images[safeIndex] || null;

    // Close when list becomes empty (triggered by caller removing all images)
    useEffect(() => {
        if (total === 0) onClose();
    }, [total, onClose]);

    const next = useCallback(() => {
        if (total <= 1) return;
        setIndex((i) => (i + 1) % total);
        setScale(1);
        setPan({ x: 0, y: 0 });
        haptic.tap();
    }, [total, haptic]);
    const prev = useCallback(() => {
        if (total <= 1) return;
        setIndex((i) => (i - 1 + total) % total);
        setScale(1);
        setPan({ x: 0, y: 0 });
        haptic.tap();
    }, [total, haptic]);

    // Keyboard
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
            else if (e.key === '+' || e.key === '=') { e.preventDefault(); setScale((s) => clamp(s + 0.25, MIN_SCALE, MAX_SCALE)); }
            else if (e.key === '-' || e.key === '_') { e.preventDefault(); setScale((s) => clamp(s - 0.25, MIN_SCALE, MAX_SCALE)); }
            else if (e.key === '0') { e.preventDefault(); setScale(1); setPan({ x: 0, y: 0 }); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, onClose]);

    // Body scroll lock
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prevOverflow; };
    }, []);

    // Auto-hide controls on mobile after inactivity
    const bumpControls = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3200);
    }, []);
    // Cleanup timer on unmount
    useEffect(() => () => {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    }, []);

    // Touch handlers — pinch + swipe + pan
    const onTouchStart = (e) => {
        bumpControls();
        const s = touchStateRef.current;
        if (e.touches.length === 2) {
            const [t1, t2] = e.touches;
            s.mode = 'pinch';
            s.startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            s.startScale = scale;
            return;
        }
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const now = Date.now();
            const sinceLast = now - s.lastTapAt;
            if (sinceLast > 0 && sinceLast < DOUBLE_TAP_MS) {
                if (scale > 1) { setScale(1); setPan({ x: 0, y: 0 }); }
                else { setScale(2.2); }
                s.mode = null;
                s.lastTapAt = 0;
                return;
            }
            s.lastTapAt = now;
            s.mode = scale > 1 ? 'pan' : 'swipe';
            s.startX = t.clientX;
            s.startY = t.clientY;
            s.startPanX = pan.x;
            s.startPanY = pan.y;
        }
    };
    const onTouchMove = (e) => {
        const s = touchStateRef.current;
        if (s.mode === 'pinch' && e.touches.length >= 2) {
            e.preventDefault();
            const [t1, t2] = e.touches;
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            if (s.startDist > 0) {
                setScale(clamp((s.startScale * dist) / s.startDist, MIN_SCALE, MAX_SCALE));
            }
        } else if (s.mode === 'pan' && e.touches.length === 1) {
            e.preventDefault();
            const t = e.touches[0];
            setPan({
                x: s.startPanX + (t.clientX - s.startX),
                y: s.startPanY + (t.clientY - s.startY),
            });
        }
    };
    const onTouchEnd = (e) => {
        const s = touchStateRef.current;
        if (s.mode === 'swipe' && e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            const dx = t.clientX - s.startX;
            const dy = t.clientY - s.startY;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) prev(); else next();
            }
        }
        s.mode = null;
    };

    // Mouse wheel zoom
    const onWheel = (e) => {
        if (!current) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0018);
        setScale((s) => clamp(s * factor, MIN_SCALE, MAX_SCALE));
    };

    // Mouse drag pan (desktop when zoomed)
    const onMouseDown = (e) => {
        if (scale <= 1) return;
        mouseStateRef.current = {
            dragging: true,
            startX: e.clientX, startY: e.clientY,
            startPanX: pan.x, startPanY: pan.y,
        };
    };
    useEffect(() => {
        const onMove = (e) => {
            const ms = mouseStateRef.current;
            if (!ms.dragging) return;
            setPan({
                x: ms.startPanX + (e.clientX - ms.startX),
                y: ms.startPanY + (e.clientY - ms.startY),
            });
        };
        const onUp = () => { mouseStateRef.current.dragging = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const onDoubleClick = (e) => {
        e.stopPropagation();
        if (scale > 1) { setScale(1); setPan({ x: 0, y: 0 }); }
        else { setScale(2.2); }
    };

    const handleDownload = (e) => {
        e.stopPropagation();
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 1400);
    };

    if (!current) return null;

    const cursor = scale > 1 ? 'grab' : 'zoom-in';

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="lightbox-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
                onMouseMove={bumpControls}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9500,
                    background: 'rgba(0,0,0,0.94)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overscrollBehavior: 'contain',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                }}
            >
                {/* Top-right controls */}
                <AnimatePresence>
                    {controlsVisible && (
                        <motion.div
                            key="top-controls"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                top: 'max(12px, env(safe-area-inset-top, 0px))',
                                right: 12,
                                display: 'flex', gap: 8, zIndex: 3,
                            }}
                        >
                            <a
                                href={current.src}
                                download={buildDownloadName(current.sender, current.timestamp)}
                                onClick={handleDownload}
                                aria-label="Download image"
                                style={lightboxBtnStyle}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </a>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                aria-label="Close"
                                style={lightboxBtnStyle}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                </svg>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Prev/Next chevrons — desktop visible, mobile fades with controls */}
                {total > 1 && (
                    <AnimatePresence>
                        {controlsVisible && (
                            <>
                                <motion.button
                                    key="prev"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={(e) => { e.stopPropagation(); prev(); }}
                                    aria-label="Previous image"
                                    style={{ ...chevronStyle, left: 12 }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </motion.button>
                                <motion.button
                                    key="next"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={(e) => { e.stopPropagation(); next(); }}
                                    aria-label="Next image"
                                    style={{ ...chevronStyle, right: 12 }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </motion.button>
                            </>
                        )}
                    </AnimatePresence>
                )}

                {/* Image container */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    onDoubleClick={onDoubleClick}
                    style={{
                        position: 'relative',
                        maxWidth: '95vw', maxHeight: '90vh',
                        touchAction: 'none',
                        cursor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <motion.img
                        key={current.id || safeIndex}
                        src={current.src}
                        alt={current.caption || 'Image'}
                        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                        transition={{ duration: reducedMotion ? 0.08 : 0.18 }}
                        draggable={false}
                        style={{
                            maxWidth: '95vw', maxHeight: '90vh',
                            objectFit: 'contain',
                            borderRadius: 'var(--radius-md, 12px)',
                            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.12s ease-out',
                            willChange: 'transform',
                            userSelect: 'none',
                            WebkitUserDrag: 'none',
                            pointerEvents: 'auto',
                        }}
                    />
                </div>

                {/* Caption + index indicator */}
                <AnimatePresence>
                    {controlsVisible && (current.caption || total > 1) && (
                        <motion.div
                            key="bottom-info"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
                                left: 16, right: 16,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                zIndex: 3,
                                pointerEvents: 'none',
                            }}
                        >
                            {current.caption && (
                                <div style={{
                                    maxWidth: 640,
                                    padding: '8px 16px',
                                    background: 'rgba(0,0,0,0.55)',
                                    color: 'rgba(255,255,255,0.92)',
                                    fontFamily: 'var(--font-handwritten, serif)',
                                    fontSize: 15,
                                    lineHeight: 1.4,
                                    borderRadius: 14,
                                    textAlign: 'center',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word',
                                    backdropFilter: 'blur(4px)',
                                }}>
                                    {current.caption}
                                </div>
                            )}
                            {total > 1 && (
                                <div style={{
                                    fontSize: 11,
                                    fontFamily: 'var(--font-mono, monospace)',
                                    color: 'rgba(255,255,255,0.7)',
                                    letterSpacing: '0.08em',
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    background: 'rgba(0,0,0,0.4)',
                                }}>
                                    {safeIndex + 1} / {total}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Saved toast */}
                <AnimatePresence>
                    {savedToast && (
                        <motion.div
                            key="saved-toast"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                padding: '10px 22px',
                                borderRadius: 999,
                                background: 'rgba(0,0,0,0.75)',
                                color: '#fff',
                                fontFamily: 'var(--font-handwritten, serif)',
                                fontSize: 14,
                                zIndex: 4,
                                pointerEvents: 'none',
                            }}
                        >
                            Saved ✓
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

const lightboxBtnStyle = {
    width: 36, height: 36,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    textDecoration: 'none',
    transition: 'background 0.15s',
};

const chevronStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44, height: 44,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 3,
};
