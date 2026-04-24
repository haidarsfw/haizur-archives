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
    "Header chat di mobile dirapihin — tombol sekunder masuk menu ⋯",
    "Fix scroll otomatis ke bawah di mobile, ga lompat-lompat lagi",
    "Data WhatsApp First diperbarui (sampai April 2026, lebih banyak memori)",
    "Kotak saran tulisannya pake font normal lagi, boxnya clean (ga ada emoji/label)",
    "Tombol ✉️ di landing buat kirim + baca saran dua arah (kita & partner)",
    "Sticker tanggal di chat dibuat kecil + nempel tipis di atas",
    "Tombol hapus satu aja → hapus untuk berdua, ada Undo 5 detik",
    "Panel 🗄️ buat lihat + pulihkan pesan yang udah dihapus",
    "Edit pesan text: ✏️ di menu reaction, ada tag (edited)",
    "Jadwalkan pesan ⏰ — pilih waktu, dikirim otomatis",
    "Link otomatis tampil kartu preview, emoji picker searchable + skin-tone",
];

const payload = {
    version: VERSION,
    builtAt: new Date().toISOString(),
    highlights: HIGHLIGHTS,
};

const outPath = path.join(__dirname, "..", "public", "version.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log("version.json →", VERSION, "(" + HIGHLIGHTS.length + " highlights)");
