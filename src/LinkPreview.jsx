import React, { useState, useEffect, useRef } from "react";

const CACHE_KEY = "haizur-link-preview-";
const FETCH_ENDPOINT = (url) => `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
const MAX_CACHE_MS = 60 * 60 * 1000;

function readCache(url) {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY + url);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.at || Date.now() - parsed.at > MAX_CACHE_MS) return null;
        return parsed.data;
    } catch { return null; }
}

function writeCache(url, data) {
    try { sessionStorage.setItem(CACHE_KEY + url, JSON.stringify({ at: Date.now(), data })); } catch { /* noop */ }
}

export default function LinkPreview({ url, onClick }) {
    const [data, setData] = useState(() => readCache(url));
    const [error, setError] = useState(false);
    const ref = useRef(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (data || error || fetchedRef.current || !url) return;
        const el = ref.current;
        if (!el) return;

        const load = async () => {
            if (fetchedRef.current) return;
            fetchedRef.current = true;
            const cached = readCache(url);
            if (cached) { setData(cached); return; }
            try {
                const res = await fetch(FETCH_ENDPOINT(url), { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error("HTTP " + res.status);
                const payload = await res.json();
                if (payload?.status !== "success" || !payload?.data) throw new Error("bad payload");
                const d = payload.data;
                const clean = {
                    title: d.title || null,
                    description: d.description || null,
                    image: d.image?.url || null,
                    url: d.url || url,
                    site: d.publisher || (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })(),
                };
                writeCache(url, clean);
                setData(clean);
            } catch {
                setError(true);
            }
        };

        if (typeof IntersectionObserver === "undefined") {
            load();
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { load(); io.disconnect(); } });
        }, { rootMargin: "200px" });
        io.observe(el);
        return () => io.disconnect();
    }, [url, data, error]);

    if (error || !data || (!data.title && !data.image)) {
        return <div ref={ref} style={{ display: "none" }} />;
    }

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
    };

    return (
        <a
            ref={ref}
            href={data.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={handleClick}
            style={{
                display: "flex",
                marginTop: 6,
                borderRadius: 10,
                overflow: "hidden",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.15)",
                textDecoration: "none",
                color: "inherit",
                maxWidth: 260,
            }}
        >
            {data.image && (
                <img
                    src={data.image}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    style={{
                        width: 64, height: 64,
                        objectFit: "cover",
                        flexShrink: 0,
                        background: "#222",
                    }}
                />
            )}
            <div style={{
                padding: "6px 10px",
                minWidth: 0,
                display: "flex", flexDirection: "column",
                justifyContent: "center",
                gap: 2,
            }}>
                {data.site && (
                    <div style={{
                        fontSize: 10,
                        opacity: 0.65,
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {data.site}
                    </div>
                )}
                {data.title && (
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}>
                        {data.title}
                    </div>
                )}
            </div>
        </a>
    );
}
