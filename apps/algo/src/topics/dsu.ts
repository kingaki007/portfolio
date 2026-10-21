import type { Step, Topic } from "../engine/types";
import {
  parseOps,
  seq,
  type ParseResult,
  type ParsedOp,
  type Preset,
} from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks } from "../components/TreeViz";

export const DSU_SIZE = 8;

export interface DsuState {
  parent: number[];
  rank: number[];
  marks: Marks;
}

const code = `class DisjointSet {
  private parent: number[];
  private rank: number[];
  private count: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
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
    this.count--;
    return true;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  components(): number {
    return this.count;
  }
}`;

export const dsuCode = code;

export const dsuTopic: Topic = {
  id: "dsu",
  title: "Disjoint Set Union (union-find)",
  group: "Graphs",
  blurb: `Tracks which of ${DSU_SIZE} elements (0 to ${DSU_SIZE - 1}) belong to the same group. Union by rank keeps trees shallow and path compression flattens them on every find.`,
  syntax: "union <a> <b>, find <a>, connected <a> <b>, components",
  code,
  complexity: [
    { op: "find / union / connected", time: "O(α(n)), effectively constant" },
    { op: "components", time: "O(1)" },
    { op: "space", time: "O(n)" },
  ],
};

export function parseDsu(input: string): ParseResult {
  const r = parseOps(input, { union: 2, find: 1, connected: 2, components: 0 });
  if ("error" in r) return r;
  for (let i = 0; i < r.ops.length; i++) {
    for (const a of r.ops[i].args ?? []) {
      if (a < 0 || a >= DSU_SIZE)
        return {
          error: `Operation ${i + 1}: elements are 0 to ${DSU_SIZE - 1}, got ${a}.`,
        };
    }
  }
  return r;
}

const L = {
  findIf: lineOf(code, "if (this.parent[x] !== x) {"),
  findRec: lineOf(code, "this.parent[x] = this.find(this.parent[x]);"),
  findRet: lineOf(code, "return this.parent[x];"),
  uA: lineOf(code, "const ra = this.find(a);"),
  uB: lineOf(code, "const rb = this.find(b);"),
  same: lineOf(code, "if (ra === rb) return false;"),
  lessRank: lineOf(
    code,
    "if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;",
  ),
  moreRank: lineOf(
    code,
    "else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;",
  ),
  tie: lineOf(code, "this.parent[rb] = ra;", lineOf(code, "else {")),
  bump: lineOf(code, "this.rank[ra]++;"),
  count: lineOf(code, "this.count--;"),
  connected: lineOf(code, "return this.find(a) === this.find(b);"),
  components: lineOf(code, "return this.count;"),
};

export function dsuSteps(ops: ParsedOp[]): Step<DsuState>[] {
  const parent = Array.from({ length: DSU_SIZE }, (_, i) => i);
  const rank = Array<number>(DSU_SIZE).fill(0);
  let count = DSU_SIZE;
  let opIdx = -1;
  const steps: Step<DsuState>[] = [];
  const snap = (note: string, lines: number[], marks: Marks = {}) =>
    steps.push({
      state: { parent: [...parent], rank: [...rank], marks },
      lines,
      note,
      op: opIdx,
    });

  snap(
    `${DSU_SIZE} elements, each alone in its own set (parent[i] = i, rank 0). Press play.`,
    [],
  );

  /** find with the same path-compression behaviour as the code, one frame per move */
  const find = (x: number, quiet = false): number => {
    const path = [x];
    while (parent[path[path.length - 1]] !== path[path.length - 1]) {
      const cur = path[path.length - 1];
      if (!quiet)
        snap(
          `find(${cur}): parent[${cur}] = ${parent[cur]} is not ${cur}, so climb to ${parent[cur]}.`,
          [L.findIf, L.findRec],
          { [cur]: "cmp" },
        );
      path.push(parent[cur]);
    }
    const root = path[path.length - 1];
    if (!quiet)
      snap(
        `${root} is its own parent: it is the root (representative) of this set.`,
        [L.findIf, L.findRet],
        { [root]: "found" },
      );
    // unwinding: every node on the path (except root and its direct child) is re-pointed at the root
    for (let i = path.length - 3; i >= 0; i--) {
      const node = path[i];
      if (parent[node] !== root) {
        parent[node] = root;
        snap(
          `Path compression: parent[${node}] = ${root}. Next time ${node} is one hop from the root.`,
          [L.findRec],
          { [node]: "swap", [root]: "found" },
        );
      }
    }
    return root;
  };

  ops.forEach((o, k) => {
    opIdx = k;
    if (o.op === "find") {
      const x = o.args![0];
      const r = find(x);
      snap(`find(${x}) returns ${r}.`, [L.findRet], {
        [r]: "found",
        [x]: "cmp",
      });
    } else if (o.op === "union") {
      const [a, b] = o.args!;
      snap(
        `union(${a}, ${b}): first find the root of each element.`,
        [L.uA, L.uB],
        { [a]: "cmp", [b]: "cmp" },
      );
      const ra = find(a);
      const rb = find(b);
      snap(
        `Roots: ${a} is in the set of ${ra}, ${b} is in the set of ${rb}.`,
        [L.uB],
        { [ra]: "found", [rb]: "found" },
      );
      if (ra === rb) {
        snap(
          `Same root, so ${a} and ${b} are already in one set. Nothing to merge (returns false).`,
          [L.same],
          { [ra]: "found" },
        );
        return;
      }
      if (rank[ra] < rank[rb]) {
        parent[ra] = rb;
        snap(
          `rank[${ra}] = ${rank[ra]} < rank[${rb}] = ${rank[rb]}: attach the shorter tree ${ra} under ${rb}.`,
          [L.lessRank],
          { [ra]: "swap", [rb]: "found" },
        );
      } else if (rank[ra] > rank[rb]) {
        parent[rb] = ra;
        snap(
          `rank[${ra}] = ${rank[ra]} > rank[${rb}] = ${rank[rb]}: attach ${rb} under ${ra}.`,
          [L.moreRank],
          { [rb]: "swap", [ra]: "found" },
        );
      } else {
        parent[rb] = ra;
        snap(`Equal ranks (${rank[ra]}): attach ${rb} under ${ra}.`, [L.tie], {
          [rb]: "swap",
          [ra]: "found",
        });
        rank[ra]++;
        snap(
          `The merged tree got taller: rank[${ra}] = ${rank[ra]}.`,
          [L.bump],
          { [ra]: "found" },
        );
      }
      count--;
      snap(`${count} separate set${count === 1 ? "" : "s"} remain.`, [L.count]);
    } else if (o.op === "connected") {
      const [a, b] = o.args!;
      const ra = find(a);
      const rb = find(b);
      snap(
        `find(${a}) = ${ra}, find(${b}) = ${rb}: ${ra === rb ? "same root, they are connected." : "different roots, they are not connected."}`,
        [L.connected],
        {
          [ra]: ra === rb ? "found" : "cmp",
          [rb]: ra === rb ? "found" : "cmp",
        },
      );
    } else
      snap(
        `components() returns the counter: ${count} set${count === 1 ? "" : "s"}.`,
        [L.components],
      );
  });
  return steps;
}

export const dsuPresets: Preset[] = [
  {
    name: "Basics",
    desc: "Merge a few pairs, then ask who is connected.",
    input:
      "union 0 1, union 2 3, union 0 2, find 3, connected 1 3, connected 0 7, components",
  },
  {
    name: "Path compression",
    desc: "Build a taller tree, then find from a deep node to see it flatten.",
    input:
      "union 0 1, union 2 3, union 0 2, union 4 5, union 6 7, union 4 6, union 0 4, find 3, find 7, find 7",
  },
  {
    name: "Edge cases",
    desc: "Repeat unions, union with self, queries on untouched elements.",
    input:
      "connected 0 1, union 3 3, union 1 2, union 2 1, union 1 2, find 5, components, union 5 6, connected 5 6",
  },
  {
    name: "Everything joined (30 ops)",
    desc: "A long mix that ends with all 8 elements in one set.",
    input: [
      ...seq(7, (i) => `union ${i} ${i + 1}`),
      "components",
      ...seq(8, (i) => `find ${(i * 3) % 8}`),
      ...seq(7, (i) => `connected ${i} ${7 - i}`),
      "components",
    ].join(", "),
  },
];

export function dsuForest(s: DsuState) {
  const kids = new Map<number, number[]>();
  s.parent.forEach((p, i) => {
    if (p !== i) kids.set(p, [...(kids.get(p) ?? []), i]);
  });
  const build = (i: number): import("../components/NaryViz").NNode => ({
    id: i,
    label: String(i),
    sub: s.parent[i] === i ? `rank ${s.rank[i]}` : undefined,
    kids: (kids.get(i) ?? []).map(build),
  });
  return s.parent
    .map((_, i) => i)
    .filter((i) => s.parent[i] === i)
    .map(build);
}
