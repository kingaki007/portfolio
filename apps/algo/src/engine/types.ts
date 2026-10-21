/**
 * Core types shared by every topic: one animation frame (Step) and a topic's description
 * (Topic).
 */

/** One frame of an algorithm run. `state` is an immutable snapshot the visualizer renders. */
export interface Step<S> {
  state: S;
  /** 1-based lines of the displayed code to highlight. */
  lines: number[];
  /** Plain-English narration of what is happening. */
  note: string;
  /** index of the input operation being executed, -1 before the first one */
  op: number;
}

/**
 * Describes one topic: id, title, group, short description, the displayed code, the input syntax
 * hint and the complexity table.
 */
export interface Topic {
  id: string;
  title: string;
  group: string;
  blurb: string;
  code: string;
  complexity: { op: string; time: string }[];
  /** operations the user can type, shown as a hint */
  syntax: string;
}
