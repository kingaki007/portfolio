/**
 * Tests for the backtracking topics: runs the displayed N-Queens, permutation, subset,
 * subset-sum and Sudoku code and compares it with the animations, and checks the parsers and the
 * Sudoku step cap.
 */

import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import {
  btCode,
  parsePerm,
  parseQueens,
  parseSubsets,
  parseSubsetSum,
  parseSudoku,
  permPresets,
  permSteps,
  queensPresets,
  queensSteps,
  subsetsPresets,
  subsetsSteps,
  subsetSumPresets,
  subsetSumSteps,
  sudokuPresets,
  sudokuSteps,
  STEP_CAP,
} from "../src/topics/backtracking";
import type { ParsedOp } from "../src/engine/parse";

/**
 * Compiles the TypeScript shown to the user and returns the named class or function, so the tests
 * run exactly that code.
 */
function load<T = any>(code: string, name: string): T {
  const js = transformSync(code, { loader: "ts" }).code;
  return new Function(`${js}\nreturn ${name};`)() as T;
}
/** Unwraps a parse result, failing the test with the parser's message on an error. */
const ok = (r: { ops: ParsedOp[] } | { error: string }) => {
  if ("error" in r) throw new Error(r.error);
  return r.ops;
};
/** Checks every step has a note and highlights only lines that exist in the displayed code. */
const lineCheck = (
  steps: { lines: number[]; note: string }[],
  code: string,
) => {
  const n = code.split("\n").length;
  for (const s of steps) {
    expect(s.note.length).toBeGreaterThan(0);
    for (const l of s.lines) expect(l >= 1 && l <= n).toBe(true);
  }
};

describe("N-Queens", () => {
  const solve = load<(n: number) => number[] | null>(
    btCode.queensCode,
    "solveNQueens",
  );
  it("matches the code on screen for every board size, and solutions are valid", () => {
    for (let n = 1; n <= 8; n++) {
      const steps = queensSteps(ok(parseQueens(String(n))));
      lineCheck(steps, btCode.queensCode);
      const real = solve(n);
      const last = steps.at(-1)!.state;
      if (real === null) {
        expect(last.solved).toBe(false);
        expect(steps.at(-1)!.note).toContain("null");
      } else {
        expect(last.solved).toBe(true);
        expect(last.cols).toEqual(real);
        for (let a = 0; a < n; a++)
          for (let b = a + 1; b < n; b++) {
            expect(real[a]).not.toBe(real[b]);
            expect(Math.abs(real[a] - real[b])).not.toBe(b - a);
          }
      }
    }
  });
  it("known facts: 2 and 3 have no solution, 8 has one", () => {
    expect(solve(2)).toBeNull();
    expect(solve(3)).toBeNull();
    expect(solve(8)).not.toBeNull();
  });
  it("presets run and bad input is rejected", () => {
    for (const p of queensPresets)
      lineCheck(queensSteps(ok(parseQueens(p.input))), btCode.queensCode);
    for (const bad of ["", "0", "9", "x", "1 2"])
      expect("error" in parseQueens(bad)).toBe(true);
  });
});

describe("Permutations, subsets and subset sum", () => {
  const perms = load<(a: number[]) => number[][]>(
    btCode.permCode,
    "permutations",
  );
  const subs = load<(a: number[]) => number[][]>(btCode.subsetsCode, "subsets");
  const sums = load<(a: number[], t: number) => number[][]>(
    btCode.subsetSumCode,
    "subsetSum",
  );
  /** n factorial. */
  const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

  it("permutations equal the code on screen, in the same order", () => {
    for (const p of permPresets) {
      const items = ok(parsePerm(p.input)).map((o) => o.value!);
      const steps = permSteps(ok(parsePerm(p.input)));
      lineCheck(steps, btCode.permCode);
      expect(steps.at(-1)!.state.results).toEqual(perms(items));
      expect(steps.at(-1)!.state.results).toHaveLength(fact(items.length));
    }
  });
  it("subsets equal the code on screen, in the same order", () => {
    for (const p of subsetsPresets) {
      const items = ok(parseSubsets(p.input)).map((o) => o.value!);
      const steps = subsetsSteps(ok(parseSubsets(p.input)));
      lineCheck(steps, btCode.subsetsCode);
      expect(steps.at(-1)!.state.results).toEqual(subs(items));
      expect(steps.at(-1)!.state.results).toHaveLength(2 ** items.length);
    }
  });
  it("subset sum equals the code on screen, and every result adds up", () => {
    for (const p of subsetSumPresets) {
      const ops = ok(parseSubsetSum(p.input));
      const items = ops.filter((o) => o.op === "n").map((o) => o.value!);
      const target = ops.find((o) => o.op === "target")!.value!;
      const steps = subsetSumSteps(ops);
      lineCheck(steps, btCode.subsetSumCode);
      const shown = steps.at(-1)!.state.results;
      expect(shown).toEqual(sums(items, target));
      for (const r of shown) expect(r.reduce((a, b) => a + b, 0)).toBe(target);
    }
  });
  it("subset sum random cases agree with the real code", () => {
    let seed = 8;
    /** Small seeded random generator so the random cases are repeatable. */
    const rnd = (n: number) =>
      Math.floor(
        ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
      );
    for (let t = 0; t < 40; t++) {
      const items = Array.from({ length: 1 + rnd(6) }, () => 1 + rnd(15));
      const target = 1 + rnd(30);
      expect(
        subsetSumSteps(
          ok(parseSubsetSum(`${items.join(" ")}, target ${target}`)),
        ).at(-1)!.state.results,
      ).toEqual(sums(items, target));
    }
  });
  it("rejects bad input", () => {
    for (const bad of ["", "1 1", "1 2 3 4 5", "x"])
      expect("error" in parsePerm(bad)).toBe(true);
    for (const bad of ["", "1 2 3 4 5 6", "-1"])
      expect("error" in parseSubsets(bad)).toBe(true);
    for (const bad of ["1 2 3", "1 2, target 0", "target 5", "0 1, target 5"])
      expect("error" in parseSubsetSum(bad)).toBe(true);
  });
});

describe("Sudoku", () => {
  const solve = load<(g: number[][]) => boolean>(
    btCode.sudokuCode,
    "solveSudoku",
  );
  /** Converts nine row strings to a numeric grid (a dot means empty). */
  const toGrid = (rows: string[]) =>
    rows.map((r) => [...r].map((c) => (c === "." ? 0 : Number(c))));
  /**
   * True when a solved 81-cell grid has each digit 1 to 9 exactly once in every row, column and
   * box.
   */
  const valid = (g: number[]) => {
    const rows = Array.from({ length: 9 }, (_, r) => g.slice(r * 9, r * 9 + 9));
    const sets = [
      ...rows,
      ...Array.from({ length: 9 }, (_, c) => rows.map((r) => r[c])),
      ...Array.from({ length: 9 }, (_, b) =>
        Array.from(
          { length: 9 },
          (_, i) =>
            rows[3 * Math.floor(b / 3) + Math.floor(i / 3)][
              3 * (b % 3) + (i % 3)
            ],
        ),
      ),
    ];
    return sets.every((s) => [...s].sort().join("") === "123456789");
  };
  it("quick presets solve to exactly what the code on screen produces", () => {
    for (const p of sudokuPresets.slice(0, 3)) {
      const ops = ok(parseSudoku(p.input));
      const steps = sudokuSteps(ops);
      lineCheck(steps, btCode.sudokuCode);
      const last = steps.at(-1)!.state;
      expect(last.kind).toBe("solved");
      expect(valid(last.cells)).toBe(true);
      const real = ops.map((o) => [...o.names![0]].map(Number));
      expect(solve(real)).toBe(true);
      expect(last.cells).toEqual(real.flat());
      // givens are never overwritten
      steps.forEach((s) =>
        s.state.given.forEach(
          (g, i) =>
            g &&
            expect(s.state.cells[i]).toBe(
              ops[Math.floor(i / 9)].names![0][i % 9] === "0"
                ? 0
                : Number(ops[Math.floor(i / 9)].names![0][i % 9]),
            ),
        ),
      );
    }
  });
  it("the brute-force-hard puzzle stops at the step cap with a message instead of hanging", () => {
    const steps = sudokuSteps(ok(parseSudoku(sudokuPresets[3].input)));
    expect(steps.length).toBeLessThanOrEqual(STEP_CAP + 1);
    expect(steps.at(-1)!.state.kind).toBe("limit");
    expect(steps.at(-1)!.note).toContain("Stopped after");
  });
  it("detects an unsolvable puzzle", () => {
    // legal clues, but the first row forces a contradiction
    const rows = [
      "12345678.",
      "........9",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
    ];
    const steps = sudokuSteps(ok(parseSudoku(rows.join(","))));
    expect(steps.at(-1)!.note).toContain("no solution");
    void toGrid;
  });
  it("rejects bad input", () => {
    for (const bad of [
      "",
      "123",
      Array(9).fill("12345678").join(","),
      Array(9).fill("55.......").join(","),
      ["11.......", ...Array(8).fill(".........")].join(","),
      ["a........", ...Array(8).fill(".........")].join(","),
    ])
      expect("error" in parseSudoku(bad)).toBe(true);
  });
});
