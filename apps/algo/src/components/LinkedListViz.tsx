import type { LLState } from "../topics/linkedList";

const STEP = 96;
const W = 56;
const H = 40;
const Y = 100;

export function LinkedListViz({ s, headLabel = "head" }: { s: LLState; headLabel?: string }) {
  const idx = new Map(s.nodes.map((n, i) => [n.id, i]));
  const cx = (i: number) => 52 + i * STEP;
  const width = Math.max(320, s.nodes.length * STEP + 70);

  const arrow = (from: number, to: number | null, key: number) => {
    const fi = idx.get(from)!;
    const ti = to === null ? -1 : idx.get(to) ?? -1;
    const x1 = cx(fi) + W / 2;
    if (ti === -1) {
      return <g key={key}><line x1={x1} y1={Y} x2={x1 + 26} y2={Y} className="ll-link" markerEnd="url(#ah)" /><text x={x1 + 34} y={Y + 4} className="ll-null">∅</text></g>;
    }
    if (ti === fi + 1) {
      return <line key={key} x1={x1} y1={Y} x2={cx(ti) - W / 2 - 2} y2={Y} className="ll-link" markerEnd="url(#ah)" />;
    }
    // non-adjacent: arc above for forward skips, below for backward links
    const up = ti > fi;
    const sx = cx(fi);
    const ex = cx(ti);
    const sy = up ? Y - H / 2 : Y + H / 2;
    const cy = up ? Y - 80 : Y + 80;
    return <path key={key} d={`M ${sx} ${sy} Q ${(sx + ex) / 2} ${cy} ${ex} ${sy + (up ? -2 : 2)}`} className="ll-link" fill="none" markerEnd="url(#ah)" />;
  };

  const ptrsAt = (id: number) => s.ptrs.filter((p) => p.id === id).map((p) => p.name);

  return (
    <svg className="ll" viewBox={`0 0 ${width} 220`} style={{ width, minWidth: "100%" }} role="img" aria-label="Linked list diagram">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#8b8aa8" />
        </marker>
      </defs>
      {s.info && <text x={12} y={20} className="ll-info">{s.info}</text>}
      {s.nodes.map((n) => arrow(n.id, n.next, n.id))}
      {s.nodes.map((n, i) => {
        const names = ptrsAt(n.id);
        return (
          <g key={n.id} className={`lln ${s.marks[n.id] ?? ""}`} style={{ transform: `translate(${cx(i)}px, ${Y}px)` }}>
            <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={8} />
            <text textAnchor="middle" dy="5">{n.val}</text>
            {s.head === n.id && <text className="tag-t" textAnchor="middle" y={-H / 2 - 10}>{headLabel}</text>}
            {names.map((nm, k) => (
              <text key={nm} className="ptr-t" textAnchor="middle" y={H / 2 + 20 + k * 14}>{nm}</text>
            ))}
          </g>
        );
      })}
      {s.nodes.length === 0 && <text x={20} y={Y + 5} className="ll-null">{headLabel} → ∅ (empty)</text>}
    </svg>
  );
}
