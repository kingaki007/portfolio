/**
 * Red-black tree topic (insert and search): the code shown to the user and the step generator
 * that shows recolouring and rotations restoring the red-black rules.
 */

import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks, TNode } from "../components/TreeViz";

/** One frame: the coloured tree and the node marks. */
export interface RBState {
  root: TNode | null;
  marks: Marks;
}

const code = `type Color = "red" | "black";

class RBNode {
  left: RBNode | null = null;
  right: RBNode | null = null;
  parent: RBNode | null = null;
  color: Color = "red";
  constructor(public key: number) {}
}

class RedBlackTree {
  root: RBNode | null = null;

  search(key: number): RBNode | null {
    let cur = this.root;
    while (cur && cur.key !== key) {
      cur = key < cur.key ? cur.left : cur.right;
    }
    return cur;
  }

  insert(key: number): void {
    let parent: RBNode | null = null;
    let cur = this.root;
    while (cur) {
      parent = cur;
      if (key === cur.key) return;
      cur = key < cur.key ? cur.left : cur.right;
    }
    const node = new RBNode(key);
    node.parent = parent;
    if (!parent) this.root = node;
    else if (key < parent.key) parent.left = node;
    else parent.right = node;
    this.fixInsert(node);
  }

  private fixInsert(node: RBNode): void {
    while (node.parent && node.parent.color === "red") {
      const parent = node.parent;
      const grand = parent.parent!;
      const uncle = parent === grand.left ? grand.right : grand.left;
      if (uncle && uncle.color === "red") {
        parent.color = "black";
        uncle.color = "black";
        grand.color = "red";
        node = grand;
      } else if (parent === grand.left) {
        if (node === parent.right) {
          node = parent;
          this.rotateLeft(node);
        }
        node.parent!.color = "black";
        grand.color = "red";
        this.rotateRight(grand);
      } else {
        if (node === parent.left) {
          node = parent;
          this.rotateRight(node);
        }
        node.parent!.color = "black";
        grand.color = "red";
        this.rotateLeft(grand);
      }
    }
    this.root!.color = "black";
  }

  private rotateLeft(x: RBNode): void {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rotateRight(y: RBNode): void {
    const x = y.left!;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.parent = y.parent;
    if (!y.parent) this.root = x;
    else if (y === y.parent.left) y.parent.left = x;
    else y.parent.right = x;
    x.right = y;
    y.parent = x;
  }
}`;

export const redBlackCode = code;

export const redBlackTopic: Topic = {
  id: "red-black",
  title: "Red-Black Tree",
  group: "Trees",
  blurb:
    "A balanced BST that colours nodes red or black. Recolouring and at most two rotations after each insert keep the longest path at most twice the shortest. (Insert and search are shown; deletion is left out.)",
  syntax: "insert <n>, search <n>",
  code,
  complexity: [
    { op: "insert / search", time: "O(log n), height ≤ 2·log₂(n + 1)" },
    {
      op: "rebalancing per insert",
      time: "O(log n) recolourings, at most 2 rotations",
    },
    {
      op: "rules",
      time: "root is black · red nodes have black children · every path has the same number of black nodes",
    },
  ],
};

/** Parses insert and search operations. */
export const parseRB = (i: string) => parseOps(i, { insert: 1, search: 1 });

/** Internal mutable node: id, value, colour and the left, right and parent links. */
interface N {
  id: number;
  v: number;
  red: boolean;
  l: N | null;
  r: N | null;
  p: N | null;
}

const L = {
  searchLoop: lineOf(code, "while (cur && cur.key !== key) {"),
  searchMove: lineOf(code, "cur = key < cur.key ? cur.left : cur.right;"),
  searchRet: lineOf(code, "return cur;"),
  descend: lineOf(code, "while (cur) {"),
  dup: lineOf(code, "if (key === cur.key) return;"),
  insMove: lineOf(
    code,
    "cur = key < cur.key ? cur.left : cur.right;",
    lineOf(code, "insert(key"),
  ),
  newNode: lineOf(code, "const node = new RBNode(key);"),
  attachRoot: lineOf(code, "if (!parent) this.root = node;"),
  attachL: lineOf(code, "else if (key < parent.key) parent.left = node;"),
  attachR: lineOf(code, "else parent.right = node;"),
  fix: lineOf(code, "this.fixInsert(node);"),
  loop: lineOf(code, 'while (node.parent && node.parent.color === "red") {'),
  uncle: lineOf(
    code,
    "const uncle = parent === grand.left ? grand.right : grand.left;",
  ),
  recolor: lineOf(code, 'if (uncle && uncle.color === "red") {'),
  recolorSet: lineOf(code, 'grand.color = "red";'),
  recolorUp: lineOf(code, "node = grand;"),
  leftSide: lineOf(code, "} else if (parent === grand.left) {"),
  triL: lineOf(code, "if (node === parent.right) {"),
  rotParentL: lineOf(code, "this.rotateLeft(node);"),
  lineL: lineOf(code, 'node.parent!.color = "black";'),
  rotGrandR: lineOf(code, "this.rotateRight(grand);"),
  triR: lineOf(code, "if (node === parent.left) {"),
  rotParentR: lineOf(code, "this.rotateRight(node);"),
  lineR: lineOf(
    code,
    'node.parent!.color = "black";',
    lineOf(code, "if (node === parent.left) {"),
  ),
  rotGrandL: lineOf(code, "this.rotateLeft(grand);"),
  rootBlack: lineOf(code, 'this.root!.color = "black";'),
};

/** Runs the operations and records the descent, the attachment and the fix-up steps. */
export function redBlackSteps(ops: ParsedOp[]): Step<RBState>[] {
  let nextId = 1;
  let root: N | null = null;
  const steps: Step<RBState>[] = [];
  let opIdx = -1;

  /** Converts the internal tree to the drawable one (the colour becomes a CSS class). */
  const toT = (n: N | null): TNode | null =>
    n
      ? {
          id: n.id,
          label: n.v,
          cls: n.red ? "red" : "black",
          l: toT(n.l),
          r: toT(n.r),
        }
      : null;
  /** Records a frame of the tree. */
  const snap = (note: string, lines: number[], marks: Marks = {}) =>
    steps.push({ state: { root: toT(root), marks }, lines, note, op: opIdx });
  /** Colour name of a node, for the explanations. */
  const c = (n: N) => (n.red ? "red" : "black");

  /** Left rotation around x, updating the parent links. */
  const rotL = (x: N) => {
    const y = x.r!;
    x.r = y.l;
    if (y.l) y.l.p = x;
    y.p = x.p;
    if (!x.p) root = y;
    else if (x === x.p.l) x.p.l = y;
    else x.p.r = y;
    y.l = x;
    x.p = y;
  };
  /** Right rotation around y, updating the parent links. */
  const rotR = (y: N) => {
    const x = y.l!;
    y.l = x.r;
    if (x.r) x.r.p = y;
    x.p = y.p;
    if (!y.p) root = x;
    else if (y === y.p.l) y.p.l = x;
    else y.p.r = x;
    x.r = y;
    y.p = x;
  };

  snap("An empty tree. Press play to run the operations.", []);

  /**
   * Restores the red-black rules after an insert: recolour when the uncle is red, otherwise rotate
   * (the triangle case first, then the line case), and finally colour the root black.
   */
  const fix = (start: N) => {
    let node = start;
    snap(
      `Fix-up: a new node is always red. That can only break the rule "a red node has no red child".`,
      [L.fix],
      { [node.id]: "new" },
    );
    while (node.p && node.p.red) {
      const parent = node.p;
      const grand = parent.p!;
      const uncle = parent === grand.l ? grand.r : grand.l;
      snap(
        `${node.v} and its parent ${parent.v} are both red: a violation. Look at the uncle ${uncle ? uncle.v : "(none, counts as black)"} (${uncle ? c(uncle) : "black"}).`,
        [L.loop, L.uncle],
        {
          [node.id]: "cmp",
          [parent.id]: "cmp",
          [grand.id]: "cmp",
          ...(uncle ? { [uncle.id]: "cmp" } : {}),
        },
      );
      if (uncle && uncle.red) {
        parent.red = false;
        uncle.red = false;
        grand.red = true;
        snap(
          `Uncle is red → recolour: parent ${parent.v} and uncle ${uncle.v} turn black, grandparent ${grand.v} turns red. No rotation needed.`,
          [L.recolor, L.recolorSet],
          { [parent.id]: "swap", [uncle.id]: "swap", [grand.id]: "swap" },
        );
        node = grand;
        snap(
          `The problem may have moved up: check ${node.v} against its own parent.`,
          [L.recolorUp],
          { [node.id]: "cmp" },
        );
      } else if (parent === grand.l) {
        snap(
          `Uncle is black (or missing) and the parent is a left child: rotations are needed.`,
          [L.leftSide],
          { [parent.id]: "cmp", [grand.id]: "cmp" },
        );
        if (node === parent.r) {
          snap(
            `${node.v} is the right child of a left child (a "triangle"). Rotate left at the parent to straighten it into a line.`,
            [L.triL, L.rotParentL],
            { [node.id]: "swap", [parent.id]: "swap" },
          );
          node = parent;
          rotL(node);
          snap(
            `After the left rotation the nodes form a line. Continue with ${node.v}.`,
            [L.rotParentL],
            { [node.id]: "cmp", [node.p!.id]: "cmp" },
          );
        }
        const par = node.p!;
        par.red = false;
        grand.red = true;
        snap(
          `Recolour: ${par.v} black, grandparent ${grand.v} red.`,
          [L.lineL],
          { [par.id]: "swap", [grand.id]: "swap" },
        );
        rotR(grand);
        snap(
          `Rotate right at ${grand.v}. ${par.v} is now above it, and the red-red violation is gone.`,
          [L.rotGrandR],
          { [par.id]: "swap", [grand.id]: "swap" },
        );
      } else {
        snap(
          `Uncle is black (or missing) and the parent is a right child: rotations are needed.`,
          [L.leftSide],
          { [parent.id]: "cmp", [grand.id]: "cmp" },
        );
        if (node === parent.l) {
          snap(
            `${node.v} is the left child of a right child (a "triangle"). Rotate right at the parent to straighten it.`,
            [L.triR, L.rotParentR],
            { [node.id]: "swap", [parent.id]: "swap" },
          );
          node = parent;
          rotR(node);
          snap(
            `After the right rotation the nodes form a line. Continue with ${node.v}.`,
            [L.rotParentR],
            { [node.id]: "cmp", [node.p!.id]: "cmp" },
          );
        }
        const par = node.p!;
        par.red = false;
        grand.red = true;
        snap(
          `Recolour: ${par.v} black, grandparent ${grand.v} red.`,
          [L.lineR],
          { [par.id]: "swap", [grand.id]: "swap" },
        );
        rotL(grand);
        snap(
          `Rotate left at ${grand.v}. ${par.v} is now above it, and the red-red violation is gone.`,
          [L.rotGrandL],
          { [par.id]: "swap", [grand.id]: "swap" },
        );
      }
    }
    if (root!.red) {
      root!.red = false;
      snap(`The root must be black: recolour ${root!.v}.`, [L.rootBlack], {
        [root!.id]: "swap",
      });
    }
    snap("Red-black properties hold again.", [L.rootBlack]);
  };

  /** insert: an ordinary BST insert of a red node, then fix. */
  const insert = (key: number) => {
    let parent: N | null = null;
    let cur = root;
    while (cur) {
      parent = cur;
      if (key === cur.v) {
        snap(
          `${key} is already in the tree. Duplicates are ignored.`,
          [L.dup],
          { [cur.id]: "found" },
        );
        return;
      }
      snap(
        `${key} ${key < cur.v ? "<" : ">"} ${cur.v}: go ${key < cur.v ? "left" : "right"}.`,
        [L.descend, L.insMove],
        { [cur.id]: "cmp" },
      );
      cur = key < cur.v ? cur.l : cur.r;
    }
    const node: N = {
      id: nextId++,
      v: key,
      red: true,
      l: null,
      r: null,
      p: parent,
    };
    if (!parent) root = node;
    else if (key < parent.v) parent.l = node;
    else parent.r = node;
    snap(
      parent
        ? `Attach ${key} as the ${key < parent.v ? "left" : "right"} child of ${parent.v}. New nodes are red.`
        : `The tree was empty: ${key} becomes the root.`,
      [
        L.newNode,
        parent ? (key < parent.v ? L.attachL : L.attachR) : L.attachRoot,
      ],
      { [node.id]: "new" },
    );
    fix(node);
  };

  /** search: walk down comparing. */
  const search = (key: number) => {
    let cur = root;
    if (!cur) {
      snap("The tree is empty.", [L.searchLoop]);
      return;
    }
    while (cur && cur.v !== key) {
      snap(
        `${key} ${key < cur.v ? "<" : ">"} ${cur.v}: go ${key < cur.v ? "left" : "right"}.`,
        [L.searchLoop, L.searchMove],
        { [cur.id]: "cmp" },
      );
      cur = key < cur.v ? cur.l : cur.r;
    }
    if (cur) snap(`Found ${key}.`, [L.searchRet], { [cur.id]: "found" });
    else
      snap(`Reached an empty spot: ${key} is not in the tree.`, [L.searchRet]);
  };

  ops.forEach((o, i) => {
    opIdx = i;
    if (o.op === "insert") insert(o.value!);
    else search(o.value!);
  });
  return steps;
}

export const redBlackPresets: Preset[] = [
  {
    name: "Ascending (rotations)",
    desc: "Sorted input forces left rotations and recolouring all the way.",
    input: seq(10, (i) => `insert ${(i + 1) * 10}`).join(", "),
  },
  {
    name: "Recolour only",
    desc: "Red uncles: the tree rebalances with recolouring, no rotation.",
    input:
      "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, insert 10, insert 5, search 40",
  },
  {
    name: "Triangle cases",
    desc: "Zig-zag inserts that need a double rotation.",
    input:
      "insert 30, insert 10, insert 20, insert 40, insert 50, insert 45, insert 35, insert 37",
  },
  {
    name: "Random order (25 keys)",
    desc: "A mix of every case.",
    input:
      seq(25, (i) => `insert ${(i * 37 + 11) % 97}`).join(", ") +
      ", search 11, search 12",
  },
];
