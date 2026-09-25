import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { walker, type Cycle, type NodeEvaluator } from "./graph.ts";
import { err, ok, type Result } from "./result.ts";

/** A node: its name and the nodes it depends on, summed into its value. */
type Node = { readonly name: string; readonly deps: readonly Node[] };

type Failure = { readonly kind: "failed"; readonly name: string } | Cycle<Node>;

/** Builds a graph from each node's dependencies, by name, in any order. */
function graph(edges: Record<string, readonly string[]>): Record<string, Node> {
  const nodes: Record<string, { name: string; deps: Node[] }> = {};
  for (const name of Object.keys(edges)) nodes[name] = { name, deps: [] };
  for (const [name, deps] of Object.entries(edges)) {
    for (const dep of deps) nodes[name]!.deps.push(nodes[dep]!);
  }
  return nodes;
}

/**
 * An evaluator that sums a node's value (its name's length) with those of
 * its dependencies, passing any failure up unchanged, and records each
 * evaluation in `evaluated`.
 */
function summing(
  evaluated: string[],
  failing: readonly string[] = [],
): NodeEvaluator<Node, number, Failure> {
  return (node, visit) => {
    evaluated.push(node.name);
    if (failing.includes(node.name)) {
      return err({ kind: "failed", name: node.name });
    }
    let total = node.name.length;
    for (const dep of node.deps) {
      const result = visit(dep);
      if (!result.ok) return result;
      total += result.value;
    }
    return ok(total);
  };
}

function value(result: Result<number, Failure>): number {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<number, Failure>): Failure {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

test("a node's value depends on its dependencies", () => {
  const { a } = graph({ a: ["bb", "ccc"], bb: ["ccc"], ccc: [] });
  const walk = walker(summing([]));
  assert.equal(value(walk(a!)), 1 + (2 + 3) + 3);
});

test("each node is evaluated once, however often it is reached", () => {
  const { a, bb, ccc } = graph({ a: ["bb", "ccc"], bb: ["ccc"], ccc: [] });
  const evaluated: string[] = [];
  const walk = walker(summing(evaluated));
  assert.equal(value(walk(a!)), 9);
  assert.equal(value(walk(a!)), 9);
  assert.equal(value(walk(bb!)), 5);
  assert.equal(value(walk(ccc!)), 3);
  assert.deepEqual(evaluated, ["a", "bb", "ccc"]);
});

test("nodes are evaluated on demand only", () => {
  const { a } = graph({ a: [], unused: [] });
  const evaluated: string[] = [];
  const walk = walker(summing(evaluated));
  value(walk(a!));
  assert.deepEqual(evaluated, ["a"]);
});

test("nodes are compared by identity", () => {
  const first: Node = { name: "a", deps: [] };
  const second: Node = { name: "a", deps: [] };
  const evaluated: string[] = [];
  const walk = walker(summing(evaluated));
  value(walk(first));
  value(walk(second));
  assert.deepEqual(evaluated, ["a", "a"]);
});

test("a cycle is reported at the request that closes it", () => {
  const { a, b, c } = graph({ a: ["b"], b: ["c"], c: ["a"] });
  const cycles: Cycle<Node>[] = [];
  const walk = walker<Node, number, Failure>((node, visit) => {
    for (const dep of node.deps) {
      const result = visit(dep);
      if (!result.ok) {
        if (result.error.kind === "cycle") cycles.push(result.error);
        return result;
      }
    }
    return ok(0);
  });
  assert.deepEqual(failure(walk(a!)), { kind: "cycle", nodes: [a, b, c] });
  // The request for `a` from `c` produced the cycle, and `b` and `a` passed
  // that one error up rather than producing their own.
  assert.equal(cycles.length, 3);
  assert.equal(new Set(cycles).size, 1);
});

test("a cycle lists only the nodes on it", () => {
  const { a, b, c } = graph({ a: ["b"], b: ["c"], c: ["b"] });
  const walk = walker(summing([]));
  assert.deepEqual(failure(walk(a!)), { kind: "cycle", nodes: [b, c] });
});

test("a node that depends on itself is a cycle of one", () => {
  const { a } = graph({ a: ["a"] });
  const walk = walker(summing([]));
  assert.deepEqual(failure(walk(a!)), { kind: "cycle", nodes: [a] });
});

test("a shared dependency is not a cycle", () => {
  const { a } = graph({ a: ["b", "c"], b: ["d"], c: ["d"], d: [] });
  const evaluated: string[] = [];
  const walk = walker(summing(evaluated));
  assert.equal(value(walk(a!)), 1 + (1 + 1) + (1 + 1));
  assert.deepEqual(evaluated, ["a", "b", "d", "c"]);
});

test("a failure is passed up and memoized like a value", () => {
  const { a, b, c } = graph({ a: ["c"], b: ["c"], c: [] });
  const evaluated: string[] = [];
  const walk = walker(summing(evaluated, ["c"]));
  assert.deepEqual(failure(walk(a!)), { kind: "failed", name: "c" });
  assert.deepEqual(failure(walk(b!)), { kind: "failed", name: "c" });
  assert.deepEqual(failure(walk(c!)), { kind: "failed", name: "c" });
  assert.deepEqual(evaluated, ["a", "c", "b"]);
});

test("a cycle's members can be evaluated again afterwards", () => {
  // After the cycle has been reported the stack is empty again, so a walk
  // that starts from another member finds its memoized failure rather than
  // a stale entry on the stack.
  const { a, b } = graph({ a: ["b"], b: ["a"] });
  const walk = walker(summing([]));
  assert.deepEqual(failure(walk(a!)), { kind: "cycle", nodes: [a, b] });
  assert.deepEqual(failure(walk(b!)), { kind: "cycle", nodes: [a, b] });
});

test("walkers do not share results", () => {
  const { a } = graph({ a: [] });
  const evaluated: string[] = [];
  value(walker(summing(evaluated))(a!));
  value(walker(summing(evaluated))(a!));
  assert.deepEqual(evaluated, ["a", "a"]);
});

test("calling the walker from within an evaluator throws", () => {
  const { a, b } = graph({ a: [], b: [] });
  const walk: (node: Node) => Result<number, Failure> = walker<
    Node,
    number,
    Failure
  >((node) => (node === a ? walk(b!) : ok(0)));
  assert.throws(() => walk(a!), /use visit/);
});
