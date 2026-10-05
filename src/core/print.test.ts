import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { parseExpr, type Expr, type ExprNode } from "./expr.ts";
import { leadsWithNumber, print, text } from "./print.ts";
import { randomExpr } from "../testing/expr.ts";
import { key } from "../testing/random.ts";

function parsed(source: string): Expr {
  const result = parseExpr(source);
  assert.ok(result.ok, `expected ${source} to parse, got ${inspect(result)}`);
  return result.value;
}

/** `source` printed back, canonically. */
function printed(source: string): string {
  return text(print(parsed(source)));
}

/** The tree without its spans, for comparing what was read. */
function shape(expr: Expr): unknown {
  const { node } = expr;
  switch (node.kind) {
    case "number":
      return { kind: "number", text: node.text, value: node.value };
    case "unit":
      return node;
    case "binary":
      return {
        kind: "binary",
        op: node.op,
        left: shape(node.left),
        right: shape(node.right),
      };
    case "neg":
      return { kind: "neg", operand: shape(node.operand) };
    case "pow":
      return { kind: "pow", base: shape(node.base), exponent: node.exponent };
    case "call":
      return {
        kind: "call",
        name: node.name,
        arguments: node.arguments.map(shape),
      };
  }
}

test("the text is canonical: one space between factors and around operators, the fewest parentheses", () => {
  assert.equal(printed("2m"), "2 m");
  assert.equal(printed("kg   m/s^2"), "kg m / s^2");
  assert.equal(printed("2*3"), "2 * 3");
  assert.equal(printed("(ft)"), "ft");
  assert.equal(printed("((ft + in))"), "ft + in");
  assert.equal(printed("-(2 m)"), "-2 m");
  assert.equal(printed("2 -3 m"), "2 - 3 m");
  assert.equal(printed("1/2 m"), "1 / 2 m");
  assert.equal(printed("f( a ,b )"), "f(a, b)");
  assert.equal(printed("pi()"), "pi()");
  assert.equal(printed("1e3 m"), "1e3 m");
  assert.equal(printed(".5 M"), ".5 M");
});

test("parentheses are kept where the tree needs them, and nowhere else", () => {
  assert.equal(printed("(a + b) c"), "(a + b) c");
  assert.equal(printed("a (b c)"), "a (b c)");
  assert.equal(printed("a b c"), "a b c");
  assert.equal(printed("a / (b / c)"), "a / (b / c)");
  assert.equal(printed("a / b / c"), "a / b / c");
  assert.equal(printed("a - (b + c)"), "a - (b + c)");
  assert.equal(printed("a - b + c"), "a - b + c");
  assert.equal(printed("(m^2)^3"), "(m^2)^3");
  assert.equal(printed("(2 m)^2"), "(2 m)^2");
  assert.equal(printed("2 * -3 m"), "2 * -3 m");
  assert.equal(printed("-(-m)"), "-(-m)");
  assert.equal(printed("-(a + b)"), "-(a + b)");
  assert.equal(printed("-(2 * 3)"), "-(2 * 3)");
  assert.equal(printed("2 (m / s)"), "2 (m / s)");
  assert.equal(printed("(2 m) s"), "2 m s");
});

test("an exponent is written as its literals: alone, or over a denominator in parentheses", () => {
  assert.equal(printed("m^(2)"), "m^2");
  assert.equal(printed("m^(1/2)"), "m^(1/2)");
  assert.equal(printed("m^-1"), "m^-1");
  assert.equal(printed("m^(-3/2)"), "m^(-3/2)");
  assert.equal(printed("m^+2"), "m^+2");
  assert.equal(printed("m^0.5 s"), "m^0.5 s");
});

test("the screen's glyph for a product is ×, and only for a product written with *", () => {
  assert.equal(text(print(parsed("2 * 3 m"), "×")), "2 × 3 m");
  assert.equal(text(print(parsed("2 m * 3"), "×")), "2 m × 3");
  assert.equal(text(print(parsed("2 m / s"), "×")), "2 m / s");
});

test("a number that would follow a factor by juxtaposition is parenthesized, so the tree reads back", () => {
  // The parser never builds this tree, since a number may only start a
  // product; the output may, composing a value before a want.
  const juxtaposed: Expr = {
    span: { start: 0, end: 0 },
    node: {
      kind: "binary",
      op: "juxtapose",
      left: parsed("2"),
      right: parsed("3 m"),
    },
  };
  assert.equal(text(print(juxtaposed)), "2 (3 m)");
  assert.deepEqual(shape(parsed("2 (3 m)")), shape(juxtaposed));
  assert.ok(leadsWithNumber(parsed("3 m")));
  assert.ok(leadsWithNumber(parsed("3^2 m")));
  assert.ok(leadsWithNumber(parsed("2 * m")));
  assert.ok(!leadsWithNumber(parsed("-3 m")));
  assert.ok(leadsWithNumber(parsed("(3 m)")));
  assert.ok(!leadsWithNumber(parsed("f(3)")));
  assert.ok(!leadsWithNumber(parsed("m")));
});

test("the pieces say what each is, so a result's numbers can be styled apart", () => {
  assert.deepEqual(print(parsed("2.5 m^2 / f(3)")), [
    { kind: "number", text: "2.5" },
    { kind: "symbol", text: " " },
    { kind: "name", text: "m" },
    { kind: "symbol", text: "^" },
    { kind: "exponent", text: "2" },
    { kind: "symbol", text: " / " },
    { kind: "name", text: "f" },
    { kind: "symbol", text: "(" },
    { kind: "number", text: "3" },
    { kind: "symbol", text: ")" },
  ]);
});

test("every tree printed and parsed again is the same tree", () => {
  for (let seed = 0; seed < 400; seed++) {
    const expr = randomExpr(key(seed), 4);
    const source = text(print(expr));
    const back = parseExpr(source);
    assert.ok(
      back.ok,
      `seed ${seed}: ${source} does not parse: ${inspect(back)}`,
    );
    assert.deepEqual(
      shape(back.value),
      shape(expr),
      `seed ${seed}: ${source} reads back as another tree`,
    );
    // And printing what was read gives the same text: the text is canonical.
    assert.equal(text(print(back.value)), source, `seed ${seed}`);
  }
});

test("every node kind is written", () => {
  const kinds: ExprNode["kind"][] = [
    "number",
    "unit",
    "binary",
    "neg",
    "pow",
    "call",
  ];
  for (const kind of kinds) {
    const sample = {
      number: "2",
      unit: "m",
      binary: "a b",
      neg: "-m",
      pow: "m^2",
      call: "f()",
    }[kind];
    assert.equal(parsed(sample).node.kind, kind);
    assert.equal(printed(sample), sample);
  }
});
