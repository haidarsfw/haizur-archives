// Curated emoji set with search keywords + category + skin-tone flag.
// Kept compact intentionally — ~180 emojis covering common needs for a 2-person
// relationship chat. Larger unicode emoji DBs exist but balloon bundle size.

export const EMOJI_CATEGORIES = [
    { id: "recent", label: "Recent", icon: "🕐" },
    { id: "smileys", label: "Smileys", icon: "😀" },
    { id: "hearts", label: "Hearts", icon: "❤️" },
    { id: "people", label: "People", icon: "🙌" },
    { id: "animals", label: "Animals", icon: "🐱" },
    { id: "food", label: "Food", icon: "🍕" },
    { id: "travel", label: "Travel", icon: "✈️" },
    { id: "activities", label: "Fun", icon: "🎉" },
    { id: "symbols", label: "Symbols", icon: "✨" },
];

// `tonable: true` = emoji supports skin-tone modifiers (U+1F3FB..U+1F3FF)
export const EMOJI_DATA = [
    // Smileys
    { char: "😀", category: "smileys", keywords: ["smile", "happy", "grin"] },
    { char: "😁", category: "smileys", keywords: ["beam", "grin", "teeth"] },
    { char: "😂", category: "smileys", keywords: ["joy", "laugh", "tears"] },
    { char: "🤣", category: "smileys", keywords: ["rofl", "laugh", "lol"] },
    { char: "😊", category: "smileys", keywords: ["blush", "smile", "happy"] },
    { char: "😇", category: "smileys", keywords: ["angel", "innocent", "halo"] },
    { char: "🙂", category: "smileys", keywords: ["slight", "smile"] },
    { char: "😉", category: "smileys", keywords: ["wink", "flirt"] },
    { char: "😍", category: "smileys", keywords: ["love", "heart", "eyes"] },
    { char: "🥰", category: "smileys", keywords: ["love", "hearts", "adore"] },
    { char: "😘", category: "smileys", keywords: ["kiss", "blow", "love"] },
    { char: "😗", category: "smileys", keywords: ["kiss", "pucker"] },
    { char: "😚", category: "smileys", keywords: ["kiss", "closed"] },
    { char: "😋", category: "smileys", keywords: ["yum", "tasty", "tongue"] },
    { char: "😛", category: "smileys", keywords: ["tongue", "tease"] },
    { char: "😜", category: "smileys", keywords: ["wink", "tongue"] },
    { char: "🤪", category: "smileys", keywords: ["zany", "crazy", "silly"] },
    { char: "🤨", category: "smileys", keywords: ["raised", "brow", "skeptic"] },
    { char: "🧐", category: "smileys", keywords: ["monocle", "think", "inspect"] },
    { char: "🤓", category: "smileys", keywords: ["nerd", "geek", "glasses"] },
    { char: "😎", category: "smileys", keywords: ["cool", "sunglasses"] },
    { char: "🥳", category: "smileys", keywords: ["party", "celebrate", "birthday"] },
    { char: "😏", category: "smileys", keywords: ["smirk", "sly"] },
    { char: "😒", category: "smileys", keywords: ["unamused", "meh"] },
    { char: "🙄", category: "smileys", keywords: ["eye", "roll", "done"] },
    { char: "😔", category: "smileys", keywords: ["sad", "pensive"] },
    { char: "😪", category: "smileys", keywords: ["sleepy", "tired"] },
    { char: "🥱", category: "smileys", keywords: ["yawn", "bored", "tired"] },
    { char: "😴", category: "smileys", keywords: ["sleep", "zzz", "tired"] },
    { char: "🥺", category: "smileys", keywords: ["pleading", "puppy", "cute"] },
    { char: "😢", category: "smileys", keywords: ["cry", "sad", "tear"] },
    { char: "😭", category: "smileys", keywords: ["sob", "cry", "wail"] },
    { char: "😤", category: "smileys", keywords: ["huff", "triumph", "pout"] },
    { char: "😠", category: "smileys", keywords: ["angry", "mad"] },
    { char: "🤬", category: "smileys", keywords: ["curse", "angry", "swear"] },
    { char: "🤯", category: "smileys", keywords: ["mind", "blown", "shocked"] },
    { char: "😳", category: "smileys", keywords: ["flushed", "embarrass"] },
    { char: "🥵", category: "smileys", keywords: ["hot", "heat", "sweat"] },
    { char: "🥶", category: "smileys", keywords: ["cold", "freeze"] },
    { char: "😱", category: "smileys", keywords: ["scream", "shock", "fear"] },
    { char: "😨", category: "smileys", keywords: ["fear", "anxious"] },
    { char: "😰", category: "smileys", keywords: ["anxious", "sweat", "nervous"] },
    { char: "🤗", category: "smileys", keywords: ["hug", "embrace"] },
    { char: "🤔", category: "smileys", keywords: ["think", "ponder"] },
    { char: "🤭", category: "smileys", keywords: ["giggle", "shy"] },
    { char: "🤫", category: "smileys", keywords: ["shush", "quiet", "secret"] },
    { char: "🫶", category: "smileys", keywords: ["heart", "hands", "love"] },
    { char: "😶", category: "smileys", keywords: ["speechless", "silent"] },
    { char: "🙃", category: "smileys", keywords: ["upside", "down", "silly"] },
    { char: "💀", category: "smileys", keywords: ["skull", "dead", "dying"] },
    { char: "🤡", category: "smileys", keywords: ["clown", "silly", "joke"] },
    { char: "😈", category: "smileys", keywords: ["devil", "horns", "evil"] },
    { char: "👻", category: "smileys", keywords: ["ghost", "boo"] },

    // Hearts
    { char: "❤️", category: "hearts", keywords: ["heart", "love", "red"] },
    { char: "🧡", category: "hearts", keywords: ["orange", "heart", "love"] },
    { char: "💛", category: "hearts", keywords: ["yellow", "heart", "love"] },
    { char: "💚", category: "hearts", keywords: ["green", "heart", "love"] },
    { char: "💙", category: "hearts", keywords: ["blue", "heart", "love"] },
    { char: "💜", category: "hearts", keywords: ["purple", "heart", "love"] },
    { char: "🖤", category: "hearts", keywords: ["black", "heart"] },
    { char: "🤍", category: "hearts", keywords: ["white", "heart"] },
    { char: "🤎", category: "hearts", keywords: ["brown", "heart"] },
    { char: "💕", category: "hearts", keywords: ["two", "hearts", "love"] },
    { char: "💞", category: "hearts", keywords: ["revolve", "hearts"] },
    { char: "💓", category: "hearts", keywords: ["beat", "heart", "pulse"] },
    { char: "💗", category: "hearts", keywords: ["grow", "heart", "pink"] },
    { char: "💖", category: "hearts", keywords: ["sparkle", "heart"] },
    { char: "💘", category: "hearts", keywords: ["arrow", "heart", "cupid"] },
    { char: "💝", category: "hearts", keywords: ["gift", "heart"] },
    { char: "💟", category: "hearts", keywords: ["decoration", "heart"] },
    { char: "❣️", category: "hearts", keywords: ["exclamation", "heart"] },
    { char: "💔", category: "hearts", keywords: ["broken", "heart"] },

    // People — tonable ones
    { char: "👋", category: "people", keywords: ["wave", "hi", "bye"], tonable: true },
    { char: "🤚", category: "people", keywords: ["raised", "hand"], tonable: true },
    { char: "✋", category: "people", keywords: ["hand", "stop"], tonable: true },
    { char: "👌", category: "people", keywords: ["ok", "okay", "good"], tonable: true },
    { char: "🤌", category: "people", keywords: ["pinch", "fingers"], tonable: true },
    { char: "🤏", category: "people", keywords: ["pinch", "small"], tonable: true },
    { char: "✌️", category: "people", keywords: ["peace", "victory", "two"], tonable: true },
    { char: "🤞", category: "people", keywords: ["cross", "fingers", "luck"], tonable: true },
    { char: "🤟", category: "people", keywords: ["love", "you", "rock"], tonable: true },
    { char: "🤘", category: "people", keywords: ["rock", "horns"], tonable: true },
    { char: "🤙", category: "people", keywords: ["call", "me", "shaka"], tonable: true },
    { char: "👈", category: "people", keywords: ["point", "left"], tonable: true },
    { char: "👉", category: "people", keywords: ["point", "right"], tonable: true },
    { char: "👆", category: "people", keywords: ["point", "up"], tonable: true },
    { char: "👇", category: "people", keywords: ["point", "down"], tonable: true },
    { char: "👍", category: "people", keywords: ["thumbs", "up", "yes", "good"], tonable: true },
    { char: "👎", category: "people", keywords: ["thumbs", "down", "no", "bad"], tonable: true },
    { char: "✊", category: "people", keywords: ["fist", "solidarity"], tonable: true },
    { char: "👊", category: "people", keywords: ["punch", "fist"], tonable: true },
    { char: "🤛", category: "people", keywords: ["left", "fist"], tonable: true },
    { char: "🤜", category: "people", keywords: ["right", "fist"], tonable: true },
    { char: "👏", category: "people", keywords: ["clap", "applause"], tonable: true },
    { char: "🙌", category: "people", keywords: ["raise", "hands", "praise"], tonable: true },
    { char: "👐", category: "people", keywords: ["open", "hands"], tonable: true },
    { char: "🤲", category: "people", keywords: ["palms", "up"], tonable: true },
    { char: "🙏", category: "people", keywords: ["pray", "please", "thanks"], tonable: true },
    { char: "💪", category: "people", keywords: ["flex", "muscle", "strong"], tonable: true },
    { char: "👂", category: "people", keywords: ["ear", "listen"], tonable: true },
    { char: "👃", category: "people", keywords: ["nose"], tonable: true },
    { char: "👀", category: "people", keywords: ["eyes", "look", "see"] },
    { char: "👁️", category: "people", keywords: ["eye"] },
    { char: "👄", category: "people", keywords: ["mouth", "lips"] },
    { char: "🫦", category: "people", keywords: ["bite", "lip"] },
    { char: "💋", category: "people", keywords: ["kiss", "lipstick"] },

    // Animals
    { char: "🐶", category: "animals", keywords: ["dog", "puppy"] },
    { char: "🐱", category: "animals", keywords: ["cat", "kitty"] },
    { char: "🐭", category: "animals", keywords: ["mouse"] },
    { char: "🐰", category: "animals", keywords: ["rabbit", "bunny"] },
    { char: "🦊", category: "animals", keywords: ["fox"] },
    { char: "🐻", category: "animals", keywords: ["bear"] },
    { char: "🐼", category: "animals", keywords: ["panda"] },
    { char: "🐨", category: "animals", keywords: ["koala"] },
    { char: "🐯", category: "animals", keywords: ["tiger"] },
    { char: "🦁", category: "animals", keywords: ["lion"] },
    { char: "🐷", category: "animals", keywords: ["pig"] },
    { char: "🐸", category: "animals", keywords: ["frog"] },
    { char: "🐵", category: "animals", keywords: ["monkey"] },
    { char: "🐔", category: "animals", keywords: ["chicken"] },
    { char: "🐧", category: "animals", keywords: ["penguin"] },
    { char: "🐦", category: "animals", keywords: ["bird"] },
    { char: "🐤", category: "animals", keywords: ["chick", "baby"] },
    { char: "🦋", category: "animals", keywords: ["butterfly"] },
    { char: "🐝", category: "animals", keywords: ["bee"] },
    { char: "🐞", category: "animals", keywords: ["ladybug"] },
    { char: "🦄", category: "animals", keywords: ["unicorn", "magic"] },
    { char: "🐢", category: "animals", keywords: ["turtle"] },
    { char: "🐍", category: "animals", keywords: ["snake"] },
    { char: "🐬", category: "animals", keywords: ["dolphin"] },
    { char: "🐳", category: "animals", keywords: ["whale"] },
    { char: "🐙", category: "animals", keywords: ["octopus"] },

    // Food
    { char: "🍎", category: "food", keywords: ["apple", "red"] },
    { char: "🍊", category: "food", keywords: ["orange"] },
    { char: "🍋", category: "food", keywords: ["lemon"] },
    { char: "🍌", category: "food", keywords: ["banana"] },
    { char: "🍉", category: "food", keywords: ["watermelon"] },
    { char: "🍇", category: "food", keywords: ["grape"] },
    { char: "🍓", category: "food", keywords: ["strawberry"] },
    { char: "🍒", category: "food", keywords: ["cherry"] },
    { char: "🥑", category: "food", keywords: ["avocado"] },
    { char: "🍕", category: "food", keywords: ["pizza"] },
    { char: "🍔", category: "food", keywords: ["burger"] },
    { char: "🍟", category: "food", keywords: ["fries"] },
    { char: "🌭", category: "food", keywords: ["hotdog"] },
    { char: "🌮", category: "food", keywords: ["taco"] },
    { char: "🍜", category: "food", keywords: ["ramen", "noodle"] },
    { char: "🍚", category: "food", keywords: ["rice"] },
    { char: "🍣", category: "food", keywords: ["sushi"] },
    { char: "🍰", category: "food", keywords: ["cake"] },
    { char: "🎂", category: "food", keywords: ["birthday", "cake"] },
    { char: "🧁", category: "food", keywords: ["cupcake"] },
    { char: "🍪", category: "food", keywords: ["cookie"] },
    { char: "🍩", category: "food", keywords: ["donut"] },
    { char: "🍫", category: "food", keywords: ["chocolate"] },
    { char: "🍦", category: "food", keywords: ["ice", "cream"] },
    { char: "☕", category: "food", keywords: ["coffee", "hot"] },
    { char: "🍵", category: "food", keywords: ["tea", "matcha"] },
    { char: "🧋", category: "food", keywords: ["boba", "bubble", "milk"] },
    { char: "🍷", category: "food", keywords: ["wine"] },
    { char: "🍺", category: "food", keywords: ["beer"] },
    { char: "🥂", category: "food", keywords: ["cheers", "champagne"] },

    // Travel + places
    { char: "✈️", category: "travel", keywords: ["plane", "flight"] },
    { char: "🚗", category: "travel", keywords: ["car"] },
    { char: "🚕", category: "travel", keywords: ["taxi"] },
    { char: "🚲", category: "travel", keywords: ["bike"] },
    { char: "🛵", category: "travel", keywords: ["scooter", "moped"] },
    { char: "🏠", category: "travel", keywords: ["home", "house"] },
    { char: "🏖️", category: "travel", keywords: ["beach"] },
    { char: "🏔️", category: "travel", keywords: ["mountain"] },
    { char: "🌅", category: "travel", keywords: ["sunrise"] },
    { char: "🌇", category: "travel", keywords: ["sunset"] },
    { char: "🌃", category: "travel", keywords: ["night"] },
    { char: "🗺️", category: "travel", keywords: ["map"] },

    // Activities
    { char: "🎉", category: "activities", keywords: ["party", "celebrate"] },
    { char: "🎊", category: "activities", keywords: ["confetti", "party"] },
    { char: "🎁", category: "activities", keywords: ["gift", "present"] },
    { char: "🎈", category: "activities", keywords: ["balloon"] },
    { char: "🎂", category: "activities", keywords: ["birthday", "cake"] },
    { char: "🎶", category: "activities", keywords: ["music", "notes"] },
    { char: "🎵", category: "activities", keywords: ["music", "note"] },
    { char: "🎤", category: "activities", keywords: ["mic", "sing"] },
    { char: "🎧", category: "activities", keywords: ["headphones"] },
    { char: "🎮", category: "activities", keywords: ["game", "gamepad"] },
    { char: "🎯", category: "activities", keywords: ["target", "dart"] },
    { char: "🎨", category: "activities", keywords: ["art", "paint"] },
    { char: "📸", category: "activities", keywords: ["camera", "photo"] },
    { char: "🎬", category: "activities", keywords: ["movie", "clapper"] },
    { char: "📺", category: "activities", keywords: ["tv"] },

    // Symbols
    { char: "✨", category: "symbols", keywords: ["sparkle", "magic", "shine"] },
    { char: "🔥", category: "symbols", keywords: ["fire", "lit", "hot"] },
    { char: "🌟", category: "symbols", keywords: ["star", "glow"] },
    { char: "⭐", category: "symbols", keywords: ["star"] },
    { char: "💫", category: "symbols", keywords: ["dizzy", "star"] },
    { char: "💥", category: "symbols", keywords: ["boom", "collide"] },
    { char: "💦", category: "symbols", keywords: ["sweat", "drops"] },
    { char: "💨", category: "symbols", keywords: ["dash", "wind"] },
    { char: "💯", category: "symbols", keywords: ["hundred", "perfect"] },
    { char: "✅", category: "symbols", keywords: ["check", "yes", "done"] },
    { char: "❌", category: "symbols", keywords: ["cross", "no", "cancel"] },
    { char: "❓", category: "symbols", keywords: ["question"] },
    { char: "❗", category: "symbols", keywords: ["exclaim", "important"] },
    { char: "☀️", category: "symbols", keywords: ["sun", "sunny"] },
    { char: "🌙", category: "symbols", keywords: ["moon", "night"] },
    { char: "☁️", category: "symbols", keywords: ["cloud"] },
    { char: "🌈", category: "symbols", keywords: ["rainbow"] },
    { char: "☔", category: "symbols", keywords: ["rain", "umbrella"] },
    { char: "❄️", category: "symbols", keywords: ["snow", "cold"] },
];

const TONE_MODS = ["", "\u{1F3FB}", "\u{1F3FC}", "\u{1F3FD}", "\u{1F3FE}", "\u{1F3FF}"];

/** Apply a skin-tone modifier to a tonable emoji. Tone index 0 = default (no mod). */
export function applySkinTone(char, toneIndex) {
    if (!toneIndex || toneIndex < 1 || toneIndex > 5) return char;
    const mod = TONE_MODS[toneIndex];
    // Strip any existing VS16 or tone, append new tone
    const base = char.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
    return base + mod;
}

export function getToneModifier(toneIndex) {
    return TONE_MODS[toneIndex] || "";
}

export function searchEmojis(query, limit = 60) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const e of EMOJI_DATA) {
        if (e.keywords.some(k => k.includes(q))) out.push(e);
        if (out.length >= limit) break;
    }
    return out;
}

export function emojisByCategory(catId) {
    return EMOJI_DATA.filter(e => e.category === catId);
}
