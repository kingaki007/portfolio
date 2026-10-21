import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { byId, registry } from "./registry";
import { usePlayer } from "./engine/usePlayer";
import { Player } from "./components/Player";
import { CodePanel } from "./components/CodePanel";

export function Index() {
  const groups = [...new Set(registry.map((e) => e.topic.group))];
  return (
    <main className="wrap">
      <a className="back" href={`${import.meta.env.BASE_URL}../`}>← Portfolio</a>
      <h1 className="gradient-text">Algo Lab</h1>
      <p className="lede">Step through data structures and algorithms with the code lighting up beside them.</p>
      {groups.map((g) => (
        <section key={g}>
          <h2>{g}</h2>
          <div className="grid">
            {registry.filter((e) => e.topic.group === g).map((e) => (
              <Link key={e.topic.id} to={`/${e.topic.id}`} className="card">
                <h3>{e.topic.title}</h3>
                <p>{e.topic.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export function Visualizer() {
  const { id = "" } = useParams();
  const entry = byId(id);
  if (!entry) return <main className="wrap"><Link to="/">← All topics</Link><p>Unknown topic.</p></main>;
  return <Loaded key={entry.topic.id} entry={entry} />;
}

function Loaded({ entry }: { entry: NonNullable<ReturnType<typeof byId>> }) {
  const steps = useMemo(() => entry.steps(), [entry]);
  const p = usePlayer(steps.length);
  const step = steps[p.index];
  return (
    <main className="wrap">
      <Link className="back" to="/">← All topics</Link>
      <h1>{entry.topic.title}</h1>
      <p className="lede">{entry.topic.blurb}</p>
      <div className="lab">
        <section className="stage" aria-live="polite">{entry.render(step.state)}</section>
        <CodePanel code={entry.topic.code} lines={step.lines} />
      </div>
      <Player p={p} />
      <p className="note">{step.note}</p>
      <table className="complexity">
        <tbody>
          {entry.topic.complexity.map((c) => (
            <tr key={c.op}><td className="mono">{c.op}</td><td>{c.time}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
