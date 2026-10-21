/**
 * Shared graph helpers for the graph topics: the types for a graph and its drawing state, a
 * parser for edge lists such as "A-B 4, start A", and functions that build the adjacency lists.
 */

import type { ParseResult, ParsedOp } from "../engine/parse";
import { splitOps } from "../engine/parse";

/** An edge between two nodes: its ends, an optional weight and whether it is directed. */
export interface GEdge {
  a: string;
  b: string;
  w: number | null;
  dir: boolean;
}

/** A titled row of small boxes shown beside the graph (for example the queue or the distances). */
export interface Panel {
  title: string;
  cells: { text: string; cls?: string }[];
  empty?: string;
}

/**
 * One frame of a graph animation: the nodes, the edges, node and edge highlights, notes under
 * nodes and the side panels.
 */
export interface GraphState {
  nodes: string[];
  edges: GEdge[];
  nodeMarks: Record<string, string>;
  /** small text under a node, e.g. its distance */
  nodeNotes: Record<string, string>;
  edgeMarks: Record<number, string>;
  panels: Panel[];
}

/**
 * A graph built from the user's input: its nodes in order of appearance, its edges and the start
 * node.
 */
export interface GraphSpec {
  nodes: string[];
  edges: GEdge[];
  start: string;
}

/**
 * One entry of an adjacency list: the neighbouring node, the edge weight and the edge's index for
 * highlighting.
 */
export interface Neighbor {
  to: string;
  w: number;
  /** index into the edge list, for highlighting */
  ei: number;
}

const LABEL = /^[A-Za-z0-9]{1,3}$/;
export const MAX_NODES = 12;
export const MAX_EDGES = 40;

/**
 * Options that say which graph syntax a topic accepts (weighted, directed, negative weights, start
 * node).
 */
interface ParserOpts {
  weighted: boolean;
  /** true: only A>B, false: only A-B */
  directed: boolean;
  /** allow negative weights */
  negative?: boolean;
  /** allow a `start X` token */
  start?: boolean;
}

/**
 * Graph input: edges and an optional start node, separated by commas or new lines.
 *   undirected  A-B 4        directed  A>B 4        start  start A
 */
export function graphParser(o: ParserOpts) {
  return (input: string): ParseResult => {
    const tokens = splitOps(input);
    if (tokens.length === 0)
      return { error: "Enter at least one edge, like A-B 4." };
    const ops: ParsedOp[] = [];
    const seen = new Set<string>();
    const nodes = new Set<string>();
    let hasStart = false;
    const example = o.directed
      ? `A>B${o.weighted ? " 4" : ""}`
      : `A-B${o.weighted ? " 4" : ""}`;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const label = `Item ${i + 1} ("${t}")`;
      const parts = t.split(/\s+/);
      if (parts[0].toLowerCase() === "start") {
        if (!o.start)
          return {
            error: `${label}: this algorithm does not take a start node.`,
          };
        if (hasStart)
          return { error: `${label}: only one start node is allowed.` };
        if (parts.length !== 2 || !LABEL.test(parts[1]))
          return {
            error: `${label}: use "start A" with a node name of 1 to 3 letters or digits.`,
          };
        hasStart = true;
        ops.push({ op: "start", names: [parts[1]] });
        continue;
      }
      const m = /^([A-Za-z0-9]{1,3})\s*([->])\s*([A-Za-z0-9]{1,3})$/.exec(
        parts[0],
      );
      if (!m)
        return {
          error: `${label}: write an edge like ${example}${o.start ? ' or "start A"' : ""}.`,
        };
      const [, a, sym, b] = m;
      if (a === b) return { error: `${label}: self-loops are not supported.` };
      if (o.directed && sym !== ">")
        return { error: `${label}: this graph is directed, write ${a}>${b}.` };
      if (!o.directed && sym !== "-")
        return {
          error: `${label}: this graph is undirected, write ${a}-${b}.`,
        };
      let w: number | undefined;
      if (o.weighted) {
        if (parts.length !== 2 || !/^-?\d+$/.test(parts[1]))
          return { error: `${label}: add an integer weight, like ${example}.` };
        w = Number(parts[1]);
        if (Math.abs(w) > 999)
          return { error: `${label}: keep weights between -999 and 999.` };
        if (w < 0 && !o.negative)
          return {
            error: `${label}: negative weights are not allowed here (Dijkstra and Prim need weights of 0 or more).`,
          };
      } else if (parts.length !== 1)
        return {
          error: `${label}: this graph has no weights, write just ${example}.`,
        };
      const key = o.directed ? `${a}>${b}` : [a, b].sort().join("-");
      if (seen.has(key))
        return { error: `${label}: that edge is already listed.` };
      seen.add(key);
      nodes.add(a);
      nodes.add(b);
      if (nodes.size > MAX_NODES)
        return { error: `Too many nodes (max ${MAX_NODES}).` };
      ops.push({
        op: o.directed ? "arc" : "edge",
        names: [a, b],
        ...(w === undefined ? {} : { value: w, args: [w] }),
      });
    }
    if (ops.filter((x) => x.op !== "start").length === 0)
      return { error: "Add at least one edge." };
    if (ops.filter((x) => x.op !== "start").length > MAX_EDGES)
      return { error: `Too many edges (max ${MAX_EDGES}).` };
    const st = ops.find((x) => x.op === "start");
    if (st && !nodes.has(st.names![0]))
      return { error: `Start node "${st.names![0]}" is not in the graph.` };
    return { ops };
  };
}

/**
 * Builds the nodes, the edges and the start node from parsed operations (the start defaults to the
 * first node).
 */
export function buildGraph(ops: ParsedOp[]): GraphSpec {
  const nodes: string[] = [];
  const edges: GEdge[] = [];
  let start: string | null = null;
  /** Adds a node name once, keeping the order of first appearance. */
  const add = (n: string) => {
    if (!nodes.includes(n)) nodes.push(n);
  };
  for (const o of ops) {
    if (o.op === "start") start = o.names![0];
    else {
      add(o.names![0]);
      add(o.names![1]);
      edges.push({
        a: o.names![0],
        b: o.names![1],
        w: o.value ?? null,
        dir: o.op === "arc",
      });
    }
  }
  return { nodes, edges, start: start ?? nodes[0] };
}

/** adjacency in edge-list order; undirected edges appear on both ends */
export function adjacency(g: GraphSpec): Map<string, Neighbor[]> {
  const adj = new Map<string, Neighbor[]>();
  g.nodes.forEach((n) => adj.set(n, []));
  g.edges.forEach((e, ei) => {
    adj.get(e.a)!.push({ to: e.b, w: e.w ?? 1, ei });
    if (!e.dir) adj.get(e.b)!.push({ to: e.a, w: e.w ?? 1, ei });
  });
  return adj;
}

/** helper for step generators: build a snapshot from the spec plus the changing parts */
export function gstate(
  g: GraphSpec,
  p: Partial<Omit<GraphState, "nodes" | "edges">> = {},
): GraphState {
  return {
    nodes: g.nodes,
    edges: g.edges,
    nodeMarks: {},
    nodeNotes: {},
    edgeMarks: {},
    panels: [],
    ...p,
  };
}

/** Creates one box for a panel, with an optional highlight class. */
export const cell = (text: string, cls?: string) => ({ text, cls });
