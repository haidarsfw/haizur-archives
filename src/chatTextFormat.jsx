import React from 'react';

const URL_RE = /(https?:\/\/[^\s<>]+)/g;

const PATTERNS = [
    { regex: /`([^`\n]+?)`/, type: 'code' },
    { regex: /\*\*(\S(?:[^*\n]*?\S)?)\*\*/, type: 'bold' },
    { regex: /\*(\S(?:[^*\n]*?\S)?)\*/, type: 'bold' },
    { regex: /~(\S(?:[^~\n]*?\S)?)~/, type: 'strike' },
    { regex: /_(\S(?:[^_\n]*?\S)?)_/, type: 'italic' },
];

function tokenizeMarkdown(text) {
    const tokens = [];
    let rest = text;
    while (rest) {
        let best = null;
        for (const p of PATTERNS) {
            const m = p.regex.exec(rest);
            if (m && (best === null || m.index < best.m.index)) {
                best = { type: p.type, m };
            }
        }
        if (!best) {
            tokens.push({ type: 'text', value: rest });
            break;
        }
        if (best.m.index > 0) {
            tokens.push({ type: 'text', value: rest.slice(0, best.m.index) });
        }
        tokens.push({ type: best.type, value: best.m[1] });
        rest = rest.slice(best.m.index + best.m[0].length);
    }
    return tokens;
}

function tokenize(input) {
    if (!input) return [];
    const segments = [];
    let lastEnd = 0;
    URL_RE.lastIndex = 0;
    let m;
    while ((m = URL_RE.exec(input))) {
        if (m.index > lastEnd) segments.push({ text: input.slice(lastEnd, m.index), isUrl: false });
        segments.push({ text: m[0], isUrl: true });
        lastEnd = m.index + m[0].length;
    }
    if (lastEnd < input.length) segments.push({ text: input.slice(lastEnd), isUrl: false });

    const out = [];
    for (const seg of segments) {
        if (seg.isUrl) {
            out.push({ type: 'link', value: seg.text, href: seg.text });
        } else {
            for (const t of tokenizeMarkdown(seg.text)) out.push(t);
        }
    }
    return out;
}

export function formatMessageText(input) {
    if (!input) return null;
    const tokens = tokenize(input);
    if (tokens.length === 0) return input;
    return tokens.map((t, i) => {
        switch (t.type) {
            case 'bold':
                return <strong key={i}>{t.value}</strong>;
            case 'italic':
                return <em key={i}>{t.value}</em>;
            case 'strike':
                return <s key={i}>{t.value}</s>;
            case 'code':
                return (
                    <code
                        key={i}
                        style={{
                            background: 'rgba(255,255,255,0.14)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.92em',
                        }}
                    >
                        {t.value}
                    </code>
                );
            case 'link':
                return (
                    <a
                        key={i}
                        href={t.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        style={{ textDecoration: 'underline', color: 'inherit', overflowWrap: 'anywhere' }}
                    >
                        {t.value}
                    </a>
                );
            default:
                return <React.Fragment key={i}>{t.value}</React.Fragment>;
        }
    });
}
