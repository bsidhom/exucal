// The built-in functions the app has, gathered from their modules under
// builtins/ into one map by name. docs/builtins.md is the design; builtin.ts
// holds the type, the errors and the shared rule helpers, and each function
// lives in a module of its own under builtins/, grouped with others only
// when they share internal machinery. The table and the build take this
// map as their default set of built-ins (table.ts, build.ts), and a test
// may pass a set of its own instead. `pi` is the first (task 3.4); the
// elementary set follows in 3.6 to 3.11.

import { type Builtin, type Builtins } from "./builtin.ts";
import { pi } from "./builtins/pi.ts";

/** Every built-in the app has, by name. */
export const BUILTINS: Builtins = new Map<string, Builtin>(
  [pi].map((fn) => [fn.name, fn]),
);
