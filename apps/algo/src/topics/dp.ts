import type { Step, Topic } from "../engine/types";
import { splitOps, type ParseResult, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";

export interface DpLayer {
  title: string;
  rows: string[];
  cols: string[];
  /** null = not computed yet; Infinity is shown as ∞ */
  cells: (number | null)[][];
}

export interface DpState {
  layers: DpLayer[];
  /** "layer,row,col" -> "cur" | "dep" | "path" | "ok" | "base" */
  marks: Record<string, string>;
  info: string;
  answer: string | null;
}

export const key = (l: number, r: number, c: number) => `${l},${r},${c}`;

function rec(layers: DpLayer[]) {
  const steps: Step<DpState>[] = [];
  let answer: string | null = null;
  const base: Record<string, string> = {};
  const snap = (note: string, lines: number[], marks: Record<string, string> = {}, info = "") =>
    steps.push({
      state: { layers: layers.map((l) => ({ ...l, cells: l.cells.map((r) => [...r]) })), marks: { ...base, ...marks }, info, answer },
      lines,
      note,
      op: -1,
    });
  return {
    layers,
    steps,
    snap,
    setAnswer: (a: string) => (answer = a),
    keep: (k: string, v: string) => (base[k] = v),
  };
}

const grid = (rows: number, cols: number, fill: number | null = null) => Array.from({ length: rows }, () => Array<number | null>(cols).fill(fill));
const fmtN = (n: number) => (n === Infinity ? "∞" : String(n));

/* ------------------------------ parsers ------------------------------ */

function intList(input: string, min: number, max: number, lo: number, hi: number, what: string): ParseResult {
  const tokens = splitOps(input.replace(/\s+/g, ","));
  if (tokens.length < min) return { error: `Enter at least ${min} ${what}.` };
  if (tokens.length > max) return { error: `Too many values (max ${max}).` };
  const ops: ParsedOp[] = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t) || Number(t) < lo || Number(t) > hi) return { error: `"${t}" is not allowed: use whole numbers from ${lo} to ${hi}.` };
    ops.push({ op: "n", value: Number(t), args: [Number(t)] });
  }
  return { ops };
}

const words = (input: string, count: number, maxLen: number): ParseResult => {
  const tokens = splitOps(input.replace(/\s+/g, ","));
  if (tokens.length !== count) return { error: `Enter exactly ${count} word${count > 1 ? "s" : ""} (letters a to z), separated by commas or spaces.` };
  for (const t of tokens) if (!/^[a-z]{1,}$/i.test(t) || t.length > maxLen) return { error: `"${t}" is not allowed: use only letters, up to ${maxLen} long.` };
  return { ops: tokens.map((t) => ({ op: "word", names: [t.toLowerCase()] })) };
};

/* ------------------------------ Climbing stairs ------------------------------ */

const stairsCode = `function climbStairs(n: number): number {
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1; // one way to stand at the bottom: do nothing
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}`;

export function stairsSteps(ops: ParsedOp[]): Step<DpState>[] {
  const n = ops[0].value!;
  const layer: DpLayer = { title: "dp[i] = number of ways to reach step i", rows: ["ways"], cols: Array.from({ length: n + 1 }, (_, i) => String(i)), cells: grid(1, n + 1) };
  const r = rec([layer]);
  const L = { init: lineOf(stairsCode, "const dp = new Array"), b0: lineOf(stairsCode, "dp[0] = 1;"), b1: lineOf(stairsCode, "dp[1] = 1;"), loop: lineOf(stairsCode, "for (let i = 2;"), set: lineOf(stairsCode, "dp[i] = dp[i - 1] + dp[i - 2];"), ret: lineOf(stairsCode, "return dp[n];") };
  r.snap(`The table has one slot per step, 0 to ${n}. Each can be reached from the step below (1 stride) or two below (2 strides).`, [L.init]);
  layer.cells[0][0] = 1;
  r.keep(key(0, 0, 0), "base");
  r.snap("Base case: there is exactly 1 way to be at step 0.", [L.b0], { [key(0, 0, 0)]: "cur" });
  layer.cells[0][1] = 1;
  r.keep(key(0, 0, 1), "base");
  r.snap("Base case: there is exactly 1 way to reach step 1 (one stride).", [L.b1], { [key(0, 0, 1)]: "cur" });
  for (let i = 2; i <= n; i++) {
    const a = layer.cells[0][i - 1]!;
    const b = layer.cells[0][i - 2]!;
    r.snap(`Step ${i} can be reached from step ${i - 1} (${a} ways) or step ${i - 2} (${b} ways).`, [L.loop, L.set], { [key(0, 0, i)]: "cur", [key(0, 0, i - 1)]: "dep", [key(0, 0, i - 2)]: "dep" });
    layer.cells[0][i] = a + b;
    r.snap(`dp[${i}] = ${a} + ${b} = ${a + b}.`, [L.set], { [key(0, 0, i)]: "cur", [key(0, 0, i - 1)]: "dep", [key(0, 0, i - 2)]: "dep" });
  }
  r.setAnswer(String(layer.cells[0][n]));
  r.snap(`Answer: there are ${layer.cells[0][n]} distinct ways to climb ${n} step${n === 1 ? "" : "s"}.`, [L.ret], { [key(0, 0, n)]: "ok" });
  return r.steps;
}

/* ------------------------------ House robber ------------------------------ */

const robCode = `function rob(houses: number[]): { best: number; chosen: number[] } {
  const n = houses.length;
  const dp = new Array(n + 1).fill(0); // dp[i] = best loot from the first i houses
  dp[1] = houses[0];
  for (let i = 2; i <= n; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + houses[i - 1]);
  }
  const chosen: number[] = [];
  for (let i = n; i > 0; ) {
    if (dp[i] !== dp[i - 1]) {
      chosen.push(i - 1);
      i -= 2;
    } else {
      i -= 1;
    }
  }
  return { best: dp[n], chosen: chosen.reverse() };
}`;

export function robSteps(ops: ParsedOp[]): Step<DpState>[] {
  const houses = ops.map((o) => o.value!);
  const n = houses.length;
  const layer: DpLayer = {
    title: "row 1: money in each house · row 2: dp[i] = best loot from the first i houses",
    rows: ["house", "best"],
    cols: Array.from({ length: n + 1 }, (_, i) => String(i)),
    cells: [[null, ...houses], Array<number | null>(n + 1).fill(null)],
  };
  const r = rec([layer]);
  const dp = layer.cells[1];
  const L = { init: lineOf(robCode, "const dp = new Array"), b: lineOf(robCode, "dp[1] = houses[0];"), loop: lineOf(robCode, "for (let i = 2;"), set: lineOf(robCode, "dp[i] = Math.max"), tb: lineOf(robCode, "for (let i = n; i > 0; ) {"), take: lineOf(robCode, "chosen.push(i - 1);"), skip: lineOf(robCode, "i -= 1;"), ret: lineOf(robCode, "return { best: dp[n]") };
  dp[0] = 0;
  r.keep(key(0, 1, 0), "base");
  r.snap(`${n} house${n === 1 ? "" : "s"}. You cannot rob two neighbours. dp[0] = 0: no houses, no loot.`, [L.init], { [key(0, 1, 0)]: "cur" });
  dp[1] = houses[0];
  r.keep(key(0, 1, 1), "base");
  r.snap(`dp[1] = ${houses[0]}: with only the first house, rob it.`, [L.b], { [key(0, 1, 1)]: "cur" });
  for (let i = 2; i <= n; i++) {
    const skip = dp[i - 1]!;
    const take = dp[i - 2]! + houses[i - 1];
    r.snap(`House ${i} (${houses[i - 1]}): skip it and keep dp[${i - 1}] = ${skip}, or rob it and add to dp[${i - 2}]: ${dp[i - 2]} + ${houses[i - 1]} = ${take}.`, [L.loop, L.set], { [key(0, 1, i)]: "cur", [key(0, 1, i - 1)]: "dep", [key(0, 1, i - 2)]: "dep", [key(0, 0, i)]: "dep" });
    dp[i] = Math.max(skip, take);
    r.snap(`dp[${i}] = max(${skip}, ${take}) = ${dp[i]}.`, [L.set], { [key(0, 1, i)]: "cur" });
  }
  const chosen: number[] = [];
  r.snap(`Trace back from dp[${n}] to find which houses were robbed.`, [L.tb], { [key(0, 1, n)]: "path" });
  for (let i = n; i > 0; ) {
    if (dp[i] !== dp[i - 1]) {
      chosen.push(i - 1);
      r.keep(key(0, 0, i), "path");
      r.snap(`dp[${i}] = ${dp[i]} differs from dp[${i - 1}] = ${dp[i - 1]}: house ${i} (${houses[i - 1]}) was robbed. Jump back two.`, [L.take], { [key(0, 1, i)]: "path" });
      i -= 2;
    } else {
      r.snap(`dp[${i}] equals dp[${i - 1}]: house ${i} was skipped. Step back one.`, [L.skip], { [key(0, 1, i)]: "dep" });
      i -= 1;
    }
  }
  chosen.reverse();
  r.setAnswer(String(dp[n]));
  r.snap(`Answer: the best loot is ${dp[n]}, from house${chosen.length === 1 ? "" : "s"} ${chosen.map((c) => c + 1).join(", ") || "none"}.`, [L.ret], { [key(0, 1, n)]: "ok" });
  return r.steps;
}

/* ------------------------------ Coin change ------------------------------ */

const coinCode = `function coinChange(coins: number[], amount: number): { min: number; used: number[] } {
  const dp = new Array(amount + 1).fill(Infinity);
  const from = new Array(amount + 1).fill(-1); // the coin that gave dp[a]
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;
        from[a] = c;
      }
    }
  }
  if (dp[amount] === Infinity) return { min: -1, used: [] };
  const used: number[] = [];
  for (let a = amount; a > 0; a -= from[a]) used.push(from[a]);
  return { min: dp[amount], used };
}`;

export function parseCoins(input: string): ParseResult {
  const m = /^\s*coins\s+([\d\s,]+?)\s*[,;\n]\s*amount\s+(\d+)\s*$/i.exec(input);
  if (!m) return { error: 'Use the form "coins 1 5 6, amount 11".' };
  const coins = m[1].split(/[\s,]+/).filter(Boolean).map(Number);
  const amount = Number(m[2]);
  if (coins.length < 1 || coins.length > 5) return { error: "Give 1 to 5 coin values." };
  if (new Set(coins).size !== coins.length) return { error: "Coin values must be different." };
  if (coins.some((c) => c < 1 || c > 20)) return { error: "Each coin is a whole number from 1 to 20." };
  if (amount < 1 || amount > 24) return { error: "The amount is from 1 to 24." };
  return { ops: [...coins.map((c) => ({ op: "coin", value: c, args: [c] })), { op: "amount", value: amount, args: [amount] }] };
}

export function coinSteps(ops: ParsedOp[]): Step<DpState>[] {
  const coins = ops.filter((o) => o.op === "coin").map((o) => o.value!);
  const amount = ops.find((o) => o.op === "amount")!.value!;
  const layer: DpLayer = { title: "dp[a] = fewest coins that make amount a", rows: ["coins"], cols: Array.from({ length: amount + 1 }, (_, i) => String(i)), cells: grid(1, amount + 1) };
  const r = rec([layer]);
  const dp = layer.cells[0];
  const from = Array<number>(amount + 1).fill(-1);
  const L = { init: lineOf(coinCode, "const dp = new Array"), zero: lineOf(coinCode, "dp[0] = 0;"), loop: lineOf(coinCode, "for (let a = 1;"), each: lineOf(coinCode, "for (const c of coins) {"), cmp: lineOf(coinCode, "if (c <= a && dp[a - c] + 1 < dp[a]) {"), set: lineOf(coinCode, "dp[a] = dp[a - c] + 1;"), imp: lineOf(coinCode, "if (dp[amount] === Infinity) return"), tb: lineOf(coinCode, "for (let a = amount; a > 0; a -= from[a])"), ret: lineOf(coinCode, "return { min: dp[amount], used };") };
  for (let i = 0; i <= amount; i++) dp[i] = Infinity;
  r.snap(`Coins: ${coins.join(", ")}. Target ${amount}. Every amount starts at ∞ (not reachable yet).`, [L.init]);
  dp[0] = 0;
  r.keep(key(0, 0, 0), "base");
  r.snap("Amount 0 needs 0 coins.", [L.zero], { [key(0, 0, 0)]: "cur" });
  for (let a = 1; a <= amount; a++) {
    r.snap(`Fill dp[${a}]: try each coin.`, [L.loop], { [key(0, 0, a)]: "cur" });
    for (const c of coins) {
      if (c > a) {
        r.snap(`Coin ${c} is bigger than ${a}: skip.`, [L.each, L.cmp], { [key(0, 0, a)]: "cur" });
        continue;
      }
      const cand = dp[a - c]! + 1;
      const better = cand < dp[a]!;
      r.snap(`Coin ${c}: dp[${a - c}] + 1 = ${fmtN(dp[a - c]!)} + 1 = ${fmtN(cand)} versus dp[${a}] = ${fmtN(dp[a]!)}${better ? ": better." : ": not better."}`, [L.each, L.cmp], { [key(0, 0, a)]: "cur", [key(0, 0, a - c)]: "dep" });
      if (better) {
        dp[a] = cand;
        from[a] = c;
        r.snap(`dp[${a}] = ${cand}, using a ${c} coin.`, [L.set], { [key(0, 0, a)]: "cur", [key(0, 0, a - c)]: "dep" });
      }
    }
  }
  if (dp[amount] === Infinity) {
    r.setAnswer("-1");
    r.snap(`dp[${amount}] is still ∞: ${amount} cannot be made from these coins. Answer: -1.`, [L.imp]);
    return r.steps;
  }
  const used: number[] = [];
  r.snap(`Trace back from ${amount}: follow the coin that produced each value.`, [L.tb], { [key(0, 0, amount)]: "path" });
  for (let a = amount; a > 0; a -= from[a]) {
    used.push(from[a]);
    r.keep(key(0, 0, a), "path");
    r.snap(`dp[${a}] came from a ${from[a]} coin, so go back to ${a - from[a]}.`, [L.tb], { [key(0, 0, a)]: "path" });
  }
  r.setAnswer(String(dp[amount]));
  r.snap(`Answer: ${dp[amount]} coin${dp[amount] === 1 ? "" : "s"} (${used.join(" + ")} = ${amount}).`, [L.ret], { [key(0, 0, amount)]: "ok" });
  return r.steps;
}

/* ------------------------------ LCS ------------------------------ */

const lcsCode = `function lcs(a: string, b: string): string {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  let i = m;
  let j = n;
  let out = "";
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out = a[i - 1] + out;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out;
}`;

export const parseTwoWords = (i: string) => words(i, 2, 10);

export function lcsSteps(ops: ParsedOp[]): Step<DpState>[] {
  const [a, b] = ops.map((o) => o.names![0]);
  const m = a.length;
  const n = b.length;
  const layer: DpLayer = { title: `dp[i][j] = length of the LCS of the first i letters of "${a}" and the first j of "${b}"`, rows: ["·", ...a], cols: ["·", ...b], cells: grid(m + 1, n + 1) };
  const r = rec([layer]);
  const dp = layer.cells;
  const L = { init: lineOf(lcsCode, "const dp = Array.from"), cmp: lineOf(lcsCode, "if (a[i - 1] === b[j - 1]) dp[i][j]"), max: lineOf(lcsCode, "else dp[i][j] = Math.max"), tb: lineOf(lcsCode, "while (i > 0 && j > 0) {"), take: lineOf(lcsCode, "out = a[i - 1] + out;"), up: lineOf(lcsCode, "} else if (dp[i - 1][j] >= dp[i][j - 1]) i--;"), left: lineOf(lcsCode, "else j--;"), ret: lineOf(lcsCode, "return out;") };
  for (let i = 0; i <= m; i++) {
    dp[i][0] = 0;
    r.keep(key(0, i, 0), "base");
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = 0;
    r.keep(key(0, 0, j), "base");
  }
  r.snap(`Compare "${a}" and "${b}". Row 0 and column 0 are 0: an empty string shares nothing.`, [L.init]);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const same = a[i - 1] === b[j - 1];
      if (same) {
        r.snap(`"${a[i - 1]}" = "${b[j - 1]}": extend the diagonal, dp[${i - 1}][${j - 1}] + 1.`, [L.cmp], { [key(0, i, j)]: "cur", [key(0, i - 1, j - 1)]: "dep" });
        dp[i][j] = dp[i - 1][j - 1]! + 1;
      } else {
        r.snap(`"${a[i - 1]}" ≠ "${b[j - 1]}": take the better of dropping a letter from either string: max(${dp[i - 1][j]} above, ${dp[i][j - 1]} left).`, [L.max], { [key(0, i, j)]: "cur", [key(0, i - 1, j)]: "dep", [key(0, i, j - 1)]: "dep" });
        dp[i][j] = Math.max(dp[i - 1][j]!, dp[i][j - 1]!);
      }
      r.snap(`dp[${i}][${j}] = ${dp[i][j]}.`, [same ? L.cmp : L.max], { [key(0, i, j)]: "cur" });
    }
  }
  let i = m;
  let j = n;
  let out = "";
  r.snap(`The table is full: the LCS length is ${dp[m][n]}. Trace back from the bottom-right corner to read the letters.`, [L.tb], { [key(0, m, n)]: "path" });
  while (i > 0 && j > 0) {
    r.keep(key(0, i, j), "path");
    if (a[i - 1] === b[j - 1]) {
      out = a[i - 1] + out;
      r.snap(`"${a[i - 1]}" matches: it is part of the LCS. Move diagonally. LCS so far: "${out}".`, [L.take], { [key(0, i, j)]: "path" });
      i--;
      j--;
    } else if (dp[i - 1][j]! >= dp[i][j - 1]!) {
      r.snap(`No match here, and the value above (${dp[i - 1][j]}) is at least the value to the left (${dp[i][j - 1]}): move up.`, [L.up], { [key(0, i, j)]: "path" });
      i--;
    } else {
      r.snap(`No match here, and the value to the left (${dp[i][j - 1]}) is larger: move left.`, [L.left], { [key(0, i, j)]: "path" });
      j--;
    }
  }
  r.setAnswer(out);
  r.snap(`Answer: the longest common subsequence is "${out}" (length ${out.length}).`, [L.ret], { [key(0, m, n)]: "ok" });
  return r.steps;
}

/* ------------------------------ Edit distance ------------------------------ */

const editCode = `function editDistance(a: string, b: string): { distance: number; ops: string[] } {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const ops: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push("replace " + a[i - 1] + " with " + b[j - 1]);
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push("delete " + a[i - 1]);
      i--;
    } else {
      ops.push("insert " + b[j - 1]);
      j--;
    }
  }
  ops.reverse();
  return { distance: dp[m][n], ops };
}`;

export function editSteps(ops: ParsedOp[]): Step<DpState>[] {
  const [a, b] = ops.map((o) => o.names![0]);
  const m = a.length;
  const n = b.length;
  const layer: DpLayer = { title: `dp[i][j] = fewest edits to turn the first i letters of "${a}" into the first j of "${b}"`, rows: ["·", ...a], cols: ["·", ...b], cells: grid(m + 1, n + 1) };
  const r = rec([layer]);
  const dp = layer.cells;
  const L = { init: lineOf(editCode, "const dp = Array.from"), same: lineOf(editCode, "if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];"), min: lineOf(editCode, "else dp[i][j] = 1 + Math.min"), tb: lineOf(editCode, "while (i > 0 || j > 0) {"), eq: lineOf(editCode, "if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {"), rep: lineOf(editCode, "ops.push(\"replace \""), del: lineOf(editCode, "ops.push(\"delete \""), ins: lineOf(editCode, "ops.push(\"insert \""), ret: lineOf(editCode, "return { distance: dp[m][n], ops };") };
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
    r.keep(key(0, i, 0), "base");
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
    r.keep(key(0, 0, j), "base");
  }
  r.snap(`Turn "${a}" into "${b}". Column 0: delete i letters. Row 0: insert j letters.`, [L.init]);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const up = dp[i - 1][j]!;
      const left = dp[i][j - 1]!;
      const diag = dp[i - 1][j - 1]!;
      if (a[i - 1] === b[j - 1]) {
        r.snap(`"${a[i - 1]}" = "${b[j - 1]}": no edit needed, copy the diagonal ${diag}.`, [L.same], { [key(0, i, j)]: "cur", [key(0, i - 1, j - 1)]: "dep" });
        dp[i][j] = diag;
      } else {
        r.snap(`"${a[i - 1]}" ≠ "${b[j - 1]}": 1 + min(delete ${up} above, insert ${left} left, replace ${diag} diagonal).`, [L.min], { [key(0, i, j)]: "cur", [key(0, i - 1, j)]: "dep", [key(0, i, j - 1)]: "dep", [key(0, i - 1, j - 1)]: "dep" });
        dp[i][j] = 1 + Math.min(up, left, diag);
      }
      r.snap(`dp[${i}][${j}] = ${dp[i][j]}.`, [a[i - 1] === b[j - 1] ? L.same : L.min], { [key(0, i, j)]: "cur" });
    }
  }
  const out: string[] = [];
  let i = m;
  let j = n;
  r.snap(`The table is full: the edit distance is ${dp[m][n]}. Trace back to recover the edits.`, [L.tb], { [key(0, m, n)]: "path" });
  while (i > 0 || j > 0) {
    r.keep(key(0, i, j), "path");
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      r.snap(`"${a[i - 1]}" matches: no edit. Move diagonally.`, [L.eq], { [key(0, i, j)]: "path" });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1]! + 1) {
      out.push(`replace ${a[i - 1]} with ${b[j - 1]}`);
      r.snap(`Replace "${a[i - 1]}" with "${b[j - 1]}". Move diagonally.`, [L.rep], { [key(0, i, j)]: "path" });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j]! + 1) {
      out.push(`delete ${a[i - 1]}`);
      r.snap(`Delete "${a[i - 1]}". Move up.`, [L.del], { [key(0, i, j)]: "path" });
      i--;
    } else {
      out.push(`insert ${b[j - 1]}`);
      r.snap(`Insert "${b[j - 1]}". Move left.`, [L.ins], { [key(0, i, j)]: "path" });
      j--;
    }
  }
  out.reverse();
  r.setAnswer(String(dp[m][n]));
  r.snap(`Answer: ${dp[m][n]} edit${dp[m][n] === 1 ? "" : "s"}${out.length ? ": " + out.join(", then ") : " (the strings are equal)"}.`, [L.ret], { [key(0, m, n)]: "ok" });
  return r.steps;
}

/* ------------------------------ Knapsack ------------------------------ */

const knapCode = `function knapsack(weights: number[], values: number[], capacity: number): { best: number; chosen: number[] } {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
      }
    }
  }
  const chosen: number[] = [];
  for (let i = n, w = capacity; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      chosen.push(i - 1);
      w -= weights[i - 1];
    }
  }
  return { best: dp[n][capacity], chosen: chosen.reverse() };
}`;

export function parseKnapsack(input: string): ParseResult {
  const tokens = splitOps(input);
  let capacity: number | null = null;
  const items: [number, number][] = [];
  for (const t of tokens) {
    const cap = /^capacity\s+(\d+)$/i.exec(t);
    const item = /^item\s+(\d+)\s+(\d+)$/i.exec(t);
    if (cap) capacity = Number(cap[1]);
    else if (item) items.push([Number(item[1]), Number(item[2])]);
    else return { error: `"${t}": use "capacity 7" and "item <weight> <value>".` };
  }
  if (capacity === null || capacity < 1 || capacity > 15) return { error: 'Add one "capacity N" with N from 1 to 15.' };
  if (items.length < 1 || items.length > 6) return { error: "Give 1 to 6 items." };
  if (items.some(([w, v]) => w < 1 || w > 15 || v < 0 || v > 99)) return { error: "Item weights are 1 to 15 and values 0 to 99." };
  return { ops: [{ op: "capacity", value: capacity, args: [capacity] }, ...items.map(([w, v]) => ({ op: "item", args: [w, v], value: w }))] };
}

export function knapsackSteps(ops: ParsedOp[]): Step<DpState>[] {
  const capacity = ops[0].value!;
  const items = ops.slice(1).map((o) => ({ w: o.args![0], v: o.args![1] }));
  const n = items.length;
  const layer: DpLayer = { title: "dp[i][w] = best value using the first i items with capacity w", rows: ["none", ...items.map((it, i) => `item ${i + 1} (w${it.w}, v${it.v})`)], cols: Array.from({ length: capacity + 1 }, (_, w) => String(w)), cells: grid(n + 1, capacity + 1) };
  const r = rec([layer]);
  const dp = layer.cells;
  const L = { init: lineOf(knapCode, "const dp = Array.from"), skip: lineOf(knapCode, "dp[i][w] = dp[i - 1][w];"), fit: lineOf(knapCode, "if (weights[i - 1] <= w) {"), take: lineOf(knapCode, "dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);"), tb: lineOf(knapCode, "for (let i = n, w = capacity; i > 0; i--) {"), pick: lineOf(knapCode, "chosen.push(i - 1);"), ret: lineOf(knapCode, "return { best: dp[n][capacity]") };
  for (let w = 0; w <= capacity; w++) {
    dp[0][w] = 0;
    r.keep(key(0, 0, w), "base");
  }
  r.snap(`${n} item${n === 1 ? "" : "s"}, capacity ${capacity}. Row 0 is 0: with no items there is no value.`, [L.init]);
  for (let i = 1; i <= n; i++) {
    const { w: wi, v: vi } = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      const without = dp[i - 1][w]!;
      if (wi > w) {
        r.snap(`Item ${i} weighs ${wi}, more than the capacity ${w}: it cannot be taken. Keep ${without} from above.`, [L.skip, L.fit], { [key(0, i, w)]: "cur", [key(0, i - 1, w)]: "dep" });
        dp[i][w] = without;
      } else {
        const withIt = dp[i - 1][w - wi]! + vi;
        r.snap(`Item ${i} (w${wi}, v${vi}) at capacity ${w}: skip it = ${without}, or take it = dp[${i - 1}][${w - wi}] + ${vi} = ${withIt}.`, [L.skip, L.fit, L.take], { [key(0, i, w)]: "cur", [key(0, i - 1, w)]: "dep", [key(0, i - 1, w - wi)]: "dep" });
        dp[i][w] = Math.max(without, withIt);
      }
      r.snap(`dp[${i}][${w}] = ${dp[i][w]}.`, [L.take], { [key(0, i, w)]: "cur" });
    }
  }
  const chosen: number[] = [];
  let w = capacity;
  r.snap(`The table is full: the best value is ${dp[n][capacity]}. Trace back to see which items were taken.`, [L.tb], { [key(0, n, capacity)]: "path" });
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      chosen.push(i);
      r.keep(key(0, i, w), "path");
      r.snap(`dp[${i}][${w}] = ${dp[i][w]} differs from the row above (${dp[i - 1][w]}): item ${i} was taken. Capacity shrinks by ${items[i - 1].w}.`, [L.pick], { [key(0, i, w)]: "path" });
      w -= items[i - 1].w;
    } else r.snap(`dp[${i}][${w}] equals the row above: item ${i} was not taken.`, [L.tb], { [key(0, i, w)]: "dep" });
  }
  chosen.reverse();
  r.setAnswer(String(dp[n][capacity]));
  r.snap(`Answer: best value ${dp[n][capacity]}, taking item${chosen.length === 1 ? "" : "s"} ${chosen.join(", ") || "none"}.`, [L.ret], { [key(0, n, capacity)]: "ok" });
  return r.steps;
}

/* ------------------------------ LCS of three strings (3D) ------------------------------ */

const lcs3Code = `function lcs3(a: string, b: string, c: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => new Array(c.length + 1).fill(0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      for (let k = 1; k <= c.length; k++) {
        if (a[i - 1] === b[j - 1] && b[j - 1] === c[k - 1]) {
          dp[i][j][k] = dp[i - 1][j - 1][k - 1] + 1;
        } else {
          dp[i][j][k] = Math.max(dp[i - 1][j][k], dp[i][j - 1][k], dp[i][j][k - 1]);
        }
      }
    }
  }
  return dp[a.length][b.length][c.length];
}`;

export const parseThreeWords = (i: string) => words(i, 3, 6);

export function lcs3Steps(ops: ParsedOp[]): Step<DpState>[] {
  const [a, b, c] = ops.map((o) => o.names![0]);
  const layers: DpLayer[] = Array.from({ length: c.length + 1 }, (_, k) => ({
    title: k === 0 ? "layer k = 0 (empty prefix of the third string)" : `layer k = ${k}: first ${k} letter${k === 1 ? "" : "s"} of "${c}" (…${c[k - 1]})`,
    rows: ["·", ...a],
    cols: ["·", ...b],
    cells: grid(a.length + 1, b.length + 1),
  }));
  const r = rec(layers);
  const L = { init: lineOf(lcs3Code, "const dp = Array.from"), cmp: lineOf(lcs3Code, "if (a[i - 1] === b[j - 1] && b[j - 1] === c[k - 1]) {"), inc: lineOf(lcs3Code, "dp[i][j][k] = dp[i - 1][j - 1][k - 1] + 1;"), max: lineOf(lcs3Code, "dp[i][j][k] = Math.max"), ret: lineOf(lcs3Code, "return dp[a.length][b.length][c.length];") };
  for (let k = 0; k <= c.length; k++)
    for (let i = 0; i <= a.length; i++)
      for (let j = 0; j <= b.length; j++)
        if (i === 0 || j === 0 || k === 0) {
          layers[k].cells[i][j] = 0;
          r.keep(key(k, i, j), "base");
        }
  r.snap(`Three strings: "${a}", "${b}", "${c}". The table has three dimensions, drawn as one grid per letter of the third string. Anything with an empty prefix is 0.`, [L.init]);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      for (let k = 1; k <= c.length; k++) {
        const all = a[i - 1] === b[j - 1] && b[j - 1] === c[k - 1];
        if (all) {
          r.snap(`"${a[i - 1]}" = "${b[j - 1]}" = "${c[k - 1]}": all three agree, extend dp[${i - 1}][${j - 1}][${k - 1}] by 1.`, [L.cmp, L.inc], { [key(k, i, j)]: "cur", [key(k - 1, i - 1, j - 1)]: "dep" });
          layers[k].cells[i][j] = layers[k - 1].cells[i - 1][j - 1]! + 1;
        } else {
          const x = layers[k].cells[i - 1][j]!;
          const y = layers[k].cells[i][j - 1]!;
          const z = layers[k - 1].cells[i][j]!;
          r.snap(`Not all equal: drop one letter, take max(${x} from i-1, ${y} from j-1, ${z} from k-1).`, [L.cmp, L.max], { [key(k, i, j)]: "cur", [key(k, i - 1, j)]: "dep", [key(k, i, j - 1)]: "dep", [key(k - 1, i, j)]: "dep" });
          layers[k].cells[i][j] = Math.max(x, y, z);
        }
        r.snap(`dp[${i}][${j}][${k}] = ${layers[k].cells[i][j]}.`, [L.max], { [key(k, i, j)]: "cur" });
      }
    }
  }
  const ans = layers[c.length].cells[a.length][b.length]!;
  r.setAnswer(String(ans));
  r.snap(`Answer: the longest common subsequence of all three strings has length ${ans}.`, [L.ret], { [key(c.length, a.length, b.length)]: "ok" });
  return r.steps;
}

/* ------------------------------ topics ------------------------------ */

const T = (id: string, title: string, blurb: string, code: string, syntax: string, complexity: Topic["complexity"]): Topic => ({ id, title, group: "Dynamic Programming", blurb, code, syntax, complexity });

export const dpTopics = {
  stairs: {
    topic: T("dp-stairs", "1D · Climbing Stairs", "How many ways can you climb n steps taking 1 or 2 at a time? Each answer is the sum of the two before it: the smallest 1D DP.", stairsCode, "one whole number n from 1 to 25", [{ op: "time", time: "O(n)" }, { op: "space", time: "O(n), reducible to O(1)" }]),
    presets: [
      { name: "n = 6", desc: "Small enough to follow every cell.", input: "6" },
      { name: "n = 1 (edge case)", desc: "Only base cases.", input: "1" },
      { name: "n = 12", desc: "The sequence 1, 1, 2, 3, 5, 8…", input: "12" },
      { name: "n = 25", desc: "A bigger table.", input: "25" },
    ] as Preset[],
    parse: (i: string) => {
      const r = intList(i, 1, 1, 1, 25, "number");
      return r;
    },
    run: stairsSteps,
  },
  rob: {
    topic: T("dp-house-robber", "1D · House Robber", "Maximise the loot from a street of houses without robbing two neighbours: each house is either skipped or robbed on top of the best result two houses back.", robCode, "house values, 1 to 14 numbers from 0 to 99", [{ op: "time", time: "O(n)" }, { op: "space", time: "O(n), reducible to O(1)" }]),
    presets: [
      { name: "Classic", desc: "Skipping alternate houses is not always best.", input: "2, 7, 9, 3, 1" },
      { name: "Single house", desc: "Edge case.", input: "5" },
      { name: "All equal", desc: "Ties between skip and rob.", input: "4, 4, 4, 4, 4, 4" },
      { name: "Longer street (14)", desc: "A mix of high and low values.", input: "6, 1, 8, 9, 2, 7, 3, 10, 1, 5, 9, 2, 8, 4" },
    ] as Preset[],
    parse: (i: string) => intList(i, 1, 14, 0, 99, "house value"),
    run: robSteps,
  },
  coin: {
    topic: T("dp-coin-change", "1D · Coin Change", "The fewest coins that add up to an amount. Each amount tries every coin and builds on the best answer for the remainder. A greedy approach fails on some coin sets; DP does not.", coinCode, "coins 1 5 6, amount 11   (1 to 5 coins of 1 to 20, amount up to 24)", [{ op: "time", time: "O(amount × coins)" }, { op: "space", time: "O(amount)" }]),
    presets: [
      { name: "Greedy fails", desc: "Greedy picks 6+4×1 = 5 coins; DP finds 5+5.", input: "coins 1, 5, 6, amount 10" },
      { name: "Classic", desc: "Coins 1, 2, 5 for 11.", input: "coins 1, 2, 5, amount 11" },
      { name: "Impossible", desc: "Only even coins cannot make an odd amount.", input: "coins 2, 4, amount 7" },
      { name: "Bigger (amount 24)", desc: "Many cells, three coins.", input: "coins 3, 7, 10, amount 24" },
    ] as Preset[],
    parse: parseCoins,
    run: coinSteps,
  },
  lcs: {
    topic: T("dp-lcs", "2D · Longest Common Subsequence", "The longest sequence of letters appearing in both strings in order (not necessarily adjacent). The table compares every prefix of one with every prefix of the other.", lcsCode, "two words, e.g. abcde, ace   (letters, up to 10 each)", [{ op: "time", time: "O(m × n)" }, { op: "space", time: "O(m × n)" }]),
    presets: [
      { name: "abcde / ace", desc: "The textbook example.", input: "abcde, ace" },
      { name: "No common letters", desc: "The table stays at 0.", input: "abc, xyz" },
      { name: "Identical strings", desc: "The diagonal fills up.", input: "dynamic, dynamic" },
      { name: "AGGTAB / GXTXAYB", desc: "A classic pair from algorithm courses.", input: "aggtab, gxtxayb" },
    ] as Preset[],
    parse: parseTwoWords,
    run: lcsSteps,
  },
  edit: {
    topic: T("dp-edit-distance", "2D · Edit Distance", "The fewest single-letter inserts, deletes and replacements to turn one word into another (Levenshtein distance), with the actual edits recovered by tracing back.", editCode, "two words, e.g. kitten, sitting   (letters, up to 10 each)", [{ op: "time", time: "O(m × n)" }, { op: "space", time: "O(m × n)" }]),
    presets: [
      { name: "kitten → sitting", desc: "The classic: 3 edits.", input: "kitten, sitting" },
      { name: "Equal words", desc: "Distance 0.", input: "same, same" },
      { name: "horse → ros", desc: "Needs deletions and a replacement.", input: "horse, ros" },
      { name: "intention → execution", desc: "Larger table, 5 edits.", input: "intention, execution" },
    ] as Preset[],
    parse: parseTwoWords,
    run: editSteps,
  },
  knapsack: {
    topic: T("dp-knapsack", "2D · 0/1 Knapsack", "Pick items to maximise value within a weight limit, each item at most once. Each cell asks: is it better to skip this item or take it and use the best result with the weight left over?", knapCode, "capacity 7, item <weight> <value>, ...   (up to 6 items)", [{ op: "time", time: "O(items × capacity)" }, { op: "space", time: "O(items × capacity)" }]),
    presets: [
      { name: "Classic", desc: "Four items, capacity 7.", input: "capacity 7, item 1 1, item 3 4, item 4 5, item 5 7" },
      { name: "Nothing fits", desc: "Every item is heavier than the bag.", input: "capacity 3, item 5 10, item 4 8" },
      { name: "Greedy by ratio fails", desc: "The best-ratio item blocks a better pair.", input: "capacity 10, item 5 10, item 4 40, item 6 30, item 3 50" },
      { name: "Six items", desc: "A bigger table.", input: "capacity 15, item 12 4, item 2 2, item 1 1, item 1 2, item 4 10, item 3 7" },
    ] as Preset[],
    parse: parseKnapsack,
    run: knapsackSteps,
  },
  lcs3: {
    topic: T("dp-lcs3", "3D · LCS of three strings", "A three-dimensional table: the same idea as LCS but with a third string, so each cell depends on neighbours in three directions. Drawn as one grid per letter of the third string.", lcs3Code, "three words, e.g. abcd, acbd, abdc   (letters, up to 6 each)", [{ op: "time", time: "O(a × b × c)" }, { op: "space", time: "O(a × b × c)" }]),
    presets: [
      { name: "Three related words", desc: "Words that share several letters in order.", input: "geeks, geekf, geeksf" },
      { name: "abcd / acbd / abdc", desc: "Different orders of the same letters.", input: "abcd, acbd, abdc" },
      { name: "No common letters", desc: "All layers stay 0.", input: "abc, def, ghi" },
      { name: "Identical (3 letters)", desc: "A full diagonal through the cube.", input: "cat, cat, cat" },
    ] as Preset[],
    parse: parseThreeWords,
    run: lcs3Steps,
  },
};

export const dpCode = { stairsCode, robCode, coinCode, lcsCode, editCode, knapCode, lcs3Code };
