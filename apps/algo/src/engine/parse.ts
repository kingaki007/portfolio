export interface ParsedOp {
  op: string;
  value?: number;
}

export type ParseResult = { ops: ParsedOp[] } | { error: string };

export const MAX_OPS = 200;

/** Split user text into operation tokens ("push 4", "pop"). Commas, semicolons and newlines all separate. */
export function splitOps(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse tokens against a spec. `true` means the op takes an integer argument.
 * Example spec: { push: true, pop: false, peek: false }
 */
export function parseOps(input: string, spec: Record<string, boolean>): ParseResult {
  const tokens = splitOps(input);
  if (tokens.length === 0) return { error: "Enter at least one operation." };
  if (tokens.length > MAX_OPS) return { error: `Too many operations (max ${MAX_OPS}).` };
  const ops: ParsedOp[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const [name, arg, ...rest] = tokens[i].split(/\s+/);
    const key = name.toLowerCase();
    const label = `Operation ${i + 1} ("${tokens[i]}")`;
    if (!(key in spec)) return { error: `${label}: unknown operation. Use ${Object.keys(spec).join(", ")}.` };
    if (rest.length) return { error: `${label}: too many arguments.` };
    if (spec[key]) {
      if (arg === undefined || !/^-?\d+$/.test(arg)) return { error: `${label}: needs an integer, like "${key} 5".` };
      ops.push({ op: key, value: Number(arg) });
    } else {
      if (arg !== undefined) return { error: `${label}: takes no argument.` };
      ops.push({ op: key });
    }
  }
  return { ops };
}

export function formatOps(ops: ParsedOp[]): string {
  return ops.map((o) => (o.value === undefined ? o.op : `${o.op} ${o.value}`)).join(", ");
}

export interface Preset {
  name: string;
  /** what this test case demonstrates */
  desc: string;
  input: string;
}
