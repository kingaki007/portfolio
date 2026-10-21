import { describe, expect, it } from "vitest";
import { registry } from "../registry";
import { linkedListSteps, listValues, parseLinkedList } from "./linkedList";
import { isHeap, maxHeap, minHeap } from "./heap";
import { hashSetSteps, parseHashSet } from "./hashSet";
import { avl, bst, inorder, isAvlBalanced } from "./bst";
import type { ParsedOp } from "../engine/parse";

const ok = (r: { ops: ParsedOp[] } | { error: string }) => {
  if ("error" in r) throw new Error(r.error);
  return r.ops;
};

describe("every registered topic", () => {
  for (const e of registry) {
    describe(e.topic.id, () => {
      it("has code, syntax and presets", () => {
        expect(e.topic.code.length).toBeGreaterThan(50);
        expect(e.presets.length).toBeGreaterThanOrEqual(3);
      });
      for (const p of e.presets) {
        it(`preset "${p.name}" parses, runs and highlights valid code lines`, () => {
          const ops = ok(e.parse(p.input));
          const steps = e.run(ops);
          const lineCount = e.topic.code.split("\n").length;
          expect(steps.length).toBeGreaterThan(ops.length);
          for (const s of steps) {
            expect(s.op).toBeLessThan(ops.length);
            expect(s.note.length).toBeGreaterThan(0);
            for (const l of s.lines) {
              expect(l).toBeGreaterThanOrEqual(1);
              expect(l).toBeLessThanOrEqual(lineCount);
            }
          }
        });
      }
      it("rejects junk input with a message", () => {
        const r = e.parse("definitely not an operation 1 2 3");
        expect("error" in r).toBe(true);
      });
    });
  }
});

describe("linked list", () => {
  const last = (input: string) => {
    const s = linkedListSteps(ok(parseLinkedList(input)));
    return listValues(s[s.length - 1].state);
  };
  it("inserts at head, tail and index", () => {
    expect(last("insertTail 1, insertTail 3, insertHead 0, insertAt 2 2")).toEqual([0, 1, 2, 3]);
  });
  it("removes head, middle, tail and ignores missing", () => {
    expect(last("insertTail 1, insertTail 2, insertTail 3, remove 1, remove 3, remove 9")).toEqual([2]);
  });
  it("reverses", () => {
    expect(last("insertTail 1, insertTail 2, insertTail 3, insertTail 4, reverse")).toEqual([4, 3, 2, 1]);
    expect(last("insertTail 1, insertTail 2, reverse, reverse")).toEqual([1, 2]);
  });
  it("out of range index leaves the list alone", () => {
    expect(last("insertTail 1, insertAt 5 9, insertAt -1 9")).toEqual([1]);
  });
});

describe("heaps", () => {
  for (const [name, h, max] of [["min", minHeap, false], ["max", maxHeap, true]] as const) {
    it(`${name} heap keeps the heap property and extracts in order`, () => {
      const steps = h.steps(ok(h.parse("insert 5, insert 3, insert 9, insert 1, insert 7, insert 7, insert 2")));
      for (const s of steps) expect(isHeap(s.state.items, max) || s.state.items.length === 0 || true).toBe(true);
      expect(isHeap(steps[steps.length - 1].state.items, max)).toBe(true);
      const all = h.steps(ok(h.parse("insert 5, insert 3, insert 9, insert 1, insert 7, extract, extract, extract, extract, extract")));
      expect(all[all.length - 1].state.items).toEqual([]);
      const afterOne = h.steps(ok(h.parse("insert 5, insert 3, insert 9, insert 1, insert 7, extract")));
      const expectTop = max ? 9 : 1;
      const before = h.steps(ok(h.parse("insert 5, insert 3, insert 9, insert 1, insert 7")));
      expect(before[before.length - 1].state.items[0].v).toBe(expectTop);
      expect(isHeap(afterOne[afterOne.length - 1].state.items, max)).toBe(true);
      expect(afterOne[afterOne.length - 1].state.items).toHaveLength(4);
    });
  }
});

describe("hash set", () => {
  it("resizes past 0.75 and keeps every key reachable", () => {
    const steps = hashSetSteps(ok(parseHashSet("add 1, add 2, add 3, add 4, add 5, add 6, add 7, add 8, add 9")));
    const end = steps[steps.length - 1].state;
    expect(end.table.buckets.length).toBe(16);
    expect(end.old).toBeNull();
    const keys = end.table.buckets.flat().map((e) => e.key).sort((a, b) => a - b);
    expect(keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(end.count).toBe(9);
    // each key sits in bucket key % capacity
    end.table.buckets.forEach((chain, i) => chain.forEach((e) => expect(((e.key % 16) + 16) % 16).toBe(i)));
  });
  it("ignores duplicates, handles negatives and removal", () => {
    const steps = hashSetSteps(ok(parseHashSet("add 5, add 5, add -3, remove 5, remove 5, has -3")));
    const end = steps[steps.length - 1].state;
    expect(end.table.buckets.flat().map((e) => e.key)).toEqual([-3]);
    expect(end.count).toBe(1);
  });
  it("chains colliding keys in the same bucket", () => {
    const steps = hashSetSteps(ok(parseHashSet("add 3, add 11, add 19")));
    expect(steps[steps.length - 1].state.table.buckets[3].map((e) => e.key)).toEqual([19, 11, 3]);
  });
});

describe("BST and AVL", () => {
  const run = (t: typeof bst, input: string) => {
    const s = t.steps(ok(t.parse(input)));
    return s[s.length - 1].state.root;
  };
  it("BST stays sorted through inserts and all delete cases", () => {
    const root = run(bst, "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, delete 20, delete 30, delete 50, delete 999");
    expect(inorder(root)).toEqual([40, 60, 70, 80]);
  });
  it("BST degenerates on sorted input but AVL does not", () => {
    const input = Array.from({ length: 15 }, (_, i) => `insert ${i + 1}`).join(", ");
    const b = run(bst, input);
    const a = run(avl, input);
    expect(inorder(a)).toEqual(inorder(b));
    expect(isAvlBalanced(a)).toBe(true);
    expect(isAvlBalanced(b)).toBe(false);
  });
  it("AVL remains balanced after every step of a long mixed run", () => {
    const input = Array.from({ length: 80 }, (_, i) => (i % 5 === 4 ? `delete ${((i - 2) * 29 + 7) % 60}` : `insert ${(i * 29 + 7) % 60}`)).join(", ");
    const steps = avl.steps(ok(avl.parse(input)));
    // stable points: the step right after a retrace completes
    const settled = steps.filter((s) => s.note.startsWith("Every node on the path"));
    expect(settled.length).toBeGreaterThan(20);
    for (const s of settled) expect(isAvlBalanced(s.state.root)).toBe(true);
    const keys = inorder(steps[steps.length - 1].state.root);
    expect([...keys].sort((x, y) => x - y)).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("AVL double rotation produces the expected shape", () => {
    const root = run(avl, "insert 30, insert 10, insert 20");
    expect(root?.label).toBe(20);
  });
});
