import type { Marks } from "./TreeViz";

export interface NNode {
  id: string | number;
  /** circle text, used when `keys` is absent */
  label?: string;
  /** several keys in one rounded box (2-3-4 trees, B-trees) */
  keys?: (string | number)[];
  sub?: string;
  /** extra CSS class, e.g. "wordend" */
  cls?: string;
  kids: NNode[];
}

interface Placed {
  n: NNode;
  x: number;
  y: number;
  w: number;
  px?: number;
  py?: number;
}

const LEVEL = 78;
const KEY_W = 34;
const R = 19;
const GAP = 14;

const ownWidth = (n: NNode) =>
  (n.keys ? n.keys.length * KEY_W + 10 : R * 2) + GAP;

export function layoutNary(roots: NNode[]) {
  const widths = new Map<NNode, number>();
  const width = (n: NNode): number => {
    const own = ownWidth(n);
    const kids = n.kids.reduce((s, k) => s + width(k), 0);
    const w = Math.max(own, kids);
    widths.set(n, w);
    return w;
  };
  const placed: Placed[] = [];
  let maxDepth = 0;
  const place = (n: NNode, left: number, depth: number, parent?: Placed) => {
    const w = widths.get(n)!;
    maxDepth = Math.max(maxDepth, depth);
    const p: Placed = {
      n,
      x: left + w / 2,
      y: depth * LEVEL + 30,
      w,
      px: parent?.x,
      py: parent?.y,
    };
    placed.push(p);
    const kidsW = n.kids.reduce((s, k) => s + widths.get(k)!, 0);
    let cursor = left + (w - kidsW) / 2;
    for (const k of n.kids) {
      place(k, cursor, depth + 1, p);
      cursor += widths.get(k)!;
    }
  };
  let cursor = 0;
  for (const r of roots) width(r);
  for (const r of roots) {
    place(r, cursor, 0);
    cursor += widths.get(r)!;
  }
  return {
    placed,
    width: Math.max(cursor, 60),
    height: (maxDepth + 1) * LEVEL + 24,
  };
}

export function NaryViz({
  roots,
  marks = {},
  empty = "empty",
}: {
  roots: NNode[];
  marks?: Marks;
  empty?: string;
}) {
  if (roots.length === 0) return <div className="empty">{empty}</div>;
  const { placed, width, height } = layoutNary(roots);
  return (
    <svg
      className="tree nary"
      viewBox={`0 0 ${width} ${height}`}
      style={{ minWidth: Math.min(width, 640), maxHeight: 380 }}
      role="img"
      aria-label="Tree diagram"
    >
      {placed.map((p) =>
        p.px === undefined ? null : (
          <line
            key={`e${p.n.id}`}
            x1={p.px}
            y1={p.py! + (p.n.keys ? 14 : R)}
            x2={p.x}
            y2={p.y - (p.n.keys ? 14 : R)}
            className="edge"
          />
        ),
      )}
      {placed.map((p) => {
        const cls = `tnode ${p.n.cls ?? ""} ${marks[p.n.id] ?? ""}`;
        const style = { transform: `translate(${p.x}px, ${p.y}px)` };
        if (p.n.keys) {
          const w = p.n.keys.length * KEY_W + 10;
          return (
            <g key={p.n.id} className={`${cls} multi`} style={style}>
              <rect x={-w / 2} y={-15} width={w} height={30} rx={8} />
              {p.n.keys.map((k, i) => (
                <text
                  key={i}
                  x={-w / 2 + 5 + KEY_W * i + KEY_W / 2}
                  dy="5"
                  textAnchor="middle"
                >
                  {k}
                </text>
              ))}
              {p.n.sub && (
                <text className="sub" textAnchor="middle" dy="30">
                  {p.n.sub}
                </text>
              )}
            </g>
          );
        }
        return (
          <g key={p.n.id} className={cls} style={style}>
            <circle r={R} />
            <text textAnchor="middle" dy="5">
              {p.n.label}
            </text>
            {p.n.sub && (
              <text className="sub" textAnchor="middle" dy={R + 14}>
                {p.n.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
