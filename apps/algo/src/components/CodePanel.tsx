export function CodePanel({ code, lines }: { code: string; lines: number[] }) {
  const active = new Set(lines);
  return (
    <pre className="code" aria-label="Algorithm code">
      {code.split("\n").map((text, i) => (
        <div key={i} className={active.has(i + 1) ? "line active" : "line"}>
          <span className="ln">{i + 1}</span>
          <span>{text || " "}</span>
        </div>
      ))}
    </pre>
  );
}
