import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParseResult, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";

export const FEN_N = 12;

export interface FenState {
  n: number;
  /** the underlying array, index 1..n (index 0 unused) */
  a: number[];
  /** the Fenwick array, index 1..n */
  tree: number[];
  marks: Record<number, string>;
  /** running value shown as a note, e.g. "sum = 14" */
  info: string;
}

const code = `class FenwickTree {
  private tree: number[];

  constructor(private n: number) {
    this.tree = new Array(n + 1).fill(0); // 1-based
  }

  // add delta to position i
  update(i: number, delta: number): void {
    for (; i <= this.n; i += i & -i) {
      this.tree[i] += delta;
    }
  }

  // sum of positions 1..i
  prefixSum(i: number): number {
    let sum = 0;
    for (; i > 0; i -= i & -i) {
      sum += this.tree[i];
    }
    return sum;
  }

  // sum of positions l..r
  rangeSum(l: number, r: number): number {
    return this.prefixSum(r) - this.prefixSum(l - 1);
  }
}`;

export const fenwickCode = code;

export const fenwickTopic: Topic = {
  id: "fenwick",
  title: "Fenwick Tree (Binary Indexed Tree)",
  group: "Trees",
  blurb: `Prefix sums with point updates in O(log n). tree[i] stores the sum of the last lowbit(i) elements ending at i, so an update climbs by adding lowbit and a query descends by subtracting it. ${FEN_N} positions, numbered 1 to ${FEN_N}.`,
  syntax: "add <index> <delta>, prefix <index>, range <left> <right>",
  code,
  complexity: [
    { op: "update (add)", time: "O(log n)" },
    { op: "prefixSum / rangeSum", time: "O(log n)" },
    { op: "space", time: "O(n), one extra array" },
  ],
};

export function parseFenwick(input: string): ParseResult {
  const r = parseOps(input, { add: 2, prefix: 1, range: 2 });
  if ("error" in r) return r;
  for (let i = 0; i < r.ops.length; i++) {
    const o = r.ops[i];
    const idx = o.op === "add" ? [o.args![0]] : o.op === "prefix" ? [o.args![0]] : o.args!;
    for (const x of idx) if (x < 1 || x > FEN_N) return { error: `Operation ${i + 1}: positions are 1 to ${FEN_N}, got ${x}.` };
    if (o.op === "range" && o.args![0] > o.args![1]) return { error: `Operation ${i + 1}: the left end must not be after the right end.` };
  }
  return r;
}

const L = {
  update: lineOf(code, "for (; i <= this.n; i += i & -i) {"),
  updateSet: lineOf(code, "this.tree[i] += delta;"),
  prefInit: lineOf(code, "let sum = 0;"),
  prefLoop: lineOf(code, "for (; i > 0; i -= i & -i) {"),
  prefAdd: lineOf(code, "sum += this.tree[i];"),
  prefRet: lineOf(code, "return sum;"),
  range: lineOf(code, "return this.prefixSum(r) - this.prefixSum(l - 1);"),
};

const low = (i: number) => i & -i;
const bin = (i: number) => i.toString(2);

export const covers = (i: number) => ({ from: i - low(i) + 1, to: i });

export function fenwickSteps(ops: ParsedOp[]): Step<FenState>[] {
  const a = Array<number>(FEN_N + 1).fill(0);
  const tree = Array<number>(FEN_N + 1).fill(0);
  const steps: Step<FenState>[] = [];
  let opIdx = -1;
  const snap = (note: string, lines: number[], marks: Record<number, string> = {}, info = "") =>
    steps.push({ state: { n: FEN_N, a: [...a], tree: [...tree], marks, info }, lines, note, op: opIdx });

  snap(`${FEN_N} positions, all zero. Press play to run the operations.`, []);

  const prefix = (idx: number, label: string): number => {
    let sum = 0;
    let i = idx;
    const visited: Record<number, string> = {};
    snap(`${label}: start with sum = 0 at i = ${i} (binary ${bin(i)}).`, [L.prefInit, L.prefLoop], i > 0 ? { [i]: "cmp" } : {}, "sum = 0");
    while (i > 0) {
      sum += tree[i];
      visited[i] = "ok";
      const { from, to } = covers(i);
      snap(`tree[${i}] covers positions ${from}..${to}: add it. sum = ${sum}.`, [L.prefAdd], { ...visited, [i]: "swap" }, `sum = ${sum}`);
      const next = i - low(i);
      snap(i === next ? "" : `lowbit(${i}) = ${low(i)}, so i = ${i} - ${low(i)} = ${next}${next === 0 ? ": done" : ` (binary ${bin(next)}): jump to the next block to the left`}.`, [L.prefLoop], { ...visited, ...(next > 0 ? { [next]: "cmp" } : {}) }, `sum = ${sum}`);
      i = next;
    }
    snap(`i reached 0. prefixSum(${idx}) = ${sum}.`, [L.prefRet], visited, `sum = ${sum}`);
    return sum;
  };

  ops.forEach((o, k) => {
    opIdx = k;
    if (o.op === "add") {
      const [idx, delta] = o.args!;
      a[idx] += delta;
      let i = idx;
      const visited: Record<number, string> = {};
      snap(`update(${idx}, ${delta >= 0 ? "+" : ""}${delta}): the underlying value a[${idx}] becomes ${a[idx]}. Now push the change up through every block that covers position ${idx}.`, [L.update], { [i]: "cmp" });
      while (i <= FEN_N) {
        tree[i] += delta;
        visited[i] = "ok";
        const { from, to } = covers(i);
        snap(`tree[${i}] covers ${from}..${to}, which includes position ${idx}: tree[${i}] += ${delta} → ${tree[i]}.`, [L.updateSet], { ...visited, [i]: "swap" });
        const next = i + low(i);
        snap(next > FEN_N ? `lowbit(${i}) = ${low(i)}, i = ${next} is past ${FEN_N}: stop.` : `lowbit(${i}) = ${low(i)}, so i = ${i} + ${low(i)} = ${next} (binary ${bin(next)}): the next block that covers position ${idx}.`, [L.update], { ...visited, ...(next <= FEN_N ? { [next]: "cmp" } : {}) });
        i = next;
      }
    } else if (o.op === "prefix") {
      prefix(o.args![0], `prefixSum(${o.args![0]})`);
    } else {
      const [l, r] = o.args!;
      snap(`rangeSum(${l}, ${r}) = prefixSum(${r}) - prefixSum(${l - 1}). Compute both prefixes.`, [L.range]);
      const hi = prefix(r, `prefixSum(${r})`);
      const lo = l - 1 > 0 ? prefix(l - 1, `prefixSum(${l - 1})`) : 0;
      if (l - 1 === 0) snap("prefixSum(0) is an empty sum = 0.", [L.range], {}, `${hi} - 0`);
      snap(`rangeSum(${l}, ${r}) = ${hi} - ${lo} = ${hi - lo}.`, [L.range], {}, `${hi} - ${lo} = ${hi - lo}`);
    }
  });
  return steps.filter((s) => s.note !== "");
}

export const fenwickPresets: Preset[] = [
  { name: "Basics", desc: "Fill a few positions, then take prefix and range sums.", input: "add 1 5, add 2 3, add 3 7, add 4 2, add 5 6, prefix 5, prefix 3, range 2 4, add 3 -4, range 2 4" },
  { name: "Climbing by lowbit", desc: "Updating position 1 climbs 1 → 2 → 4 → 8; querying 7 descends 7 → 6 → 4.", input: "add 1 10, prefix 7, add 7 4, prefix 7, prefix 12, prefix 1" },
  { name: "Full array (30 ops)", desc: "Every position gets a value, then many queries.", input: [...seq(12, (i) => `add ${i + 1} ${((i * 7 + 3) % 9) + 1}`), ...seq(6, (i) => `prefix ${(i * 5 + 2) % 12 + 1}`), ...seq(6, (i) => `range ${i + 1} ${12 - i}`), "add 6 -5", "prefix 12", "range 5 7", "range 1 12", "add 12 3", "prefix 12"].join(", ") },
  { name: "Edge positions", desc: "Position 1, position 12 and single-cell ranges.", input: "add 12 8, add 1 2, prefix 12, prefix 1, range 12 12, range 1 1, range 1 12, add 8 -3, prefix 8" },
];
