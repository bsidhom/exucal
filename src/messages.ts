// The messages the UI shows for the errors the core returns. The core locates
// every failure (a span into the text, a dimension, a name) but says nothing
// in words; this module turns each error into one sentence, quoting the text
// at fault so that the user can see what is meant without a highlight. It is
// pure and DOM-free, so that the wording is tested beside the core.
//
// The texts are quoted as the user typed them, trimmed of surrounding
// blanks; the spans the core reports are offsets into the untrimmed text, so
// slicing uses the text as given.

import {
  formatDimension,
  type ConformanceError,
  type Primitives,
} from "./core/dimension.ts";
import { type ConversionError, type TextError } from "./core/pipeline.ts";
import { type Span } from "./core/span.ts";

/**
 * Why `text` denotes no quantity, as one sentence: what was expected where
 * the parser stopped, or which part of the text the evaluator rejected. A
 * sum whose operands do not conform is described as a conversion between
 * them would be, with both dimensions, which `primitives` formats.
 */
export function describeTextError(
  error: TextError,
  text: string,
  primitives: Primitives,
): string {
  switch (error.kind) {
    case "unexpected": {
      const expected = list(error.expected);
      return error.pos >= text.length
        ? `Unexpected end of input: expected ${expected}.`
        : `Unexpected ${quote(characterAt(text, error.pos))}: expected ${expected}.`;
    }
    case "rejected":
      return `${quote(slice(text, error.span))}: ${error.reason}.`;
    case "unknownUnit":
      return `Unknown unit ${quote(error.name)}.`;
    case "divisionByZero":
      return `Division by zero in ${quote(slice(text, error.span))}.`;
    case "negativeRadicand":
      return `${quote(slice(text, error.span))} takes an even root of a negative value.`;
    case "tooLarge":
      return `${quote(slice(text, error.span))} is too large to compute.`;
    case "nonconformingOperands": {
      const left = quote(slice(text, error.left));
      const right = quote(slice(text, error.right));
      const operation =
        error.op === "add"
          ? `Cannot add ${left} and ${right}`
          : `Cannot subtract ${right} from ${left}`;
      return `${operation}: ${describeMismatch(error.mismatch, left, right, primitives)}.`;
    }
  }
}

/**
 * Why `have` does not convert to `want`, as one sentence. An error in one of
 * the texts is described as `describeTextError` does; a conformance error
 * shows both dimensions, in the expression language, so that the user can
 * see what each side is a quantity of.
 */
export function describeConversionError(
  error: ConversionError,
  have: string,
  want: string,
  primitives: Primitives,
): string {
  switch (error.kind) {
    case "inputError":
      return describeTextError(
        error.error,
        error.side === "have" ? have : want,
        primitives,
      );
    case "dimensionMismatch":
    case "kindMismatch":
      return `${describeMismatch(error, quote(have.trim()), quote(want.trim()), primitives)}.`;
    case "zeroWant":
      return `${quote(want.trim())} is zero, so nothing is a multiple of it.`;
  }
}

// ---------------------------------------------------------------------------
// Helpers

/**
 * How the quoted texts `have` and `want` fail to conform, without the final
 * period: each with its dimension when the dimensions differ, and both with
 * the kinds that differ when only those do.
 */
function describeMismatch(
  error: ConformanceError,
  have: string,
  want: string,
  primitives: Primitives,
): string {
  const haveDimension = formatDimension(error.have, primitives);
  const wantDimension = formatDimension(error.want, primitives);
  switch (error.kind) {
    case "dimensionMismatch":
      return `${have} has dimension ${haveDimension}, but ${want} has dimension ${wantDimension}`;
    case "kindMismatch":
      return `${have} (${haveDimension}) and ${want} (${wantDimension}) differ in kind: ${error.kinds.join(", ")}`;
  }
}

function quote(text: string): string {
  return `"${text}"`;
}

function slice(text: string, span: Span): string {
  return text.slice(span.start, span.end);
}

/** The character (one code point) of `text` at `pos`. */
function characterAt(text: string, pos: number): string {
  return String.fromCodePoint(text.codePointAt(pos)!);
}

/** `a`, `a or b`, `a, b or c`: the alternatives, as the parser labels them. */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}
