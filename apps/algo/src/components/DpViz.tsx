import { key, type DpState } from "../topics/dp";

export function DpViz({ s }: { s: DpState }) {
  return (
    <div className="dp">
      {s.layers.map((layer, li) => (
        <div className="dp-layer" key={li}>
          <div className="dp-title">{layer.title}</div>
          <div className="dp-scroll">
            <table className="dp-table">
              <thead>
                <tr>
                  <th />
                  {layer.cols.map((c, i) => (
                    <th key={i}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {layer.cells.map((row, r) => (
                  <tr key={r}>
                    <th>{layer.rows[r]}</th>
                    {row.map((v, c) => (
                      <td
                        key={c}
                        className={`${s.marks[key(li, r, c)] ?? ""} ${v === null ? "empty" : ""}`}
                      >
                        {v === null ? "" : v === Infinity ? "∞" : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {s.answer !== null && (
        <div className="dp-answer mono">answer: {s.answer || "(empty)"}</div>
      )}
    </div>
  );
}
