/**
 * Finds line numbers inside the code shown to the user, so the highlighted lines follow the code
 * if it is edited.
 */

/** 1-based line number of the first line containing `needle`, searching from 1-based line `from`. 0 if absent. */
export function lineOf(code: string, needle: string, from = 1): number {
  const lines = code.split("\n");
  for (let i = Math.max(0, from - 1); i < lines.length; i++)
    if (lines[i].includes(needle)) return i + 1;
  return 0;
}
