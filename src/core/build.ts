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
// would mean the function, and typed as the have a prefixed unit. A
// function is a node of the walk, so that a unit may be defined by a call,
// a body may call another function, and a cycle through a function is
// reported like any other. Checking a function (devdocs/design/functions.md) means
// evaluating its annotations and taking its body's dimension without
// evaluating it (dimension-of.ts), with the parameter bound to its
// annotation's dimension (a plain number without one), through the walk's
// own lookup, with each parameter bound to its annotation's dimension;
// that dimension is the function's result, checked against the result's
// annotation when there is one. That catches a body of the wrong
// dimension, or one that refers to nothing, at load time, so that a call
// at run time can fail only on its argument or on a value; a body that
// fails at some value, or at every value (`1 / (x - 1)`, `1 / 0`), builds
// and fails at the call, where the first version of the check, which
// evaluated the body at one of the declared unit, refused it. An
// annotation whose ball contains zero (an exact zero, or an inexact value
// around it) is rejected as well, since a recovered argument is written
// as a count of the parameter's and nothing is a count of either.
// A function's conditions are checked as its body is, over dimensions:
// each term's dimension taken with the parameters bound, each conforming
// to the next (`nonconformingComparison`), and each condition mentioning a
// parameter (`conditionWithoutParameter`), the names it mentions kept
// for the messages; a call in a condition is a dependency of the walk, so
// a cycle through one is reported like any other. What the build does
// evaluate (a unit's body, a list's units, an annotation) may call a
// function whose condition cannot be decided, and since a unit has
// nowhere to carry the warning and the table is built at the ceiling,
// where no later pass could decide it, that is an `undecidedCondition`
// that fails the build (`evaluateDecided`).
//
// An inverse, `~name(p) = body`, is optional, and keyed by its function's
// name apart from every namespace, so a second one for a function is a
// duplicate and one whose function is not defined is an `orphanInverse`.
// Nothing can refer to an inverse, so, like a list, it stays out of the
// walk and is checked in its place in the order, requesting its function
// from the top (which can never close a cycle, so an inverse may call its
// own function): its function must have one parameter, since only the
// argument of such a function can be recovered from its value
// (`inverseArity` otherwise), and its body's dimension, with its own
// parameter bound to the function's result, must conform to what that
// parameter takes, and its conditions are checked as a function's are.
// The finished functions carry their inverses.
//
// The first failure ends the build. Errors within a body (an unknown name,
// a division by zero, a reference that closes a cycle) carry the span of
// the text at fault, which is an offset into the whole definitions text;
// errors about a definition as a whole (a duplicate, a prefix whose body is
// not a plain number) carry the definition, whose span covers its text.

import type { Condition, Definition, WrittenExpr } from "./definitions.ts";
import {
  DIMENSIONLESS,
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
import {
  evaluate,
  type Assumption,
  type EvaluateError,
  type Lookup,
} from "./evaluate.ts";
import type { Expr } from "./expr.ts";
import { walker, type Cycle, type Visit } from "./graph.ts";
import { findAmbiguity, resolveName, type Split } from "./names.ts";
import { multiplyQuantities, type Quantity } from "./quantity.ts";
import { containsZero, exact, type Ball } from "./ball.ts";
import type { Builtins } from "./builtin.ts";
import { BUILTINS } from "./builtins.ts";
import { checkContext, type NumberContext } from "./context.ts";
import { err, ok, type Result } from "./result.ts";
import { ONE, isRefusal } from "./scaled.ts";
import type { Span } from "./span.ts";
import {
  functionArity,
  otherwiseOf,
  resolveFunction,
  type ListedUnit,
  type LookupError,
  type FunctionCondition,
  type FunctionParameter,
  type UnitFunction,
  type UnitInverse,
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
export type InverseDefinition = Extract<Definition, { kind: "inverse" }>;
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
  /**
   * The body of the function or inverse `definition` does not conform to
   * what it should give, as `mismatch` says: a function's to its result's
   * annotation, an inverse's to its function's parameter.
   */
  | {
      readonly kind: "functionMismatch";
      readonly definition: FunctionDefinition | InverseDefinition;
      readonly mismatch: ConformanceError;
    }
  /** The inverse `definition` names no function that is defined. */
  | { readonly kind: "orphanInverse"; readonly definition: InverseDefinition }
  /**
   * The inverse `definition` is of a function with `parameters`
   * parameters, other than one: only the argument of a function of one
   * can be recovered from its value.
   */
  | {
      readonly kind: "inverseArity";
      readonly definition: InverseDefinition;
      readonly parameters: number;
    }
  /**
   * The annotation of the function `definition`'s result, or of its
   * `parameter` (`argument`), is zero, or cannot be told from it; nothing
   * is a count of either.
   */
  | {
      readonly kind: "zeroDeclaredUnit";
      readonly definition: FunctionDefinition;
      readonly unit: "result";
    }
  | {
      readonly kind: "zeroDeclaredUnit";
      readonly definition: FunctionDefinition;
      readonly unit: "argument";
      readonly parameter: string;
    }
  /**
   * The condition at `span` of the function or inverse `definition`
   * compares terms, at `left` and `right`, that do not conform, as
   * `mismatch` says with the left term's dimension as its `have`.
   */
  | {
      readonly kind: "nonconformingComparison";
      readonly definition: FunctionDefinition | InverseDefinition;
      readonly span: Span;
      readonly left: Span;
      readonly right: Span;
      readonly mismatch: ConformanceError;
    }
  /**
   * The condition at `span` of the function or inverse `definition`
   * mentions none of its parameters, so it could only always hold or
   * never.
   */
  | {
      readonly kind: "conditionWithoutParameter";
      readonly definition: FunctionDefinition | InverseDefinition;
      readonly span: Span;
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
  /** The inverses, by the name of their function, apart from every namespace. */
  readonly inverses: ReadonlyMap<string, InverseDefinition>;
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
  for (const inverse of index.inverses.values()) {
    if (!index.functions.has(inverse.name)) {
      return err({ kind: "orphanInverse", definition: inverse });
    }
  }
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
    evaluateNode(
      definition,
      lookupIn(index, visit, context),
      primitives,
      context,
    ),
  );
  const prefixes = new Map<string, Ball>();
  const units = new Map<string, Quantity>();
  const unitLists = new Map<string, UnitList>();
  const functions = new Map<string, UnitFunction>();
  const inverses = new Map<string, UnitInverse>();
  for (const definition of definitions) {
    if (definition.kind === "inverse") {
      // Nothing refers to an inverse either, and its function is requested
      // from the top, so the inverse may call it.
      const inverse = checkInverse(
        definition,
        lookupIn(index, walk, context),
        primitives,
        context,
      );
      if (!inverse.ok) return inverse;
      inverses.set(definition.name, inverse.value);
      continue;
    }
    if (definition.kind === "unitList") {
      // Nothing refers to a list, so its items are evaluated outside the
      // walk, requesting what they refer to from the top.
      const list = evaluateUnitList(
        definition,
        lookupIn(index, walk, context),
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
  for (const [name, inverse] of inverses) {
    functions.set(name, { ...functions.get(name)!, inverse });
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
  const inverses = new Map<string, InverseDefinition>();
  for (const definition of definitions) {
    const first: Definition | BuiltinName | undefined =
      definition.kind === "prefix"
        ? prefixes.get(definition.name)
        : definition.kind === "inverse"
          ? inverses.get(definition.name)
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
      case "inverse":
        inverses.set(definition.name, definition);
        break;
    }
  }
  return ok({ prefixes, units, unitLists, functions, inverses, builtins });
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
      const body = evaluateDecided(
        definition.body,
        lookup,
        primitives,
        context,
      );
      return body.ok ? ok(quantity(body.value)) : body;
    }
    case "prefix": {
      const body = evaluateDecided(
        definition.body,
        lookup,
        primitives,
        context,
      );
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
 * The function `definition` defines, once checked: its annotations
 * evaluated, its body's dimension taken with each parameter bound to its
 * annotation's dimension (plain without one), and that dimension, the
 * result's, found to conform to the result's annotation when there is
 * one. A body's failure is reported as it is, with its span in the
 * definitions text, where it belongs. The inverse is attached later.
 */
function checkFunction(
  definition: FunctionDefinition,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<UnitFunction, BuildError> {
  const parameters: FunctionParameter[] = [];
  for (const parameter of definition.parameters) {
    let unit: WrittenUnit = PLAIN;
    if (parameter.annotation !== undefined) {
      const evaluated = evaluateAnnotation(
        definition,
        parameter.name,
        parameter.annotation,
        lookup,
        primitives,
        context,
      );
      if (!evaluated.ok) return evaluated;
      unit = evaluated.value;
    }
    parameters.push({ name: parameter.name, unit });
  }
  const dimensions = boundDimensions(
    new Map(
      parameters.map(({ name, unit }) => [name, unit.quantity.dimension]),
    ),
    lookup,
  );
  const result = dimensionOf(
    definition.body,
    dimensions,
    primitives,
    context.significandLimitBits,
  );
  if (!result.ok) return err(result.error);
  const conditions = checkConditions(
    definition,
    definition.conditions,
    dimensions,
    primitives,
    context,
  );
  if (!conditions.ok) return conditions;
  if (definition.result !== undefined) {
    const annotated = evaluateAnnotation(
      definition,
      undefined,
      definition.result,
      lookup,
      primitives,
      context,
    );
    if (!annotated.ok) return annotated;
    const conforms = checkConformance(
      result.value,
      annotated.value.quantity.dimension,
      primitives,
    );
    if (!conforms.ok) {
      return err({
        kind: "functionMismatch",
        definition,
        mismatch: conforms.error,
      });
    }
  }
  return ok({
    name: definition.name,
    parameters,
    result: result.value,
    conditions: conditions.value,
    body: definition.body,
    inverse: undefined,
  });
}

/** What a parameter without an annotation takes: a plain number, written `1`. */
const PLAIN: WrittenUnit = {
  text: "1",
  expr: {
    span: { start: 0, end: 0 },
    node: { kind: "number", value: ONE, text: "1" },
  },
  quantity: { magnitude: exact(ONE), dimension: DIMENSIONLESS },
};

/**
 * The inverse `definition` defines, once checked: its function requested
 * through `lookup`, which the caller gives over the walk itself, so that
 * the request comes from the top and cannot close a cycle, and its body's
 * dimension, taken with its parameter bound to the function's result,
 * found to conform to what the function's parameter takes.
 */
function checkInverse(
  definition: InverseDefinition,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<UnitInverse, BuildError> {
  const fnDefinition = lookup.function(
    definition.name,
    definition.span,
    definition.span,
  );
  if (!fnDefinition.ok) return fnDefinition;
  if (fnDefinition.value.kind !== "defined") {
    // The orphan check has found a defined function of the name.
    throw new Error("An inverse's function is a defined one");
  }
  const fn = fnDefinition.value.fn;
  const [parameter, ...others] = fn.parameters;
  if (parameter === undefined || others.length > 0) {
    return err({
      kind: "inverseArity",
      definition,
      parameters: fn.parameters.length,
    });
  }
  const dimensions = boundDimensions(
    new Map([[definition.parameter, fn.result]]),
    lookup,
  );
  const conditions = checkConditions(
    definition,
    definition.conditions,
    dimensions,
    primitives,
    context,
  );
  if (!conditions.ok) return conditions;
  const body = dimensionOf(
    definition.body,
    dimensions,
    primitives,
    context.significandLimitBits,
  );
  if (!body.ok) return err(body.error);
  const conforms = checkConformance(
    body.value,
    parameter.unit.quantity.dimension,
    primitives,
  );
  if (!conforms.ok) {
    return err({
      kind: "functionMismatch",
      definition,
      mismatch: conforms.error,
    });
  }
  return ok({
    parameter: definition.parameter,
    conditions: conditions.value,
    body: definition.body,
  });
}

/**
 * The lookup over dimensions a body is checked with: each bound parameter
 * of `bindings` is its dimension before any unit, and every other name is
 * the walk's lookup's quantity, reduced to its dimension.
 */
function boundDimensions(
  bindings: ReadonlyMap<string, Dimension>,
  lookup: Lookup<BuildError>,
): DimensionLookup<BuildError> {
  return {
    unit: (unit, span) => {
      const dimension = bindings.get(unit);
      if (dimension !== undefined) return ok(dimension);
      const found = lookup.unit(unit, span);
      return found.ok ? ok(found.value.dimension) : found;
    },
    function: lookup.function,
  };
}

/**
 * The conditions of the function or inverse `definition`, once checked:
 * each term's dimension taken with the parameters bound, as the body's is,
 * through `dimensions`, so that a call in a term is a dependency of the
 * walk as a call in the body is; each term conforming to the next, as a
 * sum's operands must; and each condition mentioning a parameter, which
 * it keeps the names of.
 */
function checkConditions(
  definition: FunctionDefinition | InverseDefinition,
  conditions: readonly Condition[],
  dimensions: DimensionLookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<readonly FunctionCondition[], BuildError> {
  const parameters =
    definition.kind === "function"
      ? definition.parameters.map((parameter) => parameter.name)
      : [definition.parameter];
  const checked: FunctionCondition[] = [];
  for (const condition of conditions) {
    let left: Dimension | undefined;
    for (const [i, term] of condition.terms.entries()) {
      const right = dimensionOf(
        term,
        dimensions,
        primitives,
        context.significandLimitBits,
      );
      if (!right.ok) return err(right.error);
      if (left !== undefined) {
        const conforms = checkConformance(left, right.value, primitives);
        if (!conforms.ok) {
          return err({
            kind: "nonconformingComparison",
            definition,
            span: condition.span,
            left: condition.terms[i - 1]!.span,
            right: term.span,
            mismatch: conforms.error,
          });
        }
      }
      left = right.value;
    }
    const named = new Set<string>();
    for (const term of condition.terms) unitNames(term, named);
    const mentions = parameters.filter((parameter) => named.has(parameter));
    if (mentions.length === 0) {
      return err({
        kind: "conditionWithoutParameter",
        definition,
        span: condition.span,
      });
    }
    checked.push({ ...condition, mentions });
  }
  return ok(checked);
}

/** Adds to `names` every name `expr` uses as a unit, which a parameter is. */
function unitNames(expr: Expr, names: Set<string>): void {
  const { node } = expr;
  switch (node.kind) {
    case "number":
      return;
    case "unit":
      names.add(node.name);
      return;
    case "binary":
      unitNames(node.left, names);
      unitNames(node.right, names);
      return;
    case "pow":
      unitNames(node.base, names);
      return;
    case "neg":
      unitNames(node.operand, names);
      return;
    case "call":
      for (const argument of node.arguments) unitNames(argument, names);
      return;
  }
}

/**
 * `expr` evaluated as a definition's is: with no condition of a call left
 * undecided, since a unit, a list's unit or an annotation has nowhere to
 * carry the warning, and a definitions file should not depend on noise.
 * The table is built at the ceiling, so no later pass could decide it.
 */
function evaluateDecided(
  expr: Expr,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, BuildError> {
  const assumptions: Assumption[] = [];
  const value = evaluate(expr, lookup, primitives, context, assumptions);
  const [assumption] = assumptions;
  if (!value.ok || assumption === undefined) return value;
  return err({
    kind: "undecidedCondition",
    name: assumption.name,
    span: expr.span,
    assumption,
  });
}

/**
 * The `annotation` of the function `definition`'s `parameter`, or of its
 * result when `parameter` is `undefined`, evaluated, with its text; a
 * ball containing zero is rejected.
 */
function evaluateAnnotation(
  definition: FunctionDefinition,
  parameter: string | undefined,
  annotation: WrittenExpr,
  lookup: Lookup<BuildError>,
  primitives: Primitives,
  context: NumberContext,
): Result<WrittenUnit, BuildError> {
  const value = evaluateDecided(annotation.expr, lookup, primitives, context);
  if (!value.ok) return value;
  if (containsZero(value.value.magnitude)) {
    return err(
      parameter === undefined
        ? { kind: "zeroDeclaredUnit", definition, unit: "result" }
        : { kind: "zeroDeclaredUnit", definition, unit: "argument", parameter },
    );
  }
  return ok({
    text: annotation.text,
    expr: annotation.expr,
    quantity: value.value,
  });
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
    const quantity = evaluateDecided(item.expr, lookup, primitives, context);
    if (!quantity.ok) return quantity;
    units.push({ text: item.text, expr: item.expr, quantity: quantity.value });
  }
  const checked = convertToList(
    units[0]!.quantity,
    units.map((unit) => unit.quantity),
    primitives,
    context,
  );
  if (!checked.ok) {
    const { error } = checked;
    if (
      error.kind !== "nonconformingUnit" &&
      error.kind !== "nonpositiveUnit" &&
      error.kind !== "unitOutOfOrder"
    ) {
      // A list's arithmetic fails only at the edges of the bound, where
      // no definition's units lie.
      throw new Error("A defined list's units are within the bound");
    }
    return err({ kind: "invalidUnitList", definition, error });
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
  context: NumberContext,
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
        context,
      );
      if (product.ok) return product;
      // A prefix and a unit each within the exponent bound multiply to
      // within it unless both are at its edge, which the definitions the
      // app ships are nowhere near, but a product may be refused all the
      // same, so any refusal is the name's; the significand limit is the node's
      // check (D19), made where the name is evaluated.
      const { error } = product;
      if (!isRefusal(error)) {
        throw new Error(`A prefix times a unit failed: ${error.kind}`);
      }
      return err({ ...error, span });
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
