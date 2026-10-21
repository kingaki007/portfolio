import { useCallback, useEffect, useState } from "react";

export const SPEEDS = [0.5, 1, 2, 3, 4] as const;
const BASE_DELAY_MS = 800;

export function usePlayer(total: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** playback multiplier: 2 means twice as fast as 1x */
  const [speed, setSpeed] = useState<number>(1);

  const last = Math.max(0, total - 1);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(
      () => setIndex((i) => Math.min(i + 1, last)),
      BASE_DELAY_MS / speed,
    );
    return () => clearTimeout(t);
  }, [playing, index, last, speed]);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, last)),
    [last],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);
  const toggle = useCallback(() => {
    if (index >= last) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [index, last]);

  return {
    index,
    setIndex,
    playing,
    toggle,
    next,
    prev,
    reset,
    speed,
    setSpeed,
    last,
  };
}
