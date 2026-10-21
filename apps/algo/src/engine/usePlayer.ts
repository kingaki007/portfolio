import { useCallback, useEffect, useState } from "react";

export function usePlayer(total: number, speedMs = 700) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(speedMs);

  const last = Math.max(0, total - 1);

  useEffect(() => {
    setIndex((i) => Math.min(i, last));
  }, [last]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), speed);
    return () => clearTimeout(t);
  }, [playing, index, last, speed]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);
  const toggle = useCallback(() => {
    setPlaying((p) => (index >= last ? (setIndex(0), true) : !p));
  }, [index, last]);

  return { index, setIndex, playing, toggle, next, prev, reset, speed, setSpeed, last };
}
