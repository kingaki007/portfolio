import type { Step, Topic } from "../engine/types";
import { parseOps, type ParsedOp, type Preset } from "../engine/parse";

export interface QueueState {
  items: number[];
  focus: number | null;
}

export const queueTopic: Topic = {
  id: "queue",
  title: "Queue",
  group: "Linear",
  blurb: "First in, first out. Add at the back, remove from the front.",
  syntax: "enqueue <n>, dequeue, front",
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

export const parseQueue = (input: string) => parseOps(input, { enqueue: true, dequeue: false, front: false });

export function queueSteps(ops: ParsedOp[]): Step<QueueState>[] {
  let items: number[] = [];
  const steps: Step<QueueState>[] = [
    { state: { items: [], focus: null }, lines: [], note: "Empty queue. Press play to run the operations.", op: -1 },
  ];
  ops.forEach((o, op) => {
    if (o.op === "enqueue") {
      items = [...items, o.value!];
      steps.push({
        state: { items, focus: items.length - 1 },
        lines: [4, 5],
        note: `enqueue(${o.value}): join the back of the line. Size is ${items.length}.`,
        op,
      });
    } else if (o.op === "dequeue") {
      if (items.length === 0) {
        steps.push({ state: { items, focus: null }, lines: [8, 9], note: "dequeue(): queue is empty, returns undefined.", op });
        return;
      }
      const head = items[0];
      steps.push({
        state: { items, focus: 0 },
        lines: [8, 9],
        note: `dequeue(): the front element ${head} is selected for removal.`,
        op,
      });
      items = items.slice(1);
      steps.push({
        state: { items, focus: items.length ? 0 : null },
        lines: [9],
        note: `Removed ${head}. Everyone shifts forward. Size is ${items.length}.`,
        op,
      });
    } else {
      steps.push({
        state: { items, focus: items.length ? 0 : null },
        lines: [12, 13],
        note: items.length ? `front(): next up is ${items[0]}.` : "front(): queue is empty.",
        op,
      });
    }
  });
  return steps;
}

const seq = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));

export const queuePresets: Preset[] = [
  {
    name: "Basics",
    desc: "Enqueue, check the front, dequeue.",
    input: "enqueue 3, enqueue 8, enqueue 5, front, dequeue, enqueue 1, dequeue, dequeue",
  },
  {
    name: "Edge cases",
    desc: "dequeue and front on an empty queue, then reuse it.",
    input: "dequeue, front, enqueue 1, dequeue, dequeue, front, enqueue 5, enqueue 6, front, dequeue, dequeue, dequeue",
  },
  {
    name: "Print queue (40 ops)",
    desc: "20 jobs arrive, then all are served in arrival order.",
    input: [...seq(20, (i) => `enqueue ${(i * 7 + 3) % 50}`), ...seq(20, () => "dequeue")].join(", "),
  },
  {
    name: "Steady flow (50 ops)",
    desc: "Arrivals and departures overlap with front checks.",
    input: seq(50, (i) => (i % 5 === 4 ? "front" : i % 3 === 2 ? "dequeue" : `enqueue ${(i * 11 + 5) % 90}`)).join(", "),
  },
];
