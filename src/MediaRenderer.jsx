import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── MediaPopup — Universal fullscreen overlay (portaled to body) ─────────────
function MediaPopup({ type, src, alt, onClose }) {
    useEffect(() => {
        // Pause all other media when popup opens
        window.dispatchEvent(new CustomEvent('media-play', { detail: { id: 'popup-' + src } }));
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        // Prevent body scroll when popup is open
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose, src]);

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.92)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'zoom-out',
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}
                >
                    {(type === 'image' || type === 'sticker' || type === 'gif') && (
                        <img
                            src={src}
                            alt={alt || type}
                            style={{
                                maxWidth: '90vw', maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: 'var(--radius-md)',
                            }}
                        />
                    )}
                    {type === 'video' && (
                        <video
                            src={src}
                            controls
                            autoPlay
                            style={{
                                maxWidth: '90vw', maxHeight: '90vh',
                                borderRadius: 'var(--radius-md)',
                            }}
                        />
                    )}
                    {type === 'audio' && (
                        <div style={{ padding: '40px 60px', background: 'var(--bg-card)', borderRadius: 'var(--radius-card)' }}>
                            <audio src={src} controls autoPlay style={{ width: 400, maxWidth: '80vw' }} />
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: -12, right: -12,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)',
                        }}
                    >×</button>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

// ─── ImageViewer ─────────────────────────────────────────────────────────────
function ImageViewer({ src, alt, style }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(false);

    if (error) return null;

    return (
        <>
            <img
                src={src}
                alt={alt || 'Image'}
                loading="lazy"
                onClick={() => setOpen(true)}
                onError={() => setError(true)}
                style={{
                    maxWidth: '100%', maxHeight: 280,
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    ...style,
                }}
            />
            {open && <MediaPopup type="image" src={src} alt={alt} onClose={() => setOpen(false)} />}
        </>
    );
}

// ─── VideoPlayer — Lazy loading via IntersectionObserver + one-at-a-time ─────
function VideoPlayer({ src }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(false);
    const [visible, setVisible] = useState(false);
    const containerRef = useRef(null);

    // Lazy load: only set video src when element enters viewport
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (error) return <MediaPlaceholder type="video" />;

    return (
        <>
            <div
                ref={containerRef}
                onClick={() => {
                    if (!visible) return;
                    window.dispatchEvent(new CustomEvent('media-play', { detail: { id: src } }));
                    setOpen(true);
                }}
                style={{
                    position: 'relative', cursor: 'pointer',
                    maxWidth: '100%', minHeight: 120, maxHeight: 280,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', background: '#111',
                }}
            >
                {visible ? (
                    <video
                        src={src}
                        preload="metadata"
                        onError={() => setError(true)}
                        style={{
                            maxWidth: '100%', maxHeight: 280,
                            borderRadius: 'var(--radius-md)',
                            display: 'block',
                        }}
                    />
                ) : (
                    <div style={{ width: '100%', height: 160 }} />
                )}
                {/* Play button overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>
            {open && <MediaPopup type="video" src={src} onClose={() => setOpen(false)} />}
        </>
    );
}

// ─── VideoNotePlayer — Circular video note (WhatsApp-style) ──────────────────
function VideoNotePlayer({ src }) {
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (error) return <MediaPlaceholder type="video_note" />;

    return (
        <>
            <div
                ref={containerRef}
                onClick={() => { if (src && visible) setOpen(true); }}
                style={{
                    width: 200, height: 200, borderRadius: '50%',
                    overflow: 'hidden', cursor: src ? 'pointer' : 'default',
                    border: '3px solid var(--main-color)',
                    position: 'relative', flexShrink: 0,
                    background: '#111',
                }}
            >
                {src && visible ? (
                    <video
                        src={src}
                        preload="metadata"
                        onError={() => setError(true)}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                        }}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 4,
                    }}>
                        <span style={{ fontSize: 28 }}>🎥</span>
                        <span style={{ fontSize: 10, color: 'var(--sub-color)', fontFamily: 'var(--font-mono)' }}>Video Note</span>
                    </div>
                )}
                {/* Play button overlay for videos with src */}
                {src && (
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.2)',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.85)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
            {open && src && <MediaPopup type="video" src={src} onClose={() => setOpen(false)} />}
        </>
    );
}

// ─── DocumentViewer — Clickable document with popup preview ──────────────────
function DocumentViewer({ src, fileName, message }) {
    const [open, setOpen] = useState(false);
    const ext = (src || fileName || '').split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

    const icons = {
        pdf: '📕', doc: '📘', docx: '📘', pptx: '📙', ppt: '📙',
        xlsx: '📗', xls: '📗', txt: '📝', vcf: '👤',
    };
    const icon = icons[ext] || '📎';

    return (
        <>
            <div
                onClick={() => src ? setOpen(true) : null}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', cursor: src ? 'pointer' : 'default',
                    background: 'rgba(212, 160, 84, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (src) e.currentTarget.style.background = 'rgba(212, 160, 84, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 160, 84, 0.08)'; }}
            >
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{
                        fontSize: 13, fontFamily: 'var(--font-mono)',
                        color: 'var(--text-color)',
                        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {fileName || message?.text || 'Document'}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                        .{ext}{src ? '' : ' (unavailable)'}
                    </span>
                </div>
                {src && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sub-color)" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                )}
            </div>
            {open && src && <DocumentPopup src={src} ext={ext} isPdf={isPdf} isImage={isImage} fileName={fileName} onClose={() => setOpen(false)} />}
        </>
    );
}

function DocumentPopup({ src, ext, isPdf, isImage, fileName, onClose }) {
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const fileSrc = src.startsWith('http') ? src : `/${src}`;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 16,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                {isPdf ? (
                    <iframe
                        src={fileSrc}
                        title={fileName || 'Document'}
                        style={{
                            width: '90vw', height: '85vh',
                            border: 'none', borderRadius: 'var(--radius-card)',
                            background: '#fff',
                        }}
                    />
                ) : isImage ? (
                    <img
                        src={fileSrc}
                        alt={fileName || 'Document'}
                        style={{
                            maxWidth: '90vw', maxHeight: '85vh',
                            objectFit: 'contain', borderRadius: 'var(--radius-card)',
                        }}
                    />
                ) : (
                    <div style={{
                        padding: '48px 64px', background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-card)', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                    }}>
                        <span style={{ fontSize: 48 }}>📄</span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-color)' }}>
                            {fileName || 'Document'}.{ext}
                        </div>
                        <a
                            href={fileSrc}
                            download={fileName || `document.${ext}`}
                            style={{
                                padding: '12px 32px', background: 'var(--main-color)',
                                color: 'var(--bg-color)', borderRadius: 'var(--radius-card)',
                                textDecoration: 'none', fontFamily: 'var(--font-body)',
                                fontSize: 15, fontWeight: 600,
                            }}
                        >
                            Download
                        </a>
                    </div>
                )}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: -12, right: -12,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                    }}
                >×</button>
            </div>
        </motion.div>,
        document.body
    );
}

// ─── AudioPlayer — WhatsApp-style voice note pill with waveform ─────────────
function AudioPlayer({ src, speaker }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(false);
    const [speed, setSpeed] = useState(1);
    const audioRef = useRef(null);
    const isCaf = src && src.toLowerCase().endsWith('.caf');

    // Generate consistent decorative waveform bars from src (40 bars, thinner)
    const bars = useRef(
        Array.from({ length: 40 }, (_, i) => {
            const seed = (i * 7 + 13) % 17;
            return 0.15 + (seed / 17) * 0.85;
        })
    ).current;

    const speeds = [1, 1.5, 2];
    const cycleSpeed = (e) => {
        e.stopPropagation();
        const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
        const newSpeed = speeds[nextIdx];
        setSpeed(newSpeed);
        if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            window.dispatchEvent(new CustomEvent('media-play', { detail: { id: src } }));
            audioRef.current.playbackRate = speed;
            audioRef.current.play().then(() => setPlaying(true)).catch(() => setError(true));
        }
    };

    // Listen for other media starting → pause this one
    useEffect(() => {
        const handler = (e) => {
            if (e.detail.id !== src && audioRef.current) {
                audioRef.current.pause();
                setPlaying(false);
            }
        };
        window.addEventListener('media-play', handler);
        return () => window.removeEventListener('media-play', handler);
    }, [src]);

    // Progress tracking
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => setProgress(audio.currentTime / (audio.duration || 1));
        const onMeta = () => setDuration(audio.duration);
        const onEnd = () => { setPlaying(false); setProgress(0); };
        const onErr = () => setError(true);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('ended', onEnd);
        audio.addEventListener('error', onErr);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('error', onErr);
        };
    }, []);

    const formatTime = (secs) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatRemaining = (secs) => {
        if (!secs || isNaN(secs)) return '-0:00';
        const remaining = Math.max(0, secs);
        const m = Math.floor(remaining / 60);
        const s = Math.floor(remaining % 60);
        return `-${m}:${s.toString().padStart(2, '0')}`;
    };

    if (error) return <MediaPlaceholder type="audio" />;

    // .caf files: styled disabled voice note pill
    if (isCaf) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 24,
                minWidth: 200, maxWidth: 300,
                opacity: 0.6,
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--sub-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bg-color)">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    gap: 1, height: 28, overflow: 'hidden',
                }}>
                    {bars.map((h, i) => (
                        <div key={i} style={{
                            width: 2, borderRadius: 1, flexShrink: 0,
                            height: `${h * 100}%`,
                            background: 'var(--sub-color)', opacity: 0.25,
                        }} />
                    ))}
                </div>
                <span style={{
                    fontSize: 9, color: 'var(--sub-color)',
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                    fontWeight: 600, letterSpacing: '0.03em',
                }}>
                    .caf
                </span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px 8px 10px',
            background: speaker === 'p1' ? 'rgba(212, 160, 84, 0.1)' : 'rgba(140, 180, 200, 0.1)',
            borderRadius: 24,
            minWidth: 220, maxWidth: 320,
        }}>
            {/* Play/Pause button */}
            <button
                onClick={togglePlay}
                style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--main-color)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
            >
                {playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bg-color)">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bg-color)">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            {/* Waveform with progress coloring */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                gap: 1, height: 28, overflow: 'hidden',
            }}>
                {bars.map((h, i) => {
                    const barPct = i / bars.length;
                    const isPlayed = barPct <= progress;
                    return (
                        <div
                            key={i}
                            style={{
                                width: 2, borderRadius: 1, flexShrink: 0,
                                height: `${h * 100}%`,
                                background: isPlayed ? 'var(--main-color)' : 'var(--sub-color)',
                                opacity: isPlayed ? 0.9 : 0.25,
                                transition: 'background 0.1s, opacity 0.1s',
                            }}
                        />
                    );
                })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                {/* Time display: remaining when playing, total when paused */}
                <span style={{
                    fontSize: 11, color: 'var(--sub-color)',
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                    fontWeight: 500,
                }}>
                    {playing
                        ? formatRemaining((duration || 0) - (audioRef.current?.currentTime || 0))
                        : formatTime(duration)}
                </span>
                {/* Speed toggle */}
                <button
                    onClick={cycleSpeed}
                    style={{
                        fontSize: 9, fontWeight: 700,
                        color: speed !== 1 ? 'var(--main-color)' : 'var(--sub-color)',
                        background: speed !== 1 ? 'var(--main-color-dim)' : 'var(--bg-tertiary)',
                        border: 'none', borderRadius: 8,
                        padding: '1px 5px', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.4,
                    }}
                >
                    {speed}x
                </button>
            </div>

            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                style={{ display: 'none' }}
            />
        </div>
    );
}

// ─── MediaPlaceholder ─────────────────────────────────────────────────
function MediaPlaceholder({ type }) {
    const icons = { image: '🖼️', video: '🎬', audio: '🎵', sticker: '🎨', call: '📞', gif: '✨', video_note: '🎥', document: '📎' };
    const labels = { image: 'Image', video: 'Video', audio: 'Voice Note', sticker: 'Sticker', call: 'Call', gif: 'GIF', video_note: 'Video Note', document: 'Document' };
    const icon = icons[type] || '📎';
    const label = labels[type] || type || 'Attachment';

    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(212, 160, 84, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
            fontSize: 13, color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
        }}>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

// ─── StickerPreview — Canvas first frame (frozen) + click to animate ─────────
function StickerPreview({ url }) {
    const canvasRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(false);
    const [visible, setVisible] = useState(false);
    const containerRef = useRef(null);

    // Lazy load: only start loading when in viewport
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '300px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Draw first frame to canvas when visible
    useEffect(() => {
        if (!visible || !url) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const maxSize = 150;
                const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setLoaded(true);
            } catch {
                // CORS or canvas error — fall back to regular img
                setError(true);
            }
        };
        img.onerror = () => setError(true);
        img.src = url;
    }, [visible, url]);

    if (error) {
        // Fallback: show as regular <img> (will animate, but at least visible)
        return (
            <>
                <img
                    src={url}
                    alt="Sticker"
                    loading="lazy"
                    onClick={() => setOpen(true)}
                    style={{
                        maxWidth: 150, maxHeight: 150,
                        objectFit: 'contain', cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                    }}
                />
                {open && <MediaPopup type="sticker" src={url} onClose={() => setOpen(false)} />}
            </>
        );
    }

    return (
        <div ref={containerRef} style={{ display: 'inline-block' }}>
            <canvas
                ref={canvasRef}
                onClick={() => setOpen(true)}
                style={{
                    maxWidth: 150, maxHeight: 150,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-md)',
                    display: loaded ? 'block' : 'none',
                }}
            />
            {!loaded && (
                <div style={{
                    width: 80, height: 80,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                }} />
            )}
            {open && <MediaPopup type="sticker" src={url} onClose={() => setOpen(false)} />}
        </div>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function MediaRenderer({ message, gridMode }) {
    if (!message) return null;

    const { type, mediaPath, mediaType } = message;

    // Text, poll, link types render nothing from this component
    if (!type || type === 'text' || type === 'poll' || type === 'tiktok_link' || type === 'music_link') {
        return null;
    }

    // If we have an actual media path, render the real player
    if (mediaPath) {
        const src = mediaPath.startsWith('http') ? mediaPath : `/${mediaPath}`;

        // Video notes → circular player
        if (type === 'video_note') {
            return <VideoNotePlayer src={src} />;
        }

        // Documents → clickable document viewer
        if (type === 'document') {
            return <DocumentViewer src={src} fileName={message.fileName} message={message} />;
        }

        // Live photos: render as video with LIVE badge
        if (message.isLivePhoto) {
            return (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <VideoPlayer src={src} />
                    <span style={{
                        position: 'absolute', top: 8, left: 8,
                        padding: '2px 8px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.85)', color: '#000',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        fontFamily: 'var(--font-mono, monospace)',
                        textTransform: 'uppercase',
                        pointerEvents: 'none',
                    }}>LIVE</span>
                </div>
            );
        }

        if (mediaType === 'image' || type === 'image' || type === 'sticker' || type === 'gif') {
            return <ImageViewer src={src} alt={type} style={gridMode ? { width: '100%', height: '100%', maxHeight: 'none', objectFit: 'cover' } : undefined} />;
        }
        if (mediaType === 'video' || type === 'video') {
            return <VideoPlayer src={src} />;
        }
        if (mediaType === 'audio' || type === 'audio') {
            return <AudioPlayer src={src} speaker={message.speaker} />;
        }
    }

    // Video note without media — show circular placeholder
    if (type === 'video_note') {
        if (gridMode) return null;
        return <VideoNotePlayer src={null} />;
    }

    // Document without mediaPath — show clickable stub
    if (type === 'document') {
        if (gridMode) return null;
        return <DocumentViewer src={null} fileName={message.fileName} message={message} />;
    }

    // Sticker with media URL in text — extract and render as frozen image via canvas
    if (type === 'sticker' && message.text) {
        const urlMatch = message.text.match(/https?:\/\/[^\s\[\]]+\.(webp|gif|png|jpg)[^\s\[\]]*/i);
        if (urlMatch) {
            return <StickerPreview url={urlMatch[0]} />;
        }
    }

    // Audio without mediaPath — return null (non-playable voice note)
    if (type === 'audio') return null;

    // In grid mode, return null for items without actual media files
    if (gridMode) return null;

    // Sticker without media or URL — just show small icon
    if (type === 'sticker') {
        return (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', fontSize: 13, color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
            }}>
                🎨 Sticker
            </div>
        );
    }

    // No media path — hide image/video/gif (text like "[Photo]" renders from ChatBrowser)
    if (type === 'image' || type === 'video' || type === 'gif') return <MediaPlaceholder type={type} />;
    return <MediaPlaceholder type={type} />;
}

export { ImageViewer, MediaPopup };
