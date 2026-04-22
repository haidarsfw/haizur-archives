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
    "Pojok kanan atas sekarang nama partner + status online/last seen-nya",
    "Tombol ✨ di chat = nudge, colek partner satu tap",
    "Scroll chat udah ga kepaksa balik kebawah",
    "Ketik 'miss you', 'haha', 'good night', 'halo' → dapet efek lucu",
    "Badge merah di bubble chat = ada pesan belum dibaca",
    "Bunyi-bunyian halus di seluruh web (bisa dimute di menu)",
    "Web auto-refresh tiap kali ada update baru",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
