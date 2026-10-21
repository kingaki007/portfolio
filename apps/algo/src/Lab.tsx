/**
 * The pages of the Algo Lab: the topic index with its filter, and the visualiser page that ties
 * together the input panel, animation, code panel, player and notes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useStoredBool } from "./engine/useStored";
import { copyText } from "./engine/copy";
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

/** The topic index: topics grouped by category, with a filter box. */
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

/** Route component for /<topic>: looks the topic up and shows it, or an unknown-topic message. */
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

/** With the code panel hidden, still say which line of the code is running. */
function ActiveLine({ code, lines }: { code: string; lines: number[] }) {
  if (!lines.length) return null;
  const all = code.split("\n");
  const first = lines[0];
  const text = (all[first - 1] ?? "").trim();
  return (
    <p className="activeline mono" aria-label="Current line of code">
      <span className="al-num">line {first}</span>
      <code>{text}</code>
      {lines.length > 1 && <span className="more">+{lines.length - 1} more</span>}
    </p>
  );
}

/**
 * The visualiser for one topic: builds the animation steps from the applied input and renders all
 * the pieces.
 */
function Loaded({ entry }: { entry: Entry }) {
  const [applied, setApplied] = useState(entry.presets[0].input);

  const steps = useMemo(() => {
    const r = entry.parse(applied);
    return "ops" in r ? entry.run(r.ops) : [];
  }, [entry, applied]);

  const p = usePlayer(steps.length);

  /**
   * Validates and applies new input; returns an error message for the input panel or null on
   * success, and restarts playback.
   */
  const apply = (input: string): string | null => {
    const r = entry.parse(input);
    if ("error" in r) return r.error;
    setApplied(input);
    p.reset(); // a new input restarts playback from step 0
    return null;
  };

  const step = steps[Math.min(p.index, steps.length - 1)];

  // code panel: hidden state is remembered across topics and visits
  const [showCode, setShowCode] = useStoredBool("algo.showCode", true);
  const [copied, setCopied] = useState(false);
  /** Copies the whole implementation and shows a short Copied confirmation. */
  const copyAll = async () => {
    setCopied(await copyText(entry.topic.code));
    setTimeout(() => setCopied(false), 1600);
  };

  // full screen for the animation, player and note (not the page header or input box)
  // If the browser has no Fullscreen API for this (iPhone) or refuses it, the animation
  // expands to fill the window instead ("expanded"); Esc closes either mode.
  const viewerRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    /**
     * Keeps the full-screen flag in sync when the browser enters or leaves full screen; real full
     * screen replaces the fallback.
     */
    const onChange = () => {
      const on = document.fullscreenElement === viewerRef.current;
      setIsFullscreen(on);
      if (on) setExpanded(false); // real full screen won, drop the fallback
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    /** Closes the expanded fallback view when Escape is pressed. */
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);
  /**
   * Toggles full screen; if the browser refuses or does not respond, expands the view to fill the
   * window instead.
   */
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      if (!viewerRef.current?.requestFullscreen) throw new Error("unsupported");
      // some embedded browsers neither grant nor refuse the request, so do not wait forever
      await Promise.race([
        viewerRef.current.requestFullscreen(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 700)),
      ]);
      if (!document.fullscreenElement) throw new Error("not entered");
    } catch {
      setExpanded(true);
    }
  };
  const full = isFullscreen || expanded;

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
      <section
        className={expanded ? "viewer expanded" : "viewer"}
        ref={viewerRef}
        aria-label="Animation"
      >
        <div className="viewbar">
          <button
            type="button"
            aria-pressed={showCode}
            onClick={() => setShowCode(!showCode)}
            title="Show or hide the code panel"
          >
            {showCode ? "Hide code" : "Show code"}
          </button>
          {!showCode && (
            <button type="button" onClick={copyAll}>
              {copied ? "Copied ✓" : "Copy code"}
            </button>
          )}
          <button type="button" onClick={toggleFullscreen}>
            {full ? "Exit full screen (Esc)" : "Full screen"}
          </button>
        </div>
        <div className={showCode ? "lab" : "lab nocode"}>
          <section className="stage" aria-live="polite">
            {entry.render(step.state)}
          </section>
          {showCode && (
            <CodePanel code={entry.topic.code} lines={step.lines} />
          )}
        </div>
        {!showCode && <ActiveLine code={entry.topic.code} lines={step.lines} />}
        <Player p={p} />
        <p className="note">{step.note}</p>
      </section>
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
