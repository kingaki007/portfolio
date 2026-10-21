export interface TNode {
  /** stable identity so the node can glide between layouts */
  id: number | string;
  label: string | number;
  /** small text under the node, e.g. balance factor */
  sub?: string;
  /** extra CSS class, e.g. "red" or "black" for red-black trees */
  cls?: string;
  l?: TNode | null;
  r?: TNode | null;
}

/** highlight class per node id: "cmp" | "swap" | "found" | "new" | "del" | "ok" */
export type Marks = Record<string | number, string>;

interface Placed {
  n: TNode;
  x: number;
  y: number;
  px?: number;
  py?: number;
}

const GAP = 54;
const LEVEL = 74;
const R = 21;

/** In-order x, depth y. Keeps BSTs readable without a heavy layout algorithm. */
export function layoutTree(root: TNode | null | undefined): { nodes: Placed[]; width: number; height: number } {
  const nodes: Placed[] = [];
  let i = 0;
  let maxDepth = 0;
  const walk = (n: TNode | null | undefined, d: number, parent?: Placed) => {
    if (!n) return;
    maxDepth = Math.max(maxDepth, d);
    const placeholder: Placed = { n, x: 0, y: d * LEVEL + R + 8, px: parent?.x, py: parent?.y };
    walk(n.l, d + 1, placeholder);
    placeholder.x = i++ * GAP + R + 8;
    // children were placed before parent x was known; patch their parent anchor
    nodes.push(placeholder);
    walk(n.r, d + 1, placeholder);
  };
  walk(root, 0);
  // second pass: resolve parent anchors now that every x is final
  const byId = new Map(nodes.map((p) => [p.n.id, p]));
  for (const p of nodes) {
    for (const c of [p.n.l, p.n.r]) {
      if (!c) continue;
      const child = byId.get(c.id)!;
      child.px = p.x;
      child.py = p.y;
    }
  }
  return { nodes, width: Math.max(1, i) * GAP + 16, height: (maxDepth + 1) * LEVEL + 20 };
}

export function TreeViz({ root, marks = {}, empty = "empty tree" }: { root: TNode | null | undefined; marks?: Marks; empty?: string }) {
  if (!root) return <div className="empty">{empty}</div>;
  const { nodes, width, height } = layoutTree(root);
  return (
    <svg className="tree" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tree diagram" style={{ maxHeight: 360 }}>
      {nodes.map((p) =>
        p.px === undefined ? null : (
          <line key={`e${p.n.id}`} x1={p.px} y1={p.py} x2={p.x} y2={p.y} className="edge" />
        ),
      )}
      {nodes.map((p) => (
        <g key={p.n.id} className={`tnode ${p.n.cls ?? ""} ${marks[p.n.id] ?? ""}`} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
          <circle r={R} />
          <text textAnchor="middle" dy="5">{p.n.label}</text>
          {p.n.sub && <text className="sub" textAnchor="middle" dy={R + 14}>{p.n.sub}</text>}
        </g>
      ))}
    </svg>
  );
}
