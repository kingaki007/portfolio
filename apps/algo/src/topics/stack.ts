import type { Step, Topic } from "../engine/types";
import { parseOps, type ParsedOp, type Preset } from "../engine/parse";

export interface StackState {
  items: number[];
  /** index of the element just touched */
  focus: number | null;
}

export const stackTopic: Topic = {
  id: "stack",
  title: "Stack",
  group: "Linear",
  blurb: "Last in, first out. All work happens at the top.",
  syntax: "push <n>, pop, peek",
  code: `class Stack<T> {
  private items: T[] = [];

  push(value: T) {
    this.items.push(value);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
}`,
  complexity: [
    { op: "push", time: "O(1)" },
    { op: "pop", time: "O(1)" },
    { op: "peek", time: "O(1)" },
  ],
};

export const parseStack = (input: string) => parseOps(input, { push: true, pop: false, peek: false });

export function stackSteps(ops: ParsedOp[]): Step<StackState>[] {
  let items: number[] = [];
  const steps: Step<StackState>[] = [
    { state: { items: [], focus: null }, lines: [], note: "Empty stack. Press play to run the operations.", op: -1 },
  ];
  ops.forEach((o, op) => {
    if (o.op === "push") {
      items = [...items, o.value!];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [4, 5],
        note: `push(${o.value}): place it on top. Size is now ${items.length}.`,
        op,
      });
    } else if (o.op === "pop") {
      if (items.length === 0) {
        steps.push({ state: { items, focus: null }, lines: [8, 9], note: "pop(): stack is empty, returns undefined.", op });
        return;
      }
      const top = items[items.length - 1];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [8, 9],
        note: `pop(): the top element ${top} is selected for removal.`,
        op,
      });
      items = items.slice(0, -1);
      steps.push({
        state: { items, focus: items.length ? items.length - 1 : null },
        lines: [9],
        note: `Removed ${top}. Size is now ${items.length}.`,
        op,
      });
    } else {
      const top = items.length ? items[items.length - 1] : undefined;
      steps.push({
        state: { items, focus: items.length ? items.length - 1 : null },
        lines: [12, 13],
        note: top === undefined ? "peek(): stack is empty." : `peek(): top is ${top}. Nothing is removed.`,
        op,
      });
    }
  });
  return steps;
}

const seq = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));

export const stackPresets: Preset[] = [
  {
    name: "Basics",
    desc: "Push, peek and pop in a short run.",
    input: "push 4, push 9, push 2, peek, pop, push 7, pop, pop",
  },
  {
    name: "Edge cases",
    desc: "pop and peek on an empty stack, then reuse it.",
    input: "pop, peek, push 1, pop, pop, peek, push 5, push 6, peek, pop, pop, pop",
  },
  {
    name: "Fill and drain (40 ops)",
    desc: "20 pushes then 20 pops: output comes out in reverse order.",
    input: [...seq(20, (i) => `push ${(i * 7 + 3) % 50}`), ...seq(20, () => "pop")].join(", "),
  },
  {
    name: "Interleaved (50 ops)",
    desc: "Pushes and pops mixed, with peeks along the way.",
    input: seq(50, (i) => (i % 5 === 4 ? "peek" : i % 3 === 2 ? "pop" : `push ${(i * 11 + 5) % 90}`)).join(", "),
  },
];
