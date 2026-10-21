/**
 * Tests for the Trie, Fenwick tree, 2-3-4 tree and red-black tree: the displayed code, the tree
 * invariants, and agreement between the animations and the real code on presets and random runs.
 */

import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { parseTrie, trieCode, trieSteps, triePresets } from "../src/topics/trie";
import {
  fenwickCode,
  fenwickSteps,
  fenwickPresets,
  parseFenwick,
  FEN_N,
} from "../src/topics/fenwick";
import {
  parse234,
  shape,
  tree234Code,
  tree234Steps,
  tree234Presets,
} from "../src/topics/tree234";
import {
  parseRB,
  redBlackCode,
  redBlackSteps,
  redBlackPresets,
} from "../src/topics/redBlack";
import type { ParsedOp } from "../src/engine/parse";
import type { NNode } from "../src/components/NaryViz";
import type { TNode } from "../src/components/TreeViz";

/**
 * Compiles the TypeScript shown to the user and returns the named class, so the tests run exactly
 * that code.
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
let seed = 2024;
/** Small seeded random generator so the random cases are repeatable. */
const rnd = (n: number) =>
  Math.floor(
    ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
  );

describe("Trie", () => {
  const Trie = load(trieCode, "Trie");
  it("the code on screen: insert, search, startsWith, autocomplete, remove with pruning", () => {
    const t = new Trie();
    for (const w of ["cat", "car", "cart", "dog"]) t.insert(w);
    expect(t.search("car")).toBe(true);
    expect(t.search("ca")).toBe(false);
    expect(t.startsWith("ca")).toBe(true);
    expect(t.autocomplete("ca")).toEqual(["car", "cart", "cat"]);
    expect(t.remove("car")).toBe(true);
    expect(t.search("cart")).toBe(true);
    expect(t.remove("zzz")).toBe(false);
    expect(t.remove("ca")).toBe(false);
    expect(t.remove("dog")).toBe(true);
    expect(t.startsWith("d")).toBe(false);
  });
  it("the animation ends with the same words as the real code, with no dead branches, on presets and random runs", () => {
    const words = [
      "a",
      "ab",
      "abc",
      "b",
      "bad",
      "bat",
      "bath",
      "c",
      "ca",
      "cab",
    ];
    const runs = triePresets.map((p) => p.input);
    for (let k = 0; k < 40; k++) {
      runs.push(
        Array.from(
          { length: 5 + rnd(25) },
          () =>
            `${["insert", "insert", "remove", "search", "startsWith", "autocomplete"][rnd(6)]} ${words[rnd(words.length)]}`,
        ).join(", "),
      );
    }
    for (const input of runs) {
      const ops = ok(parseTrie(input));
      const real = new Trie();
      for (const o of ops) {
        const w = o.names![0];
        if (o.op === "insert") real.insert(w);
        else if (o.op === "remove") real.remove(w);
      }
      const last = trieSteps(ops).at(-1)!.state;
      expect(last.words).toEqual(real.autocomplete(""));
      // every leaf must end a word (pruning removed the rest)
      const check = (n: NNode, isRoot: boolean) => {
        if (n.kids.length === 0 && !isRoot) expect(n.sub).toBe("✓");
        n.kids.forEach((k) => check(k, false));
      };
      check(last.roots[0], true);
    }
  });
  it("rejects bad input", () => {
    for (const bad of [
      "",
      "insert",
      "insert a b",
      "insert 12",
      "insert abcdefghijk",
      "frob cat",
    ])
      expect("error" in parseTrie(bad)).toBe(true);
  });
});

describe("Fenwick tree", () => {
  const Fen = load(fenwickCode, "FenwickTree");
  it("the code on screen matches brute force prefix and range sums", () => {
    const f = new Fen(FEN_N);
    const a = Array(FEN_N + 1).fill(0);
    for (let t = 0; t < 300; t++) {
      const i = 1 + rnd(FEN_N),
        d = rnd(21) - 10;
      f.update(i, d);
      a[i] += d;
      const q = 1 + rnd(FEN_N),
        l = 1 + rnd(FEN_N),
        r = l + rnd(FEN_N - l + 1);
      expect(f.prefixSum(q)).toBe(a.slice(1, q + 1).reduce((s, x) => s + x, 0));
      expect(f.rangeSum(l, r)).toBe(
        a.slice(l, r + 1).reduce((s, x) => s + x, 0),
      );
    }
  });
  it("the animation's tree array and every reported sum equal the real code", () => {
    const runs = fenwickPresets.map((p) => p.input);
    for (let k = 0; k < 30; k++) {
      runs.push(
        Array.from({ length: 5 + rnd(25) }, () =>
          rnd(3) === 0
            ? `prefix ${1 + rnd(FEN_N)}`
            : rnd(2)
              ? `add ${1 + rnd(FEN_N)} ${rnd(19) - 9}`
              : `range 1 ${1 + rnd(FEN_N)}`,
        ).join(", "),
      );
    }
    for (const input of runs) {
      const ops = ok(parseFenwick(input));
      const real = new Fen(FEN_N);
      const expected: number[] = [];
      for (const o of ops) {
        if (o.op === "add") real.update(o.args![0], o.args![1]);
        else if (o.op === "prefix") expected.push(real.prefixSum(o.args![0]));
        else expected.push(real.rangeSum(o.args![0], o.args![1]));
      }
      const steps = fenwickSteps(ops);
      expect(steps.at(-1)!.state.tree.slice(1)).toEqual(real.tree.slice(1));
      const reported = steps
        .filter(
          (s) =>
            /^(prefixSum\(\d+\) = -?\d+\.$|rangeSum\(\d+, \d+\) = -?\d+ - -?\d+ = -?\d+\.$)/.test(
              s.note,
            ) || /^i reached 0\./.test(s.note),
        )
        .map((s) => s);
      // rebuild the sequence of final answers: one per query op
      const answers: number[] = [];
      let qi = -1;
      steps.forEach((s) => {
        if (s.op !== qi && s.op >= 0) qi = s.op;
      });
      for (let i = 0; i < ops.length; i++) {
        if (ops[i].op === "add") continue;
        const own = steps.filter((s) => s.op === i);
        const last = own.at(-1)!.note;
        const m =
          ops[i].op === "range"
            ? /= (-?\d+)\.$/.exec(last)
            : /prefixSum\(\d+\) = (-?\d+)\.$/.exec(last);
        answers.push(Number(m![1]));
      }
      expect(answers).toEqual(expected);
      void reported;
    }
  });
  it("rejects out-of-range input", () => {
    for (const bad of [
      "add 0 1",
      "add 13 1",
      "prefix 0",
      "range 5 3",
      "range 1 13",
    ])
      expect("error" in parseFenwick(bad)).toBe(true);
  });
});

describe("2-3-4 tree", () => {
  const T = load(tree234Code, "Tree234");
  /** Nested [keys, ...children] form of a real 2-3-4 tree. */
  const realShape = (n: any): unknown => [n.keys, ...n.children.map(realShape)];
  /** Keys of a drawn 2-3-4 tree in sorted order. */
  const inorder = (n: NNode): number[] =>
    n.kids.length === 0
      ? (n.keys as number[])
      : n.kids.flatMap((k, i) => [
          ...inorder(k),
          ...(i < n.keys!.length ? [n.keys![i] as number] : []),
        ]);
  /** Depths of all leaves; they must all be equal. */
  const leafDepths = (n: NNode, d = 0): number[] =>
    n.kids.length === 0 ? [d] : n.kids.flatMap((k) => leafDepths(k, d + 1));
  /** Checks every node has 0 to 3 keys and one more child than keys. */
  const valid = (n: NNode) => {
    expect(n.keys!.length).toBeGreaterThanOrEqual(0);
    expect(n.keys!.length).toBeLessThanOrEqual(3);
    if (n.kids.length) expect(n.kids.length).toBe(n.keys!.length + 1);
    n.kids.forEach(valid);
  };
  it("the animation ends with exactly the same tree as the real code, and keeps every 2-3-4 invariant", () => {
    const runs = tree234Presets.map((p) => p.input);
    for (let k = 0; k < 40; k++)
      runs.push(
        Array.from({ length: 3 + rnd(40) }, () =>
          rnd(5) ? `insert ${rnd(60)}` : `search ${rnd(60)}`,
        ).join(", "),
      );
    for (const input of runs) {
      const ops = ok(parse234(input));
      const real = new T();
      const keys = new Set<number>();
      for (const o of ops)
        if (o.op === "insert") {
          real.insert(o.value!);
          keys.add(o.value!);
        }
      const steps = tree234Steps(ops);
      const root = steps.at(-1)!.state.roots[0];
      expect(shape(root)).toEqual(realShape(real.root));
      valid(root);
      expect(new Set(leafDepths(root)).size).toBe(1);
      expect(inorder(root)).toEqual([...keys].sort((a, b) => a - b));
      for (const o of ops)
        if (o.op === "search")
          expect(real.search(o.value!)).toBe(keys.has(o.value!) || false);
    }
  });
});

describe("Red-black tree", () => {
  const RB = load(redBlackCode, "RedBlackTree");
  /** Nested [key, colour, left, right] form of a real red-black tree. */
  const toShape = (n: any): unknown =>
    n ? [n.key, n.color, toShape(n.left), toShape(n.right)] : null;
  /** The same form for the drawn red-black tree. */
  const tShape = (n: TNode | null | undefined): unknown =>
    n ? [n.label, n.cls, tShape(n.l), tShape(n.r)] : null;
  /** Black nodes on every path from a node down to a leaf; fails if two paths differ. */
  const blackHeight = (n: TNode | null | undefined): number => {
    if (!n) return 1;
    const l = blackHeight(n.l),
      r = blackHeight(n.r);
    expect(l).toBe(r);
    return l + (n.cls === "black" ? 1 : 0);
  };
  /** Fails if a red node has a red child. */
  const noRedRed = (n: TNode | null | undefined) => {
    if (!n) return;
    if (n.cls === "red") {
      expect(n.l?.cls ?? "black").toBe("black");
      expect(n.r?.cls ?? "black").toBe("black");
    }
    noRedRed(n.l);
    noRedRed(n.r);
  };
  /** Keys of the drawn red-black tree in sorted order. */
  const inorder = (n: TNode | null | undefined): number[] =>
    n ? [...inorder(n.l), Number(n.label), ...inorder(n.r)] : [];

  it("the animation equals the real code at the end, and every settled frame is a valid red-black tree", () => {
    const runs = redBlackPresets.map((p) => p.input);
    for (let k = 0; k < 40; k++)
      runs.push(
        Array.from({ length: 3 + rnd(60) }, () =>
          rnd(6) ? `insert ${rnd(80)}` : `search ${rnd(80)}`,
        ).join(", "),
      );
    for (const input of runs) {
      const ops = ok(parseRB(input));
      const real = new RB();
      const keys = new Set<number>();
      for (const o of ops)
        if (o.op === "insert") {
          real.insert(o.value!);
          keys.add(o.value!);
        }
      const steps = redBlackSteps(ops);
      const last = steps.at(-1)!.state.root;
      expect(tShape(last)).toEqual(toShape(real.root));
      expect(inorder(last)).toEqual([...keys].sort((a, b) => a - b));
      for (const s of steps) {
        if (!s.note.startsWith("Red-black properties hold again.")) continue;
        const r = s.state.root!;
        expect(r.cls).toBe("black");
        noRedRed(r);
        blackHeight(r);
      }
    }
  });
});
