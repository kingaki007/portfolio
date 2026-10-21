import type { ReactNode } from "react";
import type { Step, Topic } from "./engine/types";
import type { ParseResult, ParsedOp, Preset } from "./engine/parse";
import { SlotsViz } from "./components/SlotsViz";
import { LinkedListViz } from "./components/LinkedListViz";
import { TreeViz } from "./components/TreeViz";
import { ArrayRow } from "./components/ArrayRow";
import { HashViz } from "./components/HashViz";
import {
  arrayQueuePresets, arrayQueueSteps, arrayQueueTopic, arrayStackPresets, arrayStackSteps, arrayStackTopic,
  linkedQueuePresets, linkedQueueSteps, linkedQueueTopic, linkedStackPresets, linkedStackSteps, linkedStackTopic,
  parseArrayQueue, parseArrayStack, parseLinkedQueue, parseLinkedStack, type SlotsState,
} from "./topics/linear";
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
  { topic: arrayStackTopic, presets: arrayStackPresets, parse: parseArrayStack, run: arrayStackSteps, render: (s: SlotsState) => <SlotsViz s={s} /> } satisfies Entry<SlotsState>,
  { topic: linkedStackTopic, presets: linkedStackPresets, parse: parseLinkedStack, run: linkedStackSteps, render: (s: LLState) => <LinkedListViz s={s} headLabel="top" /> } satisfies Entry<LLState>,
  { topic: arrayQueueTopic, presets: arrayQueuePresets, parse: parseArrayQueue, run: arrayQueueSteps, render: (s: SlotsState) => <SlotsViz s={s} /> } satisfies Entry<SlotsState>,
  { topic: linkedQueueTopic, presets: linkedQueuePresets, parse: parseLinkedQueue, run: linkedQueueSteps, render: (s: LLState) => <LinkedListViz s={s} headLabel="front" /> } satisfies Entry<LLState>,
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

/** old links (/algo/stack, /algo/queue) keep working */
const ALIAS: Record<string, string> = { stack: "stack-array", queue: "queue-array" };
export const byId = (id: string) => registry.find((e) => e.topic.id === (ALIAS[id] ?? id));
