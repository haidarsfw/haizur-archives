// Client-side notifier: POSTs to /api/notify after a message is successfully
// sent so the recipient gets a push / email. Fail-silent so a flaky
// network never blocks the send path.

const SECRET = import.meta.env.VITE_NOTIFY_SHARED_SECRET;

export async function notifyPartner({ senderRole, text, sticker, image, voiceMessage, messageId }) {
    if (!senderRole) return;
    const recipientRole = senderRole === "haidar" ? "princess" : "haidar";
    if (!SECRET) {
        // No secret wired yet — skip silently. Server-side env still needs
        // NOTIFY_SHARED_SECRET + FIREBASE_SERVICE_ACCOUNT_KEY + (optional)
        // RESEND_API_KEY. See NOTIFICATIONS_SETUP.md.
        return;
    }
    try {
        // Fire-and-forget: don't await in caller's critical path
        fetch("/api/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-haizur-secret": SECRET,
            },
            body: JSON.stringify({
                recipientRole,
                senderRole,
                text: text || null,
                sticker: sticker ? String(sticker).slice(0, 32) : null, // avoid sending base64 blob
                image: image ? "__image__" : null,
                voiceMessage: voiceMessage ? "__voice__" : null,
                messageId: messageId || null,
            }),
            keepalive: true,
        }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
}
