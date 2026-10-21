import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { parseNumbers, sorting, sortCode } from "./sorting";

function load(code: string, name: string) {
  const js = transformSync(code, { loader: "ts" }).code;
  return new Function(`${js}\nreturn ${name};`)() as (a: number[]) => number[];
}

const impl: Record<string, [string, string]> = {
  "bubble-sort": [sortCode.bubbleCode, "bubbleSort"],
  "selection-sort": [sortCode.selectionCode, "selectionSort"],
  "insertion-sort": [sortCode.insertionCode, "insertionSort"],
  "merge-sort": [sortCode.mergeCode, "mergeSort"],
  "quick-sort": [sortCode.quickCode, "quickSort"],
  "heap-sort": [sortCode.heapCode, "heapSort"],
};

let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const randomArray = (n: number, max = 50) => Array.from({ length: n }, () => Math.floor(rnd() * max));

describe("parseNumbers", () => {
  it("accepts commas and spaces, rejects junk and big values", () => {
    expect("ops" in parseNumbers("3 1, 2\n9")).toBe(true);
    for (const bad of ["", "a, 2", "-3", "1.5", "1000", Array(41).fill("1").join(",")]) expect("error" in parseNumbers(bad)).toBe(true);
  });
});

for (const t of sorting) {
  describe(t.topic.id, () => {
    const [code, name] = impl[t.topic.id];
    const fn = load(code, name);

    it("the code on screen sorts correctly (random, sorted, reversed, duplicates, tiny)", () => {
      const cases = [[], [1], [2, 1], [3, 3, 3], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], ...Array.from({ length: 60 }, () => randomArray(1 + Math.floor(rnd() * 30)))];
      for (const c of cases) {
        const input = [...c];
        expect(fn(c)).toEqual([...input].sort((a, b) => a - b));
        if (t.topic.id !== "merge-sort" && t.topic.id !== "quick-sort") expect(c).toEqual(input); // the copying sorts must not mutate their input
      }
    });

    const check = (values: number[]) => {
      const r = t.parse(values.join(","));
      if ("error" in r) throw new Error(r.error);
      const steps = t.run(r.ops);
      const sorted = [...values].sort((a, b) => a - b);
      const lineCount = code.split("\n").length;
      for (const s of steps) {
        // every frame is a permutation of the input with unique ids
        expect(s.state.items.map((x) => x.v).sort((a, b) => a - b)).toEqual(sorted);
        expect(new Set(s.state.items.map((x) => x.id)).size).toBe(values.length);
        for (const l of s.lines) expect(l >= 1 && l <= lineCount).toBe(true);
      }
      const last = steps[steps.length - 1].state;
      expect(last.items.map((x) => x.v)).toEqual(sorted);
      expect(last.items.every((x) => last.marks[x.id] === "ok")).toBe(true);
    };

    for (const p of t.presets) {
      it(`preset "${p.name}" animates to a sorted result`, () => {
        const r = t.parse(p.input);
        if ("error" in r) throw new Error(r.error);
        check(r.ops.map((o) => o.value!));
      });
    }
    it("every frame stays a valid permutation on random inputs and edge cases", () => {
      for (const c of [[7], [2, 1], [4, 4, 4], ...Array.from({ length: 25 }, () => randomArray(2 + Math.floor(rnd() * 20), 30))]) check(c);
    });
  });
}
