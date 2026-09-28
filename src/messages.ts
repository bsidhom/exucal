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
  isDimensionless,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./core/dimension.ts";
import {
  RADIAN,
  type DimensionRuleError,
  type DomainReason,
  type Edge,
} from "./core/builtin.ts";
import type { UnitListError } from "./core/convert.ts";
import type { Arity, EvaluateError } from "./core/evaluate.ts";
import type { Limit } from "./core/rational.ts";
import { ZERO, equals, format } from "./core/scaled.ts";
import type {
  ConversionError,
  InverseFailed,
  TextError,
} from "./core/pipeline.ts";
import type { Span } from "./core/span.ts";

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
 * spans are into the definitions text, which is not the text shown. A
 * built-in whose dimension rule fails is worded from the rule's data: what
 * the argument must be, and how to write the call when there is a way
 * (`sin(1 radian)` for a plain number where an angle is wanted, `(2 m)^2`
 * for a quantity as the base of `pow`); one outside its domain quotes the
 * argument and says the domain; a value that straddles an edge names the
 * edge (zero, `1`, `-1`, or a pole of the tangent); and a value too large
 * or too small to compute names the limit it passes, Most bits or the
 * exponent bound.
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
      return `${quote(error.name)} is a function, not a unit. ${callForm(error.name, error.arity)}`;
    case "notAFunction": {
      if (error.otherwise === "nothing") {
        return `Unknown function ${quote(error.name)}.`;
      }
      const argument = text.slice(error.span.end, error.call.end);
      return `${quote(error.name)} is a unit, not a function. For a product, write ${quote(`${error.name} ${argument}`)}, with a space.`;
    }
    case "divisionByZero":
      return `Division by zero in ${quote(slice(text, error.span))}.`;
    case "unresolved": {
      const edge = describeEdge(error.edge);
      return `${quote(slice(text, error.span))} cannot be told from ${edge} at this precision, and the result depends on which side of ${error.edge === "pole" ? "it" : edge} it lies.`;
    }
    case "negativeRadicand":
      return `${quote(slice(text, error.span))} takes an even root of a negative value.`;
    case "tooLarge":
      return `${quote(slice(text, error.span))} ${describeTooLarge(error.limit)}.`;
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
      return `Cannot compute ${quote(slice(text, error.span))}: the definition of ${quote(error.name)} ${describeBody(error.error, primitives)}.`;
    case "builtinArgument":
      return describeBuiltinArgument(error, text, primitives);
    case "domainError": {
      const argument = quote(slice(text, error.arguments[error.argument]!));
      return `Cannot compute ${quote(slice(text, error.span))}: ${describeDomain(error.name, error.reason, argument)}.`;
    }
  }
}

/**
 * Why the built-in `name` does not accept its arguments' dimensions, as
 * one sentence from the rule's data: the argument quoted, what it must be
 * (a plain number, or an angle when the dimension wanted is the radian
 * kind), and how to write the call when there is a way.
 */
function describeBuiltinArgument(
  error: Extract<EvaluateError, { kind: "builtinArgument" }>,
  text: string,
  primitives: Primitives,
): string {
  const name = quote(error.name);
  const rule = error.error;
  const argumentText = (index: number) =>
    quote(slice(text, error.arguments[index]!));
  switch (rule.kind) {
    case "argumentDimension": {
      const argument = argumentText(rule.argument);
      const have = formatDimension(rule.mismatch.have, primitives);
      if (isAngle(rule.want, primitives)) {
        return isDimensionless(rule.mismatch.have)
          ? `Cannot apply ${name} to ${argument}: ${argument} is a plain number, but ${name} takes an angle; write ${quote(`${error.name}(${slice(text, error.arguments[rule.argument]!)} ${RADIAN})`)}.`
          : `Cannot apply ${name} to ${argument}: ${argument} has dimension ${have}, but ${name} takes an angle.`;
      }
      if (error.name === "pow" && rule.argument === 0) {
        const exponent = error.arguments[1];
        const power =
          exponent === undefined
            ? ""
            : `; for a power of a quantity, write ${quote(`(${slice(text, error.arguments[0]!)})^${slice(text, exponent)}`)}`;
        return `Cannot apply ${name} to ${argument}: the base must be a plain number${power}.`;
      }
      return `Cannot apply ${name} to ${argument}: ${argument} has dimension ${have}, but ${whichArgument(rule.argument, error.arguments.length)} of ${name} must be a plain number.`;
    }
    case "nonconformingArguments": {
      const left = argumentText(rule.left);
      const right = argumentText(rule.right);
      return `Cannot apply ${name} to ${left} and ${right}: ${describeMismatch(rule.mismatch, left, right, primitives)}.`;
    }
    case "noAngles":
      return `${name} takes an angle, and these units declare none.`;
  }
}

/** Whether `want`, the dimension a rule asks for, is the radian kind. */
function isAngle(want: Dimension, primitives: Primitives): boolean {
  return (
    want.size === 1 && want.has(RADIAN) && primitives.get(RADIAN) === "kind"
  );
}

/** `the argument`, or `the first argument` of several. */
function whichArgument(index: number, count: number): string {
  if (count <= 1) return "the argument";
  const ordinal =
    ["first", "second", "third", "fourth"][index] ?? `${index + 1}th`;
  return `the ${ordinal} argument`;
}

/**
 * Why the `argument` of the built-in `name` is outside its domain, without
 * the final period: the reason as a clause about the value quoted.
 */
function describeDomain(
  name: string,
  reason: DomainReason,
  argument: string,
): string {
  const fn = quote(name);
  switch (reason) {
    case "notPositive":
      return name === "pow"
        ? `${argument} is not positive, and a power with an inexact exponent is defined only for a positive base`
        : `${argument} is not positive, and a logarithm is defined only for positive values`;
    case "baseOne":
      return `the base ${argument} is one, and no logarithm has base one`;
    case "outsideClosedUnitInterval":
      return `${argument} lies outside [-1, 1], where ${fn} is defined`;
    case "belowOne":
      return `${argument} is less than 1, and ${fn} is defined only from 1 up`;
    case "outsideOpenUnitInterval":
      return `${argument} is not strictly between -1 and 1, where ${fn} is defined`;
    case "origin":
      return `both arguments are zero, and the origin has no direction`;
  }
}

/** What a reason says the value is, as a noun phrase, for a body's description. */
function domainValue(reason: DomainReason): string {
  switch (reason) {
    case "notPositive":
      return "a value that is not positive";
    case "baseOne":
      return "a base of one";
    case "outsideClosedUnitInterval":
      return "a value outside [-1, 1]";
    case "belowOne":
      return "a value less than 1";
    case "outsideOpenUnitInterval":
      return "a value not strictly between -1 and 1";
    case "origin":
      return "the origin";
  }
}

/**
 * What a result past `limit` is, as a predicate without the final period:
 * too large to compute within Most bits, the setting that is the range
 * limit, or too large or too small for the exponent bound, which is fixed,
 * with the bound named, so that the one the user can change reads apart
 * from the one they cannot (issue #41).
 */
function describeTooLarge(limit: Limit): string {
  switch (limit) {
    case "range":
      return "is too large to compute within Most bits";
    case "exponentAbove":
      return "is too large to compute: its exponent would pass 10^18";
    case "exponentBelow":
      return "is too small to compute: its exponent would fall below -10^18";
  }
}

/** A value past `limit`, as the qualifier of a body's description: `too large to form within Most bits`. */
function describeValuePast(limit: Limit): string {
  switch (limit) {
    case "range":
      return "too large to form within Most bits";
    case "exponentAbove":
      return "whose exponent would pass 10^18";
    case "exponentBelow":
      return "whose exponent would fall below -10^18";
  }
}

/** The edge a value cannot be told from, in words: `zero`, `1`, `-1`, `a pole of the tangent`. */
function describeEdge(edge: Edge): string {
  if (edge === "pole") return "a pole of the tangent";
  return equals(edge, ZERO) ? "zero" : format(edge, 1, "towardZero");
}

/** How to call the function `name` of `arity`, as the message for a name used as a unit says it. */
function callForm(name: string, arity: Arity): string {
  if (arity.max === 0) return `To call it, write ${quote(`${name}()`)}.`;
  if (arity.min <= 1) {
    return `To apply it to a value, write ${quote(`${name}(value)`)}.`;
  }
  const values = Array.from({ length: arity.min }, () => "value").join(", ");
  return `To apply it to values, write ${quote(`${name}(${values})`)}.`;
}

/** What a rule's failure says the argument is not, for a body's description. */
function ruleWants(rule: DimensionRuleError, primitives: Primitives): string {
  switch (rule.kind) {
    case "argumentDimension":
      return isAngle(rule.want, primitives)
        ? "an argument that is not an angle"
        : "an argument that is not a plain number";
    case "nonconformingArguments":
      return "arguments that do not conform";
    case "noAngles":
      return "an angle in units that declare none";
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
        ? describeInverseFailed(error.error, have, primitives)
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
    case "tooLarge":
      return `${quote(have.trim())} into ${quote(want.trim())} ${describeTooLarge(error.limit)}.`;
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
function describeInverseFailed(
  error: InverseFailed,
  have: string,
  primitives: Primitives,
): string {
  return `Cannot invert ${quote(error.name)} for ${quote(have.trim())}: the inverse of ${quote(error.name)} ${describeBody(error.error, primitives)}.`;
}

/**
 * What the body of a function does that fails, as a predicate of the
 * definition (`divides by zero`), without the text: the body's spans are
 * into the definitions, which the user does not see.
 */
function describeBody(error: EvaluateError, primitives: Primitives): string {
  switch (error.kind) {
    case "divisionByZero":
      return "divides by zero";
    case "unresolved":
      return `depends on a value that cannot be told from ${describeEdge(error.edge)} at this precision`;
    case "negativeRadicand":
      return "takes an even root of a negative value";
    case "tooLarge":
      return `computes a value ${describeValuePast(error.limit)}`;
    case "nonconformingOperands":
      return error.op === "add"
        ? "adds quantities that do not conform"
        : "subtracts quantities that do not conform";
    case "arityMismatch":
      return `gives ${quote(error.name)} ${count(error.given, "argument")}, where it takes ${describeArity(error.expected)}`;
    case "argumentMismatch":
      return `passes ${quote(error.name)} an argument that does not conform`;
    case "callFailed":
      return `calls ${quote(error.name)}, whose definition ${describeBody(error.error, primitives)}`;
    case "builtinArgument":
      return `passes ${quote(error.name)} ${ruleWants(error.error, primitives)}`;
    case "domainError":
      return `applies ${quote(error.name)} to ${domainValue(error.reason)}`;
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
