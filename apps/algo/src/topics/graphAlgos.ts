/**
 * The graph algorithm topics: BFS, DFS, Dijkstra, Bellman-Ford, Kruskal and Prim. Each has the
 * code shown to the user, a step generator that walks the graph exactly as that code does, and
 * its built-in test cases.
 */

import type { Step, Topic } from "../engine/types";
import type { ParsedOp, Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import {
  adjacency,
  buildGraph,
  cell,
  graphParser,
  gstate,
  type GraphState,
  type Panel,
} from "./graph";

/* ------------------------------ code ------------------------------ */

const bfsCode = `type Graph = Map<string, string[]>;

function bfs(graph: Graph, start: string): string[] {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}`;

const dfsCode = `type Graph = Map<string, string[]>;

function dfs(graph: Graph, start: string): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(node: string): void {
    visited.add(node);
    order.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!visited.has(next)) visit(next);
    }
  }

  visit(start);
  return order;
}`;

const dijkstraCode = `type WGraph = Map<string, [string, number][]>;

function dijkstra(graph: WGraph, source: string) {
  const dist = new Map<string, number>();
  for (const node of graph.keys()) dist.set(node, Infinity);
  dist.set(source, 0);
  const prev = new Map<string, string>();
  const settled = new Set<string>();

  while (settled.size < graph.size) {
    let node: string | null = null;
    for (const [candidate, d] of dist) {
      if (!settled.has(candidate) && (node === null || d < dist.get(node)!)) node = candidate;
    }
    if (node === null || dist.get(node) === Infinity) break;
    settled.add(node);
    for (const [next, weight] of graph.get(node) ?? []) {
      if (dist.get(node)! + weight < dist.get(next)!) {
        dist.set(next, dist.get(node)! + weight);
        prev.set(next, node);
      }
    }
  }
  return { dist, prev };
}`;

const bellmanCode = `type Edge = [string, string, number];

function bellmanFord(nodes: string[], edges: Edge[], source: string) {
  const dist = new Map<string, number>(nodes.map((n) => [n, Infinity]));
  dist.set(source, 0);

  for (let pass = 1; pass < nodes.length; pass++) {
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist.get(u)! + w < dist.get(v)!) {
        dist.set(v, dist.get(u)! + w);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const [u, v, w] of edges) {
    if (dist.get(u)! + w < dist.get(v)!) return { dist, negativeCycle: true };
  }
  return { dist, negativeCycle: false };
}`;

const kruskalCode = `type Edge = [string, string, number];

class DisjointSet {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    return true;
  }
}

function kruskal(nodes: string[], edges: Edge[]): Edge[] {
  const index = new Map(nodes.map((n, i) => [n, i]));
  const dsu = new DisjointSet(nodes.length);
  const mst: Edge[] = [];
  for (const edge of [...edges].sort((a, b) => a[2] - b[2])) {
    const [u, v] = edge;
    if (dsu.union(index.get(u)!, index.get(v)!)) mst.push(edge);
    if (mst.length === nodes.length - 1) break;
  }
  return mst;
}`;

const primCode = `type WGraph = Map<string, [string, number][]>;

function prim(graph: WGraph, start: string): [string, string, number][] {
  const inTree = new Set<string>([start]);
  const mst: [string, string, number][] = [];

  while (inTree.size < graph.size) {
    let best: [string, string, number] | null = null;
    for (const u of inTree) {
      for (const [v, w] of graph.get(u) ?? []) {
        if (!inTree.has(v) && (best === null || w < best[2])) best = [u, v, w];
      }
    }
    if (best === null) break;
    inTree.add(best[1]);
    mst.push(best);
  }
  return mst;
}`;

export const graphCode = {
  bfsCode,
  dfsCode,
  dijkstraCode,
  bellmanCode,
  kruskalCode,
  primCode,
};

/* ------------------------------ helpers ------------------------------ */

const INF = "∞";
/** Formats a distance, showing the infinity sign for unreachable. */
const fmt = (d: number) => (d === Infinity ? INF : String(d));

/** The parts of a graph frame that change from step to step. */
type Marks = Pick<
  GraphState,
  "nodeMarks" | "nodeNotes" | "edgeMarks" | "panels"
>;

/**
 * Shared setup for the step generators: builds the graph and adjacency lists and returns the step
 * list, a frame recorder and an edge-name helper.
 */
function recorder(ops: ParsedOp[]) {
  const g = buildGraph(ops);
  const adj = adjacency(g);
  const steps: Step<GraphState>[] = [];
  /** Records a frame of the graph with the given note, code lines and marks. */
  const snap = (note: string, lines: number[], m: Partial<Marks> = {}) =>
    steps.push({ state: gstate(g, m), lines, note, op: -1 });
  /** Text name of an edge such as A-B or A>B. */
  const edgeName = (ei: number) => {
    const e = g.edges[ei];
    return `${e.a}${e.dir ? ">" : "-"}${e.b}`;
  };
  return { g, adj, steps, snap, edgeName };
}

/* ------------------------------ BFS ------------------------------ */

/** Animates breadth-first search: dequeue a node, visit it, enqueue its unvisited neighbours. */
export function bfsSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, adj, steps, snap } = recorder(ops);
  const L = {
    vis: lineOf(bfsCode, "const visited = new Set"),
    queue: lineOf(bfsCode, "const queue: string[] = [start];"),
    loop: lineOf(bfsCode, "while (queue.length > 0)"),
    shift: lineOf(bfsCode, "const node = queue.shift()!;"),
    order: lineOf(bfsCode, "order.push(node);"),
    each: lineOf(bfsCode, "for (const next of graph.get(node)"),
    check: lineOf(bfsCode, "if (!visited.has(next))"),
    add: lineOf(bfsCode, "visited.add(next);"),
    enq: lineOf(bfsCode, "queue.push(next);"),
    ret: lineOf(bfsCode, "return order;"),
  };
  const visited = new Set<string>([g.start]);
  let queue = [g.start];
  const order: string[] = [];
  const done = new Set<string>();
  const tree = new Set<number>();
  let cur: string | null = null;

  /**
   * Colours the nodes (visited, queued, done, current) and the tree edges, and fills the queue and
   * visit-order panels.
   */
  const marks = (
    extraEdge: Record<number, string> = {},
    extraNode: Record<string, string> = {},
  ): Partial<Marks> => {
    const nodeMarks: Record<string, string> = {};
    visited.forEach((n) => (nodeMarks[n] = "vis"));
    queue.forEach((n) => (nodeMarks[n] = "que"));
    done.forEach((n) => (nodeMarks[n] = "done"));
    if (cur) nodeMarks[cur] = "cur";
    nodeMarks[g.start] = nodeMarks[g.start] ?? "src";
    const edgeMarks: Record<number, string> = {};
    tree.forEach((e) => (edgeMarks[e] = "tree"));
    const panels: Panel[] = [
      {
        title: "Queue (front → back)",
        cells: queue.map((n, i) => cell(n, i === 0 ? "hl" : undefined)),
        empty: "empty",
      },
      {
        title: "Visit order",
        cells: order.map((n) => cell(n, "ok")),
        empty: "nothing visited yet",
      },
    ];
    return {
      nodeMarks: { ...nodeMarks, ...extraNode },
      edgeMarks: { ...edgeMarks, ...extraEdge },
      panels,
    };
  };

  snap(
    `Start at ${g.start}: mark it visited and put it in the queue.`,
    [L.vis, L.queue],
    marks(),
  );
  while (queue.length > 0) {
    const node = queue[0];
    queue = queue.slice(1);
    cur = node;
    snap(
      `Dequeue ${node} from the front of the queue.`,
      [L.loop, L.shift],
      marks(),
    );
    order.push(node);
    snap(
      `Visit ${node} (position ${order.length} in the order).`,
      [L.order],
      marks(),
    );
    for (const nb of adj.get(node)!) {
      snap(
        `Look at neighbour ${nb.to} through edge ${node}${g.edges[nb.ei].dir ? ">" : "-"}${nb.to}.`,
        [L.each, L.check],
        marks({ [nb.ei]: "cmp" }),
      );
      if (!visited.has(nb.to)) {
        visited.add(nb.to);
        queue = [...queue, nb.to];
        tree.add(nb.ei);
        snap(
          `${nb.to} is new: mark it visited and enqueue it.`,
          [L.add, L.enq],
          marks(),
        );
      } else
        snap(
          `${nb.to} was already visited, skip it.`,
          [L.check],
          marks({ [nb.ei]: "rej" }),
        );
    }
    done.add(node);
    cur = null;
  }
  const missed = g.nodes.filter((n) => !visited.has(n));
  snap(
    `The queue is empty. BFS order: ${order.join(" → ")}.${missed.length ? ` Not reachable from ${g.start}: ${missed.join(", ")}.` : ""}`,
    [L.ret],
    marks(),
  );
  return steps;
}

/* ------------------------------ DFS ------------------------------ */

/** Animates depth-first search: a recursive visit with a call stack and backtracking. */
export function dfsSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, adj, steps, snap } = recorder(ops);
  const L = {
    visit: lineOf(dfsCode, "function visit(node: string): void {"),
    add: lineOf(dfsCode, "visited.add(node);"),
    order: lineOf(dfsCode, "order.push(node);"),
    each: lineOf(dfsCode, "for (const next of graph.get(node)"),
    rec: lineOf(dfsCode, "if (!visited.has(next)) visit(next);"),
    call: lineOf(dfsCode, "visit(start);"),
    ret: lineOf(dfsCode, "return order;"),
  };
  const visited = new Set<string>();
  const order: string[] = [];
  const stack: string[] = [];
  const done = new Set<string>();
  const tree = new Set<number>();

  /** Colours the nodes and tree edges and fills the call-stack and visit-order panels. */
  const marks = (extraEdge: Record<number, string> = {}): Partial<Marks> => {
    const nodeMarks: Record<string, string> = {};
    visited.forEach((n) => (nodeMarks[n] = "vis"));
    done.forEach((n) => (nodeMarks[n] = "done"));
    if (stack.length) nodeMarks[stack[stack.length - 1]] = "cur";
    nodeMarks[g.start] = nodeMarks[g.start] ?? "src";
    const edgeMarks: Record<number, string> = {};
    tree.forEach((e) => (edgeMarks[e] = "tree"));
    const panels: Panel[] = [
      {
        title: "Call stack (bottom → top)",
        cells: stack.map((n, i) =>
          cell(`visit(${n})`, i === stack.length - 1 ? "hl" : undefined),
        ),
        empty: "empty",
      },
      {
        title: "Visit order",
        cells: order.map((n) => cell(n, "ok")),
        empty: "nothing visited yet",
      },
    ];
    return { nodeMarks, edgeMarks: { ...edgeMarks, ...extraEdge }, panels };
  };

  snap(`Call visit(${g.start}) to start the recursion.`, [L.call], marks());
  /**
   * The recursive visit(node): mark it, record it, then go deeper into each unvisited neighbour.
   */
  const visit = (node: string) => {
    stack.push(node);
    visited.add(node);
    snap(`Enter visit(${node}): mark it visited.`, [L.visit, L.add], marks());
    order.push(node);
    snap(
      `Record ${node} in the order (position ${order.length}).`,
      [L.order],
      marks(),
    );
    for (const nb of adj.get(node)!) {
      snap(`Look at neighbour ${nb.to}.`, [L.each], marks({ [nb.ei]: "cmp" }));
      if (!visited.has(nb.to)) {
        tree.add(nb.ei);
        snap(
          `${nb.to} is unvisited: go deeper with visit(${nb.to}).`,
          [L.rec],
          marks(),
        );
        visit(nb.to);
        snap(
          `Back in visit(${node}) after finishing ${nb.to}. Try the next neighbour.`,
          [L.each],
          marks(),
        );
      } else
        snap(
          `${nb.to} is already visited, skip it.`,
          [L.rec],
          marks({ [nb.ei]: "rej" }),
        );
    }
    done.add(node);
    snap(
      `${node} has no unvisited neighbours left: return from visit(${node}) (backtrack).`,
      [L.each],
      marks(),
    );
    stack.pop();
  };
  visit(g.start);
  const missed = g.nodes.filter((n) => !visited.has(n));
  snap(
    `The recursion has unwound. DFS order: ${order.join(" → ")}.${missed.length ? ` Not reachable from ${g.start}: ${missed.join(", ")}.` : ""}`,
    [L.ret],
    marks(),
  );
  return steps;
}

/* ------------------------------ Dijkstra ------------------------------ */

/** Animates Dijkstra: repeatedly settle the closest unsettled node and relax its edges. */
export function dijkstraSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, adj, steps, snap } = recorder(ops);
  const L = {
    init: lineOf(
      dijkstraCode,
      "for (const node of graph.keys()) dist.set(node, Infinity);",
    ),
    src: lineOf(dijkstraCode, "dist.set(source, 0);"),
    loop: lineOf(dijkstraCode, "while (settled.size < graph.size)"),
    pick: lineOf(dijkstraCode, "if (!settled.has(candidate) &&"),
    stop: lineOf(
      dijkstraCode,
      "if (node === null || dist.get(node) === Infinity) break;",
    ),
    settle: lineOf(dijkstraCode, "settled.add(node);"),
    each: lineOf(dijkstraCode, "for (const [next, weight] of graph.get(node)"),
    cmp: lineOf(
      dijkstraCode,
      "if (dist.get(node)! + weight < dist.get(next)!)",
    ),
    set: lineOf(dijkstraCode, "dist.set(next, dist.get(node)! + weight);"),
    prev: lineOf(dijkstraCode, "prev.set(next, node);"),
    ret: lineOf(dijkstraCode, "return { dist, prev };"),
  };
  const dist = new Map<string, number>(g.nodes.map((n) => [n, Infinity]));
  dist.set(g.start, 0);
  const prev = new Map<string, { from: string; ei: number }>();
  const settled: string[] = [];
  let cur: string | null = null;

  /**
   * Colours settled and reached nodes, shows each distance under its node and fills the distance
   * and settled panels; `tree` also draws the shortest-path tree.
   */
  const marks = (
    extraEdge: Record<number, string> = {},
    extraNode: Record<string, string> = {},
    tree = false,
  ): Partial<Marks> => {
    const nodeMarks: Record<string, string> = {};
    g.nodes.forEach((n) => {
      if (dist.get(n)! !== Infinity) nodeMarks[n] = "que";
    });
    settled.forEach((n) => (nodeMarks[n] = "done"));
    if (cur) nodeMarks[cur] = "cur";
    nodeMarks[g.start] = nodeMarks[g.start] ?? "src";
    const edgeMarks: Record<number, string> = {};
    if (tree) prev.forEach((p) => (edgeMarks[p.ei] = "tree"));
    const nodeNotes: Record<string, string> = {};
    g.nodes.forEach((n) => (nodeNotes[n] = fmt(dist.get(n)!)));
    const panels: Panel[] = [
      {
        title: "Distance from " + g.start,
        cells: g.nodes.map((n) =>
          cell(
            `${n}: ${fmt(dist.get(n)!)}`,
            settled.includes(n)
              ? "ok"
              : dist.get(n)! !== Infinity
                ? "cmp"
                : "dim",
          ),
        ),
      },
      {
        title: "Settled order",
        cells: settled.map((n) => cell(n, "ok")),
        empty: "none yet",
      },
    ];
    return {
      nodeMarks: { ...nodeMarks, ...extraNode },
      nodeNotes,
      edgeMarks: { ...edgeMarks, ...extraEdge },
      panels,
    };
  };

  snap("Every distance starts at infinity.", [L.init], marks());
  snap(`The source ${g.start} is at distance 0.`, [L.src], marks());
  for (;;) {
    let node: string | null = null;
    for (const n of g.nodes)
      if (
        !settled.includes(n) &&
        (node === null || dist.get(n)! < dist.get(node)!)
      )
        node = n;
    if (node === null || dist.get(node) === Infinity) {
      snap(
        node === null
          ? "Every node is settled."
          : `The remaining nodes (${g.nodes.filter((n) => !settled.includes(n)).join(", ")}) are unreachable: their distance is still infinity.`,
        [L.stop],
        marks({}, {}, true),
      );
      break;
    }
    cur = node;
    snap(
      `Pick the unsettled node with the smallest distance: ${node} (${dist.get(node)}).`,
      [L.loop, L.pick],
      marks(),
    );
    settled.push(node);
    snap(
      `Settle ${node}: its distance ${dist.get(node)} is now final.`,
      [L.settle],
      marks(),
    );
    for (const nb of adj.get(node)!) {
      const cand = dist.get(node)! + nb.w;
      const better = cand < dist.get(nb.to)!;
      snap(
        `Relax ${node}→${nb.to}: ${dist.get(node)} + ${nb.w} = ${cand} versus current ${fmt(dist.get(nb.to)!)}${better ? ": shorter!" : ": not shorter."}`,
        [L.each, L.cmp],
        marks({ [nb.ei]: better ? "relax" : "cmp" }),
      );
      if (better) {
        dist.set(nb.to, cand);
        prev.set(nb.to, { from: node, ei: nb.ei });
        snap(
          `dist[${nb.to}] = ${cand}, reached via ${node}.`,
          [L.set, L.prev],
          marks({ [nb.ei]: "relax" }),
        );
      }
    }
    cur = null;
  }
  const paths = g.nodes
    .filter((n) => n !== g.start && dist.get(n)! !== Infinity)
    .map((n) => {
      const p = [n];
      for (let c = n; prev.has(c); c = prev.get(c)!.from)
        p.unshift(prev.get(c)!.from);
      return `${p.join("→")} (${dist.get(n)})`;
    });
  snap(
    `Done. Shortest paths highlighted.${paths.length ? " " + paths.join(", ") + "." : ""}`,
    [L.ret],
    marks({}, {}, true),
  );
  return steps;
}

/* ------------------------------ Bellman-Ford ------------------------------ */

/** Animates Bellman-Ford: relax every edge in up to V-1 passes, then check for a negative cycle. */
export function bellmanSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, steps, snap, edgeName } = recorder(ops);
  const L = {
    init: lineOf(bellmanCode, "const dist = new Map"),
    src: lineOf(bellmanCode, "dist.set(source, 0);"),
    pass: lineOf(bellmanCode, "for (let pass = 1;"),
    each: lineOf(
      bellmanCode,
      "for (const [u, v, w] of edges) {",
      lineOf(bellmanCode, "for (let pass = 1;"),
    ),
    cmp: lineOf(bellmanCode, "if (dist.get(u)! + w < dist.get(v)!) {"),
    set: lineOf(bellmanCode, "dist.set(v, dist.get(u)! + w);"),
    changed: lineOf(bellmanCode, "changed = true;"),
    stop: lineOf(bellmanCode, "if (!changed) break;"),
    check: lineOf(
      bellmanCode,
      "for (const [u, v, w] of edges) {",
      lineOf(bellmanCode, "if (!changed) break;"),
    ),
    neg: lineOf(bellmanCode, "return { dist, negativeCycle: true };"),
    ok: lineOf(bellmanCode, "return { dist, negativeCycle: false };"),
  };
  const dist = new Map<string, number>(g.nodes.map((n) => [n, Infinity]));
  dist.set(g.start, 0);
  const prevEdge = new Map<string, number>();

  /** Colours reached nodes, shows the distances and fills the distance panel. */
  const marks = (
    extraEdge: Record<number, string> = {},
    extraNode: Record<string, string> = {},
    tree = false,
  ): Partial<Marks> => {
    const nodeMarks: Record<string, string> = {};
    g.nodes.forEach((n) => {
      if (dist.get(n)! !== Infinity) nodeMarks[n] = "vis";
    });
    nodeMarks[g.start] = nodeMarks[g.start] ?? "src";
    const edgeMarks: Record<number, string> = {};
    if (tree) prevEdge.forEach((ei) => (edgeMarks[ei] = "tree"));
    const nodeNotes: Record<string, string> = {};
    g.nodes.forEach((n) => (nodeNotes[n] = fmt(dist.get(n)!)));
    const panels: Panel[] = [
      {
        title: "Distance from " + g.start,
        cells: g.nodes.map((n) =>
          cell(
            `${n}: ${fmt(dist.get(n)!)}`,
            dist.get(n)! === Infinity ? "dim" : "cmp",
          ),
        ),
      },
    ];
    return {
      nodeMarks: { ...nodeMarks, ...extraNode },
      nodeNotes,
      edgeMarks: { ...edgeMarks, ...extraEdge },
      panels,
    };
  };

  snap("Every distance starts at infinity.", [L.init], marks());
  snap(`The source ${g.start} is at distance 0.`, [L.src], marks());
  const n = g.nodes.length;
  let stable = false;
  for (let pass = 1; pass < n; pass++) {
    let changed = false;
    snap(
      `Pass ${pass} of at most ${n - 1}: relax every edge once.`,
      [L.pass],
      marks(),
    );
    g.edges.forEach((e, ei) => {
      const du = dist.get(e.a)!;
      const cand = du + (e.w ?? 0);
      const better = cand < dist.get(e.b)!;
      snap(
        du === Infinity
          ? `${edgeName(ei)}: ${e.a} is still unreached (∞), so it cannot improve ${e.b}.`
          : `${edgeName(ei)} (${e.w}): ${du} + ${e.w} = ${cand} versus dist[${e.b}] = ${fmt(dist.get(e.b)!)}${better ? ": shorter!" : ": not shorter."}`,
        [L.each, L.cmp],
        marks({ [ei]: better ? "relax" : "cmp" }),
      );
      if (better) {
        dist.set(e.b, cand);
        prevEdge.set(e.b, ei);
        changed = true;
        snap(
          `dist[${e.b}] = ${cand}.`,
          [L.set, L.changed],
          marks({ [ei]: "relax" }),
        );
      }
    });
    if (!changed) {
      stable = true;
      snap(
        `Pass ${pass} changed nothing, so the distances are final. Stop early.`,
        [L.stop],
        marks({}, {}, true),
      );
      break;
    }
  }
  snap(
    stable
      ? "Now check for negative cycles with one extra pass."
      : `${n - 1} passes done. Check for negative cycles with one extra pass: if any edge still improves, there is one.`,
    [L.check],
    marks(),
  );
  for (let ei = 0; ei < g.edges.length; ei++) {
    const e = g.edges[ei];
    const cand = dist.get(e.a)! + (e.w ?? 0);
    if (cand < dist.get(e.b)!) {
      snap(
        `${edgeName(ei)} still improves ${e.b} (${cand} < ${fmt(dist.get(e.b)!)}). A negative cycle is reachable: shortest distances are undefined.`,
        [L.neg],
        marks({ [ei]: "rej" }, { [e.a]: "bad", [e.b]: "bad" }),
      );
      return steps;
    }
    snap(
      `${edgeName(ei)} cannot improve anything.`,
      [L.check],
      marks({ [ei]: "cmp" }),
    );
  }
  snap(
    "No edge improves any more: there is no negative cycle. The distances are the shortest paths.",
    [L.ok],
    marks({}, {}, true),
  );
  return steps;
}

/* ------------------------------ Kruskal ------------------------------ */

/**
 * Animates Kruskal: go through the edges by weight, keeping each one that joins two different
 * sets.
 */
export function kruskalSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, steps, snap } = recorder(ops);
  const L = {
    index: lineOf(kruskalCode, "const index = new Map"),
    sort: lineOf(kruskalCode, "for (const edge of [...edges].sort"),
    union: lineOf(
      kruskalCode,
      "if (dsu.union(index.get(u)!, index.get(v)!)) mst.push(edge);",
    ),
    done: lineOf(kruskalCode, "if (mst.length === nodes.length - 1) break;"),
    ret: lineOf(
      kruskalCode,
      "return mst;",
      lineOf(kruskalCode, "function kruskal"),
    ),
    find: lineOf(kruskalCode, "const ra = this.find(a);"),
    same: lineOf(kruskalCode, "if (ra === rb) return false;"),
    link: lineOf(
      kruskalCode,
      "if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;",
    ),
  };
  const idx = new Map(g.nodes.map((n, i) => [n, i]));
  const parent = g.nodes.map((_, i) => i);
  /** Union-find find with path compression. */
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const order = g.edges
    .map((e, ei) => ({ e, ei }))
    .sort((a, b) => (a.e.w ?? 0) - (b.e.w ?? 0) || a.ei - b.ei);
  const status = new Map<number, "ok" | "bad">();
  const accepted: number[] = [];

  /** The current groups of nodes (the union-find sets). */
  const comps = () => {
    const groups = new Map<number, string[]>();
    g.nodes.forEach((n, i) => {
      const r = find(i);
      groups.set(r, [...(groups.get(r) ?? []), n]);
    });
    return [...groups.values()];
  };
  /**
   * Colours accepted and rejected edges and nodes in merged sets, and fills the sorted-edges and
   * components panels.
   */
  const marks = (
    extraEdge: Record<number, string> = {},
    current: number | null = null,
  ): Partial<Marks> => {
    const edgeMarks: Record<number, string> = {};
    accepted.forEach((ei) => (edgeMarks[ei] = "tree"));
    status.forEach((s, ei) => {
      if (s === "bad") edgeMarks[ei] = "rej";
    });
    const nodeMarks: Record<string, string> = {};
    comps().forEach(
      (c) => c.length > 1 && c.forEach((n) => (nodeMarks[n] = "vis")),
    );
    const panels: Panel[] = [
      {
        title: "Edges by weight",
        cells: order.map(({ e, ei }) =>
          cell(
            `${e.a}-${e.b} (${e.w})`,
            ei === current
              ? "hl"
              : status.get(ei) === "ok"
                ? "ok"
                : status.get(ei) === "bad"
                  ? "bad"
                  : undefined,
          ),
        ),
      },
      {
        title: "Components (union-find sets)",
        cells: comps().map((c) =>
          cell("{" + c.join(",") + "}", c.length > 1 ? "ok" : undefined),
        ),
      },
    ];
    return { nodeMarks, edgeMarks: { ...edgeMarks, ...extraEdge }, panels };
  };

  snap(
    `Every node starts in its own set. Sort the ${g.edges.length} edges by weight.`,
    [L.index, L.sort],
    marks(),
  );
  let total = 0;
  for (const { e, ei } of order) {
    snap(
      `Consider the cheapest remaining edge ${e.a}-${e.b} (weight ${e.w}).`,
      [L.sort],
      marks({ [ei]: "cmp" }, ei),
    );
    const ra = find(idx.get(e.a)!);
    const rb = find(idx.get(e.b)!);
    snap(
      `find(${e.a}) = set ${g.nodes[ra]}, find(${e.b}) = set ${g.nodes[rb]}.`,
      [L.find],
      marks({ [ei]: "cmp" }, ei),
    );
    if (ra === rb) {
      status.set(ei, "bad");
      snap(
        `Same set: adding ${e.a}-${e.b} would close a cycle, so reject it.`,
        [L.same],
        marks({ [ei]: "rej" }, ei),
      );
    } else {
      parent[ra] = rb;
      status.set(ei, "ok");
      accepted.push(ei);
      total += e.w ?? 0;
      snap(
        `Different sets: accept ${e.a}-${e.b} and union the sets. MST weight so far: ${total}.`,
        [L.link, L.union],
        marks({}, ei),
      );
    }
    if (accepted.length === g.nodes.length - 1) {
      snap(
        `${accepted.length} edges = nodes - 1, so the tree is complete. Stop.`,
        [L.done],
        marks(),
      );
      break;
    }
  }
  const connected = accepted.length === g.nodes.length - 1;
  snap(
    `Done. Total weight ${total}.${connected ? "" : " The graph is disconnected, so this is a minimum spanning forest."}`,
    [L.ret],
    marks(),
  );
  return steps;
}

/* ------------------------------ Prim ------------------------------ */

/** Animates Prim: grow one tree, always adding the cheapest edge that reaches a new node. */
export function primSteps(ops: ParsedOp[]): Step<GraphState>[] {
  const { g, adj, steps, snap } = recorder(ops);
  const L = {
    init: lineOf(primCode, "const inTree = new Set"),
    loop: lineOf(primCode, "while (inTree.size < graph.size)"),
    scan: lineOf(primCode, "for (const u of inTree)"),
    cand: lineOf(primCode, "if (!inTree.has(v) &&"),
    none: lineOf(primCode, "if (best === null) break;"),
    add: lineOf(primCode, "inTree.add(best[1]);"),
    push: lineOf(primCode, "mst.push(best);"),
    ret: lineOf(primCode, "return mst;"),
  };
  const inTree = new Set<string>([g.start]);
  const accepted: number[] = [];
  let total = 0;

  /** The edges that connect the tree to a node outside it, cheapest first. */
  const crossing = () => {
    const out: { ei: number; from: string; to: string; w: number }[] = [];
    inTree.forEach((u) =>
      adj
        .get(u)!
        .forEach(
          (nb) =>
            !inTree.has(nb.to) &&
            out.push({ ei: nb.ei, from: u, to: nb.to, w: nb.w }),
        ),
    );
    return out.sort((a, b) => a.w - b.w || a.ei - b.ei);
  };
  /** Colours the tree nodes and edges and fills the in-tree and candidate-edge panels. */
  const marks = (
    extraEdge: Record<number, string> = {},
    showCand = false,
  ): Partial<Marks> => {
    const nodeMarks: Record<string, string> = {};
    inTree.forEach((n) => (nodeMarks[n] = "vis"));
    nodeMarks[g.start] = "src";
    const edgeMarks: Record<number, string> = {};
    accepted.forEach((ei) => (edgeMarks[ei] = "tree"));
    if (showCand) crossing().forEach((c) => (edgeMarks[c.ei] = "cmp"));
    const cand = crossing();
    const panels: Panel[] = [
      { title: "In the tree", cells: [...inTree].map((n) => cell(n, "ok")) },
      {
        title: "Candidate edges leaving the tree (cheapest first)",
        cells: cand.map((c, i) =>
          cell(`${c.from}-${c.to} (${c.w})`, i === 0 ? "hl" : undefined),
        ),
        empty: "none",
      },
    ];
    return { nodeMarks, edgeMarks: { ...edgeMarks, ...extraEdge }, panels };
  };

  snap(`Start the tree at ${g.start}.`, [L.init], marks());
  while (inTree.size < g.nodes.length) {
    const cand = crossing();
    snap(
      `Look at every edge that connects the tree to a node outside it: ${cand.length} candidate${cand.length === 1 ? "" : "s"}.`,
      [L.loop, L.scan, L.cand],
      marks({}, true),
    );
    if (cand.length === 0) {
      snap(
        "No edge leaves the tree: the remaining nodes are unreachable, so the graph is disconnected.",
        [L.none],
        marks(),
      );
      break;
    }
    const best = cand[0];
    snap(
      `The cheapest is ${best.from}-${best.to} with weight ${best.w}.`,
      [L.cand],
      marks({ [best.ei]: "relax" }, true),
    );
    inTree.add(best.to);
    accepted.push(best.ei);
    total += best.w;
    snap(
      `Add ${best.to} and the edge ${best.from}-${best.to} to the tree. Total weight: ${total}.`,
      [L.add, L.push],
      marks(),
    );
  }
  snap(`Done. Total weight ${total}.`, [L.ret], marks());
  return steps;
}

/* ------------------------------ topics ------------------------------ */

/** Builds a graph topic description in the Graphs group. */
const tn = (
  id: string,
  title: string,
  blurb: string,
  code: string,
  syntax: string,
  complexity: Topic["complexity"],
): Topic => ({ id, title, group: "Graphs", blurb, syntax, code, complexity });

export const bfsTopic = tn(
  "bfs",
  "Breadth-First Search",
  "Explore level by level with a queue: all neighbours of the start, then their neighbours. Finds shortest paths in unweighted graphs.",
  bfsCode,
  "edges like A-B, plus an optional start node: start A",
  [
    { op: "time", time: "O(V + E)" },
    { op: "space", time: "O(V) for the queue and visited set" },
  ],
);
export const dfsTopic = tn(
  "dfs",
  "Depth-First Search",
  "Go as deep as possible before backtracking, using the recursion call stack. The basis for cycle detection, topological sort and connected components.",
  dfsCode,
  "edges like A-B, plus an optional start node: start A",
  [
    { op: "time", time: "O(V + E)" },
    { op: "space", time: "O(V) call stack depth in the worst case" },
  ],
);
export const dijkstraTopic = tn(
  "dijkstra",
  "Dijkstra's Shortest Path",
  "Repeatedly settle the closest unsettled node and relax its edges. Needs non-negative weights. This version scans for the minimum (O(V²)); a priority queue gives O((V+E) log V).",
  dijkstraCode,
  "weighted edges like A-B 4, plus start A",
  [
    {
      op: "time",
      time: "O(V²) as written, O((V + E) log V) with a binary heap",
    },
    { op: "space", time: "O(V)" },
  ],
);
export const bellmanTopic = tn(
  "bellman-ford",
  "Bellman-Ford",
  "Relax every edge up to V-1 times. Handles negative weights and detects negative cycles, which Dijkstra cannot.",
  bellmanCode,
  "directed weighted edges like A>B -3, plus start A",
  [
    { op: "time", time: "O(V · E)" },
    { op: "space", time: "O(V)" },
  ],
);
export const kruskalTopic = tn(
  "kruskal",
  "Kruskal's MST (with union-find)",
  "Sort edges by weight and keep each one that joins two different components, tracked with a disjoint-set union (path compression and union by rank).",
  kruskalCode,
  "weighted edges like A-B 4",
  [
    { op: "time", time: "O(E log E) for the sort, near-linear union-find" },
    { op: "space", time: "O(V)" },
  ],
);
export const primTopic = tn(
  "prim",
  "Prim's MST",
  "Grow one tree from a start node, always adding the cheapest edge that reaches a new node.",
  primCode,
  "weighted edges like A-B 4, plus start A",
  [
    {
      op: "time",
      time: "O(V · E) as written, O(E log V) with a priority queue",
    },
    { op: "space", time: "O(V)" },
  ],
);

export const parseBfs = graphParser({
  weighted: false,
  directed: false,
  start: true,
});
export const parseDijkstra = graphParser({
  weighted: true,
  directed: false,
  start: true,
});
export const parseBellman = graphParser({
  weighted: true,
  directed: true,
  negative: true,
  start: true,
});
export const parseMst = graphParser({ weighted: true, directed: false });
export const parsePrim = graphParser({
  weighted: true,
  directed: false,
  start: true,
});

const unw: Preset[] = [
  {
    name: "Basics",
    desc: "Six nodes with a cycle.",
    input: "A-B, A-C, B-D, C-D, D-E, C-F, start A",
  },
  {
    name: "Disconnected",
    desc: "D and E are not reachable from A.",
    input: "A-B, B-C, D-E, start A",
  },
  {
    name: "Tree",
    desc: "No cycles: compare the visit order of BFS and DFS.",
    input: "A-B, A-C, B-D, B-E, C-F, C-G, E-H, start A",
  },
  {
    name: "Dense (10 nodes, 16 edges)",
    desc: "Many cycles and shortcuts.",
    input:
      "A-B, A-C, A-D, B-E, B-F, C-F, C-G, D-G, D-H, E-I, F-I, F-J, G-J, H-J, I-J, E-F, start A",
  },
];

const wt: Preset[] = [
  {
    name: "Classic",
    desc: "Six nodes; the cheapest route is not the fewest hops.",
    input:
      "A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3, start A",
  },
  {
    name: "Detour beats direct",
    desc: "The direct edge A-D (20) loses to a longer path of cheap edges.",
    input: "A-D 20, A-B 3, B-C 4, C-D 5, B-D 12, start A",
  },
  {
    name: "Unreachable node",
    desc: "Node F sits in a separate component.",
    input: "A-B 2, B-C 3, A-C 7, C-D 1, E-F 4, start A",
  },
  {
    name: "Larger (9 nodes)",
    desc: "A busier weighted graph.",
    input:
      "A-B 7, A-C 9, A-F 14, B-C 10, B-D 15, C-D 11, C-F 2, D-E 6, E-F 9, E-G 3, F-H 5, G-H 8, H-I 1, G-I 4, start A",
  },
];

export const bfsPresets = unw;
export const dfsPresets = unw;
export const dijkstraPresets = wt;
export const primPresets = wt.map((p) => p);
export const kruskalPresets: Preset[] = wt.map((p) => ({
  ...p,
  input: p.input.replace(/,\s*start [A-Za-z0-9]+/, ""),
}));
export const bellmanPresets: Preset[] = [
  {
    name: "Negative edge",
    desc: "B>C is -3: a shorter route exists through it.",
    input: "A>B 4, A>C 5, B>C -3, C>D 4, D>E 2, B>E 9, start A",
  },
  {
    name: "Negative cycle",
    desc: "B>C>D>B adds up to -1, so distances keep shrinking.",
    input: "A>B 1, B>C -3, C>D 1, D>B 1, D>E 5, start A",
  },
  {
    name: "All positive",
    desc: "Works like Dijkstra, and stops early when a pass changes nothing.",
    input: "A>B 2, A>C 5, B>C 1, B>D 4, C>D 1, D>E 3, start A",
  },
  {
    name: "Unreachable part",
    desc: "Edges from E and F cannot improve unreached nodes.",
    input: "A>B 3, B>C 2, E>F -1, F>C 1, start A",
  },
];

// Keep the sort stable for the preset edge cases
export const graphTopics = {
  bfs: { topic: bfsTopic, presets: bfsPresets, parse: parseBfs, run: bfsSteps },
  dfs: { topic: dfsTopic, presets: dfsPresets, parse: parseBfs, run: dfsSteps },
  dijkstra: {
    topic: dijkstraTopic,
    presets: dijkstraPresets,
    parse: parseDijkstra,
    run: dijkstraSteps,
  },
  bellman: {
    topic: bellmanTopic,
    presets: bellmanPresets,
    parse: parseBellman,
    run: bellmanSteps,
  },
  kruskal: {
    topic: kruskalTopic,
    presets: kruskalPresets,
    parse: parseMst,
    run: kruskalSteps,
  },
  prim: {
    topic: primTopic,
    presets: primPresets,
    parse: parsePrim,
    run: primSteps,
  },
};
