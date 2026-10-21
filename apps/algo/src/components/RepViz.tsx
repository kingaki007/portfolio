import type { RepState } from "../topics/graphRep";
import { GraphViz } from "./GraphViz";

export function RepViz({ s }: { s: RepState }) {
  const hl = s.hl;
  const hit = (set: string[] | undefined, a: string, b: string) =>
    !!set?.includes(`${a}>${b}`);
  return (
    <div className="rep">
      <GraphViz s={s.graph} weighted />
      {s.cost && <div className="mono rep-cost">{s.cost}</div>}
      <div className="rep-grid">
        <section aria-label="Adjacency list">
          <h4>Adjacency list</h4>
          {s.list.length === 0 && <span className="muted mono">empty</span>}
          {s.list.map((r) => (
            <div
              key={r.node}
              className={r.node === hl.listNode ? "rep-row on" : "rep-row"}
            >
              <b>{r.node}</b>
              <span>→</span>
              {r.items.length === 0 && <span className="muted">∅</span>}
              {r.items.map((it, i) => (
                <span
                  key={i}
                  className={
                    hit(hl.listItems, r.node, it.to)
                      ? "rep-chip hot"
                      : "rep-chip"
                  }
                >
                  {it.to}
                  {it.w !== 1 ? `:${it.w}` : ""}
                </span>
              ))}
            </div>
          ))}
        </section>

        <section aria-label="Adjacency matrix">
          <h4>Adjacency matrix</h4>
          {s.mat.nodes.length === 0 ? (
            <span className="muted mono">empty</span>
          ) : (
            <table className="rep-mat">
              <thead>
                <tr>
                  <th />
                  {s.mat.nodes.map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.mat.nodes.map((n, i) => (
                  <tr key={n} className={hl.row === i ? "row-on" : ""}>
                    <th>{n}</th>
                    {s.mat.cells[i].map((c, j) => (
                      <td
                        key={j}
                        className={`${hl.cells?.includes(`${i},${j}`) ? "hot" : ""} ${c === null ? "zero" : ""}`}
                      >
                        {c === null ? "0" : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-label="Hash map">
          <h4>Hash map of hash maps</h4>
          {s.hash.length === 0 && <span className="muted mono">empty</span>}
          {s.hash.map((r) => (
            <div
              key={r.key}
              className={r.key === hl.hashKey ? "rep-row on" : "rep-row"}
            >
              <b>"{r.key}"</b>
              <span>→ {"{"}</span>
              {r.entries.map((e, i) => (
                <span
                  key={i}
                  className={
                    hit(hl.hashItems, r.key, e.to) ? "rep-chip hot" : "rep-chip"
                  }
                >
                  "{e.to}": {e.w}
                </span>
              ))}
              <span>{"}"}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
