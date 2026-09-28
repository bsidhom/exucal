// The built-in functions the app has, gathered from their modules under
// builtins/ into one map by name. docs/builtins.md is the design; builtin.ts
// holds the type, the errors and the shared rule helpers, and each function
// lives in a module of its own under builtins/, grouped with others only
// when they share internal machinery. The table and the build take this
// map as their default set of built-ins (table.ts, build.ts), and a test
// may pass a set of its own instead. `pi` is the first (task 3.4), `exp`
// the second (3.6) and the logarithms follow (3.7); the rest of the
// elementary set follows in 3.8 to 3.11.

import type { Builtin, Builtins } from "./builtin.ts";
import { exp } from "./builtins/exp.ts";
import { ln, log, log10, log2 } from "./builtins/log.ts";
import { pi } from "./builtins/pi.ts";

/** Every built-in the app has, by name. */
export const BUILTINS: Builtins = new Map<string, Builtin>(
  [pi, exp, ln, log10, log2, log].map((fn) => [fn.name, fn]),
);
