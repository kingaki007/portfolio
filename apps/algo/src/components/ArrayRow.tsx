/**
 * A horizontal row of indexed boxes. Used to show the array form of heaps and union-find (parent
 * and rank arrays), with per-item highlight marks.
 */

import type { Marks } from "./TreeViz";

/**
 * Renders the items as boxes with their index underneath; `marks` colours individual boxes
 * (compared, swapped, found, removed).
 */
export function ArrayRow({
  items,
  marks = {},
  label = "array",
}: {
  items: { id: number | string; v: number | string }[];
  marks?: Marks;
  label?: string;
}) {
  return (
    <div className="arr" role="group" aria-label={label}>
      {items.map((it, i) => (
        <div className="slot" key={it.id}>
          <div className={`box ${marks[it.id] ?? ""}`}>{it.v}</div>
          <span className="idx">{i}</span>
        </div>
      ))}
    </div>
  );
}
