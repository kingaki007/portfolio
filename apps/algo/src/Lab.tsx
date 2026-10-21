import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { byId, registry, type Entry } from "./registry";
import { usePlayer } from "./engine/usePlayer";
import { Player } from "./components/Player";
import { CodePanel } from "./components/CodePanel";
import { InputPanel } from "./components/InputPanel";

const GROUP_ORDER = [
  "Stack",
  "Queue",
  "Linked List",
  "Heap",
  "Hashing",
  "Trees",
  "Sorting",
  "Graphs",
  "Backtracking",
  "Dynamic Programming",
];

export function Index() {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = registry.filter(
    (e) =>
      !needle ||
      `${e.topic.title} ${e.topic.blurb} ${e.topic.group}`
        .toLowerCase()
        .includes(needle),
  );
  const groups = [...new Set(registry.map((e) => e.topic.group))].sort(
    (a, b) =>
      ((GROUP_ORDER.indexOf(a) + 100) % 100) -
      ((GROUP_ORDER.indexOf(b) + 100) % 100),
  );
  return (
    <main className="wrap">
      <a className="back" href={`${import.meta.env.BASE_URL}../`}>
        ← Portfolio
      </a>
      <h1 className="gradient-text">Algo Lab</h1>
      <p className="lede">
        {registry.length} data structures and algorithms. Step through each one
        with its code lighting up beside it, run it on a built-in test case or
        your own input, and copy the working code.
      </p>
      <label className="filter">
        <span className="muted">Find a topic</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="heap, dijkstra, sorting, dp…"
        />
      </label>
      {shown.length === 0 && <p className="muted">No topic matches "{q}".</p>}
      {groups.map((g) => {
        const items = shown.filter((e) => e.topic.group === g);
        if (!items.length) return null;
        return (
          <section key={g}>
            <h2>
              {g} <span className="muted count">{items.length}</span>
            </h2>
            <div className="grid">
              {items.map((e) => (
                <Link key={e.topic.id} to={`/${e.topic.id}`} className="card">
                  <h3>{e.topic.title}</h3>
                  <p>{e.topic.blurb}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

export function Visualizer() {
  const { id = "" } = useParams();
  const entry = byId(id);
  if (!entry)
    return (
      <main className="wrap">
        <Link to="/">← All topics</Link>
        <p>Unknown topic.</p>
      </main>
    );
  return <Loaded key={entry.topic.id} entry={entry} />;
}

function Loaded({ entry }: { entry: Entry }) {
  const [applied, setApplied] = useState(entry.presets[0].input);

  const steps = useMemo(() => {
    const r = entry.parse(applied);
    return "ops" in r ? entry.run(r.ops) : [];
  }, [entry, applied]);

  const p = usePlayer(steps.length);

  const apply = (input: string): string | null => {
    const r = entry.parse(input);
    if ("error" in r) return r.error;
    setApplied(input);
    p.reset(); // a new input restarts playback from step 0
    return null;
  };

  const step = steps[Math.min(p.index, steps.length - 1)];

  return (
    <main className="wrap">
      <Link className="back" to="/">
        ← All topics
      </Link>
      <h1>{entry.topic.title}</h1>
      <p className="lede">{entry.topic.blurb}</p>
      <InputPanel
        presets={entry.presets}
        syntax={entry.topic.syntax}
        onApply={apply}
        activeOp={step.op}
        applied={applied}
      />
      <div className="lab">
        <section className="stage" aria-live="polite">
          {entry.render(step.state)}
        </section>
        <CodePanel code={entry.topic.code} lines={step.lines} />
      </div>
      <Player p={p} />
      <p className="note">{step.note}</p>
      <table className="complexity">
        <tbody>
          {entry.topic.complexity.map((c) => (
            <tr key={c.op}>
              <td className="mono">{c.op}</td>
              <td>{c.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
