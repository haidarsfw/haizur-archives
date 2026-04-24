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
    "Tombol ✉️ glowing di landing — kotak saran, kita bisa tulis + baca saran partner",
    "Sticker tanggal di chat dibuat lebih kecil + nempel tipis di atas, ga ganggu lagi",
    "Tombol hapus satu aja — hapus untuk berdua, ada Undo 5 detik",
    "Panel 🗄️ buat lihat + pulihkan pesan yang udah dihapus",
    "Edit pesan text sendiri: menu reaction → ✏️, ada tag (edited)",
    "Jadwalkan pesan ⏰ — pilih waktu, dikirim otomatis nanti",
    "Link di pesan otomatis tampil kartu preview judul + gambar",
    "Emoji picker baru: searchable, skin-tone (long-press), kategori, recents",
    "Mobile: swipe bubble ke kanan = reply cepat, semua tombol pake getaran halus",
    "Input multi-line textarea, voice note bisa di-seek + auto-play berurutan",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
