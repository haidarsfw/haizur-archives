/**
 * Writes public/version.json with a fresh build identifier and the
 * "what's new" notes shown to users on first load after a deploy.
 *
 * The live app polls /version.json every minute. When the value changes,
 * both sides auto-refresh so nobody stays on a stale build.
 */

const fs = require("fs");
const path = require("path");

const VERSION = process.env.VITE_BUILD_ID || String(Date.now());

// Keep entries short + friendly. This list is what the "ada yang baru"
// modal shows, so update it each time you ship user-facing changes.
const HIGHLIGHTS = [
    "Sticky-scroll: chat ngunci ke jarak-dari-bawah lewat useLayoutEffect. Ga jumps lagi.",
    "Limit chat naik ke 2000 pesan — pesan lama tetap visible, ga keapus",
    "Snap ke bawah pas kirim/terima pesan kalau lagi di bawah",
    "Bubble animation off 100% — reaksi/receipt update ga nge-replay animasi",
    "focus() pake preventScroll, scroll-anchor disabled di container",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
