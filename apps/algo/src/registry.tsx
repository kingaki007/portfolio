import type { ReactNode } from "react";
import type { Step, Topic } from "./engine/types";
import type { ParseResult, ParsedOp, Preset } from "./engine/parse";
import { LinearViz } from "./components/LinearViz";
import { parseStack, stackPresets, stackSteps, stackTopic, type StackState } from "./topics/stack";
import { parseQueue, queuePresets, queueSteps, queueTopic, type QueueState } from "./topics/queue";

export interface Entry<S = any> {
  topic: Topic;
  presets: Preset[];
  parse: (input: string) => ParseResult;
  run: (ops: ParsedOp[]) => Step<S>[];
  render: (s: S) => ReactNode;
}

export const registry: Entry[] = [
  {
    topic: stackTopic,
    presets: stackPresets,
    parse: parseStack,
    run: stackSteps,
    render: (s: StackState) => (
      <LinearViz items={s.items} focus={s.focus} direction="vertical" endLabel="top" />
    ),
  } satisfies Entry<StackState>,
  {
    topic: queueTopic,
    presets: queuePresets,
    parse: parseQueue,
    run: queueSteps,
    render: (s: QueueState) => (
      <LinearViz items={s.items} focus={s.focus} direction="horizontal" startLabel="front" endLabel="back" />
    ),
  } satisfies Entry<QueueState>,
];

export const byId = (id: string) => registry.find((e) => e.topic.id === id);
