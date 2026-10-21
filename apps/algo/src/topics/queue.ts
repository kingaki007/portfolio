import type { Step, Topic } from "../engine/types";

export interface QueueState {
  items: number[];
  focus: number | null;
}

export type QueueOp = { op: "enqueue"; value: number } | { op: "dequeue" } | { op: "front" };

export const queueTopic: Topic<QueueState> = {
  id: "queue",
  title: "Queue",
  group: "Linear",
  blurb: "First in, first out. Add at the back, remove from the front.",
  code: `class Queue<T> {
  private items: T[] = [];

  enqueue(value: T) {
    this.items.push(value);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  front(): T | undefined {
    return this.items[0];
  }
}`,
  complexity: [
    { op: "enqueue", time: "O(1)" },
    { op: "dequeue", time: "O(n) array, O(1) linked list" },
    { op: "front", time: "O(1)" },
  ],
};

export function queueSteps(ops: QueueOp[]): Step<QueueState>[] {
  let items: number[] = [];
  const steps: Step<QueueState>[] = [
    { state: { items: [], focus: null }, lines: [], note: "Empty queue. Press play to run the operations." },
  ];
  for (const o of ops) {
    if (o.op === "enqueue") {
      items = [...items, o.value];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [4, 5],
        note: `enqueue(${o.value}): join the back of the line. Size is ${items.length}.`,
      });
    } else if (o.op === "dequeue") {
      if (items.length === 0) {
        steps.push({ state: { items, focus: null }, lines: [8, 9], note: "dequeue(): queue is empty, returns undefined." });
        continue;
      }
      const head = items[0];
      steps.push({
        state: { items, focus: 0 },
        lines: [8, 9],
        note: `dequeue(): the front element ${head} is selected for removal.`,
      });
      items = items.slice(1);
      steps.push({
        state: { items, focus: items.length ? 0 : null },
        lines: [9],
        note: `Removed ${head}. Everyone shifts forward. Size is ${items.length}.`,
      });
    } else {
      steps.push({
        state: { items, focus: items.length ? 0 : null },
        lines: [12, 13],
        note: items.length ? `front(): next up is ${items[0]}.` : "front(): queue is empty.",
      });
    }
  }
  return steps;
}

export const defaultQueueOps: QueueOp[] = [
  { op: "enqueue", value: 3 },
  { op: "enqueue", value: 8 },
  { op: "enqueue", value: 5 },
  { op: "front" },
  { op: "dequeue" },
  { op: "enqueue", value: 1 },
  { op: "dequeue" },
  { op: "dequeue" },
];
