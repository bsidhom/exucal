*Section 4 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 4. Built-in functions

### 4.1 Proposed entry template

One entry per function, grouped by family; the same headings in the
same order for every entry so that the mechanical check can parse it:

- **Signature.** `name(arg, …)`, the arity (or range for `round`), the
  order of arguments and what each stands for (`log(b, x)`: base first;
  `atan2(y, x)`; `incbeta(a, b, x)`: parameters first).
- **Arguments.** Dimension requirement per argument (plain number; the
  `radian` kind; any quantity; two of one dimension) and the domain
  (`x > 0`, `[-1, 1]`, whole numbers known exactly), with the error
  wording the user sees.
- **Result.** Its dimension (plain, `radian`, the argument's, the
  arguments'); the exact cases (inputs that give `=`); otherwise `≈` at
  the digits asked.
- **Edges and refusals.** Points where the value "cannot be told" from
  an edge (poles, domain ends, rounding boundaries) and how they read;
  size refusals (significand limit with the suggested remedy or none;
  exponent bound) with the thresholds that matter to a user
  (`exp` past about `2.3026e18`; `factorial` past the limit; `erfc`
  past about `1.5e9`); huge and tiny arguments where the behaviour is
  visible (`sin(1e-999999999 radian)`).
- **Decimal mode.** One step, certified then rounded; where an exact
  case is rounded to `p`; `approx` is the identity.
- **Related settings.** Rounding (for `round`); precision limit (cost of
  edges); significand limit (exact functions, trigonometric reduction).
- **Cost.** Only where notable and qualitative (the Gamma family's first
  call at a new precision; the incomplete functions at the ceiling);
  no timings (see §12, question 9).
- **See also.** Alternatives and pointers (`factorial` → `gamma(x + 1)`;
  `binomial` → `beta`; `decibel` as a defined function; `pow` vs `^`).
- **Examples.** Two to four typeable lines with their outputs.

### 4.2 Functions mentioned in either corpus, by family

Source of the family split: `docs/functions.md#(top)` and
`devdocs/builtins.md#(top)`, `#Dimension rules`, `#Domains, exact cases and
edges`, `#The exact functions`, `#The Gamma and Beta families`.

| Family | Functions | Current description | Module (per `devdocs/layout.md#The modules`) |
| --- | --- | --- | --- |
| Constants | `pi()` | `docs/functions.md#(top)` bullet 1; `devdocs/builtins.md#Names`, `#The elementary routines` | `builtins/pi.ts` |
| Exponential and logarithms | `exp`, `ln`, `log10`, `log2`, `log(b, x)` | bullet 2; `#Domains…`, `#The elementary routines` | `builtins/exp.ts`, `builtins/log.ts` |
| Roots and powers | `sqrt`, `cbrt`, `pow(x, y)` | bullet 3; `#Domains…` (pow rules); `devdocs/numbers.md#Roots and powers` | `builtins/roots.ts`, `builtins/pow.ts` |
| Trigonometric | `sin`, `cos`, `tan` | bullet 4; `#Dimension rules › Angles`; `#Huge and tiny arguments` | `builtins/trig.ts` |
| Inverse trigonometric | `asin`, `acos`, `atan`, `atan2(y, x)` | bullet 5; `#Domains…`, `#The elementary routines` | `builtins/inverse-trig.ts` |
| Hyperbolic | `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | bullet 6; `#The elementary routines › The hyperbolic inverses` | `builtins/hyperbolic.ts` |
| Approximation | `approx(x)` | bullet 7, `#Very large results and approx`; `devdocs/numbers.md#approx` | `builtins/approx.ts` |
| Magnitude and sign | `abs`, `sign` | bullet 8; `#The exact functions` | `builtins/abs.ts` |
| Rounding | `floor`, `ceil`, `trunc`, `round(x)`, `round(x, places)` | bullet 8; `#The exact functions` | `builtins/round.ts` |
| Division | `div(a, b)`, `mod(a, b)` | bullet 9; `#The exact functions` (Boute) | `builtins/division.ts` |
| Integer functions | `gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial` | bullet 10; `#The exact functions` (size prediction) | `builtins/integers.ts` |
| Gamma family | `digamma`, `gamma`, `lgamma`, `beta` | bullets 11–13; `#The Gamma and Beta families` | `builtins/gamma.ts`, `builtins/beta.ts` |
| Incomplete gamma | `lowergamma`, `uppergamma`, `lowergammareg`, `uppergammareg` | bullet 14; same | `builtins/incomplete.ts` |
| Error functions | `erf`, `erfc` | bullet 15; same | `builtins/erf.ts` |
| Incomplete beta | `incbeta`, `incbetareg` | bullet 16; same | `builtins/incbeta.ts` |

Defined in the system file, not built in (they belong to the units
reference but the function reference should cross-link them): `tempC`,
`tempF`, `neper`, `bel`, `decibel` → `devdocs/functions.md#Definitions`;
`docs/definitions.md#What the file contains`. Designed and deferred
(#115): `zeta`, `lambertw`, `ellipk`, `ellipe`, `legendre`, `chebyshev`,
Bessel `J` and `I` → `devdocs/builtins.md#The Gamma and Beta families` (last
paragraph). Ruled out: hypergeometric, Bessel `Y`/`K`, polygamma beyond
`digamma`, complex `gamma`, statistical distributions → same;
`devdocs/future.md#Ruled out, and why`.

Family-level facts the reference must state once, not per entry:
`devdocs/builtins.md#The rules every built-in follows` (returns the kernel's
ball; exact cases; unbounded arguments; tiny arguments keep digits; wide
arguments give a trivial bound; domain vs unresolved; the exponent-bound
guard), `#Arity`, `#Names` (why `e` is `exp(1)`, why `log` is two-argument,
why `decibel` not `dB`, no prefixes on functions).

### 4.3 Do descriptions live in the source?

From the docs alone (unverified): a `Builtin` is "a name, the count of
arguments it takes, a dimension rule … and the function itself"
(`devdocs/builtins.md#(top)`; `devdocs/architecture.md#Functions`), with no
description or documentation field mentioned. `BUILTINS` is a map by
name gathered from one module per function or family
(`devdocs/builtins.md#(top)`; `devdocs/layout.md#The modules`), each module
carrying a header comment that `devdocs/development.md#Commands` requires
to say "what the code now does". The one-line module summaries in
`devdocs/layout.md#The modules` are the nearest thing to per-function
descriptions, at module granularity.

So: the registry can mechanically supply the *list* of names, each
arity range, and (if the dimension rule is data rather than a closure)
the dimension rule; the prose of each entry does not appear to exist in
the source and must be written in docs/. Recommendation: generate a
table (name, arity, dimension rule, module) from `src/core/builtins.ts`
with a script run in CI, and have the completeness check compare the
reference's entry headings against `BUILTINS`' keys and arities, while
the entries themselves stay hand-written. Whether to add a short
description field to `Builtin` so that the sheet or an autocomplete can
reuse it is a source change outside this audit (§12, question 20).
