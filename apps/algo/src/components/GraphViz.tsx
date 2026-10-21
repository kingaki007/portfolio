import type { GraphState } from "../topics/graph";

const W = 380;
const H = 300;
const R = 19;

export function layoutCircle(n: number) {
  const cx = W / 2;
  const cy = H / 2;
  const rad = n <= 1 ? 0 : Math.min(118, 40 + n * 12);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  });
}

export function GraphViz({
  s,
  weighted = true,
}: {
  s: GraphState;
  weighted?: boolean;
}) {
  const pos = new Map(
    s.nodes.map((n, i) => [n, layoutCircle(s.nodes.length)[i]]),
  );
  const hasPair = (a: string, b: string) =>
    s.edges.some((e) => e.dir && e.a === b && e.b === a);

  return (
    <div className="gv">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="graph"
        role="img"
        aria-label="Graph diagram"
      >
        <defs>
          <marker
            id="garrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {s.edges.map((e, i) => {
          const p = pos.get(e.a)!;
          const q = pos.get(e.b)!;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          // keep parallel directed pairs apart
          const off = e.dir && hasPair(e.a, e.b) ? 7 : 0;
          const nx = -uy * off;
          const ny = ux * off;
          const x1 = p.x + ux * R + nx;
          const y1 = p.y + uy * R + ny;
          const x2 = q.x - ux * (R + (e.dir ? 4 : 0)) + nx;
          const y2 = q.y - uy * (R + (e.dir ? 4 : 0)) + ny;
          const mx = (x1 + x2) / 2 - uy * 11 + nx;
          const my = (y1 + y2) / 2 + ux * 11 + ny;
          return (
            <g key={i} className={`gedge ${s.edgeMarks[i] ?? ""}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                markerEnd={e.dir ? "url(#garrow)" : undefined}
              />
              {weighted && e.w !== null && (
                <text x={mx} y={my} textAnchor="middle" dy="4" className="gw">
                  {e.w}
                </text>
              )}
            </g>
          );
        })}
        {s.nodes.map((n) => {
          const p = pos.get(n)!;
          return (
            <g
              key={n}
              className={`gnode ${s.nodeMarks[n] ?? ""}`}
              transform={`translate(${p.x} ${p.y})`}
            >
              <circle r={R} />
              <text textAnchor="middle" dy="5">
                {n}
              </text>
              {s.nodeNotes[n] !== undefined && (
                <text className="gnote" textAnchor="middle" y={R + 14}>
                  {s.nodeNotes[n]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="gpanels">
        {s.panels.map((p) => (
          <div className="gpanel" key={p.title}>
            <div className="gpanel-t">{p.title}</div>
            <div className="gcells">
              {p.cells.length === 0 && (
                <span className="muted mono">{p.empty ?? "empty"}</span>
              )}
              {p.cells.map((c, i) => (
                <span key={i} className={`gc ${c.cls ?? ""}`}>
                  {c.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
