// Building the unit table from parsed definitions. ARCHITECTURE.md
// ("Definitions") gives the overview; this module orders the checks and
// connects the pieces: the definitions are indexed by name, the index is
// checked for ambiguous names (`names.ts`), and then every body is
// evaluated (`evaluate.ts`) in definition order, with references resolved
// on demand through a walker (`graph.ts`) so that definitions may appear in
// any order and a cycle is reported rather than looped on.
//
// Prefixes and units are separate namespaces: `m-` (milli) and `m` (the
// metre) coexist, while a primitive and a unit of the same name are a
// duplicate. The walker's nodes are the definitions that denote a quantity,
// and a name referenced in a body resolves through the index to the
// definition it means, so a reference to `km` visits the definitions of
// `k-` and `m`.
//
// Unit lists share the unit namespace but are not units: nothing can refer
// to one, so they stay out of the walker, and each is evaluated in its
// place in the order, item by item, through the same lookup as a body. A
// list is a `want` on its own, so its name must not also read as a unit
// the other way names do, as a prefix followed by a unit: `ms` typed as
// the want would mean the list, and typed as the have the milliseconds,
// and the build rejects the name instead. A list's units are checked here
// for what `convertToList` checks of any list, that they are of one
// dimension, positive and decreasing, so that a defined list can fail to
// convert only for not conforming to the `have`.
//
// The first failure ends the build. Errors within a body (an unknown name,
// a division by zero, a reference that closes a cycle) carry the span of
// the text at fault, which is an offset into the whole definitions text;
// errors about a definition as a whole (a duplicate, a prefix whose body is
// not a plain number) carry the definition, whose span covers its text.

import { type Definition } from "./definitions.ts";
import {
  isDimensionless,
  primitive,
  type Dimension,
  type Primitives,
  type Role,
} from "./dimension.ts";
import { convertToList, type UnitListError } from "./convert.ts";
import { evaluate, type EvaluateError, type Lookup } from "./evaluate.ts";
import { walker, type Cycle, type Visit } from "./graph.ts";
import { findAmbiguity, resolveName, type Split } from "./names.ts";
import { multiplyQuantities, type Quantity } from "./quantity.ts";
import { ONE, type Precision, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { type Span } from "./span.ts";
import {
  type ListedUnit,
  type UnitList,
  type UnitTable,
  type UnknownUnit,
} from "./table.ts";

// ---------------------------------------------------------------------------
// Types

export type PrefixDefinition = Extract<Definition, { kind: "prefix" }>;
/** A definition of a unit: a primitive or a unit proper. */
export type UnitDefinition = Extract<
  Definition,
  { kind: "primitive" | "unit" }
>;
export type UnitListDefinition = Extract<Definition, { kind: "unitList" }>;
/** A definition that denotes a quantity: what the walker evaluates. */
type QuantityDefinition = PrefixDefinition | UnitDefinition;

export type BuildError =
  /** `second` defines a name that `first` already defined in the same namespace. */
  | {
      readonly kind: "duplicate";
      readonly first: Definition;
      readonly second: Definition;
    }
  /** `name` could be read as either of two prefix-unit `splits`. */
  | {
      readonly kind: "ambiguousName";
      readonly name: string;
      readonly splits: readonly [Split, Split];
    }
  | UnknownUnit
  /**
   * The `definitions` refer to one another in a circle, each to the next
   * and the last to the first; the reference at `span`, in the last, closes
   * it.
   */
  | {
      readonly kind: "circularDefinition";
      readonly definitions: readonly Definition[];
      readonly span: Span;
    }
  /** The body of the prefix `definition` has a `dimension` or a kind. */
  | {
      readonly kind: "dimensionedPrefix";
      readonly definition: PrefixDefinition;
      readonly dimension: Dimension;
    }
  /** The name of the unit list `definition` also reads as `split`, a prefix followed by a unit. */
  | {
      readonly kind: "prefixedListName";
      readonly definition: UnitListDefinition;
      readonly split: Split;
    }
  /** The units of the unit list `definition` do not make a list, as `error` says of the item at its index. */
  | {
      readonly kind: "invalidUnitList";
      readonly definition: UnitListDefinition;
      readonly error: UnitListError;
    }
  | EvaluateError;

/**
 * The definitions by name, one map per namespace, in definition order. The
 * unit lists are in the unit namespace, but apart, since a name in a body
 * resolves among the units alone.
 */
type Index = {
  readonly prefixes: ReadonlyMap<string, PrefixDefinition>;
  readonly units: ReadonlyMap<string, UnitDefinition>;
  readonly unitLists: ReadonlyMap<string, UnitListDefinition>;
};

// ---------------------------------------------------------------------------
// Building

/**
 * The table `definitions` describe, with every body evaluated at the
 * working `precision`, or the first error found: a duplicate name, an
 * ambiguous name, and then, in definition order, whatever evaluating each
 * body fails with.
 */
export function buildTable(
  definitions: readonly Definition[],
  precision: Precision,
): Result<UnitTable, BuildError> {
  const indexed = indexDefinitions(definitions);
  if (!indexed.ok) return indexed;
  const index = indexed.value;
  const ambiguity = findAmbiguity(index.prefixes, index.units);
  if (ambiguity !== undefined) {
    return err({ kind: "ambiguousName", ...ambiguity });
  }
  for (const definition of index.unitLists.values()) {
    const split = resolveName(definition.name, index.prefixes, index.units);
    // An exact unit of the name would have been a duplicate.
    if (split !== undefined && split.kind === "prefixed") {
      return err({
        kind: "prefixedListName",
        definition,
        split: {
          prefix: split.prefix.name,
          unit: split.unit.name,
        },
      });
    }
  }
  // The primitives are known before any body is evaluated, and a body may
  // need their roles (a sum checks that its operands conform), so they are
  // collected first and serve the walk as well as the finished table.
  const primitives = declaredPrimitives(index.units.values());
  const walk = walker<QuantityDefinition, Quantity, BuildError>(
    (definition, visit) =>
      evaluateDefinition(
        definition,
        lookupIn(index, visit),
        primitives,
        precision,
      ),
  );
  const prefixes = new Map<string, Rational>();
  const units = new Map<string, Quantity>();
  const unitLists = new Map<string, UnitList>();
  for (const definition of definitions) {
    if (definition.kind === "unitList") {
      // Nothing refers to a list, so its items are evaluated outside the
      // walk, requesting what they refer to from the top.
      const list = evaluateUnitList(
        definition,
        lookupIn(index, walk),
        primitives,
        precision,
      );
      if (!list.ok) return list;
      unitLists.set(definition.name, list.value);
      continue;
    }
    const result = walk(definition);
    if (!result.ok) return result;
    switch (definition.kind) {
      case "primitive":
      case "unit":
        units.set(definition.name, result.value);
        break;
      case "prefix":
        prefixes.set(definition.name, result.value.magnitude);
        break;
    }
  }
  return ok({ primitives, prefixes, units, unitLists });
}

/** The primitives among `definitions`, with their roles, in the order given. */
function declaredPrimitives(definitions: Iterable<UnitDefinition>): Primitives {
  const primitives = new Map<string, Role>();
  for (const definition of definitions) {
    if (definition.kind === "primitive") {
      primitives.set(definition.name, definition.role);
    }
  }
  return primitives;
}

function indexDefinitions(
  definitions: readonly Definition[],
): Result<Index, BuildError> {
  const prefixes = new Map<string, PrefixDefinition>();
  const units = new Map<string, UnitDefinition>();
  const unitLists = new Map<string, UnitListDefinition>();
  for (const definition of definitions) {
    const first =
      definition.kind === "prefix"
        ? prefixes.get(definition.name)
        : (units.get(definition.name) ?? unitLists.get(definition.name));
    if (first !== undefined) {
      return err({ kind: "duplicate", first, second: definition });
    }
    switch (definition.kind) {
      case "prefix":
        prefixes.set(definition.name, definition);
        break;
      case "primitive":
      case "unit":
        units.set(definition.name, definition);
        break;
      case "unitList":
        unitLists.set(definition.name, definition);
        break;
    }
  }
  return ok({ prefixes, units, unitLists });
}

// ---------------------------------------------------------------------------
// Evaluating one definition

/**
 * The quantity `definition` denotes: a primitive is one of itself, a unit
 * is what its body evaluates to, and a prefix is what its body evaluates
 * to, provided that is a plain number.
 */
function evaluateDefinition(
  definition: QuantityDefinition,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  precision: Precision,
): Result<Quantity, BuildError> {
  switch (definition.kind) {
    case "primitive":
      return ok({ magnitude: ONE, dimension: primitive(definition.name) });
    case "unit":
      return evaluate(definition.body, lookup, primitives, precision);
    case "prefix": {
      const body = evaluate(definition.body, lookup, primitives, precision);
      if (!body.ok) return body;
      const { dimension } = body.value;
      return isDimensionless(dimension)
        ? body
        : err({ kind: "dimensionedPrefix", definition, dimension });
    }
  }
}

/**
 * The units of the unit list `definition`: each item evaluated, with its
 * text, and the list checked as `convertToList` checks one, against its
 * own first unit, so that a list in the table converts for any `have` of
 * its dimension.
 */
function evaluateUnitList(
  definition: UnitListDefinition,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  precision: Precision,
): Result<UnitList, BuildError> {
  const units: ListedUnit[] = [];
  for (const item of definition.items) {
    const quantity = evaluate(item.expr, lookup, primitives, precision);
    if (!quantity.ok) return quantity;
    units.push({ text: item.text, quantity: quantity.value });
  }
  const checked = convertToList(
    units[0]!.quantity,
    units.map((unit) => unit.quantity),
    primitives,
  );
  if (!checked.ok) {
    return err({ kind: "invalidUnitList", definition, error: checked.error });
  }
  return ok(units);
}

/**
 * The lookup for the bodies being evaluated: resolves a name through the
 * index and requests the definitions it means through `visit`. A cycle is
 * located at the reference that closed it; any other failure of a
 * dependency is passed up as it is. Outside the walk, the walker itself
 * serves as `visit`, since a request from the top never closes a cycle.
 */
function lookupIn(
  index: Index,
  visit: Visit<QuantityDefinition, Quantity, BuildError>,
): Lookup<BuildError> {
  return (name, span) => {
    const found = resolveName(name, index.prefixes, index.units);
    if (found === undefined) return err({ kind: "unknownUnit", name, span });
    const unit = locate(visit(found.unit), span);
    if (found.kind === "unit" || !unit.ok) return unit;
    const prefix = locate(visit(found.prefix), span);
    if (!prefix.ok) return prefix;
    return ok(multiplyQuantities(prefix.value, unit.value));
  };
}

/** Turns a `Cycle` closed by the reference at `span` into a build error. */
function locate(
  result: Result<Quantity, BuildError | Cycle<QuantityDefinition>>,
  span: Span,
): Result<Quantity, BuildError> {
  if (result.ok) return result;
  const { error } = result;
  return error.kind === "cycle"
    ? err({ kind: "circularDefinition", definitions: error.nodes, span })
    : err(error);
}
