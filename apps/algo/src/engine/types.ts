/** One frame of an algorithm run. `state` is an immutable snapshot the visualizer renders. */
export interface Step<S> {
  state: S;
  /** 1-based lines of the displayed code to highlight. */
  lines: number[];
  /** Plain-English narration of what is happening. */
  note: string;
}

export interface Topic<S> {
  id: string;
  title: string;
  group: string;
  blurb: string;
  code: string;
  complexity: { op: string; time: string }[];
}
