import type { ReactNode } from "react";
import type { Step, Topic } from "./engine/types";
import { LinearViz } from "./components/LinearViz";
import { defaultStackOps, stackSteps, stackTopic, type StackState } from "./topics/stack";
import { defaultQueueOps, queueSteps, queueTopic, type QueueState } from "./topics/queue";

export interface Entry<S = any> {
  topic: Topic<S>;
  steps: () => Step<S>[];
  render: (s: S) => ReactNode;
}

export const registry: Entry[] = [
  {
    topic: stackTopic,
    steps: () => stackSteps(defaultStackOps),
    render: (s: StackState) => (
      <LinearViz items={s.items} focus={s.focus} direction="vertical" endLabel="top" />
    ),
  } satisfies Entry<StackState>,
  {
    topic: queueTopic,
    steps: () => queueSteps(defaultQueueOps),
    render: (s: QueueState) => (
      <LinearViz items={s.items} focus={s.focus} direction="horizontal" startLabel="front" endLabel="back" />
    ),
  } satisfies Entry<QueueState>,
];

export const byId = (id: string) => registry.find((e) => e.topic.id === id);
