/**
 * A boolean React state that is remembered in localStorage (for example whether the code panel
 * is hidden).
 */

import { useCallback, useState } from "react";

/** useState that remembers its value in localStorage. Storage can be blocked, so every access is guarded. */
export function useStoredBool(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : raw === "1";
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* the choice still applies for this visit */
      }
    },
    [key],
  );
  return [value, set];
}
