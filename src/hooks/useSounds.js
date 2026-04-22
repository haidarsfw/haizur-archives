import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    playSound as playSoundByName,
    setSoundsEnabled,
    getSoundsEnabled,
    primeSounds,
} from '../sounds';

const LISTENERS = new Set();
const notify = () => LISTENERS.forEach(fn => fn());

export const useSounds = () => {
    const [enabled, setEnabledState] = useState(() => getSoundsEnabled());

    useEffect(() => {
        const listener = () => setEnabledState(getSoundsEnabled());
        LISTENERS.add(listener);
        return () => { LISTENERS.delete(listener); };
    }, []);

    const play = useCallback((name) => {
        if (!getSoundsEnabled()) return;
        playSoundByName(name);
    }, []);

    const setEnabled = useCallback((value) => {
        setSoundsEnabled(value);
        setEnabledState(getSoundsEnabled());
        notify();
    }, []);

    // Return a memoized object so hook consumers do not re-subscribe effects
    // on every render due to an unstable reference.
    return useMemo(() => ({ play, enabled, setEnabled }), [play, enabled, setEnabled]);
};

// Fire-and-forget prime on first user gesture. Attach once at app mount.
export const wirePrimeOnUserGesture = () => {
    const prime = () => {
        primeSounds();
        window.removeEventListener('pointerdown', prime);
        window.removeEventListener('keydown', prime);
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
};
