import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { parseExpr, parseUnitList, type Expr, type Rejection } from "./expr.ts";
import type { ParseError } from "./parser.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  bitLength,
  rational,
  toFraction,
} from "./rational.ts";
import { ONE, divide, fromRational, toRational } from "./scaled.ts";
import type { Span } from "./span.ts";
import { parseFraction } from "../testing/fraction.ts";
import { key, randomBigInt } from "../testing/random.ts";

/** The operators as the structure shows them: juxtaposition as `*` too, since the tests here are about precedence and not spelling. */
const OPERATOR = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
  juxtapose: "*",
} as const;

/** Renders an expression with explicit grouping, for comparing structure. */
function show(e: Expr): string {
  const { node } = e;
  switch (node.kind) {
    case "number": {
      // A literal that fits the hard bound renders as its fraction; one
      // beyond it as its significand and exponent.
      const fraction = toRational(node.value, MAX_SIGNIFICAND_LIMIT_BITS);
      return fraction.ok
        ? toFraction(fraction.value)
        : `${toFraction(node.value.significand)}e${node.value.exp}`;
    }
    case "unit":
      return node.name;
    case "binary":
      return `(${show(node.left)} ${OPERATOR[node.op]} ${show(node.right)})`;
    case "pow": {
      // The exponent travels as its two literals; it renders as its value.
      const quotient = divide(
        node.exponent.num.value,
        node.exponent.den?.value ?? ONE,
      );
      assert.ok(quotient.ok);
      const fraction = toRational(quotient.value, MAX_SIGNIFICAND_LIMIT_BITS);
      assert.ok(fraction.ok);
      return `${show(node.base)}^${toFraction(fraction.value)}`;
    }
    case "neg":
      return `-${show(node.operand)}`;
    case "call":
      return `${node.name}(${node.arguments.map(show).join(", ")})`;
  }
}

/** The fraction a decimal literal denotes, through `parseFraction`. */
function dec(text: string) {
  const result = parseFraction(text);
  assert.ok(result.ok, text);
  return result.value;
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function failed(text: string): ParseError<Rejection> {
  const result = parseExpr(text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `text` parses to the structure `expected` renders as. */
function assertParses(text: string, expected: string): void {
  assert.equal(show(parsed(text)), expected, `parsing ${JSON.stringify(text)}`);
}

/** The error for nothing acceptable at `pos`. */
function unexpected(pos: number, ...expected: string[]): ParseError<Rejection> {
  return { kind: "unexpected", pos, expected };
}

/** The error for the text at `span` being recognized and refused, for `reason`. */
function rejected(span: Span, reason: Rejection): ParseError<Rejection> {
  return { kind: "rejected", span, reason };
}

/** What can start an operand. */
const OPERAND = ["a number", "a unit name", '"("', '"-"'];
/** What can start the operand of a negation, which does not stack. */
const UNSIGNED_OPERAND = ["a number", "a unit name", '"("'];
/** What can follow a raised factor, short of whatever closes the expression. */
const AFTER_POWER = ["a unit name", '"("', '"*"', '"/"', '"+"', '"-"'];
/** What can follow a factor that has no exponent yet. */
const AFTER_FACTOR = ['"^"', ...AFTER_POWER];

// ---------------------------------------------------------------------------
// Structure and precedence

test("a lone number or unit is a leaf", () => {
  assert.deepEqual(parsed("2.5"), {
    span: { start: 0, end: 3 },
    node: {
      kind: "number",
      value: fromRational(rational(5n, 2n)),
      text: "2.5",
    },
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

test("a leading - negates a product", () => {
  assertParses("-2", "-2");
  assertParses("-m", "-m");
  assertParses("-2 m", "-(2 * m)");
  assertParses("- 2 m", "-(2 * m)");
  assertParses("-kg m", "-(kg * m)");
  assertParses("-(2 m)", "-(2 * m)");
  assertParses("-(-2)", "--2");
});

test("negation binds tighter than * and /, looser than juxtaposition and ^", () => {
  assertParses("-2 m / s", "(-(2 * m) / s)");
  assertParses("2 * -3", "(2 * -3)");
  assertParses("2 * -3 m", "(2 * -(3 * m))");
  assertParses("2 / -3 m", "(2 / -(3 * m))");
  assertParses("-2 * -3", "(-2 * -3)");
  assertParses("-2^2", "-2^2");
  assertParses("-m^2 s", "-(m^2 * s)");
  assertParses("(-2)^2", "-2^2");
  assert.equal(parsed("(-2)^2").node.kind, "pow");
  assert.equal(parsed("-2^2").node.kind, "neg");
});

test("negation may follow + and -, and - - is a difference of a negation", () => {
  assertParses("2 - -3", "(2 - -3)");
  assertParses("2 + -3 m", "(2 + -(3 * m))");
  assertParses("-2 + 3", "(-2 + 3)");
  assertParses("-2 - 3", "(-2 - 3)");
  assertParses("2 -3", "(2 - 3)");
  assertParses("-2 m + -3 m - -m", "((-(2 * m) + -(3 * m)) - -m)");
});

test("negation does not stack, and there is no unary +", () => {
  assert.deepEqual(failed("--2"), unexpected(1, ...UNSIGNED_OPERAND));
  assert.deepEqual(failed("- -2"), unexpected(2, ...UNSIGNED_OPERAND));
  assert.deepEqual(failed("2 * --3"), unexpected(5, ...UNSIGNED_OPERAND));
  assert.deepEqual(failed("+2 m"), unexpected(0, ...OPERAND));
  assert.deepEqual(failed("2 * +3"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("-"), unexpected(1, ...UNSIGNED_OPERAND));
  assert.deepEqual(failed("2 -"), unexpected(3, ...OPERAND));
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

test("an exponent travels in the tree as the two literals the parser read, undivided", () => {
  // The parser has no context to reduce within, and a reduction at the
  // hard bound took seconds to minutes on long literals (issue #66); the
  // evaluator takes the quotient within the significand limit, so nothing is
  // formed here, not even a literal's power of ten.
  for (const [text, num, den] of [
    ["m^2", "2", "1"],
    ["m^-1.5", "-1.5", "1"],
    ["m^(2/4)", "2", "4"],
    ["m^(-1/2)", "-1", "2"],
    ["m^(0.5/2)", "0.5", "2"],
    ["m^(3/1.5)", "3", "1.5"],
    ["m^(0/5)", "0", "5"],
    ["m^(1e3/1e-3)", "1e3", "1e-3"],
    ["m^(1e300000/1e-300000)", "1e300000", "1e-300000"],
  ] as const) {
    const e = parsed(text);
    assert.equal(e.node.kind, "pow", text);
    if (e.node.kind === "pow") {
      assert.deepEqual(e.node.exponent.num.value, fromRational(dec(num)), text);
      assert.deepEqual(
        e.node.exponent.den?.value ?? ONE,
        fromRational(dec(den)),
        text,
      );
    }
  }
  const one = parsed("m^2");
  assert.ok(one.node.kind === "pow" && one.node.exponent.den === undefined);
});

test("a ^ exponent of two literals at the hard bound parses in milliseconds (#66)", () => {
  // Two pseudo-random literals of 314,000 digits, the most the hard bound
  // takes: the parse forms each within the bound and pairs them with no
  // gcd, where a reduction here took about three and a half minutes,
  // extrapolated. The budget is generous for a slow machine; a gcd would
  // miss it by two orders.
  const literal = (seed: number) => {
    let text = "";
    while (text.length < 314_000) {
      text += randomBigInt(key(seed + text.length), 3000).toString();
    }
    return text.slice(0, 314_000).replace(/^0+/, "1");
  };
  const a = literal(1);
  const b = literal(2);
  const start = performance.now();
  const e = parsed(`2^(${a}/${b})`);
  const ms = performance.now() - start;
  assert.ok(ms < 2000, `parsed in ${ms.toFixed(0)} ms`);
  assert.ok(e.node.kind === "pow");
  if (e.node.kind === "pow") {
    assert.ok(bitLength(e.node.exponent.num.value.significand.num) > 1_000_000);
    assert.ok(
      bitLength(e.node.exponent.den!.value.significand.num) > 1_000_000,
    );
  }
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
    rejected({ start: 3, end: 6 }, { kind: "exponentDividesByZero" }),
  );
  assert.deepEqual(
    failed("m^( 3 / 0.0 )"),
    rejected({ start: 4, end: 12 }, { kind: "exponentDividesByZero" }),
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

test("a number has no sign: -2 is the negation of 2", () => {
  const e = parsed("-2");
  assert.equal(e.node.kind, "neg");
  assert.deepEqual(e.node.operand, {
    span: { start: 1, end: 2 },
    node: { kind: "number", value: fromRational(rational(2n)), text: "2" },
  });
  assertParses("(-2) m", "(-2 * m)");
  // So `2 -3 m` is a difference, not a number beside a negative one.
  assertParses("2 -3 m", "(2 - (3 * m))");
});

test("an e that does not start an exponent is a unit name", () => {
  assertParses("3e", "(3 * e)");
  assertParses("3em", "(3 * em)");
  assertParses("3e m", "((3 * e) * m)");
});

test("a number too large to represent is rejected with its span", () => {
  // A literal's exponent is kept as the number it is (stage 4's 4.3), so
  // `1e999999` parses; what is rejected is a significand beyond the hard
  // bound, an exponent beyond the exponent bound, with the side it passes,
  // and a `^` exponent whose power of ten cannot be formed within the hard
  // bound. The reasons are data; messages.ts words them.
  assertParses("m / 1e999999 s", "(m / (1e999999 * s))");
  const long = "9".repeat(320000);
  assert.deepEqual(
    failed(`m / ${long} s`),
    rejected({ start: 4, end: 4 + long.length }, { kind: "numberTooLarge" }),
  );
  assert.deepEqual(
    failed("m / 1e1000000000000000001 s"),
    rejected({ start: 4, end: 25 }, { kind: "numberOverflow" }),
  );
  assert.deepEqual(
    failed("m / 0.01e-999999999999999999 s"),
    rejected({ start: 4, end: 28 }, { kind: "numberUnderflow" }),
  );
  assert.deepEqual(
    failed("m^1e999999"),
    rejected({ start: 2, end: 10 }, { kind: "exponentTooLarge" }),
  );
  assert.deepEqual(
    failed("m^(1/1e999999)"),
    rejected({ start: 5, end: 13 }, { kind: "exponentTooLarge" }),
  );
  assertParses("m^1e5", "m^100000");
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

test("a negation spans from its - to the end of its operand", () => {
  const e = parsed(" - 2 m / s");
  assert.equal(e.node.kind, "binary");
  const neg = e.node.left;
  assert.deepEqual(neg.span, { start: 1, end: 6 });
  assert.equal(neg.node.kind, "neg");
  assert.deepEqual(neg.node.operand.span, { start: 3, end: 6 });
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

// ---------------------------------------------------------------------------
// Calls

test("a name directly followed by ( is a call", () => {
  assertParses("tempC(100)", "tempC(100)");
  assertParses("tempC(20 + 5)", "tempC((20 + 5))");
  assertParses("tempC( 100 )", "tempC(100)");
  assertParses("kg(m/s)", "kg((m / s))");
  assertParses("f(g(x))", "f(g(x))");
});

test("a call takes any number of arguments, separated by commas", () => {
  assertParses("pi()", "pi()");
  assertParses("pi( )", "pi()");
  assertParses("f(1)", "f(1)");
  assertParses("f(1, 2 m)", "f(1, (2 * m))");
  assertParses("f(1,2,3)", "f(1, 2, 3)");
  assertParses(
    "atan2(3 m, 4 m) / f(g(1, 2), 3)",
    "(atan2((3 * m), (4 * m)) / f(g(1, 2), 3))",
  );
  // Each argument is a whole expression: the comma binds looser than any operator.
  assertParses("f(1 + 2, 3 * 4)", "f((1 + 2), (3 * 4))");
});

test("a call is an atom: it may be juxtaposed, raised and negated", () => {
  assertParses("2 tempC(100)", "(2 * tempC(100))");
  assertParses("tempC(100) K", "(tempC(100) * K)");
  assertParses("tempC(100)^2", "tempC(100)^2");
  assertParses("-tempC(100)", "-tempC(100)");
  assertParses("tempC(100) - tempC(0)", "(tempC(100) - tempC(0))");
  assertParses("K / tempC(100)", "(K / tempC(100))");
});

test("a space before ( makes a product, not a call", () => {
  assertParses("kg (m/s)", "(kg * (m / s))");
  assertParses("kg(m/s)^2", "kg((m / s))^2");
  assertParses("kg (m/s)^2", "(kg * (m / s)^2)");
  // Only a name can be called; a number before a parenthesis is a product.
  assertParses("2(3)", "(2 * 3)");
});

test("a call spans the name to the closing parenthesis, and keeps the name's span", () => {
  const { node, span } = parsed(" 2 tempC( 100 ) ");
  assert.equal(span.end, 15);
  assert.ok(node.kind === "binary");
  assert.deepEqual(node.right.span, { start: 3, end: 15 });
  assert.ok(node.right.node.kind === "call");
  assert.equal(node.right.node.name, "tempC");
  assert.deepEqual(node.right.node.nameSpan, { start: 3, end: 8 });
  assert.deepEqual(
    node.right.node.arguments.map((e) => e.span),
    [{ start: 10, end: 13 }],
  );
  const two = parsed("f( 1 , 2 m )");
  assert.ok(two.node.kind === "call");
  assert.deepEqual(
    two.node.arguments.map((e) => e.span),
    [
      { start: 3, end: 4 },
      { start: 7, end: 10 },
    ],
  );
});

test("a call needs a closing parenthesis, and a comma needs an argument after it", () => {
  assert.deepEqual(failed("tempC("), unexpected(6, ...OPERAND, '")"'));
  assert.deepEqual(failed("f(1,)"), unexpected(4, ...OPERAND));
  assert.deepEqual(failed("f(,1)"), unexpected(2, ...OPERAND, '")"'));
  assert.deepEqual(
    failed("f(1 2)"),
    unexpected(4, ...AFTER_FACTOR, '","', '")"'),
  );
  assert.deepEqual(
    failed("tempC(100"),
    unexpected(9, ...AFTER_FACTOR, '","', '")"'),
  );
  // A comma is not part of an expression outside a call.
  assert.deepEqual(
    failed("1, 2"),
    unexpected(1, ...AFTER_FACTOR, "end of input"),
  );
  // A name not followed by ( expects nothing of a call: the errors are as
  // they were before calls existed.
  assert.deepEqual(
    failed("m)"),
    unexpected(1, ...AFTER_FACTOR, "end of input"),
  );
});

test("a nested call with an error in it parses in time linear in its depth, with the same error", () => {
  // A call whose argument list fails was read again as a name before a
  // parenthesized factor, so each level doubled the cost (issue #54);
  // twenty levels took minutes. The error, its position and its
  // expectations are what they were.
  const inner = [...AFTER_FACTOR, '","', '")"'];
  const start = performance.now();
  assert.deepEqual(
    failed("f(".repeat(20) + "1"),
    unexpected(41, ...inner),
    "unclosed",
  );
  assert.deepEqual(
    failed("f(".repeat(20) + "1 +" + ")".repeat(20)),
    unexpected(43, ...OPERAND),
    "an error inside",
  );
  assert.deepEqual(
    failed("sin(asin(".repeat(10) + "0.5"),
    unexpected(93, ...inner),
    "sin(asin(",
  );
  assert.equal(
    show(parsed("f(".repeat(20) + "1" + ")".repeat(20))),
    "f(".repeat(20) + "1" + ")".repeat(20),
  );
  assert.ok(performance.now() - start < 50, "within 50 ms");
  // A name followed by `(` is only a call: the smaller errors keep their
  // expectations too, and a name in front of a space and a `(` is a
  // product as before.
  assert.deepEqual(failed("f(1, 2"), unexpected(6, ...inner));
  assert.deepEqual(failed("f((1)"), unexpected(5, ...inner));
  assert.deepEqual(failed("m2("), unexpected(3, ...OPERAND, '")"'));
  assert.equal(show(parsed("kg (m/s)")), "(kg * (m / s))");
  assert.equal(show(parsed("kg(m/s)")), "kg((m / s))");
});

// ---------------------------------------------------------------------------
// Unit lists

/** The items of the unit list `text`, each rendered by `show`. */
function items(text: string): string[] {
  const result = parseUnitList(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value.map(show);
}

function listFailed(text: string): ParseError<Rejection> {
  const result = parseUnitList(text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

test("a unit list is expressions separated by semicolons", () => {
  assert.deepEqual(items("ft;in"), ["ft", "in"]);
  assert.deepEqual(items("hr ; min ; s"), ["hr", "min", "s"]);
  assert.deepEqual(items("hr/mi;min/mi;s/mi"), [
    "(hr / mi)",
    "(min / mi)",
    "(s / mi)",
  ]);
  assert.deepEqual(items("ft;in/8"), ["ft", "(in / 8)"]);
});

test("an expression alone is a list of one", () => {
  assert.deepEqual(items("ft"), ["ft"]);
  assert.deepEqual(items(" 3 ft + 1 in "), ["((3 * ft) + (1 * in))"]);
});

test("a semicolon binds looser than anything and cannot be parenthesized", () => {
  assert.deepEqual(items("1 ft + 1 in;2 in"), [
    "((1 * ft) + (1 * in))",
    "(2 * in)",
  ]);
  assert.deepEqual(
    listFailed("(ft;in)"),
    unexpected(3, '"^"', ...AFTER_POWER, '")"'),
  );
});

test("each item's span is its own place in the text", () => {
  const result = parseUnitList("ft; 2 in ");
  assert.ok(result.ok);
  assert.deepEqual(
    result.value.map((e) => e.span),
    [
      { start: 0, end: 2 },
      { start: 4, end: 8 },
    ],
  );
});

test("a list may not be empty or have an empty item", () => {
  assert.deepEqual(listFailed(""), unexpected(0, ...OPERAND));
  assert.deepEqual(listFailed("ft;"), unexpected(3, ...OPERAND));
  assert.deepEqual(listFailed("ft;;in"), unexpected(3, ...OPERAND));
  assert.deepEqual(listFailed(";in"), unexpected(0, ...OPERAND));
});

test("a semicolon is not part of an expression", () => {
  assert.deepEqual(
    failed("ft;in"),
    unexpected(2, '"^"', ...AFTER_POWER, "end of input"),
  );
});
