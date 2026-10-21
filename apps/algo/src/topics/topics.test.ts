import { describe, expect, it } from "vitest";
import { defaultStackOps, stackSteps } from "./stack";
import { defaultQueueOps, queueSteps } from "./queue";

describe("stack", () => {
  it("ends in LIFO-consistent state", () => {
    const steps = stackSteps(defaultStackOps);
    expect(steps.length).toBeGreaterThan(1);
    expect(steps[steps.length - 1].state.items).toEqual([4]);
  });
  it("pop on empty does not throw", () => {
    const steps = stackSteps([{ op: "pop" }]);
    expect(steps[1].state.items).toEqual([]);
  });
});

describe("queue", () => {
  it("ends in FIFO-consistent state", () => {
    const steps = queueSteps(defaultQueueOps);
    expect(steps[steps.length - 1].state.items).toEqual([1]);
  });
});
