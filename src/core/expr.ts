// The expression language: what the user types as `have` and `want`, and what
// the body of a unit or prefix definition is. `parseExpr` turns text into an
// `Expr` tree and knows nothing about which units exist; ARCHITECTURE.md
// ("Expressions") gives the overview.
//
// The grammar, from the loosest binding to the tightest:
//
//   unitList  := expr (";" expr)*                    a want of several units
//   expr      := sum
//   sum       := quotient (("+" | "-") quotient)*     left-associative
//   quotient  := signed (("*" | "/") signed)*         left-associative
//   signed    := product | "-" product                negation
//   product   := power unitPower*                     juxtaposition
//   power     := atom ("^" exponent)?
//   unitPower := unitAtom ("^" exponent)?
//   atom      := number | unitAtom
//   unitAtom  := call | name | "(" expr ")"
//   call      := name "(" (expr ("," expr)*)? ")"     no space before "("
//   exponent  := signed number | "(" signed number ("/" number)? ")"
//
// Juxtaposition means "this many of these units" (`2 m`) or a product of
// units (`kg m`), so a number may only be the first factor of a product:
// `m 2`, `1 2 3` and `2 3 m` are errors, and multiplying numbers is written
// with `*`. Juxtaposition binds tighter than `*` and `/`, so `kg m / s^2` is
// `(kg m) / (s^2)` and `1/2 m` is `1 / (2 m)`, while `*` and `/` are one
// left-associative level, so `m/s*s` is `(m/s)*s`. `+` and `-` are another
// left-associative level below them, the loosest of all, so `1 ft + 3 in`
// is `(1 ft) + (3 in)`, `2 m * 3 + 1 m` is `(2 m * 3) + (1 m)` and
// `1 m + 1/2 m` is `(1 m) + (1 / (2 m))`. A `-` before a product negates
// it: it binds tighter than `*` and `/` and looser than juxtaposition and
// `^`, so `-2 m` is `-(2 m)`, `2 * -3 m` is `2 * (-(3 m))` and `-2^2` is
// `-(2^2)`, as in arithmetic. It does not stack (`--2` is an error;
// `-(-2)` is fine), and there is no unary `+`. `^` binds tightest and
// takes a literal exponent, not an expression: an optionally signed decimal
// (`m^2`, `s^-1`, `m^0.5`) or a parenthesized rational (`m^(1/2)`,
// `m^(-3/2)`), so the exponent is known at parse time and travels in the
// tree as a `Rational`.
//
// A call, `tempC(100)`, is a name directly followed by `(`, zero or more
// expressions separated by commas, and `)`: `pi()`, `tempC(100)`,
// `atan2(3 m, 4 m)`. It is an atom like a name, so `2 tempC(100)`,
// `tempC(100)^2` and `-tempC(100)` mean what they look like, and each
// argument is any expression. The comma appears nowhere else in the
// grammar. How many arguments a function takes is its own business and the
// evaluator's to check (docs/builtins.md, "Arity"); the parser accepts any
// count. Whether the name is a function is the evaluator's business too;
// the parser decides a call by the text alone, and the one rule it applies
// is lexical: no space between the name and the `(` makes a call, and a
// space makes a product, so `kg (m/s)` is a product and `kg(m/s)` is a
// call of `kg`, which the evaluator will reject. That is the one
// whitespace-sensitive rule in the grammar (docs/functions.md says why).
//
// A unit list, `ft;in`, is what the user may type as `want` to have the
// value shown as a sum of units (ARCHITECTURE.md, "Unit lists"), and what
// the body of a unit list definition is. It is one or more expressions
// separated by `;`, and is not an expression itself: `;` binds looser than
// anything and cannot appear inside parentheses. `parseUnitList` reads one,
// and an expression alone is a list of one item.
//
// Numbers are unsigned decimal literals as `parseDecimal` of scaled.ts
// reads them (`2`, `2.54`, `.5`, `1e-3`), parsed exactly into a `Scaled`,
// the exponent kept as the number it is, so that `1e999999999` parses; a
// mantissa beyond the hard bound `LIMIT_BITS`, or an exponent beyond the
// exponent bound, is rejected where it is written, the message saying
// which, and for the exponent on which side. The `^` exponent is a
// `Rational`, known at parse time, and its literal is converted with
// `toRational` at the hard bound, so `m^1e999999999` is rejected there
// while `m^1e300000` is what it always was. A sign is never part of a
// number outside an exponent: `-2` is the negation of `2`, `2-3` is a
// difference and `2e-3` a literal, since the literal is read as far as it
// goes. Whether the operands of a sum conform is the evaluator's business,
// not the parser's.
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
import { LIMIT_BITS, divide, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { parseDecimal, toRational, type Limit, type Scaled } from "./scaled.ts";
import type { Span } from "./span.ts";

// ---------------------------------------------------------------------------
// Types

export type Expr = { readonly span: Span; readonly node: ExprNode };

/** The binary operators: `+`, `-`, `*` (or juxtaposition) and `/`. */
export type BinaryOp = "add" | "sub" | "mul" | "div";

export type ExprNode =
  | { readonly kind: "number"; readonly value: Scaled }
  | { readonly kind: "unit"; readonly name: string }
  | {
      readonly kind: "binary";
      readonly op: BinaryOp;
      readonly left: Expr;
      readonly right: Expr;
    }
  | { readonly kind: "pow"; readonly base: Expr; readonly exponent: Rational }
  /** `-operand`. */
  | { readonly kind: "neg"; readonly operand: Expr }
  /** `name(arguments...)`: a call of the function `name`, which is at `nameSpan`, with zero or more arguments. */
  | {
      readonly kind: "call";
      readonly name: string;
      readonly nameSpan: Span;
      readonly arguments: readonly Expr[];
    };

/**
 * Why the grammar rejects text it recognized, as data for messages.ts to
 * word: a literal that cannot be represented, past `limit` (its
 * mantissa's digits beyond the hard bound, the range limit's, or its
 * canonical exponent past the exponent bound on either side); a `^`
 * exponent whose power of ten cannot be formed as a fraction within the
 * hard bound; and a `^` exponent written as a quotient by zero.
 */
export type Rejection =
  | { readonly kind: "numberTooLarge"; readonly limit: Limit }
  | { readonly kind: "exponentTooLarge" }
  | { readonly kind: "exponentDividesByZero" };

// ---------------------------------------------------------------------------
// Parsing

/** Parses the whole of `text` as an expression. Surrounding spaces are allowed. */
export function parseExpr(text: string): Result<Expr, ParseError<Rejection>> {
  return parse(
    map(seq(ws, expr), ([, e]) => e),
    text,
  );
}

/**
 * Parses the whole of `text` as a unit list: one or more expressions
 * separated by `;`, in order. Surrounding spaces are allowed, and an
 * expression alone is a list of one.
 */
export function parseUnitList(
  text: string,
): Result<readonly [Expr, ...Expr[]], ParseError<Rejection>> {
  return parse(
    map(seq(ws, unitList), ([, list]) => list),
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
export function token<A, R>(parser: Parser<A, R>): Parser<A, R> {
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

/**
 * A decimal literal, parsed exactly; one too large to represent is
 * rejected with the limit it passes. The pattern is the shape
 * `parseDecimal` reads, so it fails for no other reason.
 */
function decimal(pattern: RegExp, expected: string): Parser<Scaled, Rejection> {
  return check(regex(pattern, expected), (text) => {
    const result = parseDecimal(text);
    if (result.ok) return result;
    if (result.error.kind !== "tooLarge") {
      throw new Error(`A literal of the grammar's shape failed to parse`);
    }
    return err({ kind: "numberTooLarge", limit: result.error.limit });
  });
}

/**
 * A decimal literal as the fraction it denotes, for the `^` exponent,
 * which stays a `Rational`; one whose power of ten cannot be formed within
 * the hard bound is rejected as too large.
 */
function fraction(
  pattern: RegExp,
  expected: string,
): Parser<Rational, Rejection> {
  return check(decimal(pattern, expected), (value) => {
    const result = toRational(value, LIMIT_BITS);
    return result.ok ? result : err({ kind: "exponentTooLarge" });
  });
}

/** A unit name; whether it names anything is the table's business. */
export const name: Parser<Spanned<string>> = token(
  spanned(regex(NAME, "a unit name")),
);

const number: Parser<Spanned<Scaled>, Rejection> = token(
  spanned(decimal(UNSIGNED, "a number")),
);

/**
 * The name of a call: a unit name directly followed by `(`, which is left
 * for the call to read. It is labelled as a name is, since wherever a name
 * may start a call may too, and an error should not list the two apart.
 */
const callName: Parser<Spanned<string>> = spanned(
  regex(new RegExp(`${NAME.source}(?=\\()`, "u"), "a unit name"),
);

// ---------------------------------------------------------------------------
// Grammar

function leaf({ value, span }: Spanned<Scaled | string>): Expr {
  return typeof value === "string"
    ? { span, node: { kind: "unit", name: value } }
    : { span, node: { kind: "number", value } };
}

function binary(op: BinaryOp): (left: Expr, right: Expr) => Expr {
  return (left, right) => ({
    span: { start: left.span.start, end: right.span.end },
    node: { kind: "binary", op, left, right },
  });
}

/** The expression grammar itself, for embedding in another grammar. */
export const expr: Parser<Expr, Rejection> = lazy(() => sum);

const parenthesized: Parser<Expr, Rejection> = map(
  token(spanned(seq(symbol("("), expr, string(")")))),
  ({ value: [, inner], span }) => ({ span, node: inner.node }),
);

/** The arguments of a call: zero or more expressions separated by commas. */
const argumentList: Parser<readonly Expr[], Rejection> = map(
  optional(seq(expr, many(seq(symbol(","), expr)))),
  (found) =>
    found === undefined ? [] : [found[0], ...found[1].map(([, e]) => e)],
);

/** `name(arguments...)`, with the name's own span kept for the evaluator's errors. */
const call: Parser<Expr, Rejection> = map(
  token(spanned(seq(callName, symbol("("), argumentList, string(")")))),
  ({ value: [callee, , args], span }): Expr => ({
    span,
    node: {
      kind: "call",
      name: callee.value,
      nameSpan: callee.span,
      arguments: args,
    },
  }),
);

/** An atom that can follow another factor by juxtaposition: not a number. */
const unitAtom: Parser<Expr, Rejection> = alt(
  call,
  map(name, leaf),
  parenthesized,
);

const atom: Parser<Expr, Rejection> = alt(map(number, leaf), unitAtom);

/**
 * The exponent of `^`: a signed decimal, or a parenthesized rational written
 * as a signed decimal optionally divided by an unsigned one. A zero divisor
 * is rejected, as any other unrepresentable literal is.
 */
const exponent: Parser<Spanned<Rational>, Rejection> = token(
  spanned(
    alt(
      fraction(SIGNED, "a number"),
      map(
        seq(
          symbol("("),
          check(
            seq(
              token(fraction(SIGNED, "a number")),
              optional(seq(symbol("/"), token(fraction(UNSIGNED, "a number")))),
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
): Result<Rational, Rejection> {
  const result = divide(numerator, denominator);
  return result.ok ? result : err({ kind: "exponentDividesByZero" });
}

/** `atom`, optionally raised to an exponent. */
function raised(atom: Parser<Expr, Rejection>): Parser<Expr, Rejection> {
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

const power: Parser<Expr, Rejection> = raised(atom);
const unitPower: Parser<Expr, Rejection> = raised(unitAtom);

const product: Parser<Expr, Rejection> = map(
  seq(power, many(unitPower)),
  ([first, rest]) => rest.reduce(binary("mul"), first),
);

/** A product, or a product negated by one leading `-`. */
const signed: Parser<Expr, Rejection> = alt(
  product,
  map(seq(spanned(symbol("-")), product), ([minus, operand]): Expr => ({
    span: { start: minus.span.start, end: operand.span.end },
    node: { kind: "neg", operand },
  })),
);

const quotient: Parser<Expr, Rejection> = chainl1(
  signed,
  alt(
    map(symbol("*"), () => binary("mul")),
    map(symbol("/"), () => binary("div")),
  ),
);

const sum: Parser<Expr, Rejection> = chainl1(
  quotient,
  alt(
    map(symbol("+"), () => binary("add")),
    map(symbol("-"), () => binary("sub")),
  ),
);

// ---------------------------------------------------------------------------
// Unit lists

/**
 * `item (";" item)*`: the items of a unit list, for a grammar that wants
 * something other than a bare expression as an item (the definitions parser
 * keeps each item's text beside it).
 */
export function unitListOf<A, R>(
  item: Parser<A, R>,
): Parser<readonly [A, ...A[]], R> {
  return map(seq(item, many(seq(symbol(";"), item))), ([first, rest]) => [
    first,
    ...rest.map(([, e]) => e),
  ]);
}

/** The unit list grammar itself: expressions separated by `;`. */
export const unitList: Parser<readonly [Expr, ...Expr[]], Rejection> =
  unitListOf(expr);
