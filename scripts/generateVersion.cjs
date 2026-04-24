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
    "Tap foto di chat → buka fullscreen, bisa pinch-zoom + geser + download",
    "Panah kiri/kanan atau swipe buat loncat antar foto di chat",
    "Paste screenshot (Ctrl/Cmd+V) langsung ke chat, atau drag file foto ke area chat",
    "Foto sekarang bisa pake caption, tinggal ketik dulu sebelum kirim",
    "Hover ✓✓ biru buat lihat jam pasti dia baca pesanmu",
    "Format pesan: *tebal* _miring_ ~coret~ `kode` + link otomatis clickable",
    "Tombol 📋 di menu reaction buat copy teks pesan",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
