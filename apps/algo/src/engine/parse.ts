/**
 * Turns the text a user types ("push 4, pop, insertAt 2 9") into operations, with clear error
 * messages. Also holds the shared Preset type and small helpers used by the topics.
 */

/** One parsed operation: its name plus integer or text arguments. */
export interface ParsedOp {
  op: string;
  /** first integer argument, if the op takes one */
  value?: number;
  /** all integer arguments in order */
  args?: number[];
  /** non-numeric arguments (node labels, words), used by graph and string topics */
  names?: string[];
}

/** Either the list of parsed operations or an error message to show the user. */
export type ParseResult = { ops: ParsedOp[] } | { error: string };

export const MAX_OPS = 200;
export const MAX_ABS_VALUE = 9999;

/** Split user text into operation tokens ("push 4", "pop"). Commas, semicolons and newlines all separate. */
export function splitOps(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse tokens against a spec: operation name -> number of integer arguments.
 * `true`/`false` are accepted as 1/0. Example: { push: 1, pop: 0, insertAt: 2 }
 */
export function parseOps(
  input: string,
  spec: Record<string, number | boolean>,
): ParseResult {
  const tokens = splitOps(input);
  if (tokens.length === 0) return { error: "Enter at least one operation." };
  if (tokens.length > MAX_OPS)
    return { error: `Too many operations (max ${MAX_OPS}).` };
  const names = Object.keys(spec);
  const ops: ParsedOp[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const [name, ...rest] = tokens[i].split(/\s+/);
    const key = names.find((n) => n.toLowerCase() === name.toLowerCase());
    const label = `Operation ${i + 1} ("${tokens[i]}")`;
    if (!key)
      return { error: `${label}: unknown operation. Use ${names.join(", ")}.` };
    const want = Number(spec[key]);
    if (rest.length !== want) {
      return {
        error:
          want === 0
            ? `${label}: takes no argument.`
            : `${label}: needs ${want} integer${want > 1 ? "s" : ""}, like "${key} ${Array(want).fill(5).join(" ")}".`,
      };
    }
    const args: number[] = [];
    for (const a of rest) {
      if (!/^-?\d+$/.test(a))
        return { error: `${label}: "${a}" is not an integer.` };
      const n = Number(a);
      if (Math.abs(n) > MAX_ABS_VALUE)
        return {
          error: `${label}: keep numbers between -${MAX_ABS_VALUE} and ${MAX_ABS_VALUE}.`,
        };
      args.push(n);
    }
    ops.push(want ? { op: key, value: args[0], args } : { op: key });
  }
  return { ops };
}

/** Turns parsed operations back into the text form (the inverse of parseOps). */
export function formatOps(ops: ParsedOp[]): string {
  return ops
    .map((o) => (o.args?.length ? `${o.op} ${o.args.join(" ")}` : o.op))
    .join(", ");
}

/** A built-in test case: a name, a one-line description and the exact input text. */
export interface Preset {
  name: string;
  /** what this test case demonstrates */
  desc: string;
  input: string;
}

/** Builds `n` strings from an index function; used to generate long preset inputs. */
export const seq = (n: number, f: (i: number) => string) =>
  Array.from({ length: n }, (_, i) => f(i));
