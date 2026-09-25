import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { parseExpr, type Expr } from "./expr.ts";
import { type ParseError } from "./parser.ts";
import { rational, toFraction } from "./rational.ts";
import { type Span } from "./span.ts";

const OPERATOR = { add: "+", sub: "-", mul: "*", div: "/" } as const;

/** Renders an expression with explicit grouping, for comparing structure. */
function show(e: Expr): string {
  const { node } = e;
  switch (node.kind) {
    case "number":
      return toFraction(node.value);
    case "unit":
      return node.name;
    case "binary":
      return `(${show(node.left)} ${OPERATOR[node.op]} ${show(node.right)})`;
    case "pow":
      return `${show(node.base)}^${toFraction(node.exponent)}`;
  }
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function failed(text: string): ParseError {
  const result = parseExpr(text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `text` parses to the structure `expected` renders as. */
function assertParses(text: string, expected: string): void {
  assert.equal(show(parsed(text)), expected, `parsing ${JSON.stringify(text)}`);
}

/** The error for nothing acceptable at `pos`. */
function unexpected(pos: number, ...expected: string[]): ParseError {
  return { kind: "unexpected", pos, expected };
}

/** The error for the text at `span` being recognized and refused. */
function rejected(span: Span, reason: string): ParseError {
  return { kind: "rejected", span, reason };
}

/** What can start an operand. */
const OPERAND = ["a number", "a unit name", '"("'];
/** What can follow a raised factor, short of whatever closes the expression. */
const AFTER_POWER = ["a unit name", '"("', '"*"', '"/"', '"+"', '"-"'];
/** What can follow a factor that has no exponent yet. */
const AFTER_FACTOR = ['"^"', ...AFTER_POWER];

// ---------------------------------------------------------------------------
// Structure and precedence

test("a lone number or unit is a leaf", () => {
  assert.deepEqual(parsed("2.5"), {
    span: { start: 0, end: 3 },
    node: { kind: "number", value: rational(5n, 2n) },
  });
  assert.deepEqual(parsed("m"), {
    span: { start: 0, end: 1 },
    node: { kind: "unit", name: "m" },
  });
});

test("juxtaposition and * multiply, / divides", () => {
  assertParses("2 m", "(2 * m)");
  assertParses("2m", "(2 * m)");
  assertParses("2 * m", "(2 * m)");
  assertParses("m / s", "(m / s)");
  assertParses("kg m s", "((kg * m) * s)");
  assertParses("2 * 3 * 4", "((2 * 3) * 4)");
});

test("a number may only be the first factor of a product", () => {
  // Juxtaposition means "this many of these units" or a product of units;
  // multiplying numbers is written with `*`.
  assertParses("2 m", "(2 * m)");
  assertParses("2 (m s)", "(2 * (m * s))");
  assertParses("2 (3 m)", "(2 * (3 * m))");
  assertParses("2^2 m", "(2^2 * m)");
  const expected = [...AFTER_FACTOR, "end of input"];
  assert.deepEqual(failed("1 2 3"), unexpected(2, ...expected));
  assert.deepEqual(failed("m 2"), unexpected(2, ...expected));
  assert.deepEqual(failed("2 3 m"), unexpected(2, ...expected));
  assert.deepEqual(failed("2 m 3"), unexpected(4, ...expected));
  assert.deepEqual(
    failed("m^2 2"),
    unexpected(4, ...AFTER_POWER, "end of input"),
  );
});

test("juxtaposition binds tighter than * and /", () => {
  // As in GNU units: the first `/` starts the denominator of what follows.
  assertParses("kg m / s^2", "((kg * m) / s^2)");
  assertParses("m / s s", "(m / (s * s))");
  assertParses("1/2 m", "(1 / (2 * m))");
  assertParses("1/2*m", "((1 / 2) * m)");
  assertParses("a b * c d", "((a * b) * (c * d))");
});

test("* and / are one left-associative level", () => {
  assertParses("m / s * s", "((m / s) * s)");
  assertParses("m * s / s", "((m * s) / s)");
  assertParses("a / b / c", "((a / b) / c)");
  assertParses("kg m / s^2 / 3 mol", "(((kg * m) / s^2) / (3 * mol))");
});

test("+ and - are one left-associative level below * and /", () => {
  assertParses("a + b", "(a + b)");
  assertParses("a - b", "(a - b)");
  assertParses("a+b-c", "((a + b) - c)");
  assertParses("a - b + c", "((a - b) + c)");
  assertParses("1 ft + 3 in", "((1 * ft) + (3 * in))");
  assertParses("a + b * c", "(a + (b * c))");
  assertParses("a * b + c / d", "((a * b) + (c / d))");
  assertParses("2 m * 3 + 1 m", "(((2 * m) * 3) + (1 * m))");
  assertParses("a / b - c d", "((a / b) - (c * d))");
  // The fraction-before-a-unit rule holds inside a sum: 1 / (2 m).
  assertParses("1 m + 1/2 m", "((1 * m) + (1 / (2 * m)))");
  assertParses("(a + b) c", "((a + b) * c)");
  assertParses("(a + b)^2", "(a + b)^2");
  assertParses("a (b - c)", "(a * (b - c))");
});

test("- after an exponent is a subtraction, not part of it", () => {
  // The exponent literal is read as far as it goes, and a sign only starts it.
  assertParses("m^-1", "m^-1");
  assertParses("m^2 - 1", "(m^2 - 1)");
  assertParses("m^2-1", "(m^2 - 1)");
  assertParses("m^-2-1", "(m^-2 - 1)");
  assertParses("m ^ -2", "m^-2");
});

test("a sign is part of a number only in its exponent", () => {
  assertParses("2e-3", "1/500");
  assertParses("2e+3", "2000");
  assertParses("2e - 3", "((2 * e) - 3)");
  assertParses("2 - 3", "(2 - 3)");
  assertParses("2-3", "(2 - 3)");
  assertParses("2+3", "(2 + 3)");
  assertParses("2.-3.", "(2 - 3)");
});

test("parentheses group", () => {
  assertParses("1 / (2 * 3)", "(1 / (2 * 3))");
  assertParses("(m s)^2", "(m * s)^2");
  assertParses("((m))", "m");
  assertParses("(2)(m)", "(2 * m)");
  assertParses("m (s / kg) (mol)", "((m * (s / kg)) * mol)");
});

test("^ binds tightest", () => {
  assertParses("m^2 s", "(m^2 * s)");
  assertParses("2 m^2", "(2 * m^2)");
  assertParses("m^1/2", "(m^1 / 2)");
  assertParses("2^3", "2^3");
  assertParses("m^2/s^2", "(m^2 / s^2)");
});

// ---------------------------------------------------------------------------
// Exponents

test("an exponent is a signed decimal", () => {
  assertParses("m^2", "m^2");
  assertParses("m^-2", "m^-2");
  assertParses("m^+2", "m^2");
  assertParses("m^0", "m^0");
  assertParses("m^0.5", "m^1/2");
  assertParses("m^-1.5", "m^-3/2");
  assertParses("m^1e2", "m^100");
  assertParses("m ^ 2", "m^2");
  assertParses("m^.5", "m^1/2");
});

test("an exponent may be a parenthesized rational", () => {
  assertParses("m^(1/2)", "m^1/2");
  assertParses("m^(-1/2)", "m^-1/2");
  assertParses("m^(+3/2)", "m^3/2");
  assertParses("m^( 3 / 2 )", "m^3/2");
  assertParses("m^(2)", "m^2");
  assertParses("m^(1.5)", "m^3/2");
  assertParses("m^(0.5/2)", "m^1/4");
  assertParses("m^(0/5)", "m^0");
  assertParses("m^(2) s", "(m^2 * s)");
});

test("a parenthesized exponent is a literal, not an expression", () => {
  assert.deepEqual(failed("m^(1/s)"), unexpected(5, "a number"));
  assert.deepEqual(failed("m^(1/2/3)"), unexpected(6, '")"'));
  assert.deepEqual(failed("m^(2 m)"), unexpected(5, '"/"', '")"'));
  assert.deepEqual(failed("m^(1/-2)"), unexpected(5, "a number"));
});

test("an exponent that divides by zero is rejected with its span", () => {
  assert.deepEqual(
    failed("m^(1/0)"),
    rejected({ start: 3, end: 6 }, "the exponent divides by zero"),
  );
  assert.deepEqual(
    failed("m^( 3 / 0.0 )"),
    rejected({ start: 4, end: 12 }, "the exponent divides by zero"),
  );
});

test("a base takes at most one exponent", () => {
  assert.deepEqual(
    failed("m^2^3"),
    unexpected(3, ...AFTER_POWER, "end of input"),
  );
});

// ---------------------------------------------------------------------------
// Numbers

test("numbers are decimal literals, parsed exactly", () => {
  assertParses("2", "2");
  assertParses("2.54", "127/50");
  assertParses(".5", "1/2");
  assertParses("5.", "5");
  assertParses("1e3", "1000");
  assertParses("1.5e-3", "3/2000");
  assertParses("2E+2", "200");
  assertParses("0.1 * 0.2", "(1/10 * 1/5)");
});

test("a number has no sign, and there is no negation", () => {
  assert.deepEqual(failed("-2 m"), unexpected(0, ...OPERAND));
  assert.deepEqual(failed("+2 m"), unexpected(0, ...OPERAND));
  assert.deepEqual(failed("2 * -3"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("2 - -3"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("(-2) m"), unexpected(1, ...OPERAND));
});

test("an e that does not start an exponent is a unit name", () => {
  assertParses("3e", "(3 * e)");
  assertParses("3em", "(3 * em)");
  assertParses("3e m", "((3 * e) * m)");
});

test("a number too large to represent is rejected with its span", () => {
  assert.deepEqual(
    failed("m / 1e999999 s"),
    rejected({ start: 4, end: 12 }, "this number is too large to represent"),
  );
  assert.deepEqual(
    failed("m^1e999999"),
    rejected({ start: 2, end: 10 }, "this number is too large to represent"),
  );
  assert.deepEqual(
    failed("m^(1/1e999999)"),
    rejected({ start: 5, end: 13 }, "this number is too large to represent"),
  );
});

// ---------------------------------------------------------------------------
// Names

test("a name is a letter or underscore followed by letters, digits and underscores", () => {
  for (const name of ["m", "mu0", "_x", "foo_bar", "degF", "H2O", "µ", "Ω"]) {
    assert.deepEqual(parsed(name).node, { kind: "unit", name });
  }
});

test("names are maximal, so a trailing digit is part of the name", () => {
  assertParses("m2", "m2");
  assertParses("2m2", "(2 * m2)");
  assertParses("m_2 m", "(m_2 * m)");
});

test("a name never starts with a digit or contains a symbol", () => {
  assertParses("2m", "(2 * m)");
  assert.deepEqual(
    failed("m$"),
    unexpected(1, ...AFTER_FACTOR, "end of input"),
  );
  assert.deepEqual(failed("°C"), unexpected(0, ...OPERAND));
});

// ---------------------------------------------------------------------------
// Whitespace

test("spaces and tabs are allowed around every token", () => {
  assertParses("\t 2 \t m / s ^ 2 ", "((2 * m) / s^2)");
  assertParses("( m )", "m");
});

test("a newline is not whitespace", () => {
  assert.equal(failed("2 m\n").kind, "unexpected");
  assert.equal(failed("2\nm").kind, "unexpected");
});

// ---------------------------------------------------------------------------
// Spans

test("a composite node spans from its first part to its last", () => {
  const e = parsed(" 2 m / s^2 ");
  assert.deepEqual(e.span, { start: 1, end: 10 });
  assert.equal(e.node.kind, "binary");
  assert.deepEqual(e.node.left.span, { start: 1, end: 4 });
  assert.deepEqual(e.node.right.span, { start: 7, end: 10 });
  assert.equal(e.node.right.node.kind, "pow");
  assert.deepEqual(e.node.right.node.base.span, { start: 7, end: 8 });
});

test("a sum spans its operands, and the operator lies between them", () => {
  const e = parsed(" 2 ft + 3 in - cm ");
  assert.deepEqual(e.span, { start: 1, end: 17 });
  assert.equal(e.node.kind, "binary");
  assert.equal(e.node.op, "sub");
  assert.deepEqual(e.node.right.span, { start: 15, end: 17 });
  const sum = e.node.left;
  assert.deepEqual(sum.span, { start: 1, end: 12 });
  assert.equal(sum.node.kind, "binary");
  assert.equal(sum.node.op, "add");
  assert.deepEqual(sum.node.left.span, { start: 1, end: 5 });
  assert.deepEqual(sum.node.right.span, { start: 8, end: 12 });
});

test("a parenthesized expression spans its parentheses, and nothing beyond", () => {
  const e = parsed("2 ( m s ) ^2");
  assert.equal(e.node.kind, "binary");
  assert.deepEqual(e.node.right.span, { start: 2, end: 12 });
  assert.equal(e.node.right.node.kind, "pow");
  assert.deepEqual(e.node.right.node.base.span, { start: 2, end: 9 });
  assert.equal(e.node.right.node.base.node.kind, "binary");
  assert.deepEqual(e.node.right.node.base.node.left.span, { start: 4, end: 5 });
});

// ---------------------------------------------------------------------------
// Errors

test("the furthest expectation survives backtracking", () => {
  // The exponent is missing after `^`. The parser backtracks out of the
  // optional exponent, then the product ends and `eof` fails at the `^`
  // itself; the reported error is nevertheless the one furthest in.
  assert.deepEqual(failed("3 m ^"), unexpected(5, "a number", '"("'));
  assert.deepEqual(failed("3 m ^ x"), unexpected(6, "a number", '"("'));
  assert.deepEqual(failed("(2 m"), unexpected(4, ...AFTER_FACTOR, '")"'));
});

test("an error lists what could have continued the input", () => {
  // In the order the parser tried them: the exponent of the last factor,
  // a unit by juxtaposition, `*` and `/`, and the end.
  assert.deepEqual(
    failed("3 m )"),
    unexpected(4, ...AFTER_FACTOR, "end of input"),
  );
  assert.deepEqual(failed(""), unexpected(0, ...OPERAND));
  assert.deepEqual(failed("   "), unexpected(3, ...OPERAND));
  assert.deepEqual(failed("2 /"), unexpected(3, ...OPERAND));
  assert.deepEqual(failed("2 * * 3"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("()"), unexpected(1, ...OPERAND));
  assert.deepEqual(failed("2 m +"), unexpected(5, ...OPERAND));
  assert.deepEqual(failed("2 m + "), unexpected(6, ...OPERAND));
  assert.deepEqual(failed("2 + * 3"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("(2 + 3"), unexpected(6, ...AFTER_FACTOR, '")"'));
});
