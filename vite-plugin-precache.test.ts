import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAst } from "vite";
import {
  injectManifest,
  isDataLiteral,
  type Expression,
} from "./vite-plugin-precache.ts";

const version = "0123456789abcdef";

/** Parses `source` as a single expression statement and returns it. */
function expression(source: string): Expression {
  const [statement] = parseAst(`(${source});`).body;
  assert.equal(statement?.type, "ExpressionStatement");
  return statement.expression;
}

test("a manifest is prepended as a const declaration", () => {
  const code = injectManifest(
    { version, urls: ["/", "/assets/index-abc123.js"] },
    "self.addEventListener('fetch', () => {});",
  );
  assert.equal(
    code,
    `const __PRECACHE__ = {"version":"${version}","urls":["/","/assets/index-abc123.js"]};\n` +
      "self.addEventListener('fetch', () => {});",
  );
});

test("a file name that looks like code becomes a harmless string", () => {
  // The URL of a file named `";self.x=1;//.svg`, as `encodePath` encodes it.
  const url = "/%22%3Bself.x%3D1%3B%2F%2F.svg";
  const code = injectManifest({ version, urls: [url] }, "");
  const [statement] = parseAst(code).body;
  assert.equal(statement?.type, "VariableDeclaration");
  const [declarator] = statement.declarations;
  assert.equal(declarator?.init?.type, "ObjectExpression");
  assert.ok(isDataLiteral(declarator.init));
});

test("a URL with characters that are not URL-safe is rejected", () => {
  for (const url of ['/a"b.svg', "/a;b.svg", "/a b.svg", "a.svg", "/a%2g"]) {
    assert.throws(
      () => injectManifest({ version, urls: [url] }, ""),
      /Invalid precache URL/,
      url,
    );
  }
});

test("a version that is not a hex digest is rejected", () => {
  for (const bad of ["", "abc", "0123456789abcdeg", `${version}"`]) {
    assert.throws(
      () => injectManifest({ version: bad, urls: [] }, ""),
      /Invalid precache version/,
      bad,
    );
  }
});

test("only literals of plain objects, arrays and strings count as data", () => {
  for (const source of [
    '"s"',
    "[]",
    '["a", ["b"]]',
    "({})",
    '({a: "b", "c d": ["e"]})',
  ]) {
    assert.ok(isDataLiteral(expression(source)), source);
  }
  for (const source of [
    "alert(1)",
    "x",
    "1",
    "null",
    "`s`",
    "[alert(1)]",
    "[...a]",
    "[,]",
    "({a: alert(1)})",
    "({[k]: 1})",
    "({a})",
    "({a() {}})",
    "({get a() {}})",
    "({...a})",
    "({__proto__: a})",
  ]) {
    assert.equal(isDataLiteral(expression(source)), false, source);
  }
});
