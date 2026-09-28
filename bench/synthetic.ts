// Synthetic tables of a chosen size, for measuring how the core scales.
//
// Prefix names are drawn from the letters `n` to `z` and unit names from `a`
// to `m`, so that no name is ambiguous and the ambiguity check scans
// everything: what it costs when it finds nothing is its cost on a table
// that builds. The names are short, like real ones, so prefixes extend one
// another often (`p`, `pq`, `pqr`), more than real prefixes do; the cost of
// the check grows with such pairs, so the tables are the hard case.
//
// A synthetic definitions file has two primitives, the prefixes, and units
// that are each a small expression over one earlier unit, so that building
// it walks a chain of references of the depth such random references make,
// a few dozen at most, and every body exercises the evaluator. A unit that
// would make one of the app's built-ins read as a prefix followed by it
// (`i` beside the prefix `p`, for `pi`) is renamed, since the build
// rejects such a table as it would a real one; the draws are untouched.

import { BUILTINS } from "../src/core/builtins.ts";
import { between, type Random } from "../src/testing/random.ts";
import { word } from "./harness.ts";

const PREFIX_LETTERS = "nopqrstuvwxyz";
const UNIT_LETTERS = "abcdefghijklm";

/** `count` distinct names of `minLength` to `maxLength` letters, each mapped to itself. */
function names(
  rand: Random,
  count: number,
  alphabet: string,
  minLength: number,
  maxLength: number,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  while (result.size < count) {
    const name = word(rand, alphabet, between(rand, minLength, maxLength));
    result.set(name, name);
  }
  return result;
}

export function syntheticPrefixes(
  rand: Random,
  count: number,
): ReadonlyMap<string, string> {
  return names(rand, count, PREFIX_LETTERS, 1, 5);
}

export function syntheticUnits(
  rand: Random,
  count: number,
): ReadonlyMap<string, string> {
  return names(rand, count, UNIT_LETTERS, 1, 10);
}

/** A definitions file of `prefixCount` prefixes and `unitCount` units. */
export function syntheticDefinitions(
  rand: Random,
  prefixCount: number,
  unitCount: number,
): string {
  // The units are drawn before the prefixes, as they always were, and a
  // unit that would make a built-in read as a prefix followed by it is
  // renamed with a trailing underscore, which no drawn name has, so that
  // the table is the same data seed for seed but for that one name.
  const drawn = [...syntheticUnits(rand, unitCount).keys()];
  const prefixes = [...syntheticPrefixes(rand, prefixCount).keys()];
  const forbidden = new Set(
    prefixes.flatMap((prefix) =>
      [...BUILTINS.keys()]
        .filter((name) => name.startsWith(prefix) && name !== prefix)
        .map((name) => name.slice(prefix.length)),
    ),
  );
  const units = drawn.map((unit) => (forbidden.has(unit) ? `${unit}_` : unit));
  const lines = ["LENGTH !", "TIME !"];
  for (const prefix of prefixes) {
    lines.push(`${prefix}- 1000`);
  }
  units.forEach((unit, i) => {
    const earlier = i === 0 ? "LENGTH" : units[between(rand, 0, i - 1)];
    lines.push(`${unit} 1.5 ${earlier} / TIME`);
  });
  return lines.join("\n");
}
