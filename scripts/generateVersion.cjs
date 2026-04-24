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
    "Fix BESAR: chat query sekarang ambil 500 pesan terbaru (dulu 500 terlama — pesan baru ilang),",
    "Fix: cache-snapshot Firestore yang basi ga flash lagi di awal load",
    "Fix: focus input ga lompatin scroll container — `preventScroll: true`",
    "Enter-animation pesan dimatiin — bubble ga muncul ulang pas reaction/receipt update",
    "Presence: heartbeat 10s + activity bumps, online dot bener-bener decay",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
