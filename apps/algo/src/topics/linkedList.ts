/**
 * Singly linked list topic: the code shown to the user and the step generator for insertHead,
 * insertTail, insertAt, remove, find and reverse, showing every pointer move.
 */

import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";

/** A node in the picture: its id, its value and the id of its next node. */
export interface LLNode {
  id: number;
  val: number;
  next: number | null;
}

/**
 * One frame: the nodes in screen order, the head, the named pointers, the node marks and an
 * optional status line.
 */
export interface LLState {
  /** nodes in on-screen order */
  nodes: LLNode[];
  head: number | null;
  ptrs: { name: string; id: number | null }[];
  marks: Record<number, string>;
  /** optional status line, e.g. "size = 3" */
  info?: string;
}

const code = `class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}

class LinkedList {
  head: ListNode | null = null;

  insertHead(val: number) {
    this.head = new ListNode(val, this.head);
  }

  insertTail(val: number) {
    const node = new ListNode(val);
    if (!this.head) {
      this.head = node;
      return;
    }
    let cur = this.head;
    while (cur.next) cur = cur.next;
    cur.next = node;
  }

  insertAt(index: number, val: number) {
    if (index === 0) return this.insertHead(val);
    let cur = this.head;
    for (let i = 0; i < index - 1 && cur; i++) cur = cur.next;
    if (!cur) return;
    cur.next = new ListNode(val, cur.next);
  }

  remove(val: number) {
    if (!this.head) return;
    if (this.head.val === val) {
      this.head = this.head.next;
      return;
    }
    let cur = this.head;
    while (cur.next && cur.next.val !== val) cur = cur.next;
    if (cur.next) cur.next = cur.next.next;
  }

  find(val: number) {
    let cur = this.head;
    while (cur && cur.val !== val) cur = cur.next;
    return cur;
  }

  reverse() {
    let prev = null;
    let cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    this.head = prev;
  }
}`;

const L = {
  headNew: lineOf(code, "this.head = new ListNode(val, this.head)"),
  tailNew: lineOf(code, "const node = new ListNode(val)"),
  tailEmpty: lineOf(code, "if (!this.head) {"),
  tailEmptySet: lineOf(code, "this.head = node;"),
  tailCur: lineOf(code, "let cur = this.head;", lineOf(code, "insertTail")),
  tailWhile: lineOf(code, "while (cur.next) cur = cur.next;"),
  tailLink: lineOf(code, "cur.next = node;"),
  atZero: lineOf(code, "if (index === 0)"),
  atCur: lineOf(code, "let cur = this.head;", lineOf(code, "insertAt")),
  atFor: lineOf(code, "for (let i = 0; i < index - 1"),
  atGuard: lineOf(code, "if (!cur) return;"),
  atLink: lineOf(code, "cur.next = new ListNode(val, cur.next)"),
  rmEmpty: lineOf(code, "if (!this.head) return;"),
  rmHeadCheck: lineOf(code, "if (this.head.val === val)"),
  rmHeadMove: lineOf(code, "this.head = this.head.next;"),
  rmCur: lineOf(code, "let cur = this.head;", lineOf(code, "remove(")),
  rmWhile: lineOf(code, "while (cur.next && cur.next.val !== val)"),
  rmBypass: lineOf(code, "if (cur.next) cur.next = cur.next.next;"),
  findCur: lineOf(code, "let cur = this.head;", lineOf(code, "find(")),
  findWhile: lineOf(code, "while (cur && cur.val !== val)"),
  findRet: lineOf(code, "return cur;"),
  revPrev: lineOf(code, "let prev = null;"),
  revCur: lineOf(code, "let cur = this.head;", lineOf(code, "reverse")),
  revNext: lineOf(code, "const next = cur.next;"),
  revFlip: lineOf(code, "cur.next = prev;"),
  revAdv: lineOf(code, "prev = cur;"),
  revHead: lineOf(code, "this.head = prev;"),
};

export const linkedListTopic: Topic = {
  id: "linked-list",
  title: "Linked List",
  group: "Linked List",
  blurb:
    "Nodes joined by pointers. See every pointer move as you insert, delete, search and reverse.",
  syntax:
    "insertHead <n>, insertTail <n>, insertAt <index> <n>, remove <n>, find <n>, reverse",
  code,
  complexity: [
    { op: "insertHead", time: "O(1)" },
    { op: "insertTail / insertAt / remove / find", time: "O(n)" },
    { op: "reverse", time: "O(n) time, O(1) space" },
  ],
};

/** Parses linked-list operations. */
export const parseLinkedList = (input: string) =>
  parseOps(input, {
    insertHead: 1,
    insertTail: 1,
    insertAt: 2,
    remove: 1,
    find: 1,
    reverse: 0,
  });

/** Runs the operations and records every pointer change. */
export function linkedListSteps(ops: ParsedOp[]): Step<LLState>[] {
  let nextId = 1;
  let pos: { id: number; val: number }[] = [];
  const next = new Map<number, number | null>();
  let head: number | null = null;
  let opIdx = -1;
  const steps: Step<LLState>[] = [];

  /** Value stored in the node with this id. */
  const val = (id: number) => pos.find((p) => p.id === id)!.val;
  /** Id of the node after this one (null at the end). */
  const nx = (id: number) => next.get(id) ?? null;
  /** A named pointer (cur, prev or next) pointing at a node or at null. */
  const ptr = (name: string, id: number | null) => ({ name, id });
  /** Records a frame of the list. */
  const snap = (
    note: string,
    lines: number[],
    marks: Record<number, string> = {},
    ptrs: { name: string; id: number | null }[] = [],
  ) =>
    steps.push({
      state: {
        nodes: pos.map((n) => ({ id: n.id, val: n.val, next: nx(n.id) })),
        head,
        ptrs,
        marks,
      },
      lines,
      note,
      op: opIdx,
    });
  /** Node ids in list order, following the next pointers from the head. */
  const listOrder = () => {
    const ids: number[] = [];
    for (let c = head; c !== null && ids.length <= pos.length; c = nx(c))
      ids.push(c);
    return ids;
  };

  snap(
    "Empty list: head points to nothing. Press play to run the operations.",
    [],
  );

  /** insertHead: create a node pointing at the old head, then move the head. */
  const insertHead = (v: number) => {
    const id = nextId++;
    pos = [{ id, val: v }, ...pos];
    next.set(id, head);
    snap(`Create node ${v} and point it at the current head.`, [L.headNew], {
      [id]: "new",
    });
    head = id;
    snap(`Move head to the new node. ${v} is now first.`, [L.headNew], {
      [id]: "ok",
    });
  };

  /** insertTail: create the node, walk to the last node with cur, then link it. */
  const insertTail = (v: number) => {
    const id = nextId++;
    if (head === null) {
      pos = [{ id, val: v }];
      next.set(id, null);
      head = id;
      snap(
        `The list is empty, so the new node ${v} becomes the head.`,
        [L.tailEmpty, L.tailEmptySet],
        { [id]: "new" },
      );
      return;
    }
    pos = [...pos, { id, val: v }];
    next.set(id, null);
    snap(`Create node ${v}. Nothing points to it yet.`, [L.tailNew], {
      [id]: "new",
    });
    let cur = head;
    snap("Start cur at the head.", [L.tailCur], { [cur]: "cmp" }, [
      ptr("cur", cur),
    ]);
    while (nx(cur) !== null) {
      cur = nx(cur)!;
      snap(
        `cur.next exists, so step forward to ${val(cur)}.`,
        [L.tailWhile],
        { [cur]: "cmp" },
        [ptr("cur", cur)],
      );
    }
    next.set(cur, id);
    snap(
      `cur is the last node. Set cur.next to the new node.`,
      [L.tailLink],
      { [id]: "ok" },
      [ptr("cur", cur)],
    );
  };

  /** insertAt: walk to the node before the index, then splice the new node in. */
  const insertAt = (i: number, v: number) => {
    if (i < 0 || i > pos.length) {
      snap(`Index ${i} is outside 0..${pos.length}, so nothing is inserted.`, [
        L.atGuard,
      ]);
      return;
    }
    if (i === 0) {
      snap("Index 0 means insert at the head.", [L.atZero]);
      insertHead(v);
      return;
    }
    let cur = head!;
    snap(
      "Walk to the node just before the target index. Start at the head.",
      [L.atCur],
      { [cur]: "cmp" },
      [ptr("cur", cur)],
    );
    for (let k = 0; k < i - 1; k++) {
      cur = nx(cur)!;
      snap(
        `Step ${k + 1} of ${i - 1}: move cur to ${val(cur)}.`,
        [L.atFor],
        { [cur]: "cmp" },
        [ptr("cur", cur)],
      );
    }
    const id = nextId++;
    const at = pos.findIndex((p) => p.id === cur) + 1;
    pos = [...pos.slice(0, at), { id, val: v }, ...pos.slice(at)];
    next.set(id, nx(cur));
    snap(
      `Create node ${v} and point it at cur.next.`,
      [L.atLink],
      { [id]: "new" },
      [ptr("cur", cur)],
    );
    next.set(cur, id);
    snap(
      `Point cur.next at the new node. ${v} now sits at index ${i}.`,
      [L.atLink],
      { [id]: "ok" },
      [ptr("cur", cur)],
    );
  };

  /** remove: handles removing the head, otherwise walks with cur and bypasses the node. */
  const remove = (v: number) => {
    if (head === null) {
      snap("The list is empty, nothing to remove.", [L.rmEmpty]);
      return;
    }
    if (val(head) === v) {
      const old = head;
      snap(
        `The head holds ${v}, so it is the node to remove.`,
        [L.rmHeadCheck],
        { [old]: "del" },
      );
      head = nx(old);
      snap(
        "Move head to head.next. The old head is now unreachable.",
        [L.rmHeadMove],
        { [old]: "del" },
      );
      pos = pos.filter((p) => p.id !== old);
      next.delete(old);
      snap("The unreachable node is freed.", [L.rmHeadMove]);
      return;
    }
    let cur = head;
    snap(
      "Look one node ahead of cur. Start at the head.",
      [L.rmCur],
      { [cur]: "cmp" },
      [ptr("cur", cur)],
    );
    while (nx(cur) !== null && val(nx(cur)!) !== v) {
      const ahead = nx(cur)!;
      snap(
        `cur.next is ${val(ahead)}, not ${v}. Move on.`,
        [L.rmWhile],
        { [ahead]: "cmp" },
        [ptr("cur", cur)],
      );
      cur = ahead;
    }
    const target = nx(cur);
    if (target === null) {
      snap(
        `Reached the end without finding ${v}. Nothing removed.`,
        [L.rmWhile, L.rmBypass],
        {},
        [ptr("cur", cur)],
      );
      return;
    }
    snap(`Found ${v} right after cur.`, [L.rmWhile], { [target]: "del" }, [
      ptr("cur", cur),
    ]);
    next.set(cur, nx(target));
    snap(
      "Bypass it: cur.next = cur.next.next. The node is now unreachable.",
      [L.rmBypass],
      { [target]: "del" },
      [ptr("cur", cur)],
    );
    pos = pos.filter((p) => p.id !== target);
    next.delete(target);
    snap("The unreachable node is freed.", [L.rmBypass], {}, [ptr("cur", cur)]);
  };

  /** find: walk from the head comparing values. */
  const find = (v: number) => {
    let cur = head;
    snap(
      "Start at the head.",
      [L.findCur],
      cur === null ? {} : { [cur]: "cmp" },
      [ptr("cur", cur)],
    );
    while (cur !== null && val(cur) !== v) {
      snap(
        `${val(cur)} is not ${v}. Move to the next node.`,
        [L.findWhile],
        { [cur]: "cmp" },
        [ptr("cur", cur)],
      );
      cur = nx(cur);
    }
    if (cur === null)
      snap(
        `Fell off the end: ${v} is not in the list (returns null).`,
        [L.findWhile, L.findRet],
        {},
        [ptr("cur", null)],
      );
    else
      snap(`Found ${v}.`, [L.findRet], { [cur]: "found" }, [ptr("cur", cur)]);
  };

  /** reverse: flip each next pointer using prev, cur and next, one node at a time. */
  const reverse = () => {
    if (head === null) {
      snap("Nothing to reverse in an empty list.", [L.revPrev]);
      return;
    }
    let prev: number | null = null;
    let cur: number | null = head;
    snap(
      "prev starts as null, cur at the head.",
      [L.revPrev, L.revCur],
      { [cur]: "cmp" },
      [ptr("prev", null), ptr("cur", cur)],
    );
    while (cur !== null) {
      const n: number | null = nx(cur);
      snap(
        `Save cur.next (${n === null ? "null" : val(n)}) so we do not lose the rest of the list.`,
        [L.revNext],
        { [cur]: "cmp" },
        [ptr("prev", prev), ptr("cur", cur), ptr("next", n)],
      );
      next.set(cur, prev);
      snap(
        "Flip the pointer: cur.next now points backwards at prev.",
        [L.revFlip],
        { [cur]: "new" },
        [ptr("prev", prev), ptr("cur", cur), ptr("next", n)],
      );
      prev = cur;
      cur = n;
      snap(
        "Advance: prev takes cur, cur takes the saved next.",
        [L.revAdv],
        prev === null ? {} : { [prev]: "ok" },
        [ptr("prev", prev), ptr("cur", cur)],
      );
    }
    head = prev;
    snap(
      "cur fell off the end, so prev is the new head.",
      [L.revHead],
      head === null ? {} : { [head]: "ok" },
    );
    pos = listOrder().map((id) => ({ id, val: val(id) }));
    snap("Same list, redrawn in its new order.", []);
  };

  ops.forEach((o, i) => {
    opIdx = i;
    if (o.op === "insertHead") insertHead(o.value!);
    else if (o.op === "insertTail") insertTail(o.value!);
    else if (o.op === "insertAt") insertAt(o.args![0], o.args![1]);
    else if (o.op === "remove") remove(o.value!);
    else if (o.op === "find") find(o.value!);
    else reverse();
  });
  return steps;
}

export const linkedListPresets: Preset[] = [
  {
    name: "Basics",
    desc: "Build a list, insert in the middle, search, delete, reverse.",
    input:
      "insertTail 10, insertTail 20, insertTail 30, insertHead 5, insertAt 2 15, find 20, remove 10, reverse",
  },
  {
    name: "Edge cases",
    desc: "Empty list, bad index, missing value, delete head and tail.",
    input:
      "remove 1, find 1, reverse, insertAt 3 9, insertAt 0 4, insertTail 8, remove 4, remove 8, remove 99, find 8",
  },
  {
    name: "Build and reverse (20 ops)",
    desc: "Ten tail inserts, then reverse twice to see pointers flip back.",
    input: [
      ...seq(10, (i) => `insertTail ${(i * 13 + 7) % 90}`),
      "reverse",
      "find 7",
      "remove 20",
      "reverse",
      "insertHead 99",
      "insertAt 5 55",
      "find 55",
      "remove 99",
    ].join(", "),
  },
  {
    name: "Heavy mix (45 ops)",
    desc: "Inserts at every position with deletes and searches.",
    input: seq(45, (i) =>
      i % 9 === 8
        ? "reverse"
        : i % 7 === 6
          ? `remove ${((i - 3) * 11 + 5) % 80}`
          : i % 5 === 4
            ? `find ${(i * 11 + 5) % 80}`
            : i % 3 === 2
              ? `insertAt ${i % 4} ${(i * 11 + 5) % 80}`
              : i % 2 === 0
                ? `insertTail ${(i * 11 + 5) % 80}`
                : `insertHead ${(i * 11 + 5) % 80}`,
    ).join(", "),
  },
];

/** values in list order, for tests */
export function listValues(s: LLState): number[] {
  const byId = new Map(s.nodes.map((n) => [n.id, n]));
  const out: number[] = [];
  for (
    let c = s.head;
    c !== null && out.length <= s.nodes.length;
    c = byId.get(c)?.next ?? null
  )
    out.push(byId.get(c)!.val);
  return out;
}
