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
import { type UnitListError } from "./core/convert.ts";
import { type Arity, type EvaluateError } from "./core/evaluate.ts";
import {
  type ConversionError,
  type InverseFailed,
  type TextError,
} from "./core/pipeline.ts";
import { type Span } from "./core/span.ts";

/**
 * Why `text` denotes no quantity, as one sentence: what was expected where
 * the parser stopped, or which part of the text the evaluator rejected. A
 * sum whose operands do not conform is described as a conversion between
 * them would be, with both dimensions, which `primitives` formats, and so
 * is a call whose argument does not conform to what the function takes. A
 * call of a unit shows the product it probably stood for, with the space
 * that makes it one, and a function used as a unit shows the call form; a
 * call with the wrong count of arguments says how many the function takes. A
 * call whose body fails is described by what the body does, since its
 * spans are into the definitions text, which is not the text shown.
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
    case "functionAsUnit":
      return `${quote(error.name)} is a function, not a unit. To apply it to a value, write ${quote(`${error.name}(value)`)}.`;
    case "notAFunction": {
      if (error.otherwise === "nothing") {
        return `Unknown function ${quote(error.name)}.`;
      }
      const argument = text.slice(error.span.end, error.call.end);
      return `${quote(error.name)} is a unit, not a function. For a product, write ${quote(`${error.name} ${argument}`)}, with a space.`;
    }
    case "divisionByZero":
      return `Division by zero in ${quote(slice(text, error.span))}.`;
    case "unresolved":
      return `${quote(slice(text, error.span))} cannot be told from zero at this precision, and the result depends on which side of zero it lies.`;
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
    case "arityMismatch":
      return `${quote(error.name)} takes ${describeArity(error.expected)}, but ${quote(slice(text, error.span))} gives ${count(error.given, "argument")}.`;
    case "argumentMismatch": {
      const name = quote(error.name);
      const argument = quote(slice(text, error.argument));
      return `Cannot apply ${name} to ${argument}: ${describeMismatch(error.mismatch, argument, `the argument of ${name}`, primitives)}.`;
    }
    case "callFailed":
      return `Cannot compute ${quote(slice(text, error.span))}: the definition of ${quote(error.name)} ${describeBody(error.error)}.`;
  }
}

/**
 * Why `have` does not convert to `want`, as one sentence. An error in one of
 * the texts is described as `describeTextError` does; a conformance error
 * shows both dimensions, in the expression language, so that the user can
 * see what each side is a quantity of; an error in a unit list quotes the
 * unit of the list at fault.
 */
export function describeConversionError(
  error: ConversionError,
  have: string,
  want: string,
  primitives: Primitives,
): string {
  switch (error.kind) {
    case "inputError":
      return error.error.kind === "inverseFailed"
        ? describeInverseFailed(error.error, have)
        : describeTextError(
            error.error,
            error.side === "have" ? have : want,
            primitives,
          );
    case "dimensionMismatch":
    case "kindMismatch":
      return `${describeMismatch(error, quote(have.trim()), quote(want.trim()), primitives)}.`;
    case "zeroWant":
      return `${quote(want.trim())} is zero, so nothing is a multiple of it.`;
    case "unresolvedWant":
      return `${quote(want.trim())} cannot be told from zero at this precision, so nothing can be converted into it.`;
    case "unitListError":
      return describeUnitListError(error.error, have, error.units, primitives);
  }
}

/**
 * Why the unit at fault in a list typed as the `want` fails, as one
 * sentence: a mismatch with `have` is worded as a conversion into that
 * unit alone would be, and the two rules a list must follow are stated
 * with the unit that breaks them.
 */
function describeUnitListError(
  error: UnitListError,
  have: string,
  units: readonly string[],
  primitives: Primitives,
): string {
  const unit = quote(units[error.index]!);
  switch (error.kind) {
    case "nonconformingUnit":
      return `${describeMismatch(error.mismatch, quote(have.trim()), unit, primitives)}.`;
    case "nonpositiveUnit":
      return `${unit} is not positive (or cannot be told from zero), and every unit in a list must be.`;
    case "unitOutOfOrder":
      return `${unit} is not smaller than the unit before it; a list runs from the largest unit to the smallest.`;
  }
}

/** Why the want's function has no argument for `have`, as one sentence. */
function describeInverseFailed(error: InverseFailed, have: string): string {
  return `Cannot invert ${quote(error.name)} for ${quote(have.trim())}: the inverse of ${quote(error.name)} ${describeBody(error.error)}.`;
}

/**
 * What the body of a function does that fails, as a predicate of the
 * definition (`divides by zero`), without the text: the body's spans are
 * into the definitions, which the user does not see.
 */
function describeBody(error: EvaluateError): string {
  switch (error.kind) {
    case "divisionByZero":
      return "divides by zero";
    case "unresolved":
      return "depends on a value that cannot be told from zero at this precision";
    case "negativeRadicand":
      return "takes an even root of a negative value";
    case "tooLarge":
      return "computes a value too large to represent";
    case "nonconformingOperands":
      return error.op === "add"
        ? "adds quantities that do not conform"
        : "subtracts quantities that do not conform";
    case "arityMismatch":
      return `gives ${quote(error.name)} ${count(error.given, "argument")}, where it takes ${describeArity(error.expected)}`;
    case "argumentMismatch":
      return `passes ${quote(error.name)} an argument that does not conform`;
    case "callFailed":
      return `calls ${quote(error.name)}, whose definition ${describeBody(error.error)}`;
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

/** `no arguments`, `1 argument`, `2 arguments`, `1 to 3 arguments`: how many a function takes. */
function describeArity(arity: Arity): string {
  if (arity.min === arity.max) return count(arity.min, "argument");
  return `${arity.min} to ${arity.max} arguments`;
}

/** `no things`, `1 thing`, `2 things`. */
function count(n: number, noun: string): string {
  if (n === 0) return `no ${noun}s`;
  return n === 1 ? `1 ${noun}` : `${n} ${noun}s`;
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
