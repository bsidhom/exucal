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
// duplicate. The walker's nodes are the definitions themselves, and a name
// referenced in a body resolves through the index to the definition it
// means, so a reference to `km` visits the definitions of `k-` and `m`.
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
import { evaluate, type EvaluateError, type Lookup } from "./evaluate.ts";
import { walker, type Cycle, type Visit } from "./graph.ts";
import { findAmbiguity, resolveName, type Split } from "./names.ts";
import { multiplyQuantities, type Quantity } from "./quantity.ts";
import { ONE, type Precision, type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { type Span } from "./span.ts";
import { type UnitTable, type UnknownUnit } from "./table.ts";

// ---------------------------------------------------------------------------
// Types

export type PrefixDefinition = Extract<Definition, { kind: "prefix" }>;
/** A definition in the unit namespace: a primitive or a unit. */
export type UnitDefinition = Exclude<Definition, { kind: "prefix" }>;

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
  | EvaluateError;

/** The definitions by name, one map per namespace, in definition order. */
type Index = {
  readonly prefixes: ReadonlyMap<string, PrefixDefinition>;
  readonly units: ReadonlyMap<string, UnitDefinition>;
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
  // The primitives are known before any body is evaluated, and a body may
  // need their roles (a sum checks that its operands conform), so they are
  // collected first and serve the walk as well as the finished table.
  const primitives = declaredPrimitives(index.units.values());
  const walk = walker<Definition, Quantity, BuildError>((definition, visit) =>
    evaluateDefinition(
      definition,
      lookupIn(index, visit),
      primitives,
      precision,
    ),
  );
  const prefixes = new Map<string, Rational>();
  const units = new Map<string, Quantity>();
  for (const definition of definitions) {
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
  return ok({ primitives, prefixes, units });
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
  for (const definition of definitions) {
    const first =
      definition.kind === "prefix"
        ? prefixes.get(definition.name)
        : units.get(definition.name);
    if (first !== undefined) {
      return err({ kind: "duplicate", first, second: definition });
    }
    if (definition.kind === "prefix") {
      prefixes.set(definition.name, definition);
    } else {
      units.set(definition.name, definition);
    }
  }
  return ok({ prefixes, units });
}

// ---------------------------------------------------------------------------
// Evaluating one definition

/**
 * The quantity `definition` denotes: a primitive is one of itself, a unit
 * is what its body evaluates to, and a prefix is what its body evaluates
 * to, provided that is a plain number.
 */
function evaluateDefinition(
  definition: Definition,
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
 * The lookup for the bodies being evaluated: resolves a name through the
 * index and requests the definitions it means through `visit`. A cycle is
 * located at the reference that closed it; any other failure of a
 * dependency is passed up as it is.
 */
function lookupIn(
  index: Index,
  visit: Visit<Definition, Quantity, BuildError>,
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
  result: Result<Quantity, BuildError | Cycle<Definition>>,
  span: Span,
): Result<Quantity, BuildError> {
  if (result.ok) return result;
  const { error } = result;
  return error.kind === "cycle"
    ? err({ kind: "circularDefinition", definitions: error.nodes, span })
    : err(error);
}
