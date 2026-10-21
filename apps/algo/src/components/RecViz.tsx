/**
 * Visualiser for the recursion-tree topics (permutations, subsets, subset sum): the growing
 * recursion tree, the items and current choice, and the results found so far.
 */

import type { RecState } from "../topics/backtracking";
import { NaryViz } from "./NaryViz";

/**
 * Renders the recursion tree with the current branch highlighted, plus the items, the current path
 * and the results list.
 */
export function RecViz({ s }: { s: RecState }) {
  return (
    <div className="stagecol rec">
      <div className="rec-info mono">
        {s.info && <span className="calc">{s.info}</span>}
        <span>
          items: [
          {s.items.map((v, i) =>
            s.used ? (
              <b key={i} className={s.used[i] ? "used" : ""}>
                {v}
                {i < s.items.length - 1 ? ", " : ""}
              </b>
            ) : (
              <span key={i}>
                {v}
                {i < s.items.length - 1 ? ", " : ""}
              </span>
            ),
          )}
          ]
        </span>
        <span>current: [{s.path.join(", ")}]</span>
      </div>
      <NaryViz roots={s.roots} marks={s.marks} />
      <div className="rec-results">
        <div className="gpanel-t">Results ({s.results.length})</div>
        <div className="gcells">
          {s.results.length === 0 && (
            <span className="muted mono">none yet</span>
          )}
          {s.results.map((r, i) => (
            <span className="gc ok" key={i}>
              {"{" + r.join(",") + "}"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
