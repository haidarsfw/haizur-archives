#!/usr/bin/env node
/**
 * parseAllPlatforms.js — v2.0
 *
 * Parses chat archives from WhatsApp, Instagram, TikTok, iMessage, and Discord
 * into unified JSON files for the "haizur archives" website.
 * Now includes ALL media messages (images, videos, audio, stickers, calls).
 *
 * Usage: node scripts/parseAllPlatforms.cjs
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ARCHIVE_ROOT = path.join(process.env.HOME, "Documents", "Azhura's Archive");
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const MEDIA_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'media');

// Speaker normalization
const HAIDAR_ALIASES = ['dar', 'r', 'vzmm', 'viousiee', 'Me', 'me', 'veirfouls'];
const AZHURA_ALIASES = ['azhuraaaa 💫✨🌎', 'azuraawwwrr', 'justzurawwr', 'otherzurraa', 'Nabila Azhura', 'nabila azhura'];

function normalizeSpeaker(name) {
    const trimmed = name.trim();
    if (HAIDAR_ALIASES.some(a => trimmed === a || trimmed.toLowerCase() === a.toLowerCase())) return 'p1';
    if (AZHURA_ALIASES.some(a => trimmed === a || trimmed.toLowerCase() === a.toLowerCase())) return 'p2';
    const lower = trimmed.toLowerCase();
    if (lower.includes('azhura') || lower.includes('azura') || lower.includes('zuraa') || lower.includes('justzura') || lower.includes('otherzurra') || lower.includes('nabila')) return 'p2';
    if (lower.includes('veirfouls') || lower.includes('vzmm') || lower.includes('haidar')) return 'p1';
    if (trimmed === 'dar' || trimmed === 'r') return 'p1';
    return 'p1';
}

/** Convert UTC ms timestamp → { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } in UTC+7 */
function toLocal(timestampMs) {
    const d = new Date(timestampMs + 7 * 60 * 60 * 1000);
    return {
        date: d.toISOString().split('T')[0],
        time: d.toISOString().split('T')[1].split('.')[0],
    };
}

function stripInvisible(str) {
    return str.replace(/[\u200E\u200F\u200B\u200C\u200D\uFEFF\u202A-\u202E\u2060-\u2064\u2066-\u2069]/g, '');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyFile(src, dest) {
    try {
        ensureDir(path.dirname(dest));
        fs.copyFileSync(src, dest);
        return true;
    } catch (e) {
        return false;
    }
}

// ─── HEIC CONVERSION ─────────────────────────────────────────────────────────
let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* sharp not installed — HEIC files will be copied as-is */ }

async function copyOrConvertMedia(srcPath, destPath) {
    const ext = path.extname(srcPath).toLowerCase();
    if ((ext === '.heic') && sharp) {
        try {
            const jpgDest = destPath.replace(/\.heic$/i, '.jpg');
            await sharp(srcPath).jpeg({ quality: 85 }).toFile(jpgDest);
            return { copied: true, destPath: jpgDest };
        } catch (e) {
            // Fallback: copy as-is
            const ok = copyFile(srcPath, destPath);
            return { copied: ok, destPath };
        }
    }
    const ok = copyFile(srcPath, destPath);
    return { copied: ok, destPath };
}

// ─── WHATSAPP MEDIA MATCHING ─────────────────────────────────────────────────
// Parses filename like: 00000044-PHOTO-2025-05-30-17-27-58.jpg
// Returns { index, type, date, time, timestamp, ext }
function parseWhatsAppMediaFilename(filename) {
    const match = filename.match(/^(\d+)-(PHOTO|VIDEO|AUDIO|PTT|STICKER|STICKER_PACK|GIF)-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.(\w+)$/);
    if (!match) return null;
    const [, index, mediaType, year, month, day, hour, min, sec, ext] = match;
    const timestamp = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).getTime();
    const typeMap = {
        'PHOTO': 'image', 'VIDEO': 'video', 'AUDIO': 'audio', 'PTT': 'audio',
        'STICKER': 'sticker', 'STICKER_PACK': 'sticker', 'GIF': 'gif',
    };
    const type = typeMap[mediaType] || 'image';
    return { index: parseInt(index), type, date: `${year}-${month}-${day}`, time: `${hour}:${min}:${sec}`, timestamp, ext, fileType: mediaType };
}

async function matchWhatsAppMedia(messages, mediaDir, platformLabel) {
    if (!fs.existsSync(mediaDir)) return { matched: 0, unmatched: 0, stickers: 0, videoNotes: 0, documents: 0 };

    const files = fs.readdirSync(mediaDir).filter(f => !f.startsWith('.'));
    const parsed = files.map(f => ({ filename: f, ...parseWhatsAppMediaFilename(f) })).filter(f => f.type);

    // Also find sticker files (.was) and document files
    const stickerFiles = files.filter(f => /\.was$/i.test(f)).map(f => {
        const p = parseWhatsAppMediaFilename(f.replace(/\.was$/i, '.webp'));
        return p ? { filename: f, ...p, type: 'sticker' } : null;
    }).filter(Boolean);

    const documentExts = /\.(pdf|docx?|pptx?|xlsx?|txt|vcf|csv|zip|rar)$/i;
    const documentFiles = files.filter(f => documentExts.test(f));

    // Group parsed files by type (including sticker, gif)
    const byType = { image: [], video: [], audio: [], sticker: [], gif: [] };
    for (const f of parsed) {
        if (byType[f.type]) byType[f.type].push(f);
        else byType[f.type] = [f];
    }
    // Add sticker files
    for (const f of stickerFiles) byType.sticker.push(f);

    // Sort each group by index (sequential order from filename)
    for (const type in byType) byType[type].sort((a, b) => a.index - b.index);

    const TOLERANCE_1 = 120 * 1000; // First pass: ±120 seconds
    const TOLERANCE_2 = 300 * 1000; // Second pass: ±300 seconds
    let matched = 0, unmatched = 0, stickerMatched = 0, videoNoteMatched = 0, documentMatched = 0;
    const usedFiles = new Set();

    // Per-type pointer for sequential matching
    const typePointers = {};
    for (const type in byType) typePointers[type] = 0;

    // Helper: find next file in sequential order with lookahead for best timestamp match
    function findNextSequentialFile(msg, fileType, tolerance, pointers) {
        const pool = byType[fileType];
        if (!pool) return null;

        // Advance pointer past used files
        while (pointers[fileType] < pool.length && usedFiles.has(pool[pointers[fileType]].filename)) {
            pointers[fileType]++;
        }
        if (pointers[fileType] >= pool.length) return null;

        // Lookahead: scan up to 10 files ahead to find best timestamp match
        // Handles minor ordering differences from timezone/clock skew
        let bestFile = null;
        let bestDiff = Infinity;
        let bestIdx = -1;
        const start = pointers[fileType];
        const end = Math.min(start + 10, pool.length);

        for (let i = start; i < end; i++) {
            if (usedFiles.has(pool[i].filename)) continue;
            const diff = Math.abs(pool[i].timestamp - msg.timestamp);
            if (diff < tolerance && diff < bestDiff) {
                bestDiff = diff;
                bestFile = pool[i];
                bestIdx = i;
            }
        }

        // Advance pointer past the match to maintain sequential order
        if (bestFile && bestIdx >= 0) {
            pointers[fileType] = bestIdx + 1;
        }

        return bestFile;
    }

    // Helper: copy and assign media path
    async function assignMedia(msg, bestFile, subdir) {
        usedFiles.add(bestFile.filename);
        let destFilename = bestFile.filename;
        // Rename .was to .webp for stickers
        if (destFilename.endsWith('.was')) destFilename = destFilename.replace(/\.was$/i, '.webp');
        const destRelPath = `media/${platformLabel}/${subdir}/${destFilename}`;
        const srcPath = path.join(mediaDir, bestFile.filename);
        const destFullPath = path.join(__dirname, '..', 'public', destRelPath);
        const result = await copyOrConvertMedia(srcPath, destFullPath);
        if (result.copied) {
            const finalRelPath = result.destPath.includes('/public/')
                ? result.destPath.split('/public/')[1]
                : destRelPath;
            msg.mediaPath = finalRelPath;
            return true;
        }
        return false;
    }

    // Pass 1: ±120 seconds
    const unmatchedMsgs = [];
    for (const msg of messages) {
        if (msg.platform !== platformLabel) continue;
        if (!msg.type || msg.type === 'text' || msg.type === 'call' || msg.type === 'poll' || msg.type === 'contact' || msg.type === 'location') continue;
        if (msg.mediaPath) continue;

        let fileType, subdir;
        if (msg.type === 'sticker') { fileType = 'sticker'; subdir = 'stickers'; }
        else if (msg.type === 'gif') { fileType = 'gif'; subdir = 'photos'; }
        else if (msg.type === 'image') { fileType = 'image'; subdir = 'photos'; }
        else if (msg.type === 'video') { fileType = 'video'; subdir = 'videos'; }
        else if (msg.type === 'video_note') { fileType = 'video'; subdir = 'video_notes'; }
        else if (msg.type === 'audio') { fileType = 'audio'; subdir = 'voice_notes'; }
        else if (msg.type === 'document') { fileType = null; subdir = 'documents'; }
        else continue;

        // Sticker: try sticker pool only (no fallback to image pool)
        if (msg.type === 'sticker') {
            let bestFile = findNextSequentialFile(msg, 'sticker', TOLERANCE_1, typePointers);
            if (bestFile) {
                if (await assignMedia(msg, bestFile, subdir)) { matched++; stickerMatched++; }
            } else {
                unmatchedMsgs.push(msg);
            }
            continue;
        }

        // Video note: match from video pool
        if (msg.type === 'video_note') {
            const bestFile = findNextSequentialFile(msg, 'video', TOLERANCE_1, typePointers);
            if (bestFile) {
                if (await assignMedia(msg, bestFile, subdir)) { matched++; videoNoteMatched++; }
            } else {
                unmatchedMsgs.push(msg);
            }
            continue;
        }

        // Document: match by timestamp proximity from document files list
        if (msg.type === 'document') {
            // Documents don't have parsed timestamps, skip for now (handled in pass 2)
            unmatchedMsgs.push(msg);
            continue;
        }

        if (!fileType) { unmatchedMsgs.push(msg); continue; }

        const bestFile = findNextSequentialFile(msg, fileType, TOLERANCE_1, typePointers);
        if (bestFile) {
            if (await assignMedia(msg, bestFile, subdir)) matched++;
        } else {
            unmatchedMsgs.push(msg);
        }
    }

    // Pass 2: ±300 seconds for remaining unmatched — reset pointers
    const typePointers2 = {};
    for (const type in byType) typePointers2[type] = 0;
    for (const msg of unmatchedMsgs) {
        if (msg.mediaPath) continue;
        if (msg.type === 'document') { unmatched++; continue; }

        let fileType, subdir;
        if (msg.type === 'sticker') { fileType = 'sticker'; subdir = 'stickers'; }
        else if (msg.type === 'gif') { fileType = 'gif'; subdir = 'photos'; }
        else if (msg.type === 'image') { fileType = 'image'; subdir = 'photos'; }
        else if (msg.type === 'video') { fileType = 'video'; subdir = 'videos'; }
        else if (msg.type === 'video_note') { fileType = 'video'; subdir = 'video_notes'; }
        else if (msg.type === 'audio') { fileType = 'audio'; subdir = 'voice_notes'; }
        else { unmatched++; continue; }

        const bestFile = findNextSequentialFile(msg, fileType, TOLERANCE_2, typePointers2);
        if (bestFile) {
            if (await assignMedia(msg, bestFile, subdir)) matched++;
            else unmatched++;
        } else {
            unmatched++;
        }
    }

    // Match document files by sequential order within the same date
    const docMessages = messages.filter(m => m.platform === platformLabel && m.type === 'document' && !m.mediaPath)
        .sort((a, b) => a.timestamp - b.timestamp);
    if (documentFiles.length > 0 && docMessages.length > 0) {
        const matchCount = Math.min(documentFiles.length, docMessages.length);
        for (let i = 0; i < matchCount; i++) {
            const filename = documentFiles[i];
            const msg = docMessages[i];
            const destRelPath = `media/${platformLabel}/documents/${filename}`;
            const srcPath = path.join(mediaDir, filename);
            const destFullPath = path.join(__dirname, '..', 'public', destRelPath);
            if (copyFile(srcPath, destFullPath)) {
                msg.mediaPath = destRelPath;
                msg.fileName = filename;
                documentMatched++;
                matched++;
            }
        }
    }

    // Live photo classification: videos ≤3.5s → reclassify as image
    let livePhotoCount = 0;
    try {
        const { execSync } = require('child_process');
        for (const msg of messages) {
            if (msg.platform !== platformLabel) continue;
            if (msg.type !== 'video' || !msg.mediaPath) continue;
            const fullPath = path.join(__dirname, '..', 'public', msg.mediaPath);
            if (!fs.existsSync(fullPath)) continue;
            try {
                const durationStr = execSync(
                    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${fullPath}"`,
                    { timeout: 5000, encoding: 'utf-8' }
                ).trim();
                const duration = parseFloat(durationStr);
                if (!isNaN(duration)) {
                    msg.duration = Math.round(duration * 10) / 10;
                    if (duration <= 3.5) {
                        msg.type = 'image';
                        msg.isLivePhoto = true;
                        // Keep mediaType as 'video' so it still plays
                        livePhotoCount++;
                    }
                }
            } catch { /* ffprobe not available or failed for this file */ }
        }
    } catch { /* child_process not available */ }
    if (livePhotoCount > 0) console.log(`    Reclassified ${livePhotoCount} live photos (video ≤3.5s → image)`);

    console.log(`    Stickers matched: ${stickerMatched}, Video notes matched: ${videoNoteMatched}, Documents matched: ${documentMatched}`);
    return { matched, unmatched, stickers: stickerMatched, videoNotes: videoNoteMatched, documents: documentMatched };
}

// ─── IMESSAGE MEDIA MATCHING ─────────────────────────────────────────────────
async function matchIMessageMedia(messages, mediaDir, voiceNotesDir) {
    let matched = 0, unmatched = 0;

    // 1. Match images by attachment number
    if (fs.existsSync(mediaDir)) {
        // Build number → file lookup from ALL image files in media/
        const allImageFiles = fs.readdirSync(mediaDir)
            .filter(f => !f.startsWith('.') && /\.(heic|jpg|jpeg|png|gif|webp)$/i.test(f))
            .map(f => ({ filename: f, num: parseInt(f), ext: path.extname(f).toLowerCase() }))
            .filter(f => !isNaN(f.num));

        const fileLookup = {};
        for (const f of allImageFiles) {
            if (!fileLookup[f.num]) fileLookup[f.num] = f;
        }

        // Match each unmatched image message by its attachmentNum
        const imageMessages = messages.filter(m =>
            m.platform === 'imessage' && m.type === 'image' && !m.mediaPath
        );

        for (const msg of imageMessages) {
            if (!msg.attachmentNum || !fileLookup[msg.attachmentNum]) {
                unmatched++;
                continue;
            }
            const file = fileLookup[msg.attachmentNum];
            const destExt = file.ext === '.heic' ? '.jpg' : file.ext;
            const destFilename = `${file.num}${destExt}`;
            const destRelPath = `media/imessage/photos/${destFilename}`;
            const srcPath = path.join(mediaDir, file.filename);
            const destFullPath = path.join(__dirname, '..', 'public', destRelPath);

            const result = await copyOrConvertMedia(srcPath, destFullPath);
            if (result.copied) {
                const finalRelPath = result.destPath.includes('/public/')
                    ? result.destPath.split('/public/')[1] : destRelPath;
                msg.mediaPath = finalRelPath;
                matched++;
            } else { unmatched++; }
        }
    }

    // 2. Match voice notes by attachment number
    if (fs.existsSync(voiceNotesDir)) {
        const cafFiles = fs.readdirSync(voiceNotesDir)
            .filter(f => f.endsWith('.caf'))
            .map(f => ({ filename: f, num: parseInt(f.replace('.caf', '')) }))
            .filter(f => !isNaN(f.num));

        const cafLookup = {};
        for (const f of cafFiles) cafLookup[f.num] = f;

        const audioMessages = messages.filter(m =>
            m.platform === 'imessage' && m.type === 'audio' && !m.mediaPath
        );

        for (const msg of audioMessages) {
            if (!msg.attachmentNum || !cafLookup[msg.attachmentNum]) {
                unmatched++;
                continue;
            }
            const file = cafLookup[msg.attachmentNum];
            const destRelPath = `media/imessage/voice_notes/${file.filename}`;
            const srcPath = path.join(voiceNotesDir, file.filename);
            const destFullPath = path.join(__dirname, '..', 'public', destRelPath);

            if (copyFile(srcPath, destFullPath)) {
                msg.mediaPath = destRelPath;
                matched++;
            }
        }
    }

    console.log(`    Matched: ${matched}, Unmatched: ${unmatched}`);
    return { matched, unmatched };
}

// ─── WHATSAPP PARSER ──────────────────────────────────────────────────────────
function parseWhatsApp(filePath, platformLabel) {
    console.log(`  Parsing WhatsApp: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const messages = [];

    const lineRegex = /^\s*\[(\d{2}\/\d{2}\/\d{2}),\s*(\d{2}\.\d{2}\.\d{2})\]\s*(.+?):\s*(.*)$/;

    // System messages to truly skip (not media)
    const systemSkips = [
        'Messages and calls are end-to-end encrypted',
        'You deleted this message',
        'This message was deleted',
    ];

    // Media patterns → type mapping
    const mediaPatterns = [
        { pattern: 'image omitted', type: 'image', text: '[Photo]' },
        { pattern: 'video note omitted', type: 'video_note', text: '[Video Note]' },
        { pattern: 'video omitted', type: 'video', text: '[Video]' },
        { pattern: 'audio omitted', type: 'audio', text: '[Voice Note]' },
        { pattern: 'sticker omitted', type: 'sticker', text: '[Sticker]' },
        { pattern: 'GIF omitted', type: 'gif', text: '[GIF]' },
        { pattern: 'document omitted', type: 'document', text: '[Document]' },
        { pattern: 'Contact card omitted', type: 'contact', text: '[Contact]' },
        { pattern: 'location omitted', type: 'location', text: '[Location]' },
    ];

    // Call patterns
    const callPatterns = [
        { pattern: 'Voice call', type: 'call' },
        { pattern: 'Video call', type: 'call' },
        { pattern: 'Missed voice call', type: 'call' },
        { pattern: 'Missed video call', type: 'call' },
    ];

    let currentMsg = null;

    for (const line of lines) {
        const cleanLine = stripInvisible(line).replace(/\r/g, '');
        const match = cleanLine.match(lineRegex);
        if (match) {
            if (currentMsg && currentMsg.text.trim()) {
                messages.push(currentMsg);
            }

            const [, dateStr, timeStr, speaker, text] = match;
            const cleanText = stripInvisible(text).replace(/\r/g, '').trim();

            // Parse date
            const [day, month, year] = dateStr.split('/');
            const [hour, minute, second] = timeStr.split('.');
            const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
            const isoDate = `${fullYear}-${month}-${day}`;
            const isoTime = `${hour}:${minute}:${second}`;
            const timestamp = new Date(`${fullYear}-${month}-${day}T${hour}:${minute}:${second}`).getTime() || 0;

            // Check system skips
            if (systemSkips.some(p => cleanText.includes(p) || cleanLine.includes(p))) {
                currentMsg = null;
                continue;
            }

            // Check for media messages
            const mediaMatch = mediaPatterns.find(mp => cleanText.includes(mp.pattern) || cleanLine.includes(mp.pattern));
            if (mediaMatch) {
                messages.push({
                    platform: platformLabel,
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker.trim(),
                    text: mediaMatch.text,
                    date: isoDate,
                    time: isoTime,
                    timestamp,
                    type: mediaMatch.type,
                    mediaType: mediaMatch.type === 'image' || mediaMatch.type === 'sticker' || mediaMatch.type === 'gif' ? 'image' :
                        mediaMatch.type === 'video' || mediaMatch.type === 'video_note' ? 'video' :
                            mediaMatch.type === 'audio' ? 'audio' : null,
                });
                currentMsg = null;
                continue;
            }

            // Check for call messages
            const callMatch = callPatterns.find(cp => cleanText.includes(cp.pattern) || cleanLine.includes(cp.pattern));
            if (callMatch) {
                const durationMatch = cleanText.match(/lasted (\d+) minutes?/);
                messages.push({
                    platform: platformLabel,
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker.trim(),
                    text: cleanText,
                    date: isoDate,
                    time: isoTime,
                    timestamp,
                    type: 'call',
                    callDuration: durationMatch ? parseInt(durationMatch[1]) : 0,
                });
                currentMsg = null;
                continue;
            }

            // Skip empty
            if (!cleanText) {
                currentMsg = null;
                continue;
            }

            currentMsg = {
                platform: platformLabel,
                speaker: normalizeSpeaker(speaker),
                speakerRaw: speaker.trim(),
                text: cleanText,
                date: isoDate,
                time: isoTime,
                timestamp,
                type: 'text'
            };

            // Detect polls
            if (cleanText.startsWith('POLL:') || cleanText.includes('POLL:')) {
                currentMsg.type = 'poll';
            }
        } else if (currentMsg) {
            const cl = line.replace(/\r/g, '').trim();
            if (cl && !systemSkips.some(p => cl.includes(p))) {
                currentMsg.text += '\n' + cl;
            }
        }
    }

    if (currentMsg && currentMsg.text.trim()) {
        messages.push(currentMsg);
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`    -> ${messages.length} messages parsed`);
    return messages;
}

// ─── DISCORD PARSER ───────────────────────────────────────────────────────────
function parseDiscord(filePath) {
    console.log(`  Parsing Discord: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const messages = [];

    const headerRegex = /^\[(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\.\d{2})\]\s+(.+)$/;

    let currentSpeaker = null;
    let currentDate = null;
    let currentTime = null;
    let currentTimestamp = 0;
    let currentText = [];
    let attachmentUrls = [];
    let inAttachments = false;
    let inReactions = false;

    function flush() {
        if (currentSpeaker && currentText.length > 0) {
            const text = currentText.join('\n').trim();
            if (text && !text.startsWith('Started a call') && !text.startsWith('Shared from')) {
                messages.push({
                    platform: 'discord',
                    speaker: normalizeSpeaker(currentSpeaker),
                    speakerRaw: currentSpeaker,
                    text: text,
                    date: currentDate,
                    time: currentTime,
                    timestamp: currentTimestamp,
                    type: 'text'
                });
            }
            if (text && text.startsWith('Started a call')) {
                const durationMatch = text.match(/lasted (\d+) minutes/);
                messages.push({
                    platform: 'discord',
                    speaker: normalizeSpeaker(currentSpeaker),
                    speakerRaw: currentSpeaker,
                    text: text,
                    date: currentDate,
                    time: currentTime,
                    timestamp: currentTimestamp,
                    type: 'call',
                    callDuration: durationMatch ? parseInt(durationMatch[1]) : 0
                });
            }
        }
        // Capture attachment URLs as separate messages
        if (currentSpeaker && attachmentUrls.length > 0) {
            for (const url of attachmentUrls) {
                const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(url);
                const isAudio = /\.(mp3|ogg|wav)(\?|$)/i.test(url);
                messages.push({
                    platform: 'discord',
                    speaker: normalizeSpeaker(currentSpeaker),
                    speakerRaw: currentSpeaker,
                    text: isImage ? '[Photo]' : isVideo ? '[Video]' : isAudio ? '[Audio]' : '[Attachment]',
                    date: currentDate,
                    time: currentTime,
                    timestamp: currentTimestamp,
                    type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'attachment',
                    mediaPath: url,
                    mediaType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : null,
                });
            }
        }
        currentText = [];
        attachmentUrls = [];
        inAttachments = false;
        inReactions = false;
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('===') || trimmed.startsWith('Guild:') || trimmed.startsWith('Channel:')) continue;

        const headerMatch = trimmed.match(headerRegex);
        if (headerMatch) {
            flush();
            const [, dateStr, timeStr, speaker] = headerMatch;
            const [day, month, year] = dateStr.split('/');
            const [hour, minute] = timeStr.split('.');

            currentSpeaker = speaker.trim();
            currentDate = `${year}-${month}-${day}`;
            currentTime = `${hour}:${minute}:00`;
            currentTimestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).getTime() || 0;
            inAttachments = false;
            inReactions = false;
            continue;
        }

        if (trimmed === '{Attachments}') { inAttachments = true; continue; }
        if (trimmed === '{Reactions}') { inReactions = true; continue; }
        if (inAttachments && trimmed.startsWith('http')) {
            attachmentUrls.push(trimmed);
            continue;
        }
        if (inAttachments && trimmed === '') continue;
        if (inReactions) { if (trimmed === '') inReactions = false; continue; }
        if (trimmed === '') continue;

        if (currentSpeaker && (currentSpeaker.includes('#') && !['vzmm', 'azuraawwwrr'].includes(currentSpeaker))) continue;

        currentText.push(trimmed);
    }
    flush();

    console.log(`    -> ${messages.length} messages parsed`);
    return messages;
}

// ─── TIKTOK PARSER ────────────────────────────────────────────────────────────
function parseTikTok(filePath) {
    console.log(`  Parsing TikTok: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const messages = [];

    const lineRegex = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC\s+(\w+):\s*(.*)$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('>>>')) continue;

        const match = trimmed.match(lineRegex);
        if (match) {
            const [, date, time, speaker, text] = match;
            let cleanText = text.trim();
            if (!cleanText) continue;

            let type = 'text';
            let mediaType = null;
            let originalPath = null;
            if (cleanText.startsWith('https://www.tiktokv.com/')) type = 'tiktok_link';
            if (cleanText.startsWith('Camera_Image/')) {
                type = 'image'; mediaType = 'image';
                originalPath = cleanText;
                cleanText = '[Photo]';
            }
            if (cleanText.startsWith('Camera_Video/')) {
                type = 'video'; mediaType = 'video';
                originalPath = cleanText;
                cleanText = '[Video]';
            }
            if (cleanText.startsWith('[https://media.tenor.com/')) { type = 'sticker'; mediaType = 'image'; }

            const timestamp = new Date(`${date}T${time}Z`).getTime();
            const local = toLocal(timestamp);

            const msg = {
                platform: 'tiktok',
                speaker: normalizeSpeaker(speaker),
                speakerRaw: speaker,
                text: cleanText,
                date: local.date,
                time: local.time,
                timestamp,
                type,
            };
            if (mediaType) msg.mediaType = mediaType;
            messages.push(msg);
        }
    }

    messages.reverse();
    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`    -> ${messages.length} messages parsed`);
    return messages;
}

// ─── IMESSAGE PARSER ──────────────────────────────────────────────────────────
function parseIMessage(filePath) {
    console.log(`  Parsing iMessage: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const messages = [];

    const dateRegex = /^([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+(\d{1,2}:\d{2}:\d{2}\s+[AP]M)/;

    let currentDate = null;
    let currentTime = null;
    let currentTimestamp = 0;
    let currentSpeaker = null;
    let collectingMessage = false;
    let messageLines = [];

    const skipPatterns = [
        'This message responded to an earlier message',
        'Sent with Echo', 'Sent with Lasers', 'Sent with Fireworks',
        'Sent with Confetti', 'Sent with Sparkles', 'Sent with Loud',
        'Sent with Gentle', 'Sent with Slam',
        'Digital Touch Message',
        'Loved "', 'Liked "', 'Laughed at "', 'Emphasized "', 'Questioned "', 'Disliked "'
    ];

    // Voice notes directory
    const voiceNotesDir = path.join(ARCHIVE_ROOT, 'iMessage', 'Voice Notes');
    const voiceNoteFiles = fs.existsSync(voiceNotesDir) ? fs.readdirSync(voiceNotesDir).filter(f => f.endsWith('.caf')) : [];

    function flush() {
        if (currentSpeaker && messageLines.length > 0) {
            let text = messageLines.join('\n').trim();
            if (text && !skipPatterns.some(p => text.includes(p)) && text.length > 0) {
                let type = 'text';
                let mediaPath = null;
                let mediaType = null;
                let attachmentNum = NaN;

                // Handle attachment paths (e.g., "attachments/62/88.PNG\ngua juga deh spam foto")
                if (text.startsWith('attachments/')) {
                    const firstLine = text.split('\n')[0].trim();
                    const restText = text.split('\n').slice(1).join('\n').trim();
                    const lower = firstLine.toLowerCase();
                    attachmentNum = parseInt(path.basename(firstLine));  // e.g., 2790 from "attachments/62/2790.PNG"

                    if (lower.match(/\.(jpg|jpeg|png|heic|gif|webp)$/i)) {
                        type = 'image'; mediaType = 'image';
                    } else if (lower.match(/\.(mp4|mov|m4v)$/i)) {
                        type = 'video'; mediaType = 'video';
                    } else if (lower.match(/\.(caf|mp3|m4a|aac|wav)$/i)) {
                        type = 'audio'; mediaType = 'audio';
                    } else {
                        type = 'attachment';
                    }

                    // Try to find and copy the actual file
                    const imessDir = path.join(ARCHIVE_ROOT, 'iMessage');
                    const srcFilePath = path.join(imessDir, firstLine);
                    if (fs.existsSync(srcFilePath)) {
                        const filename = path.basename(firstLine);
                        const subdir = (type === 'image') ? 'photos' :
                            (type === 'video') ? 'videos' :
                                (type === 'audio') ? 'voice_notes' : 'attachments';
                        const destFilename = filename.replace(/\.heic$/i, '.jpg');
                        const destRelPath = `media/imessage/${subdir}/${destFilename}`;
                        const destFullPath = path.join(__dirname, '..', 'public', destRelPath);
                        ensureDir(path.dirname(destFullPath));
                        if (copyFile(srcFilePath, destFullPath)) {
                            mediaPath = destRelPath;
                        }
                    }

                    // If there's text after the attachment path, push media first then text
                    if (restText) {
                        messages.push({
                            platform: 'imessage',
                            speaker: normalizeSpeaker(currentSpeaker),
                            speakerRaw: currentSpeaker,
                            text: type === 'image' ? '[Photo]' : type === 'video' ? '[Video]' : type === 'audio' ? '[Voice Note]' : '[Attachment]',
                            date: currentDate, time: currentTime, timestamp: currentTimestamp,
                            type, ...(mediaPath ? { mediaPath } : {}), ...(mediaType ? { mediaType } : {}),
                            ...(!isNaN(attachmentNum) ? { attachmentNum } : {}),
                        });
                        // Also push the text portion as a separate message
                        messages.push({
                            platform: 'imessage',
                            speaker: normalizeSpeaker(currentSpeaker),
                            speakerRaw: currentSpeaker,
                            text: restText,
                            date: currentDate, time: currentTime, timestamp: currentTimestamp,
                            type: 'text',
                        });
                        messageLines = [];
                        collectingMessage = false;
                        return; // Already pushed both messages
                    }
                }
                if (text.includes('apple.com/')) type = 'music_link';

                const msg = {
                    platform: 'imessage',
                    speaker: normalizeSpeaker(currentSpeaker),
                    speakerRaw: currentSpeaker,
                    text: type === 'image' ? '[Photo]' : type === 'video' ? '[Video]' : type === 'audio' ? '[Voice Note]' : text,
                    date: currentDate,
                    time: currentTime,
                    timestamp: currentTimestamp,
                    type,
                };
                if (mediaPath) msg.mediaPath = mediaPath;
                if (mediaType) msg.mediaType = mediaType;
                if (!isNaN(attachmentNum)) msg.attachmentNum = attachmentNum;
                messages.push(msg);
            }
        }
        messageLines = [];
        collectingMessage = false;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;

        const dateMatch = trimmed.match(dateRegex);
        if (dateMatch) {
            const [, dateStr, timeStr] = dateMatch;
            try {
                const d = new Date(`${dateStr} ${timeStr}`);
                if (!isNaN(d.getTime())) {
                    let nextLine = '';
                    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                        const nl = lines[j].trim();
                        if (nl && !nl.match(dateRegex)) {
                            nextLine = nl;
                            break;
                        }
                    }
                    if (nextLine === 'Me' || nextLine.includes('azhura')) {
                        flush();
                        currentTimestamp = d.getTime();
                        const local = toLocal(currentTimestamp);
                        currentDate = local.date;
                        currentTime = local.time;
                    }
                }
            } catch (e) { }
            continue;
        }

        if (trimmed === 'Me' || trimmed.match(/^azhuraaaa/)) {
            flush();
            currentSpeaker = trimmed;
            collectingMessage = true;
            continue;
        }

        if (skipPatterns.some(p => trimmed.includes(p))) continue;
        if (trimmed.startsWith('(Read by')) continue;
        if (line.startsWith('    ')) continue;  // Skip indented reply quotes

        if (collectingMessage && currentSpeaker) {
            messageLines.push(trimmed);
        }
    }
    flush();

    // Copy voice notes to public/media/imessage/voice_notes/
    if (voiceNoteFiles.length > 0) {
        const destDir = path.join(MEDIA_OUTPUT_DIR, 'imessage', 'voice_notes');
        ensureDir(destDir);
        let copied = 0;
        for (const vn of voiceNoteFiles) {
            const src = path.join(voiceNotesDir, vn);
            const dest = path.join(destDir, vn);
            if (copyFile(src, dest)) copied++;
        }
        console.log(`    Copied ${copied} voice note .caf files to public/media/imessage/voice_notes/`);
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`    -> ${messages.length} messages parsed`);
    return messages;
}

// ─── FACETIME PARSER ─────────────────────────────────────────────────────────
function parseFaceTime(filePath) {
    console.log(`  Parsing FaceTime: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const messages = [];

    for (const line of lines) {
        const parts = line.trim().split('|');
        if (parts.length < 5) continue;

        const [datetime, , durationStr, , direction] = parts;
        const durationSeconds = parseFloat(durationStr);
        const minutes = Math.round(durationSeconds / 60);

        const d = new Date(datetime);
        if (isNaN(d.getTime())) continue;

        const local = toLocal(d.getTime());
        const date = local.date;
        const time = local.time;
        const speaker = direction.trim() === 'Masuk' ? 'p2' : 'p1';

        messages.push({
            platform: 'facetime',
            speaker,
            speakerRaw: speaker === 'p2' ? 'Azhura' : 'Haidar',
            text: `FaceTime call lasted ${minutes} minutes`,
            date,
            time,
            timestamp: d.getTime(),
            type: 'call',
            callDuration: minutes,
        });
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`    -> ${messages.length} calls parsed`);
    return messages;
}

// ─── INSTAGRAM PARSER ─────────────────────────────────────────────────────────
function parseInstagram(dirPath, accountSlug) {
    console.log(`  Parsing Instagram from: ${dirPath}`);
    const allMessages = [];

    const files = fs.readdirSync(dirPath)
        .filter(f => f.startsWith('message_') && f.endsWith('.html'))
        .sort();

    const speakerPattern = /<h2[^>]*class="[^"]*_2pim[^"]*"[^>]*>(.*?)<\/h2>/;
    const datePattern = /<div class="_3-94 _a6-o">(.*?)<\/div>/;

    // Media regex patterns for Instagram HTML
    const imgPattern = /<img src="(your_instagram_activity[^"]*\.(jpg|jpeg|png|gif|webp))"/gi;
    const videoPattern = /<video src="(your_instagram_activity[^"]*\.(mp4|mov))"/gi;
    const audioPattern = /<audio src="(your_instagram_activity[^"]*\.(mp4|m4a|mp3))"/gi;

    let mediaCopied = { photos: 0, videos: 0, audio: 0 };

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const blocks = content.split('<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">');

        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];

            const speakerMatch = block.match(speakerPattern);
            if (!speakerMatch) continue;
            const speaker = speakerMatch[1].trim();

            const dateMatch = block.match(datePattern);
            let timestamp = 0, date = '', time = '';
            if (dateMatch) {
                try {
                    const d = new Date(dateMatch[1].trim());
                    if (!isNaN(d.getTime())) {
                        timestamp = d.getTime();
                        const local = toLocal(timestamp);
                        date = local.date;
                        time = local.time;
                    }
                } catch (e) { }
            }

            const contentArea = block.split(/<div class="_3-94 _a6-o">/)[0];

            // Check for media in this block
            const imgMatches = [...contentArea.matchAll(/<img src="(your_instagram_activity[^"]*\.(jpg|jpeg|png|gif|webp))"/gi)];
            const videoMatches = [...contentArea.matchAll(/<video src="(your_instagram_activity[^"]*\.(mp4|mov))"/gi)];
            const audioMatches = [...contentArea.matchAll(/<audio src="(your_instagram_activity[^"]*\.(mp4|m4a|mp3))"/gi)];

            const hasMedia = imgMatches.length > 0 || videoMatches.length > 0 || audioMatches.length > 0;

            // Extract text content
            const textDivs = contentArea.match(/<div>([^<]+)<\/div>/g);
            let messageText = '';
            if (textDivs) {
                const texts = textDivs
                    .map(d => d.replace(/<\/?div>/g, '').trim())
                    .filter(t => t.length > 0 && t !== 'You sent an attachment.' && !t.startsWith('<'));
                messageText = texts.join(' ').trim();
            }

            // Decode HTML entities
            if (messageText) {
                messageText = messageText
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'")
                    .replace(/&#064;/g, '@');
            }

            // Create media messages
            for (const m of imgMatches) {
                const srcPath = m[1];
                let filename = path.basename(srcPath);
                // Add .jpg extension if missing (Instagram files often lack extensions)
                if (!path.extname(filename)) filename += '.jpg';
                const destRelPath = `media/instagram/${accountSlug}/photos/${filename}`;
                const destFullPath = path.join(__dirname, '..', 'public', destRelPath);

                // Copy media file
                const srcFullPath = path.join(dirPath, '..', '..', srcPath);
                const altSrcPath = path.join(dirPath, srcPath.split('/').pop());
                const photosDir = path.join(dirPath, 'photos', filename);
                let copied = false;
                for (const tryPath of [srcFullPath, altSrcPath, photosDir]) {
                    if (fs.existsSync(tryPath)) {
                        copied = copyFile(tryPath, destFullPath);
                        break;
                    }
                }
                // Try from archive root
                if (!copied) {
                    const archiveSrc = path.join(ARCHIVE_ROOT, 'Instagram', path.basename(dirPath), 'photos', filename);
                    if (fs.existsSync(archiveSrc)) {
                        copied = copyFile(archiveSrc, destFullPath);
                    }
                }
                if (copied) mediaCopied.photos++;

                allMessages.push({
                    platform: 'instagram',
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker,
                    text: '[Photo]',
                    date, time, timestamp,
                    type: 'image',
                    ...(copied ? { mediaPath: destRelPath } : {}),
                    mediaType: 'image',
                });
            }

            for (const m of videoMatches) {
                const srcPath = m[1];
                let filename = path.basename(srcPath);
                if (!path.extname(filename)) filename += '.mp4';
                const destRelPath = `media/instagram/${accountSlug}/videos/${filename}`;
                const destFullPath = path.join(__dirname, '..', 'public', destRelPath);

                let videoCopied = false;
                const archiveSrc = path.join(dirPath, 'videos', filename);
                if (fs.existsSync(archiveSrc)) {
                    videoCopied = copyFile(archiveSrc, destFullPath);
                    if (videoCopied) mediaCopied.videos++;
                }

                allMessages.push({
                    platform: 'instagram',
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker,
                    text: '[Video]',
                    date, time, timestamp,
                    type: 'video',
                    ...(videoCopied ? { mediaPath: destRelPath } : {}),
                    mediaType: 'video',
                });
            }

            for (const m of audioMatches) {
                const srcPath = m[1];
                const filename = path.basename(srcPath);
                const destRelPath = `media/instagram/${accountSlug}/audio/${filename}`;
                const destFullPath = path.join(__dirname, '..', 'public', destRelPath);

                let audioCopied = false;
                const archiveSrc = path.join(dirPath, 'audio', filename);
                if (fs.existsSync(archiveSrc)) {
                    audioCopied = copyFile(archiveSrc, destFullPath);
                    if (audioCopied) mediaCopied.audio++;
                }

                allMessages.push({
                    platform: 'instagram',
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker,
                    text: '[Voice Note]',
                    date, time, timestamp,
                    type: 'audio',
                    ...(audioCopied ? { mediaPath: destRelPath } : {}),
                    mediaType: 'audio',
                });
            }

            // Also add text message if there's actual text content (separate from media)
            if (messageText && messageText !== 'You sent an attachment.') {
                allMessages.push({
                    platform: 'instagram',
                    speaker: normalizeSpeaker(speaker),
                    speakerRaw: speaker,
                    text: messageText,
                    date, time, timestamp,
                    type: 'text'
                });
            } else if (!hasMedia && !messageText) {
                // Skip blocks with no text and no media
                continue;
            }
        }
    }

    // Copy remaining media files that may not have been referenced in HTML
    const mediaTypes = ['photos', 'videos', 'audio'];
    for (const mediaType of mediaTypes) {
        const mediaDir = path.join(dirPath, mediaType);
        if (fs.existsSync(mediaDir)) {
            const files = fs.readdirSync(mediaDir).filter(f => !f.startsWith('.'));
            const destDir = path.join(MEDIA_OUTPUT_DIR, 'instagram', accountSlug, mediaType);
            ensureDir(destDir);
            let copied = 0;
            for (const file of files) {
                // Add extension if missing
                let destFile = file;
                if (!path.extname(file)) {
                    const ext = mediaType === 'photos' ? '.jpg' : mediaType === 'videos' ? '.mp4' : '';
                    destFile = file + ext;
                }
                const destPath = path.join(destDir, destFile);
                if (!fs.existsSync(destPath)) {
                    if (copyFile(path.join(mediaDir, file), destPath)) copied++;
                }
            }
            if (copied > 0) console.log(`    Copied ${copied} additional ${mediaType} files`);
        }
    }

    console.log(`    Media copied: ${mediaCopied.photos} photos, ${mediaCopied.videos} videos, ${mediaCopied.audio} audio`);
    // Instagram HTML stores messages in REVERSE chronological order (newest first).
    // Reverse so messages come out oldest-first (chronological), matching other platforms.
    allMessages.reverse();
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`    -> ${allMessages.length} messages parsed (sorted chronologically)`);
    return allMessages;
}

// ─── STATS GENERATOR ──────────────────────────────────────────────────────────
function generateStats(allMessages) {
    console.log('\n--- Generating statistics...');

    const stats = {
        totalMessages: allMessages.length,
        byPlatform: {},
        bySpeaker: { p1: 0, p2: 0 },
        firstMessage: null,
        lastMessage: null,
        totalDays: 0,
        avgMessagesPerDay: 0,
        topWords: {},
        topEmojis: {},
        callStats: { totalCalls: 0, totalMinutes: 0 },
        mediaStats: { images: 0, videos: 0, audio: 0, stickers: 0, calls: 0, gifs: 0, video_notes: 0, documents: 0 },
        speakerNames: { p1: 'Haidar', p2: 'Azhura' }
    };

    const platforms = ['whatsapp', 'whatsapp2', 'discord', 'tiktok', 'imessage', 'instagram', 'facetime'];
    for (const p of platforms) {
        stats.byPlatform[p] = { total: 0, p1: 0, p2: 0 };
    }

    const wordFreq = {};
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu;
    // ASCII chars that match \p{Emoji} but aren't real emoji: digits 0-9, #, *
    const asciiEmojiFilter = /^[0-9#*]+$/;
    const emojiFreq = {};

    const sortedMessages = allMessages.filter(m => m.timestamp > 0).sort((a, b) => a.timestamp - b.timestamp);

    if (sortedMessages.length > 0) {
        stats.firstMessage = {
            date: sortedMessages[0].date,
            text: (sortedMessages[0].text || '').substring(0, 100),
            platform: sortedMessages[0].platform
        };
        stats.lastMessage = {
            date: sortedMessages[sortedMessages.length - 1].date,
            text: (sortedMessages[sortedMessages.length - 1].text || '').substring(0, 100),
            platform: sortedMessages[sortedMessages.length - 1].platform
        };
        const firstDate = new Date(sortedMessages[0].date);
        const lastDate = new Date(sortedMessages[sortedMessages.length - 1].date);
        stats.totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        stats.avgMessagesPerDay = Math.round(stats.totalMessages / Math.max(stats.totalDays, 1));
    }

    for (const msg of allMessages) {
        stats.bySpeaker[msg.speaker] = (stats.bySpeaker[msg.speaker] || 0) + 1;

        if (stats.byPlatform[msg.platform]) {
            stats.byPlatform[msg.platform].total++;
            stats.byPlatform[msg.platform][msg.speaker]++;
        }

        // Call stats
        if (msg.type === 'call') {
            stats.callStats.totalCalls++;
            if (msg.callDuration) stats.callStats.totalMinutes += msg.callDuration;
            stats.mediaStats.calls++;
        }

        // Media stats
        if (msg.type === 'image') stats.mediaStats.images++;
        if (msg.type === 'video') stats.mediaStats.videos++;
        if (msg.type === 'audio') stats.mediaStats.audio++;
        if (msg.type === 'sticker') stats.mediaStats.stickers++;
        if (msg.type === 'gif') stats.mediaStats.gifs++;
        if (msg.type === 'video_note') stats.mediaStats.video_notes++;
        if (msg.type === 'document') stats.mediaStats.documents++;

        // Word frequency (only for text messages)
        if (msg.type === 'text' && msg.text) {
            const words = msg.text.toLowerCase().split(/\s+/);
            for (const word of words) {
                const clean = word.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '');
                if (clean.length >= 3) {
                    wordFreq[clean] = (wordFreq[clean] || 0) + 1;
                }
            }
            const emojis = msg.text.match(emojiRegex);
            if (emojis) {
                for (const emoji of emojis) {
                    if (asciiEmojiFilter.test(emoji)) continue; // Skip ASCII digits/# /*
                    emojiFreq[emoji] = (emojiFreq[emoji] || 0) + 1;
                }
            }
        }
    }

    const stopWords = new Set(['yang', 'aja', 'nya', 'gua', 'kan', 'ini', 'itu', 'gak', 'ada', 'mau', 'udah', 'juga', 'deh', 'tuh', 'sih', 'loh', 'kok', 'bgt', 'bisa', 'kalo', 'tapi', 'dan', 'dari', 'untuk', 'the', 'and', 'you', 'that', 'this']);
    stats.topWords = Object.entries(wordFreq)
        .filter(([word]) => !stopWords.has(word))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

    stats.topEmojis = Object.entries(emojiFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

    // ─── byMonth: { "2025-01": { total, p1, p2 }, ... } ───
    const byMonth = {};
    for (const msg of allMessages) {
        if (!msg.date) continue;
        const monthKey = msg.date.substring(0, 7);
        if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, p1: 0, p2: 0 };
        byMonth[monthKey].total++;
        byMonth[monthKey][msg.speaker]++;
    }
    stats.byMonth = byMonth;

    // ─── funFacts: precomputed array of fun facts ───
    const funFacts = [];

    // "sayang" count per speaker
    let sayangP1 = 0, sayangP2 = 0;
    for (const msg of allMessages) {
        if (msg.type !== 'text' || !msg.text) continue;
        const lower = msg.text.toLowerCase();
        const count = (lower.match(/sayang/g) || []).length;
        if (msg.speaker === 'p1') sayangP1 += count;
        else sayangP2 += count;
    }
    funFacts.push({ id: 'sayang_total', label: `you've said "sayang" ${(sayangP1 + sayangP2).toLocaleString()} times`, value: sayangP1 + sayangP2 });
    funFacts.push({ id: 'sayang_p1', label: `haidar said "sayang" ${sayangP1.toLocaleString()} times`, value: sayangP1 });
    funFacts.push({ id: 'sayang_p2', label: `azhura said "sayang" ${sayangP2.toLocaleString()} times`, value: sayangP2 });

    // Late-night message count (22:00 - 05:00)
    let lateNightCount = 0;
    for (const msg of allMessages) {
        if (!msg.time) continue;
        const hour = parseInt(msg.time.split(':')[0]);
        if (hour >= 22 || hour <= 4) lateNightCount++;
    }
    funFacts.push({ id: 'late_night', label: `${lateNightCount.toLocaleString()} messages sent between 10PM and 5AM`, value: lateNightCount });

    // Longest consecutive-day streak
    const uniqueDates = [...new Set(allMessages.filter(m => m.date).map(m => m.date))].sort();
    let maxStreak = 1, currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
        else { currentStreak = 1; }
    }
    funFacts.push({ id: 'streak', label: `longest streak: ${maxStreak} consecutive days chatting`, value: maxStreak });

    // First "sayang" date
    let firstSayang = null;
    for (const msg of sortedMessages) {
        if (msg.type === 'text' && msg.text && msg.text.toLowerCase().includes('sayang')) {
            firstSayang = msg.date;
            break;
        }
    }
    if (firstSayang) funFacts.push({ id: 'first_sayang', label: `first "sayang" was on ${firstSayang}`, value: firstSayang });

    // Pet name counts
    const petNames = { zur: 0, zuraa: 0, kak: 0, kaka: 0 };
    for (const msg of allMessages) {
        if (msg.type !== 'text' || !msg.text) continue;
        const lower = msg.text.toLowerCase();
        petNames.zur += (lower.match(/\bzur\b/g) || []).length;
        petNames.zuraa += (lower.match(/zuraa?/g) || []).length;
        petNames.kak += (lower.match(/\bkak\b/g) || []).length;
        petNames.kaka += (lower.match(/\bkaka\b/g) || []).length;
    }
    funFacts.push({ id: 'pet_names', label: `pet names: "zur" ${petNames.zur.toLocaleString()}x, "kak" ${petNames.kak.toLocaleString()}x`, value: petNames });

    // Most messages in a single day
    const msgPerDay = {};
    for (const msg of allMessages) {
        if (!msg.date) continue;
        msgPerDay[msg.date] = (msgPerDay[msg.date] || 0) + 1;
    }
    let busiestDay = '', busiestDayCount = 0;
    for (const [date, count] of Object.entries(msgPerDay)) {
        if (count > busiestDayCount) { busiestDay = date; busiestDayCount = count; }
    }
    funFacts.push({ id: 'busiest_day', label: `most messages in one day: ${busiestDayCount.toLocaleString()} on ${busiestDay}`, value: busiestDayCount, date: busiestDay });

    // Busiest month
    let busiestMonth = '', busiestMonthCount = 0;
    for (const [month, data] of Object.entries(byMonth)) {
        if (data.total > busiestMonthCount) { busiestMonth = month; busiestMonthCount = data.total; }
    }
    funFacts.push({ id: 'busiest_month', label: `busiest month: ${busiestMonth} (${busiestMonthCount.toLocaleString()} messages)`, value: busiestMonthCount, month: busiestMonth });

    // Top emoji with count
    const topEmojiEntry = Object.entries(emojiFreq).sort((a, b) => b[1] - a[1])[0];
    if (topEmojiEntry) {
        funFacts.push({ id: 'top_emoji', label: `favorite emoji: ${topEmojiEntry[0]} (used ${topEmojiEntry[1].toLocaleString()} times)`, value: topEmojiEntry[1], emoji: topEmojiEntry[0] });
    }

    stats.funFacts = funFacts;

    return stats;
}

// ─── GENERATE GAME DATA ───────────────────────────────────────────────────────
function generateGameData(allMessages) {
    console.log('\n--- Generating game data...');

    const textMessages = allMessages.filter(m => m.type === 'text' && m.text && m.text.length > 3);
    const allValidMessages = allMessages.filter(m => m.text && m.date);

    // rawChatData: text + metadata (for quiz/finish-sentence)
    const rawChatData = {
        p1: textMessages.filter(m => m.speaker === 'p1').map(m => ({ text: m.text, platform: m.platform, date: m.date })),
        p2: textMessages.filter(m => m.speaker === 'p2').map(m => ({ text: m.text, platform: m.platform, date: m.date }))
    };

    // fullHistory: ALL types for archive search and time capsule
    const fullHistory = allValidMessages.map(m => {
        const dateParts = m.date ? m.date.split('-') : ['00', '00', '00'];
        const entry = {
            speaker: m.speaker,
            text: m.type === 'text' ? m.text.toLowerCase() : (m.text || '').toLowerCase(),
            platform: m.platform,
            type: m.type || 'text',
            date: {
                raw: m.date || 'unknown',
                part1: dateParts[2] || '00',
                part2: dateParts[1] || '00'
            }
        };
        if (m.mediaPath) entry.mediaPath = m.mediaPath;
        if (m.mediaType) entry.mediaType = m.mediaType;
        return entry;
    });

    // historyByDate: ALL types for memory lane
    const historyByDate = {};
    for (const msg of allValidMessages) {
        if (!msg.date) continue;
        if (!historyByDate[msg.date]) historyByDate[msg.date] = [];
        const entry = {
            speaker: msg.speaker,
            text: msg.text || '',
            platform: msg.platform,
            time: msg.time,
            timestamp: msg.timestamp,
            type: msg.type || 'text',
        };
        if (msg.speakerRaw) entry.speakerRaw = msg.speakerRaw;
        if (msg.mediaPath) entry.mediaPath = msg.mediaPath;
        if (msg.mediaType) entry.mediaType = msg.mediaType;
        historyByDate[msg.date].push(entry);
    }

    // nightSkyData: text-only late night messages (cap 2000 for variety, NightSky.jsx samples 250 for rendering)
    const nightSkyData = textMessages
        .filter(m => {
            if (!m.time) return false;
            const hour = parseInt(m.time.split(':')[0]);
            return (hour >= 22 || hour <= 4) && m.text.length > 10;
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 2000)
        .map(m => ({
            speaker: m.speaker,
            text: m.text,
            date: m.date,
            time: m.time,
            platform: m.platform
        }));

    // bossModeData: text-only long messages (for Paragraphs mode)
    // Filter first for >=200 chars AND >=30 words, include ALL qualifying messages
    const bossModeData = textMessages
        .filter(m => m.text.length >= 200 && m.text.split(/\s+/).length >= 30);

    // timeline: all messages for counts
    const timeline = {};
    for (const msg of allValidMessages) {
        if (!msg.date) continue;
        const monthKey = msg.date.substring(0, 7);
        if (!timeline[monthKey]) {
            timeline[monthKey] = { count: 0, platforms: new Set() };
        }
        timeline[monthKey].count++;
        timeline[monthKey].platforms.add(msg.platform);
    }
    for (const key of Object.keys(timeline)) {
        timeline[key].platforms = [...timeline[key].platforms];
    }

    return { rawChatData, fullHistory, historyByDate, nightSkyData, bossModeData, timeline };
}

// ─── GENERATE WORDS.JS DATA ──────────────────────────────────────────────────
function generateWordsData(allMessages) {
    console.log('\n--- Generating typing test words...');

    const textMessages = allMessages.filter(m => m.type === 'text' && m.text && m.text.length >= 3);
    const p1Messages = textMessages.filter(m => m.speaker === 'p1').map(m => m.text);
    const p2Messages = textMessages.filter(m => m.speaker === 'p2').map(m => m.text);
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    return {
        p1: shuffle(p1Messages).slice(0, 5000),
        p2: shuffle(p2Messages).slice(0, 5000),
        speakerNames: { p1: 'Haidar', p2: 'Azhura' }
    };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('======================================');
    console.log('  "haizur" -- Multi-Platform Parser v2.0');
    console.log('  Now with full media support!');
    console.log('======================================\n');

    ensureDir(OUTPUT_DIR);
    ensureDir(MEDIA_OUTPUT_DIR);

    let allMessages = [];

    // ─── 1. WhatsApp ───
    console.log('WhatsApp...');
    const wa1Path = path.join(ARCHIVE_ROOT, 'Whatsapp', 'Whatsapp First', 'wa_chat_history.txt');
    const wa2Path = path.join(ARCHIVE_ROOT, 'Whatsapp', 'Whatsapp Second', 'wa2_chat_history.txt');

    if (fs.existsSync(wa1Path)) {
        const wa1 = parseWhatsApp(wa1Path, 'whatsapp');
        allMessages = allMessages.concat(wa1);
        writeJSON('whatsapp.json', wa1);
    }
    if (fs.existsSync(wa2Path)) {
        const wa2 = parseWhatsApp(wa2Path, 'whatsapp2');
        allMessages = allMessages.concat(wa2);
        writeJSON('whatsapp2.json', wa2);
    }

    // ─── 2. Discord ───
    console.log('\nDiscord...');
    const discordPath = path.join(ARCHIVE_ROOT, 'Discord', 'discord_chat_history.txt');
    if (fs.existsSync(discordPath)) {
        const discord = parseDiscord(discordPath);
        allMessages = allMessages.concat(discord);
        writeJSON('discord.json', discord);
    }

    // ─── 3. TikTok ───
    console.log('\nTikTok...');
    const tiktokPath = path.join(ARCHIVE_ROOT, 'Tiktok', 'tiktok_chat_history.txt');
    if (fs.existsSync(tiktokPath)) {
        const tiktok = parseTikTok(tiktokPath);
        allMessages = allMessages.concat(tiktok);
        writeJSON('tiktok.json', tiktok);
    }

    // ─── 4. iMessage ───
    console.log('\niMessage...');
    const imessPath = path.join(ARCHIVE_ROOT, 'iMessage', 'imess_chat_history.txt');
    if (fs.existsSync(imessPath)) {
        const imess = parseIMessage(imessPath);
        allMessages = allMessages.concat(imess);
        writeJSON('imessage.json', imess);
    }

    // ─── 4.5. FaceTime ───
    console.log('\nFaceTime...');
    const ftPath = path.join(ARCHIVE_ROOT, 'iMessage', 'Riwayat_Telepon_Tersambung_Azhura.csv');
    if (fs.existsSync(ftPath)) {
        const ft = parseFaceTime(ftPath);
        allMessages = allMessages.concat(ft);
        writeJSON('facetime.json', ft);
    }

    // ─── 5. Instagram ───
    console.log('\nInstagram...');
    const igRoot = path.join(ARCHIVE_ROOT, 'Instagram');
    if (fs.existsSync(igRoot)) {
        const igDirs = fs.readdirSync(igRoot).filter(f => {
            const fullPath = path.join(igRoot, f);
            return fs.statSync(fullPath).isDirectory() && f !== '.DS_Store';
        });

        let allIgMessages = [];
        for (const dir of igDirs) {
            // Create a safe slug for the directory name
            const slug = dir.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 40);
            const igMessages = parseInstagram(path.join(igRoot, dir), slug);
            allIgMessages = allIgMessages.concat(igMessages);
        }
        allIgMessages.sort((a, b) => a.timestamp - b.timestamp);
        allMessages = allMessages.concat(allIgMessages);
        writeJSON('instagram.json', allIgMessages);
    }

    // ─── 6. Media Matching — Link archive files to messages ───
    console.log('\nMedia Matching...');

    // WhatsApp First
    const wa1MediaDir = path.join(ARCHIVE_ROOT, 'Whatsapp', 'Whatsapp First', 'media');
    if (fs.existsSync(wa1MediaDir)) {
        console.log('  Matching WhatsApp First media...');
        const wa1Result = await matchWhatsAppMedia(allMessages, wa1MediaDir, 'whatsapp');
        console.log(`    Matched: ${wa1Result.matched}, Unmatched messages: ${wa1Result.unmatched}`);
    }

    // WhatsApp Second
    const wa2MediaDir = path.join(ARCHIVE_ROOT, 'Whatsapp', 'Whatsapp Second', 'media');
    if (fs.existsSync(wa2MediaDir)) {
        console.log('  Matching WhatsApp Second media...');
        const wa2Result = await matchWhatsAppMedia(allMessages, wa2MediaDir, 'whatsapp2');
        console.log(`    Matched: ${wa2Result.matched}, Unmatched messages: ${wa2Result.unmatched}`);
    }

    // iMessage
    const imessMediaDir = path.join(ARCHIVE_ROOT, 'iMessage', 'media');
    const imessVoiceDir = path.join(ARCHIVE_ROOT, 'iMessage', 'Voice Notes');
    if (fs.existsSync(imessMediaDir) || fs.existsSync(imessVoiceDir)) {
        console.log('  Matching iMessage media...');
        const imessResult = await matchIMessageMedia(allMessages, imessMediaDir, imessVoiceDir);
        console.log(`    Matched: ${imessResult.matched}, Unmatched: ${imessResult.unmatched}`);
    }

    // Show media matching summary
    const withMedia = allMessages.filter(m => m.mediaPath).length;
    console.log(`\n  Total messages with media paths: ${withMedia}`);

    // Post-process: Live photo detection for ALL platforms (videos ≤3.5s)
    console.log('\n  Detecting live photos across all platforms...');
    let totalLivePhotos = 0;
    try {
        const { execSync } = require('child_process');
        // Test ffprobe availability first
        execSync('ffprobe -version', { timeout: 3000, encoding: 'utf-8' });
        for (const msg of allMessages) {
            if (msg.type !== 'video' || !msg.mediaPath || msg.duration !== undefined) continue;
            const fullPath = path.join(__dirname, '..', 'public', msg.mediaPath);
            if (!fs.existsSync(fullPath)) continue;
            try {
                const durationStr = execSync(
                    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${fullPath}"`,
                    { timeout: 5000, encoding: 'utf-8' }
                ).trim();
                const duration = parseFloat(durationStr);
                if (!isNaN(duration)) {
                    msg.duration = Math.round(duration * 10) / 10;
                    if (duration <= 3.5) {
                        msg.type = 'image';
                        msg.isLivePhoto = true;
                        totalLivePhotos++;
                    }
                }
            } catch { /* ffprobe failed for this file */ }
        }
        console.log(`    Reclassified ${totalLivePhotos} live photos (video ≤3.5s → image) across all platforms`);
    } catch (e) {
        console.log('    ffprobe not available — skipping live photo detection. Install ffmpeg: brew install ffmpeg');
    }

    // ─── Assign sequential index to preserve file-order as tiebreaker ───
    // After all platforms are parsed, each platform's messages are in chronological order.
    // The seq index preserves this order for messages that share the same timestamp.
    for (let i = 0; i < allMessages.length; i++) allMessages[i].seq = i;

    // ─── Sort all messages chronologically ───
    console.log('\nSorting all messages chronologically...');
    const platformOrder = { whatsapp: 0, whatsapp2: 1, instagram: 2, tiktok: 3, imessage: 4, discord: 5, facetime: 6 };
    allMessages.sort((a, b) =>
        a.timestamp - b.timestamp ||
        (platformOrder[a.platform] ?? 99) - (platformOrder[b.platform] ?? 99) ||
        a.seq - b.seq
    );

    // Reassign seq after sort for clean sequential indices in output
    for (let i = 0; i < allMessages.length; i++) allMessages[i].seq = i;

    // ─── Generate unified data ───
    writeJSON('unified.json', allMessages);
    console.log(`\nTotal messages across all platforms: ${allMessages.length}`);

    // ─── Generate stats ───
    const stats = generateStats(allMessages);
    writeJSON('stats.json', stats);

    // Show media stats
    console.log(`\nMedia breakdown:`);
    console.log(`  Images: ${stats.mediaStats.images}`);
    console.log(`  Videos: ${stats.mediaStats.videos}`);
    console.log(`  Video Notes: ${stats.mediaStats.video_notes}`);
    console.log(`  Audio: ${stats.mediaStats.audio}`);
    console.log(`  Stickers: ${stats.mediaStats.stickers}`);
    console.log(`  GIFs: ${stats.mediaStats.gifs}`);
    console.log(`  Documents: ${stats.mediaStats.documents}`);
    console.log(`  Calls: ${stats.mediaStats.calls}`);

    // ─── Generate game data ───
    const gameData = generateGameData(allMessages);
    writeJSON('rawChatData.json', gameData.rawChatData);
    writeJSON('fullHistory.json', gameData.fullHistory);
    writeJSON('historyByDate.json', gameData.historyByDate);
    writeJSON('nightSkyData.json', gameData.nightSkyData);
    writeJSON('bossModeData.json', gameData.bossModeData);
    writeJSON('timeline.json', gameData.timeline);

    // ─── Generate typing words ───
    const wordsData = generateWordsData(allMessages);
    writeJSON('wordsData.json', wordsData);

    console.log('\n======================================');
    console.log('  All platforms parsed successfully!');
    console.log('======================================');
    console.log(`\nOutput directory: ${OUTPUT_DIR}`);
    console.log(`Media directory: ${MEDIA_OUTPUT_DIR}`);
    console.log(`Files generated: ${fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json')).length}`);
}

function writeJSON(filename, data) {
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data));
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`  ${filename} (${sizeMB} MB)`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
