// Dimensions: the exponent vector over the primitive units that every
// quantity carries, the arithmetic the evaluator applies to it, the
// conformance check between a `have` and a `want`, and formatting as text.
// ARCHITECTURE.md ("Quantities, dimensions and kinds") gives the overview.
//
// A dimension maps each primitive name to its exponent, with zero exponents
// left out, so that a dimensionless quantity is the empty map and equal
// dimensions are equal maps. Exponents are rational, so that roots are exact
// on the dimension side (`sqrt(m)` is `m^(1/2)`).
//
// Primitives come in two roles, declared in the definitions file: dimension
// primitives (`m`, `kg`, `s`) are the physical base quantities, and kind
// primitives (`radian`) are dimensionless markers that keep semantically
// different quantities apart: `rad/s` from `Hz`, torque from energy, an angle
// from a plain number. Both ride along in the same vector, and the arithmetic
// does not tell them apart. Only the conformance check does, and it takes the
// roles from the table's primitives rather than from any built-in list, so
// which kinds exist is entirely up to the definitions file.
//
// The conformance check is two steps. First the vectors are compared over the
// dimension primitives alone; any difference is a `dimensionMismatch` (length
// against time), whatever the kinds say. Only then are the kind primitives
// compared; a difference there is a `kindMismatch` that names the kinds that
// differ. So the physical error is reported first, and a kind mismatch always
// means "the same physical dimension, but not the same kind of quantity",
// which is what lets the UI explain it differently, and what makes it the one
// check a lenient conversion could skip.
//
// A name absent from the primitives map is treated as a dimension primitive,
// the default role, and ordered after the declared ones; a table cannot
// produce one, but nothing here depends on that.

import type { Exponent, Expr, ExprNode, Literal } from "./expr.ts";
import { print, text } from "./print.ts";
import {
  ONE,
  ZERO,
  add,
  equals,
  isInteger,
  isZero,
  multiply,
  negate,
  rational,
  sign,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { fromRational } from "./scaled.ts";

// ---------------------------------------------------------------------------
// Types

/**
 * An exponent vector over primitive names; zero exponents are left out.
 *
 * TODO: Replace the `Map` with a purely applicative container (a persistent
 * map type). `ReadonlyMap` only hides the mutators behind the type, so a
 * dimension is immutable by convention rather than by construction, and the
 * arithmetic below builds each result by mutating a fresh `Map` while the
 * conformance check collects and filters names imperatively. A container
 * with applicative `set`, `remove`, `merge` and `filter` would make the
 * immutability real and let that logic be written as the plain expressions
 * it is.
 */
export type Dimension = ReadonlyMap<string, Rational>;

/** What a primitive is: a physical base quantity, or a dimensionless marker of a kind. */
export type Role = "dimension" | "kind";

/** The primitives a table declares, with their roles, in declaration order. */
export type Primitives = ReadonlyMap<string, Role>;

export type ConformanceError =
  /** The two differ in a dimension primitive: length against time. */
  | {
      readonly kind: "dimensionMismatch";
      readonly have: Dimension;
      readonly want: Dimension;
    }
  /**
   * The two have the same physical dimension but differ in the kind
   * primitives named by `kinds`, in declaration order: `rad/s` against `Hz`.
   */
  | {
      readonly kind: "kindMismatch";
      readonly have: Dimension;
      readonly want: Dimension;
      readonly kinds: readonly string[];
    };

export const DIMENSIONLESS: Dimension = new Map();

// ---------------------------------------------------------------------------
// Construction and inspection

/** The dimension of the primitive `name` itself. */
export function primitive(name: string): Dimension {
  return new Map([[name, ONE]]);
}

export function isDimensionless(d: Dimension): boolean {
  return d.size === 0;
}

export function equalDimensions(a: Dimension, b: Dimension): boolean {
  if (a.size !== b.size) return false;
  for (const [name, exponent] of a) {
    const other = b.get(name);
    if (other === undefined || !equals(exponent, other)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Arithmetic

export function multiplyDimensions(a: Dimension, b: Dimension): Dimension {
  return combine(a, b, add);
}

export function divideDimensions(a: Dimension, b: Dimension): Dimension {
  return combine(a, b, subtract);
}

/** `d` raised to `exponent`: every exponent multiplied by it. */
export function powDimension(d: Dimension, exponent: Rational): Dimension {
  if (isZero(exponent)) return DIMENSIONLESS;
  const result = new Map<string, Rational>();
  for (const [name, e] of d) {
    result.set(name, multiply(e, exponent));
  }
  return result;
}

/** Applies `op` to the exponents of `a` and `b` name by name, dropping zeros. */
function combine(
  a: Dimension,
  b: Dimension,
  op: (x: Rational, y: Rational) => Rational,
): Dimension {
  const result = new Map(a);
  for (const [name, exponent] of b) {
    const combined = op(result.get(name) ?? ZERO, exponent);
    if (isZero(combined)) {
      result.delete(name);
    } else {
      result.set(name, combined);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Conformance

/**
 * Whether a quantity of dimension `have` can be expressed in one of
 * dimension `want`: succeeds when the two are equal, and otherwise fails
 * with the first of the two mismatches described above, carrying both
 * dimensions so that the UI can show them.
 */
export function checkConformance(
  have: Dimension,
  want: Dimension,
  primitives: Primitives,
): Result<undefined, ConformanceError> {
  const differing = byDeclaration(
    new Set([...have.keys(), ...want.keys()]),
    (name) => name,
    primitives,
  ).filter((name) => !equals(have.get(name) ?? ZERO, want.get(name) ?? ZERO));
  const role = (name: string): Role => primitives.get(name) ?? "dimension";
  if (differing.some((name) => role(name) === "dimension")) {
    return err({ kind: "dimensionMismatch", have, want });
  }
  if (differing.length > 0) {
    return err({ kind: "kindMismatch", have, want, kinds: differing });
  }
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Formatting

/**
 * Renders `d` in the expression language, so that what the UI shows is what
 * the user could type: the primitives with positive exponents juxtaposed,
 * then `/` and those with negative exponents (`kg m^2 / s^3 A`, which the
 * grammar reads as `(kg m^2) / (s^3 A)`), `1` standing in for an empty
 * numerator (`1 / s`) or for a dimensionless `d`, and a non-integer exponent
 * parenthesized (`m^(1/2)`). Primitives appear in declaration order.
 */
export function formatDimension(d: Dimension, primitives: Primitives): string {
  const expr = dimensionExpr(d, primitives);
  return expr === undefined ? "1" : text(print(expr));
}

/**
 * `d` as an expression in the primitives, as the grammar reads one: the
 * primitives with positive exponents juxtaposed, in declaration order,
 * each raised to its exponent when that is not one, over those with
 * negative exponents, raised to the exponents' magnitudes; or `undefined`
 * for a dimensionless `d`. `formatDimension` is its text.
 */
export function dimensionExpr(
  d: Dimension,
  primitives: Primitives,
): Expr | undefined {
  const numerator: Expr[] = [];
  const denominator: Expr[] = [];
  for (const [name, exponent] of byDeclaration(
    d,
    ([name]) => name,
    primitives,
  )) {
    if (sign(exponent) > 0) {
      numerator.push(factor(name, exponent));
    } else {
      denominator.push(factor(name, negate(exponent)));
    }
  }
  if (numerator.length === 0 && denominator.length === 0) return undefined;
  const top = numerator.length === 0 ? literalExpr(ONE) : juxtaposed(numerator);
  return denominator.length === 0
    ? top
    : expr({
        kind: "binary",
        op: "div",
        left: top,
        right: juxtaposed(denominator),
      });
}

/** The product of `factors` by juxtaposition, left-associated as the grammar reads it. */
function juxtaposed(factors: readonly Expr[]): Expr {
  return factors.reduce((left, right) =>
    expr({ kind: "binary", op: "juxtapose", left, right }),
  );
}

/** `name` raised to the positive `exponent`, as the grammar reads it: the name alone for one. */
function factor(name: string, exponent: Rational): Expr {
  const base = expr({ kind: "unit", name });
  if (equals(exponent, ONE)) return base;
  const power: Exponent = isInteger(exponent)
    ? { num: literal(exponent.num) }
    : { num: literal(exponent.num), den: literal(exponent.den) };
  return expr({ kind: "pow", base, exponent: power });
}

/** The integer `n` as a literal of the grammar. */
function literal(n: bigint): Literal {
  return { value: fromRational(rational(n)), text: n.toString() };
}

function literalExpr(r: Rational): Expr {
  return expr({ kind: "number", value: fromRational(r), text: toFraction(r) });
}

/** An expression built here, with no span: it was composed, not read. */
function expr(node: ExprNode): Expr {
  return { span: { start: 0, end: 0 }, node };
}

/**
 * `items`, each named by `name`, sorted into the declaration order of
 * `primitives`, with any name it does not declare after the declared ones,
 * in the order given.
 */
function byDeclaration<T>(
  items: Iterable<T>,
  name: (item: T) => string,
  primitives: Primitives,
): T[] {
  const rank = new Map([...primitives.keys()].map((name, i) => [name, i]));
  const undeclared = primitives.size;
  return [...items].sort(
    (a, b) =>
      (rank.get(name(a)) ?? undeclared) - (rank.get(name(b)) ?? undeclared),
  );
}
