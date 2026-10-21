/**
 * Draws a Fenwick tree (binary indexed tree): the underlying array and one bar per tree[i]
 * spanning the positions it covers.
 */

import { covers, type FenState } from "../topics/fenwick";

/**
 * Renders the position row, the array row and the stacked coverage blocks, highlighting the blocks
 * visited by an update or query.
 */
export function FenwickViz({ s }: { s: FenState }) {
  const idx = Array.from({ length: s.n }, (_, i) => i + 1);
  // blocks are stacked by their length so nested blocks sit above the ones they contain
  const level = (i: number) => Math.log2(i & -i);
  const maxLevel = Math.max(...idx.map(level));
  return (
    <div className="stagecol fen">
      {s.info && <div className="mono fen-info">{s.info}</div>}
      <div
        className="fen-grid"
        style={{ gridTemplateColumns: `repeat(${s.n}, minmax(34px, 1fr))` }}
        role="img"
        aria-label="Fenwick tree"
      >
        {idx.map((i) => (
          <div
            key={`i${i}`}
            className="fen-idx"
            style={{ gridColumn: i, gridRow: 1 }}
          >
            {i}
          </div>
        ))}
        {idx.map((i) => (
          <div
            key={`a${i}`}
            className="fen-a"
            style={{ gridColumn: i, gridRow: 2 }}
          >
            {s.a[i]}
          </div>
        ))}
        {idx.map((i) => {
          const { from, to } = covers(i);
          return (
            <div
              key={`b${i}`}
              className={`fen-block ${s.marks[i] ?? ""}`}
              style={{
                gridColumn: `${from} / ${to + 1}`,
                gridRow: 3 + level(i),
              }}
              title={`tree[${i}] covers ${from}..${to}`}
            >
              <span>{s.tree[i]}</span>
              <small>[{i}]</small>
            </div>
          );
        })}
      </div>
      <div className="muted mono fen-legend">
        row 1: position · row 2: a[i] · blocks: tree[i] covers the span shown
      </div>
      <span hidden>{maxLevel}</span>
    </div>
  );
}
