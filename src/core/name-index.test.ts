import assert from "node:assert/strict";
import { test } from "node:test";
import { indexNames, namesStartingWith } from "./name-index.ts";

const NAMES = ["b", "abd", "a", "ac", "abc", "ab", "abcd"];
const INDEX = indexNames(NAMES);

test("an index sorts its names, whatever order they were given in", () => {
  assert.deepEqual(INDEX.sorted, ["a", "ab", "abc", "abcd", "abd", "ac", "b"]);
  assert.deepEqual(indexNames([]).sorted, []);
  assert.deepEqual(indexNames(new Set(["x"])).sorted, ["x"]);
});

test("the names starting with a text are found, in order", () => {
  assert.deepEqual(namesStartingWith(INDEX, "ab"), [
    "ab",
    "abc",
    "abcd",
    "abd",
  ]);
  assert.deepEqual(namesStartingWith(INDEX, "abc"), ["abc", "abcd"]);
});

test("the text itself is among them when it is a name", () => {
  assert.deepEqual(namesStartingWith(INDEX, "a"), [
    "a",
    "ab",
    "abc",
    "abcd",
    "abd",
    "ac",
  ]);
  assert.deepEqual(namesStartingWith(INDEX, "abcd"), ["abcd"]);
});

test("a text that no name starts with finds nothing", () => {
  assert.deepEqual(namesStartingWith(INDEX, "abe"), []);
  assert.deepEqual(namesStartingWith(INDEX, "c"), []);
  assert.deepEqual(namesStartingWith(INDEX, "aa"), []);
  assert.deepEqual(namesStartingWith(INDEX, "abcde"), []);
});

test("a text that sorts before or after every name finds nothing", () => {
  assert.deepEqual(namesStartingWith(INDEX, " "), []);
  assert.deepEqual(namesStartingWith(INDEX, "z"), []);
});

test("a text within a name but not at its start does not match it", () => {
  assert.deepEqual(namesStartingWith(INDEX, "bc"), []);
  assert.deepEqual(namesStartingWith(INDEX, "d"), []);
});

test("matches at either end of the index are found", () => {
  assert.deepEqual(namesStartingWith(INDEX, "b"), ["b"]);
  assert.deepEqual(namesStartingWith(indexNames(["b", "a"]), "a"), ["a"]);
  assert.deepEqual(namesStartingWith(indexNames(["b", "a"]), "b"), ["b"]);
  assert.deepEqual(namesStartingWith(indexNames(["only"]), "on"), ["only"]);
});

test("an empty text matches every name", () => {
  assert.deepEqual(namesStartingWith(INDEX, ""), INDEX.sorted);
  assert.deepEqual(namesStartingWith(indexNames([]), ""), []);
});

test("an empty index finds nothing", () => {
  assert.deepEqual(namesStartingWith(indexNames([]), "a"), []);
});

test("names in any script are ordered and matched alike", () => {
  const index = indexNames(["µs", "m", "µm", "mm", "μ"]);
  assert.deepEqual(index.sorted, ["m", "mm", "µm", "µs", "μ"]);
  assert.deepEqual(namesStartingWith(index, "µ"), ["µm", "µs"]);
  assert.deepEqual(namesStartingWith(index, "m"), ["m", "mm"]);
  assert.deepEqual(namesStartingWith(index, "μ"), ["μ"]);
});

test("the result is a copy", () => {
  const index = indexNames(["a", "ab"]);
  const found = namesStartingWith(index, "a") as string[];
  found.pop();
  assert.deepEqual(index.sorted, ["a", "ab"]);
});
