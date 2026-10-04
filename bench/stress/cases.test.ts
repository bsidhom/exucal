import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { parseExpr, parseUnitList } from "../../src/core/expr.ts";
import { checkSettings } from "./harness.ts";
import {
  IDENTITIES,
  chooseSeed,
  costlyCalls,
  drawCase,
  enumerateCases,
  formatSeed,
  listCases,
  parseSeed,
  profilesValid,
} from "./cases.ts";

const SEED = parseSeed("0123456789abcdef");

test("one seed lists the same cases on two runs", () => {
  assert.deepEqual(listCases(SEED, 200), listCases(SEED, 200));
});

test("the i-th case drawn alone is the i-th of the sequence", () => {
  const sequence = listCases(SEED, 100);
  for (const i of [0, 1, 17, 42, 99]) {
    assert.deepEqual(drawCase(SEED, i), sequence[i]);
  }
  // A longer list starts with the shorter one.
  assert.deepEqual(listCases(SEED, 150).slice(0, 100), sequence);
});

test("two seeds list different cases", () => {
  const other = listCases(parseSeed("fedcba9876543210"), 50);
  const same = listCases(SEED, 50).filter(
    (drawn, i) => drawn.case.have === other[i]!.case.have,
  ).length;
  assert.ok(same < 5, `${same} of 50 cases coincide`);
});

test("a run without a seed draws a fresh one, which replays as given", () => {
  const fresh = chooseSeed();
  assert.equal(fresh.fresh, true);
  assert.match(fresh.text, /^[0-9a-f]{16}$/);
  const given = chooseSeed(fresh.text);
  assert.equal(given.fresh, false);
  assert.deepEqual(given.key, fresh.key);
  assert.deepEqual(listCases(given.key, 20), listCases(fresh.key, 20));
  // Two fresh seeds differ.
  assert.notEqual(chooseSeed().text, fresh.text);
});

test("a seed is sixteen hexadecimal digits, its two words in order", () => {
  assert.deepEqual(parseSeed("0123456789ABCDEF"), [0x01234567, 0x89abcdef]);
  assert.equal(formatSeed([0x01234567, 0x89abcdef]), "0123456789abcdef");
  assert.equal(formatSeed([0, 1]), "0000000000000001");
  for (const bad of ["", "0123", "0123456789abcdeg", "0123456789abcdef0"]) {
    assert.throws(() => parseSeed(bad), RangeError, bad);
  }
});

test("every drawn and enumerated case parses, under settings the panel could hold", () => {
  assert.ok(profilesValid());
  for (const drawn of [...listCases(SEED, 500), ...enumerateCases()]) {
    const where = inspect(drawn.case);
    assert.ok(parseExpr(drawn.case.have).ok, where);
    if (drawn.case.want !== "") {
      assert.ok(parseUnitList(drawn.case.want).ok, where);
    }
    checkSettings(drawn.case.settings);
    assert.ok(drawn.calls >= 1, where);
    assert.ok(drawn.family.functions.length >= 1, where);
  }
});

test("the enumeration is fixed and covers every identity", () => {
  const cases = enumerateCases();
  assert.deepEqual(enumerateCases(), cases);
  for (const identity of IDENTITIES) {
    assert.ok(
      cases.some(
        (drawn) => drawn.family.pattern === `identity:${identity.name}`,
      ),
      identity.name,
    );
  }
  for (const drawn of cases) assert.equal(drawn.family.profile, "default");
});

test("the costly calls of a text leave out approx, pi, the edges and the defined functions", () => {
  assert.deepEqual(costlyCalls("beta(0.5, 0.5) - pi()"), {
    names: ["beta"],
    count: 1,
  });
  assert.deepEqual(
    costlyCalls("floor(gamma(approx(2.5)) - gamma(approx(2.5)) + 3)"),
    { names: ["gamma"], count: 2 },
  );
  assert.deepEqual(costlyCalls("tempC(erf(0.3) - erf(0.3) - 273.15)"), {
    names: ["erf"],
    count: 2,
  });
});
