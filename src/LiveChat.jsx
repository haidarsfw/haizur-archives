import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { firestore } from "./firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    setDoc,
    getDoc
} from "firebase/firestore";
import AudioCall from "./AudioCall";
import { useSounds } from "./hooks/useSounds";
import { formatLastSeen } from "./hooks/usePresence";
import MessageEffect, { shouldTriggerEffect } from "./MessageEffects";
import ChatImageLightbox from "./ChatImageLightbox";
import { formatMessageText } from "./chatTextFormat";

// Chat theme presets
const CHAT_THEMES = {
    default: { name: "Classic", myBubble: "var(--partner-prince)", theirBubble: "var(--partner-princess)", bg: "transparent", emoji: "💬" },
    love: { name: "Love", myBubble: "#ef4444", theirBubble: "#ec4899", bg: "linear-gradient(180deg, rgba(236,72,153,0.05) 0%, transparent 100%)", emoji: "❤️" },
    ocean: { name: "Ocean", myBubble: "#0ea5e9", theirBubble: "#14b8a6", bg: "linear-gradient(180deg, rgba(14,165,233,0.05) 0%, transparent 100%)", emoji: "🌊" },
    sunset: { name: "Sunset", myBubble: "#f97316", theirBubble: "#a855f7", bg: "linear-gradient(180deg, rgba(249,115,22,0.05) 0%, transparent 100%)", emoji: "🌅" },
    forest: { name: "Forest", myBubble: "#22c55e", theirBubble: "#10b981", bg: "linear-gradient(180deg, rgba(34,197,94,0.05) 0%, transparent 100%)", emoji: "🌲" },
    galaxy: { name: "Galaxy", myBubble: "#8b5cf6", theirBubble: "#6366f1", bg: "linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)", emoji: "🌌" }
};

// Sticker packs
const STICKER_PACKS = {
    love: { emoji: "❤️", stickers: ["❤️", "💕", "💖", "💗", "💓", "💞", "💘", "💝", "😍", "🥰", "😘", "💋"] },
    cute: { emoji: "🥺", stickers: ["🥺", "🤗", "😊", "☺️", "🥹", "😚", "🤭", "😋", "🙈", "🐰", "🦋", "🌸"] },
    reactions: { emoji: "🔥", stickers: ["😂", "😭", "🔥", "✨", "💀", "😱", "🤯", "😤", "🙄", "👀", "💯", "🎉"] },
    animals: { emoji: "🐱", stickers: ["🐱", "🐶", "🐻", "🦊", "🐼", "🐨", "🦁", "🐯", "🐰", "🐸", "🦄", "🐝"] },
    food: { emoji: "🍕", stickers: ["🍕", "🍔", "🍟", "🍦", "🍩", "🍪", "🧁", "🍰", "🍫", "☕", "🧋", "🍜"] }
};

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];
const COMMON_EMOJIS = ["😀", "😂", "🥰", "😍", "😘", "🥺", "😭", "😤", "🔥", "✨", "💕", "❤️", "💖", "💗", "👍", "👏", "🙌", "🤗", "😱", "😴", "😋", "🎉", "💀", "👀", "🥱", "🤔", "🤭", "😈", "🙄", "💯", "🫶", "✌️"];
const NUDGE_COOLDOWN_MS = 8000;
const NEAR_BOTTOM_PX = 80;

const LiveChat = ({ theme, isPopup = false, partnerPresence = null }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState("connecting");
    const [chatTheme, setChatTheme] = useState("default");
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [activeStickerPack, setActiveStickerPack] = useState("love");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [activeReactionMessage, setActiveReactionMessage] = useState(null);
    const [error, setError] = useState(null);
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [playingVoiceId, setPlayingVoiceId] = useState(null);
    const [showStarred, setShowStarred] = useState(false);
    const [customStickers, setCustomStickers] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [sendingImage, setSendingImage] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [effectsEnabled, setEffectsEnabled] = useState(true);
    const [lastHereAnchorId, setLastHereAnchorId] = useState(null);
    const [nudgeBanner, setNudgeBanner] = useState(null);
    const [pulseId, setPulseId] = useState(null);
    const [nudgeJustSent, setNudgeJustSent] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [copyToast, setCopyToast] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [seenPopoverId, setSeenPopoverId] = useState(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const isTabFocusedRef = useRef(true);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const fileInputRef = useRef(null);
    const stickerInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messageRefs = useRef(new Map());
    const effectsPlayedRef = useRef(new Set());
    const effectsEnabledRef = useRef(true);
    const soundEnabledRef = useRef(true);
    const roleRef = useRef(null);
    const sounds = useSounds();
    const soundsRef = useRef(sounds);
    const [activeEffects, setActiveEffects] = useState([]);
    const lastNudgeSentRef = useRef(0);
    const nudgeInitialisedRef = useRef(false);
    const nudgeJustSentTimerRef = useRef(null);
    const dragDepthRef = useRef(0);
    const copyToastTimerRef = useRef(null);
    const seenPopoverTimerRef = useRef(null);

    // Keep refs in sync so subscriptions can read latest values without
    // being re-deps (otherwise Firestore listeners churn on every render).
    useEffect(() => { soundsRef.current = sounds; }, [sounds]);
    useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
    useEffect(() => { roleRef.current = role; }, [role]);

    const playCue = useCallback((name) => {
        if (!soundEnabledRef.current) return;
        soundsRef.current?.play(name);
    }, []);

    // Thin wrappers over the global cue dispatcher. Kept so the rest of the
    // component reads naturally; all three are stable across renders.
    const playSound = useCallback(() => { playCue("messageReceive"); }, [playCue]);
    const playSendSound = useCallback(() => { playCue("messageSend"); }, [playCue]);
    const playReactionSound = useCallback(() => { playCue("reaction"); }, [playCue]);

    // Track tab focus
    useEffect(() => {
        const handleVisibility = () => { isTabFocusedRef.current = !document.hidden; };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, []);

    // Cleanup transient-toast timers on unmount
    useEffect(() => () => {
        if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
        if (seenPopoverTimerRef.current) clearTimeout(seenPopoverTimerRef.current);
    }, []);

    // Paste-to-send image (Ctrl/Cmd+V with image in clipboard)
    useEffect(() => {
        const handlePaste = (e) => {
            if (!isTabFocusedRef.current) return;
            if (imagePreview || isRecording) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type?.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) continue;
                    e.preventDefault();
                    ingestImageFile(file);
                    return;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imagePreview, isRecording]);

    // Load saved settings
    useEffect(() => {
        const savedRole = localStorage.getItem("haizur-chat-role");
        const savedTheme = localStorage.getItem("haizur-chat-theme");
        const savedSound = localStorage.getItem("haizur-chat-sound");
        const savedEffects = localStorage.getItem("haizur-chat-effects");
        if (savedRole) setRole(savedRole);
        if (savedTheme && CHAT_THEMES[savedTheme]) setChatTheme(savedTheme);
        if (savedSound !== null) setSoundEnabled(savedSound === "true");
        if (savedEffects !== null) {
            const v = savedEffects === "true";
            setEffectsEnabled(v);
            effectsEnabledRef.current = v;
        }
        setIsLoading(false);
    }, []);

    // Save preferences
    useEffect(() => { localStorage.setItem("haizur-chat-theme", chatTheme); }, [chatTheme]);
    useEffect(() => { localStorage.setItem("haizur-chat-sound", String(soundEnabled)); }, [soundEnabled]);
    useEffect(() => {
        localStorage.setItem("haizur-chat-effects", String(effectsEnabled));
        effectsEnabledRef.current = effectsEnabled;
    }, [effectsEnabled]);

    // Show browser notification. Stable across renders.
    const showNotification = useCallback((senderName, text) => {
        if (Notification.permission !== "granted" || isTabFocusedRef.current) return;
        try {
            const n = new Notification(`💬 ${senderName}`, {
                body: text?.substring(0, 100) || "Sent a sticker",
                icon: "https://em-content.zobj.net/source/apple/391/sparkling-heart_1f496.png",
                tag: "haizur-chat"
            });
            n.onclick = () => { window.focus(); n.close(); };
            setTimeout(() => n.close(), 4000);
        } catch { /* ignore */ }
    }, []);

    // Subscribe to Firestore messages - REAL-TIME SYNC.
    // IMPORTANT: deps = [role] only. Callbacks are read via refs so render
    // churn never re-subscribes the listener (previous bug held
    // connectionStatus on "connecting" forever).
    useEffect(() => {
        if (!role) return;

        setConnectionStatus("connecting");
        setError(null);

        const timeoutId = setTimeout(() => {
            setConnectionStatus((prev) => {
                if (prev === "connecting") {
                    setError("Connection trapped! Please check your Google Cloud API Key HTTP Referrer restrictions or Vercel Environment Variables.");
                    return "error";
                }
                return prev;
            });
        }, 10000);

        const q = query(
            collection(firestore, "chat-messages"),
            orderBy("timestamp", "asc"),
            limit(500)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                clearTimeout(timeoutId);
                setConnectionStatus("connected");
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const currentRole = roleRef.current;

                if (lastMessageCountRef.current === 0 && msgs.length > 0) {
                    const firstUnread = msgs.find(m => m.sender !== currentRole && !(m.readBy || []).includes(currentRole));
                    setLastHereAnchorId(firstUnread?.id || null);
                }

                if (msgs.length > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
                    const latest = msgs[msgs.length - 1];
                    if (latest?.sender !== currentRole) {
                        const name = latest.sender === "princess" ? "Princess 👸" : "Haidar ⭐";
                        showNotification(name, latest.text || latest.sticker);
                        if (soundEnabledRef.current) soundsRef.current?.play("messageReceive");
                    }
                }
                lastMessageCountRef.current = msgs.length;
                setMessages(msgs);
            },
            (err) => {
                console.error("Firestore error:", err);
                if ((err.message && err.message.includes("permission_denied")) || err.code === "permission-denied") {
                    setConnectionStatus("error");
                    setError("Firestore Rules Expired! Please update your Firebase Console rules to allow read/write.");
                } else {
                    setConnectionStatus("error");
                    setError("Database error. Check console.");
                }
            }
        );

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, [role, showNotification]);

    // Auto-scroll — only if user is already near the bottom, and only when a
    // new message arrives (not on read-receipt / reaction updates).
    const lastScrollSyncCountRef = useRef(0);
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const prevCount = lastScrollSyncCountRef.current;
        lastScrollSyncCountRef.current = messages.length;
        if (messages.length === prevCount) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
        // Initial load (prevCount === 0): snap to bottom once so the chat
        // opens on the newest messages. Thereafter, respect user scroll.
        if (prevCount === 0 || isNearBottom) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: prevCount === 0 ? "auto" : "smooth" });
            });
        }
    }, [messages]);

    // Focus input
    useEffect(() => {
        if (role && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
    }, [role, showEmojiPicker, showStickerPicker]);

    const selectRole = async (selectedRole) => {
        setRole(selectedRole);
        localStorage.setItem("haizur-chat-role", selectedRole);
        if ("Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
        }
    };

    // Typing indicator - update presence
    const updateTypingStatus = useCallback(async (isTyping) => {
        if (!role) return;
        try {
            await setDoc(doc(firestore, "typing-status", role), {
                isTyping,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (e) {
            console.log("Typing status update failed - check Firebase rules for typing-status collection");
        }
    }, [role]);

    // Listen for other person's typing with periodic check
    useEffect(() => {
        if (!role) return;
        const otherRole = role === "haidar" ? "princess" : "haidar";

        // Real-time listener
        const unsub = onSnapshot(doc(firestore, "typing-status", otherRole), (snap) => {
            const data = snap.data();
            if (data && data.isTyping && Date.now() - data.updatedAt < 5000) {
                setOtherTyping(true);
            } else {
                setOtherTyping(false);
            }
        }, (error) => {
            console.log("Typing status listener failed - check Firebase rules");
        });

        // Periodic check to clear stale typing status
        const interval = setInterval(() => {
            setOtherTyping(prev => {
                // This will trigger re-evaluation on next snapshot
                return prev;
            });
        }, 3000);

        return () => {
            unsub();
            clearInterval(interval);
        };
    }, [role]);

    // Listen for nudges the partner sent us. A nudge is a single doc at
    // `chat-nudges/{receiverRole}` that gets overwritten on each ping.
    // Deps = [role] only; callbacks read via refs.
    useEffect(() => {
        if (!role) return;
        const nudgeRef = doc(firestore, "chat-nudges", role);
        let seenAt = null;

        const unsub = onSnapshot(nudgeRef, (snap) => {
            const data = snap.data();
            if (!data || !data.at) return;
            if (!nudgeInitialisedRef.current) {
                seenAt = data.at;
                nudgeInitialisedRef.current = true;
                return;
            }
            if (seenAt === data.at) return;
            seenAt = data.at;
            const fromName = data.from === "haidar" ? "Haidar" : "Princess";
            setNudgeBanner({ from: fromName, at: data.at });
            if (soundEnabledRef.current) soundsRef.current?.play("nudge");
            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                try { navigator.vibrate(40); } catch { /* noop */ }
            }
            setTimeout(() => {
                setNudgeBanner((curr) => (curr && curr.at === data.at ? null : curr));
            }, 2400);
        }, () => { /* listener error: ignore */ });

        return () => { unsub(); };
    }, [role]);

    const sendNudge = useCallback(async () => {
        const currentRole = roleRef.current;
        if (!currentRole) return;
        const now = Date.now();
        if (now - lastNudgeSentRef.current < NUDGE_COOLDOWN_MS) return;
        lastNudgeSentRef.current = now;
        // Inline "nudged" confirmation on the button. Revert after 1.5s.
        setNudgeJustSent(true);
        if (nudgeJustSentTimerRef.current) clearTimeout(nudgeJustSentTimerRef.current);
        nudgeJustSentTimerRef.current = setTimeout(() => setNudgeJustSent(false), 1500);
        const targetRole = currentRole === "haidar" ? "princess" : "haidar";
        try {
            await setDoc(doc(firestore, "chat-nudges", targetRole), {
                from: currentRole,
                at: now,
            });
            if (soundEnabledRef.current) soundsRef.current?.play("nudge");
        } catch (err) {
            console.log("nudge send failed:", err?.message || err);
        }
    }, []);

    useEffect(() => () => {
        if (nudgeJustSentTimerRef.current) clearTimeout(nudgeJustSentTimerRef.current);
    }, []);

    const scrollToMessage = useCallback((messageId) => {
        if (!messageId) return;
        const el = messageRefs.current.get(messageId);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setPulseId(messageId);
        setTimeout(() => setPulseId((curr) => (curr === messageId ? null : curr)), 1200);
    }, []);

    // Handle input change with typing indicator
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        // Update typing status
        updateTypingStatus(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set typing to false after 2 seconds of no typing
        typingTimeoutRef.current = setTimeout(() => {
            updateTypingStatus(false);
        }, 2000);
    };

    // Clear typing when input loses focus
    const handleInputBlur = () => {
        updateTypingStatus(false);
    };

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        if (!role || !messages.length) return;

        const unreadMessages = messages.filter(m =>
            m.sender !== role && !m.readBy?.includes(role)
        );

        for (const msg of unreadMessages.slice(-10)) { // Mark last 10 unread
            try {
                await updateDoc(doc(firestore, "chat-messages", msg.id), {
                    readBy: arrayUnion(role),
                    [`readByTimes.${role}`]: serverTimestamp(),
                });
            } catch (e) {
                console.log("Read receipt update failed:", e);
            }
        }
    }, [role, messages]);

    // Mark as read when viewing - always call when messages change
    useEffect(() => {
        if (messages.length > 0 && role) {
            // Small delay to avoid rapid updates
            const timeout = setTimeout(() => {
                markMessagesAsRead();
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [messages, markMessagesAsRead, role]);

    // Keyword effect dispatcher. On the first messages snapshot we seed the
    // "played" set so history doesn't erupt into hearts; subsequent inbound
    // messages get a one-shot burst if they match. Deps = [messages] only —
    // sound/effect enables read via refs.
    const didInitialEffectSeedRef = useRef(false);
    useEffect(() => {
        if (!messages.length) return;
        if (!didInitialEffectSeedRef.current) {
            didInitialEffectSeedRef.current = true;
            messages.forEach((m) => { if (m.id) effectsPlayedRef.current.add(m.id); });
            return;
        }
        if (!effectsEnabledRef.current) return;
        for (const msg of messages) {
            if (!msg.id || effectsPlayedRef.current.has(msg.id)) continue;
            const variant = msg.text ? shouldTriggerEffect(msg.text) : null;
            effectsPlayedRef.current.add(msg.id);
            if (!variant) continue;
            requestAnimationFrame(() => {
                const el = messageRefs.current.get(msg.id);
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const effectId = `${msg.id}-${Date.now()}`;
                setActiveEffects((arr) => [...arr, { id: effectId, variant, rect }]);
                if (soundEnabledRef.current) soundsRef.current?.play("effectBurst");
            });
        }
    }, [messages]);

    const removeEffect = useCallback((id) => {
        setActiveEffects((arr) => arr.filter((e) => e.id !== id));
    }, []);

    const sendMessage = async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if (!text || !role) return;

        const reply = replyingTo;
        setNewMessage("");
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
        setReplyingTo(null);
        updateTypingStatus(false);
        playSendSound();

        try {
            await addDoc(collection(firestore, "chat-messages"), {
                text,
                sender: role,
                timestamp: serverTimestamp(),
                reactions: [],
                readBy: [role],
                ...(reply && {
                    replyTo: {
                        id: reply.id,
                        text: reply.text?.substring(0, 50) || (reply.sticker ? "Sticker" : reply.image ? "Image" : "Voice"),
                        sender: reply.sender
                    }
                })
            });
        } catch (err) {
            console.error("Send error:", err);
            setNewMessage(text);
            setError("Failed to send. Try again.");
        }
    };

    // Delete message
    const deleteMessage = async (messageId, forEveryone = false) => {
        if (!messageId) return;
        try {
            if (forEveryone) {
                // Mark as deleted for everyone (show indicator)
                await updateDoc(doc(firestore, "chat-messages", messageId), {
                    deletedForEveryone: true,
                    text: null,
                    sticker: null,
                    image: null,
                    voiceMessage: null
                });
            } else {
                // Just hide for self (mark as deleted)
                await updateDoc(doc(firestore, "chat-messages", messageId), {
                    deletedFor: arrayUnion(role)
                });
            }
            setActiveReactionMessage(null);
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete");
        }
    };

    // Search messages
    const filteredMessages = searchQuery.trim()
        ? messages.filter(m =>
            m.text?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : messages;

    const sendSticker = async (sticker) => {
        if (!role) return;
        setShowStickerPicker(false);
        playSendSound();
        try {
            await addDoc(collection(firestore, "chat-messages"), {
                sticker,
                sender: role,
                timestamp: serverTimestamp(),
                reactions: []
            });
        } catch (err) {
            console.error("Send sticker error:", err);
        }
    };

    // Voice message recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                // Convert to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    try {
                        await addDoc(collection(firestore, "chat-messages"), {
                            voiceMessage: base64Audio,
                            voiceDuration: recordingTime,
                            sender: role,
                            timestamp: serverTimestamp(),
                            reactions: [],
                            starred: false
                        });
                    } catch (err) {
                        console.error("Voice send error:", err);
                        setError("Failed to send voice message");
                    }
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60) { // Max 60 seconds
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Recording error:", err);
            setError("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const playVoiceMessage = (messageId, audioData) => {
        if (playingVoiceId === messageId) {
            audioPlayerRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
        }

        const audio = new Audio(audioData);
        audioPlayerRef.current = audio;
        audio.onended = () => setPlayingVoiceId(null);
        audio.play();
        setPlayingVoiceId(messageId);
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleReaction = async (messageId, emoji) => {
        if (!role || !messageId) return;
        setActiveReactionMessage(null);
        playReactionSound();

        try {
            const msg = messages.find(m => m.id === messageId);
            const existingReaction = msg?.reactions?.find(r => r.emoji === emoji && r.user === role);
            const ref = doc(firestore, "chat-messages", messageId);

            if (existingReaction) {
                await updateDoc(ref, { reactions: arrayRemove({ emoji, user: role }) });
            } else {
                await updateDoc(ref, { reactions: arrayUnion({ emoji, user: role }) });
            }
        } catch (err) {
            console.error("Reaction error:", err);
        }
    };

    // Star/unstar a message
    const toggleStar = async (messageId) => {
        if (!messageId) return;
        try {
            const msg = messages.find(m => m.id === messageId);
            const ref = doc(firestore, "chat-messages", messageId);
            await updateDoc(ref, { starred: !msg?.starred });
        } catch (err) {
            console.error("Star error:", err);
        }
    };

    // Load custom stickers from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("haizur-custom-stickers");
        if (saved) {
            try {
                setCustomStickers(JSON.parse(saved));
            } catch (e) { /* ignore */ }
        }
    }, []);

    // Save custom stickers to localStorage
    const saveCustomStickers = (stickers) => {
        setCustomStickers(stickers);
        localStorage.setItem("haizur-custom-stickers", JSON.stringify(stickers));
    };

    // Compress image to reduce size
    const compressImage = (file, maxWidth = 400, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // Handle image file selection
    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError("Please select an image file");
            return;
        }

        try {
            const compressed = await compressImage(file, 600, 0.8);
            setImagePreview(compressed);
        } catch (err) {
            setError("Failed to process image");
        }
        e.target.value = '';
    };

    // Shared helper used by paste + drop — accepts a File, yields a compressed base64 preview
    const ingestImageFile = async (file) => {
        if (!file || !file.type?.startsWith('image/')) return;
        try {
            const compressed = await compressImage(file, 600, 0.8);
            setImagePreview(compressed);
            inputRef.current?.focus();
        } catch {
            setError("Failed to process image");
        }
    };

    // Handle custom sticker upload
    const handleStickerUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            // Smaller size for stickers
            const compressed = await compressImage(file, 150, 0.8);
            const newStickers = [...customStickers, compressed].slice(-12); // Max 12 custom stickers
            saveCustomStickers(newStickers);
        } catch (err) {
            setError("Failed to add sticker");
        }
        e.target.value = '';
    };

    // Remove custom sticker
    const removeCustomSticker = (index) => {
        const newStickers = customStickers.filter((_, i) => i !== index);
        saveCustomStickers(newStickers);
    };

    // Send image message (optionally with caption pulled from the main input)
    const sendImage = async () => {
        if (!imagePreview || !role) return;
        setSendingImage(true);
        const caption = newMessage.trim();
        try {
            await addDoc(collection(firestore, "chat-messages"), {
                image: imagePreview,
                text: caption || null,
                sender: role,
                timestamp: serverTimestamp(),
                reactions: [],
                readBy: [role],
                readByTimes: { [role]: serverTimestamp() },
                starred: false
            });
            setImagePreview(null);
            setNewMessage("");
            playSendSound();
        } catch (err) {
            console.error("Send image error:", err);
            setError("Failed to send image");
        }
        setSendingImage(false);
    };

    // Cancel image preview
    const cancelImagePreview = () => {
        setImagePreview(null);
    };

    // Get starred messages
    const starredMessages = messages.filter(m => m.starred);

    const formatTime = (ts) => {
        if (!ts?.toDate) return "";
        return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (ts) => {
        if (!ts?.toDate) return "";
        const d = ts.toDate();
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return "Today";
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    // Tooltip text for ✓✓ — shows when partner saw our message
    const buildSeenAtTooltip = (msg) => {
        if (!msg || msg.sender !== role) return undefined;
        if (!(msg.readBy?.length > 1)) return "Delivered";
        const other = role === "haidar" ? "princess" : "haidar";
        const ts = msg.readByTimes?.[other];
        if (!ts) return "Seen";
        try {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return `Seen ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        } catch {
            return "Seen";
        }
    };

    // Copy message text to clipboard with iOS 12 fallback
    const copyMessageText = async (text) => {
        if (!text) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.style.position = "fixed";
                ta.style.top = "-9999px";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
            }
            playCue("menuOpen");
            setCopyToast("Copied");
            if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
            copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 1400);
        } catch {
            setError("Copy failed");
        }
    };

    const showSeenPopover = (msgId) => {
        setSeenPopoverId(msgId);
        if (seenPopoverTimerRef.current) clearTimeout(seenPopoverTimerRef.current);
        seenPopoverTimerRef.current = setTimeout(() => setSeenPopoverId(null), 1800);
    };

    // Filter deleted messages and group
    const visibleMessages = filteredMessages.filter(m =>
        !m.deletedFor?.includes(role)
    );

    // Derive ordered image list for the lightbox (chronological, same order as render)
    const imageMessages = useMemo(() => (
        visibleMessages
            .filter(m => !!m.image && !m.deletedForEveryone)
            .map(m => ({
                id: m.id,
                src: m.image,
                sender: m.sender,
                timestamp: m.timestamp,
                caption: m.text || null,
            }))
    ), [visibleMessages]);

    const openLightboxFor = (msgId) => {
        const i = imageMessages.findIndex(img => img.id === msgId);
        if (i >= 0) {
            setActiveReactionMessage(null);
            setLightboxIndex(i);
        }
    };

    const groupedMessages = visibleMessages.reduce((acc, msg) => {
        const key = msg.timestamp ? formatDate(msg.timestamp) : "Now";
        if (!acc[key]) acc[key] = [];
        acc[key].push(msg);
        return acc;
    }, {});

    const currentTheme = CHAT_THEMES[chatTheme];

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 border-2 border-[var(--main-color)] border-t-transparent rounded-full"
                />
            </div>
        );
    }

    // Role selection
    if (!role) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-6 p-8 min-h-[300px]"
            >
                <div style={{ textAlign: 'center' }}>
                    {/* Wax seal decoration */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                        style={{
                            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
                            background: 'radial-gradient(circle at 35% 35%, var(--main-color), var(--wax-seal-color, var(--main-color)))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)',
                        }}
                    >
                        ✉
                    </motion.div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400,
                        fontStyle: 'italic', color: 'var(--text-color)', marginBottom: 6,
                    }}>Correspondence</h2>
                    <p style={{
                        color: 'var(--text-dim)', fontSize: 15,
                        fontFamily: 'var(--font-handwritten)',
                    }}>Select your identity to start chatting</p>
                </div>

                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2, rotate: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectRole("haidar")}
                        style={{
                            padding: '16px 28px', borderRadius: 'var(--radius-card)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)', color: 'var(--text-on-card)',
                            fontFamily: 'var(--font-handwritten)', fontSize: 17, fontWeight: 600,
                            cursor: 'pointer', boxShadow: '0 2px 6px var(--shadow-color)',
                            transform: 'rotate(-1.5deg)',
                        }}
                    >
                        Haidar
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2, rotate: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectRole("princess")}
                        style={{
                            padding: '16px 28px', borderRadius: 'var(--radius-card)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)', color: 'var(--text-on-card)',
                            fontFamily: 'var(--font-handwritten)', fontSize: 17, fontWeight: 600,
                            cursor: 'pointer', boxShadow: '0 2px 6px var(--shadow-color)',
                            transform: 'rotate(1.2deg)',
                        }}
                    >
                        Princess
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    // Chat interface
    const onChatDragEnter = (e) => {
        if (!e.dataTransfer?.types) return;
        const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
        if (!hasFiles) return;
        dragDepthRef.current += 1;
        if (!isDragging) setIsDragging(true);
    };
    const onChatDragLeave = () => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragging(false);
    };
    const onChatDragOver = (e) => {
        if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };
    const onChatDrop = async (e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        dragDepthRef.current = 0;
        setIsDragging(false);
        const file = Array.from(e.dataTransfer.files).find(f => f.type?.startsWith('image/'));
        if (!file) return;
        if (imagePreview) return;
        await ingestImageFile(file);
    };

    return (
        <div
            className={`flex flex-col ${isPopup ? 'h-[65vh] md:h-[70vh]' : 'w-full max-w-2xl h-[75vh] rounded-2xl mx-4'} overflow-hidden`}
            style={{ background: currentTheme.bg, position: 'relative' }}
            onDragEnter={onChatDragEnter}
            onDragLeave={onChatDragLeave}
            onDragOver={onChatDragOver}
            onDrop={onChatDrop}
        >
            {/* Drag-and-drop overlay */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 60,
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <div style={{
                            padding: '20px 28px',
                            borderRadius: 'var(--radius-card)',
                            background: 'var(--bg-card)',
                            border: '2px dashed var(--main-color)',
                            color: 'var(--main-color)',
                            fontFamily: 'var(--font-handwritten)',
                            fontSize: 18,
                            textAlign: 'center',
                            boxShadow: '0 8px 30px var(--shadow-color)',
                        }}>
                            📷 Drop to send image
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-color)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ fontSize: 18 }}>{role === "haidar" ? "✉" : "✒"}</span>
                        <span style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 8, height: 8, borderRadius: '50%',
                            border: '1.5px solid var(--bg-color)',
                            background: partnerPresence?.online ? "var(--success-color)" :
                                connectionStatus === "connected" ? "var(--sub-color)" :
                                connectionStatus === "connecting" ? "var(--honey-color)" : "var(--sub-color)",
                        }} className={(partnerPresence?.online || connectionStatus === "connecting") ? "animate-pulse" : ""} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                        <span style={{
                            fontFamily: 'var(--font-handwritten)', fontSize: 16, fontWeight: 600,
                            color: 'var(--text-on-card)',
                        }}>
                            {role === "haidar" ? "Princess" : "Haidar"}
                        </span>
                        <span style={{
                            fontSize: 11, color: partnerPresence?.online ? 'var(--success-color)' : 'var(--text-dim-card)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {connectionStatus === "error" ? "offline" :
                                connectionStatus === "connecting" ? "connecting…" :
                                partnerPresence ? (formatLastSeen(partnerPresence) || "offline") : "live"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Nudge — low-friction "still thinking of you" ping. Shows
                        "👉 nudged" for 1.5s after click so the user has clear
                        feedback the ping went through. */}
                    <motion.button
                        whileHover={{ scale: nudgeJustSent ? 1.0 : 1.1, rotate: nudgeJustSent ? 0 : 8 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={sendNudge}
                        className="rounded-full transition-colors"
                        style={{
                            padding: nudgeJustSent ? "4px 10px" : "8px",
                            background: nudgeJustSent ? "rgba(255, 200, 120, 0.22)" : "rgba(255, 200, 120, 0.12)",
                            cursor: "pointer",
                            fontSize: nudgeJustSent ? 13 : 16,
                            fontFamily: nudgeJustSent ? "var(--font-mono)" : "inherit",
                            color: nudgeJustSent ? "var(--main-color)" : "inherit",
                            display: "inline-flex", alignItems: "center", gap: 4,
                            border: "none",
                            minWidth: nudgeJustSent ? 0 : undefined,
                        }}
                        title="Send a nudge"
                        aria-label={nudgeJustSent ? "Nudge sent" : "Send a nudge"}
                    >
                        {nudgeJustSent ? <><span>👉</span><span>nudged</span></> : "✨"}
                    </motion.button>
                    {/* Call button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsCallOpen(true)}
                        className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors text-green-500"
                        title="Voice Call"
                        aria-label="Voice call"
                    >
                        📞
                    </motion.button>
                    {/* Starred messages button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowStarred(!showStarred)}
                        className={`p-2 rounded-full transition-colors ${showStarred ? 'bg-yellow-400 text-white' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                        title="Starred Messages"
                    >
                        ⭐
                    </motion.button>
                    {/* Search button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-[var(--main-color)] text-white' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                        title="Search"
                    >
                        🔍
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowThemePicker(!showThemePicker); setShowEmojiPicker(false); setShowStickerPicker(false); }}
                        className={`p-2 rounded-full transition-colors ${showThemePicker ? 'bg-[var(--main-color)] text-white' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                    >
                        🎨
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                        {soundEnabled ? "🔔" : "🔕"}
                    </motion.button>
                    <button
                        onClick={() => { localStorage.removeItem("haizur-chat-role"); setRole(null); }}
                        className="text-[13px] text-[var(--text-dim-card)] hover:text-[var(--text-on-card)] px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors ml-1"
                    >
                        Switch
                    </button>
                </div>
            </div>

            {/* Theme picker */}
            <AnimatePresence>
                {showThemePicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[var(--bg-color)] border-b border-[rgba(255,255,255,0.08)]"
                    >
                        <div className="flex gap-2 p-3 overflow-x-auto">
                            {Object.entries(CHAT_THEMES).map(([key, t]) => (
                                <motion.button
                                    key={key}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setChatTheme(key); setShowThemePicker(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '6px 12px', borderRadius: 'var(--radius-card)',
                                        fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                                        fontFamily: 'var(--font-handwritten)',
                                        background: chatTheme === key ? 'var(--main-color)' : 'var(--bg-secondary)',
                                        color: chatTheme === key ? 'var(--bg-color)' : 'var(--text-color)',
                                        border: '1px solid',
                                        borderColor: chatTheme === key ? 'var(--main-color)' : 'var(--border-color)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {t.emoji} {t.name}
                                </motion.button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 10px', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            <span>Message effects</span>
                            <button
                                type="button"
                                onClick={() => setEffectsEnabled((v) => !v)}
                                aria-pressed={effectsEnabled}
                                style={{
                                    padding: '4px 10px', borderRadius: 999,
                                    border: '1px solid var(--border-color)',
                                    background: effectsEnabled ? 'var(--main-color-dim)' : 'transparent',
                                    color: effectsEnabled ? 'var(--main-color)' : 'var(--text-dim)',
                                    cursor: 'pointer', fontSize: 11,
                                }}
                            >
                                {effectsEnabled ? 'on' : 'off'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search bar */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-[var(--bg-color)] border-b border-[rgba(255,255,255,0.08)]"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages..."
                                style={{
                                    flex: 1, padding: '8px 12px',
                                    borderRadius: 'var(--radius-card)',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-color)',
                                    fontSize: 15, outline: 'none',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="text-xs text-[var(--sub-color)]">
                                    Clear
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="text-xs text-[var(--sub-color)] px-3 pb-2">
                                {filteredMessages.length} results
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
                {otherTyping && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 bg-[var(--bg-color)]"
                    >
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]">
                            <span>{role === "haidar" ? "👸 Princess" : "⭐ Haidar"} is typing</span>
                            <motion.div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                    <motion.span
                                        key={i}
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                        className="w-1.5 h-1.5 bg-[var(--text-dim)] rounded-full"
                                    />
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error banner */}
            {error && (
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    className="bg-red-500/10 text-red-500 text-xs px-4 py-2 text-center"
                >
                    {error}
                </motion.div>
            )}

            {/* Messages - click outside to close popup */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1"
                onClick={() => setActiveReactionMessage(null)}
                style={{ overscrollBehavior: 'contain' }}
            >
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        <div style={{ position: 'relative', padding: '16px 0 8px' }}>
                            <div className="torn-paper-divider" style={{ margin: '0 0 6px' }} />
                            <div style={{
                                textAlign: 'center', fontSize: 13, color: 'var(--text-dim)',
                                fontFamily: 'var(--font-handwritten)', fontWeight: 500,
                                transform: 'rotate(-0.5deg)',
                            }}>
                                {date}
                            </div>
                        </div>

                        {msgs.map((msg, idx) => {
                            const isMe = msg.sender === role;
                            const bubbleColor = isMe ? currentTheme.myBubble : currentTheme.theirBubble;
                            const reactions = msg.reactions || [];
                            const isSticker = !!msg.sticker;
                            const isCustomSticker = isSticker && typeof msg.sticker === 'string' && msg.sticker.startsWith('data:');
                            const isVoice = !!msg.voiceMessage;
                            const isImage = !!msg.image;
                            const isDeleted = msg.deletedForEveryone;

                            // Show deleted indicator
                            if (isDeleted) {
                                return (
                                    <motion.div
                                        key={msg.id || idx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.6 }}
                                        className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}
                                    >
                                        <div
                                            className="px-3 py-2 text-sm italic"
                                            style={{
                                                borderRadius: 'var(--radius-card)',
                                                backgroundColor: 'transparent', color: 'var(--text-dim)',
                                                border: '1px dashed var(--text-dim)',
                                            }}
                                        >
                                            This message was deleted
                                        </div>
                                    </motion.div>
                                );
                            }

                            const isAnchor = msg.id && msg.id === lastHereAnchorId;
                            const isPulsing = msg.id && pulseId === msg.id;
                            return (
                                <React.Fragment key={msg.id || idx}>
                                    {isAnchor && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 4px 8px" }} aria-label="Unread marker">
                                            <div style={{ flex: 1, height: 1, background: "var(--main-color)", opacity: 0.35 }} />
                                            <span style={{ fontSize: 10.5, color: "var(--main-color)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", padding: "2px 8px", border: "1px solid var(--main-color)", borderRadius: 999, opacity: 0.8 }}>
                                                UNREAD ↓
                                            </span>
                                            <div style={{ flex: 1, height: 1, background: "var(--main-color)", opacity: 0.35 }} />
                                        </div>
                                    )}
                                <motion.div
                                    id={msg.id ? `msg-${msg.id}` : undefined}
                                    ref={(el) => {
                                        if (!msg.id) return;
                                        if (el) messageRefs.current.set(msg.id, el);
                                        else messageRefs.current.delete(msg.id);
                                    }}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={isPulsing ? { opacity: 1, y: 0, scale: [1, 1.04, 1] } : { opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: isPulsing ? 0.6 : 0.2, ease: "easeOut" }}
                                    className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}
                                >
                                    <div className="relative max-w-[80%]">
                                        <motion.div
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isVoice) {
                                                    playVoiceMessage(msg.id, msg.voiceMessage);
                                                } else {
                                                    setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id);
                                                }
                                            }}
                                            className={`cursor-pointer ${isSticker ? 'p-2' : isImage ? 'p-2' : 'px-3.5 py-2'}`}
                                            style={{
                                                borderRadius: 'var(--radius-card)',
                                                backgroundColor: isSticker || isImage ? 'transparent' : bubbleColor,
                                                color: isSticker || isImage ? 'inherit' : '#fff',
                                                boxShadow: isSticker || isImage ? 'none' : '0 1px 3px var(--shadow-color)',
                                                /* no rotation for readability */
                                            }}
                                        >
                                            {/* Starred indicator */}
                                            {msg.starred && (
                                                <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                                            )}

                                            {/* Reply preview — tap to jump to the quoted message */}
                                            {msg.replyTo && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); scrollToMessage(msg.replyTo.id); }}
                                                    className="mb-1 px-2 py-1 rounded text-[12px] opacity-80 text-left w-full hover:opacity-100 transition-opacity"
                                                    style={{ cursor: "pointer", background: "rgba(255,255,255,0.12)", color: "inherit", border: "none", borderLeft: "2px solid rgba(255,255,255,0.35)", display: "block" }}
                                                    aria-label="Jump to replied message"
                                                >
                                                    <span className="font-medium">{msg.replyTo.sender === "haidar" ? "Haidar" : "Princess"}: </span>
                                                    {formatMessageText(msg.replyTo.text)}
                                                </button>
                                            )}

                                            {isSticker ? (
                                                isCustomSticker ? (
                                                    <motion.img
                                                        src={msg.sticker}
                                                        alt="Custom sticker"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 400 }}
                                                        className="w-20 h-20 object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <motion.span
                                                        className="text-6xl block"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 400 }}
                                                    >
                                                        {msg.sticker}
                                                    </motion.span>
                                                )
                                            ) : isImage ? (
                                                <>
                                                    <motion.img
                                                        src={msg.image}
                                                        alt={msg.text || "Shared image"}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={(e) => { e.stopPropagation(); openLightboxFor(msg.id); }}
                                                        className="max-w-[250px] max-h-[200px] rounded-xl object-cover cursor-zoom-in block"
                                                        loading="lazy"
                                                        draggable={false}
                                                    />
                                                    {msg.text && (
                                                        <p
                                                            className="text-[14px] leading-relaxed break-words mt-1.5 px-0.5"
                                                            style={{ color: 'rgba(255,255,255,0.92)' }}
                                                        >
                                                            {formatMessageText(msg.text)}
                                                        </p>
                                                    )}
                                                </>
                                            ) : isVoice ? (
                                                <div className="flex items-center gap-2 min-w-[150px]">
                                                    <motion.div
                                                        animate={playingVoiceId === msg.id ? { scale: [1, 1.2, 1] } : {}}
                                                        transition={{ repeat: Infinity, duration: 0.5 }}
                                                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                                                    >
                                                        {playingVoiceId === msg.id ? "⏸" : "▶️"}
                                                    </motion.div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(12)].map((_, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    animate={playingVoiceId === msg.id ? { scaleY: [0.3, 1, 0.3] } : { scaleY: 0.5 + Math.random() * 0.5 }}
                                                                    transition={playingVoiceId === msg.id ? { repeat: Infinity, duration: 0.3, delay: i * 0.05 } : {}}
                                                                    className="w-1 h-4 bg-white/60 rounded-full"
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-[11px] opacity-70">
                                                            {msg.voiceDuration ? `0:${String(msg.voiceDuration).padStart(2, '0')}` : '0:00'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[15px] leading-relaxed break-words">{formatMessageText(msg.text)}</p>
                                            )}
                                            {!isSticker && !isVoice && !isImage && (
                                                <p className="text-[11px] opacity-60 text-right mt-0.5 flex items-center justify-end gap-1">
                                                    {formatTime(msg.timestamp)}
                                                    {isMe && (
                                                        <span
                                                            className={msg.readBy?.length > 1 ? "text-blue-400 cursor-help" : "opacity-50 cursor-help"}
                                                            title={buildSeenAtTooltip(msg)}
                                                            onClick={(e) => { e.stopPropagation(); showSeenPopover(msg.id); }}
                                                        >
                                                            {msg.readBy?.length > 1 ? "✓✓" : "✓"}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                            {/* Receipt + time for stickers/images/voice — rendered both directions for reactable padding */}
                                            {(isSticker || isVoice || isImage) && (
                                                <div
                                                    className="mt-1 flex items-center justify-end gap-1 px-0.5"
                                                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}
                                                >
                                                    <span>{formatTime(msg.timestamp)}</span>
                                                    {isMe && (
                                                        <span
                                                            className={msg.readBy?.length > 1 ? "text-blue-400 cursor-help" : "text-gray-300 cursor-help"}
                                                            title={buildSeenAtTooltip(msg)}
                                                            onClick={(e) => { e.stopPropagation(); showSeenPopover(msg.id); }}
                                                        >
                                                            {msg.readBy?.length > 1 ? "✓✓" : "✓"}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>

                                        {/* Seen-at popover (tap on ✓✓) */}
                                        <AnimatePresence>
                                            {seenPopoverId === msg.id && isMe && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'absolute',
                                                        [isMe ? 'right' : 'left']: 4,
                                                        bottom: -22,
                                                        padding: '2px 10px',
                                                        borderRadius: 999,
                                                        background: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        color: 'var(--main-color)',
                                                        fontSize: 10,
                                                        fontFamily: 'var(--font-mono)',
                                                        whiteSpace: 'nowrap',
                                                        zIndex: 25,
                                                        boxShadow: '0 2px 6px var(--shadow-color)',
                                                    }}
                                                >
                                                    {buildSeenAtTooltip(msg) || "Delivered"}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Reactions */}
                                        {reactions.length > 0 && (
                                            <div className={`absolute -bottom-2 ${isMe ? "right-1" : "left-1"} flex gap-0.5`}>
                                                {[...new Set(reactions.map(r => r.emoji))].slice(0, 4).map((emoji, i) => (
                                                    <motion.span
                                                        key={i}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-xs bg-[var(--bg-color)] shadow-sm rounded-full px-1 cursor-pointer hover:scale-110 transition-transform"
                                                        onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                                    >
                                                        {emoji}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Quick reactions popup */}
                                        <AnimatePresence>
                                            {activeReactionMessage === msg.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                                    transition={{ duration: 0.15 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'absolute',
                                                        [isMe ? 'right' : 'left']: 0, top: -44,
                                                        background: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-card)',
                                                        padding: '4px 6px', zIndex: 20,
                                                        boxShadow: '0 2px 8px var(--shadow-color)',
                                                    }}
                                                >
                                                    {/* Reactions row */}
                                                    <div className="flex gap-0.5">
                                                        {QUICK_REACTIONS.map((emoji) => (
                                                            <motion.button
                                                                key={emoji}
                                                                whileHover={{ scale: 1.2 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                                                className="text-base p-0.5 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors"
                                                            >
                                                                {emoji}
                                                            </motion.button>
                                                        ))}
                                                        <div className="w-px bg-[rgba(255,255,255,0.1)] mx-0.5" />
                                                        {/* Actions - icons only */}
                                                        <motion.button
                                                            whileHover={{ scale: 1.2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActiveReactionMessage(null); inputRef.current?.focus(); }}
                                                            className="text-base p-0.5 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors"
                                                            title="Reply"
                                                        >
                                                            ↩️
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); toggleStar(msg.id); setActiveReactionMessage(null); }}
                                                            className={`text-base p-0.5 rounded-full transition-colors ${msg.starred ? 'bg-yellow-200' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                                                            title={msg.starred ? "Unstar" : "Star"}
                                                        >
                                                            ⭐
                                                        </motion.button>
                                                        {msg.text && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.2 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); copyMessageText(msg.text); setActiveReactionMessage(null); }}
                                                                className="text-base p-0.5 hover:bg-[rgba(255,255,255,0.08)] rounded-full transition-colors"
                                                                title="Copy text"
                                                            >
                                                                📋
                                                            </motion.button>
                                                        )}
                                                        <motion.button
                                                            whileHover={{ scale: 1.2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id, false); }}
                                                            className="text-base p-0.5 hover:bg-red-100 rounded-full transition-colors"
                                                            title="Delete for me"
                                                        >
                                                            🗑️
                                                        </motion.button>
                                                        {isMe && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.2 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id, true); }}
                                                                className="text-xs p-0.5 hover:bg-red-100 rounded-full transition-colors"
                                                                style={{ color: 'var(--error-color)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                                                                title="Delete for everyone"
                                                            >
                                                                ✕all
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji picker */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[var(--bg-color)] border-t border-[rgba(255,255,255,0.08)]"
                    >
                        <div className="grid grid-cols-8 gap-1 p-3 max-h-32 overflow-y-auto">
                            {COMMON_EMOJIS.map((emoji) => (
                                <motion.button
                                    key={emoji}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => { setNewMessage(prev => prev + emoji); inputRef.current?.focus(); }}
                                    className="text-xl p-1 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                >
                                    {emoji}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticker picker */}
            <AnimatePresence>
                {showStickerPicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[var(--bg-color)] border-t border-[rgba(255,255,255,0.08)]"
                    >
                        <div className="flex gap-1 px-3 pt-3 overflow-x-auto">
                            {Object.entries(STICKER_PACKS).map(([key, pack]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveStickerPack(key)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 'var(--radius-card)',
                                        fontSize: 14, whiteSpace: 'nowrap',
                                        background: activeStickerPack === key ? 'var(--main-color)' : 'var(--bg-secondary)',
                                        color: activeStickerPack === key ? 'var(--bg-color)' : 'var(--text-color)',
                                        border: '1px solid',
                                        borderColor: activeStickerPack === key ? 'var(--main-color)' : 'var(--border-color)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {pack.emoji}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-6 gap-1 p-3">
                            {STICKER_PACKS[activeStickerPack].stickers.map((sticker, idx) => (
                                <motion.button
                                    key={idx}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => sendSticker(sticker)}
                                    className="text-3xl p-2 rounded-xl hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                                >
                                    {sticker}
                                </motion.button>
                            ))}
                        </div>

                        {/* Custom Stickers Section */}
                        <div className="px-3 pb-3 border-t border-[rgba(255,255,255,0.08)] pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--sub-color)]">Your Stickers</span>
                                <label className="text-xs text-[var(--main-color)] cursor-pointer hover:underline">
                                    + Add
                                    <input
                                        ref={stickerInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleStickerUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div className="flex gap-2 overflow-x-auto py-1">
                                {customStickers.length === 0 ? (
                                    <span className="text-xs text-[var(--sub-color)] opacity-50">Add photos as custom stickers</span>
                                ) : (
                                    customStickers.map((sticker, idx) => (
                                        <div key={idx} className="relative group shrink-0">
                                            <motion.img
                                                src={sticker}
                                                alt="Custom sticker"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => sendSticker(sticker)}
                                                className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                                            />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeCustomSticker(idx); }}
                                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input area */}
            <form onSubmit={sendMessage} className="p-3 bg-[var(--bg-color)] border-t border-[rgba(255,255,255,0.08)]">
                {/* Reply preview */}
                {replyingTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.08)] border-l-3 border-[var(--main-color)]"
                    >
                        <div className="flex-1 text-[13px]">
                            <span className="text-[var(--text-dim)]">Replying to </span>
                            <span className="font-medium text-[var(--text-color)]">
                                {replyingTo.sender === "haidar" ? "Haidar" : "Princess"}
                            </span>
                            <p className="text-[var(--text-color)] opacity-70 truncate mt-0.5">
                                {replyingTo.text || (replyingTo.sticker ? "Sticker" : replyingTo.image ? "Image" : "Voice message")}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="text-[var(--sub-color)] hover:text-[var(--text-color)] p-1"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}

                {/* Recording UI */}
                {isRecording ? (
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-3 h-3 bg-red-500 rounded-full"
                        />
                        <div className="flex-1 flex items-center gap-2">
                            <span className="text-red-500 font-mono text-sm">{formatRecordingTime(recordingTime)}</span>
                            <div className="flex-1 flex items-center gap-0.5">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ scaleY: [0.3, 1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                                        className="w-1 h-4 bg-red-400 rounded-full"
                                    />
                                ))}
                            </div>
                        </div>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={cancelRecording}
                            className="p-2 rounded-full bg-gray-200 text-gray-600"
                        >
                            ✕
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={stopRecording}
                            className="p-2.5 rounded-full bg-green-500 text-white"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </motion.button>
                    </div>
                ) : imagePreview ? (
                    /* Image preview with optional caption */
                    <div className="flex flex-col gap-2">
                        <div
                            className="flex items-center gap-3 p-2 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                            <img src={imagePreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover" />
                            <div
                                className="flex-1 text-xs italic"
                                style={{ color: 'var(--sub-color)' }}
                            >
                                Add a caption or send as-is
                            </div>
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={cancelImagePreview}
                                className="p-1.5 rounded-full text-sm"
                                style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border-color)' }}
                                aria-label="Cancel image"
                            >
                                ✕
                            </motion.button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !sendingImage) {
                                        e.preventDefault();
                                        sendImage();
                                    }
                                }}
                                placeholder="Caption (optional)…"
                                autoComplete="off"
                                className="flex-1"
                                style={{
                                    padding: '12px 16px', borderRadius: 'var(--radius-card)',
                                    background: 'var(--bg-secondary)', color: 'var(--text-color)',
                                    border: '1px solid var(--border-color)',
                                    outline: 'none', fontSize: 15,
                                    fontFamily: 'var(--font-body)',
                                }}
                            />
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={sendImage}
                                disabled={sendingImage}
                                style={{
                                    padding: 10, borderRadius: 'var(--radius-card)',
                                    background: 'var(--main-color)', color: 'var(--bg-color)',
                                    border: 'none', cursor: sendingImage ? 'wait' : 'pointer',
                                    fontWeight: 600, transition: 'all 0.2s',
                                    opacity: sendingImage ? 0.7 : 1,
                                }}
                                aria-label="Send image"
                            >
                                {sendingImage ? (
                                    <span style={{ display: 'inline-block', width: 20, textAlign: 'center' }}>…</span>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                )}
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {/* Image upload */}
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-full transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                        >
                            📷
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); setShowThemePicker(false); }}
                            className={`p-2.5 rounded-full transition-colors ${showStickerPicker ? 'bg-[var(--main-color)] text-white' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                        >
                            🎭
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); setShowThemePicker(false); }}
                            className={`p-2.5 rounded-full transition-colors ${showEmojiPicker ? 'bg-[var(--main-color)] text-white' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
                        >
                            😊
                        </motion.button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            placeholder={replyingTo ? "Reply..." : "Message..."}
                            autoComplete="off"
                            className="flex-1 transition-all"
                            style={{
                                padding: '12px 16px', borderRadius: 'var(--radius-card)',
                                background: 'var(--bg-secondary)', color: 'var(--text-color)',
                                border: '1px solid var(--border-color)',
                                outline: 'none', fontSize: 15,
                                fontFamily: 'var(--font-body)',
                            }}
                        />
                        {newMessage.trim() ? (
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    padding: 10, borderRadius: 'var(--radius-card)',
                                    background: 'var(--main-color)', color: 'var(--bg-color)',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: 600, transition: 'all 0.2s',
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startRecording}
                                style={{
                                    padding: 10, borderRadius: 'var(--radius-card)',
                                    background: 'var(--main-color)', color: 'var(--bg-color)',
                                    border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                🎤
                            </motion.button>
                        )}
                    </div>
                )}
            </form>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
            />

            {/* Starred Messages Panel */}
            <AnimatePresence>
                {showStarred && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25 }}
                        className="absolute inset-0 bg-[var(--bg-color)] z-30 flex flex-col"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                            <span className="font-semibold text-[var(--text-color)] text-[16px]">⭐ Starred Messages</span>
                            <button
                                onClick={() => setShowStarred(false)}
                                className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.08)]"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {starredMessages.length === 0 ? (
                                <div className="text-center text-[var(--text-dim)] py-8">
                                    <span className="text-4xl block mb-2">⭐</span>
                                    <p className="text-[15px]">No starred messages yet</p>
                                    <p className="text-[13px] opacity-60">Tap a message and click ⭐ to save it here</p>
                                </div>
                            ) : (
                                starredMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{msg.sender === "haidar" ? "⭐" : "👸"}</span>
                                            <span className="text-[13px] text-[var(--text-dim)]">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        {msg.text && <p className="text-[15px] text-[var(--text-color)]">{msg.text}</p>}
                                        {msg.sticker && <span className="text-3xl">{typeof msg.sticker === 'string' && msg.sticker.startsWith('data:') ? <img src={msg.sticker} className="w-12 h-12 rounded" /> : msg.sticker}</span>}
                                        {msg.image && <img src={msg.image} className="max-w-[150px] rounded-lg" />}
                                        {msg.voiceMessage && <span className="text-sm">🎤 Voice message</span>}
                                        <button
                                            onClick={() => toggleStar(msg.id)}
                                            className="text-xs text-red-400 mt-2 hover:underline"
                                        >
                                            Remove star
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio Call Modal */}
            <AudioCall
                role={role}
                isOpen={isCallOpen}
                onClose={() => setIsCallOpen(false)}
            />

            {/* Floating nudge banner — shown for a couple seconds when partner pings */}
            <AnimatePresence>
                {nudgeBanner && (
                    <motion.div
                        key={nudgeBanner.at}
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 380, damping: 22 }}
                        style={{
                            position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
                            zIndex: 40,
                            padding: "8px 16px",
                            background: "var(--bg-card)",
                            border: "1px solid var(--main-color)",
                            borderRadius: 999,
                            boxShadow: "0 8px 24px var(--shadow-color)",
                            fontFamily: "var(--font-handwritten)",
                            fontSize: 14, color: "var(--main-color)",
                            display: "flex", alignItems: "center", gap: 8,
                            pointerEvents: "none",
                        }}
                    >
                        <motion.span animate={{ rotate: [0, 14, -14, 0] }} transition={{ duration: 0.8 }}>✨</motion.span>
                        <span>{nudgeBanner.from} sent a nudge</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message effect overlays */}
            {activeEffects.map((e) => (
                <MessageEffect
                    key={e.id}
                    variant={e.variant}
                    anchorRect={e.rect}
                    onDone={() => removeEffect(e.id)}
                />
            ))}

            {/* Copy-to-clipboard toast */}
            <AnimatePresence>
                {copyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.18 }}
                        style={{
                            position: "absolute", bottom: 82, left: "50%",
                            transform: "translateX(-50%)", zIndex: 45,
                            padding: "8px 18px", borderRadius: 999,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            color: "var(--main-color)",
                            fontFamily: "var(--font-handwritten)",
                            fontSize: 13, whiteSpace: "nowrap",
                            boxShadow: "0 4px 20px var(--shadow-color)",
                            pointerEvents: "none",
                        }}
                    >
                        {copyToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen image lightbox */}
            {lightboxIndex !== null && imageMessages.length > 0 && (
                <ChatImageLightbox
                    images={imageMessages}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </div>
    );
};

export default LiveChat;
