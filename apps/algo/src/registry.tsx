import type { ReactNode } from "react";
import type { Step, Topic } from "./engine/types";
import type { ParseResult, ParsedOp, Preset } from "./engine/parse";
import { LinearViz } from "./components/LinearViz";
import { LinkedListViz } from "./components/LinkedListViz";
import { TreeViz } from "./components/TreeViz";
import { ArrayRow } from "./components/ArrayRow";
import { HashViz } from "./components/HashViz";
import { parseStack, stackPresets, stackSteps, stackTopic, type StackState } from "./topics/stack";
import { parseQueue, queuePresets, queueSteps, queueTopic, type QueueState } from "./topics/queue";
import { linkedListPresets, linkedListSteps, linkedListTopic, parseLinkedList, type LLState } from "./topics/linkedList";
import { heapTree, maxHeap, minHeap, type HeapState } from "./topics/heap";
import { hashSetPresets, hashSetSteps, hashSetTopic, parseHashSet, type HashState } from "./topics/hashSet";
import { avl, bst, type TreeState } from "./topics/bst";

export interface Entry<S = any> {
  topic: Topic;
  presets: Preset[];
  parse: (input: string) => ParseResult;
  run: (ops: ParsedOp[]) => Step<S>[];
  render: (s: S) => ReactNode;
}

const renderHeap = (s: HeapState) => (
  <div className="stagecol">
    <TreeViz root={heapTree(s.items)} marks={s.marks} empty="empty heap" />
    <ArrayRow items={s.items} marks={s.marks} label="heap array" />
  </div>
);

const renderTree = (s: TreeState) => <TreeViz root={s.root} marks={s.marks} />;

export const registry: Entry[] = [
  {
    topic: stackTopic,
    presets: stackPresets,
    parse: parseStack,
    run: stackSteps,
    render: (s: StackState) => <LinearViz items={s.items} focus={s.focus} direction="vertical" endLabel="top" />,
  } satisfies Entry<StackState>,
  {
    topic: queueTopic,
    presets: queuePresets,
    parse: parseQueue,
    run: queueSteps,
    render: (s: QueueState) => <LinearViz items={s.items} focus={s.focus} direction="horizontal" startLabel="front" endLabel="back" />,
  } satisfies Entry<QueueState>,
  {
    topic: linkedListTopic,
    presets: linkedListPresets,
    parse: parseLinkedList,
    run: linkedListSteps,
    render: (s: LLState) => <LinkedListViz s={s} />,
  } satisfies Entry<LLState>,
  { topic: minHeap.topic, presets: minHeap.presets, parse: minHeap.parse, run: minHeap.steps, render: renderHeap } satisfies Entry<HeapState>,
  { topic: maxHeap.topic, presets: maxHeap.presets, parse: maxHeap.parse, run: maxHeap.steps, render: renderHeap } satisfies Entry<HeapState>,
  {
    topic: hashSetTopic,
    presets: hashSetPresets,
    parse: parseHashSet,
    run: hashSetSteps,
    render: (s: HashState) => <HashViz s={s} />,
  } satisfies Entry<HashState>,
  { topic: bst.topic, presets: bst.presets, parse: bst.parse, run: bst.steps, render: renderTree } satisfies Entry<TreeState>,
  { topic: avl.topic, presets: avl.presets, parse: avl.parse, run: avl.steps, render: renderTree } satisfies Entry<TreeState>,
];

export const byId = (id: string) => registry.find((e) => e.topic.id === id);
