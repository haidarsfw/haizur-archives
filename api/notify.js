// POST /api/notify — fan-out push + email notifications for new chat
// messages. Called from the client right after a successful addDoc.
//
// Body: { recipientRole, senderRole, text?, sticker?, image?, voiceMessage?, messageId, type? }
// Auth:  x-haizur-secret header must match NOTIFY_SHARED_SECRET
//
// Runtime: Node (firebase-admin is CommonJS and doesn't run on Edge).
//
// Env required:
//   - FIREBASE_SERVICE_ACCOUNT_KEY  (full JSON, one line or prettified)
//   - FIREBASE_DATABASE_URL         (e.g. https://<project>.firebaseio.com)
//   - NOTIFY_SHARED_SECRET          (random string, same in client)
//   - RESEND_API_KEY                (optional — email fallback)
//   - NOTIFY_EMAIL_FROM             (optional — from address, e.g. "Haizur <noreply@yourdomain>")

export const config = { runtime: "nodejs" };

import admin from "firebase-admin";
import { Resend } from "resend";

function initAdmin() {
    if (admin.apps.length) return admin.app();
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing");
    let credentials;
    try {
        credentials = JSON.parse(raw);
    } catch (e) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: " + e.message);
    }
    // Normalize private_key newlines. Vercel's env UI does NOT interpret
    // `\n` escapes on a single-line paste — the key comes through with
    // literal "\n" sequences. Also tolerate Windows-style `\r\n`.
    if (credentials.private_key) {
        let pk = credentials.private_key;
        if (pk.includes("\\n")) pk = pk.replace(/\\n/g, "\n");
        pk = pk.replace(/\r\n/g, "\n");
        // If the header/footer are still on the same line as the body, repair
        if (!pk.includes("\n") && pk.includes("-----BEGIN PRIVATE KEY-----")) {
            pk = pk
                .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
                .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
            // Break body into 64-char lines
            const [header, rest] = pk.split("-----BEGIN PRIVATE KEY-----\n");
            const [body, footer] = (rest || "").split("\n-----END PRIVATE KEY-----");
            if (body) {
                const wrapped = body.replace(/(.{64})/g, "$1\n");
                pk = `${header}-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----${footer || ""}`;
            }
        }
        credentials.private_key = pk;
    }
    return admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
}

const DEBOUNCE_WINDOW_MS = 2 * 60 * 1000; // 2 min
const CHAT_ACTIVE_WINDOW_MS = 30 * 1000;  // if recipient seen <30s, skip push

function previewBody(payload) {
    if (payload.text) {
        return String(payload.text).length > 140 ? String(payload.text).slice(0, 137) + "…" : String(payload.text);
    }
    if (payload.sticker) return "Stiker 🎭";
    if (payload.image) return "Foto 📷";
    if (payload.voiceMessage) return "Voice note 🎤";
    return "Pesan baru";
}

function senderName(role) {
    if (role === "haidar") return "Haidar ⭐";
    if (role === "princess") return "Princess 👸";
    return role || "Partner";
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const secret = req.headers["x-haizur-secret"];
    if (!secret || secret !== process.env.NOTIFY_SHARED_SECRET) {
        return res.status(401).json({ error: "Bad secret" });
    }

    let body = req.body;
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { recipientRole, senderRole, text, sticker, image, voiceMessage, messageId } = body || {};
    if (!recipientRole || !senderRole) return res.status(400).json({ error: "recipientRole + senderRole required" });
    if (recipientRole === senderRole) return res.status(200).json({ skipped: "same role" });

    let app;
    try {
        app = initAdmin();
    } catch (e) {
        console.error("admin init:", e);
        return res.status(500).json({ error: e.message });
    }

    const db = admin.firestore();
    const rtdb = admin.database();

    // 1. Check recipient presence — if chat is open + recently active, skip
    try {
        const presSnap = await rtdb.ref(`presence/${recipientRole}`).once("value");
        const presence = presSnap.val() || {};
        const now = Date.now();
        const fresh = presence.lastSeen && (now - presence.lastSeen < CHAT_ACTIVE_WINDOW_MS);
        if (presence.chatActive && fresh) {
            return res.status(200).json({ skipped: "recipient chatActive" });
        }
    } catch (e) {
        console.warn("presence check failed:", e.message);
    }

    // 2. Debounce — if we pushed <2min ago to same recipient, skip
    const debounceRef = db.doc(`notif-state/${recipientRole}`);
    try {
        const snap = await debounceRef.get();
        const last = snap.exists ? snap.data() : null;
        if (last?.lastPushAt) {
            const age = Date.now() - (last.lastPushAt.toMillis?.() || last.lastPushAt);
            if (age < DEBOUNCE_WINDOW_MS && last.lastSenderRole === senderRole) {
                return res.status(200).json({ skipped: "debounced" });
            }
        }
    } catch (e) {
        console.warn("debounce read failed:", e.message);
    }

    // 3. Load recipient notif prefs
    let prefs = {};
    try {
        const prefSnap = await db.doc(`notif-prefs/${recipientRole}`).get();
        if (prefSnap.exists) prefs = prefSnap.data();
    } catch (e) {
        console.warn("prefs read failed:", e.message);
    }

    const title = senderName(senderRole);
    const body2 = previewBody({ text, sticker, image, voiceMessage });
    const fcmTokens = prefs.fcmTokens ? Object.keys(prefs.fcmTokens) : [];

    const fcmResults = { sent: 0, failed: 0, invalidTokens: [] };
    if (fcmTokens.length) {
        const messaging = admin.messaging();
        // sendEach = independent errors per token (so one bad token doesn't fail the rest)
        const messages = fcmTokens.map((tok) => ({
            token: tok,
            notification: { title, body: body2 },
            data: {
                title,
                body: body2,
                url: "/",
                tag: `haizur-${messageId || Date.now()}`,
                messageId: messageId || "",
            },
            webpush: {
                fcmOptions: { link: "/" },
                notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
            },
        }));
        try {
            const resp = await messaging.sendEach(messages);
            resp.responses.forEach((r, i) => {
                if (r.success) fcmResults.sent += 1;
                else {
                    fcmResults.failed += 1;
                    const code = r.error?.code || "";
                    if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
                        fcmResults.invalidTokens.push(fcmTokens[i]);
                    }
                }
            });
            // Prune dead tokens
            if (fcmResults.invalidTokens.length) {
                const updates = {};
                fcmResults.invalidTokens.forEach((t) => { updates[`fcmTokens.${t}`] = admin.firestore.FieldValue.delete(); });
                try { await db.doc(`notif-prefs/${recipientRole}`).set(updates, { merge: true }); } catch { /* noop */ }
            }
        } catch (e) {
            console.error("fcm send:", e);
        }
    }

    // 4. Email (only if FCM didn't succeed at all — backup channel)
    let emailResult = null;
    const needEmail = fcmResults.sent === 0 && prefs.email && process.env.RESEND_API_KEY;
    if (needEmail) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            emailResult = await resend.emails.send({
                from: process.env.NOTIFY_EMAIL_FROM || "Haizur <onboarding@resend.dev>",
                to: [prefs.email],
                subject: `${title}: ${body2}`,
                html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 20px; background: #1c1410; color: #f5e6d0; border-radius: 12px;">
                    <div style="font-size: 13px; color: #d4a054; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">${title}</div>
                    <div style="font-size: 16px; line-height: 1.5; color: #f5e6d0; word-break: break-word;">${escapeHtml(body2)}</div>
                    <a href="https://haizur.site" style="display: inline-block; margin-top: 16px; padding: 8px 20px; border-radius: 999px; background: #d4a054; color: #1c1410; text-decoration: none; font-weight: 700; font-size: 13px;">Balas di Haizur →</a>
                </div>`,
            });
        } catch (e) {
            console.error("resend:", e.message);
            emailResult = { error: e.message };
        }
    }

    // 5. Update debounce state
    try {
        await debounceRef.set({
            lastPushAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSenderRole: senderRole,
            lastMessageId: messageId || null,
        }, { merge: true });
    } catch { /* noop */ }

    return res.status(200).json({
        ok: true,
        fcm: fcmResults,
        email: emailResult ? { sent: !emailResult.error, id: emailResult.data?.id, error: emailResult.error || null } : null,
    });
}

function escapeHtml(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
