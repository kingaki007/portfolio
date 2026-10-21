import type { Step, Topic } from "../engine/types";
import { splitOps, type ParseResult, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks } from "../components/TreeViz";
import type { NNode } from "../components/NaryViz";

/* =============================================================
   N-Queens
   ============================================================= */

export interface QueensState {
  n: number;
  cols: number[];
  trial: { row: number; col: number; status: "try" | "conflict" | "safe" } | null;
  /** the queen that attacks the trial square */
  hit: { row: number; col: number } | null;
  tried: number;
  backtracks: number;
  solved: boolean;
}

const queensCode = `function solveNQueens(n: number): number[] | null {
  const cols: number[] = []; // cols[row] = column of the queen in that row

  function safe(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      if (c === col || Math.abs(c - col) === row - r) return false;
    }
    return true;
  }

  function place(row: number): boolean {
    if (row === n) return true;
    for (let col = 0; col < n; col++) {
      if (!safe(row, col)) continue;
      cols.push(col);
      if (place(row + 1)) return true;
      cols.pop(); // backtrack
    }
    return false;
  }

  return place(0) ? cols : null;
}`;

export const queensTopic: Topic = {
  id: "bt-n-queens",
  title: "N-Queens",
  group: "Backtracking",
  blurb: "Place n queens on an n×n board so none attack each other. Fill one row at a time; when a row has no safe column, go back and move the previous queen.",
  syntax: "one whole number n from 1 to 8",
  code: queensCode,
  complexity: [
    { op: "time", time: "O(n!) in the worst case, far less in practice thanks to pruning" },
    { op: "space", time: "O(n) for the board and recursion" },
  ],
};

export const parseQueens = (input: string): ParseResult => {
  const t = splitOps(input.replace(/\s+/g, ","));
  if (t.length !== 1 || !/^\d+$/.test(t[0]) || Number(t[0]) < 1 || Number(t[0]) > 8) return { error: "Enter one whole number from 1 to 8." };
  return { ops: [{ op: "n", value: Number(t[0]), args: [Number(t[0])] }] };
};

export function queensSteps(ops: ParsedOp[]): Step<QueensState>[] {
  const n = ops[0].value!;
  const L = {
    place: lineOf(queensCode, "function place(row: number): boolean {"),
    done: lineOf(queensCode, "if (row === n) return true;"),
    loop: lineOf(queensCode, "for (let col = 0; col < n; col++) {"),
    safe: lineOf(queensCode, "if (!safe(row, col)) continue;"),
    push: lineOf(queensCode, "cols.push(col);"),
    rec: lineOf(queensCode, "if (place(row + 1)) return true;"),
    pop: lineOf(queensCode, "cols.pop();"),
    fail: lineOf(queensCode, "return false;", lineOf(queensCode, "function place")),
    check: lineOf(queensCode, "if (c === col || Math.abs(c - col) === row - r) return false;"),
    ret: lineOf(queensCode, "return place(0) ? cols : null;"),
  };
  const cols: number[] = [];
  let tried = 0;
  let backs = 0;
  let solved = false;
  const steps: Step<QueensState>[] = [];
  const snap = (note: string, lines: number[], trial: QueensState["trial"] = null, hit: QueensState["hit"] = null) =>
    steps.push({ state: { n, cols: [...cols], trial, hit, tried, backtracks: backs, solved }, lines, note, op: -1 });

  snap(`${n}×${n} board. Place queens row by row, from the top. Press play.`, []);
  const conflict = (row: number, col: number) => {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      if (c === col) return { r, c, why: "the same column" };
      if (Math.abs(c - col) === row - r) return { r, c, why: "the same diagonal" };
    }
    return null;
  };
  const place = (row: number): boolean => {
    if (row === n) {
      solved = true;
      snap(`All ${n} rows have a queen: solution found. Columns by row: ${cols.join(", ")}.`, [L.done]);
      return true;
    }
    for (let col = 0; col < n; col++) {
      tried++;
      snap(`Row ${row}: try column ${col}.`, [L.loop, L.safe], { row, col, status: "try" });
      const bad = conflict(row, col);
      if (bad) {
        snap(`Not safe: the queen at row ${bad.r}, column ${bad.c} attacks it along ${bad.why}.`, [L.check], { row, col, status: "conflict" }, { row: bad.r, col: bad.c });
        continue;
      }
      cols.push(col);
      snap(`Safe: place a queen at row ${row}, column ${col} and move on to row ${row + 1}.`, [L.push, L.rec], { row, col, status: "safe" });
      if (place(row + 1)) return true;
      cols.pop();
      backs++;
      snap(`Row ${row + 1} had no safe column: backtrack. Remove the queen from row ${row}, column ${col} and try the next column.`, [L.pop], { row, col, status: "try" });
    }
    snap(`No column in row ${row} is safe: return false to the row above.`, [L.fail]);
    return false;
  };
  const ok = place(0);
  if (!ok) snap(`Every option has been tried: ${n === 1 ? "" : `${n} queens cannot be placed on a ${n}×${n} board`}. solveNQueens returns null.`, [L.ret]);
  return steps;
}

export const queensPresets: Preset[] = [
  { name: "4 queens", desc: "Small enough to see every backtrack.", input: "4" },
  { name: "6 queens", desc: "A few dead ends before the solution.", input: "6" },
  { name: "8 queens", desc: "The classic board: hundreds of tries for the first solution.", input: "8" },
  { name: "3 queens (no solution)", desc: "Backtracks all the way and reports failure.", input: "3" },
  { name: "1 queen", desc: "Edge case.", input: "1" },
];

/* =============================================================
   Recursion-tree topics: permutations, subsets, subset sum
   ============================================================= */

export interface RecState {
  roots: NNode[];
  marks: Marks;
  /** the items being arranged / chosen from */
  items: number[];
  /** what the current branch has chosen so far */
  path: number[];
  /** permutation only: which items are in use */
  used: boolean[] | null;
  results: number[][];
  info: string;
}

const permCode = `function permutations(items: number[]): number[][] {
  const result: number[][] = [];
  const used: boolean[] = new Array(items.length).fill(false);
  const current: number[] = [];

  function backtrack(): void {
    if (current.length === items.length) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
}`;

const subsetsCode = `function subsets(items: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  function explore(i: number): void {
    if (i === items.length) {
      result.push([...current]);
      return;
    }
    current.push(items[i]); // choice 1: include items[i]
    explore(i + 1);
    current.pop();
    explore(i + 1); // choice 2: leave it out
  }

  explore(0);
  return result;
}`;

const subsetSumCode = `function subsetSum(items: number[], target: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  function explore(i: number, sum: number): void {
    if (sum === target) {
      result.push([...current]);
      return;
    }
    if (sum > target || i === items.length) return; // prune: cannot succeed
    current.push(items[i]);
    explore(i + 1, sum + items[i]);
    current.pop();
    explore(i + 1, sum);
  }

  explore(0, 0);
  return result;
}`;


function numList(input: string, max: number, lo: number, hi: number, distinct: boolean): ParseResult {
  const tokens = splitOps(input.replace(/\s+/g, ","));
  if (tokens.length === 0) return { error: "Enter at least one number." };
  if (tokens.length > max) return { error: `Too many numbers (max ${max}).` };
  const seen = new Set<number>();
  const ops: ParsedOp[] = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t) || Number(t) < lo || Number(t) > hi) return { error: `"${t}" is not allowed: use whole numbers from ${lo} to ${hi}.` };
    const v = Number(t);
    if (distinct && seen.has(v)) return { error: `${v} appears twice: use different numbers.` };
    seen.add(v);
    ops.push({ op: "n", value: v, args: [v] });
  }
  return { ops };
}

export const parsePerm = (i: string) => numList(i, 4, 0, 99, true);
export const parseSubsets = (i: string) => numList(i, 5, 0, 99, false);
export function parseSubsetSum(input: string): ParseResult {
  const m = /^\s*(.*?)\s*[,;\n]\s*target\s+(\d+)\s*$/i.exec(input);
  if (!m) return { error: 'Use the form "3 5 7 2, target 10".' };
  const r = numList(m[1], 6, 1, 50, false);
  if ("error" in r) return r;
  const target = Number(m[2]);
  if (target < 1 || target > 200) return { error: "The target is from 1 to 200." };
  return { ops: [...r.ops, { op: "target", value: target, args: [target] }] };
}

interface TN {
  id: number;
  label: string;
  cls?: string;
  kids: TN[];
}

/** shared recorder for the three recursion-tree topics */
function treeRecorder(items: number[], used: boolean[] | null) {
  let nextId = 1;
  const root: TN = { id: nextId++, label: "∅", kids: [] };
  const path: number[] = [];
  const results: number[][] = [];
  const steps: Step<RecState>[] = [];
  const toN = (n: TN): NNode => ({ id: n.id, label: n.label, cls: n.cls, kids: n.kids.map(toN) });
  const snap = (note: string, lines: number[], marks: Marks = {}, info = "") =>
    steps.push({ state: { roots: [toN(root)], marks, items, path: [...path], used: used ? [...used] : null, results: results.map((r) => [...r]), info }, lines, note, op: -1 });
  const child = (parent: TN, label: string, cls?: string): TN => {
    const c: TN = { id: nextId++, label, cls, kids: [] };
    parent.kids.push(c);
    return c;
  };
  return { root, path, results, steps, snap, child };
}

export function permSteps(ops: ParsedOp[]): Step<RecState>[] {
  const items = ops.map((o) => o.value!);
  const used = items.map(() => false);
  const r = treeRecorder(items, used);
  const L = {
    base: lineOf(permCode, "if (current.length === items.length) {"),
    save: lineOf(permCode, "result.push([...current]);"),
    loop: lineOf(permCode, "for (let i = 0; i < items.length; i++) {"),
    skip: lineOf(permCode, "if (used[i]) continue;"),
    use: lineOf(permCode, "used[i] = true;"),
    push: lineOf(permCode, "current.push(items[i]);"),
    rec: lineOf(permCode, "backtrack();", lineOf(permCode, "current.push(items[i]);")),
    pop: lineOf(permCode, "current.pop();"),
    free: lineOf(permCode, "used[i] = false;"),
    ret: lineOf(permCode, "return result;"),
  };
  r.snap("The recursion tree starts at the empty arrangement. Each level picks one unused number.", [L.loop], { [r.root.id]: "cmp" });
  const walk = (node: TN) => {
    if (r.path.length === items.length) {
      r.results.push([...r.path]);
      node.cls = "wordend";
      r.snap(`Every number is used: record the permutation [${r.path.join(", ")}] (#${r.results.length}).`, [L.base, L.save], { [node.id]: "found" }, `${r.results.length} found`);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) {
        r.snap(`${items[i]} is already in the current arrangement: skip it.`, [L.loop, L.skip], { [node.id]: "cmp" });
        continue;
      }
      used[i] = true;
      r.path.push(items[i]);
      const c = r.child(node, String(items[i]));
      r.snap(`Choose ${items[i]}: the arrangement is now [${r.path.join(", ")}]. Recurse.`, [L.use, L.push, L.rec], { [c.id]: "new", [node.id]: "cmp" });
      walk(c);
      r.path.pop();
      used[i] = false;
      r.snap(`Backtrack: take ${items[i]} back out so the next choice can use that slot. Back to [${r.path.join(", ") || " "}].`, [L.pop, L.free], { [node.id]: "cmp" });
    }
  };
  walk(r.root);
  r.snap(`Done: ${r.results.length} permutation${r.results.length === 1 ? "" : "s"} (${items.length}! = ${r.results.length}).`, [L.ret], {});
  return r.steps;
}

export function subsetsSteps(ops: ParsedOp[]): Step<RecState>[] {
  const items = ops.map((o) => o.value!);
  const r = treeRecorder(items, null);
  const L = {
    base: lineOf(subsetsCode, "if (i === items.length) {"),
    save: lineOf(subsetsCode, "result.push([...current]);"),
    inc: lineOf(subsetsCode, "current.push(items[i]);"),
    rec1: lineOf(subsetsCode, "explore(i + 1);"),
    pop: lineOf(subsetsCode, "current.pop();"),
    rec2: lineOf(subsetsCode, "explore(i + 1); // choice 2"),
    ret: lineOf(subsetsCode, "return result;"),
  };
  r.snap("Each number gets two choices: include it (+) or leave it out (−). That makes 2ⁿ branches.", [L.inc], { [r.root.id]: "cmp" });
  const explore = (node: TN, i: number) => {
    if (i === items.length) {
      r.results.push([...r.path]);
      node.cls = "wordend";
      r.snap(`All ${items.length} decisions made: record the subset {${r.path.join(", ")}} (#${r.results.length}).`, [L.base, L.save], { [node.id]: "found" }, `${r.results.length} subsets`);
      return;
    }
    r.path.push(items[i]);
    const inc = r.child(node, `+${items[i]}`);
    r.snap(`Include ${items[i]}: the current subset is {${r.path.join(", ")}}.`, [L.inc, L.rec1], { [inc.id]: "new", [node.id]: "cmp" });
    explore(inc, i + 1);
    r.path.pop();
    const exc = r.child(node, `−${items[i]}`);
    r.snap(`Backtrack and leave ${items[i]} out: the current subset is {${r.path.join(", ") || " "}}.`, [L.pop, L.rec2], { [exc.id]: "new", [node.id]: "cmp" });
    explore(exc, i + 1);
  };
  explore(r.root, 0);
  r.snap(`Done: ${r.results.length} subsets (2^${items.length} = ${2 ** items.length}).`, [L.ret]);
  return r.steps;
}

export function subsetSumSteps(ops: ParsedOp[]): Step<RecState>[] {
  const target = ops.find((o) => o.op === "target")!.value!;
  const items = ops.filter((o) => o.op === "n").map((o) => o.value!);
  const r = treeRecorder(items, null);
  const L = {
    hit: lineOf(subsetSumCode, "if (sum === target) {"),
    save: lineOf(subsetSumCode, "result.push([...current]);"),
    prune: lineOf(subsetSumCode, "if (sum > target || i === items.length) return;"),
    inc: lineOf(subsetSumCode, "current.push(items[i]);"),
    rec1: lineOf(subsetSumCode, "explore(i + 1, sum + items[i]);"),
    pop: lineOf(subsetSumCode, "current.pop();"),
    rec2: lineOf(subsetSumCode, "explore(i + 1, sum);"),
    ret: lineOf(subsetSumCode, "return result;"),
  };
  let visited = 0;
  let pruned = 0;
  r.snap(`Find subsets of {${items.join(", ")}} that add up to ${target}. A branch whose sum already exceeds ${target} is abandoned immediately.`, [L.hit], { [r.root.id]: "cmp" }, "sum = 0");
  const explore = (node: TN, i: number, sum: number) => {
    visited++;
    if (sum === target) {
      r.results.push([...r.path]);
      node.cls = "wordend";
      r.snap(`Sum is exactly ${target}: record {${r.path.join(", ")}}. Adding more would overshoot, so stop this branch.`, [L.hit, L.save], { [node.id]: "found" }, `sum = ${sum}`);
      return;
    }
    if (sum > target) {
      pruned++;
      r.snap(`Sum ${sum} is already more than ${target}: prune. Nothing below this node can succeed, so none of its branches are explored.`, [L.prune], { [node.id]: "del" }, `sum = ${sum} > ${target}`);
      return;
    }
    if (i === items.length) {
      r.snap(`Out of numbers with sum ${sum} ≠ ${target}: dead end.`, [L.prune], { [node.id]: "del" }, `sum = ${sum}`);
      return;
    }
    r.path.push(items[i]);
    const inc = r.child(node, `+${items[i]}`);
    r.snap(`Include ${items[i]}: sum becomes ${sum + items[i]}.`, [L.inc, L.rec1], { [inc.id]: "new", [node.id]: "cmp" }, `sum = ${sum + items[i]}`);
    explore(inc, i + 1, sum + items[i]);
    r.path.pop();
    const exc = r.child(node, `−${items[i]}`);
    r.snap(`Backtrack and leave ${items[i]} out: sum stays ${sum}.`, [L.pop, L.rec2], { [exc.id]: "new", [node.id]: "cmp" }, `sum = ${sum}`);
    explore(exc, i + 1, sum);
  };
  explore(r.root, 0, 0);
  r.snap(`Done: ${r.results.length} subset${r.results.length === 1 ? "" : "s"} sum to ${target}. ${visited} branches visited, ${pruned} pruned (a full search would visit ${2 ** (items.length + 1) - 1}).`, [L.ret]);
  return r.steps;
}

export const permTopic: Topic = {
  id: "bt-permutations",
  title: "Permutations",
  group: "Backtracking",
  blurb: "Every ordering of up to 4 numbers. Choose an unused number, recurse, then un-choose it (backtrack) so the next number can take its place.",
  syntax: "up to 4 different numbers, e.g. 1 2 3",
  code: permCode,
  complexity: [
    { op: "time", time: "O(n × n!) to build every permutation" },
    { op: "space", time: "O(n) recursion plus the output" },
  ],
};
export const subsetsTopic: Topic = {
  id: "bt-subsets",
  title: "Subsets (power set)",
  group: "Backtracking",
  blurb: "Every subset of up to 5 numbers. For each number there are two choices: include it or leave it out, giving a binary decision tree.",
  syntax: "up to 5 numbers, e.g. 1 2 3",
  code: subsetsCode,
  complexity: [
    { op: "time", time: "O(n × 2ⁿ)" },
    { op: "space", time: "O(n) recursion plus the output" },
  ],
};
export const subsetSumTopic: Topic = {
  id: "bt-subset-sum",
  title: "Subset Sum (with pruning)",
  group: "Backtracking",
  blurb: "Find subsets that add up to a target. Backtracking stops exploring a branch the moment its sum overshoots, so large parts of the tree are never visited.",
  syntax: "numbers then a target, e.g. 3 5 7 2, target 10   (up to 6 numbers from 1 to 50)",
  code: subsetSumCode,
  complexity: [
    { op: "time", time: "O(2ⁿ) worst case, much less with pruning" },
    { op: "space", time: "O(n) recursion plus the output" },
  ],
};

export const permPresets: Preset[] = [
  { name: "1, 2, 3", desc: "Six permutations.", input: "1 2 3" },
  { name: "Single item", desc: "Edge case.", input: "7" },
  { name: "Four items (24)", desc: "The tree has 65 nodes.", input: "4 7 2 9" },
  { name: "Zero and larger values", desc: "Values do not matter, only positions.", input: "0 10 20" },
];
export const subsetsPresets: Preset[] = [
  { name: "1, 2, 3", desc: "Eight subsets.", input: "1 2 3" },
  { name: "Single item", desc: "Just {} and {5}.", input: "5" },
  { name: "Five items (32 subsets)", desc: "A wide tree.", input: "1 2 3 4 5" },
  { name: "Repeated values", desc: "Equal values are treated as different positions, so duplicates appear.", input: "2 2 3" },
];
export const subsetSumPresets: Preset[] = [
  { name: "Target 10", desc: "Several solutions and a lot of pruning.", input: "3 5 7 2, target 10" },
  { name: "No solution", desc: "Everything is explored or pruned.", input: "4 6 8, target 5" },
  { name: "Exact whole set", desc: "Only one subset works.", input: "1 2 3, target 6" },
  { name: "Six numbers, target 15", desc: "How much of the tree is pruned.", input: "2 3 5 6 8 9, target 15" },
];

/* =============================================================
   Sudoku
   ============================================================= */

export interface SudokuState {
  cells: number[]; // 81, 0 = empty
  given: boolean[];
  cur: number | null;
  kind: "idle" | "place" | "back" | "dead" | "solved" | "limit";
  placements: number;
  backtracks: number;
}

const sudokuCode = `type Grid = number[][];

function solveSudoku(grid: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      for (let d = 1; d <= 9; d++) {
        if (!isValid(grid, r, c, d)) continue;
        grid[r][c] = d;
        if (solveSudoku(grid)) return true;
        grid[r][c] = 0; // backtrack
      }
      return false; // no digit fits this cell
    }
  }
  return true; // no empty cell left
}

function isValid(grid: Grid, r: number, c: number, d: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === d || grid[i][c] === d) return false;
    const br = 3 * Math.floor(r / 3) + Math.floor(i / 3);
    const bc = 3 * Math.floor(c / 3) + (i % 3);
    if (grid[br][bc] === d) return false;
  }
  return true;
}`;

export const sudokuTopic: Topic = {
  id: "bt-sudoku",
  title: "Sudoku Solver",
  group: "Backtracking",
  blurb: "Fill each empty cell with the first digit that does not clash with its row, column or 3×3 box. If no digit fits, backtrack to the previous cell and try its next digit. Steps are capped at 12,000 so very hard puzzles stop with a message.",
  syntax: "9 rows of 9 characters, 1 to 9 for a given digit and . or 0 for empty, separated by commas or new lines",
  code: sudokuCode,
  complexity: [
    { op: "time", time: "O(9^m) worst case, m = empty cells; pruning makes typical puzzles fast" },
    { op: "space", time: "O(m) recursion depth" },
  ],
};

export const STEP_CAP = 12000;

export const btCode = { queensCode, permCode, subsetsCode, subsetSumCode, sudokuCode };

export function parseSudoku(input: string): ParseResult {
  const rows = splitOps(input).map((r) => r.replace(/\s+/g, ""));
  if (rows.length !== 9) return { error: "Enter 9 rows separated by commas or new lines." };
  const grid: number[][] = [];
  for (let i = 0; i < 9; i++) {
    if (!/^[0-9.]{9}$/.test(rows[i])) return { error: `Row ${i + 1} must be exactly 9 characters: digits 1 to 9, or . or 0 for empty.` };
    grid.push([...rows[i]].map((ch) => (ch === "." ? 0 : Number(ch))));
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = grid[r][c];
      if (!d) continue;
      for (let i = 0; i < 9; i++) {
        const br = 3 * Math.floor(r / 3) + Math.floor(i / 3);
        const bc = 3 * Math.floor(c / 3) + (i % 3);
        if ((i !== c && grid[r][i] === d) || (i !== r && grid[i][c] === d) || ((br !== r || bc !== c) && grid[br][bc] === d)) {
          return { error: `The digit ${d} at row ${r + 1}, column ${c + 1} clashes with another ${d} in its row, column or box.` };
        }
      }
    }
  }
  return { ops: grid.map((row) => ({ op: "row", names: [row.join("")] })) };
}

class StepLimit extends Error {}

export function sudokuSteps(ops: ParsedOp[]): Step<SudokuState>[] {
  const g: number[][] = ops.map((o) => [...o.names![0]].map(Number));
  const given = g.flat().map((d) => d !== 0);
  const steps: Step<SudokuState>[] = [];
  let placements = 0;
  let backs = 0;
  const L = {
    find: lineOf(sudokuCode, "if (grid[r][c] !== 0) continue;"),
    digit: lineOf(sudokuCode, "for (let d = 1; d <= 9; d++) {"),
    valid: lineOf(sudokuCode, "if (!isValid(grid, r, c, d)) continue;"),
    set: lineOf(sudokuCode, "grid[r][c] = d;"),
    rec: lineOf(sudokuCode, "if (solveSudoku(grid)) return true;"),
    back: lineOf(sudokuCode, "grid[r][c] = 0; // backtrack"),
    dead: lineOf(sudokuCode, "return false; // no digit fits this cell"),
    done: lineOf(sudokuCode, "return true; // no empty cell left"),
    check: lineOf(sudokuCode, "if (grid[r][i] === d || grid[i][c] === d) return false;"),
  };
  const snap = (note: string, lines: number[], cur: number | null, kind: SudokuState["kind"]) => {
    if (steps.length >= STEP_CAP) throw new StepLimit();
    steps.push({ state: { cells: g.flat(), given, cur, kind, placements, backtracks: backs }, lines, note, op: -1 });
  };
  const clash = (r: number, c: number, d: number): string | null => {
    for (let i = 0; i < 9; i++) {
      if (g[r][i] === d) return "its row";
      if (g[i][c] === d) return "its column";
      if (g[3 * Math.floor(r / 3) + Math.floor(i / 3)][3 * Math.floor(c / 3) + (i % 3)] === d) return "its 3×3 box";
    }
    return null;
  };
  const empties = g.flat().filter((d) => d === 0).length;

  const solve = (): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] !== 0) continue;
        const rejected: string[] = [];
        for (let d = 1; d <= 9; d++) {
          const why = clash(r, c, d);
          if (why) {
            rejected.push(`${d} (${why})`);
            continue;
          }
          g[r][c] = d;
          placements++;
          snap(`Cell (${r + 1}, ${c + 1}): ${rejected.length ? "rejected " + rejected.join(", ") + "; " : ""}${d} fits. Place it and move to the next empty cell.`, [L.digit, L.valid, L.set, L.rec], r * 9 + c, "place");
          if (solve()) return true;
          g[r][c] = 0;
          backs++;
          snap(`Backtrack: ${d} at (${r + 1}, ${c + 1}) led to a dead end. Remove it and try the next digit.`, [L.back], r * 9 + c, "back");
          rejected.length = 0;
        }
        snap(`Cell (${r + 1}, ${c + 1}): no digit from 1 to 9 fits${rejected.length ? " (" + rejected.join(", ") + ")" : ""}. Return false to the previous cell.`, [L.dead], r * 9 + c, "dead");
        return false;
      }
    }
    snap(`No empty cell is left: the puzzle is solved after ${placements} placements and ${backs} backtracks.`, [L.done], null, "solved");
    return true;
  };

  steps.push({ state: { cells: g.flat(), given, cur: null, kind: "idle", placements: 0, backtracks: 0 }, lines: [], note: `${empties} empty cell${empties === 1 ? "" : "s"}. The solver scans left to right, top to bottom, for the next empty cell. Press play.`, op: -1 });
  try {
    if (!solve()) steps.push({ state: { cells: g.flat(), given, cur: null, kind: "dead", placements, backtracks: backs }, lines: [L.dead], note: "Every option has been tried: this puzzle has no solution.", op: -1 });
  } catch (e) {
    if (!(e instanceof StepLimit)) throw e;
    steps.push({ state: { cells: g.flat(), given, cur: null, kind: "limit", placements, backtracks: backs }, lines: [], note: `Stopped after ${STEP_CAP.toLocaleString()} steps: this puzzle needs far more backtracking than the visualiser shows (${placements.toLocaleString()} placements so far). A smarter solver would pick the most constrained cell first.`, op: -1 });
  }
  return steps;
}

const P = (rows: string[]) => rows.join(", ");
export const sudokuPresets: Preset[] = [
  {
    name: "Almost solved (6 blanks)",
    desc: "Quick: only a handful of cells to fill.",
    input: P(["5.4.78912", "6721953.8", "198342567", "859761423", "4268.3.91", "713924856", "961537284", "28.419635", "345286179"]),
  },
  {
    name: "Easy puzzle (~500 steps)",
    desc: "A typical easy puzzle: a modest amount of backtracking.",
    input: P(["..3.2.6..", "9..3.5..1", "..18.64..", "..81.29..", "7.......8", "..67.82..", "..26.95..", "8..2.3..9", "..5.1.3.."]),
  },
  {
    name: "Medium puzzle (~2,200 steps)",
    desc: "Many dead ends: watch the backtrack counter climb.",
    input: P(["1.....569", "492.561.8", ".561.924.", "..964.8.1", ".64.1....", "218.356.4", ".4.5...16", "9.5.614.2", "621.....5"]),
  },
  {
    name: "Hard for brute force",
    desc: "Designed against this method: it will hit the step limit.",
    input: P(["........." , "......385", "..1.2....", "....5.7..", "..4....1.", ".9.......", "5......73", "..2.1....", "....4...9"]),
  },
];
