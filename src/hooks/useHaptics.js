import { useMemo } from "react";

const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

const safeVibrate = (pattern) => {
    if (!canVibrate()) return;
    try { navigator.vibrate(pattern); } catch { /* no-op */ }
};

export function useHaptics() {
    return useMemo(() => ({
        tap: () => safeVibrate(10),
        pop: () => safeVibrate([15, 25, 15]),
        success: () => safeVibrate([10, 20, 10, 20, 10]),
        error: () => safeVibrate([40, 60, 40]),
    }), []);
}
