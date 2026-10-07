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
import type { Arity, Assumption, EvaluateError } from "./core/evaluate.ts";
import type { Rejection } from "./core/expr.ts";
import { ZERO, equals, format, type Refusal } from "./core/scaled.ts";
import type {
  ConversionError,
  FunctionWantError,
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
 * edge (zero, `1`, `-1`, or a pole of the function); a value too large
 * or too small to compute names the limit it passes, the significand limit or the
 * exponent bound; and an exact result past the significand limit names the remedy,
 * `approx` around an operand of the node or a higher setting (the plan's
 * D20).
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
      return `${quote(slice(text, error.span))}: ${describeRejection(error.reason)}.`;
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
      return `${quote(slice(text, error.span))} cannot be told from ${edge} at this precision, and the result depends on which side of ${typeof error.edge === "string" ? "it" : edge} it lies.`;
    }
    case "negativeRadicand":
      return `${quote(slice(text, error.span))} takes an even root of a negative value.`;
    case "tooLarge":
      if (error.exact) {
        return exactPastLimit(
          slice(text, error.span),
          error.operand === undefined ? undefined : slice(text, error.operand),
        );
      }
      return `${quote(slice(text, error.span))} ${describeRefusal(error.kind)}.`;
    case "overflow":
    case "underflow":
      return `${quote(slice(text, error.span))} ${describeRefusal(error.kind)}.`;
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
      const parameter =
        error.parameters === 1
          ? `the argument of ${name}`
          : `the parameter ${quote(error.parameter)} of ${name}`;
      return `Cannot apply ${name} to ${argument}: ${describeMismatch(error.mismatch, argument, parameter, primitives)}.`;
    }
    case "callFailed":
      return `Cannot compute ${quote(slice(text, error.span))}: the definition of ${quote(error.name)} ${describeBody(error.error, primitives)}.`;
    case "conditionFailed": {
      const values = error.arguments.map(
        ({ parameter, span }) => `${parameter} is ${quote(slice(text, span))}`,
      );
      return `Cannot compute ${quote(slice(text, error.span))}: ${quote(error.name)} requires ${quote(error.condition)}, and ${conjunction(values)}.`;
    }
    case "undecidedCondition": {
      const call = quote(slice(text, error.span));
      const undecided = `could not tell whether ${describeAssumed(error.assumption)}`;
      if (error.error === undefined)
        return `Cannot compute ${call}: ${undecided}.`;
      return `Cannot compute ${call} at this precision: ${undecided}, and assuming so, the definition of ${quote(error.name)} ${describeBody(error.error, primitives)}.`;
    }
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
        : INCOMPLETE_GAMMA.has(name)
          ? `${argument} is not positive, and the incomplete gamma functions take a positive order`
          : INCOMPLETE_BETA.has(name)
            ? `${argument} is not positive, and the incomplete beta function takes positive parameters`
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
    case "notInteger":
      return `${argument} is not a whole number, and ${fn} is defined only for whole numbers${factorialRemedy(name)}`;
    case "notExact":
      return `${argument} is not known exactly, and ${fn} needs a whole number known exactly${factorialRemedy(name)}`;
    case "negative":
      return name === "doublefactorial"
        ? `${argument} is below -1, and ${fn} is defined only from -1 up`
        : `${argument} is negative, and ${fn} is defined only from 0 up`;
    case "pole":
      return `${argument} is a pole of ${fn}, which has one at zero and at every negative whole number`;
    case "outsideZeroOne":
      return `${argument} lies outside [0, 1], where ${fn} is defined`;
  }
}

/** The incomplete gamma functions, whose first argument is the order. */
const INCOMPLETE_GAMMA = new Set([
  "lowergamma",
  "uppergamma",
  "lowergammareg",
  "uppergammareg",
]);

/** The incomplete beta functions, whose first two arguments are the parameters. */
const INCOMPLETE_BETA = new Set(["incbeta", "incbetareg"]);

/** The pointer at the Gamma family the factorial's and the binomial's refusals of a value they do not take carry, since `gamma(x + 1)` is `factorial(x)` and `1 / ((n + 1) beta(n - k + 1, k + 1))` is `binomial(n, k)` for any arguments. */
function factorialRemedy(name: string): string {
  switch (name) {
    case "factorial":
      return `; ${quote("gamma")} takes any value, with gamma(x + 1) for factorial(x)`;
    case "binomial":
      return `; ${quote("beta")} takes any values, with 1 / ((n + 1) beta(n - k + 1, k + 1)) for binomial(n, k)`;
    default:
      return "";
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
    case "notInteger":
      return "a value that is not a whole number";
    case "notExact":
      return "a value not known exactly";
    case "negative":
      return "a value below where it is defined";
    case "pole":
      return "a pole";
    case "outsideZeroOne":
      return "a value outside [0, 1]";
  }
}

/**
 * Why the parser rejected a literal it recognized, as a clause about "this
 * number" without the final period: a significand of too many digits for the
 * hard bound, or a value whose decimal exponent passes the exponent bound
 * on either side (D17: `0.001e1000000000000000003` is within it, and
 * `1e1000000000000000001` is not); a `^` exponent that cannot be formed
 * as a fraction; a `^` exponent that divides by zero.
 */
function describeRejection(reason: Rejection): string {
  switch (reason.kind) {
    case "numberTooLarge":
    case "exponentTooLarge":
      return "this number is too large to represent";
    case "numberOverflow":
      return "this number's exponent passes 10^18";
    case "numberUnderflow":
      return "this number's exponent falls below -10^18";
    case "exponentDividesByZero":
      return "the exponent divides by zero";
  }
}

/**
 * An exact result past the significand limit, worded with the remedy
 * (the plan's D20): `approx` around the node's first `operand`, which
 * makes the result inexact and computes it to the digits asked (around
 * the node itself it would come too late, the node being refused before
 * `approx` sees it), or a higher setting. The message names the setting
 * as the panel labels it, the significand limit. The significand limit's
 * other refusals (a literal, a sum's alignment, a power's prediction, the
 * kernel's reach) keep `describeRefusal`'s wording, since `approx` is not
 * their remedy in the same way.
 */
function exactPastLimit(node: string, operand: string | undefined): string {
  const remedy =
    operand === undefined
      ? "raise the significand limit, or write approx around a part of it to compute it to the digits asked"
      : `write ${quote(`approx(${operand})`)} in place of ${quote(operand)} to compute it to the digits asked, or raise the significand limit`;
  return `${quote(node)} is too large to hold exactly within the significand limit: ${remedy}.`;
}

/**
 * What a refused result is, as a predicate without the final period: too
 * large to compute within the significand limit, the setting that is the significand limit,
 * or too large or too small for the exponent bound, which is fixed, with
 * the bound named, so that the one the user can change reads apart from
 * the one they cannot.
 */
function describeRefusal(kind: Refusal["kind"]): string {
  switch (kind) {
    case "tooLarge":
      return "is too large to compute within the significand limit";
    case "overflow":
      return "is too large to compute: its exponent would pass 10^18";
    case "underflow":
      return "is too small to compute: its exponent would fall below -10^18";
  }
}

/** A refused value, as the qualifier of a body's description: `too large to form within the significand limit`. */
function describeValuePast(kind: Refusal["kind"]): string {
  switch (kind) {
    case "tooLarge":
      return "too large to form within the significand limit";
    case "overflow":
      return "whose exponent would pass 10^18";
    case "underflow":
      return "whose exponent would fall below -10^18";
  }
}

/** The edge a value cannot be told from, in words: `zero`, `1`, `-1`, `2.5` (a rounding boundary, to twelve digits), `a pole of the function`, `the point where the result passes the exponent bound`. */
function describeEdge(edge: Edge): string {
  if (edge === "pole") return "a pole of the function";
  if (edge === "bound")
    return "the point where the result passes the exponent bound";
  return equals(edge, ZERO) ? "zero" : format(edge, 12, "towardZero");
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
      switch (error.error.kind) {
        case "inverseFailed":
          return describeInverseFailed(error.error, have, primitives);
        case "noInverse":
          return `${quote(error.error.name)} has no inverse, so it cannot be the unit to convert to. Define ${quote(`~${error.error.name}(y) = …`)} to give it one.`;
        case "wantConditionFailed": {
          const name = quote(error.error.name);
          const condition = quote(error.error.condition);
          return error.error.of === "inverse"
            ? `Cannot convert ${quote(have.trim())} into ${name}: the inverse of ${name} requires ${condition}, which ${quote(have.trim())} does not meet.`
            : `Cannot convert ${quote(have.trim())} into ${name}: the argument it would take does not meet ${condition}, which ${name} requires.`;
        }
        case "inverseMismatch":
          return describeInverseMismatch(error.error, have, primitives);
        default:
          return describeTextError(
            error.error,
            error.side === "have" ? have : want,
            primitives,
          );
      }
    case "dimensionMismatch":
    case "kindMismatch":
      return `${describeMismatch(error, quote(have.trim()), quote(want.trim()), primitives)}.`;
    case "zeroWant":
      return `${quote(want.trim())} is zero, so nothing is a multiple of it.`;
    case "unresolvedWant":
      return `${quote(want.trim())} cannot be told from zero at this precision, so nothing can be converted into it.`;
    case "unresolvedBound":
      return `${quote(have.trim())} into ${quote(want.trim())} cannot be told from the point where the result passes the exponent bound at this precision.`;
    case "tooLarge":
      // The pipeline's ratio or count, exact and past the significand limit, is
      // worded as a node is, about the pair, with `approx` around the
      // `have`, which is within the limit and makes the ratio inexact.
      if ("exact" in error) {
        return `${quote(have.trim())} into ${quote(want.trim())} is too large to hold exactly within the significand limit: write ${quote(`approx(${have.trim()})`)} to compute it to the digits asked, or raise the significand limit.`;
      }
      return `${quote(have.trim())} into ${quote(want.trim())} ${describeRefusal(error.kind)}.`;
    case "overflow":
    case "underflow":
      return `${quote(have.trim())} into ${quote(want.trim())} ${describeRefusal(error.kind)}.`;
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
 * Why the want's function is not given back the `have` by the argument
 * its inverse recovers, as one sentence: the inverse is wrong there, or
 * the function's body fails at that argument.
 */
function describeInverseMismatch(
  error: Extract<FunctionWantError, { kind: "inverseMismatch" }>,
  have: string,
  primitives: Primitives,
): string {
  const name = quote(error.name);
  if (error.error === undefined) {
    return `The inverse of ${name} is wrong for ${quote(have.trim())}: ${name} of the argument it gives is not ${quote(have.trim())}.`;
  }
  return `Cannot check the inverse of ${name} for ${quote(have.trim())}: at the argument it gives, the definition of ${name} ${describeBody(error.error, primitives)}.`;
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
    case "overflow":
    case "underflow":
      return `computes a value ${describeValuePast(error.kind)}`;
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
    case "conditionFailed":
      return `calls ${quote(error.name)} outside its condition ${quote(error.condition)}`;
    case "undecidedCondition":
      return error.error === undefined
        ? `calls ${quote(error.name)} where it could not tell whether ${describeAssumed(error.assumption)}`
        : `calls ${quote(error.name)}, which could not tell whether ${describeAssumed(error.assumption)}, and whose definition, assuming so, ${describeBody(error.error, primitives)}`;
    case "builtinArgument":
      return `passes ${quote(error.name)} ${ruleWants(error.error, primitives)}`;
    case "domainError":
      return `applies ${quote(error.name)} to ${domainValue(error.reason)}`;
  }
}

/**
 * The warning beside a value computed under an `assumption`, a condition
 * that could not be decided at the ceiling (or in decimal mode's one
 * pass), as one sentence: the value is shown, and the warning says what
 * it takes for granted.
 */
export function describeAssumption(assumption: Assumption): string {
  const plural = assumption.of === "function" && assumption.parameters !== 1;
  return `Could not tell whether ${describeAssumed(assumption)}; the value assumes ${plural ? "they do" : "it does"}.`;
}

/** What an assumed condition is about, and the condition: `the argument of "tempC" meets "x >= -273.15"`. */
function describeAssumed(assumption: Assumption): string {
  const name = quote(assumption.name);
  const condition = quote(assumption.condition);
  if (assumption.of === "inverse") {
    return `the value given to the inverse of ${name} meets ${condition}`;
  }
  return assumption.parameters === 1
    ? `the argument of ${name} meets ${condition}`
    : `the arguments of ${name} meet ${condition}`;
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

/** `a`, `a and b`, `a, b and c`. */
function conjunction(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** `a`, `a or b`, `a, b or c`: the alternatives, as the parser labels them. */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}
