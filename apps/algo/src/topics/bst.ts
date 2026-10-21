import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks, TNode } from "../components/TreeViz";

export interface TreeState {
  root: TNode | null;
  marks: Marks;
}

interface N {
  id: number;
  v: number;
  l: N | null;
  r: N | null;
}

const height = (n: N | null): number =>
  n ? 1 + Math.max(height(n.l), height(n.r)) : 0;
const bf = (n: N) => height(n.l) - height(n.r);

function toT(n: N | null, avl: boolean): TNode | null {
  if (!n) return null;
  return {
    id: n.id,
    label: n.v,
    sub: avl ? `bf ${bf(n)}` : undefined,
    l: toT(n.l, avl),
    r: toT(n.r, avl),
  };
}

const bstCode = `class Node {
  constructor(public key: number, public left: Node | null = null, public right: Node | null = null) {}
}

function insert(node: Node | null, key: number): Node {
  if (!node) return new Node(key);
  if (key < node.key) node.left = insert(node.left, key);
  else if (key > node.key) node.right = insert(node.right, key);
  return node;
}

function search(node: Node | null, key: number): Node | null {
  while (node && node.key !== key) {
    node = key < node.key ? node.left : node.right;
  }
  return node;
}

function remove(node: Node | null, key: number): Node | null {
  if (!node) return null;
  if (key < node.key) node.left = remove(node.left, key);
  else if (key > node.key) node.right = remove(node.right, key);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.key = succ.key;
    node.right = remove(node.right, succ.key);
  }
  return node;
}`;

const avlCode = `class Node {
  height = 1;
  constructor(public key: number, public left: Node | null = null, public right: Node | null = null) {}
}

const h = (n: Node | null): number => (n ? n.height : 0);
const update = (n: Node) => { n.height = 1 + Math.max(h(n.left), h(n.right)); };
const balance = (n: Node) => h(n.left) - h(n.right);

function rotateRight(y: Node): Node {
  const x = y.left!;
  y.left = x.right;
  x.right = y;
  update(y); update(x);
  return x;
}

function rotateLeft(x: Node): Node {
  const y = x.right!;
  x.right = y.left;
  y.left = x;
  update(x); update(y);
  return y;
}

function rebalance(n: Node): Node {
  update(n);
  const b = balance(n);
  if (b > 1) {
    if (balance(n.left!) < 0) n.left = rotateLeft(n.left!);
    return rotateRight(n);
  }
  if (b < -1) {
    if (balance(n.right!) > 0) n.right = rotateRight(n.right!);
    return rotateLeft(n);
  }
  return n;
}

function insert(node: Node | null, key: number): Node {
  if (!node) return new Node(key);
  if (key < node.key) node.left = insert(node.left, key);
  else if (key > node.key) node.right = insert(node.right, key);
  else return node;
  return rebalance(node);
}

function search(node: Node | null, key: number): Node | null {
  while (node && node.key !== key) {
    node = key < node.key ? node.left : node.right;
  }
  return node;
}

function remove(node: Node | null, key: number): Node | null {
  if (!node) return null;
  if (key < node.key) node.left = remove(node.left, key);
  else if (key > node.key) node.right = remove(node.right, key);
  else {
    if (!node.left || !node.right) return node.left ?? node.right;
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.key = succ.key;
    node.right = remove(node.right, succ.key);
  }
  return rebalance(node);
}`;

export function makeTree(avl: boolean) {
  const code = avl ? avlCode : bstCode;
  const insFrom = lineOf(code, "function insert");
  const remFrom = lineOf(code, "function remove");
  const L = {
    insNew: lineOf(code, "if (!node) return new Node(key);"),
    insLeft: lineOf(code, "if (key < node.key) node.left = insert", insFrom),
    insRight: lineOf(
      code,
      "else if (key > node.key) node.right = insert",
      insFrom,
    ),
    insDup: lineOf(code, "return node;", insFrom),
    seqLoop: lineOf(code, "while (node && node.key !== key)"),
    seqMove: lineOf(code, "node = key < node.key ? node.left : node.right;"),
    seqRet: lineOf(code, "return node;", lineOf(code, "function search")),
    remNull: lineOf(code, "if (!node) return null;"),
    remLeft: lineOf(code, "if (key < node.key) node.left = remove", remFrom),
    remRight: lineOf(
      code,
      "else if (key > node.key) node.right = remove",
      remFrom,
    ),
    remFew: avl
      ? lineOf(code, "if (!node.left || !node.right)", remFrom)
      : lineOf(code, "if (!node.left) return node.right;"),
    remFewR: avl
      ? lineOf(code, "if (!node.left || !node.right)", remFrom)
      : lineOf(code, "if (!node.right) return node.left;"),
    remSucc: lineOf(code, "let succ = node.right;"),
    remSuccLoop: lineOf(code, "while (succ.left) succ = succ.left;"),
    remCopy: lineOf(code, "node.key = succ.key;"),
    remRec: lineOf(code, "node.right = remove(node.right, succ.key);"),
    check: lineOf(code, "const b = balance(n);"),
    ll: lineOf(code, "return rotateRight(n);"),
    lr: lineOf(code, "if (balance(n.left!) < 0)"),
    rr: lineOf(code, "return rotateLeft(n);"),
    rl: lineOf(code, "if (balance(n.right!) > 0)"),
  };

  const topic: Topic = {
    id: avl ? "avl" : "bst",
    title: avl ? "AVL Tree" : "Binary Search Tree",
    group: "Trees",
    blurb: avl
      ? "A self-balancing BST. After every change, balance factors are checked and rotations keep the height logarithmic."
      : "Smaller keys go left, larger go right. Search, insert and delete follow one path from the root.",
    syntax: "insert <n>, delete <n>, search <n>",
    code,
    complexity: avl
      ? [
          { op: "insert / delete / search", time: "O(log n) guaranteed" },
          { op: "rotation", time: "O(1)" },
        ]
      : [
          {
            op: "insert / delete / search",
            time: "O(log n) balanced, O(n) worst case (sorted input)",
          },
          { op: "in-order traversal", time: "O(n)" },
        ],
  };

  const steps = (ops: ParsedOp[]): Step<TreeState>[] => {
    let root: N | null = null;
    let nextId = 1;
    let opIdx = -1;
    const out: Step<TreeState>[] = [];
    const snap = (note: string, lines: number[], marks: Marks = {}) =>
      out.push({
        state: { root: toT(root, avl), marks },
        lines,
        note,
        op: opIdx,
      });
    const mk = (v: number): N => ({ id: nextId++, v, l: null, r: null });
    const replace = (parent: N | null, oldN: N, neu: N | null) => {
      if (!parent) root = neu;
      else if (parent.l === oldN) parent.l = neu;
      else parent.r = neu;
    };
    const rotR = (y: N): N => {
      const x = y.l!;
      y.l = x.r;
      x.r = y;
      return x;
    };
    const rotL = (x: N): N => {
      const y = x.r!;
      x.r = y.l;
      y.l = x;
      return y;
    };

    const retrace = (path: N[]) => {
      for (let i = path.length - 1; i >= 0; i--) {
        const n = path[i];
        const b = bf(n);
        const bad = Math.abs(b) > 1;
        snap(
          `Check ${n.v}: left height ${height(n.l)}, right height ${height(n.r)}, balance factor ${b}${bad ? ". Out of balance (|bf| > 1)." : ". Fine."}`,
          [L.check],
          { [n.id]: bad ? "del" : "ok" },
        );
        if (!bad) continue;
        const parent = path[i - 1] ?? null;
        let sub: N;
        let name: string;
        if (b > 1) {
          if (bf(n.l!) < 0) {
            snap(
              `Left-right case: ${n.l!.v} leans right. Rotate it left first.`,
              [L.lr],
              { [n.id]: "del", [n.l!.id]: "cmp" },
            );
            const lifted = rotL(n.l!);
            n.l = lifted;
            snap(
              `${lifted.v} lifted. Now it is a plain left-left case.`,
              [L.lr],
              { [lifted.id]: "swap", [n.id]: "del" },
            );
            name = "Left-right";
          } else name = "Left-left";
          sub = rotR(n);
          replace(parent, n, sub);
          snap(
            `${name} case: rotate right around ${n.v}. ${sub.v} becomes the subtree root.`,
            [L.ll],
            { [sub.id]: "swap", [n.id]: "swap" },
          );
        } else {
          if (bf(n.r!) > 0) {
            snap(
              `Right-left case: ${n.r!.v} leans left. Rotate it right first.`,
              [L.rl],
              { [n.id]: "del", [n.r!.id]: "cmp" },
            );
            const lifted = rotR(n.r!);
            n.r = lifted;
            snap(
              `${lifted.v} lifted. Now it is a plain right-right case.`,
              [L.rl],
              { [lifted.id]: "swap", [n.id]: "del" },
            );
            name = "Right-left";
          } else name = "Right-right";
          sub = rotL(n);
          replace(parent, n, sub);
          snap(
            `${name} case: rotate left around ${n.v}. ${sub.v} becomes the subtree root.`,
            [L.rr],
            { [sub.id]: "swap", [n.id]: "swap" },
          );
        }
        path[i] = sub;
      }
      snap("Every node on the path is balanced again.", [], {});
    };

    snap("Empty tree. Press play to run the operations.", []);

    const insert = (v: number) => {
      if (!root) {
        root = mk(v);
        snap(`The tree is empty, so ${v} becomes the root.`, [L.insNew], {
          [root.id]: "new",
        });
        return;
      }
      let cur: N = root;
      const path: N[] = [];
      for (;;) {
        path.push(cur);
        if (v === cur.v) {
          snap(
            `${v} is already in the tree. Duplicates are ignored.`,
            [L.insDup],
            { [cur.id]: "found" },
          );
          return;
        }
        const left: boolean = v < cur.v;
        snap(
          `${v} ${left ? "<" : ">"} ${cur.v}: go ${left ? "left" : "right"}.`,
          [left ? L.insLeft : L.insRight],
          { [cur.id]: "cmp" },
        );
        const child: N | null = left ? cur.l : cur.r;
        if (!child) {
          const n = mk(v);
          if (left) cur.l = n;
          else cur.r = n;
          snap(
            `Empty spot: attach ${v} as the ${left ? "left" : "right"} child of ${cur.v}.`,
            [L.insNew],
            { [n.id]: "new" },
          );
          break;
        }
        cur = child;
      }
      if (avl) retrace(path);
    };

    const search = (v: number) => {
      let cur = root;
      if (!cur) {
        snap("The tree is empty.", [L.seqLoop]);
        return;
      }
      while (cur && cur.v !== v) {
        const left: boolean = v < cur.v;
        snap(
          `${v} ${left ? "<" : ">"} ${cur.v}: go ${left ? "left" : "right"}.`,
          [L.seqMove],
          { [cur.id]: "cmp" },
        );
        cur = left ? cur.l : cur.r;
      }
      if (cur) snap(`Found ${v}.`, [L.seqRet], { [cur.id]: "found" });
      else
        snap(`Reached an empty spot: ${v} is not in the tree.`, [
          L.seqLoop,
          L.seqRet,
        ]);
    };

    const remove = (v: number) => {
      if (!root) {
        snap("The tree is empty, nothing to delete.", [L.remNull]);
        return;
      }
      let cur: N | null = root;
      let parent: N | null = null;
      const path: N[] = [];
      while (cur && cur.v !== v) {
        const left: boolean = v < cur.v;
        snap(
          `${v} ${left ? "<" : ">"} ${cur.v}: go ${left ? "left" : "right"}.`,
          [left ? L.remLeft : L.remRight],
          { [cur.id]: "cmp" },
        );
        path.push(cur);
        parent = cur;
        cur = left ? cur.l : cur.r;
      }
      if (!cur) {
        snap(`Reached an empty spot: ${v} is not in the tree.`, [L.remNull]);
        return;
      }
      snap(`Found ${v}.`, [L.remFew], { [cur.id]: "del" });
      if (!cur.l || !cur.r) {
        const child: N | null = cur.l ?? cur.r;
        snap(
          child
            ? `${v} has one child (${child.v}). Replace the node with that child.`
            : `${v} is a leaf. Just remove it.`,
          [cur.l ? L.remFewR : L.remFew],
          { [cur.id]: "del" },
        );
        replace(parent, cur, child);
        snap(`${v} removed.`, [L.remFew], child ? { [child.id]: "ok" } : {});
      } else {
        path.push(cur);
        let s: N = cur.r;
        snap(
          `${v} has two children. Find its in-order successor: the smallest key in the right subtree.`,
          [L.remSucc],
          { [cur.id]: "del", [s.id]: "cmp" },
        );
        while (s.l) {
          path.push(s);
          s = s.l;
          snap(`Keep going left: ${s.v}.`, [L.remSuccLoop], {
            [cur.id]: "del",
            [s.id]: "cmp",
          });
        }
        snap(`Successor is ${s.v}.`, [L.remSuccLoop], {
          [cur.id]: "del",
          [s.id]: "found",
        });
        const old = cur.v;
        cur.v = s.v;
        snap(`Copy ${s.v} into the node that held ${old}.`, [L.remCopy], {
          [cur.id]: "swap",
          [s.id]: "del",
        });
        replace(path[path.length - 1], s, s.r);
        snap(`Remove the successor's original node (${s.v}).`, [L.remRec], {
          [cur.id]: "ok",
        });
      }
      if (avl) retrace(path);
    };

    ops.forEach((o, i) => {
      opIdx = i;
      if (o.op === "insert") insert(o.value!);
      else if (o.op === "delete") remove(o.value!);
      else search(o.value!);
    });
    return out;
  };

  const vals = (n: number, f: (i: number) => number) =>
    seq(n, (i) => `insert ${f(i)}`);
  const presets: Preset[] = avl
    ? [
        {
          name: "Ascending (right-right)",
          desc: "Sorted input would make a BST a chain. AVL rotates left to stay balanced.",
          input: vals(9, (i) => (i + 1) * 10).join(", "),
        },
        {
          name: "Zig-zag (left-right, right-left)",
          desc: "Inserts that trigger the double rotations.",
          input:
            "insert 30, insert 10, insert 20, insert 40, insert 60, insert 50, insert 70, insert 55",
        },
        {
          name: "Delete forces rotations",
          desc: "Removing nodes unbalances the other side.",
          input:
            "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, insert 10, delete 80, delete 60, delete 70, search 40",
        },
        {
          name: "Stress test (45 ops)",
          desc: "Pseudo-random inserts, searches and deletes.",
          input: seq(45, (i) =>
            i % 6 === 5
              ? `delete ${((i - 3) * 29 + 7) % 60}`
              : i % 6 === 4
                ? `search ${(i * 29 + 7) % 60}`
                : `insert ${(i * 29 + 7) % 60}`,
          ).join(", "),
        },
      ]
    : [
        {
          name: "Basics",
          desc: "A balanced BST, a search, and the three delete cases.",
          input:
            "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, search 60, delete 20, delete 30, delete 50",
        },
        {
          name: "Edge cases",
          desc: "Duplicates, missing keys, empty tree, deleting the root.",
          input:
            "delete 5, search 5, insert 5, insert 5, delete 9, search 9, delete 5, insert 8, insert 3",
        },
        {
          name: "Sorted input (worst case)",
          desc: "Ascending inserts degenerate into a linked list. Compare with the AVL tree.",
          input: vals(9, (i) => (i + 1) * 10).join(", "),
        },
        {
          name: "Stress test (45 ops)",
          desc: "Pseudo-random inserts, searches and deletes.",
          input: seq(45, (i) =>
            i % 6 === 5
              ? `delete ${((i - 3) * 29 + 7) % 60}`
              : i % 6 === 4
                ? `search ${(i * 29 + 7) % 60}`
                : `insert ${(i * 29 + 7) % 60}`,
          ).join(", "),
        },
      ];

  return {
    topic,
    steps,
    presets,
    parse: (input: string) =>
      parseOps(input, { insert: 1, delete: 1, search: 1 }),
  };
}

export const bst = makeTree(false);
export const avl = makeTree(true);

export function inorder(t: TNode | null | undefined): number[] {
  return t ? [...inorder(t.l), Number(t.label), ...inorder(t.r)] : [];
}

export function treeHeight(t: TNode | null | undefined): number {
  return t ? 1 + Math.max(treeHeight(t.l), treeHeight(t.r)) : 0;
}

export function isAvlBalanced(t: TNode | null | undefined): boolean {
  if (!t) return true;
  return (
    Math.abs(treeHeight(t.l) - treeHeight(t.r)) <= 1 &&
    isAvlBalanced(t.l) &&
    isAvlBalanced(t.r)
  );
}
