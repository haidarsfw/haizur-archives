// Word generator backed by /data/wordsData.json. The raw corpus is no longer
// bundled — it is fetched once at app mount (primeWords) and kept in memory.
// Until the fetch resolves, a small fallback list keeps the typing test usable.

export { speakerNames } from "./speakers";

let _corpus = null;
let _primePromise = null;

const FALLBACK = {
    p1: [
        "aku", "kamu", "sayang", "banget", "gatau", "iyaa", "oke", "haha", "lucu",
        "tapi", "ituu", "gimana", "kenapa", "emang", "masih", "lagi", "ya", "dong",
        "zur", "deh", "sih", "hmm", "bentar", "udah", "ngapain", "coba", "gapapa",
        "wkwk", "hihi", "eh",
    ],
    p2: [
        "kakak", "aku", "mau", "gitu", "gabisa", "tidur", "loh", "anjir", "wkwk",
        "yaudah", "huhu", "hayo", "apaan", "dehh", "sih", "banget", "kok", "okee",
        "eh", "hihi", "astaga", "iyaa", "nahh", "lucuu", "kaaak", "emg", "yaa",
        "serem", "iiihh", "ayoo",
    ],
};

export const primeWords = () => {
    if (_corpus) return Promise.resolve(_corpus);
    if (_primePromise) return _primePromise;
    _primePromise = fetch("/data/wordsData.json")
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((data) => {
            _corpus = data;
            return data;
        })
        .catch((err) => {
            console.warn("words corpus fetch failed, using fallback:", err?.message || err);
            _primePromise = null;
            return null;
        });
    return _primePromise;
};

const pickSource = (lang) => {
    const key = lang === "p2" ? "p2" : "p1";
    if (_corpus) {
        return _corpus[key] || _corpus.p1 || FALLBACK[key] || FALLBACK.p1;
    }
    return FALLBACK[key] || FALLBACK.p1;
};

export const generateWords = (lang = "p1", count = 25) => {
    const src = pickSource(lang);
    if (!src || src.length === 0) return "no messages found";
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
        out[i] = src[Math.floor(Math.random() * src.length)];
    }
    return out.join(" ");
};

export const isCorpusPrimed = () => !!_corpus;
