// Random expression trees, for the properties of the printer (print.ts):
// every kind of node, every operator, and literals of several spellings,
// drawn by key (random.ts) so that a failure is reproducible. The spans
// are empty: the trees are built, not read.

import type { Exponent, Expr, ExprNode, Literal } from "../core/expr.ts";
import { parseDecimal } from "../core/scaled.ts";
import type { Span } from "../core/span.ts";
import { between, split, type Key } from "./random.ts";

const SPAN: Span = { start: 0, end: 0 };

/** The literals a tree draws from, in several spellings. */
const NUMBERS = ["2", "0.5", "1e3", "10", ".5", "3.25", "1E-2", "7."];

/** The exponents a tree draws from: literals alone, and over a denominator. */
const EXPONENTS: readonly Exponent[] = [
  { num: literal("2") },
  { num: literal("-1") },
  { num: literal("0.5") },
  { num: literal("+3") },
  { num: literal("1"), den: literal("2") },
  { num: literal("-3"), den: literal("2") },
];

const NAMES = ["m", "kg", "s", "ft", "in"];
const FUNCTIONS = ["f", "g", "pi"];
const OPS = ["add", "sub", "mul", "div", "juxtapose"] as const;

/**
 * A random expression at most `depth` deep under `key`: a leaf at depth
 * zero, else any kind of node, its children drawn under keys split from
 * `key`.
 */
export function randomExpr(key: Key, depth: number): Expr {
  return { span: SPAN, node: randomNode(key, depth) };
}

function randomNode(key: Key, depth: number): ExprNode {
  const [choose, a, b, c] = split(key, 4) as [Key, Key, Key, Key];
  // `between` is inclusive: a leaf at depth zero, else any kind.
  switch (between(choose, 0, depth === 0 ? 1 : 5)) {
    case 0: {
      const text = NUMBERS[between(a, 0, NUMBERS.length - 1)]!;
      return { kind: "number", ...literal(text) };
    }
    case 1:
      return { kind: "unit", name: NAMES[between(a, 0, NAMES.length - 1)]! };
    case 2:
      return {
        kind: "binary",
        op: OPS[between(a, 0, OPS.length - 1)]!,
        left: randomExpr(b, depth - 1),
        right: randomExpr(c, depth - 1),
      };
    case 3:
      return { kind: "neg", operand: randomExpr(a, depth - 1) };
    case 4:
      return {
        kind: "pow",
        base: randomExpr(a, depth - 1),
        exponent: EXPONENTS[between(b, 0, EXPONENTS.length - 1)]!,
      };
    default: {
      const count = between(a, 0, 2);
      const keys = split(b, Math.max(count, 1));
      return {
        kind: "call",
        name: FUNCTIONS[between(c, 0, FUNCTIONS.length - 1)]!,
        nameSpan: SPAN,
        arguments: keys.slice(0, count).map((k) => randomExpr(k, depth - 1)),
      };
    }
  }
}

/** The literal `text` denotes; the texts here all parse. */
function literal(text: string): Literal {
  const value = parseDecimal(text);
  if (!value.ok) throw new Error(`${text} is not a literal`);
  return { value: value.value, text };
}
