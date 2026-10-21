/**
 * Tests for the dynamic-programming topics: every preset runs, and the animations give the same
 * answers as the displayed code on random inputs.
 */

import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { dpCode, dpTopics } from "../src/topics/dp";
import type { ParsedOp } from "../src/engine/parse";

/**
 * Compiles the TypeScript shown to the user and returns the named function, so the tests run
 * exactly that code.
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
let seed = 77;
/** Small seeded random generator so the random cases are repeatable. */
const rnd = (n: number) =>
  Math.floor(
    ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
  );
/** Random word of `len` letters taken from `alpha`. */
const word = (len: number, alpha = "abc") =>
  Array.from({ length: len }, () => alpha[rnd(alpha.length)]).join("");

const stairs = load<(n: number) => number>(dpCode.stairsCode, "climbStairs");
const rob = load<(h: number[]) => { best: number; chosen: number[] }>(
  dpCode.robCode,
  "rob",
);
const coin = load<(c: number[], a: number) => { min: number; used: number[] }>(
  dpCode.coinCode,
  "coinChange",
);
const lcs = load<(a: string, b: string) => string>(dpCode.lcsCode, "lcs");
const edit = load<
  (a: string, b: string) => { distance: number; ops: string[] }
>(dpCode.editCode, "editDistance");
const knap = load<
  (w: number[], v: number[], c: number) => { best: number; chosen: number[] }
>(dpCode.knapCode, "knapsack");
const lcs3 = load<(a: string, b: string, c: string) => number>(
  dpCode.lcs3Code,
  "lcs3",
);

/** Runs a topic on an input and returns its steps and the final answer text. */
const answer = (
  t: { parse: (s: string) => any; run: (o: ParsedOp[]) => any[] },
  input: string,
) => {
  const steps = t.run(ok(t.parse(input)));
  return { steps, answer: steps.at(-1)!.state.answer as string };
};

describe("every DP preset parses, runs and highlights valid code lines", () => {
  for (const [id, t] of Object.entries(dpTopics)) {
    for (const p of t.presets) {
      it(`${id} / ${p.name}`, () => {
        const { steps } = answer(t, p.input);
        const n = t.topic.code.split("\n").length;
        expect(steps.length).toBeGreaterThan(2);
        for (const s of steps) {
          expect(s.note.length).toBeGreaterThan(0);
          for (const l of s.lines) expect(l >= 1 && l <= n).toBe(true);
        }
        expect(steps.at(-1)!.state.answer).not.toBeNull();
      });
    }
  }
});

describe("DP animations give the same answers as the code on screen", () => {
  it("climbing stairs", () => {
    for (let n = 1; n <= 25; n++)
      expect(answer(dpTopics.stairs, String(n)).answer).toBe(String(stairs(n)));
  });
  it("house robber (random)", () => {
    for (let t = 0; t < 60; t++) {
      const h = Array.from({ length: 1 + rnd(14) }, () => rnd(40));
      const { steps, answer: a } = answer(dpTopics.rob, h.join(","));
      expect(a).toBe(String(rob(h).best));
      expect(steps.at(-1)!.note).toContain(
        rob(h)
          .chosen.map((i) => i + 1)
          .join(", ") || "none",
      );
    }
  });
  it("coin change (random, including impossible)", () => {
    for (let t = 0; t < 60; t++) {
      const coins = [
        ...new Set(Array.from({ length: 1 + rnd(4) }, () => 1 + rnd(12))),
      ];
      const amount = 1 + rnd(24);
      const { answer: a } = answer(
        dpTopics.coin,
        `coins ${coins.join(" ")}, amount ${amount}`,
      );
      expect(a).toBe(String(coin(coins, amount).min));
    }
  });
  it("LCS (random)", () => {
    for (let t = 0; t < 60; t++) {
      const a = word(1 + rnd(8)),
        b = word(1 + rnd(8));
      expect(answer(dpTopics.lcs, `${a}, ${b}`).answer).toBe(lcs(a, b));
    }
  });
  it("edit distance (random) and the recovered edits reproduce the target", () => {
    for (let t = 0; t < 60; t++) {
      const a = word(1 + rnd(8)),
        b = word(1 + rnd(8));
      const { answer: d, steps } = answer(dpTopics.edit, `${a}, ${b}`);
      const real = edit(a, b);
      expect(d).toBe(String(real.distance));
      expect(real.ops.length).toBe(real.distance);
      // the edit script (unchanged letters are not listed) must turn a into b: search for a consistent alignment
      const valid = (i: number, j: number, k: number): boolean => {
        if (k === real.ops.length) return a.slice(i) === b.slice(j);
        if (
          i < a.length &&
          j < b.length &&
          a[i] === b[j] &&
          valid(i + 1, j + 1, k)
        )
          return true;
        const op = real.ops[k];
        if (op.startsWith("replace")) {
          const [, from, , to] = op.split(" ");
          return a[i] === from && b[j] === to && valid(i + 1, j + 1, k + 1);
        }
        if (op.startsWith("delete"))
          return a[i] === op.slice(-1) && valid(i + 1, j, k + 1);
        return b[j] === op.slice(-1) && valid(i, j + 1, k + 1);
      };
      expect(valid(0, 0, 0)).toBe(true);
      expect(
        steps.at(-1)!.note.startsWith(`Answer: ${real.distance} edit`),
      ).toBe(true);
    }
  });
  it("knapsack (random)", () => {
    for (let t = 0; t < 60; t++) {
      const n = 1 + rnd(6);
      const items = Array.from(
        { length: n },
        () => [1 + rnd(8), rnd(30)] as [number, number],
      );
      const cap = 1 + rnd(15);
      const { answer: a } = answer(
        dpTopics.knapsack,
        `capacity ${cap}, ${items.map(([w, v]) => `item ${w} ${v}`).join(", ")}`,
      );
      const real = knap(
        items.map((i) => i[0]),
        items.map((i) => i[1]),
        cap,
      );
      expect(a).toBe(String(real.best));
      expect(
        real.chosen.reduce((s, i) => s + items[i][0], 0),
      ).toBeLessThanOrEqual(cap);
      expect(real.chosen.reduce((s, i) => s + items[i][1], 0)).toBe(real.best);
    }
  });
  it("LCS of three strings (random)", () => {
    for (let t = 0; t < 30; t++) {
      const a = word(1 + rnd(5)),
        b = word(1 + rnd(5)),
        c = word(1 + rnd(5));
      expect(answer(dpTopics.lcs3, `${a}, ${b}, ${c}`).answer).toBe(
        String(lcs3(a, b, c)),
      );
    }
  });
});

describe("DP input validation", () => {
  it("rejects bad input", () => {
    for (const [t, bad] of [
      ["stairs", ""],
      ["stairs", "0"],
      ["stairs", "26"],
      ["rob", "x"],
      ["coin", "coins 1 1, amount 5"],
      ["coin", "coins 1, amount 99"],
      ["lcs", "onlyone"],
      ["lcs", "abc, 123"],
      ["knapsack", "capacity 7"],
      ["knapsack", "item 1 1"],
      ["lcs3", "a, b"],
    ] as const) {
      expect("error" in (dpTopics[t].parse(bad) as object)).toBe(true);
    }
  });
});
