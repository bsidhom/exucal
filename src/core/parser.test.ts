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
  type Span,
  type Spanned,
} from "./parser.ts";
import { err, ok, type Result } from "./result.ts";

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
// An expression grammar in the shape of the one the converter will use:
// numbers and names, juxtaposition and `*` for products, `/`, `^` with an
// integer exponent, and parentheses. Products bind tighter than `/`, as in
// GNU units, and every operand carries its span.

type Expr =
  | { kind: "num"; value: number; span: Span }
  | { kind: "name"; name: string; span: Span }
  | { kind: "bin"; op: "*" | "/"; left: Expr; right: Expr; span: Span }
  | { kind: "pow"; base: Expr; exponent: number; span: Span };

const ws = regex(/\s*/, "whitespace");
const token = <A>(parser: Parser<A>): Parser<A> =>
  map(seq(parser, ws), ([value]) => value);
const symbol = (s: string) => token(string(s));

const number: Parser<Expr> = map(
  token(
    spanned(
      check(digits, (text) =>
        text.length <= 4 ? ok(Number(text)) : err("too large"),
      ),
    ),
  ),
  ({ value, span }) => ({ kind: "num", value, span }),
);
const name: Parser<Expr> = map(
  token(spanned(regex(/[a-z]+/, "a unit name"))),
  ({ value, span }) => ({ kind: "name", name: value, span }),
);
const expr: Parser<Expr> = lazy(() => quotient);
const parenthesized = map(
  seq(symbol("("), expr, symbol(")")),
  ([, inner]) => inner,
);
const atom = alt(number, name, parenthesized);
const factor = map(
  seq(atom, optional(seq(symbol("^"), token(spanned(integer))))),
  ([base, power]): Expr =>
    power === undefined
      ? base
      : {
          kind: "pow",
          base,
          exponent: power[1].value,
          span: { start: base.span.start, end: power[1].span.end },
        },
);
const binary =
  (op: "*" | "/") =>
  (left: Expr, right: Expr): Expr => ({
    kind: "bin",
    op,
    left,
    right,
    span: { start: left.span.start, end: right.span.end },
  });
const product = chainl1(
  factor,
  alt(
    map(symbol("*"), () => binary("*")),
    succeed(binary("*")),
  ),
);
const quotient = chainl1(
  product,
  map(symbol("/"), () => binary("/")),
);
const parseExpr = (text: string): Result<Expr, ParseError> =>
  parse(
    map(seq(ws, expr), ([, e]) => e),
    text,
  );

/** Renders an expression with explicit grouping, for comparing structure. */
function show(e: Expr): string {
  switch (e.kind) {
    case "num":
      return String(e.value);
    case "name":
      return e.name;
    case "bin":
      return `(${show(e.left)} ${e.op} ${show(e.right)})`;
    case "pow":
      return `${show(e.base)}^${e.exponent}`;
  }
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function rejected(text: string): ParseError {
  const result = parseExpr(text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

test("the example grammar parses with GNU units precedence", () => {
  assert.equal(show(parsed("2 m")), "(2 * m)");
  assert.equal(show(parsed("2m")), "(2 * m)");
  assert.equal(show(parsed("kg m / s^2")), "((kg * m) / s^2)");
  assert.equal(
    show(parsed("kg m / s^2 / 3 mol")),
    "(((kg * m) / s^2) / (3 * mol))",
  );
  assert.equal(show(parsed(" 1 / (2 * 3) ")), "(1 / (2 * 3))");
  assert.equal(show(parsed("(m s)^2")), "(m * s)^2");
});

test("the example grammar attaches spans", () => {
  const e = parsed("2 m / s");
  assert.deepEqual(e.span, { start: 0, end: 7 });
  assert.equal(e.kind, "bin");
  assert.deepEqual(e.left.span, { start: 0, end: 3 });
  assert.deepEqual(e.right.span, { start: 6, end: 7 });
});

test("the furthest expectation survives backtracking", () => {
  // The exponent is missing after `^`. The parser backtracks out of the
  // optional exponent, then the product ends and `eof` fails at the `^`
  // itself; the reported error is nevertheless the one furthest in.
  assert.deepEqual(rejected("3 m ^"), unexpected(5, "a number"));
  assert.deepEqual(rejected("3 m ^ x"), unexpected(6, "a number"));
  assert.deepEqual(
    rejected("(2 m"),
    unexpected(4, '"^"', '"*"', "a number", "a unit name", '"("', '"/"', '")"'),
  );
});

test("the example grammar reports what could have continued the input", () => {
  // In the order the parser tried them: the exponent and `*` of the last
  // factor, another factor by juxtaposition, `/`, and the end.
  assert.deepEqual(
    rejected("3 m )"),
    unexpected(
      4,
      '"^"',
      '"*"',
      "a number",
      "a unit name",
      '"("',
      '"/"',
      "end of input",
    ),
  );
  assert.deepEqual(
    rejected(""),
    unexpected(0, "a number", "a unit name", '"("'),
  );
  assert.deepEqual(
    rejected("2 /"),
    unexpected(3, "a number", "a unit name", '"("'),
  );
});

test("the example grammar rejects an unrepresentable literal with its span", () => {
  assert.deepEqual(rejected("m / 12345 s"), {
    kind: "rejected",
    span: { start: 4, end: 9 },
    reason: "too large",
  });
});
