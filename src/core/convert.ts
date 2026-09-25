// Conversion: the last step of the pipeline. `convert` takes the `have` and
// `want` quantities the evaluator produced and answers how many `want`s make
// up `have`, or says why it cannot. ARCHITECTURE.md ("Conversion") gives the
// overview.
//
// Each quantity already carries its own scale (`3 ft` is `0.9144 m`, `in` is
// `0.0254 m`), so once the two are known to conform, the output value is the
// ratio of their magnitudes: `3 ft` into `in` gives `36`. As in GNU units,
// `want` may have a magnitude of its own (`1 mile` into `1000 ft` gives
// `5.28`). Nothing here rounds: division is exact, so the ratio is the exact
// answer and display is where it is rounded, once.
//
// A failure is one of the two conformance errors (a dimension mismatch or a
// kind mismatch, carrying both dimensions so that the UI can show them), or a
// `want` whose magnitude is zero, of which nothing is a multiple. Conformance
// is checked first, so a `want` of `0 s` against a `have` in metres is
// reported as the mismatch it is, not as a zero.

import {
  checkConformance,
  type ConformanceError,
  type Primitives,
  type Quantity,
} from "./dimension.ts";
import { divide, type Rational } from "./rational.ts";
import { err, type Result } from "./result.ts";

export type ConvertError =
  | ConformanceError
  /** `want` has a zero magnitude (`0 m`), so nothing is a multiple of it. */
  | { readonly kind: "zeroWant" };

/**
 * How many `want`s make up `have`: the ratio of their magnitudes, once the
 * two are known to conform. `primitives` supplies the roles the conformance
 * check tells dimensions and kinds apart by; it is the table's.
 */
export function convert(
  have: Quantity,
  want: Quantity,
  primitives: Primitives,
): Result<Rational, ConvertError> {
  const conformance = checkConformance(
    have.dimension,
    want.dimension,
    primitives,
  );
  if (!conformance.ok) return conformance;
  const ratio = divide(have.magnitude, want.magnitude);
  return ratio.ok ? ratio : err({ kind: "zeroWant" });
}
