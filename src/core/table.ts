// The unit table: what `buildTable` produces and what the rest of the app
// reads. ARCHITECTURE.md ("Definitions") gives the overview; `build.ts` is
// the builder, and this module holds only the finished table and its lookup.
//
// The units map holds every name a user can type as a unit, the primitives
// included, so that a lookup is one map read; the primitives map beside it
// is what the conformance check needs, the roles in declaration order. A
// prefix is stored as its factor alone, since the builder has checked that
// its body is a plain number. The unit lists are apart from the units: a
// list's name is not a unit (a body or a `have` that names one is an
// unknown unit), and only a `want` that is exactly a list's name means the
// list. Each unit of a list keeps the text it was defined as, for the
// converter to show beside its term.

import { type Primitives } from "./dimension.ts";
import { type Lookup } from "./evaluate.ts";
import { resolveName } from "./names.ts";
import { multiplyQuantities, scalar, type Quantity } from "./quantity.ts";
import { type Rational } from "./rational.ts";
import { err, ok } from "./result.ts";
import { type Span } from "./span.ts";

export type UnitTable = {
  /** The primitives with their roles, in declaration order. */
  readonly primitives: Primitives;
  /** The factor of each prefix, by name without the dash. */
  readonly prefixes: ReadonlyMap<string, Rational>;
  /** The quantity of each unit, by name; the primitives are among them. */
  readonly units: ReadonlyMap<string, Quantity>;
  /** The units of each unit list, by name, largest first. */
  readonly unitLists: ReadonlyMap<string, UnitList>;
};

/** A unit list: two or more units, all of one dimension, positive and decreasing. */
export type UnitList = readonly ListedUnit[];

/** One unit of a unit list, with the `text` it was written as. */
export type ListedUnit = {
  readonly text: string;
  readonly quantity: Quantity;
};

/** The name at `span` is neither a unit nor a prefix followed by one. */
export type UnknownUnit = {
  readonly kind: "unknownUnit";
  readonly name: string;
  readonly span: Span;
};

/**
 * The lookup the evaluator resolves user input against: an exact unit name
 * if the table has one, otherwise one prefix followed by a unit name, whose
 * quantity is the unit's scaled by the prefix's factor.
 */
export function unitLookup(table: UnitTable): Lookup<UnknownUnit> {
  return (name, span) => {
    const found = resolveName(name, table.prefixes, table.units);
    if (found === undefined) return err({ kind: "unknownUnit", name, span });
    return ok(
      found.kind === "unit"
        ? found.unit
        : multiplyQuantities(scalar(found.prefix), found.unit),
    );
  };
}
