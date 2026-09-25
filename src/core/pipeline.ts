// The pipeline over text: the one function the UI calls. `convertText` runs
// the whole of the pipeline ARCHITECTURE.md describes for one `have` and one
// `want`: each text is parsed (`expr.ts`) and evaluated against the table
// (`evaluate.ts`, `table.ts`), and the two quantities are converted
// (`convert.ts`). It is the composition and nothing more: every step is one
// of those modules, and this one adds no behavior of its own beyond
// choosing the output mode from the shape of the `want`.
//
// The `want` is read as a unit list, of which an expression alone is a list
// of one. One item that is a bare name of a unit list in the table means
// that list; any other one item is a unit, and the conversion is the ratio
// `convert` gives; two or more items are a list typed out, and the
// conversion is the sum `convertToList` gives, with each item's text kept
// beside its unit for the UI to show. A list's name is not a unit, so it
// means the list only when it stands alone: `2 time` is an unknown unit.
//
// The steps' errors keep their own types; this module only says which text
// an error is in. A parse or evaluation error carries a span into the text
// it came from, so the side is what a caller needs to point at the right
// input, while a conversion error is about the pair and has no side. A
// unit typed in a list that fails the list's checks is reported with the
// texts of the list's units, so that a message can quote the one at fault;
// a list from the table has passed those checks when it was built, and can
// fail only for not conforming to the `have`, which is reported as the
// same mismatch a single `want` would be. `evaluateText` is the first half
// on its own, for a caller that wants to know what one text denotes
// without converting it.

import {
  convert,
  convertToList,
  type ConvertError,
  type UnitListError,
} from "./convert.ts";
import { evaluate, type EvaluateError } from "./evaluate.ts";
import { parseExpr, parseUnitList, type Expr } from "./expr.ts";
import { type ParseError } from "./parser.ts";
import { type Quantity } from "./quantity.ts";
import { type Precision, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import {
  unitLookup,
  type ListedUnit,
  type UnitTable,
  type UnknownUnit,
} from "./table.ts";

// ---------------------------------------------------------------------------
// Types

/** Which of the two texts of a conversion something is about. */
export type Side = "have" | "want";

/** Why a text denotes no quantity: it does not parse, or does not evaluate. */
export type TextError = ParseError | EvaluateError | UnknownUnit;

export type Conversion =
  /** `have` is `value` `want`s. */
  | {
      readonly kind: "unit";
      readonly have: Quantity;
      readonly want: Quantity;
      /** How many `want`s make up `have`. */
      readonly value: Rational;
    }
  /** `have` is the sum of the `terms`, one per unit of the list `units`. */
  | {
      readonly kind: "list";
      readonly have: Quantity;
      /** The units of the list, largest first, each with its text. */
      readonly units: readonly ListedUnit[];
      /** The exact count of each unit but the last, and the remainder in the last. */
      readonly terms: readonly Rational[];
    };

export type ConversionError =
  /** The text on `side` failed as `error` says; `have` is tried first. */
  | {
      readonly kind: "inputError";
      readonly side: Side;
      readonly error: TextError;
    }
  | ConvertError
  /**
   * The `want` is a list typed out whose unit at `error.index` fails as
   * `error` says; `units` are the texts of its units, in order.
   */
  | {
      readonly kind: "unitListError";
      readonly units: readonly string[];
      readonly error: UnitListError;
    };

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
  return evaluateExpr(table, expr.value, precision);
}

/**
 * `have` in `want`, with both texts read against `table`, or the first
 * failure: `have` is evaluated before `want`, and the two are converted
 * only once both denote something. A `want` of one unit gives the ratio, a
 * `want` of several (`ft;in`), or the name of a unit list in the table,
 * gives the sum.
 */
export function convertText(
  table: UnitTable,
  have: string,
  want: string,
  precision: Precision,
): Result<Conversion, ConversionError> {
  const haveQuantity = evaluateText(table, have, precision);
  if (!haveQuantity.ok) return inputError("have", haveQuantity.error);
  const items = parseUnitList(want);
  if (!items.ok) return inputError("want", items.error);
  const [first, ...rest] = items.value;
  if (rest.length === 0) {
    const named =
      first.node.kind === "unit"
        ? table.unitLists.get(first.node.name)
        : undefined;
    if (named !== undefined) {
      return convertToNamedList(table, haveQuantity.value, named);
    }
    const wantQuantity = evaluateExpr(table, first, precision);
    if (!wantQuantity.ok) return inputError("want", wantQuantity.error);
    const value = convert(
      haveQuantity.value,
      wantQuantity.value,
      table.primitives,
    );
    if (!value.ok) return value;
    return ok({
      kind: "unit",
      have: haveQuantity.value,
      want: wantQuantity.value,
      value: value.value,
    });
  }
  const units: ListedUnit[] = [];
  for (const item of items.value) {
    const quantity = evaluateExpr(table, item, precision);
    if (!quantity.ok) return inputError("want", quantity.error);
    units.push({
      text: want.slice(item.span.start, item.span.end),
      quantity: quantity.value,
    });
  }
  const terms = convertToList(
    haveQuantity.value,
    units.map((unit) => unit.quantity),
    table.primitives,
  );
  if (!terms.ok) {
    return err({
      kind: "unitListError",
      units: units.map((unit) => unit.text),
      error: terms.error,
    });
  }
  return ok({
    kind: "list",
    have: haveQuantity.value,
    units,
    terms: terms.value,
  });
}

/**
 * `have` as a sum over a list from the table, which was checked when it
 * was built, so that the one way it can fail is `have` not conforming to
 * it: that is the mismatch of the pair, as for a single `want`.
 */
function convertToNamedList(
  table: UnitTable,
  have: Quantity,
  units: readonly ListedUnit[],
): Result<Conversion, ConversionError> {
  const terms = convertToList(
    have,
    units.map((unit) => unit.quantity),
    table.primitives,
  );
  if (!terms.ok) {
    if (terms.error.kind === "nonconformingUnit")
      return err(terms.error.mismatch);
    // `buildTable` checked the list's units against one another.
    throw new Error("A unit list in the table is not a valid list");
  }
  return ok({ kind: "list", have, units, terms: terms.value });
}

function evaluateExpr(
  table: UnitTable,
  expr: Expr,
  precision: Precision,
): Result<Quantity, TextError> {
  return evaluate(expr, unitLookup(table), table.primitives, precision);
}

function inputError(
  side: Side,
  error: TextError,
): Result<never, ConversionError> {
  return err({ kind: "inputError", side, error });
}
