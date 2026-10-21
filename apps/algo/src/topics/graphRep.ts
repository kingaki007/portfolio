import type { Step, Topic } from "../engine/types";
import {
  splitOps,
  type ParseResult,
  type ParsedOp,
  type Preset,
} from "../engine/parse";
import { lineOf } from "../engine/lines";
import { MAX_EDGES, MAX_NODES, type GEdge, type GraphState } from "./graph";

export interface RepState {
  graph: GraphState;
  list: { node: string; items: { to: string; w: number }[] }[];
  mat: { nodes: string[]; cells: (number | null)[][] };
  hash: { key: string; entries: { to: string; w: number }[] }[];
  hl: {
    listNode?: string;
    listItems?: string[];
    cells?: string[];
    row?: number;
    hashKey?: string;
    hashItems?: string[];
  };
  cost: string;
}

const code = `class AdjacencyList {
  private lists = new Map<string, [string, number][]>();

  addNode(node: string): void {
    if (!this.lists.has(node)) this.lists.set(node, []);
  }

  addEdge(a: string, b: string, w = 1, directed = false): void {
    this.addNode(a);
    this.addNode(b);
    this.lists.get(a)!.push([b, w]);
    if (!directed) this.lists.get(b)!.push([a, w]);
  }

  removeEdge(a: string, b: string, directed = false): void {
    this.lists.set(a, (this.lists.get(a) ?? []).filter(([n]) => n !== b));
    if (!directed) this.lists.set(b, (this.lists.get(b) ?? []).filter(([n]) => n !== a));
  }

  hasEdge(a: string, b: string): boolean {
    for (const [n] of this.lists.get(a) ?? []) {
      if (n === b) return true;
    }
    return false;
  }

  neighbors(a: string): string[] {
    return (this.lists.get(a) ?? []).map(([n]) => n);
  }
}

class AdjacencyMatrix {
  private index = new Map<string, number>();
  private cells: (number | null)[][] = [];

  addNode(node: string): void {
    if (this.index.has(node)) return;
    this.index.set(node, this.cells.length);
    for (const row of this.cells) row.push(null);
    this.cells.push(new Array(this.cells.length + 1).fill(null));
  }

  addEdge(a: string, b: string, w = 1, directed = false): void {
    this.addNode(a);
    this.addNode(b);
    const i = this.index.get(a)!;
    const j = this.index.get(b)!;
    this.cells[i][j] = w;
    if (!directed) this.cells[j][i] = w;
  }

  removeEdge(a: string, b: string, directed = false): void {
    const i = this.index.get(a);
    const j = this.index.get(b);
    if (i === undefined || j === undefined) return;
    this.cells[i][j] = null;
    if (!directed) this.cells[j][i] = null;
  }

  hasEdge(a: string, b: string): boolean {
    const i = this.index.get(a);
    const j = this.index.get(b);
    return i !== undefined && j !== undefined && this.cells[i][j] !== null;
  }

  neighbors(a: string): string[] {
    const i = this.index.get(a);
    if (i === undefined) return [];
    const out: string[] = [];
    for (const [node, j] of this.index) {
      if (this.cells[i][j] !== null) out.push(node);
    }
    return out;
  }
}

class AdjacencyMap {
  private map = new Map<string, Map<string, number>>();

  addNode(node: string): void {
    if (!this.map.has(node)) this.map.set(node, new Map());
  }

  addEdge(a: string, b: string, w = 1, directed = false): void {
    this.addNode(a);
    this.addNode(b);
    this.map.get(a)!.set(b, w);
    if (!directed) this.map.get(b)!.set(a, w);
  }

  removeEdge(a: string, b: string, directed = false): void {
    this.map.get(a)?.delete(b);
    if (!directed) this.map.get(b)?.delete(a);
  }

  hasEdge(a: string, b: string): boolean {
    return this.map.get(a)?.has(b) ?? false;
  }

  neighbors(a: string): string[] {
    return [...(this.map.get(a)?.keys() ?? [])];
  }
}`;

export const repCode = code;

export const repTopic: Topic = {
  id: "graph-representations",
  title: "Graph representations",
  group: "Graphs",
  blurb:
    "The same graph stored three ways: adjacency list, adjacency matrix, and a hash map of hash maps. Add, remove and query edges and compare what each structure has to touch.",
  syntax: "A-B 4 (add), A>B (add directed), remove A-B, has A-B, neighbors A",
  code,
  complexity: [
    { op: "space", time: "list O(V + E), matrix O(V²), hash map O(V + E)" },
    { op: "hasEdge(a, b)", time: "list O(degree), matrix O(1), hash map O(1)" },
    {
      op: "neighbors(a)",
      time: "list O(degree), matrix O(V), hash map O(degree)",
    },
    {
      op: "addEdge",
      time: "O(1) in all three (matrix: O(V) when a node is added)",
    },
  ],
};

const NODE = "[A-Za-z0-9]{1,3}";
const EDGE = new RegExp(`^(${NODE})\\s*([->])\\s*(${NODE})(?:\\s+(-?\\d+))?$`);

export function parseRep(input: string): ParseResult {
  const tokens = splitOps(input);
  if (tokens.length === 0)
    return { error: "Enter at least one operation, like A-B 4." };
  const ops: ParsedOp[] = [];
  const nodes = new Set<string>();
  let edgeCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const label = `Item ${i + 1} ("${t}")`;
    const nb = new RegExp(`^neighbors\\s+(${NODE})$`, "i").exec(t);
    if (nb) {
      ops.push({ op: "neighbors", names: [nb[1]] });
      continue;
    }
    const m = /^(remove|has)\s+(.*)$/i.exec(t);
    const kind = m ? m[1].toLowerCase() : "add";
    const e = EDGE.exec(m ? m[2].trim() : t);
    if (!e)
      return {
        error: `${label}: use "A-B 4" to add, "remove A-B", "has A-B" or "neighbors A".`,
      };
    const [, a, sym, b, w] = e;
    if (a === b) return { error: `${label}: self-loops are not supported.` };
    if (kind !== "add" && w !== undefined)
      return { error: `${label}: ${kind} takes no weight.` };
    const weight = w === undefined ? undefined : Number(w);
    if (weight !== undefined && Math.abs(weight) > 999)
      return { error: `${label}: keep weights between -999 and 999.` };
    if (kind === "add") {
      nodes.add(a);
      nodes.add(b);
      edgeCount++;
      if (nodes.size > MAX_NODES)
        return { error: `Too many nodes (max ${MAX_NODES}).` };
      if (edgeCount > MAX_EDGES)
        return { error: `Too many edges (max ${MAX_EDGES}).` };
    }
    ops.push({
      op: kind + (sym === ">" ? "Dir" : ""),
      names: [a, b],
      ...(weight === undefined ? {} : { value: weight, args: [weight] }),
    });
  }
  return { ops };
}

const inClass = (cls: string, needle: string) =>
  lineOf(code, needle, lineOf(code, `class ${cls}`));
const LL = {
  list: {
    node: inClass(
      "AdjacencyList",
      "if (!this.lists.has(node)) this.lists.set(node, []);",
    ),
    push: inClass("AdjacencyList", "this.lists.get(a)!.push([b, w]);"),
    pushB: inClass(
      "AdjacencyList",
      "if (!directed) this.lists.get(b)!.push([a, w]);",
    ),
    remove: inClass(
      "AdjacencyList",
      "this.lists.set(a, (this.lists.get(a) ?? []).filter",
    ),
    has: inClass("AdjacencyList", "for (const [n] of this.lists.get(a) ?? [])"),
    hasCmp: inClass("AdjacencyList", "if (n === b) return true;"),
    hasNo: inClass("AdjacencyList", "return false;"),
    nb: inClass(
      "AdjacencyList",
      "return (this.lists.get(a) ?? []).map(([n]) => n);",
    ),
  },
  mat: {
    node: inClass(
      "AdjacencyMatrix",
      "this.cells.push(new Array(this.cells.length + 1).fill(null));",
    ),
    set: inClass("AdjacencyMatrix", "this.cells[i][j] = w;"),
    setB: inClass("AdjacencyMatrix", "if (!directed) this.cells[j][i] = w;"),
    remove: inClass("AdjacencyMatrix", "this.cells[i][j] = null;"),
    has: inClass(
      "AdjacencyMatrix",
      "return i !== undefined && j !== undefined && this.cells[i][j] !== null;",
    ),
    nbLoop: inClass("AdjacencyMatrix", "for (const [node, j] of this.index) {"),
    nbCmp: inClass(
      "AdjacencyMatrix",
      "if (this.cells[i][j] !== null) out.push(node);",
    ),
  },
  hash: {
    node: inClass(
      "AdjacencyMap",
      "if (!this.map.has(node)) this.map.set(node, new Map());",
    ),
    set: inClass("AdjacencyMap", "this.map.get(a)!.set(b, w);"),
    setB: inClass("AdjacencyMap", "if (!directed) this.map.get(b)!.set(a, w);"),
    remove: inClass("AdjacencyMap", "this.map.get(a)?.delete(b);"),
    has: inClass("AdjacencyMap", "return this.map.get(a)?.has(b) ?? false;"),
    nb: inClass("AdjacencyMap", "return [...(this.map.get(a)?.keys() ?? [])];"),
  },
};

export function repSteps(ops: ParsedOp[]): Step<RepState>[] {
  let edges: GEdge[] = [];
  const nodes: string[] = [];
  const list = new Map<string, { to: string; w: number }[]>();
  const matNodes: string[] = [];
  let cells: (number | null)[][] = [];
  const hash = new Map<string, Map<string, number>>();
  const steps: Step<RepState>[] = [];
  let opIdx = -1;

  const snap = (
    note: string,
    lines: number[],
    hl: RepState["hl"] = {},
    cost = "",
    edgeMarks: Record<number, string> = {},
  ) =>
    steps.push({
      state: {
        graph: {
          nodes: [...nodes],
          edges: [...edges],
          nodeMarks: {},
          nodeNotes: {},
          edgeMarks,
          panels: [],
        },
        list: [...list].map(([node, items]) => ({
          node,
          items: items.map((x) => ({ ...x })),
        })),
        mat: { nodes: [...matNodes], cells: cells.map((r) => [...r]) },
        hash: [...hash].map(([key, m]) => ({
          key,
          entries: [...m].map(([to, w]) => ({ to, w })),
        })),
        hl,
        cost,
      },
      lines,
      note,
      op: opIdx,
    });

  snap("An empty graph in all three representations. Press play.", []);

  const addNodeEverywhere = (n: string) => {
    if (!nodes.includes(n)) nodes.push(n);
  };

  const add = (a: string, b: string, w: number, dir: boolean) => {
    addNodeEverywhere(a);
    addNodeEverywhere(b);
    const ei = edges.length;
    edges = [...edges, { a, b, w: w === 1 ? null : w, dir }];
    // 1. adjacency list
    if (!list.has(a)) list.set(a, []);
    if (!list.has(b)) list.set(b, []);
    list.get(a)!.push({ to: b, w });
    if (!dir) list.get(b)!.push({ to: a, w });
    snap(
      `Adjacency list: append ${b} to the list of ${a}${dir ? "" : ` and ${a} to the list of ${b}`}. Cost: O(1).`,
      [LL.list.push, ...(dir ? [] : [LL.list.pushB])],
      { listNode: a, listItems: [`${a}>${b}`, ...(dir ? [] : [`${b}>${a}`])] },
      "",
      { [ei]: "tree" },
    );
    // 2. matrix
    for (const n of [a, b]) {
      if (!matNodes.includes(n)) {
        matNodes.push(n);
        cells = cells.map((r) => [...r, null]);
        cells.push(Array(matNodes.length).fill(null));
      }
    }
    const i = matNodes.indexOf(a);
    const j = matNodes.indexOf(b);
    cells[i][j] = w;
    if (!dir) cells[j][i] = w;
    snap(
      `Adjacency matrix: set cell [${a}][${b}] = ${w}${dir ? "" : ` and [${b}][${a}] = ${w}`}. ${matNodes.length === 2 && ei === 0 ? "" : "New nodes grow the matrix by a row and a column. "}Cost: O(1) per edge.`,
      [LL.mat.node, LL.mat.set, ...(dir ? [] : [LL.mat.setB])],
      { cells: [`${i},${j}`, ...(dir ? [] : [`${j},${i}`])] },
      "",
      { [ei]: "tree" },
    );
    // 3. hash map
    if (!hash.has(a)) hash.set(a, new Map());
    if (!hash.has(b)) hash.set(b, new Map());
    hash.get(a)!.set(b, w);
    if (!dir) hash.get(b)!.set(a, w);
    snap(
      `Hash map: map.get("${a}").set("${b}", ${w})${dir ? "" : ` and the reverse`}. Cost: O(1).`,
      [LL.hash.set, ...(dir ? [] : [LL.hash.setB])],
      { hashKey: a, hashItems: [`${a}>${b}`, ...(dir ? [] : [`${b}>${a}`])] },
      "",
      { [ei]: "tree" },
    );
  };

  const exists = (a: string, b: string) => !!hash.get(a)?.has(b);

  const remove = (a: string, b: string, dir: boolean) => {
    if (!exists(a, b)) {
      snap(
        `There is no edge ${a}${dir ? ">" : "-"}${b}, so every representation is left unchanged.`,
        [LL.list.remove, LL.mat.remove, LL.hash.remove],
      );
      return;
    }
    const ei = edges.findIndex(
      (e) => (e.a === a && e.b === b) || (!e.dir && e.a === b && e.b === a),
    );
    snap(
      `Remove ${a}${dir ? ">" : "-"}${b}.`,
      [],
      {},
      "",
      ei >= 0 ? { [ei]: "rej" } : {},
    );
    list.set(
      a,
      (list.get(a) ?? []).filter((x) => x.to !== b),
    );
    if (!dir)
      list.set(
        b,
        (list.get(b) ?? []).filter((x) => x.to !== a),
      );
    snap(
      `Adjacency list: filter ${b} out of ${a}'s list${dir ? "" : ` and ${a} out of ${b}'s list`}. Cost: O(degree) to scan the list.`,
      [LL.list.remove],
      { listNode: a },
    );
    const i = matNodes.indexOf(a);
    const j = matNodes.indexOf(b);
    cells[i][j] = null;
    if (!dir) cells[j][i] = null;
    snap(
      `Adjacency matrix: clear cell [${a}][${b}]${dir ? "" : ` and [${b}][${a}]`}. Cost: O(1).`,
      [LL.mat.remove],
      { cells: [`${i},${j}`, ...(dir ? [] : [`${j},${i}`])] },
    );
    hash.get(a)!.delete(b);
    if (!dir) hash.get(b)!.delete(a);
    edges = edges.filter((_, k) => k !== ei);
    snap(
      `Hash map: delete "${b}" from the inner map of "${a}"${dir ? "" : " and the reverse"}. Cost: O(1).`,
      [LL.hash.remove],
      { hashKey: a },
    );
  };

  const has = (a: string, b: string, dir: boolean) => {
    const dirLabel = `${a}${dir ? ">" : "-"}${b}`;
    const chain = list.get(a) ?? [];
    let scanned = 0;
    let foundList = false;
    for (const x of chain) {
      scanned++;
      if (x.to === b) {
        foundList = true;
        break;
      }
    }
    snap(
      chain.length === 0
        ? `Adjacency list: ${a} has an empty list, so ${dirLabel} is not there (0 entries scanned).`
        : `Adjacency list: scan ${a}'s list: ${scanned} of ${chain.length} entr${chain.length === 1 ? "y" : "ies"} compared, ${foundList ? "found" : "not found"}. Cost: O(degree).`,
      [LL.list.has, foundList ? LL.list.hasCmp : LL.list.hasNo],
      { listNode: a, listItems: foundList ? [`${a}>${b}`] : [] },
      `list: ${scanned} compared · matrix: 1 cell · hash map: 1 lookup`,
    );
    const i = matNodes.indexOf(a);
    const j = matNodes.indexOf(b);
    const hit = i >= 0 && j >= 0 && cells[i][j] !== null;
    snap(
      `Adjacency matrix: read one cell, [${a}][${b}] = ${i >= 0 && j >= 0 ? (cells[i][j] ?? "empty") : "no such node"}. ${hit ? "Edge exists." : "No edge."} Cost: O(1) however many nodes there are.`,
      [LL.mat.has],
      i >= 0 && j >= 0 ? { cells: [`${i},${j}`] } : {},
      `list: ${scanned} compared · matrix: 1 cell · hash map: 1 lookup`,
    );
    snap(
      `Hash map: map.get("${a}")?.has("${b}") is ${exists(a, b)}. Cost: O(1) average.`,
      [LL.hash.has],
      hash.has(a)
        ? { hashKey: a, hashItems: exists(a, b) ? [`${a}>${b}`] : [] }
        : {},
      `list: ${scanned} compared · matrix: 1 cell · hash map: 1 lookup`,
    );
  };

  const neighbors = (a: string) => {
    const nbs = (list.get(a) ?? []).map((x) => x.to);
    snap(
      `Adjacency list: read ${a}'s list directly: ${nbs.length ? nbs.join(", ") : "no neighbours"}. Cost: O(degree) = ${nbs.length}.`,
      [LL.list.nb],
      { listNode: a, listItems: nbs.map((n) => `${a}>${n}`) },
      `list: ${nbs.length} entries · matrix: ${matNodes.length} cells · hash map: ${nbs.length} entries`,
    );
    const i = matNodes.indexOf(a);
    snap(
      `Adjacency matrix: scan the whole row of ${a}: ${matNodes.length} cell${matNodes.length === 1 ? "" : "s"} checked to find ${nbs.length} neighbour${nbs.length === 1 ? "" : "s"}. Cost: O(V).`,
      [LL.mat.nbLoop, LL.mat.nbCmp],
      i >= 0
        ? {
            row: i,
            cells: matNodes
              .map((n, j) => (cells[i][j] !== null ? `${i},${j}` : ""))
              .filter(Boolean),
          }
        : {},
      `list: ${nbs.length} entries · matrix: ${matNodes.length} cells · hash map: ${nbs.length} entries`,
    );
    snap(
      `Hash map: map.get("${a}") returns the inner map in one lookup; its keys are the neighbours. Cost: O(degree).`,
      [LL.hash.nb],
      hash.has(a) ? { hashKey: a, hashItems: nbs.map((n) => `${a}>${n}`) } : {},
      `list: ${nbs.length} entries · matrix: ${matNodes.length} cells · hash map: ${nbs.length} entries`,
    );
  };

  ops.forEach((o, k) => {
    opIdx = k;
    const dir = o.op.endsWith("Dir");
    const kind = o.op.replace("Dir", "");
    if (kind === "add") add(o.names![0], o.names![1], o.value ?? 1, dir);
    else if (kind === "remove") remove(o.names![0], o.names![1], dir);
    else if (kind === "has") has(o.names![0], o.names![1], dir);
    else neighbors(o.names![0]);
  });
  return steps;
}

export const repPresets: Preset[] = [
  {
    name: "Basics",
    desc: "Build a small undirected graph, then query it.",
    input:
      "A-B, A-C, B-D, C-D, has A-B, has A-D, neighbors A, remove A-B, has A-B",
  },
  {
    name: "Weighted and directed",
    desc: "Directed edges with weights: direction matters for lookups.",
    input:
      "A>B 4, B>C 2, C>A 7, A>D 1, has B>A, has A>B, neighbors C, remove A>B, has A>B",
  },
  {
    name: "Hub node",
    desc: "One node with many neighbours: the list gets long, the matrix scan is still V wide.",
    input:
      "H-A, H-B, H-C, H-D, H-E, H-F, A-B, has H-F, has H-A, neighbors H, neighbors A, has A-F",
  },
  {
    name: "Missing things (edge cases)",
    desc: "Remove or query edges that do not exist.",
    input:
      "A-B, remove A-C, has A-C, has X-Y, neighbors Z, remove A-B, neighbors A",
  },
];
