import type { Step, Topic } from "../engine/types";

export interface StackState {
  items: number[];
  /** index of the element just touched */
  focus: number | null;
}

export type StackOp = { op: "push"; value: number } | { op: "pop" } | { op: "peek" };

export const stackTopic: Topic<StackState> = {
  id: "stack",
  title: "Stack",
  group: "Linear",
  blurb: "Last in, first out. All work happens at the top.",
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

export function stackSteps(ops: StackOp[]): Step<StackState>[] {
  let items: number[] = [];
  const steps: Step<StackState>[] = [
    { state: { items: [], focus: null }, lines: [], note: "Empty stack. Press play to run the operations." },
  ];
  for (const o of ops) {
    if (o.op === "push") {
      items = [...items, o.value];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [4, 5],
        note: `push(${o.value}): place it on top. Size is now ${items.length}.`,
      });
    } else if (o.op === "pop") {
      if (items.length === 0) {
        steps.push({ state: { items, focus: null }, lines: [8, 9], note: "pop(): stack is empty, returns undefined." });
        continue;
      }
      const top = items[items.length - 1];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [8, 9],
        note: `pop(): the top element ${top} is selected for removal.`,
      });
      items = items.slice(0, -1);
      steps.push({
        state: { items, focus: items.length ? items.length - 1 : null },
        lines: [9],
        note: `Removed ${top}. Size is now ${items.length}.`,
      });
    } else {
      const top = items.length ? items[items.length - 1] : undefined;
      steps.push({
        state: { items, focus: items.length ? items.length - 1 : null },
        lines: [12, 13],
        note: top === undefined ? "peek(): stack is empty." : `peek(): top is ${top}. Nothing is removed.`,
      });
    }
  }
  return steps;
}

export const defaultStackOps: StackOp[] = [
  { op: "push", value: 4 },
  { op: "push", value: 9 },
  { op: "push", value: 2 },
  { op: "peek" },
  { op: "pop" },
  { op: "push", value: 7 },
  { op: "pop" },
  { op: "pop" },
];
