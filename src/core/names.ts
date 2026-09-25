// Name resolution: the rule by which a name in an expression means a unit.
// ARCHITECTURE.md ("Definitions") states it: an exact unit name if there is
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
// unit is itself a unit. A table without such a name has at most one split
// for every name, and `resolveName` relies on that; given a table that was
// not checked, it takes the split with the shortest prefix.

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
 * The first name, in the order of `prefixes` and then of `units`, that has
 * two different splits, or `undefined` if none does. Costs one lookup per
 * unit for each pair of prefixes where one extends the other.
 *
 * TODO: Index the units so that each pair tries only the units that start
 * with its extension, instead of every unit. A sorted array of the unit
 * names with a binary search for the range that starts with the extension
 * does it (a trie would too); for most extensions (`icro`, `eci`) the range
 * is empty. Measured on synthetic tables of 3000 units, the check as
 * written takes about 16 ms with 76 prefixes (some 50 pairs, and a third
 * of the whole build) and about 480 ms with 1000 prefixes (nearly all of
 * it), while the indexed check takes about 1 ms in both cases. It matters
 * once the table is rebuilt as the user edits definitions, or once user
 * definitions can add many prefixes; until then the build runs once.
 */
export function findAmbiguity(
  prefixes: ReadonlyMap<string, unknown>,
  units: ReadonlyMap<string, unknown>,
): Ambiguity | undefined {
  for (const long of prefixes.keys()) {
    for (let i = 1; i < long.length; i++) {
      const short = long.slice(0, i);
      if (!prefixes.has(short)) continue;
      const extension = long.slice(i);
      for (const unit of units.keys()) {
        if (units.has(extension + unit)) {
          return {
            name: long + unit,
            splits: [
              { prefix: short, unit: extension + unit },
              { prefix: long, unit },
            ],
          };
        }
      }
    }
  }
  return undefined;
}
