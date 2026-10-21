import { SPEEDS, type usePlayer } from "../engine/usePlayer";

type P = ReturnType<typeof usePlayer>;

export function Player({ p }: { p: P }) {
  return (
    <div className="player">
      <button onClick={p.reset} aria-label="Reset">⏮</button>
      <button onClick={p.prev} aria-label="Previous step">◀</button>
      <button onClick={p.toggle} className="primary" aria-label={p.playing ? "Pause" : "Play"}>
        {p.playing ? "⏸" : "▶"}
      </button>
      <button onClick={p.next} aria-label="Next step">▶|</button>
      <input
        type="range"
        min={0}
        max={p.last}
        value={p.index}
        onChange={(e) => p.setIndex(Number(e.target.value))}
        aria-label="Step scrubber"
      />
      <span className="mono">{p.index}/{p.last}</span>
      <div className="speed" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button key={s} className={s === p.speed ? "on" : ""} aria-pressed={s === p.speed} onClick={() => p.setSpeed(s)}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
