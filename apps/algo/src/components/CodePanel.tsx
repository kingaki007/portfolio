/**
 * The code panel next to every animation: the full implementation with the running lines
 * highlighted, a line count and a Copy code button.
 */

import { useState } from "react";
import { copyText } from "../engine/copy";

/**
 * Shows `code` with line numbers and highlights the 1-based `lines` that the current step is
 * executing.
 */
export function CodePanel({ code, lines }: { code: string; lines: number[] }) {
  const active = new Set(lines);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  /**
   * Copies the complete implementation (never just the highlighted lines) and shows Copied or Copy
   * failed for a moment.
   */
  const copy = async () => {
    // always copies the complete implementation, not just the highlighted lines
    setState((await copyText(code)) ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1600);
  };

  return (
    <div className="codebox">
      <div className="codebar">
        <span className="muted mono">
          TypeScript · {code.split("\n").length} lines
        </span>
        <button
          type="button"
          onClick={copy}
          className="copybtn"
          aria-live="polite"
        >
          {state === "copied"
            ? "Copied ✓"
            : state === "failed"
              ? "Copy failed"
              : "Copy code"}
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
