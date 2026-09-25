// Quantities: what every unit and every expression evaluates to. A quantity
// is a magnitude, which is a `Rational`, and the dimension it is a multiple of:
// `2.54 cm` is the magnitude `127/5000` of the dimension `m`, given `m` as
// the primitive. ARCHITECTURE.md ("Quantities, dimensions and kinds") gives
// the overview.
//
// This module is the layer that pairs the two below it. `rational.ts` knows
// nothing about dimensions and `dimension.ts` nothing about magnitudes; the
// table stores quantities, the evaluator produces them, and the converter
// consumes them, so they all build on this module rather than on one another.
// The arithmetic on quantities that the evaluator needs (a magnitude
// operation beside the matching dimension operation) belongs here too, once
// the evaluator is written.

import { type Dimension } from "./dimension.ts";
import { type Rational } from "./rational.ts";

/** A magnitude and the dimension it is a multiple of. */
export type Quantity = {
  readonly magnitude: Rational;
  readonly dimension: Dimension;
};
