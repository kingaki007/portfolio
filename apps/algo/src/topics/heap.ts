/**
 * Min heap and max heap (one implementation, flipped by the comparison): the code shown to the
 * user and the step generator for insert, extract and peek with sift-up and sift-down.
 */

import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks, TNode } from "../components/TreeViz";

/** One element of the heap, with a stable id so it can be followed while it moves. */
export interface HeapItem {
  id: number;
  v: number;
}

/** One frame: the heap array and the node marks. */
export interface HeapState {
  items: HeapItem[];
  marks: Marks;
}

/** Builds the tree view of the heap array: the children of index i are 2i+1 and 2i+2. */
export function heapTree(items: HeapItem[], i = 0): TNode | null {
  if (i >= items.length) return null;
  return {
    id: items[i].id,
    label: items[i].v,
    l: heapTree(items, 2 * i + 1),
    r: heapTree(items, 2 * i + 2),
  };
}

/** Generates the displayed class source for a min heap or a max heap. */
function heapCode(max: boolean) {
  const name = max ? "MaxHeap" : "MinHeap";
  const le = max ? ">=" : "<="; // parent already beats or ties child
  const lt = max ? ">" : "<"; // child beats current best
  return `class ${name} {
  private a: number[] = [];

  insert(x: number) {
    this.a.push(x);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p] ${le} this.a[i]) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }

  extract(): number | undefined {
    if (!this.a.length) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length) {
      this.a[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  peek() {
    return this.a[0];
  }

  private siftDown(i: number) {
    const n = this.a.length;
    while (true) {
      let m = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < n && this.a[l] ${lt} this.a[m]) m = l;
      if (r < n && this.a[r] ${lt} this.a[m]) m = r;
      if (m === i) break;
      [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
      i = m;
    }
  }
}`;
}

/**
 * Builds the min-heap (max = false) or max-heap (max = true) topic: code, step generator, presets
 * and parser.
 */
export function makeHeap(max: boolean) {
  const code = heapCode(max);
  const word = max ? "largest" : "smallest";
  const L = {
    push: lineOf(code, "this.a.push(x);"),
    loop: lineOf(code, "while (i > 0)"),
    parent: lineOf(code, "const p = (i - 1) >> 1;"),
    stop: lineOf(code, "break;"),
    swapUp: lineOf(code, "[this.a[p], this.a[i]]"),
    move: lineOf(code, "i = p;"),
    exEmpty: lineOf(code, "if (!this.a.length) return undefined;"),
    exTop: lineOf(code, "const top = this.a[0];"),
    exPop: lineOf(code, "const last = this.a.pop()!;"),
    exPlace: lineOf(code, "this.a[0] = last;"),
    exSift: lineOf(code, "this.siftDown(0);"),
    peek: lineOf(code, "return this.a[0];"),
    sdBest: lineOf(code, "let m = i;"),
    sdL: lineOf(code, "if (l < n"),
    sdR: lineOf(code, "if (r < n"),
    sdStop: lineOf(code, "if (m === i) break;"),
    sdSwap: lineOf(code, "[this.a[m], this.a[i]]"),
    sdMove: lineOf(code, "i = m;"),
  };

  const topic: Topic = {
    id: max ? "max-heap" : "min-heap",
    title: max ? "Max Heap" : "Min Heap",
    group: "Heap",
    blurb: max
      ? "A complete binary tree stored in an array where every parent is at least as large as its children."
      : "A complete binary tree stored in an array where every parent is at most as large as its children.",
    syntax: "insert <n>, extract, peek",
    code,
    complexity: [
      { op: "insert", time: "O(log n)" },
      { op: "extract", time: "O(log n)" },
      { op: "peek", time: "O(1)" },
    ],
  };

  /** does a come before b in this heap? */
  const before = (a: number, b: number) => (max ? a > b : a < b);

  /** Runs the operations on the heap and records the compare and swap steps. */
  const steps = (ops: ParsedOp[]): Step<HeapState>[] => {
    let items: HeapItem[] = [];
    let nextId = 1;
    let opIdx = -1;
    const out: Step<HeapState>[] = [];
    /** Records a frame of the heap with the given note, code lines and marks. */
    const snap = (note: string, lines: number[], marks: Marks = {}) =>
      out.push({
        state: { items: items.map((x) => ({ ...x })), marks },
        lines,
        note,
        op: opIdx,
      });
    /** Swaps two positions of the heap array (the items keep their ids). */
    const swap = (i: number, j: number) => {
      const t = items[i];
      items = items.map((x, k) => (k === i ? items[j] : k === j ? t : x));
    };

    snap("Empty heap. Press play to run the operations.", []);

    /**
     * Sinks the element at `start` by swapping it with its better child until the heap property
     * holds.
     */
    const siftDown = (start: number) => {
      let i = start;
      const n = items.length;
      for (;;) {
        let m = i;
        const l = 2 * i + 1;
        const r = l + 1;
        snap(
          `At index ${i} (${items[i].v}). Assume it is the ${word} of itself and its children.`,
          [L.sdBest],
          { [items[i].id]: "cmp" },
        );
        if (l < n) {
          const wins = before(items[l].v, items[m].v);
          snap(
            `Left child ${items[l].v} ${wins ? "beats" : "does not beat"} ${items[m].v}.`,
            [L.sdL],
            { [items[l].id]: "cmp", [items[m].id]: "cmp" },
          );
          if (wins) m = l;
        }
        if (r < n) {
          const wins = before(items[r].v, items[m].v);
          snap(
            `Right child ${items[r].v} ${wins ? "beats" : "does not beat"} ${items[m].v}.`,
            [L.sdR],
            { [items[r].id]: "cmp", [items[m].id]: "cmp" },
          );
          if (wins) m = r;
        }
        if (m === i) {
          snap(
            `${items[i].v} is already in place. The heap property holds again.`,
            [L.sdStop],
            { [items[i].id]: "found" },
          );
          return;
        }
        swap(m, i);
        snap(
          `Swap ${items[i].v} with ${items[m].v} and keep sinking.`,
          [L.sdSwap],
          { [items[m].id]: "swap", [items[i].id]: "swap" },
        );
        i = m;
        snap(`Continue from index ${i}.`, [L.sdMove], { [items[i].id]: "cmp" });
      }
    };

    ops.forEach((o, k) => {
      opIdx = k;
      if (o.op === "insert") {
        const x = o.value!;
        items = [...items, { id: nextId++, v: x }];
        let i = items.length - 1;
        snap(
          `Append ${x} at the end (index ${i}) to keep the tree complete.`,
          [L.push],
          { [items[i].id]: "new" },
        );
        while (i > 0) {
          const p = (i - 1) >> 1;
          const ordered = !before(items[i].v, items[p].v);
          snap(`Compare with parent ${items[p].v} at index ${p}.`, [L.parent], {
            [items[i].id]: "cmp",
            [items[p].id]: "cmp",
          });
          if (ordered) {
            snap(
              `${items[p].v} already beats or ties ${items[i].v}, so stop.`,
              [L.stop],
              { [items[i].id]: "found" },
            );
            break;
          }
          swap(p, i);
          snap(`${items[p].v} beats its parent, so swap them.`, [L.swapUp], {
            [items[p].id]: "swap",
            [items[i].id]: "swap",
          });
          i = p;
          snap(
            i === 0 ? "Reached the root." : `Move up to index ${i}.`,
            [L.move],
            { [items[i].id]: "cmp" },
          );
        }
      } else if (o.op === "extract") {
        if (items.length === 0) {
          snap("The heap is empty, extract returns undefined.", [L.exEmpty]);
          return;
        }
        const top = items[0];
        snap(
          `The root ${top.v} is the ${word} value. That is what we remove.`,
          [L.exTop],
          { [top.id]: "del" },
        );
        if (items.length === 1) {
          items = [];
          snap(`Removed ${top.v}. The heap is now empty.`, [L.exPop]);
          return;
        }
        const last = items[items.length - 1];
        items = items.slice(0, -1);
        snap(
          `Pop the last element ${last.v} off the end of the array.`,
          [L.exPop],
          { [last.id]: "swap", [top.id]: "del" },
        );
        items = [last, ...items.slice(1)];
        snap(
          `Place ${last.v} at the root in place of ${top.v}. The heap order may be broken.`,
          [L.exPlace],
          { [last.id]: "swap" },
        );
        snap("Sift it down to restore the order.", [L.exSift], {
          [last.id]: "cmp",
        });
        siftDown(0);
      } else {
        snap(
          items.length
            ? `peek: the root ${items[0].v} is the ${word} value. Nothing changes.`
            : "peek: the heap is empty.",
          [L.peek],
          items.length ? { [items[0].id]: "found" } : {},
        );
      }
    });
    return out;
  };

  const presets: Preset[] = [
    {
      name: "Basics",
      desc: "Insert a few values, peek, then extract.",
      input:
        "insert 40, insert 15, insert 30, insert 8, insert 55, insert 3, peek, extract, extract, insert 1, extract",
    },
    {
      name: "Edge cases",
      desc: "Extract and peek on empty, duplicates, single element.",
      input:
        "extract, peek, insert 5, extract, extract, insert 7, insert 7, insert 7, extract, extract, extract",
    },
    {
      name: max
        ? "Descending run (worst for max)"
        : "Descending run (worst for min)",
      desc: "Inserting in the unfavourable order makes every value bubble to the root.",
      input: seq(15, (i) => `insert ${max ? i * 6 + 5 : 95 - i * 6}`).join(
        ", ",
      ),
    },
    {
      name: "Heap sort style (45 ops)",
      desc: "Fill with 22 values then extract them all in sorted order.",
      input: [
        ...seq(22, (i) => `insert ${(i * 37 + 11) % 97}`),
        ...seq(22, () => "extract"),
      ].join(", "),
    },
  ];

  return {
    topic,
    steps,
    presets,
    parse: (input: string) =>
      parseOps(input, { insert: 1, extract: 0, peek: 0 }),
  };
}

export const minHeap = makeHeap(false);
export const maxHeap = makeHeap(true);

/** True when every parent is at least as good as its children; used by tests. */
export function isHeap(items: HeapItem[], max: boolean) {
  for (let i = 1; i < items.length; i++) {
    const p = items[(i - 1) >> 1].v;
    if (max ? p < items[i].v : p > items[i].v) return false;
  }
  return true;
}
