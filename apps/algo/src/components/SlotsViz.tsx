/**
 * Draws the fixed-capacity array used by the array stack and queue: numbered slots, the pointers
 * (top, front, back) and the old array while it grows.
 */

import type { SlotsState } from "../topics/linear";

/**
 * Draws one array of slots with index labels, pointer names under the slots they point at, and
 * optional faded styling.
 */
function Row({
  cells,
  marks,
  ptrs,
  title,
  faded,
}: {
  cells: (number | null)[];
  marks: Record<number, string>;
  ptrs: { name: string; idx: number }[];
  title: string;
  faded?: boolean;
}) {
  return (
    <div className={faded ? "sl faded" : "sl"}>
      <div className="sl-title">{title}</div>
      <div className="sl-row">
        {cells.map((v, i) => (
          <div className="sl-slot" key={i}>
            <div
              className={`sl-cell ${marks[i] ?? ""} ${v === null ? "blank" : ""}`}
            >
              {v === null ? "" : v}
            </div>
            <span className="sl-idx">{i}</span>
            <span className="sl-ptrs">
              {ptrs
                .filter((p) => p.idx === i)
                .map((p) => (
                  <b key={p.name}>{p.name}</b>
                ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shows the status line, the current array and, while growing, the array being replaced. */
export function SlotsViz({ s }: { s: SlotsState }) {
  return (
    <div className="stagecol sv">
      <div className="mono sv-info">{s.info}</div>
      <Row
        cells={s.cells}
        marks={s.marks}
        ptrs={s.ptrs}
        title={
          s.old ? `new array (capacity ${s.cap})` : `array (capacity ${s.cap})`
        }
      />
      {s.old && (
        <Row
          cells={s.old.cells}
          marks={s.oldMarks}
          ptrs={[]}
          title={`old array (capacity ${s.old.cap})`}
          faded
        />
      )}
    </div>
  );
}
