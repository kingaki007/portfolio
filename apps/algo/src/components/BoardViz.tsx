/**
 * Board-style visualisers: the N-Queens chessboard and the Sudoku grid. Both only draw the state
 * they are given; the algorithms live in topics/backtracking.ts.
 */

import type { QueensState } from "../topics/backtracking";

/**
 * Draws the N-Queens board with the queens placed so far, the square being tried and the queen
 * that attacks it.
 */
export function QueensViz({ s }: { s: QueensState }) {
  /** True when the queen of row `r` is in column `c`. */
  const queenAt = (r: number, c: number) => s.cols[r] === c;
  return (
    <div className="stagecol">
      <div className="mono sort-stats">
        <span>tries {s.tried}</span>
        <span>backtracks {s.backtracks}</span>
        <span>
          queens {s.cols.length}/{s.n}
        </span>
      </div>
      <div
        className="qboard"
        style={{ gridTemplateColumns: `repeat(${s.n}, 1fr)` }}
        role="img"
        aria-label={`Chess board with ${s.cols.length} queens`}
      >
        {Array.from({ length: s.n * s.n }, (_, k) => {
          const r = Math.floor(k / s.n);
          const c = k % s.n;
          const trial =
            s.trial && s.trial.row === r && s.trial.col === c
              ? s.trial.status
              : "";
          const hit = s.hit && s.hit.row === r && s.hit.col === c;
          return (
            <div
              key={k}
              className={`qcell ${(r + c) % 2 ? "dark" : ""} ${trial} ${hit ? "hit" : ""} ${s.solved && queenAt(r, c) ? "win" : ""}`}
            >
              {queenAt(r, c)
                ? "♛"
                : trial === "try" || trial === "conflict"
                  ? "·"
                  : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { SudokuState } from "../topics/backtracking";

/**
 * Draws the 9x9 Sudoku grid, marking given digits, placed digits, the current cell and backtracks.
 */
export function SudokuViz({ s }: { s: SudokuState }) {
  return (
    <div className="stagecol">
      <div className="mono sort-stats">
        <span>placements {s.placements}</span>
        <span>backtracks {s.backtracks}</span>
        {s.kind === "solved" && <span>solved</span>}
        {s.kind === "limit" && <span>step limit</span>}
      </div>
      <div className="sudoku" role="img" aria-label="Sudoku grid">
        {s.cells.map((d, i) => (
          <div
            key={i}
            className={`sc ${s.given[i] ? "given" : ""} ${s.cur === i ? s.kind : ""} ${Math.floor(i / 9) % 3 === 2 ? "bb" : ""} ${(i % 9) % 3 === 2 ? "br" : ""}`}
          >
            {d === 0 ? "" : d}
          </div>
        ))}
      </div>
    </div>
  );
}
