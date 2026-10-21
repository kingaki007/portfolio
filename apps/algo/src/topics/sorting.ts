import type { Step, Topic } from "../engine/types";
import { seq, splitOps, type ParseResult, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";

export interface SortItem {
  id: number;
  v: number;
}

export interface SortState {
  items: SortItem[];
  marks: Record<number, string>;
  cmps: number;
  moves: number;
}

const MAX_ITEMS = 40;

/** "5, 3, 8" -> numbers. Sorting input is a list of integers, not operations. */
export function parseNumbers(input: string): ParseResult {
  const tokens = splitOps(input.replace(/\s+/g, ","));
  if (tokens.length === 0) return { error: "Enter at least one number." };
  if (tokens.length > MAX_ITEMS) return { error: `Too many numbers (max ${MAX_ITEMS}).` };
  const ops: ParsedOp[] = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t)) return { error: `"${t}" is not a whole number from 0 to 999. Separate values with commas or spaces.` };
    const n = Number(t);
    if (n > 999) return { error: `${n} is too large: keep values between 0 and 999.` };
    ops.push({ op: "n", value: n, args: [n] });
  }
  return { ops };
}

/* ------------------------------ code ------------------------------ */

const bubbleCode = `function bubbleSort(input: number[]): number[] {
  const a = [...input];
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}`;

const selectionCode = `function selectionSort(input: number[]): number[] {
  const a = [...input];
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) [a[i], a[min]] = [a[min], a[i]];
  }
  return a;
}`;

const insertionCode = `function insertionSort(input: number[]): number[] {
  const a = [...input];
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0 && a[j - 1] > a[j]) {
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      j--;
    }
  }
  return a;
}`;

const mergeCode = `function mergeSort(a: number[], lo = 0, hi = a.length - 1): number[] {
  if (lo >= hi) return a;
  const mid = Math.floor((lo + hi) / 2);
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
  return a;
}

function merge(a: number[], lo: number, mid: number, hi: number): void {
  const left = a.slice(lo, mid + 1);
  const right = a.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) a[k++] = left[i++];
    else a[k++] = right[j++];
  }
  while (i < left.length) a[k++] = left[i++];
  while (j < right.length) a[k++] = right[j++];
}`;

const quickCode = `function quickSort(a: number[], lo = 0, hi = a.length - 1): number[] {
  if (lo < hi) {
    const p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
  }
  return a;
}

function partition(a: number[], lo: number, hi: number): number {
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) {
      [a[i], a[j]] = [a[j], a[i]];
      i++;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}`;

const heapCode = `function heapSort(input: number[]): number[] {
  const a = [...input];
  const n = a.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(a, i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(a, 0, end);
  }
  return a;
}

function siftDown(a: number[], i: number, n: number): void {
  while (true) {
    let largest = i;
    const l = 2 * i + 1;
    const r = l + 1;
    if (l < n && a[l] > a[largest]) largest = l;
    if (r < n && a[r] > a[largest]) largest = r;
    if (largest === i) return;
    [a[i], a[largest]] = [a[largest], a[i]];
    i = largest;
  }
}`;

export const sortCode = { bubbleCode, selectionCode, insertionCode, mergeCode, quickCode, heapCode };

/* ------------------------------ recorder ------------------------------ */

function recorder(values: number[]) {
  let items: SortItem[] = values.map((v, i) => ({ id: i + 1, v }));
  const ok = new Set<number>();
  let cmps = 0;
  let moves = 0;
  const steps: Step<SortState>[] = [];
  const marks = (extra: Record<number, string> = {}) => {
    const m: Record<number, string> = {};
    ok.forEach((id) => (m[id] = "ok"));
    return { ...m, ...extra };
  };
  const snap = (note: string, lines: number[], extra: Record<number, string> = {}) =>
    steps.push({ state: { items: items.map((x) => ({ ...x })), marks: marks(extra), cmps, moves }, lines, note, op: -1 });
  return {
    steps,
    snap,
    ok,
    get items() { return items; },
    set items(v) { items = v; },
    cmp() { cmps++; },
    move(n = 1) { moves += n; },
    swap(i: number, j: number) {
      const t = items[i];
      items = items.map((x, k) => (k === i ? items[j] : k === j ? t : x));
      moves++;
    },
    finish(note: string, lines: number[]) {
      items.forEach((x) => ok.add(x.id));
      snap(note, lines);
    },
  };
}

type Rec = ReturnType<typeof recorder>;
const id = (r: Rec, i: number) => r.items[i].id;
const v = (r: Rec, i: number) => r.items[i].v;

/* ------------------------------ algorithms ------------------------------ */

function bubble(values: number[]) {
  const r = recorder(values);
  const L = {
    outer: lineOf(bubbleCode, "for (let end"),
    reset: lineOf(bubbleCode, "let swapped = false;"),
    inner: lineOf(bubbleCode, "for (let i = 0; i < end; i++)"),
    cmp: lineOf(bubbleCode, "if (a[i] > a[i + 1])"),
    swap: lineOf(bubbleCode, "[a[i], a[i + 1]]"),
    brk: lineOf(bubbleCode, "if (!swapped) break;"),
    ret: lineOf(bubbleCode, "return a;"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    r.snap(`New pass: the largest value among the first ${end + 1} will bubble up to index ${end}.`, [L.outer, L.reset]);
    for (let i = 0; i < end; i++) {
      r.cmp();
      const [x, y] = [v(r, i), v(r, i + 1)];
      r.snap(`Compare a[${i}] = ${x} with a[${i + 1}] = ${y}.`, [L.inner, L.cmp], { [id(r, i)]: "cmp", [id(r, i + 1)]: "cmp" });
      if (x > y) {
        r.swap(i, i + 1);
        swapped = true;
        r.snap(`${x} > ${y}, so swap them.`, [L.swap], { [id(r, i)]: "swap", [id(r, i + 1)]: "swap" });
      }
    }
    r.ok.add(id(r, end));
    r.snap(`${v(r, end)} has reached its final position (index ${end}).`, [L.outer]);
    if (!swapped) {
      r.finish("No swaps happened in that pass, so the array is already sorted. Stop early.", [L.brk]);
      return r.steps;
    }
  }
  r.finish("Sorted.", [L.ret]);
  return r.steps;
}

function selection(values: number[]) {
  const r = recorder(values);
  const L = {
    outer: lineOf(selectionCode, "for (let i = 0; i < a.length - 1; i++)"),
    min: lineOf(selectionCode, "let min = i;"),
    inner: lineOf(selectionCode, "for (let j = i + 1"),
    cmp: lineOf(selectionCode, "if (a[j] < a[min]) min = j;"),
    swap: lineOf(selectionCode, "if (min !== i)"),
    ret: lineOf(selectionCode, "return a;"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    r.snap(`Find the smallest value in positions ${i}..${n - 1}. Assume a[${i}] = ${v(r, i)} is the minimum so far.`, [L.outer, L.min], { [id(r, i)]: "pivot" });
    for (let j = i + 1; j < n; j++) {
      r.cmp();
      const better = v(r, j) < v(r, min);
      r.snap(`Compare a[${j}] = ${v(r, j)} with the minimum ${v(r, min)}${better ? ": smaller, it becomes the new minimum." : "."}`, [L.inner, L.cmp], { [id(r, min)]: "pivot", [id(r, j)]: "cmp" });
      if (better) min = j;
    }
    if (min !== i) {
      r.swap(i, min);
      r.snap(`Swap the minimum ${v(r, i)} into position ${i}.`, [L.swap], { [id(r, i)]: "swap", [id(r, min)]: "swap" });
    } else r.snap(`a[${i}] is already the smallest, no swap needed.`, [L.swap], { [id(r, i)]: "pivot" });
    r.ok.add(id(r, i));
  }
  r.finish("Sorted.", [L.ret]);
  return r.steps;
}

function insertion(values: number[]) {
  const r = recorder(values);
  const L = {
    outer: lineOf(insertionCode, "for (let i = 1;"),
    start: lineOf(insertionCode, "let j = i;"),
    cmp: lineOf(insertionCode, "while (j > 0 && a[j - 1] > a[j])"),
    swap: lineOf(insertionCode, "[a[j - 1], a[j]]"),
    dec: lineOf(insertionCode, "j--;"),
    ret: lineOf(insertionCode, "return a;"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);
  if (n > 0) r.ok.add(id(r, 0));
  for (let i = 1; i < n; i++) {
    let j = i;
    r.snap(`Take a[${i}] = ${v(r, i)} and slide it left into the sorted part (indices 0..${i - 1}).`, [L.outer, L.start], { [id(r, i)]: "pivot" });
    while (j > 0) {
      r.cmp();
      const bigger = v(r, j - 1) > v(r, j);
      r.snap(`Compare ${v(r, j - 1)} (left) with ${v(r, j)}${bigger ? ": left is bigger, shift it right." : ": left is not bigger, stop here."}`, [L.cmp], { [id(r, j - 1)]: "cmp", [id(r, j)]: "pivot" });
      if (!bigger) break;
      r.swap(j - 1, j);
      r.snap(`Swap: ${v(r, j)} moves one place right.`, [L.swap], { [id(r, j - 1)]: "pivot", [id(r, j)]: "swap" });
      j--;
      r.snap(`j is now ${j}.`, [L.dec], { [id(r, j)]: "pivot" });
    }
    for (let k = 0; k <= i; k++) r.ok.add(id(r, k));
    r.snap(`Indices 0..${i} are now sorted.`, [L.outer]);
  }
  r.finish("Sorted.", [L.ret]);
  return r.steps;
}

function merge(values: number[]) {
  const r = recorder(values);
  const L = {
    base: lineOf(mergeCode, "if (lo >= hi) return a;"),
    mid: lineOf(mergeCode, "const mid = Math.floor"),
    left: lineOf(mergeCode, "mergeSort(a, lo, mid);"),
    right: lineOf(mergeCode, "mergeSort(a, mid + 1, hi);"),
    merge: lineOf(mergeCode, "merge(a, lo, mid, hi);"),
    copyL: lineOf(mergeCode, "const left = a.slice"),
    cmp: lineOf(mergeCode, "if (left[i] <= right[j])"),
    takeL: lineOf(mergeCode, "a[k++] = left[i++];"),
    takeR: lineOf(mergeCode, "else a[k++] = right[j++];"),
    restL: lineOf(mergeCode, "while (i < left.length) a[k++]"),
    restR: lineOf(mergeCode, "while (j < right.length) a[k++]"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);

  const range = (lo: number, hi: number) => {
    const m: Record<number, string> = {};
    for (let i = lo; i <= hi; i++) m[id(r, i)] = "rng";
    return m;
  };

  const doMerge = (lo: number, mid: number, hi: number) => {
    const left = r.items.slice(lo, mid + 1);
    const right = r.items.slice(mid + 1, hi + 1);
    const before = r.items.slice(0, lo);
    const after = r.items.slice(hi + 1);
    const placed: SortItem[] = [];
    let i = 0;
    let j = 0;
    const arrange = () => (r.items = [...before, ...placed, ...left.slice(i), ...right.slice(j), ...after]);
    r.snap(`Merge the sorted halves [${lo}..${mid}] and [${mid + 1}..${hi}] by repeatedly taking the smaller front value.`, [L.merge, L.copyL], range(lo, hi));
    while (i < left.length && j < right.length) {
      r.cmp();
      const takeLeft = left[i].v <= right[j].v;
      r.snap(`Compare ${left[i].v} (left) with ${right[j].v} (right): take the ${takeLeft ? "left" : "right"} one.`, [L.cmp], { ...range(lo, hi), [left[i].id]: "cmp", [right[j].id]: "cmp" });
      const chosen = takeLeft ? left[i++] : right[j++];
      placed.push(chosen);
      r.move();
      arrange();
      r.snap(`Write ${chosen.v} to position ${lo + placed.length - 1}.`, [takeLeft ? L.takeL : L.takeR], { ...range(lo, hi), [chosen.id]: "swap" });
    }
    while (i < left.length) {
      const c = left[i++];
      placed.push(c);
      r.move();
      arrange();
      r.snap(`Right half is used up: copy the rest of the left half (${c.v}).`, [L.restL], { ...range(lo, hi), [c.id]: "swap" });
    }
    while (j < right.length) {
      const c = right[j++];
      placed.push(c);
      r.move();
      arrange();
      r.snap(`Left half is used up: copy the rest of the right half (${c.v}).`, [L.restR], { ...range(lo, hi), [c.id]: "swap" });
    }
  };

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    r.snap(`Split [${lo}..${hi}] at mid = ${mid}: sort the left half, then the right half.`, [L.base, L.mid, L.left, L.right], range(lo, hi));
    sort(lo, mid);
    sort(mid + 1, hi);
    doMerge(lo, mid, hi);
  };
  sort(0, n - 1);
  r.finish("Sorted.", [L.merge]);
  return r.steps;
}

function quick(values: number[]) {
  const r = recorder(values);
  const L = {
    guard: lineOf(quickCode, "if (lo < hi) {"),
    part: lineOf(quickCode, "const p = partition(a, lo, hi);"),
    recL: lineOf(quickCode, "quickSort(a, lo, p - 1);"),
    recR: lineOf(quickCode, "quickSort(a, p + 1, hi);"),
    pivot: lineOf(quickCode, "const pivot = a[hi];"),
    i: lineOf(quickCode, "let i = lo;"),
    loop: lineOf(quickCode, "for (let j = lo; j < hi; j++)"),
    cmp: lineOf(quickCode, "if (a[j] < pivot)"),
    swap: lineOf(quickCode, "[a[i], a[j]] = [a[j], a[i]];"),
    inc: lineOf(quickCode, "i++;"),
    place: lineOf(quickCode, "[a[i], a[hi]]"),
    ret: lineOf(quickCode, "return i;"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);
  const range = (lo: number, hi: number) => {
    const m: Record<number, string> = {};
    for (let k = lo; k <= hi; k++) m[id(r, k)] = "rng";
    return m;
  };
  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      r.ok.add(id(r, lo));
      r.snap(`[${lo}..${hi}] has a single element, so it is already in place.`, [L.guard]);
      return;
    }
    const pivot = r.items[hi];
    r.snap(`Partition [${lo}..${hi}] around the pivot a[${hi}] = ${pivot.v}. Smaller values will be collected on the left.`, [L.guard, L.part, L.pivot, L.i], { ...range(lo, hi), [pivot.id]: "pivot" });
    let i = lo;
    for (let j = lo; j < hi; j++) {
      r.cmp();
      const smaller = v(r, j) < pivot.v;
      r.snap(`Compare a[${j}] = ${v(r, j)} with the pivot ${pivot.v}${smaller ? ": smaller, move it to the left side." : ": not smaller, leave it."}`, [L.loop, L.cmp], { ...range(lo, hi), [pivot.id]: "pivot", [id(r, j)]: "cmp", [id(r, i)]: "swap" });
      if (smaller) {
        if (i !== j) {
          r.swap(i, j);
          r.snap(`Swap a[${i}] and a[${j}].`, [L.swap], { ...range(lo, hi), [pivot.id]: "pivot", [id(r, i)]: "swap", [id(r, j)]: "swap" });
        }
        i++;
        r.snap(`i moves to ${i}.`, [L.inc], { ...range(lo, hi), [pivot.id]: "pivot" });
      }
    }
    r.swap(i, hi);
    r.ok.add(pivot.id);
    r.snap(`Swap the pivot into position ${i}. Everything left of it is smaller, everything right is larger-or-equal, so ${pivot.v} is final.`, [L.place, L.ret], { ...range(lo, hi) });
    sort(lo, i - 1);
    sort(i + 1, hi);
  };
  sort(0, n - 1);
  r.finish("Sorted.", [L.recL, L.recR]);
  return r.steps;
}

function heap(values: number[]) {
  const r = recorder(values);
  const L = {
    build: lineOf(heapCode, "for (let i = Math.floor(n / 2) - 1"),
    extract: lineOf(heapCode, "for (let end = n - 1"),
    swapRoot: lineOf(heapCode, "[a[0], a[end]]"),
    sift: lineOf(heapCode, "siftDown(a, 0, end);"),
    largest: lineOf(heapCode, "let largest = i;"),
    left: lineOf(heapCode, "if (l < n && a[l] > a[largest])"),
    right: lineOf(heapCode, "if (r < n && a[r] > a[largest])"),
    stop: lineOf(heapCode, "if (largest === i) return;"),
    swap: lineOf(heapCode, "[a[i], a[largest]]"),
    next: lineOf(heapCode, "i = largest;"),
    ret: lineOf(heapCode, "return a;"),
  };
  const n = values.length;
  r.snap(`Unsorted input of ${n} number${n === 1 ? "" : "s"}. Press play.`, []);
  const heapMarks = (size: number) => {
    const m: Record<number, string> = {};
    for (let k = 0; k < size; k++) m[id(r, k)] = "rng";
    return m;
  };
  const siftDown = (start: number, size: number) => {
    let i = start;
    for (;;) {
      let largest = i;
      const l = 2 * i + 1;
      const rr = l + 1;
      r.snap(`Sift down from index ${i} (${v(r, i)}) inside a heap of size ${size}.`, [L.largest], { ...heapMarks(size), [id(r, i)]: "pivot" });
      if (l < size) {
        r.cmp();
        const w = v(r, l) > v(r, largest);
        r.snap(`Left child ${v(r, l)} ${w ? "is larger than" : "is not larger than"} ${v(r, largest)}.`, [L.left], { ...heapMarks(size), [id(r, l)]: "cmp", [id(r, largest)]: "pivot" });
        if (w) largest = l;
      }
      if (rr < size) {
        r.cmp();
        const w = v(r, rr) > v(r, largest);
        r.snap(`Right child ${v(r, rr)} ${w ? "is larger than" : "is not larger than"} ${v(r, largest)}.`, [L.right], { ...heapMarks(size), [id(r, rr)]: "cmp", [id(r, largest)]: "pivot" });
        if (w) largest = rr;
      }
      if (largest === i) {
        r.snap(`${v(r, i)} is at least as large as its children: this part is a valid max-heap.`, [L.stop], { ...heapMarks(size), [id(r, i)]: "swap" });
        return;
      }
      r.swap(i, largest);
      r.snap(`Swap ${v(r, largest)} and ${v(r, i)}.`, [L.swap], { ...heapMarks(size), [id(r, i)]: "swap", [id(r, largest)]: "swap" });
      i = largest;
      r.snap(`Continue from index ${i}.`, [L.next], { ...heapMarks(size), [id(r, i)]: "pivot" });
    }
  };
  r.snap("Phase 1: rearrange the array into a max-heap (the largest value at index 0), working from the last parent upward.", [L.build]);
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n);
  r.snap("The whole array is a max-heap. Phase 2: repeatedly move the maximum to the end.", [L.extract], heapMarks(n));
  for (let end = n - 1; end > 0; end--) {
    r.swap(0, end);
    r.ok.add(id(r, end));
    r.snap(`Swap the maximum ${v(r, end)} into position ${end}. It is now final.`, [L.swapRoot], { ...heapMarks(end), [id(r, 0)]: "swap" });
    r.snap(`Restore the heap on the first ${end} elements.`, [L.sift], heapMarks(end));
    siftDown(0, end);
  }
  r.finish("Sorted.", [L.ret]);
  return r.steps;
}

/* ------------------------------ topics ------------------------------ */

const randomish = (n: number) => seq(n, (i) => String((i * 37 + 11) % 97)).join(", ");

const presets: Preset[] = [
  { name: "Random (12)", desc: "A typical unsorted list.", input: "42, 7, 91, 15, 63, 28, 5, 77, 34, 19, 88, 50" },
  { name: "Already sorted", desc: "Best case for bubble and insertion sort.", input: "3, 8, 15, 22, 31, 47, 56, 64, 79, 90" },
  { name: "Reverse sorted", desc: "Worst case for bubble, selection and insertion sort.", input: "95, 82, 70, 61, 53, 44, 36, 27, 18, 9" },
  { name: "Duplicates and zeros", desc: "Equal values: shows how ties are handled.", input: "5, 3, 5, 0, 8, 3, 3, 9, 0, 5, 8, 1" },
  { name: "Larger input (30)", desc: "Thirty pseudo-random values to compare growth.", input: randomish(30) },
];

function make(idn: string, title: string, blurb: string, code: string, complexity: Topic["complexity"], run: (vals: number[]) => Step<SortState>[]) {
  const topic: Topic = {
    id: idn,
    title,
    group: "Sorting",
    blurb,
    syntax: "numbers from 0 to 999, separated by commas or spaces (up to 40)",
    code,
    complexity,
  };
  return {
    topic,
    presets,
    parse: parseNumbers,
    run: (ops: ParsedOp[]) => run(ops.map((o) => o.value!)),
  };
}

export const sorting = [
  make("bubble-sort", "Bubble Sort", "Repeatedly swap adjacent out-of-order pairs. The largest value bubbles to the end each pass, and a pass with no swaps ends early.", bubbleCode, [
    { op: "time", time: "O(n²) worst and average, O(n) if already sorted" },
    { op: "space", time: "O(1), in place, stable" },
  ], bubble),
  make("selection-sort", "Selection Sort", "Find the smallest remaining value and swap it into place. Always n²/2 comparisons, but at most n swaps.", selectionCode, [
    { op: "time", time: "O(n²) in every case" },
    { op: "space", time: "O(1), in place, not stable" },
  ], selection),
  make("insertion-sort", "Insertion Sort", "Grow a sorted prefix by sliding each new value left until it fits. Fast on small or nearly sorted data.", insertionCode, [
    { op: "time", time: "O(n²) worst and average, O(n) if nearly sorted" },
    { op: "space", time: "O(1), in place, stable" },
  ], insertion),
  make("merge-sort", "Merge Sort", "Divide the array in half, sort each half, then merge two sorted halves. Predictable O(n log n), at the cost of extra memory.", mergeCode, [
    { op: "time", time: "O(n log n) in every case" },
    { op: "space", time: "O(n) for the temporary halves, stable" },
  ], merge),
  make("quick-sort", "Quick Sort", "Pick a pivot, move smaller values left and larger right, then sort each side. Fast in practice; sorted input is its worst case with this pivot rule.", quickCode, [
    { op: "time", time: "O(n log n) average, O(n²) worst case" },
    { op: "space", time: "O(log n) recursion on average, in place, not stable" },
  ], quick),
  make("heap-sort", "Heap Sort", "Build a max-heap, then repeatedly swap the maximum to the end and restore the heap. O(n log n) with O(1) extra space.", heapCode, [
    { op: "time", time: "O(n log n) in every case" },
    { op: "space", time: "O(1), in place, not stable" },
  ], heap),
];
