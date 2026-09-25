// On-demand evaluation of the nodes of a dependency graph, with memoization
// and cycle detection. `buildTable` uses it to evaluate definitions that
// refer to one another in any order; nothing here knows what a node is.
//
// A walker holds the results computed so far and the stack of nodes whose
// evaluation is in progress. Both are internal and unobservable: a node is
// evaluated once, on the first request for it, and every later request
// returns the same result, so the walker behaves as a pure function of its
// node evaluator. Nodes are compared by identity, as `Map` keys are.
//
// A failure is memoized like a value, and a node whose dependency failed
// fails with whatever its evaluator made of that failure. So the error for a
// cycle is produced once, at the request that closed it, and a node
// evaluator that passes its dependencies' errors up unchanged reports every
// node on the cycle with the same error.

import { err, type Result } from "./result.ts";

/**
 * A request for a node that is being evaluated already. `nodes` is the
 * cycle in request order: the evaluation of the first requested the second,
 * and so on, and the evaluation of the last requested the first again. A
 * node that requests itself is a cycle of one.
 */
export type Cycle<N> = {
  readonly kind: "cycle";
  readonly nodes: readonly N[];
};

/** Requests the value of a dependency, or a `Cycle` if that closes one. */
export type Visit<N, V, E> = (node: N) => Result<V, E | Cycle<N>>;

/**
 * Computes the value of `node`, requesting the nodes it depends on through
 * `visit`. A `Cycle` from `visit` is the evaluator's to turn into its own
 * error, since only it knows where the request came from.
 */
export type NodeEvaluator<N, V, E> = (
  node: N,
  visit: Visit<N, V, E>,
) => Result<V, E>;

/**
 * A function that evaluates any node with `evaluateNode`, computing each
 * node and each of its dependencies at most once. The function is for the
 * top level only: within `evaluateNode`, dependencies go through `visit`,
 * which is what detects cycles, and calling the function there throws.
 */
export function walker<N, V, E>(
  evaluateNode: NodeEvaluator<N, V, E>,
): (node: N) => Result<V, E> {
  const memo = new Map<N, Result<V, E>>();
  const visiting: N[] = [];
  const walk = (node: N): Result<V, E> => {
    const known = memo.get(node);
    if (known !== undefined) return known;
    visiting.push(node);
    const result = evaluateNode(node, visit);
    visiting.pop();
    memo.set(node, result);
    return result;
  };
  const visit: Visit<N, V, E> = (node) => {
    const start = visiting.indexOf(node);
    return start === -1
      ? walk(node)
      : err({ kind: "cycle", nodes: visiting.slice(start) });
  };
  return (node) => {
    if (visiting.length > 0) {
      throw new Error("A walker was called during evaluation; use visit");
    }
    return walk(node);
  };
}
