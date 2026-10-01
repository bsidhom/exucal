// The built-in functions the app has, gathered from their modules under
// builtins/ into one map by name. docs/builtins.md is the design; builtin.ts
// holds the type, the errors and the shared rule helpers, and each function
// lives in a module of its own under builtins/, grouped with others only
// when they share internal machinery. The table and the build take this
// map as their default set of built-ins (table.ts, build.ts), and a test
// may pass a set of its own instead. `pi` is the first (task 3.4), `exp`
// the second (3.6), the logarithms follow (3.7), then the roots and `pow`
// (3.8), then the trigonometric functions (3.9), their inverses (3.10) and
// the hyperbolic functions with theirs (3.11), which complete the
// elementary set; `approx` (4.10) and the exact functions of stage 6
// (6.1: abs.ts, round.ts, division.ts, integers.ts) follow, then the
// Gamma family (6.2, gamma.ts).

import type { Builtin, Builtins } from "./builtin.ts";
import { abs, signFn } from "./builtins/abs.ts";
import { approx } from "./builtins/approx.ts";
import { div, mod } from "./builtins/division.ts";
import { exp } from "./builtins/exp.ts";
import { digamma, gamma, lgamma } from "./builtins/gamma.ts";
import {
  binomial,
  doublefactorial,
  factorial,
  gcd,
  lcm,
} from "./builtins/integers.ts";
import { ceil, floor, round, truncFn } from "./builtins/round.ts";
import { ln, log, log10, log2 } from "./builtins/log.ts";
import { pi } from "./builtins/pi.ts";
import { pow } from "./builtins/pow.ts";
import { cbrt, sqrt } from "./builtins/roots.ts";
import {
  acosh,
  asinh,
  atanh,
  cosh,
  sinh,
  tanh,
} from "./builtins/hyperbolic.ts";
import { acos, asin, atan, atan2 } from "./builtins/inverse-trig.ts";
import { cos, sin, tan } from "./builtins/trig.ts";

/** Every built-in the app has, by name. */
export const BUILTINS: Builtins = new Map<string, Builtin>(
  [
    pi,
    exp,
    ln,
    log10,
    log2,
    log,
    sqrt,
    cbrt,
    pow,
    sin,
    cos,
    tan,
    asin,
    acos,
    atan,
    atan2,
    sinh,
    cosh,
    tanh,
    asinh,
    acosh,
    atanh,
    approx,
    abs,
    signFn,
    floor,
    ceil,
    truncFn,
    round,
    div,
    mod,
    gcd,
    lcm,
    factorial,
    binomial,
    doublefactorial,
    digamma,
    lgamma,
    gamma,
  ].map((fn) => [fn.name, fn]),
);
