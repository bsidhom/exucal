*Section 1 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 1. Core abstractions

Amended on 2026-10-12 from the owner's answers (§12, section 12.1) and
the findings they accept: each amended claim or row ends with the
findings and items it follows, and the rules that bind every page
(`audit/principles.md`) hold in this section's own wording: "refused"
names a size refusal only, everything else being an error (F-442);
"inexact" names a value with a nonzero radius (F-451); and what might be
done later is `devdocs/future.md`'s alone (Q-011). Pointers into
`docs/functions.md` name today's page; the rewritten page is
`docs/builtins.md` (Q-020).

### 1.1 The numeric type

#### 1.1.1 User-level semantic model (claims, with current devdocs sources)

Values and exactness

- **N1.** A value is an exact fraction times a power of ten. The
  fraction is kept in its canonical form: in lowest terms, with every
  power of ten moved into the exponent, and with its denominator
  coprime to ten, that is, with no factor of two or five, so a power of
  two in a denominator is held as a power of five in the numerator
  (`1/6` is `5/3 × 10^-1`; `2^-30000` is `5^30000 × 10^-30000`). A
  value has exactly one such form, whatever route produced it, so equal
  values are held alike and compared part by part, and that form is
  what the significand limit, a setting, measures (N21); the value's
  decimal exponent, the one the display writes, must lie within a fixed
  bound of ±10^18 (N22), so a value's magnitude is cheap to hold but
  not unbounded. Decimal literals are read exactly (`1.5e-3` is
  `15 × 10^-4`; `0.1 + 0.2` is exactly `0.3`). That the fraction and the
  power of ten are two types, one composed of the other, is
  representation and stays in devdocs, as do the formal argument for
  the form's uniqueness and its implementation; the user page names the
  form, glosses it, and gives the argument in plain words.
  (Amended: F-013; F-439 as the owner amended it on 2026-10-13, plan
  §12.3: "canonical" is a docs word too.)
  → `devdocs/numbers.md#(top)`, `#The types > Rational`, `#The types >
  Scaled`, `#Exact mode`.
- **N2.** Every value carries an error radius bounding its distance from
  the number meant. Radius zero is *exact*; nonzero is *inexact*. The
  `=` relation marks an exact value: every digit of it is certified,
  known exactly. How many of those digits a line shows, and how a line
  reads when it shows fewer, is display policy (N10, N12), not the
  model.
  → `devdocs/numbers.md#The types > Ball`, `#Certification and the
  display rule`.
- **N3.** In either mode, a nonzero radius comes from exactly two
  things: an inexact built-in (a root, `exp`, `ln`, the trigonometric,
  hyperbolic, Gamma and Beta families, `pi()`, and the units defined
  through `pi()`) and `approx`, which makes a value inexact on purpose
  and is the identity in decimal mode. Decimal mode's rounding of a step
  produces an exact value and never a radius: inside a step the radii
  are those of the built-ins computed at the working contexts, and the
  step's one rounding removes them (N17, N18). Once a value is inexact,
  exact mode rounds its midpoint onto the working grid after every
  operation (settling) and, in a sum, product or quotient with it whose
  exact step the significand limit refuses, puts an exact operand onto
  the same grid, every rounding charged to the radius; neither makes a
  new value inexact (N4). (Amended: F-010; the pages' "three things" and
  "a fourth source" are corrected with it, Q-079.)
  → `devdocs/numbers.md#Exact mode`; `docs/settings.md#How a number is
  held…` ("exactly two ways", consistent).
- **N4.** `+ - * /`, integer powers and comparisons on exact operands are
  exact and as long as they need to be: an exact result of exact
  operands is never rounded in exact mode, and an exact value is never
  replaced by a different exact value. A sum that cannot be aligned
  within the significand limit is refused, not rounded (in decimal mode
  it takes the neighbor rule, N20). Where an exact operand meets an
  inexact one and the exact step would pass the limit, the exact operand
  is rounded onto the working grid with the rounding charged to the
  radius, as `approx` would do, so that the result, inexact in any case,
  is a value rather than a refusal. `approx` is the designed escape hatch
  from the strictness: it makes a value inexact on purpose, so that the
  arithmetic may round it (N23). (Amended: F-019; the docs give one
  sentence on what such a result's radius covers, Q-083.)
  → `devdocs/numbers.md#Exact operations`, `#Sums and alignment`,
  `#Exact mode`, `#approx`.
- **N5.** Inexact values propagate radii by the elementary rules; every
  occurrence of a value is independent (so `x - x` of an inexact `x`
  is a ball around zero, never `0`; `sqrt(2)/sqrt(2)` is `≈ 1`).
  → `devdocs/numbers.md#Exact operations`; `devdocs/functions.md#Precision,
  the radius and cost`; `devdocs/numbers.md#Certification… ` ("Exactness is a
  property of the value, not of the display").
- **N6.** Built-ins return an exact result wherever the value is rational
  and cheaply recognized (`sqrt(9/4) = 1.5`, `log(2, 8) = 3`, `exp(0)`,
  `cos(0 radian)`, `gamma(5) = 24`, `lgamma(1) = 0`, `erf(0) = 0`,
  `beta(2, 3) = 1/12`, `incbetareg(2, 3, 0.5) = 0.6875`); otherwise the
  result is `≈` however round it looks (`ln(8)/ln(2) ≈ 3`).
  → `devdocs/builtins.md#The rules every built-in follows`, `#Domains,
  exact cases and edges`.
- **N7.** As the numeric model stands, an identity through an irrational
  step never certifies zero or a rational: `sqrt(2)^2 - 2` is `≈ 0`
  within a bound, `turn` into `deg` is `≈ 360`, `sin(pi() radian)` is
  `≈ 0`; such expressions run every pass up to the ceiling, or until a
  refusal at a later pass ends the loop (the loop retries no refusal,
  Q-001), when the best result so far is shown (cost), and dividing by
  such a value is an error ("cannot be told from zero"). The user docs
  state this as today's behaviour, a plain fact; that it is a
  consequence of the current representation rather than a design goal,
  and that the remedy, if one comes, is a symbolic layer for a subset
  of identities, is `devdocs/future.md#Symbolic values`'s alone (§1.3),
  which `devdocs/numbers.md` links (Q-011). (Amended: F-034, Q-001,
  F-442.)
  → `devdocs/numbers.md#Exact mode`, `#Exact operations` (`unresolved`),
  `#Working precision and the schedule`; `devdocs/cost.md#What the costs
  come from`; `devdocs/future.md#Symbolic values`.

Precision, certification and display (exact mode)

- **N8.** The display digits are how many digits of the answer must be
  certified. The app evaluates at a working precision a little above
  that (the digits asked for plus ten); if the digits cannot be
  certified at that precision, it evaluates again at double the
  precision, and so on, up to a ceiling of four times the sum of the
  precision limit and ten (`4 × (L + 10)`: 4,040 digits at the default
  limit of 1,000). The passes together cost at most about twice the pass
  that succeeds, except where the ceiling lies just above a doubled
  precision, where the last two passes are nearly one size and the
  passes together cost about three times the last. (Amended: F-022,
  F-508, F-064; Q-073, Q-047.)
  → `devdocs/numbers.md#Working precision and the schedule`.
- **N9.** `d` digits are certified when both ends of the ball round to
  the same `d`-digit value in the rounding mode (correctly rounded, not
  merely close); certification is checked from the digits asked down.
  → `devdocs/numbers.md#Certification and the display rule`.
- **N10.** What a line shows, in this order of kinds: *uncertified*
  (decimal mode only, `≈` with a dot above it plus a note), *unbounded*
  (no operation produces one today), *exact* (`=`), *zero* ("within
  2e-30 of zero", the value written `0` whatever the sign), *certified*
  (every digit asked for, `≈`), *partial* ("8 of 12 digits are
  certified"). Under today's display policy an exact value with more
  digits than shown is `≈` with no note (`1/3 ≈ 0.33333333`); that the
  policy is separable from the model and may change is
  `devdocs/future.md`'s to say (§1.3). *Partial* is reachable today by
  two routes: in exact mode a `log` whose value is rational but not an
  integer (`log(256, 512)` at three digits shows `≈ 1.1 (2 of 3 digits
  are certified)`), and under a directed mode a ball straddling a grid
  point (`approx(1)` and `cosh(1e-999999999)` show `≈ 1` with no digit
  certified). The two-argument `approx` (#100) is future work, named in
  `devdocs/future.md` only; neither it nor the issue travels into the
  pages. (Amended: F-023, Q-078, F-414, Q-011; the notes are quoted as
  they read after the "certified" change, Q-006, B-068, which lands
  before the pages: today's notes say "certain".)
  → `devdocs/numbers.md#Certification and the display rule`;
  `devdocs/architecture.md#The converter and its lines > The relation and
  the note`.
- **N11.** The rounding mode (seven; half-even default) is applied once,
  at the display, in exact mode, and at every observable step in decimal
  mode (N17); `round(x[, places])` is the one place it acts inside an
  expression. Directed modes show the value on the side they name, so a
  ball straddling a grid point under a directed mode certifies nothing
  (`cosh(1e-999999999)`, `approx(1)` show `≈ 1` with no digit
  certified).
  → `devdocs/numbers.md#The types` (rounding.ts), `#Certification…`;
  `devdocs/builtins.md#The exact functions`, `#Huge and tiny arguments`.
- **N12.** Formatting is `%g`-like: significant digits in the mode,
  trailing zeros dropped, exponent notation below `1e-4` or at the digit
  count, exponents as `1e+21`; the power of ten is never formed, so any
  magnitude renders. Every result pastes back into the calculator as a
  `have`, the guiding principle of the output format: the copy button
  writes parseable text from the internal representation, not the
  display text (`*` where the screen shows `×`, since display-only
  characters are not accepted by the grammar). The one edge, a value
  within the exponent bound whose rounding to the display digits carries
  past it (`9.5e1000000000000000000` at one digit), is refused as the
  bound's overflow with a message naming the expression, so that every
  line pastes back (Q-002, B-002; today the outcome throws, bugs.md).
  This is today's behaviour; that the written form might become
  configurable is `devdocs/future.md`'s to say (§1.3). (Amended: F-060,
  Q-002, F-457, Q-011.)
  → `devdocs/numbers.md#Formatting`; `devdocs/notation.md#Every literal
  parses back`; `devdocs/architecture.md#The converter and its lines`.
- **N13.** Ratio notation (exact mode only): an exact whole number is
  written entire when it has at most `W` significant digits; an exact
  non-integer as `n/d` when the two parts together have at most `W`
  digits (sign and slash not counted); else as `n/d × 1e+k` when that
  fits and `d ≠ 1`; else by the decimal display. Inexact values are
  always decimals. The width is independent of the display digits. A
  ratio is parenthesized where a factor follows it by juxtaposition
  (before a unit, `(5000/127) in`; before a parenthesized `have`) and is
  bare where `×` follows it (`in = 1/36 × 3 ft`) or nothing does; the
  pages state the juxtaposition edge (`1/2 in` is `1/(2 in)`, unlike
  `(1/2) in` and `0.5 in`). Today's screen forms no fraction for some
  dyadic values the rule admits (`2^-41` to `2^-63` at the default
  width), a defect fixed before `devdocs/notation.md` is written (B-004,
  Q-043). (Amended: F-062, F-121, Q-003, F-061.)
  → `devdocs/notation.md#The rule`, `#Where a ratio is written`, `#Not in
  decimal mode`.

Comparison and equality

- **N14.** Two exact values compare exactly, never refused for size and
  always decided; an inexact value is placed against an exact one
  directly; two inexact values through their difference against zero,
  which always aligns (the smaller operand absorbed into the radius). A
  ball is closed, and a touch is an order of its own, told from a
  straddle: a strict comparison of an inexact value at its bound is
  undecided, and a non-strict one decides only when the ball ends
  exactly on the bound, from the side the comparison admits; every
  comparison is undecided across. The built-ins' edge checks treat a
  touch as a straddle; the conditions do not. A difference that cannot
  be formed as a value, past the exponent bound or straddling it, counts
  as across zero (no difference is refused as too large). (Amended:
  F-029, F-028, Q-024, F-447.)
  → `devdocs/numbers.md#Comparison`; `devdocs/functions.md#The check at a
  call` (the verdict table).
- **N15.** A value that straddles an edge where the answer would jump
  (zero as a divisor, a domain end such as `1` for `asin`, a pole of
  `tan` or `gamma`, an integer or rounding boundary for `floor`/`round`,
  the exponent bound) is retried at more digits and, at the ceiling, is
  an error, "cannot be told from <edge> at this precision" (not a
  refusal, which names a size limit only, F-442). A value exactly on an
  exact case is decided (`tempC(-273.15)` meets `x >= -273.15`;
  `floor(2)` is `2`).
  → `devdocs/numbers.md#Exact operations`, `#The exponent bound`;
  `devdocs/builtins.md#The rules every built-in follows`, `#The exact
  functions`.
- **N16.** There is no equality operator today; the comparators are the
  four orderings, and equality surfaces only as `=` on a line, as exact
  cases, in the inverse check ("certainly other than the have" refutes),
  and in `<=`/`>=` chains. The pages state that as a plain fact;
  `devdocs/functions.md#Conditions` keeps the constraint that equality
  of inexact values is undecidable on balls and links
  `devdocs/future.md`, which alone records that equality operators and
  conditional expressions may be added and that a design for them must
  say what an undecidable comparison yields (§1.3; Q-112). (Amended:
  F-030, Q-011.)
  → `devdocs/functions.md#Conditions` ("no equality and no `!=`"), `#A
  function as the want` step 6.

Decimal mode

- **N17.** Decimal mode: every value is exact with at most `p` digits;
  every *observable step* is the exact result rounded once to `p` digits
  in the mode. An observable step is the value of each subexpression in
  the evaluation order: each `+ - * /`, juxtaposition, `^`, a leading
  `-`, each literal, each unit, and each built-in call as a whole, which
  certifies its result from its exact arguments and rounds it once; a
  user-defined function is not one step but its body's steps, as the
  expanded expression would be. A literal with more digits is rounded as
  read, unless its significand passes the significand limit, which
  refuses the literal before anything rounds it, in either mode (by
  intent, Q-040); a prefixed unit is one product rounded once; `approx`
  is the identity; comparisons and conditions always decide; dimensions
  keep exact rational exponents; every line is `=`. (Amended: F-037,
  F-041; the list is `docs/numbers.md#The two modes`'s, F-037.)
  → `devdocs/numbers.md#Decimal mode`.
- **N18.** A built-in call in decimal mode is certified: computed in
  exact mode at the working contexts from the step's digits plus the
  guard up to the ceiling, until its rounding to the step's digits is
  certified; if never (a value exactly on a rounding boundary of those
  digits), the midpoint's rounding is shown flagged *uncertified* (`≈`
  with a dot, "a step could not be certified at the precision limit"),
  sticky through every later step, the pipeline's quotients and the
  reciprocal line included. Shipped built-ins reach it: `log(b, x)`
  whose value is rational but not an integer or the reciprocal of one,
  since its exact cases look for those alone, so `log(4, 8)` (`3/2`) at
  one display digit and `log(256, 512)` (`9/8`) at three are uncertified
  under a nearest mode (documented as reachable; the exact case waits
  for a review, Q-048, issue #200; #173 is future work, `future.md`'s).
  (Amended: F-042.)
  → `devdocs/numbers.md#Decimal mode > The ceiling`.
- **N19.** Working digits (decimal mode): with `w ≥ p`, every step but the
  last is rounded to `w`; the last step of each displayed value is
  rounded to `p` directly from the exact result of its operation. The
  last steps are: the root of the `have` expression when the `want` is
  blank (with a `want`, both texts are operands and their roots are
  rounded to `w`), the conversion ratio, a list's counts and remainder,
  a function want's count, and the reciprocal line, whose one operand is
  the `p`-digit ratio shown rather than the `w`-digit `have` and `want`
  (so `3 m` in `in` at eight digits gives `0.0084666664` whatever the
  working digits; kept and documented, Q-046). A function's conditions,
  an inverse's body and the function applied back are evaluated at `w`.
  Under a directed mode the answer is the neighbor of a value on the
  grid, as that mode asks. (Amended: F-043, F-038.)
  → `devdocs/numbers.md#The working digits`.
- **N20.** In decimal mode `sin(pi() radian)` is `sin(3.1415927 radian)`
  `= -4.6410207e-8`; `1/3*3 = 0.99999999`; `2.5400001 cm` at three digits
  is `= 1 in`; two exact operands that cannot align take the neighbor
  rule (`1e999999999 + 1` is `1e+999999999`, or `1.0000001e+999999999`
  under ceiling).
  → `devdocs/numbers.md#Decimal mode`, `#Sums and alignment`.

Size limits and refusals

- **N21.** Significand limit (bits, default 65,536): the most bits of a
  significand's numerator and, separately, denominator. It is strict:
  every exact result's size is predicted before forming and refused
  with the bits needed. Where the same step would fit computed inexactly
  the message suggests `approx(…)` around the operand it names, or
  decimal mode; where it would not (a literal of too many digits,
  `factorial(20000)`, `2^1e-30000`, `sin` of a huge angle) it suggests
  nothing (Q-096). A result of the exact operations with an inexact
  operand is never refused for significand size, the exact operand put
  on the working grid and the result settled (N4); a built-in that works
  at an argument's own bits refuses there. Any result, exact or inexact,
  is still held to the exponent bound (N22). A dyadic denominator is
  stored with fives (`2^-30000` costs 69,658 bits; the refusal says
  "about 69,659", and the pages keep the true size and say "about",
  Q-091). The refusal is one error kind, `tooLarge`, always carrying a
  reach (`fits` or `exceeds`) and a need (`exact`, `bound` or
  `unknown`); the retry loop never retries it, and one first raised at a
  later pass ends the loop with the best earlier result. The kinds tell
  the user the failure's type, so that they can retry with a wider
  significand where that could resolve it; the in-node and in-step
  retries are correct as the code has them (Q-001). (Amended: F-051,
  F-056, F-012, F-509; the plan's earlier "classes of `tooLarge`, some
  of which the retry loop retries" is withdrawn.)
  → `devdocs/numbers.md#The significand limit`, `#Which limit a refusal
  names`; `devdocs/builtins.md#The exact functions` (factorial prediction).
- **N22.** Exponent bound: a value's decimal exponent must lie within
  ±10^18 (not a setting), whether the value is exact or inexact. Passing
  it is "too large/too small to compute: its exponent would pass 10^18 /
  fall below -10^18" (overflow / underflow); a ball reaching across the
  edge is retried and, at the ceiling, "cannot be told from the point
  where the result passes the exponent bound". `exp(2.3e18)` is a value,
  `exp(2.31e18)` refused; `exp(1e6) ≈ 3.0332154e+434294`.
  → `devdocs/numbers.md#The exponent bound`, `#Why the exponent bound
  stays at 10^18`; `docs/functions.md#Very large results and approx`.
- **N23.** `approx(x)`: the value known to the working precision and no
  better (radius the larger of `x`'s own and one unit in the last
  working digit); never narrows; idempotent; keeps the dimension; zero
  and unbounded pass through; the identity in decimal mode. It relaxes
  the significand limit (sums, integer powers, products, quotients whose
  exact result would pass it) and never the exponent bound; `approx` on
  a base does not relax an exponent literal that cannot itself be formed
  within the limit (`(approx(1e20) - approx(1e20))^1e100000` is refused
  however it is computed). (Amended: Q-099.)
  → `devdocs/numbers.md#approx`, `#The significand limit` (last paragraph).
- **N24.** Which limit a refusal names: a product, quotient or power
  past both limits is reported at the exponent bound; a hair from the
  bound, at the significand limit (`7^1e19` is too large to compute;
  `2.54^1e18` is past the significand limit, with the reach the
  operation states, N21). A sum never faces the choice: a sum that
  aligns and passes the bound is too large or too small to compute, and
  a sum that cannot be aligned has the value of its larger operand,
  which is within the bound. (Amended: F-052.)
  → `devdocs/numbers.md#Which limit a refusal names`.

Cost (observable as latency)

- **N25.** A value that certifies costs milliseconds; one that never
  certifies runs to the ceiling, which is why the precision limit is a
  cost setting; the first Gamma-family call at a new ceiling computes
  the Bernoulli numbers (seconds); constants are computed on first use
  and kept.
  → `devdocs/numbers.md#Working precision and the schedule`, `#Memoized
  constants`; `devdocs/builtins.md#The Gamma and Beta families`;
  `devdocs/cost.md#What the costs come from`.

#### 1.1.2 Settings that parameterize the numeric model

| Setting (stored key) | Model parameter | Effect |
| --- | --- | --- |
| Display digits (`displayDigits`) | `NumberContext.precision` at the user level | Exact mode: digits that must certify (N8–N10). Decimal mode: the grid of every step and of literals as read (N17). |
| Rounding (`rounding`) | the context's rounding mode | Exact: the display's one rounding (N11). Decimal: every step (N17). `round()` (N11). |
| Mode (`mode.kind`) | `NumberContext.mode` (`exact`/`decimal`) | Selects the arithmetic (N1–N16 vs N17–N20). |
| Notation (`mode.notation`, `digits`/`ratio` + width) | display only (`RatioDisplay.width`) | N13; exact mode only; never changes what is exact. |
| Working digits (`mode.working`, `digits`/`extended` + count) | `NumberContext.working` (decimal mode) | N19. |
| Precision limit (`precisionLimitDigits`) | `NumberContext.ceiling = 4 × (L + 10)` | Caps display and working digits; bounds the retry schedule (N8) and decimal-mode certification (N18); rebuilds the unit table. |
| Significand limit (`significandLimitBits`) | `NumberContext.significandLimitBits` | N21; also caps the precision limit via `precisionLimitFor` (2,453 at the default). |
| Probe budget (`budgetMs`) | none (the probe's per-pass budget) | Only the "Measure this device" proposal. |

Fixed, not settings: the exponent bound (10^18), the guard of ten
digits and the factor four, `MIN/MAX_SIGNIFICAND_LIMIT_BITS` (358 /
2^20), the width's range `[1, 1000]`, `ROOT_DEGREE_LIMIT` (2^32).
→ `devdocs/settings.md#The model`; `devdocs/numbers.md#Working precision
and the schedule`, `#The significand limit`.

#### 1.1.3 Edge cases users are likely to hit

- `1 m` in `in` is `≈ 39.370079 in` although exact (`= (5000/127) in`
  under ratio notation). `devdocs/notation.md#(top)`.
- `sqrt(2)^2 - 2` is `≈ 0` with a bound; `1 / (sqrt(2)^2 - 2)` is an
  error; `floor(sqrt(2)^2)` is an error; each runs to the ceiling on
  every keystroke. `devdocs/numbers.md#Exact mode`; `devdocs/builtins.md#The
  exact functions`.
- `turn` into `deg` is `≈ 360`; `parsec` into `au` is `≈`.
  `devdocs/builtins.md#The elementary routines`.
- `1/3*3` is `= 1` in exact mode and `= 0.99999999` in decimal mode;
  `ln(exp(1/10))` is `= 0.099999984` at eight digits and `= 0.1` with
  twelve working digits. `devdocs/numbers.md#Decimal mode`, `#The working
  digits`.
- `1e999999999 + 1` refused ("would need a significand of about
  3,321,928,093 bits"); `approx(1e999999999) + 1` is `≈ 1e+999999999`.
  `devdocs/numbers.md#The significand limit`.
- `exp(1e999)` refused with or without `approx`; work in log space.
  `devdocs/numbers.md#Why the exponent bound stays at 10^18`.
- `factorial(approx(5))` is an error ("needs a whole number known
  exactly"); `factorial(20000)` refused, with no remedy named (Q-096);
  `gamma(20001)` is the way.
  `devdocs/builtins.md#The exact functions`.
- `2^-30000` refused while `2^-28000` is a value (dyadic storage cost);
  `3^-100000` refused by its own bits. `devdocs/numbers.md#The significand
  limit`.
- `tan(90 deg)` "cannot be told from a pole"; `asin(approx(1))`
  undecided at the edge. `devdocs/builtins.md#Domains, exact cases and edges`.
- `round(2.5)` is `2` under half-even and `3` under half away from zero.
  `devdocs/builtins.md#The exact functions`.
- `pow(2, 1e-30000)` is `≈ 1` where `2^1e-30000` is refused (#88, #89).
  `devdocs/architecture.md#Evaluation`; `devdocs/numbers.md#Roots and powers`.
- `(1/3) * 1e30` is `1/3 × 1e+30` under ratio notation; `5000/127` at a
  width below seven is `5/127 × 1e+3`. `devdocs/notation.md#The rule`.
- A unit-list remainder that rounds up carries: `2.9999999999 ft` in
  `ft;in` is `3 ft`; `3599.9999999999 s` in `hr;min;s` is `1 hr` (not
  under `floor`; under the decimal display, since with the ratio
  notation an exact remainder that fits its width is written entire and
  nothing carries, F-072). `devdocs/architecture.md#Unit lists`.
- A ball around zero is written `0`, never `-0`; its bound is rounded up
  to one digit. `devdocs/numbers.md#Certification…` (zero kind).
- `9.5e1000000000000000000` at one digit, whose rounding carries past
  the exponent bound, is refused as the bound's overflow with a message
  naming the expression (Q-002, B-002; today the outcome throws).
  `devdocs/notation.md#Every literal parses back`.
- `sin(1e-999999999 radian)` certifies at once; `sin(1e5000 radian)`
  costs `pi` to that size each time; `sin` of an angle past
  `2^significandLimitBits` radians is refused.
  `devdocs/builtins.md#Huge and tiny arguments`.

#### 1.1.4 What stays in devdocs (representation and mechanism), by pointer

- The type tower `Rational`/`Scaled`/`Radius`/`Ball`/`Fixed`/`Floating`,
  the canonical form's mechanism and the formal argument for its
  uniqueness (the form itself, glossed, and the argument in plain words
  are `docs/numbers.md#How a value is held`'s, F-439 as amended
  2026-10-13), why one decimal exponent: `devdocs/numbers.md#The types`.
- Henrici/Lehmer gcd, cross-cancellation, `BOUND_BAND`, `log2Bounds`:
  `#Exact operations`, `#The exponent bound`.
- The kernel's door and exit, memoized constants, `MEMO_MARGIN`:
  `#The kernel's boundary`, `#Memoized constants`.
- Root and power algorithms, `rootInLogSpace`, `powLogSpace`, parity
  rules: `#Roots and powers`; `devdocs/builtins.md#Domains…` (pow).
- The classifier for the exponent bound, `logPowerBlame`,
  `powerRefusal`: `#The exponent bound`, `#Which limit a refusal names`.
- Why 10^18 stays and the six-pass table of digits (the scratch build's
  per-size milliseconds go, Q-017 governing the section over Q-016's
  rule; F-510): `#Why the exponent bound stays at 10^18` (duplicated
  today in `docs/functions.md#Very large results and approx`; see §9).
- Certification of unformable radii, `certifiedDigits` scanning,
  `zeroBound`: `#Certification and the display rule`.
- The schedule's derivation (why four and ten), `workingContexts`,
  `resolve`'s retry predicate, `PassObserver`: `#Working precision and the
  schedule`.
- Settling, `step`/`settle`, `onGrid`: `#Settling`, `#Sums and alignment`.
- Decimal mode's provisional rulings, `uncertified` as a flag,
  `operandContext`: `#Decimal mode`, `#The working digits`.
- Size prediction (`Need`, `Reach`, `multiplyWithin`, …), the asserted
  invariant, the ruled-out rounding alternative: `#The significand limit`.
- `approx`'s alternatives (syntax forms): `#approx`. The binary form
  `approx(x, u)` (#100) and its tentative design are `devdocs/future.md`'s
  alone; `#approx` names the form in one clause that links there (Q-035,
  Q-104).
- Failures vs preconditions: `#Failures`; formatting internals:
  `#Formatting`.
- The ratio notation's width rule and the alternatives set aside,
  `show`'s `fraction`/`scale`: `devdocs/notation.md#The rule > The width`
  (a label, not a heading, F-511), `#Where it lives`.

#### 1.1.5 Stale passages in the numeric pages, tagged

Passages that describe a superseded design, each tagged **update**
(rewrite to the current design), **keep as intent** (rewrite as
rationale or as a ruled-out alternative, in the present tense) or
**drop** (delete; the page already states the intent). The per-version
migration list in `devdocs/settings.md#Storage` is tagged below (§12,
question 27). One row is tagged **withdrawn**: the plan's own premise
was wrong (F-509).

| Where | Stale passage | Tag | What the rewrite keeps |
| --- | --- | --- | --- |
| `devdocs/numbers.md#The types > Scaled` | "A first design carried a binary exponent beside the decimal one…", and the division "measured, when the base was chosen, at 0.2 ms against 0.04 ms" | keep as intent | the ruled-out alternative, one exponent per base, rejected because the mixed base leaks into every operation that brings the two together; the cost of one base stated as its present cost |
| `devdocs/numbers.md#Roots and powers` | "…which converted to zero and reported a false `unresolved`" | keep as intent | why the third case goes to log space: such a significand would convert to zero and report a false `unresolved` |
| `devdocs/numbers.md#The kernel's boundary` | "(the hard bound alone was too small from a limit of about 350,000 bits up)" | keep as intent | why the door allows four times the hard bound: the hard bound alone does not hold a significand within the limit at a magnitude of `2^±significandLimitBits` once the limit passes about 350,000 bits |
| `devdocs/numbers.md#Certification and the display rule` | "(A first version widened the midpoint taken to two digits beyond those asked…)" | drop | the distance rule stands on its own |
| `devdocs/numbers.md#Working precision and the schedule` | "they moved once, from a fixed ceiling of a thousand digits with the digits limited to two hundred, when the precision limit became a setting" | drop | that four and ten are judgments, not measurements, is already stated |
| `devdocs/numbers.md#Settling` | "(The first design let inexact midpoints grow as exact rationals, and a thirteen-thousand-bit dyadic to the fifth power was then a size the significand limit refused.)" | keep as intent | why settling exists: an inexact midpoint left to grow as an exact rational reaches the significand limit in a few operations |
| `devdocs/numbers.md#Settling` | "Its primitive, `settle`, is not exported: an earlier shape, a settle any inexact ball could reach…, was a contract that lived in documentation." | keep as intent | `settle` is not exported because a settle any ball could reach would be a contract that lives in documentation |
| `devdocs/numbers.md#Decimal mode` | "An earlier version of the mode rounded every step and also tracked, in the radius, how far the roundings had carried the value… That was withdrawn: …" | keep as intent | the ruled-out alternative, a radius carried through the mode's steps: it answers a question the mode does not ask, a directed rounding could never certify its last digit, and it adds no behaviour exact mode lacks |
| `devdocs/numbers.md#The significand limit` | "Measuring after forming, which the limit did at first, was deliberate while it lasted (…), and the strict limit keeps its answers by predicting after the gcds." | keep as intent | the ruled-out alternative, measuring after forming, and why prediction runs after the gcds (a prediction from unreduced sizes refuses `x / x`) |
| `devdocs/builtins.md#The elementary routines` | "Timing it once found that the exact arithmetic on settled midpoints ran Euclid's gcd on dyadics of the ceiling's size…, which is why the gcd strips the common power of two first." | keep as intent | the gcd strips the common power of two first because settled midpoints are dyadics of the ceiling's size, on which Euclid's gcd costs tens of milliseconds a sum |
| `devdocs/builtins.md#The Gamma and Beta families` | "(growing the memo term by term had a cold ceiling pass recompute the run five times over)" | keep as intent | why a series reserves its count up front: a memo grown term by term would recompute the run several times in one cold pass |
| `devdocs/builtins.md#Huge and tiny arguments` | "(`acos(1e-9860)` was refused at the default limit)" | drop | the reason `asin` and `acos` take their expansion earlier is already stated |
| `devdocs/notation.md#The rule > The width` | "The first rule tied the fit to the display digits, each part fitting within them; that coupled a length to a precision…, hid exact values…, and could not be read off the settings." | keep as intent | the ruled-out alternative, a fit tied to the display digits, with those three reasons |
| `devdocs/settings.md#The model > Rounding` | "the stored value of the earlier default, `halfAwayFromZero`, echoed by every save…, was migrated to `halfEven` once, with the control one tap away" | drop | the reason for half even is already stated; the migration row in `#Storage` carries the mechanism |
| `devdocs/settings.md#Storage` | the per-version migration list (1 → 2 to 4 → 5) with the fields each reads and writes, and "so that the mechanism was exercised end to end before a migration with a semantic change existed" | update | keep why migrations exist, the envelope and the format version, the interface and the load-and-migrate flow, and the intent and structure of the current version's fields; the migrated fields are a code concern (§12, question 27) |
| `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule` | `tooLarge` described as one refusal carrying a `Need` and a `Reach`, which the retry loop never retries | withdrawn | the pages are right: `tooLarge` is one error kind carrying a reach and a need, which the retry loop never retries (Q-001, F-051, F-509); the plan's "classes some of which are retried" is withdrawn, and N21 and §1.1.6 item 14 are amended |

#### 1.1.6 Claims that most need verification against the code

Ranked by how much of docs/ would rest on them and by how specific the
text is (quoted messages and constants are easy to get wrong). The
units have run; the list stands as what they verified, with an item's
outcome noted where its premise was corrected.

1. N10's kind order and the exact wording of the three notes and the
   uncertified note (`display.ts`; `outcome.ts`, whose `noteOf` words the
   notes; `messages.ts` words only the warnings of an assumed condition,
   F-506, Q-074).
2. N17's list of what counts as a step in decimal mode, literal rounding
   as read, and "a prefixed unit is rounded once" (`evaluate.ts`,
   `table.ts`, `context.ts`).
3. N19's list of "last steps" and the directed-mode neighbor claim
   (`pipeline.ts`, `outcome.ts`, `context.ts#operandContext`).
4. N8's schedule (p + 10, doubling, `4 × (L + 10)`, nine passes at eight
   digits) and N21/N22 constants (65,536; 2,453; 358; 2^20; 10^18;
   `BOUND_BAND`) (`context.ts`, `pipeline.ts`, `rational.ts`,
   `scaled.ts`, `settings.ts`).
5. N21's `fits`/`exceeds` suggestion rule and the exact message texts
   (`rational.ts`, `messages.ts`, `evaluate.ts`).
6. N14's verdict table and "touching counts as straddling"
   (`ball.ts#position`, `#orderOf`, `evaluate.ts#decide`).
7. N13's five rules and the counting of the width (`display.ts`,
   `outcome.ts`).
8. N23's radius rule (larger of own and one unit), zero pass-through
   (`builtins/approx.ts`, `ball.ts#widened`).
9. N3 "exactly three sources" (any `onGrid` rounding of an exact operand
   is charged to an already inexact result?) (`ball.ts`). Settled: two
   sources in either mode (F-010).
10. N12's copy path: that the copy button writes from the internal
    representation and that display-only characters are rejected by the
    grammar (settled by the owner, §12 question 11; confirm in
    `print.ts`, `copy-button.ts`, `expr.ts`), and whether `#` is accepted
    in the fields.
11. N24's "a hair from the bound is tooLarge" (`scaled.ts#powerRefusal`).
12. N11 directed-mode behaviour for exact values with more digits than
    shown (`39.3700787401` rounded down) (`display.ts`).
13. N10's *partial* kind: whether any input today yields a line with
    some digits certified and a note, or whether the kind is reachable
    only through the undesigned two-argument `approx` (`display.ts`,
    `pipeline.ts`, the tests of `display.ts`). Settled: reachable today
    by two routes (Q-078, F-023).
14. N21's `tooLarge` (`rational.ts`, `scaled.ts`, `ball.ts`,
    `pipeline.ts`). Settled: one error kind carrying a reach and a need,
    which the retry loop never retries; the plan's premise of classes
    some of which are retried is withdrawn (Q-001, F-051, F-509).

#### 1.1.7 Source modules to check against

`src/core/rational.ts`, `scaled.ts`, `radius.ts`, `ball.ts`,
`rounding.ts`, `context.ts`, `display.ts`, `pipeline.ts`, `digits.ts`,
`fixed.ts` (boundary only), `constants.ts`, `quantity.ts`
(`stepQuantity`), `evaluate.ts` (literal/unit nodes, settling),
`src/core/builtins/approx.ts`, `src/outcome.ts`, `src/messages.ts`,
`src/settings.ts` (`contextOf`, `ratioOf`, `precisionLimitFor`),
`src/system-build.ts` (table at the ceiling).

### 1.2 The quantity

#### 1.2.1 User-level semantic model

Dimensions and kinds

- **Q1.** A quantity is a magnitude (a value as in §1.1) paired with a
  dimension: an exponent vector over the primitives whose exponents are
  rational numbers, zero exponents absent. The exponents are rational by
  design, so that dimensions stay exact: `m^(1/2)` is a dimension,
  `(m^2)^(1/2)` is `m`, an irrational exponent is not representable, and
  that is why `^` takes only a literal rational exponent (C63); the
  exponents stay exact in both modes.
  → `devdocs/architecture.md#Quantities, dimensions and kinds`,
  `#Expressions` (the `^` exponent); `devdocs/numbers.md#Decimal mode`
  ("Dimensions carry exact rational powers").
- **Q2.** Primitives are declared by the definitions file in two roles:
  dimension primitives (`m`, `kg`, `s`, …; body `!`) and kind primitives
  (`radian`; body `!kind`), dimensionless markers that ride in the same
  vector. Which kinds exist is the file's business, not the core's.
  → `devdocs/architecture.md#Quantities…`; `docs/definitions.md#The format`.
- **Q3.** Conformance is checked in two steps: the vectors restricted to
  dimension primitives (a *dimension mismatch*, e.g. length vs time),
  then the full vectors (a *kind mismatch*, naming the kinds that
  differ). The same check, with the same roles, decides `have` vs
  `want`, the operands of `+`/`-`, a call's argument against its
  parameter's annotation, and adjacent terms of a condition.
  → `devdocs/architecture.md#Quantities…`, `#Evaluation`;
  `devdocs/functions.md#Annotations`, `#Conditions`.
- **Q4.** There is no special case for zero: `0` is a plain number, so
  `1 m + 0` and `sin(0)` are mismatches; `1 rad + 1` is a kind mismatch;
  `rad/s` does not convert to `Hz`, while `rpm` converts to `rad/s`.
  → `devdocs/architecture.md#Quantities…`; `devdocs/builtins.md#Dimension
  rules > Angles`.
- **Q5.** A quantity carries no unit of its own: its magnitude is held in
  the primitives, so `100 lb` and `45.359237 kg` are one value and
  nothing remembers which was typed. Consequences: an annotation checks
  a dimension and changes no value; `floor`, `ceil`, `trunc`, `round` and
  the integer functions take plain numbers (`floor(3.7 ft)` would floor
  the metres); `abs`, `sign`, `div`, `mod`, `approx` take quantities.
  → `devdocs/functions.md#Annotations`; `devdocs/builtins.md#Dimension
  rules > floor and its kin`.
- **Q6.** Arithmetic: juxtaposition and `*` multiply dimensions, `/`
  divides, `^` raises by its literal rational exponent, `+`/`-` require
  conformance and keep the shared dimension, negation touches the
  magnitude only. Only the magnitude can fail (zero divisor, even root
  of a negative, a size limit).
  → `devdocs/architecture.md#Quantities…` (last paragraph), `#Evaluation`.
- **Q7.** A dimension is written in the expression language itself:
  primitives in declaration order, positive exponents first, negative
  ones after `/`, `1` for an empty numerator, a non-integer exponent
  parenthesized (`m^2 kg / s^3 A`, `m^(1/2)`), so an error's dimension
  can be typed back.
  → `devdocs/architecture.md#Quantities…`.
- **Q8.** Angles: `sin`, `cos`, `tan` require the `radian` kind
  (`sin(30 deg)` works, `sin(1)` says to write `sin(1 radian)`); `asin`,
  `acos`, `atan`, `atan2` return the `radian` kind, so `asin(0.5)` into
  `deg` is `30 deg` and into `turn` is `1/12 turn`, an angle still,
  while `asin(0.5) / radian` is the plain number (the conversions into
  `deg` and `turn` are `≈`, the angle units carrying `pi()`); the
  hyperbolic functions take plain numbers; `atan2` takes two quantities
  of one dimension, kinds included. (Amended: F-067, F-144; "plain
  number" per Q-019.)
  → `devdocs/builtins.md#Dimension rules`.

Units and names

- **Q9.** A name means the unit of that name if there is one, else one
  prefix followed by a unit; an exact name always wins (`min`); prefixes
  do not stack; prefixes and units are separate namespaces (`m-` and
  `m`); lists, functions and built-ins share the unit namespace and may
  not read as a prefixed unit; prefixes never apply to functions
  (`ktempC(1)` is a call of nothing); an ambiguous name is a file error,
  not a resolved ambiguity (`u` is absent for this reason; `at`, absent
  as the technical atmosphere, reads as `a` + `t`, an attotonne; Q-075,
  F-112).
  → `docs/definitions.md#Names`; `devdocs/architecture.md#Definitions`;
  `devdocs/builtins.md#Names`.
- **Q10.** Every factor is read exactly as written, so a conversion
  between units defined by such factors is exact (`1 in` is `2.54 cm`;
  `1 ft` in `in` is `= 12 in`). Most factors are the exact values their
  defining documents state; a few are measured values carried to the
  digits their source gives (the dalton, CODATA 2018; the tropical and
  sidereal years). The angle units `deg`, `grad` and `turn`, everything
  built on them (`arcmin`, `arcsec`, `gon`, `rev`, `rpm`, the `dms`
  list), `parsec` and `oersted` call `pi()` and are inexact, carrying
  its radius; `sr`, as `radian^2`, is exact. The five SI defining
  constants (`c`, `e`, `planck`, `boltzmann`, `avogadro`) are exact by
  the 2019 SI; `gravity` is exact by convention, not by the SI.
  (Amended: F-069, Q-033, Q-041, Q-085; "defined" and "measured"
  factors, F-486.)
  → `docs/definitions.md#What the file contains`; `devdocs/numbers.md#(top)`,
  `#approx` (last paragraphs); `devdocs/builtins.md#The elementary routines`.
- **Q11.** The unit table is built once, in exact mode, at the ceiling of
  the precision limit, and a unit is settled to each pass's precision at
  the node that names it; in decimal mode a unit is rounded once to `p`
  digits (`surveyfoot` at eight digits is `0.30480061 m`).
  → `devdocs/numbers.md#Working precision and the schedule`, `#Decimal
  mode > A unit`.
- **Q12.** Temperature: `degC`, `degF`, `degR` are differences (`1 degC`
  is `1 K`); a reading is a call of `tempC`/`tempF`, whose inverses let
  the function be the `want`; there are no affine units. Logarithmic
  units are functions the same way (`decibel`, `bel`, `neper`).
  → `docs/definitions.md#What the file contains`;
  `devdocs/functions.md#(top)`; `devdocs/future.md#Ruled out, and why`;
  `devdocs/builtins.md#Names`.

Conversion and the answer

- **Q13.** With a single `want`, the answer is the ratio of the two
  magnitudes after conformance; the `want` may carry a magnitude (`1 mi`
  into `1000 ft` is `5.28 × 1000 ft`); failures are the mismatch, a
  `want` of zero, a `want` that cannot be told from zero, a ratio past
  the exponent bound or straddling it, and a ratio whose exact
  significand would pass the significand limit (`3^30000 m` into
  `5^20000 m`, refused with `approx` named around the `have`; intended,
  with `convert.ts`'s comment corrected, B-038). A blank `want` answers
  in the primitives (`1 in = 0.0254 m`). (Amended: F-070.)
  → `devdocs/architecture.md#Conversion`, `#The converter and its lines`.
- **Q14.** The reciprocal line: a conversion into one unit also answers
  the other way round (`in ≈ 0.027777778 × 3 ft`), each line's relation
  decided from its own value; none for a unit list, a blank `want`, a
  function `want`, a zero or an unresolvable value. It is computed once
  at the user's context, outside the retry loop (#92).
  → `devdocs/architecture.md#The converter and its lines > The reciprocal`.
- **Q15.** Unit lists (`ft;in`, or a defined list's name): a sum largest
  first, every unit but the last an integer count (truncated toward
  zero, so terms carry `have`'s sign), the last the remainder; a count
  whose ratio straddles or touches an integer takes the integer nearest
  its midpoint; the remainder is rounded at the digits it certifies (the
  display digits when all are) and a rounding that reaches a whole of an
  earlier unit carries, while under the ratio notation an exact
  remainder that fits its width is written entire and nothing carries;
  zero terms are left out, as is a last term that cannot be told from
  zero (a sum of nothing but zeros keeps its last); `=` only when every
  term is exact. (Amended: F-072, Q-089.) The units
  must conform to `have`, be positive throughout their ball, and
  decrease along the list (by midpoint); they need not be multiples
  (`mi;km`) and may carry magnitudes (`ft;in/8`). A list is an output
  form only; its name is not a unit anywhere else.
  → `devdocs/architecture.md#Unit lists`, `#The converter and its lines >
  A unit list`; `docs/definitions.md#Unit lists`.
- **Q16.** A function as the `want` (third output mode): needs an
  inverse; the `have` must conform to the result and meet the inverse's
  conditions; the recovered argument must meet the function's
  conditions; the function is reapplied and a value certainly other than
  the `have` refutes the inverse; the answer is written as the call with
  the argument as a count of the parameter's annotation unit
  (`2 ft = twelve(2 in)`, the running example renamed because `dozen`
  is a unit of the file, Q-015, F-099; `300 K = tempF(80.33)`), with no
  reciprocal.
  → `devdocs/functions.md#A function as the want`, `#Display`;
  `devdocs/architecture.md#Functions`.
- **Q17.** The `want` is read as: one bare name that is a list → the
  list; one bare name that is a function → the function; any other
  single item → a unit expression; two or more `;`-separated items → a
  typed list. A `want` that is a call is an ordinary expression.
  → `devdocs/architecture.md#Pipeline`, `#Unit lists` (last paragraph),
  `#Functions`.
- **Q18.** Every result line is typeable back as a `have`: a `want` with
  a magnitude is joined with `×`, a `want` that is a sum, difference or
  negation is parenthesized, a ratio is parenthesized before a unit.
  → `devdocs/architecture.md#The converter and its lines`;
  `devdocs/notation.md#Where a ratio is written`.
- **Q19.** Errors point at the text at fault (the input marked on its
  side), a sum's mismatch worded as the same mismatch between `have` and
  `want`, and a dimension formatted as in Q7.
  → `devdocs/architecture.md#Evaluation`, `#Messages`.

#### 1.2.2 Settings that parameterize the quantity model

None parameterize the dimension side. The magnitude side follows §1.1.2:
display digits, rounding and mode decide how a ratio, a list's remainder
and a recovered argument are shown and rounded (Q13–Q16; `roundTerms`
uses the display's digits and mode); the precision limit fixes the
ceiling the unit table is built at (Q11), so changing it rebuilds the
table; decimal mode rounds each unit once (Q11).
→ `devdocs/architecture.md#Unit lists` (`roundTerms`);
`devdocs/numbers.md#Working precision and the schedule`.

#### 1.2.3 Edge cases users are likely to hit

- `1 m + 0`, `1 m + 1/2 m` (`1/(2 m)`), `1/12 year` (a frequency): the
  juxtaposition-before-quotient rule. `docs/definitions.md#Expressions`.
- `sin(1)`, `2 asin(0.5) + 1`, `sin(pi())`: kind mismatches; write
  `sin(1 radian)`, `sin(f t turn)`. `devdocs/builtins.md#Dimension rules`.
- `rad/s` into `Hz` is an error (a kind mismatch); `J` is `N m` (no
  torque kind).
  `devdocs/architecture.md#Quantities…`.
- `floor(3.7 ft)` is an error; write `floor(3.7 ft / ft) ft`; `mod(-30 deg,
  360 deg)` is `330 deg`; `div(7 ft, 2 ft)` is `3`.
  `devdocs/builtins.md#The exact functions`.
- `m2` is a name; `kg(m/s)` is a call of `kg`; `kg (m/s)` a product;
  `kkm`, `inches` are nothing; `dB` is `d` + `B`, use `decibel`.
  `docs/definitions.md#Names`, `#Expressions`; `devdocs/builtins.md#Names`.
- `2 tempC`, `tempC;degC`, `2 time`: a function's or a list's name is
  not a unit. `devdocs/functions.md#A function as the want` (last
  paragraph); `devdocs/architecture.md#Definitions`.
- `in;ft` and `ft;12 in` are errors (not decreasing); a unit that cannot
  be told from zero is an error as a list unit and not retried.
  `devdocs/architecture.md#Unit lists`; `devdocs/numbers.md#Working
  precision…` ("Two gaps are accepted").
- `-1 m` into `ft;in` is `-3 ft - 3.3700787 in`; `3601 s` into
  `hr;min;s` is `1 hr + 1 s`; `turn` into `deg;arcmin` is `≈ 360 deg`,
  not `359 deg + 60 arcmin`. `devdocs/architecture.md#Unit lists`.
- `bmi(100 lb, 4 ft)` with a blank `want` shows `kg / m^2`, not the
  annotated `lb/ft^2` (the issue, #130, is `devdocs/future.md`'s alone,
  Q-011). `devdocs/functions.md#Annotations`.
- `-5 K` into `tempC` is an error by `tempC`'s own condition; `tempF(-40)`
  into `tempC` is `tempC(-40)`. `devdocs/functions.md#A function as the
  want`.
- `0 s` as the `want` for a length is a mismatch, not "zero want";
  `0 ft = 0 in` has no reciprocal line. `devdocs/architecture.md#Conversion`,
  `#The converter and its lines > The reciprocal`.
- `1e999999999 m` into `ft;in` counts by the settled midpoint;
  `3^32767 m` into `ft/7^21845;in/7^21845` is tooLarge.
  `devdocs/architecture.md#Unit lists`.

#### 1.2.4 What stays in devdocs, by pointer

- Dimension arithmetic, the roles plumbing (`Primitives`), declaration
  order, "a name the table does not declare counts as a dimension
  primitive": `devdocs/architecture.md#Quantities, dimensions and kinds`.
- `Quantity` as the pairing layer; which operation takes a
  `NumberContext`: same section, last paragraph.
- The build: the walker, memoization, cycles, the ambiguity index and
  its cost, the build-error catalogue, the lookup's one throw:
  `devdocs/architecture.md#Definitions`; `devdocs/benchmarks.md#What each
  benchmark asserts`.
- `convert`'s error kinds (`unresolvedWant`, `unresolvedBound`,
  `zeroWant`), the count rule's mechanics, `roundTerms`' rebuild
  fallback: `devdocs/architecture.md#Conversion`, `#Unit lists`.
- The reciprocal line, computed in `src/outcome.ts` (not a view in the
  component), and the parsed `have` and `want` handed over in the
  `Conversion` (only a blank `want` re-parses the `have`; F-505, Q-074):
  `devdocs/architecture.md#The converter and its lines`.
- Inverse checking as refutation, `applyFunction`/`invertFunction`
  sharing, the collector of assumptions: `devdocs/functions.md#A function
  as the want`, `#An undecided condition`.
- Kind-lenient conversion, complex magnitudes, offsets: `devdocs/future.md`.

#### 1.2.5 Stale passages in the quantity and language pages, tagged

Tags as in §1.1.5.

| Where | Stale passage | Tag | What the rewrite keeps |
| --- | --- | --- | --- |
| `devdocs/architecture.md#Parsing` | "(The call rule broke it once: a call and a name began alike…, so a nested call with an error in it cost `2^k`… A cut combinator… was set aside for the fix: …)" | keep as intent | why the lookahead includes the name's own characters, and the ruled-out alternative, a cut combinator, rejected because a committed failure skips every enclosing `alt`, `optional` and `many`, so a misplaced cut changes the meaning of valid input |
| `devdocs/architecture.md#Pipeline` | the diagram's `format ──▶ string`, where the text names `show`, `roundTerms` and `outcomeOf` | update | name the function the pipeline ends in (verify in V2) |
| `devdocs/functions.md#Build-time checks` | "(The first version of the check evaluated each body at one of the declared unit, which the elementary functions made untenable.)" | drop | the sentence before it already gives the reason in the present tense |
| `devdocs/functions.md#Alternatives considered > The syntax` | "The first form, `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`, declared… and took one argument. Extending it in place… the first form's use of the function's own name…" | keep as intent | the ruled-out alternatives, a bracketed head, keyword clauses and a multi-line block, each with the reason it loses, written as alternatives rather than as a first form |
| `devdocs/functions.md#Annotations` | "No message is worded for a definitions rejection today, since definitions cannot be typed (#132); the wording meant for this one is …" | update | state the current fact, that definitions cannot be typed so no rejection is worded; the issue (#132) and the intended wording are `devdocs/future.md`'s (Q-011) |
| `devdocs/functions.md#Conditions` | "There is no equality and no `!=`. `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument." | update | the plain fact (the comparators are the four orderings; no equality and no `!=`) with the constraint that equality of inexact values is undecidable on balls; that equality operators and conditional expressions may come, and what a design must answer, is `devdocs/future.md`'s, which the page links (F-030, Q-011, Q-112) |

#### 1.2.6 Claims that most need verification against the code

1. Q3's two-step check and that sums, calls and conditions use the very
   same function with the same roles (`dimension.ts`, `evaluate.ts`,
   `dimension-of.ts`).
2. Q15's count rule (truncate toward zero; straddling → the integer; the
   decreasing check by midpoint; the positive check on the whole ball),
   the carry in `roundTerms`, and the zero-term omission (`convert.ts`,
   `outcome.ts`, `display.ts`).
3. Q17's reading order of the `want` (list name, function name, unit) and
   that a list's name typed inside a list is an unknown unit
   (`pipeline.ts`, `table.ts`).
4. Q9's resolution order inside a function body (parameter before unit
   before prefix) and the function-before-built-in order
   (`evaluate.ts`, `table.ts#resolveFunction`).
5. Q8's dimension rules table, in particular `atan2` "kinds included" and
   `mod` returning the arguments' dimension (`builtin.ts`,
   `builtins/*.ts`).
6. Q7's dimension text (declaration order, `1` numerator) (`dimension.ts`,
   `print.ts`).
7. Q11's "table built in exact mode at the ceiling; settled at the node"
   and the decimal-mode unit rounding (`system-build.ts`, `evaluate.ts`).
8. Q14's exclusions for the reciprocal line (`outcome.ts`).
9. Q16's six steps and `inverseMismatch`'s criterion (`pipeline.ts`,
   `evaluate.ts#invertFunction`).
10. Q10's "every factor exact" and which units call `pi()` (`units.txt`
    read in unit D3).

#### 1.2.7 Source modules to check against

`src/core/dimension.ts`, `quantity.ts`, `convert.ts`, `table.ts`,
`names.ts`, `name-index.ts`, `build.ts`, `graph.ts`, `dimension-of.ts`,
`evaluate.ts` (sums, calls, `applyFunction`, `invertFunction`),
`pipeline.ts` (reading the `want`), `src/outcome.ts`, `src/core/print.ts`,
`src/units.txt`, `src/units.test.ts`, `src/system-build.ts`,
`src/system-table.ts`, `src/core/builtin.ts` (dimension-rule helpers).

### 1.3 Design intents stated in review, to record

Intents the owner stated while reviewing this plan that no page records
yet. Each is a possible future direction, not part of the model today.
Under the owner's rule on future work (Q-011; `audit/principles.md`),
every one of them is recorded in `devdocs/future.md` only, one entry
each beside the concept it touches ("Extensions that fit"), as intent
and not as a plan, with its issue links; a devdocs page that must say
something is planned links that entry rather than describing it, and
the user docs state today's behaviour as a plain fact and never mention
them (F-345). The owner's list at the end of `audit/decisions.md` named
the intents whose status, ruled out or still possible, was unclear; the
owner answered it on 2026-10-12 (plan §12.2).

- **A symbolic layer for a subset of identities,** so that cases like
  `sqrt(2)/sqrt(2)` and `turn` into `deg` can certify exactly (N5, N7).
  `devdocs/future.md#Symbolic values` already describes the extension;
  the user docs state today's behaviour as a limitation, not a goal.
- **Partially certified results through a two-argument `approx`,** whose
  second argument gives a precision, a radius or similar; undesigned
  (#100; N10, N23). Its tentative design moves from
  `devdocs/numbers.md#approx` to `future.md` (Q-035, Q-104).
- **Equality operators and conditional expressions** in the expression
  language; their absence is incidental (N16).
- **Configurable number formatting;** today's `%g`-like form is the
  behaviour, not a commitment (N12).
- **Display policy separable from the model:** what `=` means is the
  value's exactness (N2); how many digits a line shows, and how an
  exact value with more digits than shown is written, may change (N10).
- **A grammar generated from a TypeScript DSL** and its paired data
  structures, so that the references carry an EBNF-style grammar
  produced from the code (§2.1.3, §2.2.3).
- **A built-in function reference generated from structured comments
  beside each implementation** (§4).
- **Function classes not in the initial design** (hypergeometric,
  Bessel `Y` and `K`, polygamma beyond `digamma`, complex `gamma`,
  statistical distributions as built-ins) are deferred for now, with a
  possible implementation to follow (Q-010; §4.2, §9.4).
- **A setting or toggle that suppresses the conversion target,** so
  that the app serves as a first-class calculator when no conversion is
  wanted (§12, question 2).
- **True user-defined functions and units,** with an editing UX still
  to be designed (#130 to #134; §12, question 12).
- **The units page generated from structured comments in the
  definitions file** (§12, question 4).
- **Rendering-only characters such as `×` accepted by the grammar**
  (§12, question 11; the set is D1's: `×`, `·`, `−`, non-breaking and
  thin spaces, not `÷` or superscripts, Q-037).
- **Rounding to significant figures and their propagation** (#98;
  Q-014).
- **The user pages shipped with the app,** rendered from Markdown by a
  homegrown renderer (§12, question 31; `audit/principles.md`, "Markdown
  principle").
