import type { Marks } from "./TreeViz";

export function ArrayRow({
  items,
  marks = {},
  label = "array",
}: {
  items: { id: number | string; v: number | string }[];
  marks?: Marks;
  label?: string;
}) {
  return (
    <div className="arr" role="group" aria-label={label}>
      {items.map((it, i) => (
        <div className="slot" key={it.id}>
          <div className={`box ${marks[it.id] ?? ""}`}>{it.v}</div>
          <span className="idx">{i}</span>
        </div>
      ))}
    </div>
  );
}
