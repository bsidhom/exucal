// The expression language: what the user types as `have` and `want`, and what
// the body of a unit or prefix definition is. `parseExpr` turns text into an
// `Expr` tree and knows nothing about which units exist; ARCHITECTURE.md
// ("Expressions") gives the overview.
//
// The grammar, from the loosest binding to the tightest:
//
//   expr      := product (("*" | "/") product)*       left-associative
//   product   := power unitPower*                     juxtaposition
//   power     := atom ("^" exponent)?
//   unitPower := unitAtom ("^" exponent)?
//   atom      := number | unitAtom
//   unitAtom  := name | "(" expr ")"
//   exponent  := signed number | "(" signed number ("/" number)? ")"
//
// Juxtaposition means "this many of these units" (`2 m`) or a product of
// units (`kg m`), so a number may only be the first factor of a product:
// `m 2`, `1 2 3` and `2 3 m` are errors, and multiplying numbers is written
// with `*`. Juxtaposition binds tighter than `*` and `/`, so `kg m / s^2` is
// `(kg m) / (s^2)` and `1/2 m` is `1 / (2 m)`, while `*` and `/` are one
// left-associative level, so `m/s*s` is `(m/s)*s`. `^` binds tightest and
// takes a literal exponent, not an expression: an optionally signed decimal
// (`m^2`, `s^-1`, `m^0.5`) or a parenthesized rational (`m^(1/2)`,
// `m^(-3/2)`), so the exponent is known at parse time and travels in the
// tree as a `Rational`.
//
// Numbers are unsigned decimal literals as `parseDecimal` reads them (`2`,
// `2.54`, `.5`, `1e-3`), parsed exactly; there is no `+` or `-` operator yet.
// A name is a letter or underscore followed by letters, digits and
// underscores, in any script: `m`, `mu0`, `µ`, `degF`. Names are maximal, so
// `m2` is the name `m2`, never `m` squared; whether such a name means
// anything is the unit table's business, not the parser's. Whitespace is
// spaces and tabs only, because a definition is one line and the definitions
// parser embeds this grammar as the body of a line.
//
// Every node carries the span of input it came from, so an error found later
// in the pipeline (an unknown unit, a dimension mismatch) can point back at
// the text. A composite node's span runs from its first part to its last, and
// a parenthesized expression's span includes the parentheses.

import {
  alt,
  chainl1,
  check,
  lazy,
  many,
  map,
  optional,
  parse,
  regex,
  seq,
  spanned,
  string,
  type ParseError,
  type Parser,
  type Spanned,
} from "./parser.ts";
import { divide, parseDecimal, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { type Span } from "./span.ts";

// ---------------------------------------------------------------------------
// Types

export type Expr = { readonly span: Span; readonly node: ExprNode };

export type ExprNode =
  | { readonly kind: "number"; readonly value: Rational }
  | { readonly kind: "unit"; readonly name: string }
  | {
      readonly kind: "binary";
      readonly op: "mul" | "div";
      readonly left: Expr;
      readonly right: Expr;
    }
  | { readonly kind: "pow"; readonly base: Expr; readonly exponent: Rational };

// ---------------------------------------------------------------------------
// Parsing

/** Parses the whole of `text` as an expression. Surrounding spaces are allowed. */
export function parseExpr(text: string): Result<Expr, ParseError> {
  return parse(
    map(seq(ws, expr), ([, e]) => e),
    text,
  );
}

// ---------------------------------------------------------------------------
// Lexical layer
//
// A token is a primitive followed by the whitespace after it, so that every
// parser below starts on a non-blank character and ends past any blanks that
// follow it; leading whitespace is the business of whoever runs the grammar.
// Spans are taken inside `token`, so they never include the whitespace.

/** Whitespace between tokens: spaces and tabs. Never a newline (see above). */
export const ws: Parser<string> = regex(/[ \t]*/, "whitespace");

/** `parser` followed by any whitespace. */
export function token<A>(parser: Parser<A>): Parser<A> {
  return map(seq(parser, ws), ([value]) => value);
}

function symbol(literal: string): Parser<string> {
  return token(string(literal));
}

/** An unsigned decimal literal, in the shape `parseDecimal` accepts. */
const UNSIGNED = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const SIGNED = new RegExp(`[+-]?${UNSIGNED.source}`);
/** The shape of a unit name; the definitions parser builds on it. */
export const NAME = /[\p{L}_][\p{L}0-9_]*/u;

/** A decimal literal, parsed exactly; one too large to represent is rejected. */
function decimal(pattern: RegExp, expected: string): Parser<Rational> {
  return check(regex(pattern, expected), (text) => {
    const result = parseDecimal(text);
    if (result.ok) return result;
    return err(
      result.error.kind === "tooLarge"
        ? "this number is too large to represent"
        : "this is not a number",
    );
  });
}

/** A unit name; whether it names anything is the table's business. */
export const name: Parser<Spanned<string>> = token(
  spanned(regex(NAME, "a unit name")),
);

const number: Parser<Spanned<Rational>> = token(
  spanned(decimal(UNSIGNED, "a number")),
);

// ---------------------------------------------------------------------------
// Grammar

function leaf({ value, span }: Spanned<Rational | string>): Expr {
  return typeof value === "string"
    ? { span, node: { kind: "unit", name: value } }
    : { span, node: { kind: "number", value } };
}

function binary(op: "mul" | "div"): (left: Expr, right: Expr) => Expr {
  return (left, right) => ({
    span: { start: left.span.start, end: right.span.end },
    node: { kind: "binary", op, left, right },
  });
}

/** The expression grammar itself, for embedding in another grammar. */
export const expr: Parser<Expr> = lazy(() => quotient);

const parenthesized: Parser<Expr> = map(
  token(spanned(seq(symbol("("), expr, string(")")))),
  ({ value: [, inner], span }) => ({ span, node: inner.node }),
);

/** An atom that can follow another factor by juxtaposition: not a number. */
const unitAtom: Parser<Expr> = alt(map(name, leaf), parenthesized);

const atom: Parser<Expr> = alt(map(number, leaf), unitAtom);

/**
 * The exponent of `^`: a signed decimal, or a parenthesized rational written
 * as a signed decimal optionally divided by an unsigned one. A zero divisor
 * is rejected, as any other unrepresentable literal is.
 */
const exponent: Parser<Spanned<Rational>> = token(
  spanned(
    alt(
      decimal(SIGNED, "a number"),
      map(
        seq(
          symbol("("),
          check(
            seq(
              token(decimal(SIGNED, "a number")),
              optional(seq(symbol("/"), token(decimal(UNSIGNED, "a number")))),
            ),
            ([numerator, denominator]) =>
              denominator === undefined
                ? ok(numerator)
                : divideExponent(numerator, denominator[1]),
          ),
          string(")"),
        ),
        ([, value]) => value,
      ),
    ),
  ),
);

function divideExponent(
  numerator: Rational,
  denominator: Rational,
): Result<Rational, string> {
  const result = divide(numerator, denominator);
  return result.ok ? result : err("the exponent divides by zero");
}

/** `atom`, optionally raised to an exponent. */
function raised(atom: Parser<Expr>): Parser<Expr> {
  return map(
    seq(atom, optional(seq(symbol("^"), exponent))),
    ([base, power]) =>
      power === undefined
        ? base
        : {
            span: { start: base.span.start, end: power[1].span.end },
            node: { kind: "pow", base, exponent: power[1].value },
          },
  );
}

const power: Parser<Expr> = raised(atom);
const unitPower: Parser<Expr> = raised(unitAtom);

const product: Parser<Expr> = map(
  seq(power, many(unitPower)),
  ([first, rest]) => rest.reduce(binary("mul"), first),
);

const quotient: Parser<Expr> = chainl1(
  product,
  alt(
    map(symbol("*"), () => binary("mul")),
    map(symbol("/"), () => binary("div")),
  ),
);
