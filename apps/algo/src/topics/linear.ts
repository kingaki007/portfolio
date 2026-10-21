/**
 * Stack and queue topics, each in two implementations: a fixed-capacity array that doubles when
 * full, and a linked list. The code shown never uses built-in push, pop or shift. Holds the code
 * strings, parsers, step generators and presets.
 */

import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { LLState } from "./linkedList";

/**
 * One frame of an array-based stack or queue: capacity, cells, pointers, marks, the old array
 * while growing and a status line.
 */
export interface SlotsState {
  cap: number;
  cells: (number | null)[];
  ptrs: { name: string; idx: number }[];
  marks: Record<number, string>;
  /** the array being replaced while it grows */
  old: { cap: number; cells: (number | null)[] } | null;
  oldMarks: Record<number, string>;
  info: string;
}

/* ============================================================
   Code shown to the user. These are complete, runnable classes
   that use no built-in array methods (no push/pop/shift/slice):
   only indexing, a length counter and plain loops.
   ============================================================ */

const arrayStackCode = `class ArrayStack<T> {
  private data: (T | undefined)[];
  private capacity: number;
  private top = -1; // index of the top element, -1 means empty

  constructor(capacity = 4) {
    this.capacity = capacity;
    this.data = new Array(capacity);
  }

  size(): number {
    return this.top + 1;
  }

  isEmpty(): boolean {
    return this.top === -1;
  }

  isFull(): boolean {
    return this.top === this.capacity - 1;
  }

  push(value: T): void {
    if (this.isFull()) this.grow();
    this.top = this.top + 1;
    this.data[this.top] = value;
  }

  pop(): T | undefined {
    if (this.isEmpty()) return undefined;
    const value = this.data[this.top];
    this.data[this.top] = undefined;
    this.top = this.top - 1;
    return value;
  }

  peek(): T | undefined {
    if (this.isEmpty()) return undefined;
    return this.data[this.top];
  }

  clear(): void {
    for (let i = 0; i <= this.top; i++) this.data[i] = undefined;
    this.top = -1;
  }

  private grow(): void {
    const bigger = new Array<T | undefined>(this.capacity * 2);
    for (let i = 0; i <= this.top; i++) bigger[i] = this.data[i];
    this.data = bigger;
    this.capacity = this.capacity * 2;
  }
}`;

const arrayQueueCode = `class ArrayQueue<T> {
  private data: (T | undefined)[];
  private capacity: number;
  private front = 0; // index of the first element
  private back = -1; // index of the last element
  private count = 0;

  constructor(capacity = 4) {
    this.capacity = capacity;
    this.data = new Array(capacity);
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  enqueue(value: T): void {
    if (this.isFull()) this.grow();
    this.back = (this.back + 1) % this.capacity;
    this.data[this.back] = value;
    this.count = this.count + 1;
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const value = this.data[this.front];
    this.data[this.front] = undefined;
    this.front = (this.front + 1) % this.capacity;
    this.count = this.count - 1;
    return value;
  }

  peek(): T | undefined {
    if (this.isEmpty()) return undefined;
    return this.data[this.front];
  }

  clear(): void {
    for (let i = 0; i < this.count; i++) {
      this.data[(this.front + i) % this.capacity] = undefined;
    }
    this.front = 0;
    this.back = -1;
    this.count = 0;
  }

  private grow(): void {
    const bigger = new Array<T | undefined>(this.capacity * 2);
    for (let i = 0; i < this.count; i++) {
      bigger[i] = this.data[(this.front + i) % this.capacity];
    }
    this.data = bigger;
    this.capacity = this.capacity * 2;
    this.front = 0;
    this.back = this.count - 1;
  }
}`;

const linkedStackCode = `class StackNode<T> {
  constructor(public value: T, public next: StackNode<T> | null = null) {}
}

class LinkedStack<T> {
  private top: StackNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.top === null;
  }

  push(value: T): void {
    this.top = new StackNode(value, this.top);
    this.count = this.count + 1;
  }

  pop(): T | undefined {
    if (this.top === null) return undefined;
    const value = this.top.value;
    this.top = this.top.next;
    this.count = this.count - 1;
    return value;
  }

  peek(): T | undefined {
    if (this.top === null) return undefined;
    return this.top.value;
  }

  clear(): void {
    this.top = null;
    this.count = 0;
  }
}`;

const linkedQueueCode = `class QueueNode<T> {
  constructor(public value: T, public next: QueueNode<T> | null = null) {}
}

class LinkedQueue<T> {
  private front: QueueNode<T> | null = null;
  private back: QueueNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.front === null;
  }

  enqueue(value: T): void {
    const node = new QueueNode(value);
    if (this.back === null) {
      this.front = node;
      this.back = node;
    } else {
      this.back.next = node;
      this.back = node;
    }
    this.count = this.count + 1;
  }

  dequeue(): T | undefined {
    if (this.front === null) return undefined;
    const value = this.front.value;
    this.front = this.front.next;
    if (this.front === null) this.back = null;
    this.count = this.count - 1;
    return value;
  }

  peek(): T | undefined {
    if (this.front === null) return undefined;
    return this.front.value;
  }

  clear(): void {
    this.front = null;
    this.back = null;
    this.count = 0;
  }
}`;

/** exported so tests can compile and run exactly what the user sees */
export const linearCode = {
  arrayStackCode,
  arrayQueueCode,
  linkedStackCode,
  linkedQueueCode,
};

/* ---------------- topics ---------------- */

export const arrayStackTopic: Topic = {
  id: "stack-array",
  title: "Stack (array)",
  group: "Stack",
  blurb:
    "Last in, first out, built on a fixed array with a `top` index. No built-in push or pop: the code moves `top` itself and doubles the array when it fills.",
  syntax: "push <n>, pop, peek, size, isEmpty, isFull, clear",
  code: arrayStackCode,
  complexity: [
    { op: "push", time: "O(1) amortised, O(n) on the step that grows" },
    { op: "pop / peek / size / isEmpty / isFull", time: "O(1)" },
    { op: "clear", time: "O(n)" },
  ],
};

export const linkedStackTopic: Topic = {
  id: "stack-linked",
  title: "Stack (linked list)",
  group: "Stack",
  blurb:
    "Last in, first out, built from nodes. `top` is the head of the list, so push and pop only touch one pointer and there is never a resize.",
  syntax: "push <n>, pop, peek, size, isEmpty, clear",
  code: linkedStackCode,
  complexity: [
    { op: "push / pop / peek / size / isEmpty", time: "O(1)" },
    { op: "clear", time: "O(1) here (nodes are garbage collected)" },
    { op: "space", time: "one node (value + pointer) per element" },
  ],
};

export const arrayQueueTopic: Topic = {
  id: "queue-array",
  title: "Queue (circular array)",
  group: "Queue",
  blurb:
    "First in, first out on a circular buffer. `front` and `back` indices wrap around with modulo so dequeue never shifts elements.",
  syntax: "enqueue <n>, dequeue, peek, size, isEmpty, isFull, clear",
  code: arrayQueueCode,
  complexity: [
    { op: "enqueue", time: "O(1) amortised, O(n) on the step that grows" },
    { op: "dequeue / peek / size / isEmpty / isFull", time: "O(1)" },
    { op: "clear", time: "O(n)" },
  ],
};

export const linkedQueueTopic: Topic = {
  id: "queue-linked",
  title: "Queue (linked list)",
  group: "Queue",
  blurb:
    "First in, first out from nodes, with both a `front` and a `back` pointer so enqueue and dequeue are O(1) without any shifting.",
  syntax: "enqueue <n>, dequeue, peek, size, isEmpty, clear",
  code: linkedQueueCode,
  complexity: [
    { op: "enqueue / dequeue / peek / size / isEmpty", time: "O(1)" },
    { op: "clear", time: "O(1) here" },
    { op: "space", time: "one node (value + pointer) per element" },
  ],
};

/** Parses array-stack operations (push, pop, peek, size, isEmpty, isFull, clear). */
export const parseArrayStack = (i: string) =>
  parseOps(i, {
    push: 1,
    pop: 0,
    peek: 0,
    size: 0,
    isEmpty: 0,
    isFull: 0,
    clear: 0,
  });
/** Parses linked-stack operations (the same, without isFull). */
export const parseLinkedStack = (i: string) =>
  parseOps(i, { push: 1, pop: 0, peek: 0, size: 0, isEmpty: 0, clear: 0 });
/** Parses array-queue operations (enqueue, dequeue, peek, size, isEmpty, isFull, clear). */
export const parseArrayQueue = (i: string) =>
  parseOps(i, {
    enqueue: 1,
    dequeue: 0,
    peek: 0,
    size: 0,
    isEmpty: 0,
    isFull: 0,
    clear: 0,
  });
/** Parses linked-queue operations (the same, without isFull). */
export const parseLinkedQueue = (i: string) =>
  parseOps(i, {
    enqueue: 1,
    dequeue: 0,
    peek: 0,
    size: 0,
    isEmpty: 0,
    clear: 0,
  });

/* ---------------- array stack ---------------- */

const SL = {
  pushFull: lineOf(arrayStackCode, "if (this.isFull()) this.grow();"),
  pushTop: lineOf(arrayStackCode, "this.top = this.top + 1;"),
  pushStore: lineOf(arrayStackCode, "this.data[this.top] = value;"),
  popEmpty: lineOf(
    arrayStackCode,
    "if (this.isEmpty()) return undefined;",
    lineOf(arrayStackCode, "pop()"),
  ),
  popRead: lineOf(arrayStackCode, "const value = this.data[this.top];"),
  popClear: lineOf(arrayStackCode, "this.data[this.top] = undefined;"),
  popTop: lineOf(arrayStackCode, "this.top = this.top - 1;"),
  peekEmpty: lineOf(
    arrayStackCode,
    "if (this.isEmpty()) return undefined;",
    lineOf(arrayStackCode, "peek()"),
  ),
  peekRet: lineOf(arrayStackCode, "return this.data[this.top];"),
  size: lineOf(arrayStackCode, "return this.top + 1;"),
  isEmpty: lineOf(arrayStackCode, "return this.top === -1;"),
  isFull: lineOf(arrayStackCode, "return this.top === this.capacity - 1;"),
  clearLoop: lineOf(
    arrayStackCode,
    "for (let i = 0; i <= this.top; i++) this.data[i] = undefined;",
  ),
  clearTop: lineOf(
    arrayStackCode,
    "this.top = -1;",
    lineOf(arrayStackCode, "clear()"),
  ),
  growAlloc: lineOf(arrayStackCode, "const bigger = new Array"),
  growCopy: lineOf(
    arrayStackCode,
    "for (let i = 0; i <= this.top; i++) bigger[i]",
  ),
  growSwap: lineOf(arrayStackCode, "this.data = bigger;"),
};

/** Animates the array stack: the top index moves, and the array doubles when it is full. */
export function arrayStackSteps(ops: ParsedOp[]): Step<SlotsState>[] {
  let cap = 4;
  let data: (number | null)[] = Array(cap).fill(null);
  let top = -1;
  let old: { cap: number; cells: (number | null)[] } | null = null;
  let opIdx = -1;
  const steps: Step<SlotsState>[] = [];
  /** Records a frame of the array with the pointers and the status line. */
  const snap = (
    note: string,
    lines: number[],
    marks: Record<number, string> = {},
    oldMarks: Record<number, string> = {},
  ) =>
    steps.push({
      state: {
        cap,
        cells: [...data],
        ptrs: top >= 0 ? [{ name: "top", idx: top }] : [],
        marks,
        old: old ? { cap: old.cap, cells: [...old.cells] } : null,
        oldMarks,
        info: `top = ${top} · size = ${top + 1} · capacity = ${cap}`,
      },
      lines,
      note,
      op: opIdx,
    });

  snap(
    "Empty stack: capacity 4, top = -1 (no element yet). Press play to run the operations.",
    [],
  );

  /** Doubles the capacity: allocates a bigger array and copies the elements across. */
  const grow = () => {
    const prev = { cap, cells: [...data] };
    cap *= 2;
    data = Array(cap).fill(null);
    old = prev;
    snap(`Allocate a bigger array with ${cap} slots (double the capacity).`, [
      SL.growAlloc,
    ]);
    for (let i = 0; i <= top; i++) {
      data[i] = prev.cells[i];
      snap(
        `Copy slot ${i} (${prev.cells[i]}) into the new array.`,
        [SL.growCopy],
        { [i]: "new" },
        { [i]: "cmp" },
      );
    }
    old = null;
    snap(
      `Swap in the bigger array and update capacity to ${cap}. The old array is released.`,
      [SL.growSwap],
    );
  };

  ops.forEach((o, k) => {
    opIdx = k;
    if (o.op === "push") {
      const v = o.value!;
      const full = top === cap - 1;
      snap(
        `push(${v}): isFull() asks top (${top}) === capacity - 1 (${cap - 1}), which is ${full}.`,
        [SL.pushFull],
      );
      if (full) grow();
      top += 1;
      snap(`top = top + 1, so top is now ${top}. The slot is still empty.`, [
        SL.pushTop,
      ]);
      data[top] = v;
      snap(`data[${top}] = ${v}. Size is ${top + 1}.`, [SL.pushStore], {
        [top]: "new",
      });
    } else if (o.op === "pop") {
      if (top === -1) {
        snap("pop(): isEmpty() is true (top === -1), so return undefined.", [
          SL.popEmpty,
        ]);
        return;
      }
      const v = data[top];
      snap(
        `value = data[top] = ${v}. This is what pop returns.`,
        [SL.popRead],
        { [top]: "found" },
      );
      data[top] = null;
      snap(
        `data[${top}] = undefined clears the slot so the old value is not kept alive.`,
        [SL.popClear],
        { [top]: "del" },
      );
      top -= 1;
      snap(`top = top - 1, so top is now ${top}. Returned ${v}.`, [SL.popTop]);
    } else if (o.op === "peek") {
      if (top === -1)
        snap("peek(): the stack is empty, return undefined.", [SL.peekEmpty]);
      else
        snap(
          `peek(): return data[top] = ${data[top]}. Nothing is removed.`,
          [SL.peekRet],
          { [top]: "found" },
        );
    } else if (o.op === "size")
      snap(`size() returns top + 1 = ${top + 1}.`, [SL.size]);
    else if (o.op === "isEmpty")
      snap(`isEmpty() returns top === -1, which is ${top === -1}.`, [
        SL.isEmpty,
      ]);
    else if (o.op === "isFull")
      snap(
        `isFull() returns top === capacity - 1 (${top} === ${cap - 1}), which is ${top === cap - 1}.`,
        [SL.isFull],
      );
    else {
      for (let i = 0; i <= top; i++) data[i] = null;
      snap(`clear(): every slot from 0 to top is set to undefined.`, [
        SL.clearLoop,
      ]);
      top = -1;
      snap("top = -1. The stack is empty again (capacity is unchanged).", [
        SL.clearTop,
      ]);
    }
  });
  return steps;
}

/* ---------------- array queue ---------------- */

const QL = {
  enFull: lineOf(arrayQueueCode, "if (this.isFull()) this.grow();"),
  enBack: lineOf(
    arrayQueueCode,
    "this.back = (this.back + 1) % this.capacity;",
  ),
  enStore: lineOf(arrayQueueCode, "this.data[this.back] = value;"),
  enCount: lineOf(arrayQueueCode, "this.count = this.count + 1;"),
  deEmpty: lineOf(
    arrayQueueCode,
    "if (this.isEmpty()) return undefined;",
    lineOf(arrayQueueCode, "dequeue()"),
  ),
  deRead: lineOf(arrayQueueCode, "const value = this.data[this.front];"),
  deClear: lineOf(arrayQueueCode, "this.data[this.front] = undefined;"),
  deFront: lineOf(
    arrayQueueCode,
    "this.front = (this.front + 1) % this.capacity;",
  ),
  deCount: lineOf(arrayQueueCode, "this.count = this.count - 1;"),
  peekEmpty: lineOf(
    arrayQueueCode,
    "if (this.isEmpty()) return undefined;",
    lineOf(arrayQueueCode, "peek()"),
  ),
  peekRet: lineOf(arrayQueueCode, "return this.data[this.front];"),
  size: lineOf(arrayQueueCode, "return this.count;"),
  isEmpty: lineOf(arrayQueueCode, "return this.count === 0;"),
  isFull: lineOf(arrayQueueCode, "return this.count === this.capacity;"),
  clearLoop: lineOf(
    arrayQueueCode,
    "this.data[(this.front + i) % this.capacity] = undefined;",
  ),
  clearReset: lineOf(
    arrayQueueCode,
    "this.front = 0;",
    lineOf(arrayQueueCode, "clear()"),
  ),
  growAlloc: lineOf(arrayQueueCode, "const bigger = new Array"),
  growCopy: lineOf(
    arrayQueueCode,
    "bigger[i] = this.data[(this.front + i) % this.capacity];",
  ),
  growSwap: lineOf(arrayQueueCode, "this.data = bigger;"),
  growFront: lineOf(arrayQueueCode, "this.back = this.count - 1;"),
};

/** Animates the circular array queue: front and back wrap around with modulo. */
export function arrayQueueSteps(ops: ParsedOp[]): Step<SlotsState>[] {
  let cap = 4;
  let data: (number | null)[] = Array(cap).fill(null);
  let front = 0;
  let back = -1;
  let count = 0;
  let old: { cap: number; cells: (number | null)[] } | null = null;
  let opIdx = -1;
  const steps: Step<SlotsState>[] = [];
  /** Records a frame with the front and back pointers. */
  const snap = (
    note: string,
    lines: number[],
    marks: Record<number, string> = {},
    oldMarks: Record<number, string> = {},
  ) => {
    const ptrs: { name: string; idx: number }[] = [
      { name: "front", idx: front },
    ];
    if (back >= 0 && count > 0) ptrs.push({ name: "back", idx: back });
    steps.push({
      state: {
        cap,
        cells: [...data],
        ptrs,
        marks,
        old: old ? { cap: old.cap, cells: [...old.cells] } : null,
        oldMarks,
        info: `front = ${front} · back = ${back} · size = ${count} · capacity = ${cap}`,
      },
      lines,
      note,
      op: opIdx,
    });
  };

  snap(
    "Empty queue: capacity 4, front = 0, back = -1. Press play to run the operations.",
    [],
  );

  /** Doubles the capacity, copying elements in queue order so that front goes back to 0. */
  const grow = () => {
    const prev = { cap, cells: [...data] };
    const oldFront = front;
    cap *= 2;
    data = Array(cap).fill(null);
    old = prev;
    snap(`Allocate a bigger array with ${cap} slots.`, [QL.growAlloc]);
    for (let i = 0; i < count; i++) {
      const from = (oldFront + i) % prev.cap;
      data[i] = prev.cells[from];
      snap(
        `Copy element ${i} in queue order: old slot ${from} goes to new slot ${i}.`,
        [QL.growCopy],
        { [i]: "new" },
        { [from]: "cmp" },
      );
    }
    old = null;
    front = 0;
    snap(
      `Swap in the bigger array, capacity is ${cap}. front goes back to 0.`,
      [QL.growSwap],
    );
    back = count - 1;
    snap(
      `back = count - 1 = ${back}. The elements are now stored in order from index 0.`,
      [QL.growFront],
    );
  };

  ops.forEach((o, k) => {
    opIdx = k;
    if (o.op === "enqueue") {
      const v = o.value!;
      const full = count === cap;
      snap(
        `enqueue(${v}): isFull() asks count (${count}) === capacity (${cap}), which is ${full}.`,
        [QL.enFull],
      );
      if (full) grow();
      back = (back + 1) % cap;
      snap(
        `back = (back + 1) % capacity = ${back}.${back === 0 && count > 0 ? " It wrapped around to the start." : ""}`,
        [QL.enBack],
      );
      data[back] = v;
      snap(`data[${back}] = ${v}.`, [QL.enStore], { [back]: "new" });
      count += 1;
      snap(`count = count + 1 = ${count}.`, [QL.enCount]);
    } else if (o.op === "dequeue") {
      if (count === 0) {
        snap("dequeue(): isEmpty() is true, return undefined.", [QL.deEmpty]);
        return;
      }
      const v = data[front];
      snap(
        `value = data[front] = ${v}. The front element is what dequeue returns.`,
        [QL.deRead],
        { [front]: "found" },
      );
      data[front] = null;
      snap(`data[${front}] = undefined clears the slot.`, [QL.deClear], {
        [front]: "del",
      });
      front = (front + 1) % cap;
      snap(
        `front = (front + 1) % capacity = ${front}. Nothing is shifted: only the index moves.`,
        [QL.deFront],
      );
      count -= 1;
      snap(`count = count - 1 = ${count}. Returned ${v}.`, [QL.deCount]);
    } else if (o.op === "peek") {
      if (count === 0)
        snap("peek(): the queue is empty, return undefined.", [QL.peekEmpty]);
      else
        snap(
          `peek(): return data[front] = ${data[front]}. Nothing is removed.`,
          [QL.peekRet],
          { [front]: "found" },
        );
    } else if (o.op === "size")
      snap(`size() returns count = ${count}.`, [QL.size]);
    else if (o.op === "isEmpty")
      snap(`isEmpty() returns count === 0, which is ${count === 0}.`, [
        QL.isEmpty,
      ]);
    else if (o.op === "isFull")
      snap(
        `isFull() returns count === capacity (${count} === ${cap}), which is ${count === cap}.`,
        [QL.isFull],
      );
    else {
      for (let i = 0; i < count; i++) data[(front + i) % cap] = null;
      snap(
        "clear(): every occupied slot, starting at front and wrapping, is set to undefined.",
        [QL.clearLoop],
      );
      front = 0;
      back = -1;
      count = 0;
      snap("front = 0, back = -1, count = 0. The queue is empty again.", [
        QL.clearReset,
      ]);
    }
  });
  return steps;
}

/* ---------------- linked stack ---------------- */

const LS = {
  pushNew: lineOf(
    linkedStackCode,
    "this.top = new StackNode(value, this.top);",
  ),
  pushCount: lineOf(linkedStackCode, "this.count = this.count + 1;"),
  popEmpty: lineOf(
    linkedStackCode,
    "if (this.top === null) return undefined;",
    lineOf(linkedStackCode, "pop()"),
  ),
  popRead: lineOf(linkedStackCode, "const value = this.top.value;"),
  popMove: lineOf(linkedStackCode, "this.top = this.top.next;"),
  popCount: lineOf(linkedStackCode, "this.count = this.count - 1;"),
  peekEmpty: lineOf(
    linkedStackCode,
    "if (this.top === null) return undefined;",
    lineOf(linkedStackCode, "peek()"),
  ),
  peekRet: lineOf(
    linkedStackCode,
    "return this.top.value;",
    lineOf(linkedStackCode, "peek()"),
  ),
  size: lineOf(linkedStackCode, "return this.count;"),
  isEmpty: lineOf(linkedStackCode, "return this.top === null;"),
  clear: lineOf(
    linkedStackCode,
    "this.top = null;",
    lineOf(linkedStackCode, "clear()"),
  ),
};

/** Shared snapshot machinery for the two linked structures. */
function linkedRecorder(infoOf: (count: number) => string) {
  let nextId = 1;
  let pos: { id: number; val: number }[] = [];
  const next = new Map<number, number | null>();
  let head: number | null = null;
  let count = 0;
  let opIdx = -1;
  const steps: Step<LLState>[] = [];
  /** Id of the node after this one (null at the end). */
  const nx = (id: number) => next.get(id) ?? null;
  /** Records a frame of the linked nodes. */
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
        info: infoOf(count),
      },
      lines,
      note,
      op: opIdx,
    });
  return {
    steps,
    snap,
    nx,
    next,
    newId: () => nextId++,
    get pos() {
      return pos;
    },
    set pos(v) {
      pos = v;
    },
    get head() {
      return head;
    },
    set head(v) {
      head = v;
    },
    get count() {
      return count;
    },
    set count(v) {
      count = v;
    },
    set op(v: number) {
      opIdx = v;
    },
  };
}

/** Animates the linked stack: push and pop only change the top pointer. */
export function linkedStackSteps(ops: ParsedOp[]): Step<LLState>[] {
  const r = linkedRecorder((c) => `size = ${c}`);
  r.snap(
    "Empty stack: top points at nothing. Press play to run the operations.",
    [],
  );
  ops.forEach((o, k) => {
    r.op = k;
    if (o.op === "push") {
      const v = o.value!;
      const id = r.newId();
      r.pos = [{ id, val: v }, ...r.pos];
      r.next.set(id, r.head);
      r.snap(
        `new StackNode(${v}, this.top): the new node points at the current top.`,
        [LS.pushNew],
        { [id]: "new" },
      );
      r.head = id;
      r.snap(`this.top = the new node. ${v} is now on top.`, [LS.pushNew], {
        [id]: "ok",
      });
      r.count += 1;
      r.snap(`count = count + 1 = ${r.count}.`, [LS.pushCount], { [id]: "ok" });
    } else if (o.op === "pop") {
      const t = r.head;
      if (t === null) {
        r.snap(
          "pop(): top is null, so the stack is empty and pop returns undefined.",
          [LS.popEmpty],
        );
        return;
      }
      const v = r.pos.find((p) => p.id === t)!.val;
      r.snap(
        `value = top.value = ${v}. This is what pop returns.`,
        [LS.popRead],
        { [t]: "found" },
      );
      r.head = r.nx(t);
      r.snap(
        `top = top.next. The old top node is now unreachable.`,
        [LS.popMove],
        { [t]: "del" },
      );
      r.pos = r.pos.filter((p) => p.id !== t);
      r.next.delete(t);
      r.count -= 1;
      r.snap(
        `count = count - 1 = ${r.count}. Returned ${v}; the unreachable node is garbage collected.`,
        [LS.popCount],
      );
    } else if (o.op === "peek") {
      const t = r.head;
      if (t === null)
        r.snap("peek(): the stack is empty, return undefined.", [LS.peekEmpty]);
      else
        r.snap(
          `peek(): return top.value = ${r.pos.find((p) => p.id === t)!.val}. Nothing is removed.`,
          [LS.peekRet],
          { [t]: "found" },
        );
    } else if (o.op === "size")
      r.snap(`size() returns count = ${r.count}.`, [LS.size]);
    else if (o.op === "isEmpty")
      r.snap(`isEmpty() returns top === null, which is ${r.head === null}.`, [
        LS.isEmpty,
      ]);
    else {
      r.head = null;
      r.pos = [];
      r.next.clear();
      r.count = 0;
      r.snap("clear(): top = null, count = 0. Every node is now unreachable.", [
        LS.clear,
      ]);
    }
  });
  return r.steps;
}

/* ---------------- linked queue ---------------- */

const LQ = {
  enNew: lineOf(linkedQueueCode, "const node = new QueueNode(value);"),
  enEmpty: lineOf(linkedQueueCode, "if (this.back === null) {"),
  enFront: lineOf(linkedQueueCode, "this.front = node;"),
  enBackSet: lineOf(linkedQueueCode, "this.back = node;"),
  enLink: lineOf(linkedQueueCode, "this.back.next = node;"),
  enBackMove: lineOf(
    linkedQueueCode,
    "this.back = node;",
    lineOf(linkedQueueCode, "this.back.next = node;"),
  ),
  enCount: lineOf(linkedQueueCode, "this.count = this.count + 1;"),
  deEmpty: lineOf(
    linkedQueueCode,
    "if (this.front === null) return undefined;",
    lineOf(linkedQueueCode, "dequeue()"),
  ),
  deRead: lineOf(linkedQueueCode, "const value = this.front.value;"),
  deMove: lineOf(linkedQueueCode, "this.front = this.front.next;"),
  deBack: lineOf(linkedQueueCode, "if (this.front === null) this.back = null;"),
  deCount: lineOf(linkedQueueCode, "this.count = this.count - 1;"),
  peekEmpty: lineOf(
    linkedQueueCode,
    "if (this.front === null) return undefined;",
    lineOf(linkedQueueCode, "peek()"),
  ),
  peekRet: lineOf(
    linkedQueueCode,
    "return this.front.value;",
    lineOf(linkedQueueCode, "peek()"),
  ),
  size: lineOf(linkedQueueCode, "return this.count;"),
  isEmpty: lineOf(linkedQueueCode, "return this.front === null;"),
  clear: lineOf(
    linkedQueueCode,
    "this.front = null;",
    lineOf(linkedQueueCode, "clear()"),
  ),
};

/** Animates the linked queue with its front and back pointers. */
export function linkedQueueSteps(ops: ParsedOp[]): Step<LLState>[] {
  const r = linkedRecorder((c) => `size = ${c}`);
  let back: number | null = null;
  // wrap snap so every frame shows the `back` pointer
  const snap = (
    note: string,
    lines: number[],
    marks: Record<number, string> = {},
    ptrs: { name: string; id: number | null }[] = [],
  ) =>
    r.snap(
      note,
      lines,
      marks,
      back === null ? ptrs : [{ name: "back", id: back }, ...ptrs],
    );

  snap(
    "Empty queue: front and back both point at nothing. Press play to run the operations.",
    [],
  );
  ops.forEach((o, k) => {
    r.op = k;
    if (o.op === "enqueue") {
      const v = o.value!;
      const id = r.newId();
      r.pos = [...r.pos, { id, val: v }];
      r.next.set(id, null);
      snap(
        `new QueueNode(${v}): a detached node with next = null.`,
        [LQ.enNew],
        { [id]: "new" },
      );
      if (back === null) {
        snap(
          "back is null, so the queue is empty: this node will be both front and back.",
          [LQ.enEmpty],
          { [id]: "new" },
        );
        r.head = id;
        snap("front = node.", [LQ.enFront], { [id]: "ok" });
        back = id;
        snap("back = node.", [LQ.enBackSet], { [id]: "ok" });
      } else {
        r.next.set(back, id);
        snap(
          "back.next = node: link the new node behind the current last one.",
          [LQ.enLink],
          { [id]: "new" },
        );
        back = id;
        snap(
          "back = node: the new node is now the last one.",
          [LQ.enBackMove],
          { [id]: "ok" },
        );
      }
      r.count += 1;
      snap(`count = count + 1 = ${r.count}.`, [LQ.enCount]);
    } else if (o.op === "dequeue") {
      const f = r.head;
      if (f === null) {
        snap(
          "dequeue(): front is null, so the queue is empty and dequeue returns undefined.",
          [LQ.deEmpty],
        );
        return;
      }
      const v = r.pos.find((p) => p.id === f)!.val;
      snap(
        `value = front.value = ${v}. This is what dequeue returns.`,
        [LQ.deRead],
        { [f]: "found" },
      );
      r.head = r.nx(f);
      snap(
        "front = front.next. The old front node is now unreachable.",
        [LQ.deMove],
        { [f]: "del" },
      );
      if (r.head === null) {
        back = null;
        snap(
          "front became null, so the queue is empty: back is reset to null as well.",
          [LQ.deBack],
          { [f]: "del" },
        );
      } else
        snap("front is not null, so back stays where it is.", [LQ.deBack], {
          [f]: "del",
        });
      r.pos = r.pos.filter((p) => p.id !== f);
      r.next.delete(f);
      r.count -= 1;
      snap(`count = count - 1 = ${r.count}. Returned ${v}.`, [LQ.deCount]);
    } else if (o.op === "peek") {
      const f = r.head;
      if (f === null)
        snap("peek(): the queue is empty, return undefined.", [LQ.peekEmpty]);
      else
        snap(
          `peek(): return front.value = ${r.pos.find((p) => p.id === f)!.val}. Nothing is removed.`,
          [LQ.peekRet],
          { [f]: "found" },
        );
    } else if (o.op === "size")
      snap(`size() returns count = ${r.count}.`, [LQ.size]);
    else if (o.op === "isEmpty")
      snap(`isEmpty() returns front === null, which is ${r.head === null}.`, [
        LQ.isEmpty,
      ]);
    else {
      r.head = null;
      back = null;
      r.pos = [];
      r.next.clear();
      r.count = 0;
      snap("clear(): front = null, back = null, count = 0.", [LQ.clear]);
    }
  });
  return r.steps;
}

/* ---------------- presets ---------------- */

/** The built-in test cases for the stack (with isFull and growth when `withFull`). */
const stackPresetsFor = (withFull: boolean): Preset[] => [
  {
    name: "Basics",
    desc: "Push, peek, size, pop and isEmpty.",
    input: "push 4, push 9, push 2, peek, size, pop, push 7, pop, pop, isEmpty",
  },
  {
    name: "Edge cases",
    desc: "pop and peek on empty, then clear and reuse.",
    input:
      "pop, peek, size, isEmpty, push 1, pop, pop, push 5, push 6, clear, size, pop, peek",
  },
  withFull
    ? {
        name: "Grow 4 → 8 → 16 (30 ops)",
        desc: "Fill past capacity twice: watch the array double and copy.",
        input: [
          ...seq(13, (i) => `push ${(i * 7 + 3) % 50}`),
          "isFull",
          "size",
          ...seq(13, () => "pop"),
          "isEmpty",
          "size",
        ].join(", "),
      }
    : {
        name: "Fill and drain (30 ops)",
        desc: "13 pushes then 13 pops: values come out reversed.",
        input: [
          ...seq(13, (i) => `push ${(i * 7 + 3) % 50}`),
          "size",
          ...seq(13, () => "pop"),
          "isEmpty",
          "size",
        ].join(", "),
      },
  {
    name: "Interleaved (50 ops)",
    desc: "Pushes, pops, peeks and size checks mixed.",
    input: seq(50, (i) =>
      i % 7 === 6
        ? "size"
        : i % 5 === 4
          ? "peek"
          : i % 3 === 2
            ? "pop"
            : `push ${(i * 11 + 5) % 90}`,
    ).join(", "),
  },
];

/** The built-in test cases for the queue (with isFull and wrap-around when `withFull`). */
const queuePresetsFor = (withFull: boolean): Preset[] => [
  {
    name: "Basics",
    desc: "Enqueue, peek, size, dequeue and isEmpty.",
    input:
      "enqueue 3, enqueue 8, enqueue 5, peek, size, dequeue, enqueue 1, dequeue, dequeue, isEmpty",
  },
  {
    name: "Edge cases",
    desc: "dequeue and peek on empty, then clear and reuse.",
    input:
      "dequeue, peek, size, isEmpty, enqueue 1, dequeue, dequeue, enqueue 5, enqueue 6, clear, size, dequeue, peek",
  },
  withFull
    ? {
        name: "Wrap-around and grow (30 ops)",
        desc: "Indices wrap past the end of the array, then the buffer doubles.",
        input:
          "enqueue 1, enqueue 2, enqueue 3, enqueue 4, dequeue, dequeue, enqueue 5, enqueue 6, isFull, enqueue 7, enqueue 8, enqueue 9, size, dequeue, dequeue, dequeue, enqueue 10, enqueue 11, enqueue 12, enqueue 13, enqueue 14, size, peek, dequeue, dequeue, dequeue, dequeue, dequeue, isEmpty, size",
      }
    : {
        name: "Print queue (30 ops)",
        desc: "13 jobs arrive then are served in arrival order.",
        input: [
          ...seq(13, (i) => `enqueue ${(i * 7 + 3) % 50}`),
          "size",
          ...seq(13, () => "dequeue"),
          "isEmpty",
          "size",
        ].join(", "),
      },
  {
    name: "Steady flow (50 ops)",
    desc: "Arrivals and departures overlap with peeks and size checks.",
    input: seq(50, (i) =>
      i % 7 === 6
        ? "size"
        : i % 5 === 4
          ? "peek"
          : i % 3 === 2
            ? "dequeue"
            : `enqueue ${(i * 11 + 5) % 90}`,
    ).join(", "),
  },
];

export const arrayStackPresets = stackPresetsFor(true);
export const linkedStackPresets = stackPresetsFor(false);
export const arrayQueuePresets = queuePresetsFor(true);
export const linkedQueuePresets = queuePresetsFor(false);
