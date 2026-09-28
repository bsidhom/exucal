import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { parseDefinitions, type Definition } from "./definitions.ts";
import { parseExpr, type Expr } from "./expr.ts";
import type { ParseError } from "./parser.ts";
import type { Span } from "./span.ts";

function parsed(text: string): readonly Definition[] {
  const result = parseDefinitions(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function failed(text: string): ParseError {
  const result = parseDefinitions(text);
  assert.ok(!result.ok, `expected failure, got ${inspect(result)}`);
  return result.error;
}

/** The error for nothing acceptable at `pos`. */
function unexpected(pos: number, ...expected: string[]): ParseError {
  return { kind: "unexpected", pos, expected };
}

/**
 * The expression `text` parses to, with every span shifted by `offset` to
 * where it sits in a larger text.
 */
function exprAt(text: string, offset: number): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return shift(result.value, offset);
}

function shift(e: Expr, offset: number): Expr {
  const span = { start: e.span.start + offset, end: e.span.end + offset };
  const { node } = e;
  switch (node.kind) {
    case "number":
    case "unit":
      return { span, node };
    case "binary":
      return {
        span,
        node: {
          ...node,
          left: shift(node.left, offset),
          right: shift(node.right, offset),
        },
      };
    case "pow":
      return { span, node: { ...node, base: shift(node.base, offset) } };
    case "neg":
      return {
        span,
        node: { kind: "neg", operand: shift(node.operand, offset) },
      };
    case "call":
      return {
        span,
        node: {
          ...node,
          nameSpan: {
            start: node.nameSpan.start + offset,
            end: node.nameSpan.end + offset,
          },
          arguments: node.arguments.map((e) => shift(e, offset)),
        },
      };
  }
}

/** The span of `text`'s first occurrence in `whole`. */
function spanOf(whole: string, text: string): Span {
  const start = whole.indexOf(text);
  assert.notEqual(start, -1, `${JSON.stringify(text)} not found`);
  return { start, end: start + text.length };
}

/** What can start a definition body. */
const BODY = ['"!"', "a number", "a unit name", '"("', '"-"'];
/** What can start an item of a unit list. */
const ITEM = ["a number", "a unit name", '"("', '"-"'];
/** What can follow a complete expression, short of whatever ends it. */
const AFTER_EXPR = ['"^"', "a unit name", '"("', '"*"', '"/"', '"+"', '"-"'];
/** What can end a line. */
const END_OF_LINE = ["a comment", "a newline", "end of input"];

// ---------------------------------------------------------------------------
// The forms

test("the example file from the architecture parses", () => {
  const text = [
    "m         !                 # dimension primitive",
    "radian    !kind             # kind primitive (dimensionless)",
    "kilo-     1000              # prefix (trailing dash)",
    "inch      2.54 cm           # unit, defined by an expression",
    "newton    kg m / s^2",
    "hertz     1 / s",
    "",
  ].join("\n");
  assert.deepEqual(parsed(text), [
    {
      kind: "primitive",
      name: "m",
      role: "dimension",
      span: spanOf(text, "m         !"),
    },
    {
      kind: "primitive",
      name: "radian",
      role: "kind",
      span: spanOf(text, "radian    !kind"),
    },
    {
      kind: "prefix",
      name: "kilo",
      body: exprAt("1000", text.indexOf("1000")),
      span: spanOf(text, "kilo-     1000"),
    },
    {
      kind: "unit",
      name: "inch",
      body: exprAt("2.54 cm", text.indexOf("2.54 cm")),
      span: spanOf(text, "inch      2.54 cm"),
    },
    {
      kind: "unit",
      name: "newton",
      body: exprAt("kg m / s^2", text.indexOf("kg m / s^2")),
      span: spanOf(text, "newton    kg m / s^2"),
    },
    {
      kind: "unit",
      name: "hertz",
      body: exprAt("1 / s", text.indexOf("1 / s")),
      span: spanOf(text, "hertz     1 / s"),
    },
  ]);
});

test("a body may be any expression", () => {
  const text = "G  6.674e-11 m^3 / kg s^2";
  assert.deepEqual(parsed(text), [
    {
      kind: "unit",
      name: "G",
      body: exprAt("6.674e-11 m^3 / kg s^2", 3),
      span: { start: 0, end: text.length },
    },
  ]);
});

test("a dash after a space starts the body, not a prefix", () => {
  // `m- 1000` is the prefix `m`; `m -1000` is the unit `m` with a negated
  // body, since the dash of a prefix follows its name with no space.
  const text = "m -1000";
  assert.deepEqual(parsed(text), [
    {
      kind: "unit",
      name: "m",
      body: exprAt("-1000", 2),
      span: { start: 0, end: text.length },
    },
  ]);
});

test("a prefix is a name with a trailing dash, stored without it", () => {
  const [prefix] = parsed("kilo- 1000");
  assert.equal(prefix?.kind, "prefix");
  assert.equal(prefix.name, "kilo");
  assert.equal(prefix.body.node.kind, "number");
});

test("a prefix cannot be primitive", () => {
  assert.deepEqual(
    failed("kilo- !"),
    unexpected(6, "a number", "a unit name", '"("', '"-"'),
  );
});

test("! makes a dimension primitive and !kind a kind primitive", () => {
  assert.deepEqual(
    parsed("m !\nradian !kind").map((d) => d.kind === "primitive" && d.role),
    ["dimension", "kind"],
  );
  assert.deepEqual(failed("m !foo"), unexpected(3, '"kind"', ...END_OF_LINE));
  assert.deepEqual(failed("m ! kind"), unexpected(4, ...END_OF_LINE));
  assert.deepEqual(failed("m !kinds"), unexpected(7, ...END_OF_LINE));
});

test("a unit and a prefix may share a name", () => {
  assert.deepEqual(
    parsed("m !\nm- 0.001").map((d) => [d.kind, d.name]),
    [
      ["primitive", "m"],
      ["prefix", "m"],
    ],
  );
});

test("names are any unit name, so they may end in a digit or be non-ASCII", () => {
  assert.deepEqual(
    parsed("mu0 1\nµ- 1e-6\nΩ 1 V/A\n_ 1").map((d) => d.name),
    ["mu0", "µ", "Ω", "_"],
  );
});

test("definitions come back in the order written, duplicates included", () => {
  assert.deepEqual(
    parsed("a 1\nb 2\na 3").map((d) => d.name),
    ["a", "b", "a"],
  );
});

// ---------------------------------------------------------------------------
// Lines, whitespace and comments

test("an empty file has no definitions", () => {
  assert.deepEqual(parsed(""), []);
  assert.deepEqual(parsed("\n\n"), []);
  assert.deepEqual(parsed("  \t \n\t\n"), []);
});

test("blank lines and comment lines are skipped", () => {
  const text = "# a comment\n\nm !\n   # indented comment\n\n\ninch 2.54 cm\n";
  assert.deepEqual(
    parsed(text).map((d) => d.name),
    ["m", "inch"],
  );
});

test("a comment may follow a definition, with or without space", () => {
  assert.deepEqual(
    parsed("m !# one\nkilo- 1000#two\ninch 2.54 cm  # three").map(
      (d) => d.name,
    ),
    ["m", "kilo", "inch"],
  );
});

test("a comment ends at the newline, so the next line is read", () => {
  assert.deepEqual(
    parsed("m ! # a comment ending in ^\ns !").map((d) => d.name),
    ["m", "s"],
  );
});

test("a definition may be indented, and the last line needs no newline", () => {
  assert.deepEqual(
    parsed("  m !\n\tinch 2.54 cm").map((d) => d.name),
    ["m", "inch"],
  );
});

test("Windows line endings are accepted", () => {
  const text = "m !\r\ninch 2.54 cm # comment\r\n";
  assert.deepEqual(
    parsed(text).map((d) => d.name),
    ["m", "inch"],
  );
});

test("the whitespace between name and body is required", () => {
  assert.deepEqual(failed("inch2.54 cm"), unexpected(5, "a space"));
  assert.deepEqual(failed("m!"), unexpected(1, "a space"));
  assert.deepEqual(failed("kilo-1000"), unexpected(5, "a space"));
});

test("a name alone is not a definition", () => {
  assert.deepEqual(failed("inch"), unexpected(4, "a space"));
  assert.deepEqual(failed("inch  "), unexpected(6, ...BODY));
  assert.deepEqual(failed("inch # comment"), unexpected(5, ...BODY));
});

test("a body cannot continue onto the next line", () => {
  assert.deepEqual(
    failed("inch 2.54\ncm"),
    unexpected(12, "a space"), // the second line is `cm` with no body
  );
});

test("a line must start with a name or a comment", () => {
  assert.deepEqual(
    failed("2.54 cm inch"),
    unexpected(0, "a name", ...END_OF_LINE),
  );
  assert.deepEqual(failed("m !\n)"), unexpected(4, "a name", ...END_OF_LINE));
});

test("what follows a body must be a comment or the end of the line", () => {
  // The expression could also have continued, or a list, so the error
  // lists those too.
  assert.deepEqual(
    failed("m 2 )"),
    unexpected(4, ...AFTER_EXPR, '";"', ...END_OF_LINE),
  );
  // A prefix body is an expression alone, never a list.
  assert.deepEqual(
    failed("k- 2 )"),
    unexpected(5, ...AFTER_EXPR, ...END_OF_LINE),
  );
});

// ---------------------------------------------------------------------------
// Positions

test("errors carry offsets into the whole text", () => {
  const text = "m !\ninch 2.54 cm\nnewton kg m / s^\n";
  assert.deepEqual(failed(text), unexpected(33, "a number", '"("'));
  assert.equal(text.slice(0, 33), "m !\ninch 2.54 cm\nnewton kg m / s^");
});

test("a rejected literal in a body carries its span in the whole text", () => {
  const text = "m !\nbig 1e999999 m";
  assert.deepEqual(failed(text), {
    kind: "rejected",
    span: spanOf(text, "1e999999"),
    reason: "this number is too large to represent",
  });
});

test("a definition's span excludes the indentation, comment and line ending", () => {
  const text = "  m   !   # c\r\n\tinch 2.54 cm   \n";
  assert.deepEqual(
    parsed(text).map((d) => d.span),
    [spanOf(text, "m   !"), spanOf(text, "inch 2.54 cm")],
  );
});

// ---------------------------------------------------------------------------
// Unit lists

test("a body of two or more items is a unit list, with each item's text", () => {
  const text = "time   hr;min;s   # a list";
  assert.deepEqual(parsed(text), [
    {
      kind: "unitList",
      name: "time",
      items: [
        { expr: exprAt("hr", 7), text: "hr" },
        { expr: exprAt("min", 10), text: "min" },
        { expr: exprAt("s", 14), text: "s" },
      ],
      span: spanOf(text, "time   hr;min;s"),
    },
  ]);
});

test("an item is any expression, and its text is as written, without the space around it", () => {
  const text = "pace  hr / mi ; min/mi ;s/mi";
  const [definition] = parsed(text);
  assert.ok(definition?.kind === "unitList");
  assert.deepEqual(
    definition.items.map((item) => item.text),
    ["hr / mi", "min/mi", "s/mi"],
  );
  assert.deepEqual(definition.items[1].expr, exprAt("min/mi", 16));
  assert.deepEqual(definition.span, { start: 0, end: text.length });
});

test("a list of one item is a unit", () => {
  assert.deepEqual(parsed("ft  12 in"), [
    {
      kind: "unit",
      name: "ft",
      body: exprAt("12 in", 4),
      span: { start: 0, end: 9 },
    },
  ]);
});

test("a prefix cannot be a list", () => {
  assert.deepEqual(
    failed("k-  1000;100"),
    unexpected(8, ...AFTER_EXPR, ...END_OF_LINE),
  );
});

test("a list may not end in a semicolon or have an empty item", () => {
  assert.deepEqual(failed("time  hr;min;"), unexpected(13, ...ITEM));
  assert.deepEqual(failed("time  hr;;s"), unexpected(9, ...ITEM));
});

// ---------------------------------------------------------------------------
// Functions

test("a name with a parameter defines a function: its declared units, then its two bodies", () => {
  const text =
    "tempC(x)  [1;K]  x K + 273.15 K ; tempC / K - 273.15   # a reading";
  assert.deepEqual(parsed(text), [
    {
      kind: "function",
      name: "tempC",
      parameter: "x",
      argument: { expr: exprAt("1", text.indexOf("1;")), text: "1" },
      result: { expr: exprAt("K", text.indexOf("K]")), text: "K" },
      forward: exprAt("x K + 273.15 K", text.indexOf("x K")),
      inverse: exprAt("tempC / K - 273.15", text.indexOf("tempC /")),
      span: spanOf(
        text,
        "tempC(x)  [1;K]  x K + 273.15 K ; tempC / K - 273.15",
      ),
    },
  ]);
});

test("the declared units are any expressions, kept with their text as written", () => {
  const text = "f(v)  [ m / s ; 2 K ]v K;f";
  const [definition] = parsed(text);
  assert.ok(definition?.kind === "function");
  assert.equal(definition.argument.text, "m / s");
  assert.deepEqual(definition.argument.expr, exprAt("m / s", 8));
  assert.equal(definition.result.text, "2 K");
  assert.deepEqual(definition.forward, exprAt("v K", 21));
  assert.deepEqual(definition.inverse, exprAt("f", 25));
  assert.deepEqual(definition.span, { start: 0, end: text.length });
});

test("a body may contain a call, with its spans in the whole text", () => {
  const text = "boiling  tempC(100)";
  assert.deepEqual(parsed(text), [
    {
      kind: "unit",
      name: "boiling",
      body: exprAt("tempC(100)", 9),
      span: { start: 0, end: text.length },
    },
  ]);
});

test("the parameter follows the name with no space, as a prefix's dash does", () => {
  // `tempC (x) K` is the unit `tempC` with a body that starts with `(x)`.
  const text = "tempC (x) K";
  assert.deepEqual(parsed(text), [
    {
      kind: "unit",
      name: "tempC",
      body: exprAt("(x) K", 6),
      span: { start: 0, end: text.length },
    },
  ]);
});

test("a function needs its declaration and both bodies", () => {
  assert.deepEqual(failed("tempC(x)"), unexpected(8, "a space"));
  assert.deepEqual(failed("tempC(x)  x K"), unexpected(10, '"["'));
  assert.deepEqual(
    failed("tempC(x)  [1]  x K ; tempC"),
    unexpected(12, ...AFTER_EXPR, '";"'),
  );
  assert.deepEqual(
    failed("tempC(x)  [1;K]  x K"),
    unexpected(20, ...AFTER_EXPR, '";"'),
  );
  assert.deepEqual(
    failed("tempC(x)  [1;K]  x K ; tempC ; 2"),
    unexpected(29, ...AFTER_EXPR, ...END_OF_LINE),
  );
});

test("a parameter is a name", () => {
  assert.deepEqual(failed("f(2)  [1;1]  2 ; f"), unexpected(1, "a space"));
  assert.deepEqual(failed("f()  [1;1]  2 ; f"), unexpected(1, "a space"));
  assert.deepEqual(failed("f( x )  [1;1]  2 ; f"), unexpected(1, "a space"));
});
