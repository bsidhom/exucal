// The unit table: what `buildTable` produces and what the rest of the app
// reads. ARCHITECTURE.md ("Definitions") gives the overview; `build.ts` is
// the builder, and this module holds only the finished table and its lookup.
//
// The units map holds every name a user can type as a unit, the primitives
// included, so that a lookup is one map read; the primitives map beside it
// is what the conformance check needs, the roles in declaration order. A
// prefix is stored as its factor alone, a ball, since the builder has checked
// that its body is a plain number. The unit lists are apart from the units: a
// list's name is not a unit (a body or a `have` that names one is an
// unknown unit), and only a `want` that is exactly a list's name means the
// list. Each unit of a list keeps the text it was defined as, for the
// converter to show beside its term.
//
// The functions are apart from the units in the same way (docs/functions.md):
// a function's name means something only in a call, `tempC(100)`, or as a
// `want` on its own, and typed as a unit it is a `functionAsUnit` error,
// which says so and carries the count of arguments the function takes, so
// that the message can show the call form. A function is held as its two
// bodies, as expressions, with the units it declares for its argument and
// its result, each with its text as written, since the converter writes a
// recovered argument in it; the builder has checked the bodies against
// the declaration, so a call can fail only on its argument or on a value.
// The built-ins (builtins.ts, docs/builtins.md) share the namespace: the
// table carries the set it was built against, the builder having kept the
// two disjoint, and the name of a call resolves among the defined
// functions first and the built-ins second, as a `ResolvedFunction` that
// says which kind it found. A name that is neither is a `notAFunction`
// error that says what the name is otherwise, so that the message for
// `kg(m/s)` can show the product the user probably meant.

import type { NumberContext } from "./context.ts";
import type { Ball } from "./ball.ts";
import type { Builtin, Builtins } from "./builtin.ts";
import { DIMENSIONLESS, type Primitives } from "./dimension.ts";
import { ONE_ARGUMENT, type Arity, type Lookup } from "./evaluate.ts";
import type { Expr } from "./expr.ts";
import { resolveName, type Resolution } from "./names.ts";
import {
  multiplyQuantities,
  settleQuantity,
  type Quantity,
} from "./quantity.ts";
import { err, ok } from "./result.ts";
import type { Span } from "./span.ts";

export type UnitTable = {
  /** The primitives with their roles, in declaration order. */
  readonly primitives: Primitives;
  /** The factor of each prefix, by name without the dash: a plain number's ball. */
  readonly prefixes: ReadonlyMap<string, Ball>;
  /** The quantity of each unit, by name; the primitives are among them. */
  readonly units: ReadonlyMap<string, Quantity>;
  /** The units of each unit list, by name, largest first. */
  readonly unitLists: ReadonlyMap<string, UnitList>;
  /** The functions, by name. */
  readonly functions: ReadonlyMap<string, UnitFunction>;
  /** The built-ins the table was built against, disjoint from the functions and the units. */
  readonly builtins: Builtins;
};

/** A unit list: two or more units, all of one dimension, positive and decreasing. */
export type UnitList = readonly ListedUnit[];

/** A unit with the `text` it was written as, for the converter to show. */
export type WrittenUnit = {
  readonly text: string;
  readonly quantity: Quantity;
};

/** One unit of a unit list. */
export type ListedUnit = WrittenUnit;

/**
 * A function: `forward` is its body, in which `parameter` stands for the
 * argument, and `inverse` the body of its inverse, in which `name` stands
 * for the value. `argument` and `result` are the units it declares for the
 * two: the builder has checked that `forward` conforms to `result` and
 * `inverse` to `argument`, and that each is nonzero.
 */
export type UnitFunction = {
  readonly name: string;
  readonly parameter: string;
  readonly argument: WrittenUnit;
  readonly result: WrittenUnit;
  readonly forward: Expr;
  readonly inverse: Expr;
};

/** The name at `span` is neither a unit nor a prefix followed by one. */
export type UnknownUnit = {
  readonly kind: "unknownUnit";
  readonly name: string;
  readonly span: Span;
};

/** What a call's name resolves to: a function the table defines, or a built-in. */
export type ResolvedFunction =
  | { readonly kind: "defined"; readonly fn: UnitFunction }
  | { readonly kind: "builtin"; readonly fn: Builtin };

/**
 * The name at `span`, used as a unit, is a function, which only a call
 * applies; `arity` is how many arguments it takes, for the call form the
 * message shows.
 */
export type FunctionAsUnit = {
  readonly kind: "functionAsUnit";
  readonly name: string;
  readonly span: Span;
  readonly arity: Arity;
};

/**
 * The name at `span`, called at `call`, is not a function; `otherwise`
 * says what it is instead, so that a message can show the product the
 * call probably stood for.
 */
export type NotAFunction = {
  readonly kind: "notAFunction";
  readonly name: string;
  readonly span: Span;
  readonly call: Span;
  readonly otherwise: "unit" | "prefixedUnit" | "nothing";
};

/** Why a name in the input means nothing, or not what it was used as. */
export type LookupError = UnknownUnit | FunctionAsUnit | NotAFunction;

/**
 * The lookup the evaluator resolves user input against, at the working
 * `context`: an exact unit name if the table has one, otherwise one prefix
 * followed by a unit name, whose quantity is the unit's scaled by the
 * prefix's factor, each settled to the context's precision; and, for a
 * call, a function by its name, defined first and built-in second.
 */
export function unitLookup(
  table: UnitTable,
  context: NumberContext,
): Lookup<LookupError> {
  return {
    unit: (name, span) => {
      const found = resolveName(name, table.prefixes, table.units);
      if (found === undefined) {
        const arity = functionArity(name, table.functions, table.builtins);
        return err(
          arity === undefined
            ? { kind: "unknownUnit", name, span }
            : { kind: "functionAsUnit", name, span, arity },
        );
      }
      // Settled once here (D15): a unit built at a higher precision is cut
      // to the working one, and an exact unit is untouched.
      return ok(
        settleQuantity(
          found.kind === "unit"
            ? found.unit
            : multiplyQuantities(
                { magnitude: found.prefix, dimension: DIMENSIONLESS },
                found.unit,
              ),
          context,
        ),
      );
    },
    function: (name, span, call) => {
      const found = resolveFunction(name, table.functions, table.builtins);
      if (found !== undefined) return ok(found);
      return err({
        kind: "notAFunction",
        name,
        span,
        call,
        otherwise: otherwiseOf(resolveName(name, table.prefixes, table.units)),
      });
    },
  };
}

/**
 * The function `name` resolves to among `functions` and then `builtins`,
 * or `undefined`. The build's lookup applies the same order over the
 * definitions it indexes.
 */
export function resolveFunction(
  name: string,
  functions: ReadonlyMap<string, UnitFunction>,
  builtins: Builtins,
): ResolvedFunction | undefined {
  const defined = functions.get(name);
  if (defined !== undefined) return { kind: "defined", fn: defined };
  const builtin = builtins.get(name);
  return builtin === undefined ? undefined : { kind: "builtin", fn: builtin };
}

/**
 * How many arguments the function `name` takes, among `functions` (one)
 * and `builtins`, or `undefined` when there is no such function: what a
 * `functionAsUnit` error carries.
 */
export function functionArity<F>(
  name: string,
  functions: ReadonlyMap<string, F>,
  builtins: Builtins,
): Arity | undefined {
  if (functions.has(name)) return ONE_ARGUMENT;
  return builtins.get(name)?.arity;
}

/** What a name that is not a function is, from its resolution as a unit. */
export function otherwiseOf(
  found: Resolution<unknown, unknown> | undefined,
): NotAFunction["otherwise"] {
  if (found === undefined) return "nothing";
  return found.kind === "unit" ? "unit" : "prefixedUnit";
}
