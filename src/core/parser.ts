// Parser combinators: the building blocks the definitions and expression
// parsers are assembled from. A `Parser<A>` is a plain function from the input
// text and a position to a `Reply<A>`: the value it recognized and where the
// match ended, or a `ParseError`. Larger parsers are built from smaller ones by
// plain functions (`seq`, `alt`, `many`, ...), so a grammar reads as a direct
// transcription of itself and every combinator is a few lines that can be
// checked by eye. devdocs/architecture.md ("Parsing") explains the approach.
//
// Two decisions shape the design:
//
// - `alt` is ordered choice: an alternative that fails, however far it got,
//   is undone and the next is tried from the same position, and the first
//   that matches is taken for good. No lookahead has to be written, and no
//   later failure reopens an earlier choice. So that undoing a failed
//   alternative does not lose the useful error, every reply, successful or
//   not, carries the furthest position the parser examined and what it
//   expected there, and combinators keep whichever of their parts got
//   furthest. That is what lets the error for `3 m ^` say "expected a
//   number" after the `^`, even though the parser undid the exponent and
//   went on to fail at the `^` itself.
// - `check` lets a parser reject text it recognized (a numeric literal too
//   large to represent). A rejection ends the parse: no alternative is tried,
//   because the text was understood and found unacceptable, not misread.
//   Its reason is data of the grammar's choosing, the `R` of `Parser<A, R>`,
//   and not words: the grammar says why, and the UI says it (messages.ts),
//   as for every other error. A parser that cannot reject has `R` never,
//   the default, and fits wherever a parser of any `R` is wanted.
//
// Parsers are pure functions of their input. The only mutable state is
// internal and unobservable: `regex` reuses one sticky `RegExp` whose
// `lastIndex` it sets before every use, and `lazy` memoizes the parser it
// builds. A grammar that would loop forever (`many` of a parser that can
// match nothing) is a programming error and throws.

import { err, ok, type Result } from "./result.ts";
import type { Span } from "./span.ts";

// ---------------------------------------------------------------------------
// Types

/** A parsed value together with the span of input it came from. */
export type Spanned<A> = { readonly value: A; readonly span: Span };

/**
 * Where a parser looked, and what it would have accepted there. `expected`
 * holds the labels of the primitives that were tried at `pos`, in the order
 * they were tried and without duplicates; it is empty when the parser reached
 * `pos` without wanting anything in particular.
 */
export type Expectation = {
  readonly pos: number;
  readonly expected: readonly string[];
};

export type ParseError<R = never> =
  /** Nothing acceptable at `pos`; `expected` names what would have been. */
  | {
      readonly kind: "unexpected";
      readonly pos: number;
      readonly expected: readonly string[];
    }
  /** The text at `span` was recognized but rejected by a `check`, for `reason`. */
  | { readonly kind: "rejected"; readonly span: Span; readonly reason: R };

/**
 * A match: `value` was parsed from the input between the start position and
 * `end`. `furthest` is the furthest expectation met on the way, including
 * any in alternatives that were tried and abandoned; a failure later in the
 * same parse at or before that position is reported together with it.
 */
export type Success<A> = {
  readonly ok: true;
  readonly value: A;
  readonly end: number;
  readonly furthest: Expectation;
};

export type Failure<R = never> = {
  readonly ok: false;
  readonly error: ParseError<R>;
};

export type Reply<A, R = never> = Success<A> | Failure<R>;

/**
 * A parser of `A`: runs on `text` at `pos` and replies without side
 * effects, rejecting what it recognized, if it can, for a reason `R`.
 */
export type Parser<A, R = never> = (text: string, pos: number) => Reply<A, R>;

/** The value a parser produces. */
type ValueOf<P> = P extends Parser<infer A, unknown> ? A : never;

/** The reason a parser may reject for. */
type ReasonOf<P> = P extends Parser<unknown, infer R> ? R : never;

// ---------------------------------------------------------------------------
// Running a parser

/** Parses the whole of `text` with `parser`; trailing input is an error. */
export function parse<A, R>(
  parser: Parser<A, R>,
  text: string,
): Result<A, ParseError<R>> {
  const reply = seq(parser, eof)(text, 0);
  return reply.ok ? ok(reply.value[0]) : err(reply.error);
}

// ---------------------------------------------------------------------------
// Primitives

/** Matches nothing and produces `value`. */
export function succeed<A>(value: A): Parser<A> {
  return (_text, pos) => success(value, pos, nothingExpected(pos));
}

/** Always fails, reporting that `expected` was expected. */
export function fail(expected: string): Parser<never> {
  return (_text, pos) => unexpected({ pos, expected: [expected] });
}

/** Matches `literal` exactly. */
export function string(literal: string): Parser<string> {
  const expected = JSON.stringify(literal);
  return (text, pos) =>
    text.startsWith(literal, pos)
      ? matched(literal, pos)
      : unexpected({ pos, expected: [expected] });
}

/**
 * Matches `pattern` at the current position (and only there: the pattern is
 * made sticky) and produces the matched text. `expected` labels it in errors,
 * e.g. `"a number"`.
 */
export function regex(pattern: RegExp, expected: string): Parser<string> {
  const flags = pattern.flags.includes("y")
    ? pattern.flags
    : `${pattern.flags}y`;
  const sticky = new RegExp(pattern.source, flags);
  return (text, pos) => {
    sticky.lastIndex = pos;
    const match = sticky.exec(text);
    return match === null
      ? unexpected({ pos, expected: [expected] })
      : matched(match[0], pos);
  };
}

/** Matches the end of the input. */
export const eof: Parser<undefined> = (text, pos) =>
  pos === text.length
    ? success(undefined, pos, nothingExpected(pos))
    : unexpected({ pos, expected: ["end of input"] });

/**
 * Defers building a parser until it is first used, so that a grammar can
 * refer to itself: `const expr = lazy(() => alt(number, parenthesized))`.
 */
export function lazy<A, R>(build: () => Parser<A, R>): Parser<A, R> {
  let parser: Parser<A, R> | undefined;
  return (text, pos) => (parser ??= build())(text, pos);
}

// ---------------------------------------------------------------------------
// Combinators

/** Applies `f` to the parsed value. */
export function map<A, B, R>(
  parser: Parser<A, R>,
  f: (value: A) => B,
): Parser<B, R> {
  return (text, pos) => {
    const reply = parser(text, pos);
    return reply.ok ? { ...reply, value: f(reply.value) } : reply;
  };
}

/** Chooses the parser to continue with from the value parsed so far. */
export function flatMap<A, B, R>(
  parser: Parser<A, R>,
  f: (value: A) => Parser<B, R>,
): Parser<B, R> {
  return (text, pos) => {
    const first = parser(text, pos);
    if (!first.ok) return first;
    const second = f(first.value)(text, first.end);
    return second.ok
      ? { ...second, furthest: further(first.furthest, second.furthest) }
      : merged(second, first.furthest);
  };
}

/**
 * Validates what `parser` recognized. A failed validation rejects the whole
 * parse with the span of the recognized text and the returned reason; unlike a
 * failure to match, it is not undone by backtracking. This is the only source
 * of `rejected` errors.
 */
export function check<A, B, R>(
  parser: Parser<A, R>,
  validate: (value: A) => Result<B, R>,
): Parser<B, R> {
  return (text, pos) => {
    const reply = parser(text, pos);
    if (!reply.ok) return reply;
    const result = validate(reply.value);
    if (result.ok) return { ...reply, value: result.value };
    const span = { start: pos, end: reply.end };
    return {
      ok: false,
      error: { kind: "rejected", span, reason: result.error },
    };
  };
}

/** Pairs the parsed value with the span of input it was parsed from. */
export function spanned<A, R>(parser: Parser<A, R>): Parser<Spanned<A>, R> {
  return (text, pos) => {
    const reply = parser(text, pos);
    if (!reply.ok) return reply;
    const span = { start: pos, end: reply.end };
    return { ...reply, value: { value: reply.value, span } };
  };
}

/**
 * Runs the parsers one after another and produces their values as a tuple:
 * `seq(a, b, c)` is a `Parser<[A, B, C]>`, rejecting for any of their
 * reasons.
 */
export function seq<P extends readonly Parser<unknown, unknown>[]>(
  ...parsers: P
): Parser<{ -readonly [K in keyof P]: ValueOf<P[K]> }, ReasonOf<P[number]>> {
  type Values = { -readonly [K in keyof P]: ValueOf<P[K]> };
  type Reason = ReasonOf<P[number]>;
  return (text, pos) => {
    const values: unknown[] = [];
    let end = pos;
    let furthest = nothingExpected(pos);
    for (const parser of parsers) {
      const reply = parser(text, end);
      // A failure's reason is one of the parsers', which `Reason` is the
      // union of; the checker cannot see that through the loop.
      if (!reply.ok) return merged(reply as Failure<Reason>, furthest);
      values.push(reply.value);
      end = reply.end;
      furthest = further(furthest, reply.furthest);
    }
    // The loop pushes one value per parser, in order, which is exactly what
    // the mapped return type promises `Values` is, but the type checker
    // cannot follow a tuple built element by element, so this is the one
    // place a grammar's shape is asserted rather than inferred.
    return success(values as unknown as Values, end, furthest);
  };
}

/**
 * Ordered choice: tries the parsers in order at the same position and takes
 * the first that matches, for good; `alt(a, b)` is a `Parser<A | B>`. An
 * alternative that fails after consuming input is undone entirely before the
 * next is tried, and a rejection by any of them ends the search.
 */
export function alt<P extends readonly Parser<unknown, unknown>[]>(
  ...parsers: P
): Parser<ValueOf<P[number]>, ReasonOf<P[number]>> {
  type Value = ValueOf<P[number]>;
  type Reason = ReasonOf<P[number]>;
  return (text, pos) => {
    let furthest = nothingExpected(pos);
    for (const parser of parsers) {
      // One of the parsers' replies, whose value and reason are among the
      // unions `Value` and `Reason`; the checker cannot see that through
      // the loop.
      const reply = parser(text, pos) as Reply<Value, Reason>;
      if (reply.ok) {
        return { ...reply, furthest: further(furthest, reply.furthest) };
      }
      if (reply.error.kind === "rejected") return reply;
      furthest = further(furthest, expectationOf(reply.error));
    }
    return unexpected(furthest);
  };
}

/** Matches `parser` if it matches, and nothing (producing `undefined`) otherwise. */
export function optional<A, R>(parser: Parser<A, R>): Parser<A | undefined, R> {
  return alt(parser, succeed(undefined));
}

/**
 * Matches `parser` as many times as it matches, possibly zero. The parser
 * must consume input whenever it matches; one that matched nothing would be
 * matched forever, so that is reported by throwing.
 */
export function many<A, R>(parser: Parser<A, R>): Parser<readonly A[], R> {
  return (text, pos) => {
    const values: A[] = [];
    let end = pos;
    let furthest = nothingExpected(pos);
    for (;;) {
      const reply = parser(text, end);
      if (!reply.ok) {
        if (reply.error.kind === "rejected") return reply;
        return success(
          values,
          end,
          further(furthest, expectationOf(reply.error)),
        );
      }
      if (reply.end === end) {
        throw new Error(
          "many: the parser matched nothing and would loop forever",
        );
      }
      values.push(reply.value);
      end = reply.end;
      furthest = further(furthest, reply.furthest);
    }
  };
}

/** Matches `parser` one or more times. */
export function many1<A, R>(
  parser: Parser<A, R>,
): Parser<readonly [A, ...A[]], R> {
  return map(seq(parser, many(parser)), ([first, rest]) => [first, ...rest]);
}

/**
 * Matches one or more `operand`s separated by `operator`s and folds them from
 * the left, so `a op b op c` is `op(op(a, b), c)`: one left-associative
 * precedence level. The operator parser produces the function to combine
 * with, so different operators at one level need only one `chainl1`.
 */
export function chainl1<A, R>(
  operand: Parser<A, R>,
  operator: Parser<(left: A, right: A) => A, R>,
): Parser<A, R> {
  return map(seq(operand, many(seq(operator, operand))), ([first, rest]) =>
    rest.reduce((left, [combine, right]) => combine(left, right), first),
  );
}

// ---------------------------------------------------------------------------
// Replies

function success<A>(value: A, end: number, furthest: Expectation): Success<A> {
  return { ok: true, value, end, furthest };
}

/** A primitive's match of `value`, ending at `pos + value.length`. */
function matched(value: string, pos: number): Success<string> {
  const end = pos + value.length;
  return success(value, end, nothingExpected(end));
}

function unexpected(expectation: Expectation): Failure {
  return { ok: false, error: { kind: "unexpected", ...expectation } };
}

function nothingExpected(pos: number): Expectation {
  return { pos, expected: [] };
}

function expectationOf(
  error: ParseError<unknown> & { kind: "unexpected" },
): Expectation {
  return { pos: error.pos, expected: error.expected };
}

/** `failure` with what an earlier part of the same parser expected folded in. */
function merged<R>(failure: Failure<R>, furthest: Expectation): Failure<R> {
  return failure.error.kind === "unexpected"
    ? unexpected(further(furthest, expectationOf(failure.error)))
    : failure;
}

/** Of two expectations, the one further into the input; at the same position, both. */
function further(a: Expectation, b: Expectation): Expectation {
  if (a.pos !== b.pos) return a.pos > b.pos ? a : b;
  if (a.expected.length === 0) return b;
  if (b.expected.length === 0) return a;
  const extra = b.expected.filter((label) => !a.expected.includes(label));
  return { pos: a.pos, expected: [...a.expected, ...extra] };
}
