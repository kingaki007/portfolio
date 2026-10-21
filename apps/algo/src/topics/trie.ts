import type { Step, Topic } from "../engine/types";
import { MAX_OPS, seq, splitOps, type ParseResult, type ParsedOp, type Preset } from "../engine/parse";
import { lineOf } from "../engine/lines";
import type { Marks } from "../components/TreeViz";
import type { NNode } from "../components/NaryViz";

export interface TrieState {
  roots: NNode[];
  marks: Marks;
  words: string[];
}

const code = `class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
    }
    node.isWord = true;
  }

  search(word: string): boolean {
    const node = this.find(word);
    return node !== null && node.isWord;
  }

  startsWith(prefix: string): boolean {
    return this.find(prefix) !== null;
  }

  remove(word: string): boolean {
    const path: [TrieNode, string][] = [];
    let node = this.root;
    for (const ch of word) {
      const next = node.children.get(ch);
      if (!next) return false;
      path.push([node, ch]);
      node = next;
    }
    if (!node.isWord) return false;
    node.isWord = false;
    for (let i = path.length - 1; i >= 0; i--) {
      const [parent, ch] = path[i];
      const child = parent.children.get(ch)!;
      if (child.isWord || child.children.size > 0) break;
      parent.children.delete(ch);
    }
    return true;
  }

  autocomplete(prefix: string): string[] {
    const start = this.find(prefix);
    const out: string[] = [];
    const walk = (node: TrieNode, text: string): void => {
      if (node.isWord) out.push(text);
      for (const [ch, child] of [...node.children].sort(([a], [b]) => a.localeCompare(b))) walk(child, text + ch);
    };
    if (start) walk(start, prefix);
    return out;
  }

  private find(text: string): TrieNode | null {
    let node = this.root;
    for (const ch of text) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }
}`;

export const trieCode = code;

export const trieTopic: Topic = {
  id: "trie",
  title: "Trie (prefix tree)",
  group: "Trees",
  blurb: "One node per letter, so words that share a prefix share a path. Insert, search, prefix check, autocomplete and delete with pruning of dead branches.",
  syntax: "insert <word>, search <word>, startsWith <prefix>, autocomplete <prefix>, remove <word>   (letters a to z, up to 10)",
  code,
  complexity: [
    { op: "insert / search / startsWith / remove", time: "O(L), L = length of the word" },
    { op: "autocomplete", time: "O(L + size of the subtree)" },
    { op: "space", time: "O(total letters) in the worst case, less when prefixes are shared" },
  ],
};

const OPS = ["insert", "search", "startswith", "autocomplete", "remove"];
const CANON: Record<string, string> = { insert: "insert", search: "search", startswith: "startsWith", autocomplete: "autocomplete", remove: "remove" };

export function parseTrie(input: string): ParseResult {
  const tokens = splitOps(input);
  if (tokens.length === 0) return { error: "Enter at least one operation, like insert cat." };
  if (tokens.length > MAX_OPS) return { error: `Too many operations (max ${MAX_OPS}).` };
  const ops: ParsedOp[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const parts = tokens[i].split(/\s+/);
    const label = `Operation ${i + 1} ("${tokens[i]}")`;
    const op = parts[0].toLowerCase();
    if (!OPS.includes(op)) return { error: `${label}: unknown operation. Use insert, search, startsWith, autocomplete, remove.` };
    if (parts.length !== 2) return { error: `${label}: needs one word, like "${CANON[op]} cat".` };
    if (!/^[A-Za-z]{1,10}$/.test(parts[1])) return { error: `${label}: words are 1 to 10 letters (a to z).` };
    ops.push({ op: CANON[op], names: [parts[1].toLowerCase()] });
  }
  return { ops };
}

const L = {
  insLoop: lineOf(code, "for (const ch of word) {"),
  insMake: lineOf(code, "if (!node.children.has(ch)) node.children.set(ch, new TrieNode());"),
  insMove: lineOf(code, "node = node.children.get(ch)!;"),
  insEnd: lineOf(code, "node.isWord = true;"),
  search: lineOf(code, "const node = this.find(word);"),
  searchRet: lineOf(code, "return node !== null && node.isWord;"),
  starts: lineOf(code, "return this.find(prefix) !== null;"),
  rmWalk: lineOf(code, "const next = node.children.get(ch);", lineOf(code, "remove(word")),
  rmMissing: lineOf(code, "if (!next) return false;", lineOf(code, "remove(word")),
  rmNotWord: lineOf(code, "if (!node.isWord) return false;"),
  rmUnmark: lineOf(code, "node.isWord = false;"),
  rmPrune: lineOf(code, "if (child.isWord || child.children.size > 0) break;"),
  rmDelete: lineOf(code, "parent.children.delete(ch);"),
  rmRet: lineOf(code, "return true;"),
  acFind: lineOf(code, "const start = this.find(prefix);"),
  acWalk: lineOf(code, "if (node.isWord) out.push(text);"),
  acStart: lineOf(code, "if (start) walk(start, prefix);"),
  findLoop: lineOf(code, "for (const ch of text) {"),
  findMiss: lineOf(code, "if (!next) return null;"),
  findMove: lineOf(code, "node = next;", lineOf(code, "private find")),
};

interface TN {
  ch: string;
  path: string;
  isWord: boolean;
  kids: Map<string, TN>;
}

export function trieSteps(ops: ParsedOp[]): Step<TrieState>[] {
  const root: TN = { ch: "•", path: "", isWord: false, kids: new Map() };
  const steps: Step<TrieState>[] = [];
  let opIdx = -1;

  const toN = (n: TN): NNode => ({
    id: n.path === "" ? "root" : n.path,
    label: n.ch,
    sub: n.isWord ? "✓" : undefined,
    cls: n.isWord ? "wordend" : undefined,
    kids: [...n.kids.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, c]) => toN(c)),
  });
  const words = (n: TN, text = ""): string[] => [...(n.isWord ? [text] : []), ...[...n.kids.entries()].sort(([a], [b]) => a.localeCompare(b)).flatMap(([c, k]) => words(k, text + c))];
  const idOf = (n: TN) => (n.path === "" ? "root" : n.path);
  const snap = (note: string, lines: number[], marks: Marks = {}) =>
    steps.push({ state: { roots: [toN(root)], marks, words: words(root) }, lines, note, op: opIdx });

  snap("An empty trie: just the root. Press play to run the operations.", []);

  /** walk as far as the text goes; returns the node reached and how many letters matched */
  const walk = (text: string, lines: { loop: number; miss: number; move: number }, who: string) => {
    let node = root;
    const visited: TN[] = [root];
    const marks = (extra: Marks = {}): Marks => {
      const m: Marks = {};
      visited.forEach((v) => (m[idOf(v)] = "cmp"));
      return { ...m, ...extra };
    };
    snap(`${who}: start at the root.`, [lines.loop], marks());
    for (const ch of text) {
      const next = node.kids.get(ch);
      if (!next) {
        snap(`No child "${ch}" under "${node.path || "root"}": the path stops here.`, [lines.miss], marks());
        return { node: null as TN | null, visited, marks };
      }
      node = next;
      visited.push(node);
      snap(`Follow the "${ch}" child to "${node.path}".`, [lines.move], marks());
    }
    return { node: node as TN | null, visited, marks };
  };

  const insert = (word: string) => {
    let node = root;
    const trail: Marks = { root: "cmp" };
    snap(`insert("${word}"): start at the root.`, [L.insLoop], trail);
    for (const ch of word) {
      let next = node.kids.get(ch);
      if (!next) {
        next = { ch, path: node.path + ch, isWord: false, kids: new Map() };
        node.kids.set(ch, next);
        snap(`"${node.path || "root"}" has no "${ch}" child yet: create one.`, [L.insMake], { ...trail, [idOf(next)]: "new" });
      } else snap(`"${ch}" already exists under "${node.path || "root"}": reuse it (shared prefix).`, [L.insMake, L.insMove], { ...trail, [idOf(next)]: "cmp" });
      node = next;
      trail[idOf(node)] = "cmp";
    }
    if (node.isWord) snap(`"${word}" was already stored as a word.`, [L.insEnd], { ...trail, [idOf(node)]: "found" });
    else {
      node.isWord = true;
      snap(`Mark the last node as the end of a word: "${word}" is stored.`, [L.insEnd], { ...trail, [idOf(node)]: "new" });
    }
  };

  const search = (word: string, prefixOnly: boolean) => {
    const r = walk(word, { loop: prefixOnly ? L.starts : L.search, miss: L.findMiss, move: L.findMove }, `${prefixOnly ? "startsWith" : "search"}("${word}")`);
    if (!r.node) {
      snap(`${prefixOnly ? "startsWith" : "search"} returns false: nothing in the trie starts with "${word}".`, [prefixOnly ? L.starts : L.searchRet], r.marks());
      return;
    }
    if (prefixOnly) snap(`The whole prefix "${word}" was found, so startsWith returns true.`, [L.starts], r.marks({ [idOf(r.node)]: "found" }));
    else if (r.node.isWord) snap(`Reached "${word}" and it is marked as a word: search returns true.`, [L.searchRet], r.marks({ [idOf(r.node)]: "found" }));
    else snap(`The path "${word}" exists but is not marked as a word (it is only a prefix of other words): search returns false.`, [L.searchRet], r.marks({ [idOf(r.node)]: "del" }));
  };

  const remove = (word: string) => {
    const r = walk(word, { loop: L.rmWalk, miss: L.rmMissing, move: L.rmWalk }, `remove("${word}")`);
    if (!r.node) {
      snap(`remove returns false: "${word}" is not stored.`, [L.rmMissing], r.marks());
      return;
    }
    if (!r.node.isWord) {
      snap(`"${word}" is only a prefix, not a stored word: remove returns false.`, [L.rmNotWord], r.marks({ [idOf(r.node)]: "del" }));
      return;
    }
    r.node.isWord = false;
    snap(`Un-mark "${word}" as a word.`, [L.rmUnmark], r.marks({ [idOf(r.node)]: "del" }));
    for (let i = r.visited.length - 1; i >= 1; i--) {
      const child = r.visited[i];
      const parent = r.visited[i - 1];
      if (child.isWord || child.kids.size > 0) {
        snap(`"${child.path}" is still needed (${child.isWord ? "it ends another word" : "it has other children"}), so stop pruning.`, [L.rmPrune], r.marks({ [idOf(child)]: "found" }));
        break;
      }
      snap(`"${child.path}" ends no word and has no children: prune it.`, [L.rmPrune, L.rmDelete], r.marks({ [idOf(child)]: "del" }));
      parent.kids.delete(child.ch);
      r.visited.length = i;
    }
    snap(`remove returns true. Words left: ${words(root).join(", ") || "none"}.`, [L.rmRet]);
  };

  const autocomplete = (prefix: string) => {
    const r = walk(prefix, { loop: L.acFind, miss: L.findMiss, move: L.findMove }, `autocomplete("${prefix}")`);
    if (!r.node) {
      snap(`No path for "${prefix}", so there are no suggestions.`, [L.acStart], r.marks());
      return;
    }
    const found = words(r.node, prefix);
    const m: Marks = r.marks();
    const mark = (n: TN) => {
      if (n.isWord) m[idOf(n)] = "ok";
      n.kids.forEach(mark);
    };
    mark(r.node);
    snap(found.length ? `Collect every word below "${prefix}" with a depth-first walk in alphabetical order: ${found.join(", ")}.` : `"${prefix}" exists as a path but no stored word continues from it.`, [L.acStart, L.acWalk], m);
  };

  ops.forEach((o, i) => {
    opIdx = i;
    const w = o.names![0];
    if (o.op === "insert") insert(w);
    else if (o.op === "search") search(w, false);
    else if (o.op === "startsWith") search(w, true);
    else if (o.op === "remove") remove(w);
    else autocomplete(w);
  });
  return steps;
}

export const triePresets: Preset[] = [
  { name: "Basics", desc: "Shared prefixes, then search, prefix and autocomplete.", input: "insert cat, insert car, insert cart, insert dog, search car, search ca, startsWith ca, startsWith do, autocomplete ca, remove car, search cart, search car" },
  { name: "Heavy prefix sharing", desc: "The tea / ten / team / tent family and in / inn.", input: "insert tea, insert ten, insert team, insert tent, insert to, insert in, insert inn, autocomplete te, autocomplete i, search te, startsWith te, remove tea, autocomplete te" },
  { name: "Edge cases", desc: "Duplicates, removing prefixes and missing words.", input: "search a, remove a, insert a, insert a, search a, remove a, startsWith a, insert abc, remove ab, remove abc, autocomplete a, search abc" },
  {
    name: "Dictionary (30 ops)",
    desc: "A dozen words, lookups, prefix queries and deletions.",
    input: ["apple", "app", "apply", "apt", "bat", "bath", "bee", "beer", "bear", "cab", "cat", "cart"].map((w) => `insert ${w}`).join(", ") + ", " + seq(3, (i) => `search ${["app", "bear", "ca"][i]}`).join(", ") + ", autocomplete ap, autocomplete be, startsWith ba, remove app, autocomplete ap, remove apple, remove apply, autocomplete a, remove bee, autocomplete be",
  },
];
