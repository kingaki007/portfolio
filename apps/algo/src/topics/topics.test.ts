import { describe, expect, it } from "vitest";
import { parseStack, stackPresets, stackSteps } from "./stack";
import { parseQueue, queuePresets, queueSteps } from "./queue";
import { splitOps } from "../engine/parse";

const ops = (r: ReturnType<typeof parseStack>) => {
  if ("error" in r) throw new Error(r.error);
  return r.ops;
};

describe("parser", () => {
  it("rejects unknown ops, missing and extra arguments", () => {
    expect("error" in parseStack("shove 3")).toBe(true);
    expect("error" in parseStack("push")).toBe(true);
    expect("error" in parseStack("push x")).toBe(true);
    expect("error" in parseStack("pop 2")).toBe(true);
    expect("error" in parseStack("")).toBe(true);
  });
  it("accepts commas, newlines and mixed case", () => {
    expect(splitOps("push 1\nPOP; peek, push -2")).toHaveLength(4);
    expect(ops(parseStack("PUSH 1\npop"))).toEqual([{ op: "push", value: 1 }, { op: "pop" }]);
  });
  it("caps the number of operations", () => {
    expect("error" in parseStack(Array(201).fill("pop").join(","))).toBe(true);
  });
});

describe("stack", () => {
  it("basics ends in LIFO-consistent state", () => {
    const steps = stackSteps(ops(parseStack(stackPresets[0].input)));
    expect(steps[steps.length - 1].state.items).toEqual([4]);
  });
  it("pop on empty does not throw", () => {
    expect(stackSteps(ops(parseStack("pop")))[1].state.items).toEqual([]);
  });
  it("fill and drain pops everything", () => {
    const steps = stackSteps(ops(parseStack(stackPresets[2].input)));
    expect(steps[steps.length - 1].state.items).toEqual([]);
  });
  it("every preset parses and step op indexes are in range", () => {
    for (const p of stackPresets) {
      const o = ops(parseStack(p.input));
      for (const s of stackSteps(o)) expect(s.op).toBeLessThan(o.length);
    }
  });
});

describe("queue", () => {
  it("basics ends in FIFO-consistent state", () => {
    const r = parseQueue(queuePresets[0].input);
    if ("error" in r) throw new Error(r.error);
    const steps = queueSteps(r.ops);
    expect(steps[steps.length - 1].state.items).toEqual([1]);
  });
  it("every preset parses", () => {
    for (const p of queuePresets) expect("ops" in parseQueue(p.input)).toBe(true);
  });
});
