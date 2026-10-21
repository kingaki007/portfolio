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
import { SortViz } from "./components/SortViz";
import { sorting, type SortState } from "./topics/sorting";
import { GraphViz } from "./components/GraphViz";
import { RepViz } from "./components/RepViz";
import { NaryViz } from "./components/NaryViz";
import { graphTopics } from "./topics/graphAlgos";
import type { GraphState } from "./topics/graph";
import { dsuForest, dsuPresets, dsuSteps, dsuTopic, parseDsu, type DsuState } from "./topics/dsu";
import { parseTrie, triePresets, trieSteps, trieTopic, type TrieState } from "./topics/trie";
import { FenwickViz } from "./components/FenwickViz";
import { fenwickPresets, fenwickSteps, fenwickTopic, parseFenwick, type FenState } from "./topics/fenwick";
import { parse234, tree234Presets, tree234Steps, tree234Topic, type Tree234State } from "./topics/tree234";
import { parseRB, redBlackPresets, redBlackSteps, redBlackTopic, type RBState } from "./topics/redBlack";
import { QueensViz, SudokuViz } from "./components/BoardViz";
import { RecViz } from "./components/RecViz";
import { dpTopics } from "./topics/dp";
import { DpViz } from "./components/DpViz";
import type { DpState } from "./topics/dp";
import {
  parsePerm, parseQueens, parseSubsets, parseSubsetSum, parseSudoku, permPresets, permSteps, permTopic, queensPresets, queensSteps, queensTopic,
  subsetsPresets, subsetsSteps, subsetsTopic, subsetSumPresets, subsetSumSteps, subsetSumTopic, sudokuPresets, sudokuSteps, sudokuTopic,
  type QueensState, type RecState, type SudokuState,
} from "./topics/backtracking";
import { parseRep, repPresets, repSteps, repTopic, type RepState } from "./topics/graphRep";

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
  ...sorting.map((t) => ({ topic: t.topic, presets: t.presets, parse: t.parse, run: t.run, render: (s: SortState) => <SortViz s={s} /> }) satisfies Entry<SortState>),
  { topic: trieTopic, presets: triePresets, parse: parseTrie, run: trieSteps, render: (s: TrieState) => (
      <div className="stagecol">
        <NaryViz roots={s.roots} marks={s.marks} />
        <div className="muted mono" style={{ fontSize: 12 }}>words: {s.words.length ? s.words.join(", ") : "none"}</div>
      </div>
    ) } satisfies Entry<TrieState>,
  { topic: fenwickTopic, presets: fenwickPresets, parse: parseFenwick, run: fenwickSteps, render: (s: FenState) => <FenwickViz s={s} /> } satisfies Entry<FenState>,
  { topic: tree234Topic, presets: tree234Presets, parse: parse234, run: tree234Steps, render: (s: Tree234State) => <NaryViz roots={s.roots} marks={s.marks} /> } satisfies Entry<Tree234State>,
  { topic: redBlackTopic, presets: redBlackPresets, parse: parseRB, run: redBlackSteps, render: (s: RBState) => <TreeViz root={s.root} marks={s.marks} /> } satisfies Entry<RBState>,
  { topic: queensTopic, presets: queensPresets, parse: parseQueens, run: queensSteps, render: (s: QueensState) => <QueensViz s={s} /> } satisfies Entry<QueensState>,
  { topic: permTopic, presets: permPresets, parse: parsePerm, run: permSteps, render: (s: RecState) => <RecViz s={s} /> } satisfies Entry<RecState>,
  { topic: subsetsTopic, presets: subsetsPresets, parse: parseSubsets, run: subsetsSteps, render: (s: RecState) => <RecViz s={s} /> } satisfies Entry<RecState>,
  { topic: subsetSumTopic, presets: subsetSumPresets, parse: parseSubsetSum, run: subsetSumSteps, render: (s: RecState) => <RecViz s={s} /> } satisfies Entry<RecState>,
  { topic: sudokuTopic, presets: sudokuPresets, parse: parseSudoku, run: sudokuSteps, render: (s: SudokuState) => <SudokuViz s={s} /> } satisfies Entry<SudokuState>,
  ...Object.values(dpTopics).map((t) => ({ ...t, render: (s: DpState) => <DpViz s={s} /> }) satisfies Entry<DpState>),
  { topic: repTopic, presets: repPresets, parse: parseRep, run: repSteps, render: (s: RepState) => <RepViz s={s} /> } satisfies Entry<RepState>,
  ...(["bfs", "dfs", "dijkstra", "bellman", "kruskal", "prim"] as const).map((k) => ({
    ...graphTopics[k],
    render: (s: GraphState) => <GraphViz s={s} weighted={k !== "bfs" && k !== "dfs"} />,
  }) satisfies Entry<GraphState>),
  {
    topic: dsuTopic,
    presets: dsuPresets,
    parse: parseDsu,
    run: dsuSteps,
    render: (s: DsuState) => (
      <div className="stagecol">
        <NaryViz roots={dsuForest(s)} marks={s.marks} />
        <ArrayRow items={s.parent.map((v, i) => ({ id: i, v }))} marks={s.marks} label="parent array" />
        <div className="muted mono" style={{ fontSize: 11 }}>parent[] above, rank[] below</div>
        <ArrayRow items={s.rank.map((v, i) => ({ id: i, v }))} label="rank array" />
      </div>
    ),
  } satisfies Entry<DsuState>,
];

/** old links (/algo/stack, /algo/queue) keep working */
const ALIAS: Record<string, string> = { stack: "stack-array", queue: "queue-array" };
export const byId = (id: string) => registry.find((e) => e.topic.id === (ALIAS[id] ?? id));
