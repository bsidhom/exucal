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
// a few dozen at most, and every body exercises the evaluator.

import { between, word, type Random } from "./harness.ts";

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
  const units = [...syntheticUnits(rand, unitCount).keys()];
  const lines = ["LENGTH !", "TIME !"];
  for (const prefix of syntheticPrefixes(rand, prefixCount).keys()) {
    lines.push(`${prefix}- 1000`);
  }
  units.forEach((unit, i) => {
    const earlier = i === 0 ? "LENGTH" : units[between(rand, 0, i - 1)];
    lines.push(`${unit} 1.5 ${earlier} / TIME`);
  });
  return lines.join("\n");
}
