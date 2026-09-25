// The pipeline over text: the one function the UI calls. `convertText` runs
// the whole of the pipeline ARCHITECTURE.md describes for one `have` and one
// `want`: each text is parsed (`expr.ts`) and evaluated against the table
// (`evaluate.ts`, `table.ts`), and the two quantities are converted
// (`convert.ts`). It is the composition and nothing more: every step is one
// of those modules, and this one adds no behavior of its own.
//
// The steps' errors keep their own types; this module only says which text
// an error is in. A parse or evaluation error carries a span into the text
// it came from, so the side is what a caller needs to point at the right
// input, while a conversion error is about the pair and has no side.
// `evaluateText` is the first half on its own, for a caller that wants to
// know what one text denotes without converting it.

import { convert, type ConvertError } from "./convert.ts";
import { evaluate, type EvaluateError } from "./evaluate.ts";
import { parseExpr } from "./expr.ts";
import { type ParseError } from "./parser.ts";
import { type Quantity } from "./quantity.ts";
import { type Precision, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { unitLookup, type UnitTable, type UnknownUnit } from "./table.ts";

// ---------------------------------------------------------------------------
// Types

/** Which of the two texts of a conversion something is about. */
export type Side = "have" | "want";

/** Why a text denotes no quantity: it does not parse, or does not evaluate. */
export type TextError = ParseError | EvaluateError | UnknownUnit;

export type Conversion = {
  readonly have: Quantity;
  readonly want: Quantity;
  /** How many `want`s make up `have`. */
  readonly value: Rational;
};

export type ConversionError =
  /** The text on `side` failed as `error` says; `have` is tried first. */
  | {
      readonly kind: "inputError";
      readonly side: Side;
      readonly error: TextError;
    }
  | ConvertError;

// ---------------------------------------------------------------------------
// The pipeline

/**
 * The quantity `text` denotes in `table`, with every inexact operation
 * truncated to `precision` significant digits.
 */
export function evaluateText(
  table: UnitTable,
  text: string,
  precision: Precision,
): Result<Quantity, TextError> {
  const expr = parseExpr(text);
  if (!expr.ok) return expr;
  return evaluate(expr.value, unitLookup(table), table.primitives, precision);
}

/**
 * How many `want`s make up `have`, with both texts read against `table`,
 * or the first failure: `have` is evaluated before `want`, and the two are
 * converted only once both denote a quantity.
 */
export function convertText(
  table: UnitTable,
  have: string,
  want: string,
  precision: Precision,
): Result<Conversion, ConversionError> {
  const haveQuantity = evaluateText(table, have, precision);
  if (!haveQuantity.ok) return inputError("have", haveQuantity.error);
  const wantQuantity = evaluateText(table, want, precision);
  if (!wantQuantity.ok) return inputError("want", wantQuantity.error);
  const value = convert(
    haveQuantity.value,
    wantQuantity.value,
    table.primitives,
  );
  if (!value.ok) return value;
  return ok({
    have: haveQuantity.value,
    want: wantQuantity.value,
    value: value.value,
  });
}

function inputError(
  side: Side,
  error: TextError,
): Result<never, ConversionError> {
  return err({ kind: "inputError", side, error });
}
