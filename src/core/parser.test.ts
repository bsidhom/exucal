import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  alt,
  chainl1,
  check,
  eof,
  fail,
  flatMap,
  lazy,
  many,
  many1,
  map,
  optional,
  parse,
  regex,
  seq,
  spanned,
  string,
  succeed,
  type ParseError,
  type Parser,
  type Spanned,
} from "./parser.ts";
import { err, ok } from "./result.ts";
import type { Span } from "./span.ts";

/** Runs `parser` on the whole of `text`, which is expected to parse. */
function unwrap<A>(parser: Parser<A>, text: string): A {
  const result = parse(parser, text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

/** Runs `parser` on the whole of `text`, which is expected not to parse. */
function failure(parser: Parser<unknown>, text: string): ParseError {
  const result = parse(parser, text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

/** The error for nothing acceptable at `pos`. */
function unexpected(pos: number, ...expected: string[]): ParseError {
  return { kind: "unexpected", pos, expected };
}

const digit = regex(/[0-9]/, "a digit");
const digits = regex(/[0-9]+/, "a number");
const letter = regex(/[a-z]/, "a letter");
const integer = map(digits, Number);

// ---------------------------------------------------------------------------
// Primitives

test("string matches its literal and nothing else", () => {
  assert.equal(unwrap(string("ab"), "ab"), "ab");
  assert.deepEqual(failure(string("ab"), "ac"), unexpected(0, '"ab"'));
  assert.deepEqual(failure(string("ab"), "abc"), unexpected(2, "end of input"));
});

test("regex matches only at the current position", () => {
  const pattern = /[0-9]+/;
  const number = regex(pattern, "a number");
  assert.equal(unwrap(number, "42"), "42");
  assert.deepEqual(failure(number, "x42"), unexpected(0, "a number"));
  assert.deepEqual(unwrap(seq(letter, number), "x42"), ["x", "42"]);
  // The caller's pattern is copied, not made sticky or advanced.
  assert.equal(pattern.sticky, false);
  assert.equal(pattern.lastIndex, 0);
});

test("regex accepts a pattern that is already sticky", () => {
  assert.equal(unwrap(regex(/[0-9]+/y, "a number"), "42"), "42");
});

test("regex may match the empty string", () => {
  const spaces = regex(/ */, "spaces");
  assert.deepEqual(unwrap(seq(spaces, letter), "a"), ["", "a"]);
  assert.deepEqual(unwrap(seq(spaces, letter), "   a"), ["   ", "a"]);
});

test("eof matches only at the end of the input", () => {
  const reply = eof("ab", 2);
  assert.ok(reply.ok);
  assert.equal(reply.end, 2);
  assert.deepEqual(eof("ab", 1), {
    ok: false,
    error: unexpected(1, "end of input"),
  });
});

test("succeed matches nothing and produces its value", () => {
  assert.deepEqual(unwrap(seq(succeed(7), letter), "a"), [7, "a"]);
});

test("fail always fails with its label", () => {
  assert.deepEqual(failure(fail("something"), "a"), unexpected(0, "something"));
});

// ---------------------------------------------------------------------------
// Combinators

test("map transforms the value and leaves failures alone", () => {
  assert.equal(unwrap(integer, "42"), 42);
  assert.deepEqual(failure(integer, "x"), unexpected(0, "a number"));
});

test("flatMap parses what depends on an earlier value", () => {
  // A count followed by that many letters, which no context-free grammar can say.
  const counted = flatMap(integer, (n) =>
    seq(...Array.from({ length: n }, () => letter)),
  );
  assert.deepEqual(unwrap(counted, "3abc"), ["a", "b", "c"]);
  assert.deepEqual(failure(counted, "3ab"), unexpected(3, "a letter"));
  assert.deepEqual(failure(counted, "1abc"), unexpected(2, "end of input"));
});

test("seq produces a tuple and fails where its first failing part does", () => {
  const p: Parser<readonly [string, string, number]> = seq(
    letter,
    string("="),
    integer,
  );
  assert.deepEqual(unwrap(p, "x=42"), ["x", "=", 42]);
  assert.deepEqual(failure(p, "x+42"), unexpected(1, '"="'));
  assert.deepEqual(failure(p, "x="), unexpected(2, "a number"));
});

test("alt takes the first alternative that matches", () => {
  const p: Parser<string | number> = alt(letter, integer);
  assert.equal(unwrap(p, "a"), "a");
  assert.equal(unwrap(p, "7"), 7);
  // The first match wins even if a later alternative would match more.
  assert.equal(
    unwrap(seq(alt(string("a"), string("ab")), string("b")), "ab").length,
    2,
  );
  assert.deepEqual(
    failure(alt(string("a"), string("ab")), "ab"),
    unexpected(1, "end of input"),
  );
});

test("alt merges the expectations of alternatives that fail at the same position", () => {
  assert.deepEqual(
    failure(alt(letter, integer), "?"),
    unexpected(0, "a letter", "a number"),
  );
});

test("alt reports the alternative that got furthest", () => {
  const p = alt(seq(letter, digit, digit), seq(letter, letter), letter);
  assert.deepEqual(failure(p, "a1x"), unexpected(2, "a digit"));
  assert.deepEqual(failure(p, "ax1"), unexpected(2, "end of input"));
});

test("expectations are not repeated", () => {
  const p = alt(
    seq(letter, digit),
    seq(letter, digit, digit),
    seq(letter, string("!")),
  );
  assert.deepEqual(failure(p, "a?"), unexpected(1, "a digit", '"!"'));
});

test("optional matches or produces undefined", () => {
  const p = seq(optional(string("-")), integer);
  assert.deepEqual(unwrap(p, "-3"), ["-", 3]);
  assert.deepEqual(unwrap(p, "3"), [undefined, 3]);
});

test("many matches zero or more times", () => {
  assert.deepEqual(unwrap(many(letter), ""), []);
  assert.deepEqual(unwrap(many(letter), "abc"), ["a", "b", "c"]);
  assert.deepEqual(unwrap(seq(many(letter), integer), "ab1"), [["a", "b"], 1]);
});

test("many1 matches one or more times and its type says so", () => {
  const p: Parser<readonly [string, ...string[]]> = many1(letter);
  assert.deepEqual(unwrap(p, "abc"), ["a", "b", "c"]);
  assert.deepEqual(failure(p, ""), unexpected(0, "a letter"));
});

test("many throws on a parser that matches nothing, instead of looping", () => {
  assert.throws(() => many(succeed(1))("", 0), /matched nothing/);
  assert.throws(() => many(regex(/ */, "spaces"))("a", 0), /matched nothing/);
});

test("chainl1 folds from the left", () => {
  const minus = map(string("-"), () => (a: number, b: number) => a - b);
  const plus = map(string("+"), () => (a: number, b: number) => a + b);
  const sum = chainl1(integer, alt(plus, minus));
  assert.equal(unwrap(sum, "8"), 8);
  assert.equal(unwrap(sum, "8-3-2"), 3);
  assert.equal(unwrap(sum, "8-3+2"), 7);
  assert.deepEqual(failure(sum, "8-"), unexpected(2, "a number"));
});

test("spanned records where the value came from", () => {
  const p: Parser<readonly [string, Spanned<number>, string]> = seq(
    string("("),
    spanned(integer),
    string(")"),
  );
  const span: Span = { start: 1, end: 3 };
  assert.deepEqual(unwrap(p, "(42)"), ["(", { value: 42, span }, ")"]);
});

test("check maps a validated value or rejects the recognized text", () => {
  const small = check(spanned(integer), ({ value }) =>
    value < 100 ? ok(value) : err("too large"),
  );
  assert.equal(unwrap(small, "42"), 42);
  assert.deepEqual(failure(seq(letter, small), "x420"), {
    kind: "rejected",
    span: { start: 1, end: 4 },
    reason: "too large",
  });
  assert.deepEqual(failure(small, "x"), unexpected(0, "a number"));
});

test("a rejection is final: alt tries no further alternatives", () => {
  const small = check(integer, (n) => (n < 100 ? ok(n) : err("too large")));
  // Without the rejection the second alternative would match "420" fine.
  const p = alt(small, digits);
  assert.equal(failure(p, "420").kind, "rejected");
  assert.equal(failure(many(alt(letter, small)), "ab420").kind, "rejected");
  assert.equal(failure(optional(small), "420").kind, "rejected");
});

test("lazy allows a grammar to refer to itself", () => {
  const nested: Parser<number> = lazy(() =>
    alt(
      map(seq(string("("), nested, string(")")), ([, n]) => n + 1),
      map(string("x"), () => 0),
    ),
  );
  assert.equal(unwrap(nested, "x"), 0);
  assert.equal(unwrap(nested, "(((x)))"), 3);
  assert.deepEqual(failure(nested, "((x)"), unexpected(4, '")"'));
});

// ---------------------------------------------------------------------------
// The interplay that the real grammars (expr.ts, definitions.ts) rely on:
// an undone alternative keeps the expectation it met, a success keeps the
// expectations of what it tried and did not take, and a rejection surfaces
// through any nesting. Those tests exercise the behaviour on real input; the
// ones here pin down the mechanism on the smallest parsers that show it.

test("an undone partial match keeps the expectation it met", () => {
  // The exponent is optional, but once `^` has been read a digit must
  // follow. The parser undoes the `^`, `eof` fails at it, and the error is
  // nevertheless the one further in.
  const p = seq(optional(seq(string("^"), digit)), eof);
  assert.deepEqual(failure(p, "^x"), unexpected(1, "a digit"));
  assert.deepEqual(failure(p, "^"), unexpected(1, "a digit"));
});

test("a success keeps the expectations of what it tried and did not take", () => {
  // `many` stopped because no letter followed; `eof` fails at the same
  // position, and the error lists both continuations.
  assert.deepEqual(
    failure(seq(many(letter), eof), "ab1"),
    unexpected(2, "a letter", "end of input"),
  );
  assert.deepEqual(
    failure(seq(optional(string("-")), integer), "x"),
    unexpected(0, '"-"', "a number"),
  );
});

test("a rejection surfaces through nested combinators with its span", () => {
  const small = check(integer, (n) => (n < 100 ? ok(n) : err("too large")));
  const plus = map(string("+"), () => (a: number, b: number) => a + b);
  const sum: Parser<number> = lazy(() =>
    alt(
      map(seq(string("("), sum, string(")")), ([, n]) => n),
      chainl1(small, plus),
    ),
  );
  assert.equal(unwrap(sum, "(1+2)"), 3);
  assert.deepEqual(failure(sum, "(1+420)"), {
    kind: "rejected",
    span: { start: 3, end: 6 },
    reason: "too large",
  });
});
