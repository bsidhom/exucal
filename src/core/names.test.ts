import assert from "node:assert/strict";
import { test } from "node:test";
import { findAmbiguity, resolveName } from "./names.ts";

/** A map from each name to itself, in the order given. */
function names(...list: string[]): ReadonlyMap<string, string> {
  return new Map(list.map((name) => [name, name]));
}

const PREFIXES = names("k", "m", "da", "d");
const UNITS = names("m", "s", "min", "in");

test("an exact unit name resolves to the unit", () => {
  assert.deepEqual(resolveName("m", PREFIXES, UNITS), {
    kind: "unit",
    unit: "m",
  });
});

test("a prefix followed by a unit resolves to both", () => {
  assert.deepEqual(resolveName("km", PREFIXES, UNITS), {
    kind: "prefixed",
    prefix: "k",
    unit: "m",
  });
  assert.deepEqual(resolveName("dam", PREFIXES, UNITS), {
    kind: "prefixed",
    prefix: "da",
    unit: "m",
  });
});

test("an exact unit name wins over a split", () => {
  // `min` is the minute, not `m` + `in`.
  assert.deepEqual(resolveName("min", PREFIXES, UNITS), {
    kind: "unit",
    unit: "min",
  });
});

test("prefixes do not stack", () => {
  assert.equal(resolveName("kkm", PREFIXES, UNITS), undefined);
});

test("a name that is neither resolves to nothing", () => {
  assert.equal(resolveName("x", PREFIXES, UNITS), undefined);
  assert.equal(resolveName("kx", PREFIXES, UNITS), undefined);
  assert.equal(resolveName("xm", PREFIXES, UNITS), undefined);
  assert.equal(resolveName("", PREFIXES, UNITS), undefined);
});

test("a prefix alone is not a unit", () => {
  assert.equal(resolveName("k", PREFIXES, UNITS), undefined);
  assert.equal(resolveName("da", PREFIXES, UNITS), undefined);
});

test("a prefix is not read as the empty prefix", () => {
  assert.equal(resolveName("k", names("k"), names("")), undefined);
});

test("resolution reads the maps' values", () => {
  const prefixes = new Map([["k", 1000]]);
  const units = new Map([["m", { unit: "metre" }]]);
  assert.deepEqual(resolveName("km", prefixes, units), {
    kind: "prefixed",
    prefix: 1000,
    unit: { unit: "metre" },
  });
});

test("in an unchecked table, the shortest prefix wins", () => {
  const prefixes = names("d", "da");
  const units = names("m", "am");
  assert.deepEqual(resolveName("dam", prefixes, units), {
    kind: "prefixed",
    prefix: "d",
    unit: "am",
  });
});

test("a table with one split per name is unambiguous", () => {
  assert.equal(findAmbiguity(PREFIXES, UNITS), undefined);
  assert.equal(findAmbiguity(names(), names()), undefined);
  assert.equal(findAmbiguity(names("k"), names()), undefined);
  assert.equal(findAmbiguity(names(), names("m")), undefined);
});

test("a name with two splits is ambiguous", () => {
  // `dam` is `d` + `am` and `da` + `m`.
  assert.deepEqual(findAmbiguity(names("da", "d"), names("m", "am")), {
    name: "dam",
    splits: [
      { prefix: "d", unit: "am" },
      { prefix: "da", unit: "m" },
    ],
  });
});

test("a unit that is also a split is not ambiguous", () => {
  // `min` against `m` + `in`: the exact name wins, so there is one split.
  assert.equal(findAmbiguity(names("m"), names("min", "in")), undefined);
});

test("a prefix that extends another is not ambiguous by itself", () => {
  assert.equal(findAmbiguity(names("d", "da"), names("m")), undefined);
});

test("the first ambiguity in prefix order is reported", () => {
  const prefixes = names("k", "ki", "d", "da");
  const units = names("m", "am", "im");
  assert.deepEqual(findAmbiguity(prefixes, units), {
    name: "kim",
    splits: [
      { prefix: "k", unit: "im" },
      { prefix: "ki", unit: "m" },
    ],
  });
});

test("an ambiguity is found whichever prefix comes first", () => {
  const expected = {
    name: "dam",
    splits: [
      { prefix: "d", unit: "am" },
      { prefix: "da", unit: "m" },
    ],
  };
  assert.deepEqual(findAmbiguity(names("d", "da"), names("m", "am")), expected);
  assert.deepEqual(findAmbiguity(names("da", "d"), names("am", "m")), expected);
});

test("a unit that is an extension itself leaves nothing to split", () => {
  // `da` + `m` is `dam`; `d` + `am` would be its other split, but `am` is
  // not a unit, and `a` alone (the extension) completes nothing.
  assert.equal(findAmbiguity(names("d", "da"), names("a", "m")), undefined);
});

test("an ambiguity is found among many units that start alike", () => {
  const units = names("m", "aa", "ab", "ac", "am", "az");
  assert.deepEqual(findAmbiguity(names("d", "da"), units), {
    name: "dam",
    splits: [
      { prefix: "d", unit: "am" },
      { prefix: "da", unit: "m" },
    ],
  });
});
