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
// a few dozen at most, and every body exercises the evaluator. A unit named
// like one of the app's built-ins (`lcm`), or that would make one read as
// a prefix followed by it (`i` beside the prefix `p`, for `pi`), is
// renamed, since built-ins share the unit namespace and the build rejects
// such a table as it would a real one; the draws are untouched. The first
// case went unnoticed from stage 6.1, when `lcm` became a built-in, to
// issue #135: the build failed before the benchmark's assertion.
// Every name is a pure function of the key and its index, so the units,
// the prefixes and the references are drawn from keys of their own and
// none depends on how many of the others were drawn.
//
// A synthetic file of functions (`syntheticFunctions`) has two primitives
// and functions of a length that each call one earlier function and have
// an inverse line, some with a result annotation, so that parsing goes
// through function heads and building walks calls and checks every
// inverse. Their names, `f0`, `f1`, ..., cannot read as a built-in or as a
// prefixed unit, since the file has no prefixes.

import { BUILTINS } from "../src/core/builtins.ts";
import { between, foldIn, split, type Key } from "../src/testing/random.ts";
import { word } from "./harness.ts";

const PREFIX_LETTERS = "nopqrstuvwxyz";
const UNIT_LETTERS = "abcdefghijklm";

/** `count` distinct names of `minLength` to `maxLength` letters, each mapped to itself. */
function names(
  key: Key,
  count: number,
  alphabet: string,
  minLength: number,
  maxLength: number,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (let i = 0; result.size < count; i++) {
    const [letters, length] = split(foldIn(key, i));
    const name = word(
      letters!,
      alphabet,
      between(length!, minLength, maxLength),
    );
    result.set(name, name);
  }
  return result;
}

export function syntheticPrefixes(
  key: Key,
  count: number,
): ReadonlyMap<string, string> {
  return names(key, count, PREFIX_LETTERS, 1, 5);
}

export function syntheticUnits(
  key: Key,
  count: number,
): ReadonlyMap<string, string> {
  return names(key, count, UNIT_LETTERS, 1, 10);
}

/** A definitions file of `prefixCount` prefixes and `unitCount` units. */
export function syntheticDefinitions(
  key: Key,
  prefixCount: number,
  unitCount: number,
): string {
  // The units, the prefixes and the references each have a key of their
  // own, and a unit named like a built-in, or that would make one read as
  // a prefix followed by it, is renamed with a trailing underscore, which
  // no drawn name has, so that the table is the same data key for key but
  // for those names.
  const [unitKey, prefixKey, referenceKey] = split(key, 3);
  const drawn = [...syntheticUnits(unitKey!, unitCount).keys()];
  const prefixes = [...syntheticPrefixes(prefixKey!, prefixCount).keys()];
  const forbidden = new Set(
    prefixes.flatMap((prefix) =>
      [...BUILTINS.keys()]
        .filter((name) => name.startsWith(prefix) && name !== prefix)
        .map((name) => name.slice(prefix.length)),
    ),
  );
  const units = drawn.map((unit) =>
    forbidden.has(unit) || BUILTINS.has(unit) ? `${unit}_` : unit,
  );
  const lines = ["LENGTH !", "TIME !"];
  for (const prefix of prefixes) {
    lines.push(`${prefix}- 1000`);
  }
  units.forEach((unit, i) => {
    const earlier =
      i === 0 ? "LENGTH" : units[between(foldIn(referenceKey!, i), 0, i - 1)];
    lines.push(`${unit} 1.5 ${earlier} / TIME`);
  });
  return lines.join("\n");
}

/**
 * A definitions file of `count` functions of a length, each calling one
 * earlier function, each with an inverse, and every other one with a
 * result annotation.
 */
export function syntheticFunctions(key: Key, count: number): string {
  const lines = ["LENGTH !", "TIME !"];
  for (let i = 0; i < count; i++) {
    const earlier = i === 0 ? "x" : `f${between(foldIn(key, i), 0, i - 1)}(x)`;
    const result = i % 2 === 0 ? ": LENGTH " : "";
    lines.push(`f${i}(x: LENGTH) ${result}= ${earlier} + 2 x / 3`);
    lines.push(`~f${i}(y) = 3 y / 5`);
  }
  return lines.join("\n");
}
