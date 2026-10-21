interface Props {
  items: number[];
  focus: number | null;
  /** stack grows upward, queue grows to the right */
  direction: "vertical" | "horizontal";
  startLabel?: string;
  endLabel?: string;
}

export function LinearViz({ items, focus, direction, startLabel, endLabel }: Props) {
  return (
    <div className={`linear ${direction}`}>
      {startLabel && <span className="tag start">{startLabel}</span>}
      <div className="cells">
        {items.map((v, i) => (
          <div key={`${i}-${v}`} className={i === focus ? "cell focus" : "cell"}>
            {v}
          </div>
        ))}
        {items.length === 0 && <div className="empty">empty</div>}
      </div>
      {endLabel && <span className="tag end">{endLabel}</span>}
    </div>
  );
}
