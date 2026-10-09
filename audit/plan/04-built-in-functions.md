*Section 4 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 4. Built-in functions

### 4.1 The plan: a reference generated from the source

The owner's decision in review inverts the flow this plan first
proposed. The documentation of each built-in is to live beside its
implementation, in the same file, as structured documentation (a
JSDoc-like or otherwise well-formed comment), so that it is hard to
change the code without changing the comment; a tool then generates the
user-facing reference from those comments. The tool is written in
TypeScript in this repository, under the project's rule against new
dependencies. The detailed design and the implementation are a separate
block of work that follows the rest of the docs refactor, so that no
effort is spent hand-documenting the built-ins only to replace it.

What the plan fixes now, so that the later design starts from it:

- **Where the documentation lives.** With the implementation, in the
  module under `src/core/builtins/` that defines the function, one
  structured comment per built-in (a family module carries one per
  function it defines). The comment is the only source; nothing about a
  built-in is written by hand in `docs/`.
- **What a structured comment carries,** the fields a user needs and
  the generator verifies (the fields of the former entry template):
  - the signature: name, arity or range, the order of arguments and
    what each stands for (`log(b, x)`: base first; `atan2(y, x)`;
    `incbeta(a, b, x)`: parameters first);
  - per argument, the dimension requirement (plain number; the `radian`
    kind; any quantity; two of one dimension) and the domain, with the
    error wording the user sees;
  - the result: its dimension; the exact cases (inputs that give `=`);
    otherwise `≈` at the digits asked;
  - edges and refusals: where the value "cannot be told" from an edge
    and how that reads; size refusals, with the thresholds that matter
    to a user (`exp` past about `2.3026e18`, `factorial` past the limit,
    `erfc` past about `1.5e9`); huge and tiny arguments where visible;
  - decimal mode: one observable step, certified then rounded once;
    where an exact case is rounded to `p`; `approx` the identity;
  - related settings (the rounding mode for `round`; the precision limit
    for the cost of edges; the significand limit for the exact functions
    and the trigonometric reduction);
  - cost, only where notable and qualitative; no timings (§12,
    question 9);
  - see also: alternatives and pointers (`factorial` to `gamma(x + 1)`,
    `binomial` to `beta`, `decibel` as a defined function, `pow` against
    `^`);
  - examples: two to four typeable lines with their outputs, which the
    generator can also run as tests.
- **What the tool does.** Reads the registry (`BUILTINS` in
  `src/core/builtins.ts`) and each module's structured comments; fails
  when a registered built-in lacks a comment or a comment lacks a
  required field, so completeness is enforced by generation rather than
  by a separate check; emits the reference page grouped by family in a
  fixed order; and runs in CI (§12, question 30 asks whether the output
  is committed or built).
- **What stays hand-written,** in `devdocs/builtins.md` and the family
  preamble of the generated page: the rules every built-in follows
  (`devdocs/builtins.md#The rules every built-in follows`), the naming
  decisions (`#Names`), arity (`#Arity`), the dimension rules as a table
  (`#Dimension rules`), and the design of each family. These are intent
  and mechanism, not per-function facts.

### 4.2 Functions mentioned in either corpus, by family

Source of the family split: `docs/functions.md#(top)` and
`devdocs/builtins.md#(top)`, `#Dimension rules`, `#Domains, exact cases and
edges`, `#The exact functions`, `#The Gamma and Beta families`.

| Family | Functions | Current description | Module (per `devdocs/layout.md#The modules`) |
| --- | --- | --- | --- |
| Constants | `pi()` | `docs/functions.md#(top)` bullet 1; `devdocs/builtins.md#Names`, `#The elementary routines` | `builtins/pi.ts` |
| Exponential and logarithms | `exp`, `ln`, `log10`, `log2`, `log(b, x)` | bullet 2; `#Domains…`, `#The elementary routines` | `builtins/exp.ts`, `builtins/log.ts` |
| Roots and powers | `sqrt`, `cbrt`, `pow(x, y)` | bullet 3; `#Domains…` (pow rules); `devdocs/numbers.md#Roots and powers` | `builtins/roots.ts`, `builtins/pow.ts` |
| Trigonometric | `sin`, `cos`, `tan` | bullet 4; `#Dimension rules > Angles`; `#Huge and tiny arguments` | `builtins/trig.ts` |
| Inverse trigonometric | `asin`, `acos`, `atan`, `atan2(y, x)` | bullet 5; `#Domains…`, `#The elementary routines` | `builtins/inverse-trig.ts` |
| Hyperbolic | `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | bullet 6; `#The elementary routines > The hyperbolic inverses` | `builtins/hyperbolic.ts` |
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
paragraph). Not in the initial design, and deferred rather than ruled
out indefinitely (the owner's clarification in review): the general
hypergeometric functions, Bessel `Y` and `K`, polygamma beyond
`digamma`, complex `gamma`, and the statistical distributions as
built-ins → same; `devdocs/future.md#Ruled out, and why`, whose wording
for these is to be updated (§9.4).

Family-level facts the reference states once, not per entry:
`devdocs/builtins.md#The rules every built-in follows` (returns the kernel's
ball; exact cases; unbounded arguments; tiny arguments keep digits; wide
arguments give a trivial bound; domain vs unresolved; the exponent-bound
guard), `#Arity`, `#Names` (why `e` is `exp(1)`, why `log` is two-argument,
why `decibel` not `dB`, no prefixes on functions).

### 4.3 Where the descriptions live today

From the docs alone (unverified): a `Builtin` is "a name, the count of
arguments it takes, a dimension rule … and the function itself"
(`devdocs/builtins.md#(top)`; `devdocs/architecture.md#Functions`), with no
description or documentation field mentioned, and `BUILTINS` is a map
by name gathered from one module per function or family
(`devdocs/builtins.md#(top)`; `devdocs/layout.md#The modules`). The prose
about each function lives in `docs/functions.md#(top)` and in
`devdocs/builtins.md`, apart from the code. The plan in §4.1 moves it
beside the code; until then the two pages stay as they are.

### 4.4 In the interim, and the follow-on work

- **During this refactor,** `docs/functions.md` keeps its prose list of
  the built-ins, corrected only where §9.4 tags a stale passage, and
  gains one sentence saying that the per-function reference will be
  generated from the source. The foundation-level content it carries
  today (`#Very large results and approx`) still moves to `numbers.md`
  (§6.6). `devdocs/builtins.md` is audited for its family rules and
  design (unit V3); no per-function entries are written anywhere.
- **Audit units D5 to D7** verify the family-level rules and the
  dimension-rule table against the code and tag stale passages; they do
  not produce entries (§10.b).
- **Follow-on work, after the refactor,** as separate blocks: the
  structured-comment format and the generator for the built-in
  reference (this section); the grammar DSL and its generator (§2.1.3,
  §2.2.3). The two share the rule against dependencies and may share a
  tool; whether they do is part of their design (§12, question 30).
