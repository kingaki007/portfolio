import { useState } from "react";
import { copyText } from "../engine/copy";

export function CodePanel({ code, lines }: { code: string; lines: number[] }) {
  const active = new Set(lines);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    // always copies the complete implementation, not just the highlighted lines
    setState((await copyText(code)) ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1600);
  };

  return (
    <div className="codebox">
      <div className="codebar">
        <span className="muted mono">TypeScript · {code.split("\n").length} lines</span>
        <button type="button" onClick={copy} className="copybtn" aria-live="polite">
          {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : "Copy code"}
        </button>
      </div>
      <pre className="code" aria-label="Algorithm code">
        {code.split("\n").map((text, i) => (
          <div key={i} className={active.has(i + 1) ? "line active" : "line"}>
            <span className="ln">{i + 1}</span>
            <span>{text || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
