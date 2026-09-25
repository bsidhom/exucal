// The messages the UI shows for the errors the core returns. The core locates
// every failure (a span into the text, a dimension, a name) but says nothing
// in words; this module turns each error into one sentence, quoting the text
// at fault so that the user can see what is meant without a highlight. It is
// pure and DOM-free, so that the wording is tested beside the core.
//
// The texts are quoted as the user typed them, trimmed of surrounding
// blanks; the spans the core reports are offsets into the untrimmed text, so
// slicing uses the text as given.

import { formatDimension, type Primitives } from "./core/dimension.ts";
import { type ConversionError, type TextError } from "./core/pipeline.ts";
import { type Span } from "./core/span.ts";

/**
 * Why `text` denotes no quantity, as one sentence: what was expected where
 * the parser stopped, or which part of the text the evaluator rejected.
 */
export function describeTextError(error: TextError, text: string): string {
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
      );
    case "dimensionMismatch":
      return (
        `${quote(have.trim())} has dimension ${formatDimension(error.have, primitives)}, ` +
        `but ${quote(want.trim())} has dimension ${formatDimension(error.want, primitives)}.`
      );
    case "kindMismatch":
      return (
        `${quote(have.trim())} (${formatDimension(error.have, primitives)}) and ` +
        `${quote(want.trim())} (${formatDimension(error.want, primitives)}) ` +
        `differ in kind: ${error.kinds.join(", ")}.`
      );
    case "zeroWant":
      return `${quote(want.trim())} is zero, so nothing is a multiple of it.`;
  }
}

// ---------------------------------------------------------------------------
// Helpers

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
