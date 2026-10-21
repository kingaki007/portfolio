import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks } from "../components/TreeViz";
import type { NNode } from "../components/NaryViz";

export interface Tree234State {
  roots: NNode[];
  marks: Marks;
}

const code = `class Node234 {
  keys: number[] = [];
  children: Node234[] = [];

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get isFull(): boolean {
    return this.keys.length === 3;
  }
}

class Tree234 {
  root = new Node234();

  search(key: number): boolean {
    let node = this.root;
    while (true) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && node.keys[i] === key) return true;
      if (node.isLeaf) return false;
      node = node.children[i];
    }
  }

  insert(key: number): void {
    if (this.root.isFull) {
      const newRoot = new Node234();
      newRoot.children.push(this.root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
    }
    let node = this.root;
    while (!node.isLeaf) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && node.keys[i] === key) return;
      if (node.children[i].isFull) {
        this.splitChild(node, i);
        if (key === node.keys[i]) return;
        if (key > node.keys[i]) i++;
      }
      node = node.children[i];
    }
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (node.keys[i] === key) return;
    node.keys.splice(i, 0, key);
  }

  // split a full child (3 keys) into two 2-nodes and lift its middle key
  private splitChild(parent: Node234, index: number): void {
    const full = parent.children[index];
    const right = new Node234();
    right.keys = [full.keys[2]];
    if (!full.isLeaf) right.children = full.children.splice(2, 2);
    const middle = full.keys[1];
    full.keys = [full.keys[0]];
    parent.keys.splice(index, 0, middle);
    parent.children.splice(index + 1, 0, right);
  }
}`;

export const tree234Code = code;

export const tree234Topic: Topic = {
  id: "tree-234",
  title: "2-3-4 Tree",
  group: "Trees",
  blurb: "A perfectly balanced multiway search tree: every node holds 1 to 3 keys, and all leaves sit at the same depth. Inserts split full 4-nodes on the way down so there is always room. (Insert and search are shown; deletion is left out.)",
  syntax: "insert <n>, search <n>",
  code,
  complexity: [
    { op: "insert / search", time: "O(log n), height never exceeds log₂(n + 1)" },
    { op: "split", time: "O(1)" },
    { op: "relation", time: "equivalent to a left-leaning red-black tree" },
  ],
};

export const parse234 = (i: string) => parseOps(i, { insert: 1, search: 1 });

interface N {
  id: number;
  keys: number[];
  kids: N[];
}

const L = {
  searchLoop: lineOf(code, "while (i < node.keys.length && key > node.keys[i]) i++;"),
  searchHit: lineOf(code, "if (i < node.keys.length && node.keys[i] === key) return true;"),
  searchLeaf: lineOf(code, "if (node.isLeaf) return false;"),
  searchDown: lineOf(code, "node = node.children[i];"),
  rootFull: lineOf(code, "if (this.root.isFull) {"),
  newRoot: lineOf(code, "const newRoot = new Node234();"),
  rootSplit: lineOf(code, "this.splitChild(newRoot, 0);"),
  rootSet: lineOf(code, "this.root = newRoot;"),
  descend: lineOf(code, "while (!node.isLeaf) {"),
  pos: lineOf(code, "while (i < node.keys.length && key > node.keys[i]) i++;", lineOf(code, "while (!node.isLeaf) {")),
  dup: lineOf(code, "if (i < node.keys.length && node.keys[i] === key) return;"),
  childFull: lineOf(code, "if (node.children[i].isFull) {"),
  split: lineOf(code, "this.splitChild(node, i);"),
  afterSplit: lineOf(code, "if (key > node.keys[i]) i++;"),
  down: lineOf(code, "node = node.children[i];", lineOf(code, "while (!node.isLeaf) {")),
  leafPos: lineOf(code, "while (i < node.keys.length && key > node.keys[i]) i++;", lineOf(code, "node = node.children[i];", lineOf(code, "while (!node.isLeaf) {"))),
  leafDup: lineOf(code, "if (node.keys[i] === key) return;"),
  leafIns: lineOf(code, "node.keys.splice(i, 0, key);"),
  splitHead: lineOf(code, "private splitChild"),
  splitRight: lineOf(code, "right.keys = [full.keys[2]];"),
  splitMid: lineOf(code, "const middle = full.keys[1];"),
  splitLeft: lineOf(code, "full.keys = [full.keys[0]];"),
  splitLift: lineOf(code, "parent.keys.splice(index, 0, middle);"),
  splitAttach: lineOf(code, "parent.children.splice(index + 1, 0, right);"),
};

export function tree234Steps(ops: ParsedOp[]): Step<Tree234State>[] {
  let nextId = 1;
  const mk = (keys: number[] = [], kids: N[] = []): N => ({ id: nextId++, keys, kids });
  let root = mk();
  const steps: Step<Tree234State>[] = [];
  let opIdx = -1;

  const toN = (n: N): NNode => ({ id: n.id, keys: n.keys, kids: n.kids.map(toN) });
  const snap = (note: string, lines: number[], marks: Marks = {}) =>
    steps.push({ state: { roots: [toN(root)], marks }, lines, note, op: opIdx });
  const isLeaf = (n: N) => n.kids.length === 0;
  const isFull = (n: N) => n.keys.length === 3;
  const fmt = (n: N) => `[${n.keys.join(" ")}]`;

  snap("An empty 2-3-4 tree: a single empty leaf. Press play to run the operations.", []);

  const splitChild = (parent: N, index: number) => {
    const full = parent.kids[index];
    const [k0, k1, k2] = full.keys;
    snap(`Split the 4-node ${fmt(full)}: the middle key ${k1} will move up, the outer keys become two separate nodes.`, [L.splitHead, L.splitMid], { [full.id]: "del" });
    const right = mk([k2], isLeaf(full) ? [] : full.kids.splice(2, 2));
    full.keys = [k0];
    parent.keys.splice(index, 0, k1);
    parent.kids.splice(index + 1, 0, right);
    snap(`${k1} moved up into ${fmt(parent)}; ${fmt(full)} and ${fmt(right)} are now separate 2-nodes.`, [L.splitRight, L.splitLeft, L.splitLift, L.splitAttach], { [parent.id]: "swap", [full.id]: "new", [right.id]: "new" });
  };

  const insert = (key: number) => {
    if (isFull(root)) {
      snap(`The root ${fmt(root)} is a 4-node, so split it before descending. This is the only way the tree gets taller.`, [L.rootFull], { [root.id]: "del" });
      const newRoot = mk([], [root]);
      snap("Create a new, empty root above it.", [L.newRoot], { [newRoot.id]: "new" });
      splitChild(newRoot, 0);
      root = newRoot;
      snap("The new root becomes the tree's root.", [L.rootSet], { [root.id]: "swap" });
    }
    let node = root;
    while (!isLeaf(node)) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      snap(`At ${fmt(node)}: ${key} belongs in child ${i} (${i === 0 ? "before the first key" : i === node.keys.length ? "after the last key" : `between ${node.keys[i - 1]} and ${node.keys[i]}`}).`, [L.descend, L.pos], { [node.id]: "cmp" });
      if (i < node.keys.length && node.keys[i] === key) {
        snap(`${key} is already in ${fmt(node)}. Duplicates are ignored.`, [L.dup], { [node.id]: "found" });
        return;
      }
      if (isFull(node.kids[i])) {
        snap(`The child ${fmt(node.kids[i])} is a 4-node: split it now, on the way down, so a later insert always has room.`, [L.childFull], { [node.id]: "cmp", [node.kids[i].id]: "del" });
        splitChild(node, i);
        if (key === node.keys[i]) {
          snap(`${key} is the key that just moved up: already present.`, [L.split], { [node.id]: "found" });
          return;
        }
        if (key > node.keys[i]) i++;
        snap(`Choose the correct half after the split: child ${i}.`, [L.afterSplit], { [node.id]: "cmp", [node.kids[i].id]: "cmp" });
      }
      node = node.kids[i];
      snap(`Descend into ${fmt(node)}.`, [L.down], { [node.id]: "cmp" });
    }
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    snap(`Reached the leaf ${fmt(node)}. ${key} goes at position ${i}.`, [L.leafPos], { [node.id]: "cmp" });
    if (node.keys[i] === key) {
      snap(`${key} is already in this leaf. Duplicates are ignored.`, [L.leafDup], { [node.id]: "found" });
      return;
    }
    node.keys.splice(i, 0, key);
    snap(`Insert ${key}: the leaf is now ${fmt(node)}.`, [L.leafIns], { [node.id]: "new" });
  };

  const search = (key: number) => {
    let node = root;
    for (;;) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      snap(`At ${node.keys.length ? fmt(node) : "[ ]"}: ${key} compared with the keys gives position ${i}.`, [L.searchLoop], { [node.id]: "cmp" });
      if (i < node.keys.length && node.keys[i] === key) {
        snap(`Found ${key} in ${fmt(node)}.`, [L.searchHit], { [node.id]: "found" });
        return;
      }
      if (isLeaf(node)) {
        snap(`Reached a leaf without finding ${key}: search returns false.`, [L.searchLeaf], { [node.id]: "del" });
        return;
      }
      node = node.kids[i];
      snap(`Go down to child ${i}.`, [L.searchDown], { [node.id]: "cmp" });
    }
  };

  ops.forEach((o, i) => {
    opIdx = i;
    if (o.op === "insert") insert(o.value!);
    else search(o.value!);
  });
  return steps;
}

/** nested arrays for tests: [keys, children...] */
export const shape = (n: NNode): unknown => [n.keys, ...n.kids.map(shape)];

export const tree234Presets: Preset[] = [
  { name: "Basics", desc: "The fourth insert fills the root, the fifth splits it.", input: "insert 10, insert 20, insert 30, insert 40, insert 50, insert 25, search 25, search 35" },
  { name: "Ascending (1 to 15)", desc: "Sorted input never degrades a 2-3-4 tree: watch splits cascade.", input: seq(15, (i) => `insert ${i + 1}`).join(", ") },
  { name: "Random order (20 keys)", desc: "Splits happen in different places, all leaves stay at one depth.", input: seq(20, (i) => `insert ${(i * 37 + 11) % 97}`).join(", ") + ", search 11, search 12" },
  { name: "Edge cases", desc: "Duplicates, searching an empty tree, keys that equal a lifted key.", input: "search 5, insert 5, insert 5, insert 3, insert 7, insert 5, insert 1, insert 9, insert 5, insert 7, search 9, search 4" },
];
