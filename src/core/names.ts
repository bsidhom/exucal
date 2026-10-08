// Name resolution: the rule by which a name in an expression means a unit.
// devdocs/architecture.md ("Definitions") states it: an exact unit name if there is
// one, otherwise one prefix followed by a unit name. Prefixes do not stack.
//
// `buildTable` applies the rule over definitions while it evaluates them,
// and the finished table applies it over quantities, so the functions here
// are generic in what a prefix or a unit maps to and take the two maps as
// they are. Both maps are keyed by name; a prefix's name is without its
// dash.
//
// `findAmbiguity` is the check that makes resolution unambiguous: a name
// with two different splits is one where a longer prefix and a shorter one
// both fit and what follows each is a unit, so it is found by trying, for
// every prefix that extends another, whether the extension joined to any
// unit is itself a unit. Rather than try every unit, it indexes the unit
// names (`name-index.ts`) and tries only those that start with the
// extension, which for most extensions (`icro`, `eci`) is none: measured
// on tables of 3000 units, that is about a millisecond against tens of
// milliseconds with 76 prefixes, and hundreds with hundreds of prefixes,
// since the cost of trying every unit grows with the number of extending
// pairs. A table without such a name has at most one split for every
// name, and `resolveName` relies on that; given a table that was not
// checked, it takes the split with the shortest prefix.

import { indexNames, namesStartingWith } from "./name-index.ts";

/** What a name resolves to: a unit, or a prefix applied to one. */
export type Resolution<P, U> =
  | { readonly kind: "unit"; readonly unit: U }
  | { readonly kind: "prefixed"; readonly prefix: P; readonly unit: U };

/** A name read as a prefix followed by a unit. */
export type Split = { readonly prefix: string; readonly unit: string };

/** A name with two different splits, the one with the shorter prefix first. */
export type Ambiguity = {
  readonly name: string;
  readonly splits: readonly [Split, Split];
};

/**
 * What `name` means given `prefixes` and `units`, or `undefined` if it is
 * neither a unit nor a prefix followed by one.
 */
export function resolveName<P, U>(
  name: string,
  prefixes: ReadonlyMap<string, P>,
  units: ReadonlyMap<string, U>,
): Resolution<P, U> | undefined {
  const exact = units.get(name);
  if (exact !== undefined) return { kind: "unit", unit: exact };
  for (let i = 1; i < name.length; i++) {
    const prefix = prefixes.get(name.slice(0, i));
    if (prefix === undefined) continue;
    const unit = units.get(name.slice(i));
    if (unit !== undefined) return { kind: "prefixed", prefix, unit };
  }
  return undefined;
}

/**
 * The first name with two different splits, taking the prefixes in the
 * order of `prefixes` and the units in name order, or `undefined` if none
 * has. Costs a sort of the unit names, and then one lookup for each unit
 * that starts with the extension of each pair of prefixes where one extends
 * the other.
 */
export function findAmbiguity(
  prefixes: ReadonlyMap<string, unknown>,
  units: ReadonlyMap<string, unknown>,
): Ambiguity | undefined {
  const index = indexNames(units.keys());
  for (const long of prefixes.keys()) {
    for (let i = 1; i < long.length; i++) {
      const short = long.slice(0, i);
      if (!prefixes.has(short)) continue;
      const extension = long.slice(i);
      for (const whole of namesStartingWith(index, extension)) {
        // A unit that is the extension itself leaves nothing to be a unit.
        const unit = whole.slice(extension.length);
        if (unit.length > 0 && units.has(unit)) {
          return {
            name: short + whole,
            splits: [
              { prefix: short, unit: whole },
              { prefix: long, unit },
            ],
          };
        }
      }
    }
  }
  return undefined;
}
