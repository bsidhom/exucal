# Testing

Four suites, each run by Node's built-in test runner and nothing else:

| Command           | What it runs                                                                      | When                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm test`       | The `*.test.ts` beside each module, a few seconds.                                | Every edit.                                                                                                 |
| `pnpm test:sweep` | The edge sweeps, `*.sweep.ts`: conformance tests over tens of thousands of cases. | Before a commit, through `pnpm test:all`.                                                                   |
| `pnpm bench`      | The benchmarks, `*.bench.ts` ([benchmarks.md](benchmarks.md)).                    | Before a commit, through `pnpm test:all`, and after any change to the core's data structures or algorithms. |
| `pnpm test:all`   | `pnpm typecheck`, then the three above.                                           | Before every commit: a commit leaves `pnpm test:all` and `pnpm format:check` green.                         |

The sweeps and the benchmarks are left out of `pnpm test` by their
suffixes, which its default discovery never matches, so the suites are
separate without a second runner. The benchmarks are in `pnpm test:all`
because they guard costs that nothing else does, and a check that is run
only when someone remembers it is not run: three of them once failed
unnoticed for a whole stage, two of them before reaching their
assertions. The stress tools ([benchmarks.md](benchmarks.md), "The stress
tools") run for minutes and are run by hand, never by `pnpm test:all`.
Each core module but `span.ts`, `result.ts` and `fixed-incbeta.ts`,
which is reached only through `builtins/incbeta.test.ts` and the sweep,
has a `*.test.ts` beside it.

## What a test may depend on

No test, sweep or benchmark depends on the limits a device has chosen.
The significand limit and the precision limit are settings, kept in the
browser and proposed per device by the probe, and only the shell reads
them, through `contextOf`. Every test, sweep and benchmark passes an
explicit `NumberContext`, built from the defaults of `context.ts`
(`DEFAULT_SIGNIFICAND_LIMIT_BITS`, `DEFAULT_CEILING`) or from literals;
the tests of `settings.ts` read a storage in memory, and the probe's
tests run over a fake clock, asserting of a real probe only that its
proposal lies within the bounds every device's must. The hard bound
`MAX_SIGNIFICAND_LIMIT_BITS` and the exponent bound `MAX_EXPONENT` are
constants. So a device whose limits are set low runs the same suite to
the same results, and a new test keeps it so: it builds its context from
the constants, or one of its own when it needs more than the defaults
(`rational.bench.ts` runs its largest quotients at twice the default
significand limit), never from the settings or the probe. What does
depend on the machine is time: one test of `limits.ts` asserts that a
real probe answers within five seconds, and the benchmarks assert ratios
of timings taken in one run, which noise can move and a machine's speed
cannot.

The tests of the system table (`units.test.ts`, `messages.test.ts`,
`build.bench.ts`) build it at the ceiling context, as the app does, so
that no unit holds a pass back. The message tests build `units.txt`
against stand-ins for the built-ins that carry the real names.

## The numeric test patterns

Every inexact routine has tests of four kinds:

- **Reference digits.** A value checked against digits from a trusted
  source (the first hundred digits of `pi()`, `exp(1)`, `ln(2)`,
  `sqrt(2)`, and values from Python's `decimal` module, named in the
  test), to at least fifty digits, so that an algorithm that is wrong in
  its tail is caught.
- **Containment.** For a routine that returns a ball, the ball computed
  at precision `p` must contain the midpoint computed at precision `4p`,
  over a seeded set of arguments across the routine's domain, at the
  value and at both ends of the arguments' intervals. This is the test
  that the radius is honest.
- **Exact case.** Every input the routine is required to recognize as
  exact gives a ball of radius zero with the exact midpoint (`sqrt(9/4)`,
  `exp(0)`, `log(2, 8)`), and an input next to it does not.
- **Edge sweep.** Every built-in and every ball operation runs over the
  classes of arguments at the edges of the number type, below.

The containment and property tests draw their inputs from the shared
random source ("The random source" below), and the tests of the ball and
above take a literal, a fraction and a ball through `src/testing/scaled.ts`
(`dec`, `fr`, `fraction`, `ball`, `digitsOf`), beside
`src/testing/fraction.ts` (`parseFraction`, `roundFraction`,
`formatFraction`) for the tests that reason on fractions.

## The edge sweeps

The sweeps are conformance tests that judge every case against what the
design rules out, rather than against the code, and they grow with every
built-in.

At the ball level, `src/core/edges.sweep.ts` runs every built-in of
`BUILTINS`, enumerated by arity so that a function added later joins it
(and at each of its arities, for `round`), and the ball's own operations
(`addBalls`, `subtractBalls`, `multiplyBalls`, `divideBalls`, `powBall`
with several exponents, `rootBall` of degrees two and three, and the
settle) over the classes of arguments at the edges of the number type,
each exact and with a relative radius of about `1e-30`: zero and the
units, values at both ends of the exponent bound and past the
significand limit's reach, a fraction significand at either edge, a
significand near one, and wide balls; a third-operand set and the cube of
the second operands serve the three-argument functions. The binary
operations take a subset of these as their second argument, and the
operations that read the mode run in decimal mode too, where the sweep
judges the mode by its promise: the operands rounded first, the
operation run as the evaluator runs it, and the result required to be
exact and the rounding of the exact result where that can be formed. Each
function joins the sweep by the map of built-ins with an oracle rule: the
domain predicate, an exact reference over the midpoints (the identity
`a = b × div(a, b) + mod(a, b)`, and closed forms at a parameter of one,
`x^a` for `incbetareg(a, 1, x)` and `1 - (1 - x)^b` for
`incbetareg(1, b, x)`), and bounds on the magnitude of the true result.

At the text level, `src/edges.sweep.ts` runs `parseExpr`, `evaluateText`
and `convertText` (into `hr;min;s`, `time` and `ft;in` at both edges) on
the reproductions of every issue filed against the number type, in both
modes, with `show` and `roundTerms` called as `outcome.ts` calls them.

The oracle, per case:

- No throw.
- A refusal only where the design allows one: `overflow` or `underflow`
  only when every value of the true result passes the bound (or, in
  decimal mode, when the rounded value does), decided by exact `bigint`
  exponents near `±10^18` and never by doubles; `tooLarge` only at a
  documented site; a domain error only for an argument outside the domain
  throughout.
- On a value: the midpoint is zero or has a decimal exponent within
  `±10^18`, and `|mid| + rad` is below `10^(10^18 + 1)`, both compared
  exactly, save a ball the settle truncated at the top in exact mode; the
  ball contains the known value at known points (`sin(0)`, `exp(0)`,
  `ln(1)`, `pow(1, y)`, `pow(x, 0)`, `approx(x)` containing `x`, a sum or
  a product containing its exact result where that can be formed); the
  range facts hold by intersection (`|tanh| <= 1` within the radius,
  `acos` in `[0, pi]`, `exp` positive); and, at the text level, no exact
  result past `significandLimitBits`, and a unit list whose shown terms
  add up to the `have`. The magnitude of the true result is bounded in
  `src/testing/edges.ts` from the arguments' intervals, exactly for the
  arithmetic and in log space for the exponential and the powers, with
  Stirling's bounds for the Gamma family at or above ten; the bound on an
  unformable radius rests on `bigint` roots of ten (`tenToAbove`, a
  relative `5.4 × 10^-10`) rather than a double, since no bound of such a
  radius can be exact and a stated slack rounded outward is what any
  check of it rests on.

The known violations are a table of patterns keyed by issue and by the
task that fixes it: a violation the table does not list fails the sweep,
and so does a listed one that no case shows any more, so that a fix is
never silent. Node's `todo` is not used, since a passing `todo` is silent
and a failing one prints its stack on every run. The cases run in a
`Worker` under a deadline, since `node:test`'s `timeout` neither
interrupts nor fails a synchronous test; the deadline fails the run and
names the case, and a case known to hang is matched by name and not run.
Each case's time is reported, not asserted, since a per-case budget on a
loaded runner is a flaky assertion. The ball level runs about 36,000
cases in half a minute and the text level a few hundred in a few seconds.
Splitting the ball-level sweep into modules by subject without changing
its cases is [#114][114]; making the suite as a whole faster without
losing coverage is [#110][110].

## The random source

`src/testing/random.ts` is the one seeded random source that the tests
and the benchmarks share, purely applicative in the manner of JAX: a key
is two 32-bit words, `split` and `foldIn` derive keys from a key, and
every draw (`uniform`, `between`, `randomBigInt`, `randomRational`,
`randomBall`) is a function of its key alone, the bits behind them
threefry2x32 blocks under the key, checked against the published
vectors. So every run measures the same data, every property test draws
its inputs the same way, the `i`-th input of a loop is the same whether
drawn alone or in order, and no test carries a generator of its own; the
stress search draws its cases the same way. The real probe's inputs come
from a small congruential generator in `limits.ts`, since the tests'
random source is not part of the app.

`src/testing/expr.ts` draws random expression trees for the printer's
property test, which prints them and parses them back; a seeded property
test of the definitions parser draws hundreds of function and inverse
lines, with zero to three parameters and up to two conditions, and
injects each rejected piece where it should be rejected.

## Type-checking

Every TypeScript file is type-checked by one of the three projects
`tsconfig.json` references, whichever has the `lib` it runs under
([layout.md](layout.md)). A composite project fails (TS6307) on an
imported file its patterns do not match, so an import cannot escape the
check, but a file nothing imports, a test or a sweep, is checked only if
a project's patterns match it, and Node runs it either way, stripping its
types without checking them, so a test file no project checked would
run, pass, and hide its type errors (one did, until the projects were
made to match by pattern). So `tsconfig.node.json` matches every
TypeScript file at the root and under `src/`, `bench/` and `scripts/` and
excludes only the browser-only modules, and `tsconfig-coverage.test.ts`,
part of `pnpm test`, asks `tsc` for the files each project checks and
fails on any tracked or new `.ts` file in none of them, saying where it
belongs, and on any code file of another extension (`.js`, `.mjs`,
`.tsx` and the like), which no project's patterns match, so that a new
kind of file is noticed rather than left unchecked. It reads git's list
NUL-separated and refuses any path with a control character, since `tsc`
lists its files one per line ([security.md](security.md)).

Every type-only import in `src` and `bench` is `import type`, which is
erased: under `verbatimModuleSyntax` an `import { type X }` still loads
its module for side effects, and the kernel's modules once formed an
initialization cycle through `fixed.ts`, `ball.ts` and `context.ts` that
only such imports kept alive, so that a module's top level ran before
its constants existed once a test imported `fixed-exp.ts` first.
Removing the remaining import cycles in the core and guarding against new
ones with a check is [#179][179].

## The UI

The shell and the panel are Lit components, which the Node suite does
not render; what each part shows that is not state is a pure function
beside it, checked under Node (`src/settings-lines.ts`, `src/outcome.ts`,
`src/messages.ts`, `src/service-worker-updates.ts`, `src/subscription.ts`,
`src/settings.ts` over a storage in memory). A change to the components
is verified by a Playwright run against the built app, recorded in the
change's description: at phone widths (320 to 480 pixels) with the
settings sheet open the page's `scrollWidth` is the viewport's and the
output's top edge is above the sheet; the sheet scrolls to its last
control at both heights; at 1,024 pixels the column's right edge is left
of the sheet; the cog's hit area is 44 by 44 pixels, Tab reaches it
first, Enter and Space open the sheet, and Escape, Done and the cog close
it with focus back on the cog and `aria-expanded` following the dialog's
`open`; the three groups are in order with the working digits under the
mode; a stepper's tap changes the setting by one, stores it and changes
the result; the reset button appears only off a default and restores it;
`−` is disabled at the floor and `+` at the precision limit;
`aria-invalid` marks a refused input and goes on the next change. The
on-screen keyboard's behavior (the decimal keypad's Done key on iOS, the
sheet rising with the keyboard) cannot be raised by Playwright and is
checked by hand on a phone.

[110]: https://github.com/bsidhom/exucal/issues/110
[114]: https://github.com/bsidhom/exucal/issues/114
[179]: https://github.com/bsidhom/exucal/issues/179
