/**
 * Draws the sorting algorithms as bars that slide to their new positions, with comparison and
 * move counters and colours for compared, swapped, pivot and sorted bars.
 */

import type { SortState } from "../topics/sorting";

/**
 * Renders one bar per item (height from its value, position from its index) with the live counters
 * above.
 */
export function SortViz({ s }: { s: SortState }) {
  const n = s.items.length;
  const max = Math.max(1, ...s.items.map((x) => x.v));
  const showLabels = n <= 24;
  return (
    <div className="stagecol sort">
      <div className="mono sort-stats">
        <span>comparisons {s.cmps}</span>
        <span>moves {s.moves}</span>
        <span>n = {n}</span>
      </div>
      <div
        className="bars"
        role="img"
        aria-label={`Bars: ${s.items.map((x) => x.v).join(", ")}`}
      >
        {s.items.map((it, i) => (
          <div
            key={it.id}
            className={`bar ${s.marks[it.id] ?? ""}`}
            style={{
              left: `${(i * 100) / n}%`,
              width: `calc(${100 / n}% - 3px)`,
              height: `${8 + (it.v / max) * 92}%`,
            }}
          >
            {showLabels && <span>{it.v}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
