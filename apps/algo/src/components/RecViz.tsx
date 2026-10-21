import type { RecState } from "../topics/backtracking";
import { NaryViz } from "./NaryViz";

export function RecViz({ s }: { s: RecState }) {
  return (
    <div className="stagecol rec">
      <div className="rec-info mono">
        {s.info && <span className="calc">{s.info}</span>}
        <span>items: [{s.items.map((v, i) => (s.used ? <b key={i} className={s.used[i] ? "used" : ""}>{v}{i < s.items.length - 1 ? ", " : ""}</b> : <span key={i}>{v}{i < s.items.length - 1 ? ", " : ""}</span>))}]</span>
        <span>current: [{s.path.join(", ")}]</span>
      </div>
      <NaryViz roots={s.roots} marks={s.marks} />
      <div className="rec-results">
        <div className="gpanel-t">Results ({s.results.length})</div>
        <div className="gcells">
          {s.results.length === 0 && <span className="muted mono">none yet</span>}
          {s.results.map((r, i) => (
            <span className="gc ok" key={i}>{"{" + r.join(",") + "}"}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
