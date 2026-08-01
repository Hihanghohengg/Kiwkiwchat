import { useState, useEffect, useRef } from 'react';

const ROOM_TTL_SECONDS = import.meta.env.VITE_TEST_MODE
  ? (parseInt(import.meta.env.VITE_ROOM_TTL_SECONDS) || 3)
  : 15 * 60; // 15 minutes

export function useCountdown(startTimestamp, running) {
  const calcRemaining = () => {
    if (!startTimestamp) return ROOM_TTL_SECONDS;
    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(0, ROOM_TTL_SECONDS - elapsed);
  };

  const [seconds, setSeconds] = useState(calcRemaining);
  const interval = useRef(null);

  useEffect(() => {
    if (!running || !startTimestamp) return;
    setSeconds(calcRemaining());
    interval.current = setInterval(() => setSeconds(calcRemaining()), 1000);
    return () => clearInterval(interval.current);
  }, [running, startTimestamp]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, seconds };
}
