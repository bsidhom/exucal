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
// duplicate. The built-ins (builtins.ts) are in the unit namespace too: a
// unit, list or function named like one is a duplicate whose `first` is
// the built-in's name, a built-in's name may not read as a prefix followed
// by a unit any more than a function's may, and the table carries the set
// it was built against, so that its lookup resolves calls against the same
// set the build checked. The set is a parameter with the module's map as
// its default, so that a test can build against a built-in of its own.
// The walker's nodes are the definitions that denote a quantity and the
// functions, and a name referenced in a body resolves through the index
// to the definition it means, so a reference to `km` visits the
// definitions of `k-` and `m`, and a call of `tempC` visits the function;
// a call of a built-in resolves to it directly, since it has no
// definition to visit.
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
// Functions share the unit namespace too, and a function's name is subject
// to the same rule as a list's, for the same reason: typed as the want it
// would mean the inverse, and typed as the have a prefixed unit. A function
// is a node of the walk, so that a unit may be defined by a call, a body
// may call another function, and a cycle through a function is reported
// like any other. Checking a function (docs/functions.md) means evaluating
// its declared units and taking each body's dimension without evaluating
// it (dimension-of.ts), the forward body with the parameter bound to the
// declared argument's dimension and the inverse body with the name bound
// to the declared result's, through the walk's own lookup, and checking
// that each conforms to what it should give. That catches a body of the
// wrong dimension, or one that refers to nothing, at load time, so that a
// call at run time can fail only on its argument or on a value; a body
// that fails at some value, or at every value (`1 / (x - 1)`, `1 / 0`),
// builds and fails at the call, where the first version of the check,
// which evaluated the body at one of the declared unit, refused it. A
// declared unit whose ball contains zero (an exact zero, or an inexact
// value around it) is rejected as well, since a recovered argument is
// written as a count of it and nothing is a count of either.
//
// The first failure ends the build. Errors within a body (an unknown name,
// a division by zero, a reference that closes a cycle) carry the span of
// the text at fault, which is an offset into the whole definitions text;
// errors about a definition as a whole (a duplicate, a prefix whose body is
// not a plain number) carry the definition, whose span covers its text.

import type { Definition } from "./definitions.ts";
import {
  checkConformance,
  isDimensionless,
  primitive,
  type ConformanceError,
  type Dimension,
  type Primitives,
  type Role,
} from "./dimension.ts";
import { convertToList, type UnitListError } from "./convert.ts";
import { dimensionOf, type DimensionLookup } from "./dimension-of.ts";
import { evaluate, type EvaluateError, type Lookup } from "./evaluate.ts";
import { walker, type Cycle, type Visit } from "./graph.ts";
import { findAmbiguity, resolveName, type Split } from "./names.ts";
import { multiplyQuantities, type Quantity } from "./quantity.ts";
import { containsZero, exact, type Ball } from "./ball.ts";
import type { Builtins } from "./builtin.ts";
import { BUILTINS } from "./builtins.ts";
import { checkContext, type NumberContext } from "./context.ts";
import { err, ok, type Result } from "./result.ts";
import { ONE } from "./scaled.ts";
import type { Span } from "./span.ts";
import {
  functionArity,
  otherwiseOf,
  resolveFunction,
  type ListedUnit,
  type LookupError,
  type UnitFunction,
  type UnitList,
  type UnitTable,
  type WrittenUnit,
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
export type FunctionDefinition = Extract<Definition, { kind: "function" }>;
/** A definition that denotes a quantity. */
type QuantityDefinition = PrefixDefinition | UnitDefinition;
/** A definition the walker evaluates: one that denotes a quantity, or a function. */
type Node = QuantityDefinition | FunctionDefinition;

/** What a node of the walk evaluates to. */
type Built =
  | { readonly kind: "quantity"; readonly value: Quantity }
  | { readonly kind: "function"; readonly value: UnitFunction };

/** A built-in, standing where a definition would in an error about a name. */
export type BuiltinName = { readonly kind: "builtin"; readonly name: string };

export type BuildError =
  /** `second` defines a name that `first`, a definition or a built-in, already has in the same namespace. */
  | {
      readonly kind: "duplicate";
      readonly first: Definition | BuiltinName;
      readonly second: Definition;
    }
  /** `name` could be read as either of two prefix-unit `splits`. */
  | {
      readonly kind: "ambiguousName";
      readonly name: string;
      readonly splits: readonly [Split, Split];
    }
  | LookupError
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
  /** The name of the unit list, function or built-in `definition` also reads as `split`, a prefix followed by a unit. */
  | {
      readonly kind: "prefixedName";
      readonly definition:
        UnitListDefinition | FunctionDefinition | BuiltinName;
      readonly split: Split;
    }
  /** The units of the unit list `definition` do not make a list, as `error` says of the item at its index. */
  | {
      readonly kind: "invalidUnitList";
      readonly definition: UnitListDefinition;
      readonly error: UnitListError;
    }
  /** The `body` of the function `definition` does not conform to the unit it should give, as `mismatch` says. */
  | {
      readonly kind: "functionMismatch";
      readonly definition: FunctionDefinition;
      readonly body: "forward" | "inverse";
      readonly mismatch: ConformanceError;
    }
  /** The declared `unit` of the function `definition` is zero, or cannot be told from it; nothing is a count of either. */
  | {
      readonly kind: "zeroDeclaredUnit";
      readonly definition: FunctionDefinition;
      readonly unit: "argument" | "result";
    }
  | EvaluateError;

/**
 * The definitions by name, one map per namespace, in definition order. The
 * unit lists and the functions are in the unit namespace, but apart, since
 * a name in a body resolves among the units alone, and a call among the
 * functions alone.
 */
type Index = {
  readonly prefixes: ReadonlyMap<string, PrefixDefinition>;
  readonly units: ReadonlyMap<string, UnitDefinition>;
  readonly unitLists: ReadonlyMap<string, UnitListDefinition>;
  readonly functions: ReadonlyMap<string, FunctionDefinition>;
  /** The built-ins the table is built against. */
  readonly builtins: Builtins;
};

// ---------------------------------------------------------------------------
// Building

/**
 * The table `definitions` describe against the `builtins`, with every body
 * evaluated at the working `context`, or the first error found: a
 * duplicate name (a built-in's included), an ambiguous name, a list's,
 * function's or built-in's name that reads as a prefixed unit, and then,
 * in definition order, whatever evaluating each body fails with.
 */
export function buildTable(
  definitions: readonly Definition[],
  context: NumberContext,
  builtins: Builtins = BUILTINS,
): Result<UnitTable, BuildError> {
  checkContext(context);
  const indexed = indexDefinitions(definitions, builtins);
  if (!indexed.ok) return indexed;
  const index = indexed.value;
  const ambiguity = findAmbiguity(index.prefixes, index.units);
  if (ambiguity !== undefined) {
    return err({ kind: "ambiguousName", ...ambiguity });
  }
  const named: (UnitListDefinition | FunctionDefinition | BuiltinName)[] = [
    ...index.unitLists.values(),
    ...index.functions.values(),
    ...[...builtins.keys()].map((name): BuiltinName => ({
      kind: "builtin",
      name,
    })),
  ];
  for (const definition of named) {
    const split = resolveName(definition.name, index.prefixes, index.units);
    // An exact unit of the name would have been a duplicate.
    if (split !== undefined && split.kind === "prefixed") {
      return err({
        kind: "prefixedName",
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
  const walk = walker<Node, Built, BuildError>((definition, visit) =>
    evaluateNode(definition, lookupIn(index, visit), primitives, context),
  );
  const prefixes = new Map<string, Ball>();
  const units = new Map<string, Quantity>();
  const unitLists = new Map<string, UnitList>();
  const functions = new Map<string, UnitFunction>();
  for (const definition of definitions) {
    if (definition.kind === "unitList") {
      // Nothing refers to a list, so its items are evaluated outside the
      // walk, requesting what they refer to from the top.
      const list = evaluateUnitList(
        definition,
        lookupIn(index, walk),
        primitives,
        context,
      );
      if (!list.ok) return list;
      unitLists.set(definition.name, list.value);
      continue;
    }
    const result = walk(definition);
    if (!result.ok) return result;
    const built = result.value;
    switch (definition.kind) {
      case "primitive":
      case "unit":
        units.set(definition.name, asQuantity(built));
        break;
      case "prefix":
        prefixes.set(definition.name, asQuantity(built).magnitude);
        break;
      case "function":
        functions.set(definition.name, asFunction(built));
        break;
    }
  }
  return ok({ primitives, prefixes, units, unitLists, functions, builtins });
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
  builtins: Builtins,
): Result<Index, BuildError> {
  const prefixes = new Map<string, PrefixDefinition>();
  const units = new Map<string, UnitDefinition>();
  const unitLists = new Map<string, UnitListDefinition>();
  const functions = new Map<string, FunctionDefinition>();
  for (const definition of definitions) {
    const first: Definition | BuiltinName | undefined =
      definition.kind === "prefix"
        ? prefixes.get(definition.name)
        : (units.get(definition.name) ??
          unitLists.get(definition.name) ??
          functions.get(definition.name) ??
          (builtins.has(definition.name)
            ? { kind: "builtin", name: definition.name }
            : undefined));
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
      case "function":
        functions.set(definition.name, definition);
        break;
    }
  }
  return ok({ prefixes, units, unitLists, functions, builtins });
}

// ---------------------------------------------------------------------------
// Evaluating one definition

/**
 * What the node `definition` evaluates to: a primitive is one of itself, a
 * unit is what its body evaluates to, a prefix is what its body evaluates
 * to, provided that is a plain number, and a function is its checked self.
 */
function evaluateNode(
  definition: Node,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<Built, BuildError> {
  switch (definition.kind) {
    case "primitive":
      return ok(
        quantity({
          magnitude: exact(ONE),
          dimension: primitive(definition.name),
        }),
      );
    case "unit": {
      const body = evaluate(definition.body, lookup, primitives, context);
      return body.ok ? ok(quantity(body.value)) : body;
    }
    case "prefix": {
      const body = evaluate(definition.body, lookup, primitives, context);
      if (!body.ok) return body;
      const { dimension } = body.value;
      return isDimensionless(dimension)
        ? ok(quantity(body.value))
        : err({ kind: "dimensionedPrefix", definition, dimension });
    }
    case "function": {
      const fn = checkFunction(definition, lookup, primitives, context);
      return fn.ok ? ok({ kind: "function", value: fn.value }) : fn;
    }
  }
}

function quantity(value: Quantity): Built {
  return { kind: "quantity", value };
}

/** The quantity of a node that denotes one; a function's node never reaches here. */
function asQuantity(built: Built): Quantity {
  if (built.kind !== "quantity") {
    throw new Error("A unit or prefix definition evaluated to a function");
  }
  return built.value;
}

function asFunction(built: Built): UnitFunction {
  if (built.kind !== "function") {
    throw new Error("A function definition evaluated to a quantity");
  }
  return built.value;
}

/**
 * The function `definition` defines, once checked: its declared units
 * evaluated, its forward body's dimension taken with the parameter bound
 * to the declared argument's dimension and found to conform to the
 * declared result, and its inverse body's with the name bound to the
 * declared result's dimension and found to conform to the declared
 * argument. A body's failure is reported as it is, with its span in the
 * definitions text, where it belongs.
 */
function checkFunction(
  definition: FunctionDefinition,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<UnitFunction, BuildError> {
  const argument = evaluateDeclared(
    definition,
    "argument",
    lookup,
    primitives,
    context,
  );
  if (!argument.ok) return argument;
  const result = evaluateDeclared(
    definition,
    "result",
    lookup,
    primitives,
    context,
  );
  if (!result.ok) return result;
  const fn: UnitFunction = {
    name: definition.name,
    parameter: definition.parameter,
    argument: argument.value,
    result: result.value,
    forward: definition.forward,
    inverse: definition.inverse,
  };
  const forward = dimensionOf(
    definition.forward,
    boundDimensions(
      definition.parameter,
      argument.value.quantity.dimension,
      lookup,
    ),
    primitives,
  );
  if (!forward.ok) return err(forward.error);
  const forwardConforms = checkConformance(
    forward.value,
    result.value.quantity.dimension,
    primitives,
  );
  if (!forwardConforms.ok) {
    return err({
      kind: "functionMismatch",
      definition,
      body: "forward",
      mismatch: forwardConforms.error,
    });
  }
  const inverse = dimensionOf(
    definition.inverse,
    boundDimensions(definition.name, result.value.quantity.dimension, lookup),
    primitives,
  );
  if (!inverse.ok) return err(inverse.error);
  const inverseConforms = checkConformance(
    inverse.value,
    argument.value.quantity.dimension,
    primitives,
  );
  if (!inverseConforms.ok) {
    return err({
      kind: "functionMismatch",
      definition,
      body: "inverse",
      mismatch: inverseConforms.error,
    });
  }
  return ok(fn);
}

/**
 * The lookup over dimensions a body is checked with: `name`, the bound
 * parameter or function name, is `dimension` before any unit, and every
 * other name is the walk's lookup's quantity, reduced to its dimension.
 */
function boundDimensions(
  name: string,
  dimension: Dimension,
  lookup: Lookup<BuildError>,
): DimensionLookup<BuildError> {
  return {
    unit: (unit, span) => {
      if (unit === name) return ok(dimension);
      const found = lookup.unit(unit, span);
      return found.ok ? ok(found.value.dimension) : found;
    },
    function: lookup.function,
  };
}

/** The declared `unit` of the function `definition`, evaluated, with its text; a ball containing zero is rejected. */
function evaluateDeclared(
  definition: FunctionDefinition,
  unit: "argument" | "result",
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<WrittenUnit, BuildError> {
  const declared = definition[unit];
  const value = evaluate(declared.expr, lookup, primitives, context);
  if (!value.ok) return value;
  if (containsZero(value.value.magnitude)) {
    return err({ kind: "zeroDeclaredUnit", definition, unit });
  }
  return ok({ text: declared.text, quantity: value.value });
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
  context: NumberContext,
): Result<UnitList, BuildError> {
  const units: ListedUnit[] = [];
  for (const item of definition.items) {
    const quantity = evaluate(item.expr, lookup, primitives, context);
    if (!quantity.ok) return quantity;
    units.push({ text: item.text, quantity: quantity.value });
  }
  const checked = convertToList(
    units[0]!.quantity,
    units.map((unit) => unit.quantity),
    primitives,
    context,
  );
  if (!checked.ok) {
    return err({ kind: "invalidUnitList", definition, error: checked.error });
  }
  return ok(units);
}

/**
 * The lookup for the bodies being evaluated: resolves a name through the
 * index and requests the definitions it means through `visit`, and a
 * call's name among the functions first and the built-ins second, as the
 * table's lookup will. A cycle is located at the reference that closed
 * it; any other failure of a dependency is passed up as it is. Outside the
 * walk, the walker itself serves as `visit`, since a request from the top
 * never closes a cycle.
 */
function lookupIn(
  index: Index,
  visit: Visit<Node, Built, BuildError>,
): Lookup<BuildError> {
  return {
    unit: (name, span) => {
      const found = resolveName(name, index.prefixes, index.units);
      if (found === undefined) {
        const arity = functionArity(name, index.functions, index.builtins);
        return err(
          arity === undefined
            ? { kind: "unknownUnit", name, span }
            : { kind: "functionAsUnit", name, span, arity },
        );
      }
      const unit = locate(visit(found.unit), span);
      if (!unit.ok) return unit;
      if (found.kind === "unit") return ok(asQuantity(unit.value));
      const prefix = locate(visit(found.prefix), span);
      if (!prefix.ok) return prefix;
      const product = multiplyQuantities(
        asQuantity(prefix.value),
        asQuantity(unit.value),
      );
      if (product.ok) return product;
      // A prefix and a unit each within the exponent bound multiply to
      // within it unless both are at its edge, which the definitions the
      // app ships are nowhere near; a product fails only there.
      const { error } = product;
      if (error.kind !== "tooLarge") {
        throw new Error(`A prefix times a unit failed: ${error.kind}`);
      }
      return err({ kind: "tooLarge", span, limit: error.limit });
    },
    function: (name, span, call) => {
      const found = index.functions.get(name);
      if (found === undefined) {
        const builtin = resolveFunction(name, new Map(), index.builtins);
        if (builtin !== undefined) return ok(builtin);
        return err({
          kind: "notAFunction",
          name,
          span,
          call,
          otherwise: otherwiseOf(
            resolveName(name, index.prefixes, index.units),
          ),
        });
      }
      const fn = locate(visit(found), span);
      return fn.ok ? ok({ kind: "defined", fn: asFunction(fn.value) }) : fn;
    },
  };
}

/** Turns a `Cycle` closed by the reference at `span` into a build error. */
function locate(
  result: Result<Built, BuildError | Cycle<Node>>,
  span: Span,
): Result<Built, BuildError> {
  if (result.ok) return result;
  const { error } = result;
  return error.kind === "cycle"
    ? err({ kind: "circularDefinition", definitions: error.nodes, span })
    : err(error);
}
