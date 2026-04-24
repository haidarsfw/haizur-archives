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
    "Tombol hapus sekarang satu aja — hapus untuk berdua, ada Undo 5 detik",
    "Panel 🗄️ buat lihat + pulihkan pesan yang udah dihapus (bisa dua-duanya)",
    "Edit pesan text sendiri: menu reaction → ✏️, ada tag (edited)",
    "Jadwalkan pesan ⏰ — bikin draft, pilih waktu, dikirim otomatis nanti",
    "Link di pesan otomatis tampil kartu preview judul + gambar",
    "Emoji picker baru: searchable, skin-tone (long-press), kategori, recents",
    "Mobile: swipe bubble ke kanan = reply cepat, semua tombol pake getaran halus",
    "Input multi-line textarea (Shift+Enter newline), draft kesimpen otomatis",
    "Voice note bisa di-seek, auto-play berurutan dari orang yang sama",
    "Date chip nempel sticky, typing indicator 3 titik bouncing, jump-to-unread pill",
    "Partner screenshot? Ada notif halus 📸",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
