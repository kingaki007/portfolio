/**
 * Tests for the graph topics: the edge-list parser, BFS and DFS, Dijkstra and Bellman-Ford,
 * Kruskal and Prim, union-find and the three representations, each compared with the displayed
 * code.
 */

import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { buildGraph, adjacency, graphParser } from "../src/topics/graph";
import { graphCode, graphTopics } from "../src/topics/graphAlgos";
import { dsuCode, dsuSteps, parseDsu, DSU_SIZE } from "../src/topics/dsu";
import { parseRep, repCode, repSteps } from "../src/topics/graphRep";
import type { ParsedOp } from "../src/engine/parse";

/**
 * Compiles the TypeScript shown to the user and returns the named class or function, so the tests
 * run exactly that code.
 */
function load<T = any>(code: string, name: string): T {
  const js = transformSync(code, { loader: "ts" }).code;
  return new Function(`${js}\nreturn ${name};`)() as T;
}
/** Unwraps a parse result, failing the test with the parser's message on an error. */
const ok = (r: { ops: ParsedOp[] } | { error: string }) => {
  if ("error" in r) throw new Error(r.error);
  return r.ops;
};
/** Cell texts of the state panel whose title starts with `title`. */
const panel = (state: any, title: string) =>
  state.panels
    .find((p: any) => p.title.startsWith(title))
    ?.cells.map((c: any) => c.text) as string[];

/** the real code wants Map<string, string[]> / Map<string, [string, number][]> */
function toMaps(ops: ParsedOp[]) {
  const g = buildGraph(ops);
  const adj = adjacency(g);
  const plain = new Map<string, string[]>();
  const weighted = new Map<string, [string, number][]>();
  for (const [n, list] of adj) {
    plain.set(
      n,
      list.map((x) => x.to),
    );
    weighted.set(
      n,
      list.map((x) => [x.to, x.w]),
    );
  }
  return {
    g,
    plain,
    weighted,
    edges: g.edges.map((e) => [e.a, e.b, e.w ?? 1] as [string, string, number]),
  };
}

describe("graph parser", () => {
  const p = graphParser({ weighted: true, directed: false, start: true });
  it("accepts good input", () =>
    expect("ops" in p("A-B 4, B-C 2, start A")).toBe(true));
  it("rejects junk with a helpful message", () => {
    for (const bad of [
      "",
      "A-B",
      "A>B 3",
      "A-A 3",
      "A-B x",
      "A-B -2",
      "A-B 3, A-B 4",
      "A-B 3, B-A 4",
      "start A",
      "A-B 3, start Q",
      "A-B 3, start A, start B",
      "toolong-B 3",
    ]) {
      expect("error" in p(bad)).toBe(true);
    }
  });
  it("directed and unweighted variants", () => {
    expect(
      "ops" in
        graphParser({ weighted: true, directed: true, negative: true })(
          "A>B -3",
        ),
    ).toBe(true);
    expect(
      "error" in
        graphParser({ weighted: false, directed: false, start: true })("A-B 3"),
    ).toBe(true);
  });
});

describe("every graph preset parses, runs and highlights valid code lines", () => {
  for (const [id, t] of Object.entries(graphTopics)) {
    for (const p of t.presets) {
      it(`${id} / ${p.name}`, () => {
        const ops = ok(t.parse(p.input));
        const steps = t.run(ops);
        const n = t.topic.code.split("\n").length;
        expect(steps.length).toBeGreaterThan(2);
        for (const s of steps) {
          expect(s.note.length).toBeGreaterThan(0);
          for (const l of s.lines) expect(l >= 1 && l <= n).toBe(true);
        }
      });
    }
  }
});

describe("BFS and DFS agree with the code on screen", () => {
  const bfs = load<(g: Map<string, string[]>, s: string) => string[]>(
    graphCode.bfsCode,
    "bfs",
  );
  const dfs = load<(g: Map<string, string[]>, s: string) => string[]>(
    graphCode.dfsCode,
    "dfs",
  );
  for (const [id, fn] of [
    ["bfs", bfs],
    ["dfs", dfs],
  ] as const) {
    for (const p of graphTopics[id].presets) {
      it(`${id} / ${p.name}`, () => {
        const ops = ok(graphTopics[id].parse(p.input));
        const { g, plain } = toMaps(ops);
        const steps = graphTopics[id].run(ops);
        expect(panel(steps[steps.length - 1].state, "Visit order")).toEqual(
          fn(plain, g.start),
        );
      });
    }
  }
});

describe("Dijkstra and Bellman-Ford agree with the code on screen", () => {
  const dijkstra = load<(g: any, s: string) => { dist: Map<string, number> }>(
    graphCode.dijkstraCode,
    "dijkstra",
  );
  const bellman = load<
    (
      n: string[],
      e: any[],
      s: string,
    ) => { dist: Map<string, number>; negativeCycle: boolean }
  >(graphCode.bellmanCode, "bellmanFord");
  /** Reads the distance panel into a map from node to distance text. */
  const dists = (st: any) =>
    Object.fromEntries(panel(st, "Distance").map((c) => c.split(": ")));
  for (const p of graphTopics.dijkstra.presets) {
    it(`dijkstra / ${p.name}`, () => {
      const ops = ok(graphTopics.dijkstra.parse(p.input));
      const { g, weighted } = toMaps(ops);
      const real = dijkstra(weighted, g.start).dist;
      const shown = dists(graphTopics.dijkstra.run(ops).at(-1)!.state);
      for (const [n, d] of real)
        expect(shown[n]).toBe(d === Infinity ? "∞" : String(d));
    });
  }
  for (const p of graphTopics.bellman.presets) {
    it(`bellman-ford / ${p.name}`, () => {
      const ops = ok(graphTopics.bellman.parse(p.input));
      const { g, edges } = toMaps(ops);
      const real = bellman(g.nodes, edges, g.start);
      const steps = graphTopics.bellman.run(ops);
      const last = steps.at(-1)!;
      expect(
        last.note.toLowerCase().includes("negative cycle is reachable"),
      ).toBe(real.negativeCycle);
      if (!real.negativeCycle) {
        const shown = dists(last.state);
        for (const [n, d] of real.dist)
          expect(shown[n]).toBe(d === Infinity ? "∞" : String(d));
      }
    });
  }
  it("Dijkstra equals Bellman-Ford on random non-negative graphs", () => {
    let seed = 99;
    /** Small seeded random generator so the random cases are repeatable. */
    const rnd = (n: number) =>
      Math.floor(
        ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
      );
    for (let t = 0; t < 40; t++) {
      const names = "ABCDEFGH".slice(0, 4 + rnd(5)).split("");
      const pairs = new Set<string>();
      const toks: string[] = [];
      for (let i = 0; i < names.length + rnd(6); i++) {
        const a = names[rnd(names.length)];
        const b = names[rnd(names.length)];
        const k = [a, b].sort().join("-");
        if (a === b || pairs.has(k)) continue;
        pairs.add(k);
        toks.push(`${a}-${b} ${rnd(20)}`);
      }
      if (toks.length === 0) continue;
      const ops = ok(
        graphTopics.dijkstra.parse(toks.join(", ") + `, start ${toks[0][0]}`),
      );
      const { g, weighted, edges } = toMaps(ops);
      const d1 = dijkstra(weighted, g.start).dist;
      const both = edges.flatMap(([a, b, w]) => [
        [a, b, w],
        [b, a, w],
      ]);
      const d2 = bellman(g.nodes, both, g.start).dist;
      for (const n of g.nodes) expect(d1.get(n)).toBe(d2.get(n));
      const shown = dists(graphTopics.dijkstra.run(ops).at(-1)!.state);
      for (const [n, d] of d1)
        expect(shown[n]).toBe(d === Infinity ? "∞" : String(d));
    }
  });
});

describe("Kruskal and Prim agree with the code on screen", () => {
  const kruskal = load<(n: string[], e: any[]) => [string, string, number][]>(
    graphCode.kruskalCode,
    "kruskal",
  );
  const prim = load<(g: any, s: string) => [string, string, number][]>(
    graphCode.primCode,
    "prim",
  );
  /** Sum of the weights of a list of edges. */
  const total = (m: [string, string, number][]) =>
    m.reduce((s, e) => s + e[2], 0);
  /** Reads the total weight out of the final note of an MST animation. */
  const shownTotal = (note: string) =>
    Number(/Total weight (-?\d+)/.exec(note)![1]);
  for (const p of graphTopics.kruskal.presets) {
    it(`kruskal / ${p.name}`, () => {
      const ops = ok(graphTopics.kruskal.parse(p.input));
      const { g, edges } = toMaps(ops);
      const real = kruskal(g.nodes, edges);
      expect(shownTotal(graphTopics.kruskal.run(ops).at(-1)!.note)).toBe(
        total(real),
      );
    });
  }
  for (const p of graphTopics.prim.presets) {
    it(`prim / ${p.name}`, () => {
      const ops = ok(graphTopics.prim.parse(p.input));
      const { g, weighted } = toMaps(ops);
      const real = prim(weighted, g.start);
      expect(shownTotal(graphTopics.prim.run(ops).at(-1)!.note)).toBe(
        total(real),
      );
    });
  }
  it("Kruskal and Prim give the same total on random connected graphs", () => {
    let seed = 5;
    /** Small seeded random generator so the random cases are repeatable. */
    const rnd = (n: number) =>
      Math.floor(
        ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
      );
    for (let t = 0; t < 40; t++) {
      const n = 4 + rnd(6);
      const names = "ABCDEFGHIJ".slice(0, n).split("");
      const toks: string[] = [];
      const seen = new Set<string>();
      for (let i = 1; i < n; i++) {
        const j = rnd(i);
        toks.push(`${names[j]}-${names[i]} ${1 + rnd(20)}`);
        seen.add([names[j], names[i]].sort().join("-"));
      }
      for (let i = 0; i < n; i++) {
        const a = names[rnd(n)],
          b = names[rnd(n)],
          k = [a, b].sort().join("-");
        if (a !== b && !seen.has(k)) {
          seen.add(k);
          toks.push(`${a}-${b} ${1 + rnd(20)}`);
        }
      }
      const kr = shownTotal(
        graphTopics.kruskal
          .run(ok(graphTopics.kruskal.parse(toks.join(","))))
          .at(-1)!.note,
      );
      const pr = shownTotal(
        graphTopics.prim
          .run(ok(graphTopics.prim.parse(toks.join(",") + ", start A")))
          .at(-1)!.note,
      );
      const realK = kruskal(
        names,
        toks.map((x) => {
          const m = /^(\w)-(\w) (\d+)$/.exec(x)!;
          return [m[1], m[2], Number(m[3])];
        }),
      );
      expect(kr).toBe(pr);
      expect(kr).toBe(total(realK));
    }
  });
});

describe("union-find", () => {
  const DS = load(dsuCode, "DisjointSet");
  it("the code on screen merges, compresses and counts", () => {
    const d = new DS(8);
    expect(d.components()).toBe(8);
    expect(d.union(0, 1)).toBe(true);
    expect(d.union(1, 0)).toBe(false);
    d.union(2, 3);
    d.union(0, 2);
    expect(d.connected(1, 3)).toBe(true);
    expect(d.connected(0, 7)).toBe(false);
    expect(d.components()).toBe(5);
  });
  it("the animation ends in a state equal to the real code, on every preset and random runs", () => {
    let seed = 3;
    /** Small seeded random generator so the random cases are repeatable. */
    const rnd = (n: number) =>
      Math.floor(
        ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n,
      );
    const runs = Array.from({ length: 30 }, () =>
      Array.from({ length: 5 + rnd(30) }, () =>
        rnd(3)
          ? `union ${rnd(DSU_SIZE)} ${rnd(DSU_SIZE)}`
          : `find ${rnd(DSU_SIZE)}`,
      ).join(", "),
    );
    for (const input of runs) {
      const ops = ok(parseDsu(input));
      const real = new DS(DSU_SIZE);
      for (const o of ops)
        o.op === "union"
          ? real.union(o.args![0], o.args![1])
          : real.find(o.args![0]);
      const last = dsuSteps(ops).at(-1)!.state;
      // same partition into sets
      for (let a = 0; a < DSU_SIZE; a++)
        for (let b = 0; b < DSU_SIZE; b++) {
          /** Root of an element in a parent array. */
          const root = (p: number[], x: number): number =>
            p[x] === x ? x : root(p, p[x]);
          expect(root(last.parent, a) === root(last.parent, b)).toBe(
            real.connected(a, b),
          );
        }
    }
  });
  it("rejects out-of-range elements", () =>
    expect("error" in parseDsu("union 0 9")).toBe(true));
});

describe("graph representations", () => {
  const classes = ["AdjacencyList", "AdjacencyMatrix", "AdjacencyMap"].map(
    (n) => load(repCode, n),
  );
  it("all three implementations on screen agree on edges and neighbours", () => {
    for (const C of classes) {
      const g = new C();
      g.addEdge("A", "B", 4);
      g.addEdge("A", "C");
      g.addEdge("C", "D", 2, true);
      expect(g.hasEdge("A", "B")).toBe(true);
      expect(g.hasEdge("B", "A")).toBe(true);
      expect(g.hasEdge("C", "D")).toBe(true);
      expect(g.hasEdge("D", "C")).toBe(false);
      expect([...g.neighbors("A")].sort()).toEqual(["B", "C"]);
      g.removeEdge("A", "B");
      expect(g.hasEdge("A", "B")).toBe(false);
      expect(g.hasEdge("B", "A")).toBe(false);
      expect(g.hasEdge("X", "Y")).toBe(false);
      expect(g.neighbors("Z")).toEqual([]);
    }
  });
  it("the animation keeps the three views consistent on every preset and long runs", () => {
    const inputs = [
      "A-B, A-C, B-D, C-D, has A-B, has A-D, neighbors A, remove A-B, has A-B",
      "A>B 4, B>C 2, C>A 7, A>D 1, has B>A, has A>B, neighbors C, remove A>B, has A>B",
      "A-B, remove A-C, has A-C, has X-Y, neighbors Z, remove A-B, neighbors A",
    ];
    for (const input of inputs) {
      const steps = repSteps(ok(parseRep(input)));
      const s = steps.at(-1)!.state;
      const fromList = new Set(
        s.list.flatMap((r) => r.items.map((i) => `${r.node}>${i.to}`)),
      );
      const fromHash = new Set(
        s.hash.flatMap((r) => r.entries.map((i) => `${r.key}>${i.to}`)),
      );
      const fromMat = new Set<string>();
      s.mat.cells.forEach((row, i) =>
        row.forEach(
          (c, j) =>
            c !== null && fromMat.add(`${s.mat.nodes[i]}>${s.mat.nodes[j]}`),
        ),
      );
      expect([...fromMat].sort()).toEqual([...fromList].sort());
      expect([...fromHash].sort()).toEqual([...fromList].sort());
    }
  });
  it("rejects bad input", () => {
    for (const bad of ["", "A", "A-A", "remove A", "A-B x", "has A-B 3"])
      expect("error" in parseRep(bad)).toBe(true);
  });
});
