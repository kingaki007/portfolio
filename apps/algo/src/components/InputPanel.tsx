import { useState } from "react";
import { splitOps, type Preset } from "../engine/parse";

interface Props {
  presets: Preset[];
  syntax: string;
  /** called with the input text to animate; returns an error message or null */
  onApply: (input: string, source: "default" | "custom") => string | null;
  /** operation index currently animated, -1 for none */
  activeOp: number;
  applied: string;
}

export function InputPanel({ presets, syntax, onApply, activeOp, applied }: Props) {
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [presetIdx, setPresetIdx] = useState(0);
  const [draft, setDraft] = useState(presets[0].input);
  const [error, setError] = useState<string | null>(null);

  const choosePreset = (i: number) => {
    setPresetIdx(i);
    setDraft(presets[i].input);
    setError(null);
    onApply(presets[i].input, "default");
  };

  const chooseMode = (m: "default" | "custom") => {
    setMode(m);
    setError(null);
    if (m === "default") onApply(presets[presetIdx].input, "default");
  };

  const tokens = splitOps(applied);

  return (
    <section className="inputs" aria-label="Input data">
      <div className="seg" role="tablist" aria-label="Input source">
        <button role="tab" aria-selected={mode === "default"} className={mode === "default" ? "on" : ""} onClick={() => chooseMode("default")}>
          Default test cases
        </button>
        <button role="tab" aria-selected={mode === "custom"} className={mode === "custom" ? "on" : ""} onClick={() => chooseMode("custom")}>
          My own input
        </button>
      </div>

      {mode === "default" ? (
        <div className="presets">
          {presets.map((p, i) => (
            <button key={p.name} className={i === presetIdx ? "preset on" : "preset"} onClick={() => choosePreset(i)}>
              <strong>{p.name}</strong>
              <span>{p.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <form
          className="custom"
          onSubmit={(e) => {
            e.preventDefault();
            setError(onApply(draft, "custom"));
          }}
        >
          <label htmlFor="ops">Operations <span className="muted">(separate with commas or new lines)</span></label>
          <textarea id="ops" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} spellCheck={false} />
          <div className="muted mono">{syntax}</div>
          <button type="submit" className="run">Run my input</button>
          {error && <p role="alert" className="error">{error}</p>}
        </form>
      )}

      <div className="exact">
        <div className="exact-title">
          Input being animated <span className="muted">({tokens.length} operations)</span>
        </div>
        <ol className="tokens">
          {tokens.map((t, i) => (
            <li key={i} className={i === activeOp ? "tok active" : i < activeOp ? "tok done" : "tok"} ref={i === activeOp ? (el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined}>
              {t}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
