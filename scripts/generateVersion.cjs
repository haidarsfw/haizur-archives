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
    "Fix: chat bener-bener ga random jump ke atas lagi (overflowAnchor + scroll-restore off)",
    "Fix: draft tetap masih kelihatan setelah kirim — sekarang bener-bener bersih",
    "Fix: tombol ? pas ngetik di chat ga buka popup help lagi",
    "Live presence lebih akurat: heartbeat 10 detik + online dot auto-decay tiap 10s",
    "Auto-refresh nunggu kamu idle dulu biar ga ganggu pas chat",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
