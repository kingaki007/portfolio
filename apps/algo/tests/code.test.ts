/**
 * Tests for the shared engine and the stack and queue topics: the input parser, that every
 * displayed code compiles, that the stack and queue code uses no built-in array methods, the
 * behaviour of all four implementations, and that the animations agree with the real code.
 */

import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { registry } from "../src/registry";
import { linearCode } from "../src/topics/linear";
import { parseOps, splitOps } from "../src/engine/parse";

/** Compile the TypeScript the user sees and return the named class/function. */
function load<T = any>(code: string, name: string): T {
  const js = transformSync(code, { loader: "ts" }).code;
  return new Function(`${js}\nreturn ${name};`)() as T;
}

describe("parser", () => {
  it("rejects unknown ops, wrong arity and non-integers", () => {
    const spec = { push: 1, pop: 0, insertAt: 2 };
    for (const bad of [
      "shove 3",
      "push",
      "push x",
      "pop 2",
      "",
      "insertAt 1",
      "push 1 2",
      "push 99999",
    ]) {
      expect("error" in parseOps(bad, spec)).toBe(true);
    }
  });
  it("accepts commas, newlines, semicolons and any case; keeps args", () => {
    expect(splitOps("push 1\nPOP; peek, push -2")).toHaveLength(4);
    const r = parseOps("PUSH 1\ninsertAt 2 -7", { push: 1, insertAt: 2 });
    expect(r).toEqual({
      ops: [
        { op: "push", value: 1, args: [1] },
        { op: "insertAt", value: 2, args: [2, -7] },
      ],
    });
  });
  it("caps the number of operations", () => {
    expect(
      "error" in parseOps(Array(201).fill("pop").join(","), { pop: 0 }),
    ).toBe(true);
  });
});

describe("every topic's displayed code is valid TypeScript", () => {
  for (const e of registry) {
    it(e.topic.id, () => {
      expect(() => transformSync(e.topic.code, { loader: "ts" })).not.toThrow();
    });
  }
});

describe("stack and queue code uses no built-in array methods", () => {
  const banned =
    /\.(push|pop|shift|unshift|splice|slice|concat|fill|map|forEach|reverse)\(/;
  for (const [name, code] of Object.entries(linearCode)) {
    it(name, () => expect(code).not.toMatch(banned));
  }
});

describe("ArrayStack (the code on screen)", () => {
  const Stack = load(linearCode.arrayStackCode, "ArrayStack");
  it("is LIFO with peek, size, isEmpty", () => {
    const s = new Stack();
    expect(s.isEmpty()).toBe(true);
    expect(s.pop()).toBeUndefined();
    expect(s.peek()).toBeUndefined();
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.size()).toBe(3);
    expect(s.peek()).toBe(3);
    expect(s.pop()).toBe(3);
    expect(s.pop()).toBe(2);
    expect(s.size()).toBe(1);
    expect(s.isEmpty()).toBe(false);
  });
  it("grows past its capacity without losing order", () => {
    const s = new Stack(2);
    for (let i = 0; i < 50; i++) s.push(i);
    expect(s.size()).toBe(50);
    for (let i = 49; i >= 0; i--) expect(s.pop()).toBe(i);
    expect(s.isEmpty()).toBe(true);
  });
  it("isFull and clear", () => {
    const s = new Stack(2);
    s.push(1);
    s.push(2);
    expect(s.isFull()).toBe(true);
    s.clear();
    expect(s.size()).toBe(0);
    expect(s.peek()).toBeUndefined();
    s.push(9);
    expect(s.peek()).toBe(9);
  });
});

describe("ArrayQueue (the code on screen)", () => {
  const Queue = load(linearCode.arrayQueueCode, "ArrayQueue");
  it("is FIFO with peek, size, isEmpty", () => {
    const q = new Queue();
    expect(q.dequeue()).toBeUndefined();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    expect(q.peek()).toBe(1);
    expect(q.size()).toBe(3);
    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBe(2);
    expect(q.isEmpty()).toBe(false);
    expect(q.dequeue()).toBe(3);
    expect(q.isEmpty()).toBe(true);
  });
  it("wraps around the buffer and grows while wrapped", () => {
    const q = new Queue(4);
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    q.enqueue(4);
    q.dequeue();
    q.dequeue();
    q.enqueue(5);
    q.enqueue(6); // wraps
    expect(q.isFull()).toBe(true);
    q.enqueue(7); // grows while wrapped
    const out: number[] = [];
    while (!q.isEmpty()) out.push(q.dequeue());
    expect(out).toEqual([3, 4, 5, 6, 7]);
  });
  it("behaves like an ordinary queue over a long random run", () => {
    const q = new Queue(2);
    const ref: number[] = [];
    let seed = 7;
    /** Small seeded random generator so the random cases are repeatable. */
    const rnd = () =>
      (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 2000; i++) {
      if (rnd() < 0.55) {
        q.enqueue(i);
        ref.push(i);
      } else expect(q.dequeue()).toBe(ref.shift());
      expect(q.size()).toBe(ref.length);
    }
    q.clear();
    expect(q.size()).toBe(0);
    q.enqueue(1);
    expect(q.peek()).toBe(1);
  });
});

describe("LinkedStack and LinkedQueue (the code on screen)", () => {
  it("stack: LIFO, peek, size, clear", () => {
    const S = load(linearCode.linkedStackCode, "LinkedStack");
    const s = new S();
    expect(s.pop()).toBeUndefined();
    s.push("a");
    s.push("b");
    s.push("c");
    expect(s.peek()).toBe("c");
    expect(s.size()).toBe(3);
    expect([s.pop(), s.pop(), s.pop(), s.pop()]).toEqual([
      "c",
      "b",
      "a",
      undefined,
    ]);
    s.push(1);
    s.clear();
    expect(s.isEmpty()).toBe(true);
    expect(s.size()).toBe(0);
  });
  it("queue: FIFO, back resets when emptied, peek, size, clear", () => {
    const Q = load(linearCode.linkedQueueCode, "LinkedQueue");
    const q = new Q();
    expect(q.dequeue()).toBeUndefined();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.peek()).toBe(1);
    expect([q.dequeue(), q.dequeue(), q.dequeue()]).toEqual([1, 2, undefined]);
    expect(q.isEmpty()).toBe(true);
    q.enqueue(3);
    q.enqueue(4); // back must have been reset
    expect([q.dequeue(), q.dequeue()]).toEqual([3, 4]);
    q.enqueue(5);
    q.clear();
    expect(q.size()).toBe(0);
    expect(q.peek()).toBeUndefined();
  });
});

describe("visualizer agrees with the real code on every preset", () => {
  const cases = [
    {
      id: "stack-array",
      cls: "arrayStackCode",
      name: "ArrayStack",
      kind: "stack",
    },
    {
      id: "stack-linked",
      cls: "linkedStackCode",
      name: "LinkedStack",
      kind: "stack",
    },
    {
      id: "queue-array",
      cls: "arrayQueueCode",
      name: "ArrayQueue",
      kind: "queue",
    },
    {
      id: "queue-linked",
      cls: "linkedQueueCode",
      name: "LinkedQueue",
      kind: "queue",
    },
  ] as const;
  for (const c of cases) {
    const entry = registry.find((e) => e.topic.id === c.id)!;
    const Impl = load(linearCode[c.cls], c.name);
    for (const p of entry.presets) {
      it(`${c.id} / ${p.name}`, () => {
        const r = entry.parse(p.input);
        if ("error" in r) throw new Error(r.error);
        const real = new Impl();
        for (const o of r.ops) {
          const fn =
            o.op === "push" || o.op === "enqueue"
              ? () => real[o.op](o.value)
              : () => real[o.op]();
          fn();
        }
        const last = entry.run(r.ops).at(-1)!.state;
        // what the picture shows, in removal order
        const shown: number[] =
          "cells" in last
            ? c.kind === "stack"
              ? last.cells.filter((v: number | null) => v !== null).reverse()
              : (() => {
                  const out: number[] = [];
                  const n = last.cells.length;
                  const f = Number(
                    last.ptrs.find((q: { name: string }) => q.name === "front")
                      .idx,
                  );
                  for (let i = 0; i < n; i++) {
                    const v = last.cells[(f + i) % n];
                    if (v !== null) out.push(v);
                  }
                  return out;
                })()
            : (() => {
                const byId = new Map(
                  last.nodes.map((n: { id: number }) => [n.id, n]),
                );
                const out: number[] = [];
                for (
                  let id = last.head;
                  id !== null;
                  id = (byId.get(id) as { next: number | null }).next
                )
                  out.push((byId.get(id) as { val: number }).val);
                return out;
              })();
        const drained: number[] = [];
        while (!real.isEmpty())
          drained.push(c.kind === "stack" ? real.pop() : real.dequeue());
        expect(shown).toEqual(drained);
      });
    }
  }
});
