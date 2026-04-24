import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
    const [reduce, setReduce] = useState(() => {
        if (typeof window === "undefined" || !window.matchMedia) return false;
        try { return window.matchMedia(QUERY).matches; } catch { return false; }
    });

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        let mq;
        try { mq = window.matchMedia(QUERY); } catch { return; }
        const onChange = () => setReduce(!!mq.matches);
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", onChange);
            else if (mq.removeListener) mq.removeListener(onChange);
        };
    }, []);

    return reduce;
}
