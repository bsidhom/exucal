// Writing an expression back as text: the inverse of the parser (expr.ts),
// so that what the app shows and what it copies can be typed back and read
// as the same tree. The text is canonical: one space between juxtaposed
// factors and around the other operators, `^` tight, a call's arguments
// separated by `, `, and the fewest parentheses that read the tree back as
// it is. A literal is written as it was read (`Literal.text`), since its
// value alone does not say how it was spelled, and a quotient of two
// literals, the first perhaps negated, is written tight, as the fraction
// it is (`5000/127`, `-1/3`), where every other operator has a space on
// each side. The printer never changes
// a tree: it neither reorders, reassociates nor simplifies, so a line the
// output composes shows the terms the pipeline chose, in their order.
//
// Where an operand needs parentheses follows from the grammar's levels
// (`LEVELS`, `levelOf`): each position of the grammar reads an operand
// binding at least at some level, the left operand of a left-associative
// operator at the operator's own level and the right one at the next, a
// negation's operand at the product, a power's base at the atom, and an
// operand binding looser than that is parenthesized. One position has a
// rule the levels do not express: a number cannot follow a factor by
// juxtaposition, since a number may only start a product, so a right
// operand of a juxtaposition that leads with a number is parenthesized
// too (`2 (3 m)`), which reads back as the same tree.
//
// The output is a list of pieces rather than a string, each saying what it
// is, so that the converter can style the numbers of a result apart from
// its units; `text` joins them. The product written with `*` is the one
// glyph the two readers differ on: the screen shows `×`, the clipboard
// gets `*`, which parses.

import {
  BINARY,
  LEVELS,
  bindsAtLeast,
  levelOf,
  type Exponent,
  type Expr,
  type ExprNode,
  type Level,
} from "./expr.ts";

/** A piece of the text: a number as written, a unit's name, the literal of an exponent, or a symbol of the grammar with its spacing. */
export type Piece = {
  readonly kind: "number" | "name" | "exponent" | "symbol";
  readonly text: string;
};

/** How a product written with `*` is shown: `*`, which parses, or `×`, for the screen. */
export type Times = "*" | "×";

/** `expr` as pieces of canonical text, with `times` for a product written with `*`. */
export function print(expr: Expr, times: Times = "*"): readonly Piece[] {
  const out: Piece[] = [];
  write(expr, times, out);
  return out;
}

/** The pieces joined. */
export function text(pieces: readonly Piece[]): string {
  return pieces.map((piece) => piece.text).join("");
}

/**
 * Whether `expr`'s text begins with a number: its leftmost leaf is one. A
 * factor so written cannot follow another by juxtaposition.
 */
export function leadsWithNumber(expr: Expr): boolean {
  const { node } = expr;
  switch (node.kind) {
    case "number":
      return true;
    case "binary":
      return leadsWithNumber(node.left);
    case "pow":
      return leadsWithNumber(node.base);
    case "unit":
    case "neg":
    case "call":
      return false;
  }
}

function write(expr: Expr, times: Times, out: Piece[]): void {
  const { node } = expr;
  switch (node.kind) {
    case "number":
      out.push({ kind: "number", text: node.text });
      return;
    case "unit":
      out.push({ kind: "name", text: node.name });
      return;
    case "binary": {
      const { level, symbol } = BINARY[node.op];
      operand(node.left, level, times, out);
      if (symbol === undefined) {
        out.push(symbolPiece(" "));
        operand(
          node.right,
          tighter(level),
          times,
          out,
          leadsWithNumber(node.right),
        );
      } else {
        const glyph = node.op === "mul" ? times : symbol;
        out.push(symbolPiece(isFraction(node) ? glyph : ` ${glyph} `));
        operand(node.right, tighter(level), times, out);
      }
      return;
    }
    case "neg":
      out.push(symbolPiece("-"));
      operand(node.operand, "product", times, out);
      return;
    case "pow":
      operand(node.base, "atom", times, out);
      out.push(symbolPiece("^"));
      writeExponent(node.exponent, out);
      return;
    case "call":
      out.push({ kind: "name", text: node.name }, symbolPiece("("));
      node.arguments.forEach((argument, i) => {
        if (i > 0) out.push(symbolPiece(", "));
        write(argument, times, out);
      });
      out.push(symbolPiece(")"));
      return;
  }
}

/**
 * Writes `expr` where the grammar reads an operand binding at least at
 * `level`: in parentheses when it binds looser, or when `wrap` says the
 * grammar could not read it there bare.
 */
function operand(
  expr: Expr,
  level: Level,
  times: Times,
  out: Piece[],
  wrap = false,
): void {
  const parenthesized = wrap || !bindsAtLeast(levelOf(expr.node), level);
  if (parenthesized) out.push(symbolPiece("("));
  write(expr, times, out);
  if (parenthesized) out.push(symbolPiece(")"));
}

/** The exponent as the grammar writes it: the literal alone, or the two in parentheses over `/`. */
function writeExponent(exponent: Exponent, out: Piece[]): void {
  const { num, den } = exponent;
  if (den === undefined) {
    out.push({ kind: "exponent", text: num.text });
    return;
  }
  out.push(
    symbolPiece("("),
    { kind: "exponent", text: num.text },
    symbolPiece("/"),
    { kind: "exponent", text: den.text },
    symbolPiece(")"),
  );
}

/** Whether `node` is a fraction: a quotient of two literals, the first perhaps negated, written tight. */
function isFraction(node: Extract<ExprNode, { kind: "binary" }>): boolean {
  const { left, right } = node;
  const numerator =
    left.node.kind === "neg" ? left.node.operand.node : left.node;
  return (
    node.op === "div" &&
    numerator.kind === "number" &&
    right.node.kind === "number"
  );
}

/** The level a right operand must bind at: the next tighter than the operator's, since the operator is left-associative. */
function tighter(level: Level): Level {
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  if (next === undefined)
    throw new Error(`Nothing binds tighter than ${level}`);
  return next;
}

function symbolPiece(text: string): Piece {
  return { kind: "symbol", text };
}
