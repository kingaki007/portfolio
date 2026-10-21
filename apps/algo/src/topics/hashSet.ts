import type { Step, Topic } from "../engine/types";
import { parseOps, seq, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";

export interface HEntry {
  key: number;
  /** simulated memory address of this node */
  addr: number;
}

export interface HTable {
  addr: number;
  buckets: HEntry[][];
}

export interface HashState {
  table: HTable;
  /** previous table while a resize is in flight */
  old: HTable | null;
  count: number;
  /** highlighted bucket in the current table */
  hb: number | null;
  /** highlighted entry addresses and how */
  he: Record<number, string>;
  /** highlighted bucket in the old table */
  ob: number | null;
  /** free-form computation shown above the table, e.g. "7 % 8 = 7" */
  calc: string;
  /** bytes allocated so far (bump allocator, nothing is reused in this model) */
  bytes: number;
}

const code = `class HashSet {
  private table: (Entry | null)[] = Array(8).fill(null);
  private size = 0;

  private hash(key: number) {
    return ((key % this.table.length) + this.table.length) % this.table.length;
  }

  add(key: number) {
    if (this.has(key)) return;
    const i = this.hash(key);
    this.table[i] = { key, next: this.table[i] };
    this.size++;
    if (this.size / this.table.length > 0.75) this.resize();
  }

  has(key: number) {
    for (let e = this.table[this.hash(key)]; e; e = e.next) {
      if (e.key === key) return true;
    }
    return false;
  }

  remove(key: number) {
    const i = this.hash(key);
    let prev = null;
    for (let e = this.table[i]; e; prev = e, e = e.next) {
      if (e.key === key) {
        if (prev) prev.next = e.next;
        else this.table[i] = e.next;
        this.size--;
        return;
      }
    }
  }

  private resize() {
    const old = this.table;
    this.table = Array(old.length * 2).fill(null);
    this.size = 0;
    for (const head of old) {
      for (let e = head; e; e = e.next) this.add(e.key);
    }
  }
}`;

const L = {
  hashFn: lineOf(code, "return ((key % this.table.length)"),
  addHas: lineOf(code, "if (this.has(key)) return;"),
  addHash: lineOf(code, "const i = this.hash(key);"),
  addLink: lineOf(code, "this.table[i] = { key, next: this.table[i] };"),
  addSize: lineOf(code, "this.size++;"),
  addLoad: lineOf(code, "if (this.size / this.table.length > 0.75)"),
  hasLoop: lineOf(code, "for (let e = this.table[this.hash(key)]; e; e = e.next)"),
  hasCmp: lineOf(code, "if (e.key === key) return true;"),
  hasEnd: lineOf(code, "return false;"),
  rmHash: lineOf(code, "const i = this.hash(key);", lineOf(code, "remove(")),
  rmLoop: lineOf(code, "for (let e = this.table[i]; e; prev = e, e = e.next)"),
  rmCmp: lineOf(code, "if (e.key === key) {"),
  rmUnlink: lineOf(code, "if (prev) prev.next = e.next;"),
  rmSize: lineOf(code, "this.size--;"),
  resAlloc: lineOf(code, "this.table = Array(old.length * 2).fill(null);"),
  resOld: lineOf(code, "const old = this.table;"),
  resLoop: lineOf(code, "for (const head of old)"),
  resAdd: lineOf(code, "for (let e = head; e; e = e.next) this.add(e.key);"),
};

export const hashSetTopic: Topic = {
  id: "hash-set",
  title: "Hash Set (memory view)",
  group: "Hashing",
  blurb: "Keys hashed into buckets with chaining. Watch the bucket array, the node addresses, collisions and the resize.",
  syntax: "add <n>, has <n>, remove <n>",
  code,
  complexity: [
    { op: "add / has / remove", time: "O(1) average, O(n) worst case" },
    { op: "resize", time: "O(n), amortised O(1) per add" },
    { op: "space", time: "O(n) nodes + O(capacity) buckets" },
  ],
};

export const parseHashSet = (input: string) => parseOps(input, { add: 1, has: 1, remove: 1 });

export const hex = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");

const INITIAL_CAP = 8;

export function hashSetSteps(ops: ParsedOp[]): Step<HashState>[] {
  let bump = 0x1000;
  const alloc = (bytes: number) => {
    const a = bump;
    bump += bytes;
    return a;
  };
  const allocTable = (cap: number): HTable => ({ addr: alloc(cap * 8), buckets: Array.from({ length: cap }, () => []) });

  let table = allocTable(INITIAL_CAP);
  let old: HTable | null = null;
  let count = 0;
  let opIdx = -1;
  const steps: Step<HashState>[] = [];

  const clone = (t: HTable): HTable => ({ addr: t.addr, buckets: t.buckets.map((b) => b.map((e) => ({ ...e }))) });
  const snap = (note: string, lines: number[], extra: Partial<Pick<HashState, "hb" | "he" | "ob" | "calc">> = {}) =>
    steps.push({
      state: { table: clone(table), old: old ? clone(old) : null, count, hb: null, he: {}, ob: null, calc: "", bytes: bump - 0x1000, ...extra },
      lines,
      note,
      op: opIdx,
    });
  const hashOf = (k: number, cap: number) => ((k % cap) + cap) % cap;

  snap(`Empty set: a bucket array of ${INITIAL_CAP} slots at ${hex(table.addr)}. Press play to run the operations.`, []);

  /** walk the chain comparing keys; returns the matching entry index or -1 */
  const probe = (k: number, b: number, lines: [number, number]) => {
    const chain = table.buckets[b];
    for (let j = 0; j < chain.length; j++) {
      if (chain[j].key === k) {
        snap(`Compare ${chain[j].key} with ${k}: match.`, [lines[1]], { hb: b, he: { [chain[j].addr]: "found" } });
        return j;
      }
      snap(`Compare ${chain[j].key} with ${k}: different, follow next.`, [lines[0]], { hb: b, he: { [chain[j].addr]: "cmp" } });
    }
    return -1;
  };

  const add = (k: number, rehash = false) => {
    const cap = table.buckets.length;
    const b = hashOf(k, cap);
    snap(`hash(${k}) = ${k} mod ${cap} = ${b}. Go to bucket ${b}.`, [rehash ? L.resAdd : L.addHash], { hb: b, calc: `${k} % ${cap} = ${b}` });
    if (!rehash) {
      if (table.buckets[b].length) snap(`Bucket ${b} already holds ${table.buckets[b].length} item(s): check for the key first.`, [L.addHas], { hb: b });
      if (probe(k, b, [L.hasLoop, L.hasCmp]) !== -1) {
        snap(`${k} is already in the set, so add does nothing (sets hold unique keys).`, [L.addHas], { hb: b });
        return;
      }
    }
    const entry: HEntry = { key: k, addr: alloc(16) };
    const collided = table.buckets[b].length > 0;
    table.buckets[b] = [entry, ...table.buckets[b]];
    count++;
    snap(
      collided
        ? `Collision: bucket ${b} is taken. Allocate a node at ${hex(entry.addr)} and chain it in front.`
        : `Allocate a node at ${hex(entry.addr)} (key + next pointer, 16 bytes) and store it in bucket ${b}.`,
      [L.addLink],
      { hb: b, he: { [entry.addr]: "new" }, calc: `${k} % ${cap} = ${b}` },
    );
    if (rehash) return;
    const lf = count / cap;
    snap(`Load factor = ${count} / ${cap} = ${lf.toFixed(2)}${lf > 0.75 ? ", above 0.75: time to grow." : ", within 0.75."}`, [L.addSize, L.addLoad], { hb: b });
    if (lf > 0.75) resize();
  };

  const resize = () => {
    const prev = table;
    const newCap = prev.buckets.length * 2;
    old = prev;
    table = allocTable(newCap);
    count = 0;
    snap(`Allocate a new array of ${newCap} buckets at ${hex(table.addr)}. Every key must be rehashed because the modulus changed.`, [L.resOld, L.resAlloc]);
    for (let b = 0; b < prev.buckets.length; b++) {
      for (const e of [...prev.buckets[b]]) {
        const nb = hashOf(e.key, newCap);
        snap(`Rehash ${e.key}: ${e.key} mod ${newCap} = ${nb}.`, [L.resLoop, L.resAdd], { ob: b, hb: nb, he: { [e.addr]: "cmp" }, calc: `${e.key} % ${newCap} = ${nb}` });
        const ne: HEntry = { key: e.key, addr: alloc(16) };
        table.buckets[nb] = [ne, ...table.buckets[nb]];
        count++;
        snap(`Copy ${e.key} into a fresh node at ${hex(ne.addr)} in new bucket ${nb}.`, [L.resAdd], { ob: b, hb: nb, he: { [ne.addr]: "new" } });
      }
      prev.buckets[b] = [];
    }
    old = null;
    snap(`Rehash finished. The old array is released. Capacity is now ${newCap}, load factor ${(count / newCap).toFixed(2)}.`, [L.resAdd]);
  };

  const has = (k: number) => {
    const cap = table.buckets.length;
    const b = hashOf(k, cap);
    snap(`hash(${k}) = ${k} mod ${cap} = ${b}.`, [L.hasLoop], { hb: b, calc: `${k} % ${cap} = ${b}` });
    if (table.buckets[b].length === 0) {
      snap(`Bucket ${b} is empty, so ${k} is not in the set.`, [L.hasEnd], { hb: b });
      return;
    }
    if (probe(k, b, [L.hasLoop, L.hasCmp]) === -1) snap(`End of the chain: ${k} is not in the set.`, [L.hasEnd], { hb: b });
  };

  const remove = (k: number) => {
    const cap = table.buckets.length;
    const b = hashOf(k, cap);
    snap(`hash(${k}) = ${k} mod ${cap} = ${b}.`, [L.rmHash], { hb: b, calc: `${k} % ${cap} = ${b}` });
    const chain = table.buckets[b];
    const j = chain.length ? probe(k, b, [L.rmLoop, L.rmCmp]) : -1;
    if (j === -1) {
      snap(chain.length ? `${k} is not in bucket ${b}. Nothing to remove.` : `Bucket ${b} is empty. Nothing to remove.`, [L.rmLoop], { hb: b });
      return;
    }
    const gone = chain[j];
    snap(j === 0 ? `It is the first node: point the bucket at its next.` : `Point the previous node's next past ${k}.`, [L.rmUnlink], { hb: b, he: { [gone.addr]: "del" } });
    table.buckets[b] = chain.filter((_, x) => x !== j);
    count--;
    snap(`Unlinked. The node at ${hex(gone.addr)} is garbage; size is ${count}.`, [L.rmSize], { hb: b });
  };

  ops.forEach((o, i) => {
    opIdx = i;
    if (o.op === "add") add(o.value!);
    else if (o.op === "has") has(o.value!);
    else remove(o.value!);
  });
  return steps;
}

export const hashSetPresets: Preset[] = [
  { name: "Basics", desc: "Add, search and remove with no collisions.", input: "add 3, add 10, add 5, has 10, has 7, add 14, remove 10, has 10" },
  { name: "Collisions", desc: "Keys that share a bucket (same remainder mod 8) chain together.", input: "add 3, add 11, add 19, add 27, has 19, remove 11, has 11, add 3, add 35" },
  { name: "Resize and rehash", desc: "Add past the 0.75 load factor; the table doubles and every key moves.", input: "add 1, add 2, add 3, add 4, add 5, add 6, add 7, add 8, add 9, has 9, has 3" },
  {
    name: "Stress test (45 ops)",
    desc: "Many keys including negatives, duplicates and two resizes.",
    input: [...seq(24, (i) => `add ${((i * 37 + 11) % 100) - 20}`), "add 17", "add 17", ...seq(10, (i) => `has ${((i * 37 + 11) % 100) - 20}`), ...seq(9, (i) => `remove ${((i * 37 + 11) % 100) - 20}`)].join(", "),
  },
];
