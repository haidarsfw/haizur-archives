import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../firebase";
import { ref, set, onValue, onDisconnect, remove } from "firebase/database";

// Accepts 'gameData' to broadcast specific game stats (like wpm, typed index)
export const useMultiplayer = (activeGame, gameData = {}) => {
  const [users, setUsers] = useState({});
  const myId = useRef(Math.random().toString(36).substr(2, 9));
  const prevGameDataRef = useRef(null);
  const gameDataRef = useRef(gameData);

  const isPrincess = new URLSearchParams(window.location.search).get("princess") === "true";
  const myRole = isPrincess ? "princess" : "prince";

  // Update gameData ref without triggering effect re-run
  useEffect(() => {
    const serialized = JSON.stringify(gameData);
    if (serialized !== prevGameDataRef.current) {
      prevGameDataRef.current = serialized;
      gameDataRef.current = gameData;
    }
  }, [gameData]);

  // Broadcast gameData changes separately (throttled)
  useEffect(() => {
    if (!db) return;
    const userRef = ref(db, `users/${myId.current}`);
    const interval = setInterval(() => {
      const current = JSON.stringify(gameDataRef.current);
      if (current !== prevGameDataRef.current) return; // already up to date
      set(userRef, {
        x: 50, y: 50,
        role: myRole,
        status: activeGame || "menu",
        gameData: gameDataRef.current,
        lastSeen: Date.now(),
        online: true,
      }).catch(() => { });
    }, 2000);
    return () => clearInterval(interval);
  }, [activeGame, myRole]);

  useEffect(() => {
    if (!db) return;
    const userRef = ref(db, `users/${myId.current}`);

    // Update DB whenever mouse moves
    const updateDB = (x, y) => {
      set(userRef, {
        x, y,
        role: myRole,
        status: activeGame || "menu",
        gameData: gameDataRef.current,
        lastSeen: Date.now(),
        online: true
      });
    };

    // Initial set
    updateDB(50, 50);
    onDisconnect(userRef).remove();

    // Listen for others — batch stale user removal
    const allUsersRef = ref(db, 'users');
    const unsubscribe = onValue(allUsersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = Date.now();
      const others = {};
      const staleKeys = [];

      Object.keys(data).forEach(key => {
        if (key === myId.current) return;
        const isRecent = (now - data[key].lastSeen) < 60000;
        if (isRecent) {
          others[key] = data[key];
        } else {
          staleKeys.push(key);
        }
      });
      setUsers(others);

      // Batch remove stale users (max 3 per tick to avoid spikes)
      staleKeys.slice(0, 3).forEach(key => {
        remove(ref(db, `users/${key}`)).catch(() => { });
      });
    });

    let lastUpdate = 0;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastUpdate > 500) {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        updateDB(x, y);
        lastUpdate = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      remove(userRef);
      unsubscribe();
    };
  }, [activeGame, myRole]);

  return users;
};