# Documentation audit and restructuring plan

Written 2026-10-08 from a full read of `docs/` (4 pages) and `devdocs/` (16
pages), `git log` over both, and a listing of the source tree. No source
file was read; no code was run. Nothing in either corpus has been changed.

**Pointer conventions.** `file#Heading` names a Markdown heading.
`file#Heading › "label"` names a bullet by its bold label inside that
heading. `file#(top)` is the untitled text before the first `##`.
`docs/settings.md` has only two headings and holds its content as labelled
bullets under `#(top)`, so most of its pointers use the bullet form.
Claims are numbered `N1…` (numeric type) and `Q1…` (quantity) so that
later sections can cite them.

**Chronology caveat, stated once.** The repository's history is fifty
commits over three days (2026-10-06 to 2026-10-08). The first commit
imported an already mature code base with a 1,389-line `README.md`, a
2,013-line `ARCHITECTURE.md` and sixteen design notes and plans under
`docs/`. On 2026-10-08 the notes were moved to `devdocs/design/` and
`devdocs/history/` (commit 54aec25), the two big files were split into
`docs/` and `devdocs/` (d634a65), and then `devdocs/` was "pared into
current-state pages" (270b471: 17,007 lines deleted, 6,015 added), with a
follow-up restoring what the pare dropped (c226625). Every current
`devdocs/` page therefore dates from 2026-10-08 (only `architecture.md`,
`cost.md` and `future.md` trace back to 2026-10-06 through renames), and
`devdocs/README.md` now describes them as "current-state documents, not a
history; git holds the history". Chronology *inside* the current corpus
is therefore recoverable only from the pages' own narrative ("an earlier
version…", "the first design…", the settings migrations 1→5) and from the
three days of commit subjects (S2/S2b/S2c notation and width, S3 limits
renamed, #73 strict significand limit, S4/S5 sheet). Section 12 raises
the tension between the prompt's framing of `devdocs/` as a historical
record and the corpus's own self-description.

The deleted notes, for reference (paths as of 54aec25, all removed in
270b471): `devdocs/design/{approximate, builtins, decimal-mode, decimal,
fractions, functions, ratio-width, settings-controls, settings-limits,
settings-modes, settings-storage, settings-surface, special,
working-digits}.md` and `devdocs/history/{calculator-plan (6,571 lines),
calculator-study, settings-plan, shell-refactor}.md`.

---

## 1. Core abstractions

### 1.1 The numeric type

#### 1.1.1 User-level semantic model (claims, with current devdocs sources)

Values and exactness

- **N1.** A value is an exact fraction (in lowest terms) times a power of
  ten; its magnitude costs nothing. Decimal literals are read exactly
  (`1.5e-3` is `15 × 10^-4`; `0.1 + 0.2` is exactly `0.3`).
  → `devdocs/numbers.md#(top)`, `#The types › Scaled`,
  `#Exact mode`.
- **N2.** Every value carries an error radius bounding its distance from
  the number meant. Radius zero is *exact*; nonzero is *inexact*. The
  `=` relation means radius zero and every digit shown.
  → `devdocs/numbers.md#The types › Ball`, `#Certification and the
  display rule`.
- **N3.** In exact mode, inexactness enters in exactly two ways: an
  inexact built-in (a root, `exp`, `ln`, the trigonometric, hyperbolic,
  Gamma and Beta families, `pi()`) and `approx`. Decimal mode's rounding
  is the third source, inside a step only.
  → `devdocs/numbers.md#Exact mode` ("Exactly three things ever produce a
  nonzero radius"); `docs/settings.md#How a number is held…` says "exactly
  two ways" for exact mode (consistent).
- **N4.** `+ - * /`, integer powers and comparisons on exact operands are
  exact and as long as they need to be; exact values are never rounded in
  exact mode. A sum that cannot be aligned within the significand limit
  is refused, not rounded.
  → `devdocs/numbers.md#Exact operations`, `#Sums and alignment`,
  `#Exact mode`.
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
- **N7.** An identity through an irrational step never certifies zero or
  a rational: `sqrt(2)^2 - 2` is `≈ 0` within a bound, `turn` into `deg`
  is `≈ 360`, `sin(pi() radian)` is `≈ 0`; such expressions run every
  pass up to the ceiling (cost), and dividing by such a value is refused
  ("cannot be told from zero").
  → `devdocs/numbers.md#Exact mode`, `#Exact operations` (`unresolved`),
  `#Working precision and the schedule`; `devdocs/cost.md#What the costs
  come from`.

Precision, certification and display (exact mode)

- **N8.** The display digits are how many digits of the answer must be
  certain; the app recomputes at rising working precisions (the digits
  asked for plus ten, doubling, up to a ceiling of four times the
  precision limit plus ten) until the digits are certified; the cost of
  all passes is at most about twice the last.
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
  certain"). An exact value with more digits than shown is `≈` with no
  note (`1/3 ≈ 0.33333333`).
  → `devdocs/numbers.md#Certification and the display rule`;
  `devdocs/architecture.md#The converter and its lines › The relation and
  the note`.
- **N11.** The rounding mode (seven; half-even default) is applied once,
  at the display, in exact mode, and at every step in decimal mode;
  `round(x[, places])` is the one place it acts inside an expression.
  Directed modes show the value on the side they name, so a ball
  straddling a grid point under a directed mode certifies nothing
  (`cosh(1e-999999999)`, `approx(1)` show `≈ 1` with no digit certain).
  → `devdocs/numbers.md#The types` (rounding.ts), `#Certification…`;
  `devdocs/builtins.md#The exact functions`, `#Huge and tiny arguments`.
- **N12.** Formatting is `%g`-like: significant digits in the mode,
  trailing zeros dropped, exponent notation below `1e-4` or at the digit
  count, exponents as `1e+21`; the power of ten is never formed, so any
  magnitude renders. Every line parses back as a `have` (copy text uses
  `*`, the screen `×`); one edge literal at the exponent bound does not.
  → `devdocs/numbers.md#Formatting`; `devdocs/notation.md#Every literal
  parses back`; `devdocs/architecture.md#The converter and its lines`.
- **N13.** Ratio notation (exact mode only): an exact whole number is
  written entire when it has at most `W` digits; an exact non-integer as
  `n/d` when the two parts together have at most `W` digits (sign and
  slash not counted); else as `n/d × 1e+k` when that fits and `d ≠ 1`;
  else by the decimal display. Inexact values are always decimals. The
  width is independent of the display digits. The ratio is parenthesized
  before a unit and bare alone.
  → `devdocs/notation.md#The rule`, `#Where a ratio is written`, `#Not in
  decimal mode`.

Comparison and equality

- **N14.** Two exact values compare exactly, never refused for size; an
  inexact value is placed against an exact one directly; two inexact
  values through their difference. A ball touching a point counts as
  straddling it, so a strict comparison of an inexact value at its bound
  is undecided and a non-strict one decides only when the ball ends
  exactly on the bound. A difference refused as too large counts as
  across zero.
  → `devdocs/numbers.md#Comparison`; `devdocs/functions.md#The check at a
  call` (the verdict table).
- **N15.** A value that straddles an edge where the answer would jump
  (zero as a divisor, a domain end such as `1` for `asin`, a pole of
  `tan` or `gamma`, an integer or rounding boundary for `floor`/`round`,
  the exponent bound) is retried at more digits and, at the ceiling,
  refused with "cannot be told from <edge> at this precision". A value
  exactly on an exact case is decided (`tempC(-273.15)` meets
  `x >= -273.15`; `floor(2)` is `2`).
  → `devdocs/numbers.md#Exact operations`, `#The exponent bound`;
  `devdocs/builtins.md#The rules every built-in follows`, `#The exact
  functions`.
- **N16.** There is no equality operator; equality surfaces only as `=`
  on a line, as exact cases, in the inverse check ("certainly other than
  the have" refutes), and in `<=`/`>=` chains.
  → `devdocs/functions.md#Conditions` ("no equality and no `!=`"), `#A
  function as the want` step 6.

Decimal mode

- **N17.** Decimal mode: every value is exact with at most `p` digits;
  every observable step (`+ - * /`, juxtaposition, `^`, each literal,
  each unit, each call as a whole, the pipeline's own quotients) is the
  exact result rounded once to `p` digits in the mode; a literal with
  more digits is rounded as read; a prefixed unit is one product rounded
  once; `approx` is the identity; comparisons and conditions always
  decide; dimensions keep exact rational exponents; every line is `=`.
  → `devdocs/numbers.md#Decimal mode`.
- **N18.** A built-in call in decimal mode is certified: computed on
  finer grids up to the ceiling until its `p`-digit rounding is certain;
  if never (a value exactly on a boundary, only algebraic cases), the
  midpoint's rounding is shown flagged *uncertified* (`≈` with a dot,
  "a step could not be certified at the precision limit"), sticky
  through later steps. No shipped built-in is known to reach it.
  → `devdocs/numbers.md#Decimal mode › The ceiling`.
- **N19.** Working digits (decimal mode): with `w ≥ p`, every step but the
  last is rounded to `w`; the last step of each displayed value is
  rounded to `p` directly from the exact result of its operation. The
  last steps are: the `have`'s root, the conversion ratio, a list's
  counts and remainder, a function want's count, the reciprocal.
  → `devdocs/numbers.md#The working digits`.
- **N20.** In decimal mode `sin(pi() radian)` is `sin(3.1415927 radian)`
  `= -4.6410207e-8`; `1/3*3 = 0.99999999`; `2.5400001 cm` at three digits
  is `= 1 in`; two exact operands that cannot align take the neighbour
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
  nothing. Inexact results are never refused for size. A dyadic
  denominator is stored with fives (`2^-30000` costs 69,658 bits).
  → `devdocs/numbers.md#The significand limit`, `#Which limit a refusal
  names`; `devdocs/builtins.md#The exact functions` (factorial prediction).
- **N22.** Exponent bound: a value's decimal exponent must lie within
  ±10^18 (not a setting). Passing it is "too large/too small to compute:
  its exponent would pass 10^18 / fall below -10^18" (overflow /
  underflow); a ball reaching across the edge is retried and, at the
  ceiling, "cannot be told from the point where the result passes the
  exponent bound". `exp(2.3e18)` is a value, `exp(2.31e18)` refused;
  `exp(1e6) ≈ 3.0332154e+434294`.
  → `devdocs/numbers.md#The exponent bound`, `#Why the exponent bound
  stays at 10^18`; `docs/functions.md#Very large results and approx`.
- **N23.** `approx(x)`: the value known to the working precision and no
  better (radius the larger of `x`'s own and one unit in the last
  working digit); never narrows; idempotent; keeps the dimension; zero
  and unbounded pass through; the identity in decimal mode. It relaxes
  the significand limit (sums, integer powers, products, quotients whose
  exact result would pass it) and never the exponent bound.
  → `devdocs/numbers.md#approx`, `#The significand limit` (last paragraph).
- **N24.** Which limit a refusal names: a sum, product, quotient or power
  past both limits is reported at the exponent bound; a hair from the
  bound, at the significand limit (`7^1e19` is overflow; `2.54^1e18` is
  tooLarge).
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
- `sqrt(2)^2 - 2` is `≈ 0` with a bound; `1 / (sqrt(2)^2 - 2)` is refused;
  `floor(sqrt(2)^2)` is refused; each runs to the ceiling on every
  keystroke. `devdocs/numbers.md#Exact mode`; `devdocs/builtins.md#The
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
- `factorial(approx(5))` refused ("needs a whole number known exactly");
  `factorial(20000)` refused, `gamma(20001)` is the way.
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
  under `floor`). `devdocs/architecture.md#Unit lists`.
- A ball around zero is written `0`, never `-0`; its bound is rounded up
  to one digit. `devdocs/numbers.md#Certification…` (zero kind).
- `9.5e1000000000000000000` at one digit writes a literal that is refused
  when typed back. `devdocs/notation.md#Every literal parses back`.
- `sin(1e-999999999 radian)` certifies at once; `sin(1e5000 radian)`
  costs `pi` to that size each time; `sin` of an angle past
  `2^significandLimitBits` radians is refused.
  `devdocs/builtins.md#Huge and tiny arguments`.

#### 1.1.4 What stays in devdocs (representation and mechanism), by pointer

- The type tower `Rational`/`Scaled`/`Radius`/`Ball`/`Fixed`/`Floating`,
  canonical form, why one decimal exponent: `devdocs/numbers.md#The types`.
- Henrici/Lehmer gcd, cross-cancellation, `BOUND_BAND`, `log2Bounds`:
  `#Exact operations`, `#The exponent bound`.
- The kernel's door and exit, memoized constants, `MEMO_MARGIN`:
  `#The kernel's boundary`, `#Memoized constants`.
- Root and power algorithms, `rootInLogSpace`, `powLogSpace`, parity
  rules: `#Roots and powers`; `devdocs/builtins.md#Domains…` (pow).
- The classifier for the exponent bound, `logPowerBlame`,
  `powerRefusal`: `#The exponent bound`, `#Which limit a refusal names`.
- Why 10^18 stays, the scratch-build measurements, the six-pass table:
  `#Why the exponent bound stays at 10^18` (duplicated today in
  `docs/functions.md#Very large results and approx`; see §9).
- Certification of unformable radii, `certifiedDigits` scanning,
  `zeroBound`: `#Certification and the display rule`.
- The schedule's derivation (why four and ten), `workingContexts`,
  `resolve`'s retry predicate, `PassObserver`: `#Working precision and the
  schedule`.
- Settling, `step`/`settle`, `onGrid`: `#Settling`, `#Sums and alignment`.
- Decimal mode's provisional rulings, `uncertified` as a flag,
  `operandContext`: `#Decimal mode`, `#The working digits`.
- Size prediction (`Need`, `Reach`, `multiplyWithin`, …), the asserted
  invariant, the rejected rounding alternative: `#The significand limit`.
- `approx`'s alternatives (syntax forms, the binary form #100): `#approx`.
- Failures vs preconditions: `#Failures`; formatting internals:
  `#Formatting`.
- The ratio notation's design history, `show`'s `fraction`/`scale`:
  `devdocs/notation.md#The width`, `#Where it lives`.

#### 1.1.5 Where the semantics changed over time; which passage is current

| Change | Superseded reading | Current passage |
| --- | --- | --- |
| Decimal mode tracked roundings in the radius ("7 of 8 digits are certain") | withdrawn | `devdocs/numbers.md#Decimal mode` (rules 1–4) |
| Inexact midpoints grew as exact rationals | first design | `devdocs/numbers.md#Settling` |
| A binary exponent beside the decimal one | first design | `devdocs/numbers.md#The types › Scaled` |
| Certification widened the midpoint by two digits | first version | `devdocs/numbers.md#Certification…` (distance rule) |
| Fixed ceiling of 1,000 digits, display ≤ 200 | before the precision limit became a setting | `devdocs/numbers.md#Working precision and the schedule` |
| Significand limit measured after forming | until #73 (commit 3ae73bb, 2026-10-07) | `devdocs/numbers.md#The significand limit` (strict prediction) |
| Refusal reach worded "passes" | commit 1fc768d | "exceeds" / "fits", same section |
| Ratio notation as a `fractions` flag; fit tied to display digits | storage v2–v3; "the first rule" | `devdocs/notation.md#The rule`, `#The width` (width `W`, both parts together; commits 946bcde, fcc1c96) |
| Settings named `digits`/`maxDigits`/`maxBits` | storage v4 | `devdocs/settings.md#The model`, `#Storage` (v5: `displayDigits`, `precisionLimitDigits`, `significandLimitBits`, `budgetMs`) |
| Rounding default half away from zero | storage v2 | half even (`devdocs/settings.md#The model › Rounding`) |
| A ball around zero could print `-0` | until commit 6b38e25 | `devdocs/numbers.md#Certification…` (zero kind) |
| `settle` exported, reachable from two sites | earlier shape | `devdocs/numbers.md#Settling` (`step` is the one entrance) |
| Vocabulary "working digits" vs schedule's working precision | unsettled (#172) | `devdocs/numbers.md#The working digits` (flagged there) |
| `uncertified` shown vs decided as a tie | open (#173) | `devdocs/numbers.md#Decimal mode › The ceiling` |

#### 1.1.6 Claims that most need verification against the code

Ranked by how much of docs/ would rest on them and by how specific the
text is (quoted messages and constants are easy to get wrong):

1. N10's kind order and the exact wording of the three notes and the
   uncertified note (`display.ts`, `outcome.ts`, `messages.ts`).
2. N17's list of what counts as a step in decimal mode, literal rounding
   as read, and "a prefixed unit is rounded once" (`evaluate.ts`,
   `table.ts`, `context.ts`).
3. N19's list of "last steps" and the directed-mode neighbour claim
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
   is charged to an already inexact result?) (`ball.ts`).
10. N12 copy text `*` vs screen `×`, and the parser's acceptance of `×`
    (not stated anywhere; §12) (`print.ts`, `expr.ts`).
11. N24's "a hair from the bound is tooLarge" (`scaled.ts#powerRefusal`).
12. N11 directed-mode behaviour for exact values with more digits than
    shown (`39.3700787401` rounded down) (`display.ts`).

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
  dimension: an exponent vector over the primitives with rational
  exponents, zero exponents absent. `m^(1/2)` is a dimension;
  `(m^2)^(1/2)` is `m`; exponents stay exact in both modes.
  → `devdocs/architecture.md#Quantities, dimensions and kinds`;
  `devdocs/numbers.md#Decimal mode` ("Dimensions carry exact rational
  powers").
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
  rules › Angles`.
- **Q5.** A quantity carries no unit of its own: its magnitude is held in
  the primitives, so `100 lb` and `45.359237 kg` are one value and
  nothing remembers which was typed. Consequences: an annotation checks
  a dimension and changes no value; `floor`, `ceil`, `trunc`, `round` and
  the integer functions take plain numbers (`floor(3.7 ft)` would floor
  the metres); `abs`, `sign`, `div`, `mod`, `approx` take quantities.
  → `devdocs/functions.md#Annotations`; `devdocs/builtins.md#Dimension
  rules › floor and its kin`.
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
  `deg` is `30` and `asin(0.5)` into `turn` or `/ radian` is the number;
  the hyperbolic functions take plain numbers; `atan2` takes two
  quantities of one dimension, kinds included.
  → `devdocs/builtins.md#Dimension rules`.

Units and names

- **Q9.** A name means the unit of that name if there is one, else one
  prefix followed by a unit; an exact name always wins (`min`); prefixes
  do not stack; prefixes and units are separate namespaces (`m-` and
  `m`); lists, functions and built-ins share the unit namespace and may
  not read as a prefixed unit; prefixes never apply to functions
  (`ktempC(1)` is a call of nothing); an ambiguous name is a file error,
  not a resolved ambiguity (`u`, `at` are absent for this reason).
  → `docs/definitions.md#Names`; `devdocs/architecture.md#Definitions`;
  `devdocs/builtins.md#Names`.
- **Q10.** Every unit factor is exact as its defining document states,
  so conversions between rationally defined units are exact (`1 in` is
  `2.54 cm`, `1 ft` in `in` is `= 12 in`). The angle units, `parsec` and
  `oersted` call `pi()` and carry its radius; the constants are exact by
  the 2019 SI except the dalton, a CODATA decimal written exact.
  → `docs/definitions.md#What the file contains`; `devdocs/numbers.md#(top)`,
  `#approx` (last paragraphs); `devdocs/builtins.md#The elementary routines`.
- **Q11.** The unit table is built once, in exact mode, at the ceiling of
  the precision limit, and a unit is settled to each pass's precision at
  the node that names it; in decimal mode a unit is rounded once to `p`
  digits (`surveyfoot` at eight digits is `0.30480061 m`).
  → `devdocs/numbers.md#Working precision and the schedule`, `#Decimal
  mode › A unit`.
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
  `want` of zero, a `want` that cannot be told from zero, a ratio at the
  exponent bound. A blank `want` answers in the primitives (`1 in =
  0.0254 m`).
  → `devdocs/architecture.md#Conversion`, `#The converter and its lines`.
- **Q14.** The reciprocal line: a conversion into one unit also answers
  the other way round (`in ≈ 0.027777778 × 3 ft`), each line's relation
  decided from its own value; none for a unit list, a blank `want`, a
  function `want`, a zero or an unresolvable value. It is computed once
  at the user's context, outside the retry loop (#92).
  → `devdocs/architecture.md#The converter and its lines › The reciprocal`.
- **Q15.** Unit lists (`ft;in`, or a defined list's name): a sum largest
  first, every unit but the last an integer count (truncated toward
  zero, so terms carry `have`'s sign), the last the remainder; a count
  whose ratio straddles an integer takes that integer; the remainder is
  rounded at the display digits and a rounding that reaches a whole of
  an earlier unit carries; zero terms are left out (a sum of nothing but
  zeros keeps its last); `=` only when every term is exact. The units
  must conform to `have`, be positive throughout their ball, and
  decrease along the list (by midpoint); they need not be multiples
  (`mi;km`) and may carry magnitudes (`ft;in/8`). A list is an output
  form only; its name is not a unit anywhere else.
  → `devdocs/architecture.md#Unit lists`, `#The converter and its lines ›
  A unit list`; `docs/definitions.md#Unit lists`.
- **Q16.** A function as the `want` (third output mode): needs an
  inverse; the `have` must conform to the result and meet the inverse's
  conditions; the recovered argument must meet the function's
  conditions; the function is reapplied and a value certainly other than
  the `have` refutes the inverse; the answer is written as the call with
  the argument as a count of the parameter's annotation unit
  (`2 ft = dozen(2 in)`, `300 K = tempF(80.33)`), with no reciprocal.
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
- `rad/s` into `Hz` refused; `J` is `N m` (no torque kind).
  `devdocs/architecture.md#Quantities…`.
- `floor(3.7 ft)` refused; write `floor(3.7 ft / ft) ft`; `mod(-30 deg,
  360 deg)` is `330 deg`; `div(7 ft, 2 ft)` is `3`.
  `devdocs/builtins.md#The exact functions`.
- `m2` is a name; `kg(m/s)` is a call of `kg`; `kg (m/s)` a product;
  `kkm`, `inches` are nothing; `dB` is `d` + `B`, use `decibel`.
  `docs/definitions.md#Names`, `#Expressions`; `devdocs/builtins.md#Names`.
- `2 tempC`, `tempC;degC`, `2 time`: a function's or a list's name is
  not a unit. `devdocs/functions.md#A function as the want` (last
  paragraph); `devdocs/architecture.md#Definitions`.
- `in;ft` and `ft;12 in` refused (not decreasing); a unit that cannot be
  told from zero refused as a list unit and not retried.
  `devdocs/architecture.md#Unit lists`; `devdocs/numbers.md#Working
  precision…` ("Two gaps are accepted").
- `-1 m` into `ft;in` is `-3 ft - 3.3700787 in`; `3601 s` into
  `hr;min;s` is `1 hr + 1 s`; `turn` into `deg;arcmin` is `≈ 360 deg`,
  not `359 deg + 60 arcmin`. `devdocs/architecture.md#Unit lists`.
- `bmi(100 lb, 4 ft)` with a blank `want` shows `kg / m^2`, not the
  annotated `lb/ft^2` (#130). `devdocs/functions.md#Annotations`.
- `-5 K` into `tempC` refused by `tempC`'s own condition; `tempF(-40)`
  into `tempC` is `tempC(-40)`. `devdocs/functions.md#A function as the
  want`.
- `0 s` as the `want` for a length is a mismatch, not "zero want";
  `0 ft = 0 in` has no reciprocal line. `devdocs/architecture.md#Conversion`,
  `#The converter and its lines › The reciprocal`.
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
- The reciprocal as a view in the component, `outcome.ts`' parsing of
  the `want` again: `devdocs/architecture.md#The converter and its lines`.
- Inverse checking as refutation, `applyFunction`/`invertFunction`
  sharing, the collector of assumptions: `devdocs/functions.md#A function
  as the want`, `#An undecided condition`.
- Kind-lenient conversion, complex magnitudes, offsets: `devdocs/future.md`.

#### 1.2.5 Where the semantics changed over time; which passage is current

| Change | Superseded reading | Current passage |
| --- | --- | --- |
| Function heads `tempC(x) [1;K] body ; inverse` with required unit brackets, one argument | first form | `devdocs/functions.md#Definitions`, `#Alternatives considered` |
| Annotations as GNU `units=` (parameter bound to its count) | weighed, not adopted | `devdocs/functions.md#Annotations` ("checks a dimension and changes no value") |
| Build check evaluated each body at one value | first version | `devdocs/functions.md#Build-time checks` (`dimensionOf` only) |
| Reciprocal as GNU units' `(1 / 0.027777778) in` | rejected | `devdocs/architecture.md#The converter and its lines › The reciprocal` |
| A list count by truncation when the ratio straddles an integer | implied earlier (`359 deg + 60 arcmin`) | `devdocs/architecture.md#Unit lists` (takes the integer) |
| Shadowing a unit in a head is an error | current; to become a warning (#131) | `devdocs/functions.md#Names and shadowing` |
| Kinds introduced to keep angles from numbers | rationale only | `devdocs/builtins.md#Dimension rules › Angles` |

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

---

## 2. The two languages

### 2.1 The expression language

#### 2.1.1 Constructs and semantics documented anywhere, by pointer

| Construct | docs/ | devdocs/ |
| --- | --- | --- |
| Numbers: unsigned decimals with optional exponent, read exactly; sign only in the exponent | `docs/definitions.md#Expressions › Numbers` | `devdocs/architecture.md#Expressions` (literal read "as far as it goes"); `devdocs/numbers.md#(top)` |
| Literal limits: significand past the hard bound (2^20 bits) or exponent past ±10^18 rejected at parse; past the significand limit refused at evaluation | — (only `docs/settings.md#(top) › Significand limit`: "a literal of more digits than the limit") | `devdocs/architecture.md#Parsing › Rejection is final`; `devdocs/numbers.md#The significand limit` |
| Names: letter/underscore then letters, digits, underscores, any script; longest match; case-sensitive | `docs/definitions.md#Names` | `devdocs/architecture.md#Expressions` |
| Name resolution: exact unit, else prefix + unit; parameter before unit in a body; call names exact; defined function before built-in | `docs/definitions.md#Names` | `devdocs/architecture.md#Definitions`, `#Evaluation`; `devdocs/functions.md#Names and shadowing`; `devdocs/builtins.md#(top)` |
| Juxtaposition multiplies; a number only as the first factor | `docs/definitions.md#Expressions › Juxtaposition` | `devdocs/architecture.md#Expressions` |
| `*` and `/`: one left-associative level below juxtaposition | `docs/definitions.md#Expressions › * and /` | `devdocs/architecture.md#Expressions` |
| `+` and `-`: one left-associative level, loosest; operands must conform | `docs/definitions.md#Expressions › + and -` | `devdocs/architecture.md#Expressions`, `#Evaluation` |
| Unary `-`: tighter than `*`/`/`, looser than juxtaposition and `^`; no stacking; no unary `+`; where a `-` belongs (`2e-3`, `m^-1`, `2 -3`, `2 * -3`) | `docs/definitions.md#Expressions › - before a product` | `devdocs/architecture.md#Expressions` |
| `^` with a literal exponent (signed decimal or parenthesized rational), tightest; the exponent is reduced within the significand limit at evaluation | `docs/definitions.md#Expressions › ^` | `devdocs/architecture.md#Expressions`, `#Evaluation` (`reduceExponent`); `devdocs/numbers.md#Roots and powers` |
| Parentheses | `docs/definitions.md#Expressions › Parentheses` | `devdocs/architecture.md#Expressions` |
| Calls: name immediately followed by `(`, comma-separated arguments; lexical rule (space → product); arity checked before arguments; an atom | `docs/definitions.md#Expressions › A call`, `#Functions` | `devdocs/architecture.md#Expressions`; `devdocs/functions.md#Calls`; `devdocs/builtins.md#Arity` |
| Unit lists `a;b;c` in the `want` only; `;` not an expression, never inside parentheses | `docs/definitions.md#Unit lists` | `devdocs/architecture.md#Expressions`, `#Unit lists` |
| Whitespace: spaces and tabs, no newline | — | `devdocs/architecture.md#Expressions` |
| Evaluation order: left to right, first failure ends; error located at the operand or the whole operation | — | `devdocs/architecture.md#Evaluation` |
| The tree's six node kinds; printer's canonical text (`×` on screen, `*` in copy text; fewest parentheses) | — (copy behaviour in `docs/README.md#(top)`) | `devdocs/architecture.md#Expressions`, `#The converter and its lines` |
| Parse errors: "expected a number or `(`", furthest expectation | — | `devdocs/architecture.md#Parsing` |
| The `want` field's readings (bare list name, bare function name, unit expression, typed list; a call is an expression) | `docs/definitions.md#Unit lists`, `#Functions` | `devdocs/architecture.md#Pipeline`, `#Unit lists`, `#Functions`; `devdocs/functions.md#A function as the want` |
| The `have` alone as a calculator (blank `want`) | `docs/README.md#(top)` (implicit) | `devdocs/architecture.md#(top)`, `#The converter and its lines` |
| Reserved: `name[` (dimension variables); `=`, `:`, `~`, `\|`, comparisons appear in no expression | — | `devdocs/functions.md#Definitions`, `#Conditions` |

#### 2.1.2 Where syntax meets the core abstractions

- **Exactness of literals.** Read exactly (N1); in decimal mode rounded
  to `p` as read (N17); the hard bound and the exponent bound at parse,
  the significand limit at evaluation (N21, N22).
- **Exponents of `^`.** Known at parse time so that the dimension stays
  exact (Q1); the fraction formed within the significand limit at
  evaluation; `^` and `pow` disagree on an unformable exponent (#88,
  #89) → `devdocs/architecture.md#Evaluation`.
- **Dimensions.** A number is a plain number; juxtaposition and `*`/`/`
  combine dimensions; `+`/`-` check conformance (Q3, Q6); the
  "fraction before a unit" pitfall → `docs/definitions.md#Expressions`
  (last paragraph).
- **Name resolution.** Q9; inside a body, a parameter shadows a unit,
  and a prefixed name is always a unit (`km` beside a parameter `m`) →
  `devdocs/functions.md#Names and shadowing`.
- **Calls.** Arity before arguments; dimension rule or annotation check
  at the call; conditions three-valued (N14); a call's failure wraps the
  body's → `devdocs/functions.md#Calls`; `devdocs/architecture.md#Evaluation`.
- **Settling and steps.** Every node is a step (N17 in decimal mode;
  settled in exact mode) → `devdocs/numbers.md#Settling`.
- **Error location.** Spans on every node; the input at fault marked →
  `devdocs/architecture.md#Expressions`, `#Evaluation`, `#Messages`.

#### 2.1.3 Formal grammar: does one exist, and what form for the reference

- No grammar file exists in the tree (no `.peg`, `.ebnf`, `.y` or
  similar; see §11). The grammar lives as code: the levels and binary
  operators are data in `src/core/expr.ts` (`LEVELS`, `BINARY`), built
  into parser combinators from `src/core/parser.ts`, with the printer in
  `src/core/print.ts` driven by the same table so "the two cannot
  disagree" → `devdocs/architecture.md#Expressions`, `#Parsing`.
- In prose: `devdocs/architecture.md#Expressions` (precedence, the `-`
  rules, the call rule, the six node kinds) and
  `docs/definitions.md#Expressions` (the same rules by example). No
  EBNF for expressions appears anywhere; `devdocs/functions.md#Definitions`
  has an EBNF-style block for function and inverse lines only.
- **Proposed form:** both. A short formal grammar (EBNF, about fifteen
  productions: list, expr, sum, product, juxtaposition, unary, power,
  atom, call, number, name, exponent) at the head of the expression
  reference, derived from `expr.ts` in audit unit D1 and checked against
  the property test in `src/testing/expr.ts`; then a precedence table;
  then prose semantics per construct with examples and the pitfalls. The
  grammar is small enough that the formal form is the clearer owner of
  the binding rules, and the prose owns meaning (exactness, dimensions,
  resolution).

#### 2.1.4 Source modules to check against

`src/core/expr.ts`, `parser.ts`, `print.ts`, `span.ts`, `evaluate.ts`,
`table.ts` (lookup and `resolveFunction`), `names.ts`, `pipeline.ts`
(`parseUnitList`, reading the `want`), `src/testing/expr.ts`,
`src/messages.ts` (parse and rejection wording), `src/outcome.ts`.

### 2.2 The definition language

#### 2.2.1 Constructs and semantics documented anywhere, by pointer

| Construct | docs/ | devdocs/ |
| --- | --- | --- |
| One definition per line; name, whitespace, body; `#` comments; blank lines; required whitespace after a unit's or prefix's name (`inch2.54 cm`) | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` |
| Primitive `!` and kind primitive `!kind` | `docs/definitions.md#The format` | `devdocs/architecture.md#Quantities…`, `#Definitions` |
| Prefix `name-` with a plain-number body | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` ("Prefix bodies must be plain numbers") |
| Unit `name body` | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` |
| Unit list `name a;b;c`, two or more items, checked at load | `docs/definitions.md#The format`, `#Unit lists` | `devdocs/architecture.md#Definitions` (lists share the namespace, stay out of the walk, the `ms` rule) |
| Function `name(params)(: ann)?(\| conds)? = body`; zero or more parameters; no duplicate parameter | `docs/definitions.md#The format`, `#Functions` | `devdocs/functions.md#Definitions` (grammar block), `#Calls` |
| Inverse `~name(p)(\| conds)? = body`; one-parameter functions only; optional; may precede its function | `docs/definitions.md#The format`, `#Functions` | `devdocs/functions.md#Definitions`, `#Build-time checks` |
| Parameter and result annotations: unit expressions only, `1` for plain; `: 2` and `: 1000 m` rejected; checks dimension, changes no value; the result annotation checks the inferred dimension | `docs/definitions.md#Functions` | `devdocs/functions.md#Annotations` |
| Conditions after `\|`: chains of `<`, `<=`, `>`, `>=`, `≤`, `≥` one way; comma-separated conjunction; must mention a parameter; sides must conform; no `=`/`!=`/disjunction; calls allowed and followed by the walk | `docs/definitions.md#Functions` | `devdocs/functions.md#Conditions`, `#The check at a call`, `#An undecided condition` |
| Shadowing: a parameter may be named like a unit (hides it in the body); not like a unit its own head's annotations name; duplicate parameters | `docs/definitions.md#Functions` | `devdocs/functions.md#Names and shadowing` |
| Any order; cycles, duplicates, ambiguous names, prefixed-unit names for lists/functions/built-ins, dimensioned prefixes, bad lists, mismatched annotations, orphan inverses, inverse arity, zero annotations, conditions without a parameter, undecided conditions at build: errors | `docs/definitions.md#The format` (summary sentence), `#Names`, `#Unit lists`, `#Functions` | `devdocs/architecture.md#Definitions` (the build-error catalogue); `devdocs/functions.md#Build-time checks` |
| Reserved `name[` (dimension variables) | — | `devdocs/functions.md#Definitions`, `#Deferred` |
| The system file's sections and conventions (`imp`/`uk` prefixes for imperial, `longton`, the three micros, binary prefixes, lists, temperature and logarithmic functions) | `docs/definitions.md#What the file contains` | `devdocs/development.md#Adding a unit`; `devdocs/functions.md#Definitions` (the five functions) |
| User definitions: supported by `buildTable`, no storage or editor yet (#132); no message worded for a definitions rejection today | — | `devdocs/future.md#Extensions that fit`; `devdocs/functions.md#Annotations`, `#Deferred` |

#### 2.2.2 Where syntax meets the core abstractions

- **Exactness.** A unit defined by a decimal converts exactly (Q10);
  bodies are evaluated once, at the ceiling, in exact mode (Q11); a
  function's body is evaluated afresh at every pass, so a function of no
  parameters names a computed constant without fixing it in the table →
  `devdocs/functions.md#Definitions › A function has any number of
  parameters`; `approx` in a body defines a measured constant →
  `devdocs/numbers.md#approx`.
- **Dimensions.** Primitives and kinds come from the file (Q2); a prefix
  body must be dimensionless and kindless; an annotation is a dimension
  check (Q5); the result's dimension is inferred by `dimensionOf`
  without evaluating; conditions' sides must conform; a parameter
  without an annotation is a plain number → `devdocs/functions.md#Annotations`,
  `#Build-time checks`; `devdocs/architecture.md#Definitions`.
- **Name resolution.** Q9; a list's or a function's name may not read
  as a prefixed unit because the `want` and the `have` would read one
  text two ways → `devdocs/architecture.md#Definitions`.
- **Exactness of conditions.** Three-valued on balls at a call (N14);
  always decided in decimal mode; a unit defined by a call checks the
  call's conditions at build and an undecided one fails the build →
  `devdocs/functions.md#The check at a call`, `#An undecided condition`.
- **What the build does not check.** Bodies are not evaluated (a body
  that fails at some value builds); a literal in a body is not held to
  the significand limit at build, a `^` exponent is → `devdocs/functions.md#Build-time
  checks`.
- **Cost.** Calls are not memoized; a hand-written equivalent of a
  built-in is slower and loses exact cases; decimal mode rounds each
  step of a body → `devdocs/functions.md#Precision, the radius and cost`
  (triplicated; see §9).

#### 2.2.3 Formal grammar: does one exist, and what form for the reference

- A grammar block exists for the function and inverse heads only
  (`devdocs/functions.md#Definitions`). The line-level grammar (primitive,
  prefix, unit, list, function, inverse; comments) is prose in
  `docs/definitions.md#The format` and `devdocs/architecture.md#Definitions`.
  The parser is `src/core/definitions.ts` (combinators over the same
  toolkit); no grammar file.
- **Proposed form:** both. One EBNF for the whole line grammar (about
  twelve productions: file, line, comment, primitive, prefix, unit, list,
  function, inverse, params, annotation, conditions, with `expr` imported
  from the expression reference), followed by prose per definition kind,
  the name rules (shared with the expression reference by link), the
  build-time checks as a table of error → cause → fix, and the
  function/inverse semantics (annotations, conditions, exactness and
  cost). The formal part should be extracted in audit unit D2 from
  `definitions.ts` and checked against the seeded property test
  described in `devdocs/testing.md#The random source`.

#### 2.2.4 Source modules to check against

`src/core/definitions.ts`, `build.ts`, `graph.ts`, `names.ts`,
`name-index.ts`, `table.ts`, `dimension-of.ts`, `evaluate.ts`
(`applyFunction`, `invertFunction`, `checkConditions`, `decide`),
`src/units.txt`, `src/units.test.ts`, `src/system-table.ts`,
`src/system-build.ts`, `src/messages.ts` (function and want messages).

---

## 3. Settings

Every setting mentioned in either corpus. "Where documented" cites the
current owner of the user-level description (docs/) and the design
(devdocs/). The stored keys are from `devdocs/settings.md#Storage`.

| Setting (panel label) | Stored key | Controls (model parameter / behaviour) | Default; range (bounded by) | docs/ | devdocs/ |
| --- | --- | --- | --- | --- | --- |
| Display digits | `displayDigits` | `NumberContext.precision`: digits certified in exact mode; the grid of every step and of literals in decimal mode | 8; 1 … precision limit | `docs/settings.md#(top) › Display digits`; `#How a number is held…` | `devdocs/settings.md#The model › Display digits`; `devdocs/numbers.md#Certification…`, `#Decimal mode` |
| Rounding | `rounding` | the context's rounding mode: the display's last digit in exact mode, every step in decimal mode, `round()` | half even; the seven modes | `docs/settings.md#(top) › Rounding` | `devdocs/settings.md#The model › Rounding`; `devdocs/numbers.md#The types` (rounding.ts); `devdocs/builtins.md#The exact functions` |
| Mode | `mode.kind` | `NumberContext.mode`: exact or decimal arithmetic | exact | `docs/settings.md#(top) › Mode` | `devdocs/settings.md#The model › The mode is a nested choice`; `devdocs/numbers.md#Exact mode`, `#Decimal mode` |
| Notation (exact mode) | `mode.notation.kind` | how an exact value is written: `digits` or `ratio` | digits | `docs/settings.md#(top) › Notation` | `devdocs/notation.md#(top)`, `#The rule`; `devdocs/settings.md#The model` |
| Ratio width (with `ratio`) | `mode.notation.width` | `RatioDisplay.width`: most digits of a whole number or of a ratio's two parts written entire | 20; 1 … 1000 (nothing clamps it) | `docs/settings.md#(top) › Notation` | `devdocs/notation.md#The width`; `devdocs/settings.md#The model › The chain` |
| Working digits (decimal mode) | `mode.working.kind` | locked to the display digits, or extended | digits (locked) | `docs/settings.md#(top) › Working digits` | `devdocs/numbers.md#The working digits`; `devdocs/settings.md#The model › Working digits` |
| Extended working digits (with `extended`) | `mode.working.digits` | `NumberContext.working`: the grid of every step but the last | display digits; display digits … precision limit | `docs/settings.md#(top) › Working digits` | same |
| Precision limit | `precisionLimitDigits` | caps display and working digits; `ceiling = 4 × (L + 10)`; rebuilds the unit table | 1,000; 1 … `precisionLimitFor(S)` (2,453 at the default) | `docs/settings.md#(top) › Precision limit`; `#How a number is held…` | `devdocs/settings.md#The model › Precision limit`, `› The two limits meet in the grid`; `devdocs/numbers.md#Working precision and the schedule`, `#The significand limit` |
| Significand limit | `significandLimitBits` | `NumberContext.significandLimitBits`: most bits per part of an exact significand; strict refusals | 65,536; 358 … 1,048,576 | `docs/settings.md#(top) › Significand limit`; `#How a number is held…` | `devdocs/settings.md#The model › Significand limit`; `devdocs/numbers.md#The significand limit` |
| Probe budget | `budgetMs` | the per-pass time the probe allows when proposing the two limits; no model parameter | 50 ms; 10 … 10,000 | `docs/settings.md#(top) › Probe budget` | `devdocs/settings.md#The model › Probe budget`, `#The probe` |

Not settings but documented beside them:

- "Measure this device" / Apply (the probe's proposal):
  `docs/settings.md#(top)` (paragraph "The limits are set top-down");
  `devdocs/settings.md#The probe`.
- The chain of clamps and refusals ("At most 2,453 digits under the
  significand limit", "lowered from 1,000 to 26 digits…"):
  `docs/settings.md#(top)` (same paragraph); `devdocs/settings.md#Applying a
  change`.
- Per-setting "default …" reset links and "Reset all settings":
  `docs/settings.md#(top)`; `devdocs/settings.md#Applying a change › Resets`.
- The sheet's mechanics (cog, bottom/side sheet, Done/Escape, steppers,
  on-screen keyboard): `docs/settings.md#(top)`; `devdocs/settings.md#The
  sheet`, `#The controls`.
- Storage: one JSON envelope under `settings`, format version 5, `savedBy`,
  migrations 1→5, newer-version policy: `docs/settings.md#(top)` ("under a
  format version of their own"); `devdocs/settings.md#Storage`.
- The build number tap (update check) is described in
  `docs/settings.md#(top)` though it is not a setting; design in
  `devdocs/offline.md#Offline behavior › Update checks`.
- Constants that are deliberately not settings: the exponent bound
  (`devdocs/numbers.md#Why the exponent bound stays at 10^18`, "A setting for
  the bound was weighed and set aside"); the ceiling ("derived and
  shown, never set", `devdocs/settings.md#The model`); the guard and factor.

---

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

---

## 5. Concept inventory

Everything other than the two core abstractions themselves (§1), one
entry per concept. Fields: *class* (user, internal, or bridge: a user
concept whose realization devdocs/ explains); *terms* (user term ↔
internal names, where they differ); *docs/*; *devdocs/* in reading order
with the passage that reads as current marked **(current)** and any
narrated predecessor marked *historical* (see the chronology caveat at
the top: ordering follows `architecture.md` (overview, older lineage) →
the topical page → `future.md`, since every page dates from the
2026-10-08 pare); *depends on* (claims of §1); *modules*; *owner*
(proposed owning location in the restructured docs/, naming pages from
the outline in §7).

**C1. have and want.** The quantity to convert and the unit (or list, or
function) to convert it to. *Class:* user. *Terms:* "You have" / "You
want" (the fields' labels) ↔ "the quantity to convert" / "the unit to
convert to" (docs) ↔ `have`, `want`, `haveText`, `wantText`. *docs/:*
`docs/README.md#(top)`; `docs/definitions.md#Unit lists`, `#Functions`.
*devdocs/:* `architecture.md#(top)` → `#Pipeline` → `#The converter and its
lines` **(current)**. *Depends on:* Q3, Q13, Q17. *Modules:*
`src/core/pipeline.ts`, `src/unit-converter.ts`, `src/outcome.ts`. *Owner:*
`quantities.md` › "How a conversion is answered" (definition); introduced
by example in `getting-started.md`.

**C2. Output modes.** One unit (a ratio, with a reciprocal line), a unit
list (a sum), a function (a call), a blank want (the primitives).
*Class:* user. *Terms:* "second/third output mode" (devdocs) ↔ unnamed in
docs. *docs/:* `docs/definitions.md#Unit lists`, `#Functions`. *devdocs/:*
`architecture.md#Pipeline` → `#Conversion` → `#Unit lists` → `#Functions` →
`#The converter and its lines` **(current)**. *Depends on:* Q13–Q17.
*Modules:* `pipeline.ts`, `convert.ts`, `outcome.ts`. *Owner:*
`quantities.md` › "How a conversion is answered".

**C3. The result line: relation and notes.** A line is the have, `=` or
`≈` (or `≈` with a dot), the result; notes in parentheses say what the
digits are worth; warnings name assumed conditions. *Class:* user.
*Terms:* "note" (digits) vs "warning" (conditions) ↔ display kinds
`exact`, `certified`, `partial`, `zero`, `unbounded`, `uncertified`.
*docs/:* `docs/settings.md#(top)` (paragraphs "An answer shows every
digit…", "An answer is written with = …"); `docs/functions.md#(top)`
(paragraph "Every built-in takes plain numbers…"). *devdocs/:*
`numbers.md#Certification and the display rule` **(current)**;
`architecture.md#The converter and its lines › The relation and the note`
**(current, wording)**; `notation.md#(top)`. *Depends on:* N2, N9, N10.
*Modules:* `display.ts`, `outcome.ts`, `unit-converter.ts`. *Owner:*
`numbers.md` › "What a line says".

**C4. The reciprocal line.** The conversion the other way round, on a
second line. *Class:* user. *Terms:* "the other way round" (docs) ↔
"reciprocal" (devdocs, `outcome.ts`). *docs/:* `docs/README.md#(top)`.
*devdocs/:* `architecture.md#The converter and its lines › The reciprocal`
**(current)**; `numbers.md#Working precision and the schedule` ("outside
the loop", #92); `notation.md#Where a ratio is written`. *Depends on:*
Q14, N10. *Modules:* `outcome.ts`. *Owner:* `quantities.md`.

**C5. Typeable-back lines and copy text.** Every line parses back as a
have; the copy button writes `*` where the screen shows `×`. *Class:*
user. *Terms:* "copy", "typed back" ↔ "the printer", "canonical text",
`print`, `text`. *docs/:* `docs/README.md#(top)`. *devdocs/:*
`architecture.md#Expressions` (printer) → `#The converter and its lines`
**(current)**; `notation.md#Every literal parses back`. *Depends on:* N12,
Q18. *Modules:* `print.ts`, `copy-button.ts`, `outcome.ts`. *Owner:*
`expressions.md` › "How the app writes expressions" (the printed form);
one line in `getting-started.md`.

**C6. Exact and inexact values.** Radius zero vs nonzero. *Class:*
bridge. *Terms:* "exact" / "inexact", "known to a precision" ↔ `radius`,
`Ball`, the `exact` kind. *docs/:* `docs/settings.md#How a number is held…`;
`docs/functions.md#(top)` (approx bullet). *devdocs/:* `numbers.md#(top)` →
`#The types › Ball` → `#Exact mode` **(current)**. *Depends on:* N2, N3.
*Modules:* `ball.ts`, `radius.ts`. *Owner:* `numbers.md` › "Exact and
approximate values".

**C7. Ball, midpoint, radius.** The representation of a value with its
error bound. *Class:* internal (docs may say "a value with an error
radius"). *Terms:* "error radius" ↔ `Ball`, `mid`, `rad`, `Radius`,
`unbounded`. *docs/:* `docs/settings.md#How a number is held…` ("carries a
radius"); `docs/functions.md#Very large results and approx` (uses "ball",
a leak). *devdocs/:* `numbers.md#The types` **(current)**. *Modules:*
`ball.ts`, `radius.ts`. *Owner:* `devdocs/numbers.md#The types`; docs name
"error radius" once in `numbers.md`.

**C8. Certified digits.** The digits both ends of the ball agree on under
the rounding mode. *Class:* bridge. *Terms:* "certain" (notes, docs) ↔
"certified" (devdocs), `certifies`, `certifiedDigits`. *docs/:*
`docs/settings.md#(top) › Mode`, `#How a number is held…`. *devdocs/:*
`architecture.md#Numbers` → `numbers.md#Certification and the display rule`
**(current)**. *Depends on:* N8, N9. *Modules:* `ball.ts`, `display.ts`.
*Owner:* `numbers.md` › "Digits you can trust"; mechanism stays in devdocs.

**C9. Passes and the retry loop.** Recomputation at rising working
precision until the digits certify. *Class:* bridge. *Terms:* "computes
again at more digits", "pass" (docs) ↔ "retry loop", "schedule",
`workingContexts`, `resolve`, `GUARD_DIGITS`, "working contexts".
*docs/:* `docs/settings.md#(top) › Precision limit`, `#How a number is
held…`; `docs/functions.md#Very large results and approx` (the pass table).
*devdocs/:* `architecture.md#Pipeline` → `numbers.md#Working precision and
the schedule` **(current)** → `cost.md#How a case is measured`. *Depends
on:* N8. *Modules:* `pipeline.ts`, `context.ts`. *Owner:* `numbers.md` ›
"Digits you can trust" (as a user rule); the schedule in devdocs.

**C10. The ceiling.** The finest grid, four times the precision limit
plus ten. *Class:* bridge. *Terms:* "finest grid" (docs) ↔ "ceiling",
`ceilingFor`, `DEFAULT_CEILING`, `ceilingContext`. *docs/:*
`docs/settings.md#(top) › Precision limit`, `#How a number is held…`.
*devdocs/:* `numbers.md#Working precision and the schedule` **(current)**;
`settings.md#The model` ("derived and shown, never set"). *Depends on:*
N8. *Modules:* `context.ts`, `settings.ts`, `system-build.ts`. *Owner:*
`settings.md` › Precision limit entry; defined in `numbers.md`.

**C11. The working grid of a pass.** The decimal grid inexact midpoints
are rounded onto at a given precision. *Class:* internal; collides in
name with C17. *Terms:* "grid" (docs/settings.md), "working digits" (the
schedule's) ↔ `workingDigits`, `digitsFor(bitsFor(precision))`. *docs/:*
`docs/settings.md#How a number is held…`. *devdocs/:* `numbers.md#The
kernel's boundary` → `#Settling` **(current)** → `#The working digits`
(the collision flagged, #172); `settings.md#The model › The terms`.
*Depends on:* N8. *Modules:* `rounding.ts`, `fixed.ts`, `ball.ts`. *Owner:*
`devdocs/numbers.md`; docs avoid "grid" outside the limits' explanation
(§12, question 5).

**C12. Settling.** Rounding every inexact result to the working grid.
*Class:* internal. *Terms:* none in docs ↔ `settle`, `step`, `onGrid`,
`stepQuantity`. *docs/:* implicit in `docs/settings.md#How a number is
held…` ("rounding it after every step"). *devdocs/:* `numbers.md#Settling`
**(current)**, `#Sums and alignment`, `#The significand limit`; *historical:*
"The first design let inexact midpoints grow as exact rationals", "an
earlier shape, a settle any inexact ball could reach". *Modules:*
`ball.ts`, `quantity.ts`, `evaluate.ts`. *Owner:* `devdocs/numbers.md#Settling`.

**C13. Rounding modes.** The seven modes. *Class:* user. *Terms:* panel
labels ("to nearest, ties to even") ↔ `halfEven`, `halfAwayFromZero`,
`halfTowardZero`, `towardZero`, `awayFromZero`, `ceiling`, `floor`;
`RoundingMode`, `ROUNDING_LABELS`. *docs/:* `docs/settings.md#(top) ›
Rounding`; `docs/functions.md#(top)` (round). *devdocs/:* `numbers.md#The
types` (rounding.ts) → `#Certification and the display rule` **(current)**;
`settings.md#The model › Rounding` (default migrated); `builtins.md#The
exact functions` (`round`). *Depends on:* N11. *Modules:* `rounding.ts`,
`settings-lines.ts`, `builtins/round.ts`. *Owner:* `settings.md` › Rounding
entry (the modes); `numbers.md` (where the mode acts).

**C14. Exact mode.** *Class:* user. *Terms:* "exact" ↔ `mode: "exact"`,
`Mode`. *docs/:* `docs/settings.md#(top) › Mode`. *devdocs/:*
`numbers.md#Exact mode` **(current)**; `settings.md#The model › The modes are
exact and decimal`. *Depends on:* N1–N16. *Modules:* `context.ts`,
`settings.ts`. *Owner:* `numbers.md` › "The two modes".

**C15. Decimal mode.** *Class:* user. *Terms:* "decimal" (rejected:
"rounded", "calculator") ↔ `mode: "decimal"`. *docs/:*
`docs/settings.md#(top) › Mode`, `› Working digits`. *devdocs/:*
`numbers.md#Decimal mode` **(current)**, *historical:* "An earlier version
of the mode rounded every step and also tracked, in the radius…";
`#The working digits`; `settings.md#The model`. *Depends on:* N17–N20.
*Modules:* `context.ts`, `ball.ts`, `evaluate.ts`, `pipeline.ts`. *Owner:*
`numbers.md` › "The two modes".

**C16. Uncertified rounding.** Decimal mode's `≈` with a dot. *Class:*
user (rare). *Terms:* "a step could not be certified at the precision
limit" ↔ `uncertified` flag and kind. *docs/:* `docs/settings.md#(top) ›
Mode`. *devdocs/:* `numbers.md#Decimal mode › The ceiling` **(current)**
(#173 open); `architecture.md#The converter and its lines`. *Depends on:*
N18. *Modules:* `ball.ts`, `display.ts`, `unit-converter.ts`. *Owner:*
`numbers.md` › decimal mode.

**C17. Working digits (the setting).** Extended digits for every step
but the last in decimal mode. *Class:* user. *Terms:* "Working digits",
"extended" ↔ `mode.working`, `NumberContext.working`, `operandContext`,
`extendedWorkingOf`. *docs/:* `docs/settings.md#(top) › Working digits`.
*devdocs/:* `numbers.md#The working digits` **(current)**; `settings.md#The
model › Working digits`, `#The controls`. *Depends on:* N19. *Modules:*
`context.ts`, `settings.ts`, `evaluate.ts`, `pipeline.ts`. *Owner:*
`settings.md` › entry; rule in `numbers.md`.

**C18. Display digits.** *Class:* user. *Terms:* "display digits",
"digits asked for", "digits shown" ↔ `displayDigits`,
`NumberContext.precision` (user level). *docs/:* `docs/settings.md#(top) ›
Display digits`. *devdocs/:* `settings.md#The model › Display digits`
**(current)**; `numbers.md#Working precision and the schedule`. *Depends on:*
N8, N17. *Modules:* `settings.ts`, `context.ts`. *Owner:* `settings.md`.

**C19. Precision limit.** *Class:* user. *Terms:* "precision limit" ↔
`precisionLimitDigits`; *historical* `maxDigits` (storage v4); rejected
"digits limit", "grid limit". *docs/:* `docs/settings.md#(top) › Precision
limit`. *devdocs/:* `settings.md#The model › Precision limit` **(current)**,
`#Storage` (4→5); `numbers.md#Working precision and the schedule`, `#The
significand limit` (`precisionLimitFor`). *Depends on:* N8, N21. *Modules:*
`settings.ts`, `context.ts`. *Owner:* `settings.md`.

**C20. Significand limit and its refusal.** Bits per part of an exact
significand; "would need a significand of about N bits". *Class:*
bridge. *Terms:* "past the significand limit" ↔ `tooLarge`, `Need`,
`Reach` (`fits`/`exceeds`), `significandLimitBits`; *historical*
`maxBits`, "size limit", "most bits". *docs/:* `docs/settings.md#(top) ›
Significand limit`, `#How a number is held…`; `docs/functions.md#Very large
results and approx`. *devdocs/:* `numbers.md#The significand limit`
**(current)**, *historical:* "Measuring after forming, which the limit did
at first"; `#Which limit a refusal names`; `settings.md#The model ›
Significand limit`; `builtins.md#The exact functions` (prediction).
*Depends on:* N21, N24. *Modules:* `rational.ts`, `scaled.ts`, `ball.ts`,
`evaluate.ts`, `messages.ts`, `settings.ts`. *Owner:* `numbers.md` ›
"Values too big to hold" (rule, remedies); `settings.md` (the number).

**C21. The exponent bound.** ±10^18 on a value's decimal exponent.
*Class:* bridge. *Terms:* "too large / too small to compute: its exponent
would pass 10^18 / fall below -10^18" ↔ `overflow`, `underflow`,
`MAX_EXPONENT`, the classifier (`classifyExp`, …). *docs/:*
`docs/functions.md#Very large results and approx`; `docs/settings.md#(top) ›
Significand limit`. *devdocs/:* `numbers.md#The exponent bound`
**(current)**, `#Which limit a refusal names`, `#Why the exponent bound stays
at 10^18`; `builtins.md#The rules every built-in follows`. *Depends on:* N22,
N24. *Modules:* `scaled.ts`, `ball.ts`, `builtins/*.ts`. *Owner:*
`numbers.md` › "Values too big to hold"; the pass table and measurements
stay in `devdocs/numbers.md`.

**C22. Refusal.** The three size refusals as one class. *Class:* bridge.
*Terms:* "refused" ↔ `Refusal`, `isRefusal`. *docs/:* used throughout
`docs/settings.md`, `docs/functions.md`. *devdocs/:* `numbers.md#Which limit a
refusal names` **(current)**. *Modules:* `scaled.ts`, `rational.ts`,
`messages.ts`. *Owner:* `numbers.md`.

**C23. Unresolved values ("cannot be told from").** A value straddling an
edge where the answer would change. *Class:* bridge. *Terms:* "cannot be
told from zero / a pole / the point where the result passes the exponent
bound, at this precision" ↔ `unresolved`, `Edge`, `unresolvedWant`,
`unresolvedBound`. *docs/:* `docs/functions.md#(top)` (floor, digamma,
tan); `docs/settings.md#(top)` ("cannot be divided by"). *devdocs/:*
`numbers.md#Exact operations` **(current)**, `#The exponent bound`;
`builtins.md#The rules every built-in follows`; `architecture.md#Conversion`.
*Depends on:* N14, N15. *Modules:* `ball.ts`, `builtin.ts`, `convert.ts`,
`messages.ts`. *Owner:* `numbers.md` › "Values at an edge".

**C24. Domain errors.** *Class:* user. *Terms:* "outside a function's
domain" ↔ `domain` with reasons `notPositive`, `baseOne`,
`outsideClosedUnitInterval`, `belowOne`, `outsideOpenUnitInterval`,
`origin`, `notInteger`, `notExact`, `negative`, `outsideZeroOne`, `pole`.
*docs/:* `docs/functions.md#(top)`. *devdocs/:* `builtins.md#Domains, exact
cases and edges` **(current)**; `future.md#Complex numbers`. *Depends on:*
N15. *Modules:* `builtin.ts`, `builtins/*.ts`, `messages.ts`. *Owner:*
`functions.md` (per entry, with the family preamble).

**C25. Exact cases.** Inputs a built-in recognizes as giving a rational.
*Class:* user. *Terms:* "recognized as exact" ↔ "exact case",
`exactRoot`. *docs/:* `docs/functions.md#(top)`. *devdocs/:*
`builtins.md#The rules every built-in follows` → `#Domains, exact cases and
edges` **(current)**; `numbers.md#Roots and powers`; `testing.md#The numeric
test patterns`. *Depends on:* N6. *Modules:* `builtins/*.ts`,
`rational.ts`. *Owner:* `functions.md` (per entry); the rule in `numbers.md`.

**C26. approx.** *Class:* user. *Terms:* "known to the working precision
and no better" ↔ `approx`, `widened`, `decimal: "identity"`. *docs/:*
`docs/functions.md#(top)` bullet 7, `#Very large results and approx`.
*devdocs/:* `numbers.md#approx` **(current)**, `#The significand limit`;
`builtins.md#The rules every built-in follows`; #100, #171. *Depends on:*
N23. *Modules:* `builtins/approx.ts`, `ball.ts`. *Owner:* `numbers.md`
(the concept) and `functions.md` (the entry).

**C27. The dependency problem.** Two occurrences of one value are
independent. *Class:* bridge. *Terms:* "two independent copies of its
argument's bounds" ↔ "the dependency problem of interval arithmetic".
*docs/:* `docs/definitions.md#Functions` (last paragraph). *devdocs/:*
`architecture.md#Functions` → `functions.md#Precision, the radius and cost`
**(current)**; `numbers.md#Exact mode`. *Depends on:* N5. *Modules:*
`ball.ts`, `evaluate.ts`. *Owner:* `numbers.md` (one paragraph);
`definitions.md` links.

**C28. Whole-expression precision.** The model's name, against
per-operation precision. *Class:* bridge. *docs/:* none. *devdocs/:*
`numbers.md#Exact mode` **(current)**, `#Settling`; `future.md#Symbolic
values`. *Depends on:* N8. *Owner:* `devdocs/numbers.md`; named once in
`numbers.md`.

**C29. Ratio notation and its width.** *Class:* user. *Terms:* "ratio
notation", "ratio", "width" ↔ `Notation`, `RatioDisplay`, `ratioParts`,
`fraction: true`, `scale`; *historical* the `fractions` flag (storage
v2), notation as a string (v3). *docs/:* `docs/settings.md#(top) ›
Notation`. *devdocs/:* `notation.md#The rule` **(current)**, `#The width`
(*historical:* "The first rule tied the fit to the display digits"),
`#Where a ratio is written`, `#Not in decimal mode`; `settings.md#The model`
(nested choice), `#Storage`. *Depends on:* N13, N2. *Modules:*
`display.ts`, `outcome.ts`, `settings.ts`. *Owner:* `settings.md` (entry);
`numbers.md` › "How an exact value is written".

**C30. Number formatting.** `%g`-style digits and exponents. *Class:*
user. *Terms:* "written as a decimal", "exponent" ↔ `format`, `roundTo`.
*docs/:* examples only. *devdocs/:* `numbers.md#Formatting` **(current)**.
*Depends on:* N12. *Modules:* `scaled.ts`, `display.ts`. *Owner:*
`numbers.md` › "How numbers are written".

**C31. Zero and its bound.** "within 2e-30 of zero", written `0`.
*Class:* user. *Terms:* ↔ kind `zero`, `zeroBound`. *docs/:*
`docs/settings.md#(top)`. *devdocs/:* `numbers.md#Certification and the
display rule` **(current)** (commit 6b38e25). *Depends on:* N10. *Modules:*
`display.ts`. *Owner:* `numbers.md`.

**C32. Memoized constants and the Bernoulli run.** Computed on first use
at the ceiling and kept. *Class:* internal, with a visible first-use
delay. *Terms:* "computed once per page load … and kept" (docs) ↔
`MEMO_MARGIN`, `constants.ts`, `bernoulli-ratios.ts`. *docs/:*
`docs/functions.md#(top)` (gamma bullet). *devdocs/:* `numbers.md#Memoized
constants` **(current)**; `builtins.md#The Gamma and Beta families`;
`cost.md#What the costs come from`; `future.md` (#103). *Depends on:* N25.
*Modules:* `constants.ts`, `fixed-log.ts`, `fixed-gamma.ts`,
`bernoulli.ts`, `bernoulli-ratios.ts`. *Owner:* devdocs; one qualitative
sentence in `functions.md`'s Gamma preamble.

**C33. Cost and the catalogue.** What an expression that never certifies
costs. *Class:* bridge. *Terms:* "a limit on effort", "freeze", "hang" ↔
cold, warm, passes, typing, `FLOOR_MS`, `DEADLINE_MS`. *docs/:*
`docs/functions.md#(top)` (gamma timings); `docs/settings.md#(top) › Precision
limit`. *devdocs/:* `numbers.md#Working precision and the schedule` →
`cost.md` **(current, regenerated tables)** → `future.md#Extensions that fit`
(#118). *Depends on:* N7, N8, N25. *Modules:* `pipeline.ts`,
`bench/stress/*`. *Owner:* `devdocs/cost.md`; `numbers.md` › "What costs
time" (qualitative).

**C34. Dimension and dimension mismatch.** (Part of the quantity
abstraction; listed for naming.) *Class:* user. *Terms:* "dimension",
"quantities of the same thing" ↔ `Dimension`, `dimensionMismatch`,
`ConformanceError`. *Owner:* `quantities.md`. Pointers in §1.2.

**C35. Kinds.** Dimensionless markers that keep angles from numbers.
*Class:* user. *Terms:* "kind", "kind primitive" (devdocs, `!kind`) ↔
"dimensionless marker" (docs) ↔ `kindMismatch`. *docs/:*
`docs/definitions.md#The format`. *devdocs/:* `architecture.md#Quantities,
dimensions and kinds` **(current)**; `builtins.md#Dimension rules › Angles`;
`future.md#Extensions that fit` (lenient conversion). *Depends on:* Q2–Q4.
*Modules:* `dimension.ts`, `units.txt`. *Owner:* `quantities.md` › "Kinds".

**C36. Conformance.** The test that two quantities can be added or
converted. *Class:* bridge. *Terms:* "the same test that have and want
must pass" (docs) ↔ "conform", "conformance check". *docs/:*
`docs/definitions.md#Expressions › + and -`. *devdocs/:*
`architecture.md#Quantities…`, `#Evaluation` **(current)**;
`functions.md#Annotations`. *Depends on:* Q3. *Modules:* `dimension.ts`,
`evaluate.ts`, `convert.ts`. *Owner:* `quantities.md` (defines the word).

**C37. Primitives.** The base units and kind markers everything is
defined down to. *Class:* user. *Terms:* "primitive", "base unit" ↔
`Primitives`, roles. *docs/:* `docs/definitions.md#The format`, `#What the
file contains`. *devdocs/:* `architecture.md#Quantities…` **(current)**,
`#Definitions`. *Depends on:* Q2. *Modules:* `dimension.ts`, `build.ts`,
`units.txt`. *Owner:* `quantities.md` (concept); `units.md` (which).

**C38. Prefixes, name resolution and ambiguity.** *Class:* user. *Terms:*
"prefix", "an exact name always wins", "ambiguous" ↔ `names.ts`,
`name-index.ts`, `prefixedName`, `ambiguous`. *docs/:*
`docs/definitions.md#Names`. *devdocs/:* `architecture.md#Definitions`
**(current)**; `builtins.md#Names`; `benchmarks.md#What each benchmark
asserts`. *Depends on:* Q9. *Modules:* `names.ts`, `name-index.ts`,
`table.ts`, `build.ts`. *Owner:* `expressions.md` › "How a name is read";
the load-time checks in `definitions.md`.

**C39. Unit lists.** *Class:* user. *Terms:* "unit list", "list", "a
sum" ↔ `convertToList`, `roundTerms`, `parseUnitList`, `nonpositiveUnit`.
*docs/:* `docs/definitions.md#Unit lists`, `#What the file contains`.
*devdocs/:* `architecture.md#Unit lists` **(current)**, `#The converter and
its lines › A unit list`; `notation.md#Where a ratio is written`. *Depends
on:* Q15, N10. *Modules:* `convert.ts`, `pipeline.ts`, `outcome.ts`,
`display.ts`. *Owner:* `quantities.md` (semantics); `expressions.md` (the
`;` syntax of the want); `units.md` (the defined lists).

**C40. User-defined functions.** *Class:* user. *Terms:* "function", "a
function the file defines" ↔ `UnitFunction`, `Definition.function`,
`applyFunction`, `callFailed`. *docs/:* `docs/definitions.md#Functions`.
*devdocs/:* `architecture.md#Definitions`, `#Functions` → `functions.md#(top)`,
`#Definitions`, `#Calls`, `#Build-time checks` **(current)**; *historical:*
`#Alternatives considered` (the `[1;K]` form). *Depends on:* Q3, Q5, N14.
*Modules:* `definitions.ts`, `build.ts`, `evaluate.ts`, `table.ts`.
*Owner:* `definitions.md` › "Functions".

**C41. Inverses and conversion into a function.** *Class:* user. *Terms:*
"inverse", "the `~` line", "the reading that gives the quantity",
"recovered argument" ↔ `invertFunction`, `noInverse`, `inverseMismatch`,
`inverseFailed`, `inverseArity`, `orphanInverse`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `architecture.md#Functions` →
`functions.md#A function as the want`, `#Display` **(current)**. *Depends
on:* Q16, N14, N16. *Modules:* `evaluate.ts`, `pipeline.ts`, `outcome.ts`,
`build.ts`. *Owner:* `definitions.md` (writing an inverse);
`quantities.md` (the output mode).

**C42. Annotations.** *Class:* user. *Terms:* "annotation", "the unit it
takes" ↔ `annotation`, `annotationScale`, `annotationNotUnits`,
`zeroDeclaredUnit`, `argumentMismatch`, `functionMismatch`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `functions.md#Annotations`
**(current)**, `#Build-time checks`. *Depends on:* Q3, Q5. *Modules:*
`definitions.ts`, `build.ts`, `dimension-of.ts`, `evaluate.ts`. *Owner:*
`definitions.md`.

**C43. Conditions and undecided conditions.** *Class:* user. *Terms:*
"condition", "such that", "undecided", "the value assumes it does" ↔
`checkConditions`, `decide`, `orderOf`, `conditionFailed`,
`undecidedCondition`, `wantConditionFailed`, `conditionWithoutParameter`,
`nonconformingComparison`, `mixedComparison`, the collector of
assumptions. *docs/:* `docs/definitions.md#Functions`. *devdocs/:*
`architecture.md#Functions` → `functions.md#Conditions`, `#The check at a
call`, `#An undecided condition` **(current)**. *Depends on:* N14, N15, Q3.
*Modules:* `evaluate.ts`, `ball.ts`, `build.ts`, `definitions.ts`,
`pipeline.ts`, `outcome.ts`. *Owner:* `definitions.md` (syntax and
semantics); the comparison rule in `numbers.md`.

**C44. Parameter names and shadowing.** *Class:* user. *Terms:* ↔
`parameterNamesUnit`, `duplicateParameter`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `functions.md#Names and
shadowing` **(current)** (#131). *Modules:* `definitions.ts`. *Owner:*
`definitions.md`.

**C45. Calls, arity, "not a function".** *Class:* user. *Terms:* "a
call", "the space matters" ↔ `arityMismatch`, `notAFunction`,
`functionAsUnit`. *docs/:* `docs/definitions.md#Expressions › A call`,
`#Functions`. *devdocs/:* `architecture.md#Expressions` → `functions.md#Calls`
**(current)**; `builtins.md#Arity`. *Depends on:* Q9. *Modules:* `expr.ts`,
`evaluate.ts`, `table.ts`, `messages.ts`. *Owner:* `expressions.md`.

**C46. Temperature readings and differences.** *Class:* user. *Terms:*
"reading" vs "difference" ("interval" in docs) ↔ `tempC`, `tempF`,
`degC`, `degF`, `degR`. *docs/:* `docs/definitions.md#What the file
contains`, `#Functions`. *devdocs/:* `functions.md#(top)`, `#Definitions`
**(current)**; `future.md#Ruled out, and why` (offsets). *Modules:*
`units.txt`. *Owner:* `units.md` (entries); `quantities.md` (why readings
are functions).

**C47. Logarithmic units.** `decibel`, `bel`, `neper` as functions.
*Class:* user. *docs/:* `docs/definitions.md#What the file contains`.
*devdocs/:* `builtins.md#Names`; `functions.md#Definitions` **(current)**.
*Modules:* `units.txt`. *Owner:* `units.md`.

**C48. Angles and the radian kind.** *Class:* user. *Terms:* "angle",
"the radian kind" ↔ `angleToNumber`, `numberToAngle`,
`conformingToAngle`, `noAngles`. *docs/:* `docs/functions.md#(top)` bullets
4–5. *devdocs/:* `architecture.md#Quantities…` → `builtins.md#Dimension rules
› Angles` **(current)**. *Depends on:* Q8. *Modules:* `builtin.ts`,
`builtins/trig.ts`, `builtins/inverse-trig.ts`, `units.txt`. *Owner:*
`quantities.md` › "Kinds" (angles as the example); `functions.md` entries.

**C49. Plain number.** A quantity with no dimension and no kind.
*Class:* user. *Terms:* "plain number" (docs, builtins.md) ↔
"dimensionless" (architecture.md; which there sometimes includes kinds).
*Owner:* `quantities.md` defines it; see §8.

**C50. The system definitions file.** `src/units.txt` and what it holds.
*Class:* user. *Terms:* "definitions file", "the file", "system
definitions", "the unit table" ↔ `loadSystemDefinitions`,
`buildSystemTable`, `UnitTable`. *docs/:* `docs/definitions.md#(top)`,
`#What the file contains`. *devdocs/:* `architecture.md#Definitions`
**(current)**, `#The shell and its parts`; `development.md#Adding a unit`;
`layout.md#The files`. *Depends on:* Q10, Q11. *Modules:* `units.txt`,
`system-table.ts`, `system-build.ts`, `units.test.ts`. *Owner:* `units.md`
(contents); `definitions.md` (format); "Adding a unit" stays in devdocs.

**C51. Error messages and locations.** *Class:* bridge. *Terms:* "the
message says…", "marks the input at fault" ↔ `messages.ts`, `Span`,
`Rejection`, error kinds. *docs/:* quoted messages throughout.
*devdocs/:* `architecture.md#Parsing`, `#Evaluation`, `#Messages`
**(current)**; `development.md#Style guide`. *Modules:* `messages.ts`,
`span.ts`. *Owner:* undecided (§12, question 6).

**C52. Settings storage and migrations.** *Class:* internal. *Terms:*
"format version" (docs) ↔ `STORAGE_VERSION`, `savedBy`,
`settingsFromStored`; "stored version" (commit subjects). *docs/:*
`docs/settings.md#(top)`. *devdocs/:* `settings.md#Storage` **(current; the
migrations 1→5 are the dated history)**; `benchmarks.md#The search`.
*Modules:* `settings.ts`. *Owner:* `devdocs/settings.md#Storage`; one
sentence in `settings.md`.

**C53. The clamp chain and refused edits.** *Class:* user. *Terms:* "at
most 2,453 digits under the significand limit", "lowered from … to fit"
↔ `rangesOf`, `Bounds`, `clampSettings`, `clampsOf`, `refusalOf`,
`minBy`/`maxBy`. *docs/:* `docs/settings.md#(top)` ("The limits are set
top-down"). *devdocs/:* `settings.md#The model › The chain` →
`#Applying a change` **(current)**. *Modules:* `settings.ts`,
`settings-lines.ts`, `settings-panel.ts`. *Owner:* `settings.md` › "How
the settings bound each other".

**C54. Defaults and resets.** *Class:* user. *Terms:* "default …",
"Reset all settings" ↔ `withDefault`, `resetSettings`, `isAtDefault`,
`DEFAULT_SETTINGS`, `DEFAULT_MODES`. *docs/:* `docs/settings.md#(top)`.
*devdocs/:* `settings.md#Applying a change › Resets` **(current)**.
*Modules:* `settings.ts`. *Owner:* `settings.md`.

**C55. The probe.** "Measure this device" and its proposal. *Class:*
user. *Terms:* ↔ `recommendLimits`, `Probe`, `Recommendation`,
`COMPOSITE`, `budgetMs`. *docs/:* `docs/settings.md#(top)`. *devdocs/:*
`settings.md#The probe` **(current)**; `builtins.md#The elementary routines`
(the composite); `testing.md#What a test may depend on`. *Modules:*
`limits.ts`, `settings-panel.ts`. *Owner:* `settings.md`.

**C56. The settings sheet.** The cog, the sheet, its controls. *Class:*
user (interface). *Terms:* "sheet", "panel", "cog" ↔ `settings-panel.ts`,
`settings-button.ts`, `step-button.ts`. *docs/:* `docs/settings.md#(top)`
(first paragraph). *devdocs/:* `architecture.md#UI` → `settings.md#The
sheet`, `#The controls` **(current)**. *Modules:* `settings-panel.ts`,
`settings-button.ts`, `step-button.ts`, `app-shell.ts`. *Owner:* §12,
question 3 (`app.md` or the preamble of `settings.md`).

**C57. Installation, offline use, updates, the build number.** *Class:*
user. *Terms:* "build number", "update to …", "up to date", "couldn't
check (offline?)" ↔ `BUILD_ID`, `sw.ts`, precache, `register-service-worker.ts`,
`service-worker-updates.ts`. *docs/:* `docs/README.md#(top)`;
`docs/settings.md#(top)` ("Tapping the build number…"). *devdocs/:*
`offline.md` **(current)**; `layout.md#The files`; `architecture.md#The shell
and its parts`. *Modules:* `app-footer.ts`, `register-service-worker.ts`,
`service-worker-updates.ts`, `sw.ts`, `build-id.ts`. *Owner:* §12,
question 3 (`app.md`); not `settings.md`.

**C58. Hard bounds and fixed constants.** *Class:* bridge. *Terms:* the
ranges in the panel ↔ `MAX_SIGNIFICAND_LIMIT_BITS` (2^20),
`MIN_SIGNIFICAND_LIMIT_BITS` (358), `MAX_EXPONENT` (10^18), `WIDTH_LIMIT`
(1000), `DEFAULT_WIDTH` (20), `GUARD_DIGITS` (10), `GUARD_BITS` (32),
`ROOT_DEGREE_LIMIT` (2^32), `FORMABLE_RADIUS_BITS` (2^16),
`BUDGET_MS_RANGE`. *docs/:* `docs/settings.md#(top)` (ranges as numbers).
*devdocs/:* `numbers.md` (several sections), `settings.md#The model`,
`notation.md#The width`, `testing.md#What a test may depend on`
**(current)**. *Modules:* `rational.ts`, `scaled.ts`, `context.ts`,
`settings.ts`, `fixed.ts`, `ball.ts`. *Owner:* `settings.md` (ranges);
devdocs (constants).

**C59. Symbolic values and complex numbers (ruled out).** *Class:*
internal (future). *docs/:* none; domain errors reflect it. *devdocs/:*
`future.md#Symbolic values`, `#Complex numbers` **(current)**;
`builtins.md#Not in this design`. *Owner:* `devdocs/future.md`; `numbers.md`
says "real values only" once.

**C60. GNU units lineage and divergences.** *Class:* framing. *docs/:*
`docs/README.md#(top)`, `docs/definitions.md#(top)`, `docs/settings.md#(top) ›
Display digits`. *devdocs/:* `architecture.md#(top)` **(current list of
divergences)**, `#Expressions`, `#Conversion`, `#The converter and its lines
› The reciprocal`; `builtins.md#Names`; `functions.md#Annotations`,
`#Alternatives considered`; `numbers.md#(top)`. *Owner:* §12, question 2.

**C61. Juxtaposition.** *Class:* user. *Terms:* ↔ the `juxtapose` node.
*docs/:* `docs/definitions.md#Expressions`. *devdocs/:*
`architecture.md#Expressions` **(current)**. *Owner:* `expressions.md`.

**C62. Number literals and the parse-time bound.** *Class:* user.
*Terms:* ↔ `parseDecimal`, `Rejection`, `check`, `rejected`. *docs/:*
`docs/definitions.md#Expressions › Numbers`. *devdocs/:*
`architecture.md#Expressions`, `#Parsing › Rejection is final`
**(current)**; `numbers.md#The exponent bound` (last sentence). *Owner:*
`expressions.md`.

**C63. The `^` exponent and `pow`.** *Class:* user. *docs/:*
`docs/definitions.md#Expressions › ^`; `docs/functions.md#(top)` bullet 3.
*devdocs/:* `architecture.md#Expressions`, `#Evaluation` **(current, #88)**;
`numbers.md#Roots and powers`; `builtins.md#Domains… › pow, and ^ with it`.
*Owner:* `expressions.md` (syntax); `functions.md` › `pow` (the difference).

---

## 6. Coverage gaps in docs/, measured against the target

### 6.1 Foundation: the numeric type — missing as a page

What exists is scattered and partly at the wrong level:
`docs/settings.md#How a number is held, and what the settings touch`
(representation-level: grids, significands, bits),
`docs/settings.md#(top) › Mode` (the two modes, compressed into one
bullet), `docs/settings.md#(top)` (two paragraphs on notes and the
relation), `docs/functions.md#(top)` (the paragraph "Every built-in takes
plain numbers…": exact cases, domains, refusals), `docs/functions.md#Very
large results and approx` (the exponent bound, with the pass table).

Missing or thin, with the devdocs passages to derive from:

- Exact and inexact values, their sources, what `=` means: derive from
  `devdocs/numbers.md#Exact mode`, `#The types › Ball` (the claim only).
- Which operations are exact and that exact values are never rounded;
  sums that cannot align are refused: `#Exact operations`, `#Sums and
  alignment`, `#Exact mode`.
- Digits you can trust: certification stated as a user rule, the retry
  up to a ceiling, notes and the uncertified mark: `#Certification and the
  display rule`, `#Working precision and the schedule` (first and last
  paragraphs), `#Decimal mode › The ceiling`.
- Comparison and equality: exact compare exactly; inexact at a bound is
  undecided; where that surfaces (conditions, division, rounding
  functions, lists, inverses): `#Comparison`; `devdocs/functions.md#The
  check at a call` (the verdict table); `devdocs/builtins.md#The exact
  functions` (on balls).
- Values at an edge ("cannot be told from"): `#Exact operations`
  (`unresolved`), `#The exponent bound` (the ball straddling the edge);
  `devdocs/builtins.md#The rules every built-in follows`.
- Identities and cancellation (`sqrt(2)^2 - 2`, `turn` into `deg`, the
  dependency problem), and their cost: `#Exact mode`;
  `devdocs/functions.md#Precision, the radius and cost`; `devdocs/cost.md#What
  the costs come from`.
- Decimal mode as a numbered list of rules, with the working digits:
  `#Decimal mode` (rules 1–4 and the per-operation list), `#The working
  digits`.
- `approx` as a concept (not only as a function): `#approx`.
- The two size limits from the user's side (what is refused, what the
  message suggests, what `approx` and decimal mode change), with the
  exponent bound: `#The significand limit` (the user-facing third),
  `#The exponent bound` (first and third paragraphs), `#Which limit a
  refusal names` (the messages).
- How numbers are written (digits, exponents, ratio notation, zero, the
  notation's five rules): `#Formatting`; `devdocs/notation.md#The rule`,
  `#Where a ratio is written`.
- Rounding modes and where the mode acts: `#Certification…` (last
  paragraph); `devdocs/builtins.md#The exact functions` (`round`).
- Real values only; what symbolic exactness would add (one sentence):
  `devdocs/future.md#Symbolic values`, `#Complex numbers`.

### 6.2 Foundation: the quantity — missing as a page

What exists: pieces of `docs/definitions.md#The format` (primitives and
kinds), `#Expressions › + and -` (conformance by example), `#Names`,
`#Unit lists`, `#Functions` (annotations). Nothing states the model.

Missing, with sources:

- Quantity = value + dimension; dimensions as exponents over
  primitives, exact even in decimal mode: `devdocs/architecture.md#Quantities,
  dimensions and kinds`; `devdocs/numbers.md#Decimal mode` (last bullet).
- Dimension vs kind; the two-step conformance test and the two
  mismatches; no special zero: `devdocs/architecture.md#Quantities…`.
- "A quantity carries no unit of its own" and its consequences (floor,
  annotations): `devdocs/functions.md#Annotations`; `devdocs/builtins.md#Dimension
  rules › floor and its kin`.
- Angles as the kind users meet: `devdocs/builtins.md#Dimension rules ›
  Angles`.
- How a conversion is answered: the ratio, a want with a magnitude, the
  blank want, the reciprocal line and when there is none, lines that
  type back: `devdocs/architecture.md#Conversion`, `#The converter and its
  lines`.
- Unit lists' semantics (counts, remainder, rounding carry, zero terms,
  validity): `devdocs/architecture.md#Unit lists`.
- Conversion into a function as an output mode: `devdocs/functions.md#A
  function as the want`, `#Display`.
- Exactness of unit factors; which units are inexact (`pi()`): `docs/
  definitions.md#What the file contains` (keep), `devdocs/builtins.md#The
  elementary routines`, `devdocs/numbers.md#approx` (constants).
- Why temperature readings and logarithmic levels are functions, not
  units: `devdocs/functions.md#(top)`; `devdocs/future.md#Ruled out`.
- How a dimension is written in errors: `devdocs/architecture.md#Quantities…`.

### 6.3 Expression language reference — partial, misplaced

`docs/definitions.md#Expressions` and `#Names` are the current reference
but sit under "Unit definitions". Missing:

- A formal grammar and a precedence table (§2.1.3); derive from
  `devdocs/architecture.md#Expressions`.
- The `want` field's own grammar: lists, bare names, a want with a
  magnitude, a call as a want: `devdocs/architecture.md#Pipeline`, `#Unit
  lists`, `#Functions`.
- Literal limits at parse (hard bound, exponent bound) and at evaluation
  (significand limit): `devdocs/architecture.md#Parsing › Rejection is final`;
  `devdocs/numbers.md#The significand limit`.
- Name resolution order in full (exact unit, prefix + unit; parameter
  before unit; function before built-in; no prefixes on functions):
  `devdocs/architecture.md#Definitions`, `#Evaluation`;
  `devdocs/functions.md#Names and shadowing`.
- Evaluation order and which operand an error points at:
  `devdocs/architecture.md#Evaluation`.
- Whitespace and what `×`, `≤`, `≥`, `#` do in the fields (unstated; §12).
- The printed form (what the app writes back, `×` vs `*`, parentheses):
  `devdocs/architecture.md#Expressions` (printer), `#The converter and its
  lines`; `devdocs/notation.md#Where a ratio is written`.
- Parse errors and how they read: `devdocs/architecture.md#Parsing`.

### 6.4 Definition language reference — closest to complete

`docs/definitions.md` covers the format, names, lists and functions.
Missing or thin:

- A line-level grammar for all six kinds (§2.2.3); derive from
  `devdocs/functions.md#Definitions` and `devdocs/architecture.md#Definitions`.
- The build-time checks as a table (error, cause, fix), including
  `inch2.54 cm`, `name[`, `orphanInverse`, `inverseArity`,
  `zeroDeclaredUnit`, `nonconformingComparison`,
  `conditionWithoutParameter`, the build's `undecidedCondition`,
  `annotationScale`/`annotationNotUnits`, `parameterNamesUnit`,
  `duplicateParameter`, `mixedComparison`: `devdocs/architecture.md#Definitions`
  (the catalogue), `devdocs/functions.md#Build-time checks`, `#Names and
  shadowing`, `#Conditions`.
- How definitions interact with exactness: units evaluated once at the
  ceiling in exact mode, functions per pass, `approx` in a body, what the
  build does not check: `devdocs/numbers.md#Working precision and the
  schedule`, `#approx`; `devdocs/functions.md#Definitions`, `#Build-time checks`.
- How definitions interact with dimensions: `dimensionOf` inference,
  conditions' sides conforming, prefix bodies dimensionless:
  `devdocs/functions.md#Annotations`, `#Conditions`; `devdocs/architecture.md#Definitions`.
- Inverse conditions and what a conversion into a function checks:
  `devdocs/functions.md#Conditions` (last paragraph), `#A function as the want`.
- The status of user definitions (system file only today; #132):
  `devdocs/future.md#Extensions that fit`.
- `docs/definitions.md#What the file contains` is a catalogue, not
  language; see §7 (`units.md`) and §12, question 4.

### 6.5 Settings reference — complete in coverage, wrong in shape

Every setting is described, but `docs/settings.md` mixes the sheet's
mechanics, the model, and representation. Missing or to restructure:

- One entry per control with stored key, default, range and what bounds
  it, effect in each mode: `devdocs/settings.md#The model`, `#Applying a
  change` (`rangesOf`).
- The clamp chain and refusals as a short table: `devdocs/settings.md#The
  model › The chain`, `#Applying a change`.
- "Measure this device" as a procedure (what it times, what it proposes,
  Apply): `devdocs/settings.md#The probe`.
- The ratio width and the extended working digits as entries of their
  own: `devdocs/notation.md#The width`; `devdocs/numbers.md#The working digits`.
- Remove from here: the update-check paragraph (C57), the
  representation section (C11), the sheet's layout detail beyond what a
  user needs to find a control.

### 6.6 Built-in function reference — a prose list, not a reference

`docs/functions.md#(top)` covers every family in bullets. Missing per
entry (template in §4.1): signature and argument order; dimension
requirements and result; exact cases; domain wording; edges; decimal
mode; related settings. Specific gaps, with sources in
`devdocs/builtins.md`:

- `pow`: `pow(1, y)`, `pow(0, y)`, `pow(-1, y)` parity, `pow(0, 0)`, the
  log-space route: `#Domains… › pow, and ^ with it`.
- `log`: the exact cases both ways, `b` checked first: `#Domains… › log's
  exact cases`.
- `atan2`: quadrant rules, `y` exactly zero, the origin: `#Domains…`,
  `#Huge and tiny arguments`.
- `tan` at a pole; `asin`/`acos`/`acosh`/`atanh` at their ends;
  `asin(0.1 + 1e-15000)` refused (#63): `#Domains…`, `#Huge and tiny
  arguments`.
- Tiny and huge arguments where visible (`sin(1e-999999999 radian)`,
  `atan` beyond `2^bits`, `tanh` saturation, `ln(1e999999999)`,
  `log10(1e999999999)` exact): `#Huge and tiny arguments`.
- `round(x, places)`: `places` an exact integer, held to the limit:
  `#The exact functions`.
- `div`/`mod`: the sign convention and the `overflow`/`tooLarge` edges:
  `#The exact functions`.
- `gcd(0, 0)`, `lcm(a, 0)`, `binomial` outside `0..n`,
  `doublefactorial(-1)`: `#The exact functions`.
- `digamma` reflection and poles, `lgamma` as `ln |Γ|`, `gamma`'s sign,
  `beta` at a pole of the sum, the incomplete functions' exact cases and
  the `tooLarge` regime, `erfc` thresholds, `incbetareg`'s polynomial
  case: `#The Gamma and Beta families`.
- Decimal-mode behaviour of each family (one step, exact cases rounded):
  `devdocs/numbers.md#Decimal mode › A built-in's call`.
- `docs/functions.md#Very large results and approx` belongs to the numeric
  foundation (C21) and duplicates `devdocs/numbers.md#Why the exponent bound
  stays at 10^18`.

### 6.7 Getting started — missing entirely

The seed is `docs/README.md#(top)` (the intro paragraph) and
`devdocs/architecture.md#(top)`. It should teach by example: a
conversion, the reciprocal line, a unit list, a calculation with a
blank want, `approx`, a function call, a conversion into `tempC`, a
settings change (display digits, ratio notation, decimal mode), and
what `=`/`≈` and a note mean, each linking to the owning page.

### 6.8 Existing pages that must link to the foundation pages

- `docs/definitions.md`: `#Expressions › + and -` (conformance →
  `quantities.md`); `› Numbers` (exactness → `numbers.md`); `#Unit lists`
  (rounding of the remainder, `=` on a list → `numbers.md`,
  `quantities.md`); `#Functions` (conditions on inexact values, calls not
  memoized, the dependency problem, decimal mode → `numbers.md`;
  annotations and conformance → `quantities.md`).
- `docs/functions.md`: the preamble (exact cases, `=`/`≈`, domains,
  "cannot be told", refusals → `numbers.md`; angle and plain-number
  rules → `quantities.md`); `#Very large results and approx` (dissolved
  into `numbers.md`).
- `docs/settings.md`: Display digits, Mode, Notation, Working digits,
  Precision limit, Significand limit (each → the owning `numbers.md`
  subsection); `#How a number is held…` (dissolved into `numbers.md` and
  the limits' entries).
- `docs/README.md`: the index itself; the intro's `≈` lines → `numbers.md`.

---

## 7. Proposed docs/ outline (skeleton)

Pages, each with title, role and a one-line scope, then the
concept-level sections. File names are proposals.

**`docs/README.md` — index (guide).** What the app is in two sentences;
the page list below with one line each; where the developer docs are.

**`docs/getting-started.md` — Getting started (guide).** A task-oriented
tour that defines nothing and links everything.
- Your first conversion (`3 ft` → `in`; the two lines; copy)
- Lists of units (`ft;in`, `time`)
- Calculating with a blank want (`2 kg * 3 m/s^2`, `exp(1)`)
- Reading `=`, `≈` and a note
- Functions and readings (`sin(30 deg)`, `tempC(20)`, `300 K` → `tempF`)
- Making a value approximate (`approx(2.54)`)
- Changing a setting (display digits, ratio notation, decimal mode)
- When something is refused (a mismatch, a size refusal, an edge)
- Installing and working offline
- Differences from GNU units (pending §12, question 2)

**`docs/numbers.md` — Numbers (foundation).** The numeric model a user
needs to predict and interpret any result.
- Exact and approximate values (the fraction times a power of ten; the
  error radius; the sources of approximation)
- Operations that stay exact; exact cases of functions
- Digits you can trust (display digits; retries up to a ceiling; what a
  note says; the uncertified mark)
- Comparison and equality (exact vs approximate; undecided at a bound)
- Values at an edge ("cannot be told from")
- Identities and cancellation (what never certifies; the dependency
  problem; what it costs)
- The two modes (exact; decimal as rules 1–4; working digits)
- `approx`
- Rounding modes and where they act
- Values too big to hold (the significand limit and its remedies; the
  exponent bound; which message says which)
- How numbers are written (digits, exponents, zero, ratio notation)
- What costs time (qualitative)
- Real values only

**`docs/quantities.md` — Quantities (foundation).** Units, dimensions,
kinds and what a conversion is.
- A quantity: a value with a dimension
- Primitives, dimensions and kinds (angles as the example)
- Conformance: what can be added, converted, passed
- No unit of its own: consequences (floor, annotations)
- Units, prefixes and exactness of factors (which units are approximate)
- How a conversion is answered (the ratio; a want with a magnitude; the
  blank want; the reciprocal line; lines that type back)
- Unit lists (counts, remainder, rounding carry, validity)
- Conversion into a function (readings)
- Temperature and logarithmic levels as functions
- How dimensions are written in messages

**`docs/expressions.md` — The expression language (reference).** Syntax
and semantics of what is typed into either field.
- Grammar (EBNF) and precedence table
- Numbers (literals, exactness, limits)
- Names and how a name is read (units, prefixes, parameters, functions)
- Operators (juxtaposition, `* /`, `+ -`, unary `-`, `^`, parentheses)
- Calls and arity
- The have field (an expression)
- The want field (a unit, a list, a list's name, a function's name, a
  call)
- Evaluation order and error locations
- What the app writes back (printed form, `×` vs `*`)
- Pitfalls (`1/12 year`, `kg(m/s)`, `-2^2`, `m2`)
- Appendix: parse and evaluation errors (pending §12, question 6)

**`docs/definitions.md` — The definition language (reference).** The
file's format and the semantics of each definition kind.
- The file: lines, comments, order, errors
- Grammar (EBNF) for the six kinds
- Primitives (`!`, `!kind`)
- Prefixes
- Units (exactness; evaluated once at the ceiling)
- Unit lists (validity at load; the name as a want)
- Functions (parameters, annotations, result annotation, conditions,
  body; exactness and cost; decimal mode)
- Inverses (conditions; what a conversion into the function checks)
- Names: namespaces, prefixed-name rule, shadowing
- Build-time checks (table: error, cause, fix)
- User definitions today (system file only; #132)

**`docs/units.md` — The units the app knows (reference).** The system
file's contents (pending §12, question 4).
- The SI (base units, prefixes, derived, accepted non-SI)
- US customary; UK imperial; naming conventions (`imp`, `uk`, `long`)
- Constants and extras (CGS, pressure, calories, time, bits and bytes)
- Angle units (approximate through `pi()`)
- Temperature: differences and readings
- Logarithmic levels
- Unit lists defined in the file
- Names deliberately absent (`u`, `at`, `dB`, `e`)

**`docs/settings.md` — Settings (reference).** Every control, in terms
of the model parameter it sets.
- Where the settings are and how a change applies (short)
- Display digits
- Rounding
- Mode
- Notation and ratio width
- Working digits and the extended count
- Precision limit
- Significand limit
- Probe budget and "Measure this device"
- How the settings bound each other (the chain; refusals; clamps)
- Defaults and resets; storage (one sentence)

**`docs/functions.md` — Built-in functions (reference).** One entry per
function, the template of §4.1, grouped by family.
- Rules every built-in follows (plain numbers unless stated; exact
  cases; domains; edges; refusals; decimal mode; no prefixes; arity)
- Constants (`pi`)
- Exponential and logarithms
- Roots and powers (`pow` vs `^`)
- Trigonometric; inverse trigonometric
- Hyperbolic
- `approx`
- Magnitude, sign and rounding (`abs`, `sign`, `floor`, `ceil`, `trunc`,
  `round`)
- Division (`div`, `mod`)
- Integer functions
- Gamma family; incomplete gamma; error functions; incomplete beta
- Functions defined in the file (cross-reference to `units.md`)
- Not provided, and what to write instead (distributions, deferred
  specials)

**`docs/app.md` — The app (guide; pending §12, question 3).** Installing,
offline use, updates and the build number, the settings sheet's
mechanics, copying results.

---

## 8. Terminology

Conflicting or synonymous terms found, with a proposed canonical term.
"Both" means the term is used in both corpora with that meaning.

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "the quantity to convert" / "the unit to convert to" (docs) vs `have` / `want` (devdocs, 100+ uses) vs "You have" / "You want" (the fields) | `docs/definitions.md`; `devdocs/architecture.md` | **have** and **want**, introduced once in getting started as the fields' names; devdocs keep the code names unchanged. |
| "exact" / "inexact" (both) vs "approximate", "known to a precision" (docs) | `docs/functions.md`, `devdocs/numbers.md` | **exact** / **inexact** as the model's words; "approximate" only as the plain-language gloss and in `approx`'s name. |
| "certain" (the notes; docs) vs "certified" (devdocs) | counts in §9.1 | **certified** as the concept in both; the notes keep "are certain" as quoted text (§12, question 8). |
| "pass", "retry loop", "retries", "escalation", "schedule", "working contexts" | `devdocs/numbers.md`, `cost.md`, `docs/settings.md` | **pass** (one evaluation at a precision) and **retry loop** in both; "schedule" devdocs-only. |
| "finest grid" (docs) vs "ceiling" (devdocs) | `docs/settings.md`; `devdocs/numbers.md`, `settings.md` | **ceiling**, glossed once as "the finest grid the app rounds onto". |
| "working digits" (the decimal-mode setting) vs "working digits" / "working precision" of a pass (`workingDigits`, `workingContexts`; #172) | `devdocs/numbers.md#The working digits` | **working digits** = the setting only; **working precision** = a pass's precision; devdocs to rename the schedule's "working digits" (code vocabulary is #172's). |
| "display digits" vs "digits asked for" vs "digits shown" vs `precision` | both | **display digits**; devdocs map `NumberContext.precision` once. |
| "significand" vs "mantissa"; "significand limit" vs `maxBits`, "size limit", "most bits" | settled in `devdocs/settings.md#The model` | **significand**, **significand limit** (already canonical). |
| "precision limit" vs `maxDigits`, "digits limit", "grid limit" | settled | **precision limit**. |
| "exact mode" / "decimal mode" vs "certified", "calculator", "rounded" | settled in `devdocs/settings.md` | **exact mode** / **decimal mode**. |
| "ratio notation" / "ratio" vs "fractions" (old flag, commit subjects) vs "fraction" (devdocs for the value's representation) | `devdocs/notation.md`, `settings.md#Storage` | **ratio notation**, **ratio** (the written form), **width**; "fraction" reserved for the significand in devdocs. |
| "digits notation" vs "the decimal display" / "decimal expansion" | `devdocs/notation.md` | **digits** (the notation's value) and **the decimal display** (the mechanism, devdocs). |
| "decimal" overloaded: decimal mode, decimal literal, decimal display, decimal grid, decimal exponent | both | keep, but each page says which on first use; never "decimal" alone for the mode in docs ("decimal mode"). |
| "plain number" (docs, builtins.md) vs "dimensionless" (architecture.md, sometimes including kinds) vs "number" | both | **plain number** (no dimension, no kind) in docs; devdocs: "dimensionless" only for an empty vector, "plain" when kinds are excluded too. |
| "kind" / "kind primitive" (devdocs) vs "dimensionless marker" (docs) vs "angle" | both | **kind**; "the radian kind" / "an angle" for the one kind the file declares. |
| "conform" / "conformance" (devdocs) vs "quantities of the same thing", "the same test" (docs) | both | **conform** / **conformance**, defined in `quantities.md`. |
| "primitive" / "dimension primitive" / "base unit" | both | **primitive** (with its role); "base unit" only when quoting the SI. |
| "ball", "midpoint", "radius" (devdocs; leaks into docs/functions.md ×4, docs/settings.md ×1) vs "error radius", "how well a value is known", "within a bound" (docs) | §9.1 | docs: **error radius** (named once) and plain phrasing; **ball** devdocs-only. |
| "unresolved" (internal) vs "cannot be told from …" (messages) vs "straddles" vs "undecided" (conditions) | both | docs: **cannot be told from** (edges) and **undecided** (conditions); devdocs keep `unresolved`. |
| "refused" / "refusal" vs "error" | both | **refusal** for the three size refusals; **error** for everything else. |
| `tooLarge` vs "past the significand limit" vs "would need a significand of N bits" | both | docs: **past the significand limit**. |
| `overflow` / `underflow` vs "too large / too small to compute" vs "the bound" | both | docs: **too large / too small to compute** (the exponent bound's refusals); **exponent bound** for the limit. |
| "unit list" / "list" / "a sum" | both | **unit list**; "sum" only for the written form. |
| "reciprocal" (devdocs) vs "the other way round" (docs) vs "the second line" | both | **the reciprocal line**, glossed "the conversion the other way round". |
| "a function as the want" / "function conversion" / "converting into a function" / "the reading that gives the quantity" | both | **conversion into a function**. |
| "recovered argument" / "the reading" / "count" | both | **recovered argument**; "count of the parameter's unit" for how it is written. |
| "annotation" vs "the unit it takes" vs "declared unit" (`zeroDeclaredUnit`) | both | **annotation**. |
| "condition" vs "domain" (GNU `domain=`) vs "restriction" | both | **condition**; "domain" reserved for built-ins. |
| "inverse" vs "the `~` line" | both | **inverse**. |
| "definitions file" / "units file" / "the file" / "system definitions" / "the unit table" vs "user definitions" | both | **the definitions file** (the system one, `src/units.txt`) vs **user definitions**; "unit table" devdocs-only. |
| "interval" for `degC` etc. (docs) vs "interval" of a ball (devdocs) | `docs/definitions.md#What the file contains` | **temperature difference** for the units; "interval" devdocs-only. |
| "note" vs "warning" | `devdocs/architecture.md`, `functions.md` | **note** (about digits) and **warning** (an assumed condition). |
| "`≈` with a dot", "uncertified" | both | **uncertified** (`≈̇`), named in docs. |
| "grid" | `docs/settings.md` (many), devdocs | devdocs-only, except in the settings reference's explanation of the two limits (§12, question 5). |
| "settle" / "settling" | devdocs | devdocs-only. |
| "kernel" (leaks once into docs/functions.md) | both | devdocs-only. |
| "the probe" vs "Measure this device" | both | **"Measure this device"** in docs with "(the probe)" once; **probe** in devdocs. |
| "format version" (docs) vs "stored version" / "storage version" (commits, `STORAGE_VERSION`) | both | **format version**. |
| "whole number" (docs) vs "integer" (devdocs) | both | **whole number** in docs, **integer** in devdocs, mapped once. |
| "Exucal" / "the app" / "the converter" / "the calculator" | both | **Exucal** for the product, **the app** generically, **the converter** for the two-field component; "calculator" only in the framing sentence (§12, question 2). |
| "span" vs "the text at fault" | both | docs: "the text at fault"; **span** devdocs-only. |
| "exact case" vs "recognized as exact" | both | **exact case**. |
| "juxtaposition" (both) | both | keep; gloss "writing two factors side by side" once. |

---

## 9. Preliminary structural observations (from the docs alone; unverified)

### 9.1 Cross-corpus duplication

- **The exponent bound and `approx`.** `docs/functions.md#Very large results
  and approx` and `devdocs/numbers.md#Why the exponent bound stays at 10^18`
  both carry the six-pass table of `approx(1e999)`, the "what `approx`
  relaxes" examples and the log-space advice; the docs version adds an
  ASCII diagram and the issue (#40). Owner should be `numbers.md`
  (docs) for the rule and `devdocs/numbers.md` for the table and the
  scratch-build measurements.
- **The representation.** `docs/settings.md#How a number is held…`
  restates `devdocs/numbers.md#The types` (fraction, power of ten, radius,
  grid), `devdocs/settings.md#The model › The terms` and `› The two limits
  meet in the grid` (the 2,453 derivation, "a grid point is itself a
  significand"), and `devdocs/numbers.md#The significand limit` (the dyadic
  `2^-30000` cost, `3^-100000`).
- **Calls not memoized / hand-written vs built-in / dependency problem.**
  Triplicated: `docs/definitions.md#Functions` (last paragraph),
  `devdocs/functions.md#Precision, the radius and cost`,
  `devdocs/architecture.md#Functions` (last paragraph).
- **Precedence and the `-` rules.** `docs/definitions.md#Expressions` and
  `devdocs/architecture.md#Expressions` each state the full set, the
  latter saying the former "describes it from the user's side" and then
  restating it.
- **Unit-list rounding and zero terms.** `docs/definitions.md#Unit lists`,
  `devdocs/architecture.md#Unit lists`, `#The converter and its lines › A
  unit list`.
- **Conditions' three-valued check and "why conditions differ from the
  built-ins' edges".** `docs/definitions.md#Functions` and
  `devdocs/functions.md#The check at a call`, `#An undecided condition`.
- **The sheet.** `docs/settings.md#(top)` (first paragraph) and
  `devdocs/settings.md#The sheet`, `#The controls` (heights, Done/Escape,
  steppers, the three groups, the "default …" link).
- **The update check.** `docs/settings.md#(top)` ("Tapping the build
  number…") and `devdocs/offline.md#Offline behavior › Update checks`,
  `› The worker's status`.
- **The intro.** Root `README.md#(top)` and `docs/README.md#(top)` are the
  same two paragraphs.
- **Gamma-family cost figures.** `docs/functions.md#(top)` (gamma bullet:
  "about half a second the first time and a tenth of a second a call
  after"), `devdocs/builtins.md#The Gamma and Beta families` ("0.12 s …
  0.45 s and 1.2 s"), `devdocs/cost.md#What the costs come from` ("0.6 to
  2 s a call"): three sets of numbers for one thing.
- **The call rule (`kg (m/s)` vs `kg(m/s)`).** `docs/definitions.md#Expressions`
  and `#Functions` (twice within docs), `devdocs/architecture.md#Expressions`,
  `devdocs/functions.md#Calls`.
- **Angle rules.** `docs/functions.md#(top)` bullets 4–5 and
  `devdocs/builtins.md#Dimension rules › Angles` (the latter adds the
  rationale, which is right; the rules themselves are stated twice).

### 9.2 Links against the ownership direction

- docs → devdocs (docs must not depend on devdocs): `docs/settings.md`
  seven times (`#(top)`: "`devdocs/settings.md` is the design", "`devdocs/
  numbers.md`, 'Decimal mode'", "`devdocs/notation.md` is the design",
  "`devdocs/numbers.md` ('The working digits')", "see devdocs/offline.md";
  `#How a number is held…`: "Why four times the limit plus ten …
  `devdocs/numbers.md`"); `docs/functions.md#Very large results and approx`
  ("recorded … in `devdocs/numbers.md`"); `docs/README.md#(top)` (the
  index link to `devdocs/README.md`, acceptable as navigation).
- devdocs → docs exist but do not "build on" docs: `devdocs/architecture.md#Definitions`
  and `#Expressions`, `devdocs/builtins.md#(top)`, `devdocs/functions.md#(top)`,
  `devdocs/settings.md#(top)` and `#The controls` (the `ABOUT` link),
  `devdocs/layout.md#The files` each point at docs as "the user's side" and
  then re-explain the user semantics. After the foundation pages exist,
  these passages should shrink to a link plus what is mechanism.
- devdocs → docs for the *settings' semantics* is inverted today: the
  user-level rules of the modes, notation and limits are fuller in
  `devdocs/numbers.md` and `devdocs/settings.md#The model` than in
  `docs/settings.md`, which links down to them.

### 9.3 Concepts without a clear owner

- The output lines (relation, notes, warnings, reciprocal, list lines,
  function lines, parenthesization): split across
  `devdocs/architecture.md#The converter and its lines`,
  `devdocs/numbers.md#Certification…`, `devdocs/notation.md#Where a ratio is
  written`, `devdocs/functions.md#Display`, `docs/settings.md#(top)` (tail
  paragraphs), `docs/definitions.md#Unit lists`.
- The `want` field's grammar: `devdocs/architecture.md#Pipeline`, `#Unit
  lists`, `#Functions`; `docs/definitions.md#Unit lists`, `#Functions`.
- The exponent bound: `docs/functions.md`, `docs/settings.md`,
  `devdocs/numbers.md`.
- `approx`: `docs/functions.md` (two places), `devdocs/numbers.md#approx`,
  `devdocs/builtins.md`.
- Error messages: `src/messages.ts` has no page; quoted messages are
  spread over every page.
- The system units catalogue: `docs/definitions.md#What the file contains`
  only, inside a language page.
- Installation, offline, updates: `docs/README.md`, `docs/settings.md`,
  `devdocs/offline.md`.
- Latency expectations for users: `docs/functions.md` (gamma bullet) and
  `docs/settings.md` ("a limit on effort") against `devdocs/cost.md`.
- Name resolution: `docs/definitions.md#Names` (a definitions page) owns
  a rule that governs every expression.

### 9.4 Passages that appear superseded but read as current

- `devdocs/README.md#(top)`: "current-state documents, not a history; git
  holds the history" conflicts with the prompt's framing of devdocs as
  the historical record (§12, question 1).
- `docs/definitions.md#(top)`: "This section describes that file" is a
  leftover from when the page was a README section (the split of
  2026-10-08).
- `docs/functions.md#(top)`: "Beside the functions the file defines" with
  "the file" undefined on that page (same leftover).
- `docs/settings.md#(top) › Probe budget` and the paragraph "The limits are
  set top-down": the probe "times the costliest exact product and the
  costliest built-ins", while `devdocs/settings.md#The probe` says the
  composite is the four elementary routines, deliberately not the
  costlier Gamma family.
- `devdocs/cost.md#What the costs come from` ("Typing out the 229 entries …
  16,548 keystrokes") against `#What the search has not reached` ("what
  four runs found, 714 cases in all") and tables of 344 and 47 rows: the
  prose was written for an earlier catalogue than the tables now hold
  (the page says the prose is revised by hand).
- `devdocs/architecture.md#Pipeline` diagram ends in `format ──▶ string`,
  while the text names `show`, `roundTerms` and `outcomeOf`; possibly a
  stale name.
- `devdocs/numbers.md#The working digits` (last paragraph) describes the
  unsettled vocabulary around `working` as current state with #172
  open; `#Decimal mode` has "Two rulings are provisional" and #173.
- `devdocs/builtins.md#Huge and tiny arguments`: "(`acos(1e-9860)` was
  refused at the default limit)" reads as history inside a current rule.
- `devdocs/testing.md#Type-checking`: "(one did, until the projects were
  made to match by pattern)" and `#(top)` "three of them once failed
  unnoticed" are history kept as rationale (fine, but should be marked
  as such if the corpus is to be read as a record).
- `devdocs/functions.md#Annotations`: "No message is worded for a
  definitions rejection today … the wording meant for this one is …" is
  a plan embedded in a current-state page.
- `devdocs/settings.md#The controls`: the `ABOUT` link "pointing at
  docs/settings.md until the guide lands (#191)" describes an interim
  state.
- `docs/settings.md#(top)`: "There are six settings" while the entries
  that follow are eight controls (the notation's width and the extended
  count under the mode); consistent with devdocs but confusing on its
  own.
- `docs/functions.md#(top)` (gamma bullet): the cost sentence ("computed
  once per page load for each precision asked for beyond the last and
  kept") describes the memo's growth rule; `devdocs/builtins.md` says a
  larger run replaces a smaller one. Same behaviour, different emphasis;
  the docs sentence may predate the replacement rule.

---

## 10. Audit units

Each unit fits one focused session. Each lists its doc sections, the
source modules to read, and the read-only context. The getting started
guide has no unit; it is written last.

### 10.a Core-abstraction units (verify §1 claims against the code)

**A1. Values, exactness and exact arithmetic.** Claims N1–N5, N21's
sum/alignment part. *Sections:* `devdocs/numbers.md#(top)`, `#The types`
(only what the claims rest on), `#Exact operations`, `#Sums and
alignment`, `#Exact mode`; `docs/settings.md#How a number is held…`.
*Modules:* `src/core/rational.ts`, `scaled.ts`, `radius.ts`, `ball.ts`
(exact operations, `addBalls`, `onGrid`), `context.ts`. *Context:* §1.1.1,
§1.1.5 rows on settling and the binary exponent.

**A2. Certification, the display rule and the ratio notation.** Claims
N9–N13, N24's display part. *Sections:* `devdocs/numbers.md#Certification
and the display rule`, `#Formatting`; `devdocs/notation.md#The rule`, `#Where
a ratio is written`, `#Every literal parses back`, `#Not in decimal mode`;
`devdocs/architecture.md#The converter and its lines › The relation and the
note`, `› A unit list`; `docs/settings.md#(top)` (the two tail paragraphs),
`#(top) › Notation`, `› Rounding`. *Modules:* `src/core/display.ts`,
`ball.ts` (`certifies`, `certifiedDigits`), `scaled.ts` (`format`,
`roundTo`), `rounding.ts`, `src/outcome.ts`, `src/unit-converter.ts` (the
`≈̇` glyph). *Context:* §1.1.1, §1.1.6 items 1, 7, 12.

**A3. The retry schedule, settling and the ceiling.** Claims N7, N8,
N25's schedule part, Q11. *Sections:* `devdocs/numbers.md#Working precision
and the schedule`, `#Settling`, `#Memoized constants` (cost claims only);
`docs/settings.md#(top) › Precision limit`, `› Display digits`. *Modules:*
`src/core/pipeline.ts`, `context.ts`, `ball.ts` (`step`, `settle`),
`quantity.ts` (`stepQuantity`), `src/system-build.ts`, `src/core/constants.ts`
(memo sizing only). *Context:* §1.1.1, §1.1.6 item 4.

**A4. Decimal mode and the working digits.** Claims N17–N20. *Sections:*
`devdocs/numbers.md#Decimal mode`, `#The working digits`; `docs/settings.md#(top)
› Mode`, `› Working digits`. *Modules:* `src/core/context.ts`
(`operandContext`, `checkContext`), `ball.ts` (`decimalSumApart`,
`uncertified`, `carrying`), `evaluate.ts` (literal, unit, call nodes),
`builtin.ts` (`decimal: "identity"`), `pipeline.ts` (schedule in decimal
mode), `display.ts` (uncertified), `src/outcome.ts` (last steps).
*Context:* §1.1.1, §1.1.6 items 2, 3.

**A5. Size limits, refusals and `approx`.** Claims N21–N24, N3's `approx`
part. *Sections:* `devdocs/numbers.md#The significand limit`, `#The exponent
bound`, `#Which limit a refusal names`, `#approx`, `#Failures`;
`docs/functions.md#Very large results and approx`; `docs/settings.md#(top) ›
Significand limit`. *Modules:* `src/core/rational.ts` (`tooLarge`,
`Need`, `Reach`, `*Within`), `scaled.ts` (`overflow`, `underflow`,
`BOUND_BAND`, `powerRefusal`), `ball.ts` (the classifier, `powBall`,
`powRationalBall`, `widened`), `builtins/approx.ts`, `evaluate.ts`
(suggestions, the assertion), `src/messages.ts` (the three messages).
*Context:* §1.1.1, §1.1.6 items 5, 8, 9, 11.

**A6. Comparison, edges and undecided conditions.** Claims N14–N16.
*Sections:* `devdocs/numbers.md#Comparison`, `#Exact operations`
(`unresolved`); `devdocs/functions.md#The check at a call`, `#An undecided
condition`; `devdocs/builtins.md#The rules every built-in follows` (domain
vs unresolved), `#The exact functions` (on balls). *Modules:*
`src/core/ball.ts` (`position`, `orderOf`, `sideOfZero`), `evaluate.ts`
(`checkConditions`, `decide`, the collector), `builtin.ts`,
`builtins/round.ts`, `builtins/division.ts`, `builtins/abs.ts`,
`convert.ts` (`unresolvedWant`), `pipeline.ts` (retry predicate).
*Context:* §1.1.1, §1.1.6 item 6.

**A7. Dimensions, kinds, conformance and quantity arithmetic.** Claims
Q1–Q8, Q16's conformance step. *Sections:* `devdocs/architecture.md#Quantities,
dimensions and kinds`, `#Evaluation` (conformance and error location);
`devdocs/builtins.md#Dimension rules`; `devdocs/numbers.md#Decimal mode`
(dimensions bullet). *Modules:* `src/core/dimension.ts`, `quantity.ts`,
`evaluate.ts` (sums, calls), `dimension-of.ts`, `builtin.ts` (rule
helpers), `src/units.txt` (the primitive and kind declarations only).
*Context:* §1.2.1, §1.2.6 items 1, 5, 6.

**A8. Conversion and the output modes.** Claims Q13–Q18, N12's
typeable-back part. *Sections:* `devdocs/architecture.md#Conversion`, `#Unit
lists`, `#Functions` (the want), `#The converter and its lines`;
`devdocs/functions.md#A function as the want`, `#Display`;
`docs/definitions.md#Unit lists`; `docs/README.md#(top)`. *Modules:*
`src/core/convert.ts`, `pipeline.ts`, `src/outcome.ts`, `src/core/print.ts`,
`evaluate.ts` (`invertFunction`), `src/copy-button.ts` (what it copies).
*Context:* §1.2.1, §1.2.6 items 2, 3, 8, 9.

**A9. Names, the table and the system definitions' exactness.** Claims
Q9–Q12. *Sections:* `devdocs/architecture.md#Definitions`;
`docs/definitions.md#Names`, `#What the file contains` (the exactness and
`pi()` claims); `devdocs/numbers.md#Working precision and the schedule` (the
table at the ceiling); `devdocs/builtins.md#Names`. *Modules:*
`src/core/names.ts`, `name-index.ts`, `table.ts`, `build.ts`, `graph.ts`,
`src/system-build.ts`, `src/system-table.ts`, `src/units.txt`
(structure: sections, primitives, functions, which units call `pi()`,
`approx`), `src/units.test.ts`. *Context:* §1.2.1, §1.2.6 items 4, 7, 10.

### 10.b docs/ units (audit existing content and confirm gaps; §1 as read-only context)

**D1. Expression language.** *Sections:* `docs/definitions.md#Expressions`,
`#Names`; `devdocs/architecture.md#Expressions`, `#Parsing` (user-observable
parts: rejections, error positions), `#Evaluation`. *Modules:*
`src/core/expr.ts` (`LEVELS`, `BINARY`, the grammar), `parser.ts`,
`print.ts`, `evaluate.ts`, `src/messages.ts` (parse wording),
`src/testing/expr.ts`. *Output:* the EBNF and precedence table, the
want-field grammar, the pitfalls list, the open questions on `×`, `#`,
`≤`/`≥` in the fields. *Context:* A1 (literal limits), A5, A7, §2.1.

**D2. Definition language.** *Sections:* `docs/definitions.md#The format`,
`#Names`, `#Unit lists`, `#Functions`; `devdocs/functions.md#Definitions`,
`#Annotations`, `#Names and shadowing`, `#Conditions`, `#Calls`, `#Build-time
checks`; `devdocs/architecture.md#Definitions`. *Modules:*
`src/core/definitions.ts`, `build.ts`, `dimension-of.ts`, `table.ts`
(`UnitFunction`, `arityOf`), `src/units.test.ts`, `src/messages.ts`
(function and want messages), `src/core/definitions.test.ts` (the
property test's rejected pieces, as a checklist). *Output:* the line
grammar, the build-error table, the exactness/dimension interaction
list. *Context:* A6, A7, A9, §2.2.

**D3. The system units catalogue.** *Sections:* `docs/definitions.md#What
the file contains`; `devdocs/development.md#Adding a unit`;
`devdocs/functions.md#Definitions` (the five functions). *Modules:*
`src/units.txt` (read in full here), `src/units.test.ts`. *Output:*
verification of every claim in "What the file contains" (sections,
spellings of micro, binary prefixes, `imp`/`uk`, the lists, the absent
`u`/`at`, exact factors and their sources) and the skeleton of
`units.md`. *Context:* A9, §7 (`units.md`), §12 question 4.

**D4. Settings.** *Sections:* `docs/settings.md` (all); `devdocs/settings.md#The
model`, `#Applying a change`, `#The probe`, `#The controls` (labels and
lines); `devdocs/notation.md#The width`; `devdocs/numbers.md#The working
digits`. *Modules:* `src/settings.ts` (defaults, `rangesOf`,
`clampSettings`, `refusalOf`, `contextOf`, `ratioOf`, `STORAGE_VERSION`),
`src/settings-lines.ts` (every line's text), `src/limits.ts`,
`src/core/context.ts` (`ceilingFor`, defaults), `src/core/rounding.ts`.
*Output:* the per-setting table of §3 verified, the clamp table, the
probe procedure. *Context:* A3, A4, A5, §3.

**D5. Built-ins: the elementary families.** `pi`, `exp`, `ln`, `log10`,
`log2`, `log`, `sqrt`, `cbrt`, `pow`, `sin`, `cos`, `tan`, `asin`,
`acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`,
`atanh`. *Sections:* `docs/functions.md#(top)` bullets 1–6 and the
preamble paragraph; `devdocs/builtins.md#Names`, `#Arity`, `#The rules every
built-in follows`, `#Huge and tiny arguments`, `#Dimension rules`,
`#Domains, exact cases and edges`, `#The elementary routines` (edges and
exact cases only, not the algorithms). *Modules:* `src/core/builtins.ts`,
`builtin.ts`, `builtins/{pi,exp,log,roots,pow,trig,inverse-trig,hyperbolic}.ts`
(signatures, dimension rules, exact cases, domain reasons; not the
kernels). *Output:* entries in the §4.1 template. *Context:* A2, A5, A6,
A7 (angles), §4.

**D6. Built-ins: `approx`, magnitude, rounding, division and integers.**
`approx`, `abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `div`, `mod`,
`gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial`. *Sections:*
`docs/functions.md#(top)` bullets 7–10; `devdocs/builtins.md#The exact
functions`; `devdocs/numbers.md#approx`. *Modules:*
`builtins/{approx,abs,round,division,integers}.ts`,
`builtins/exact.test.ts` (as a checklist of exact behaviour in every
mode). *Output:* entries. *Context:* A4 (decimal mode), A5, A6, §4.

**D7. Built-ins: Gamma, Beta, incomplete and error functions.**
`digamma`, `gamma`, `lgamma`, `beta`, `lowergamma`, `uppergamma`,
`lowergammareg`, `uppergammareg`, `erf`, `erfc`, `incbeta`, `incbetareg`.
*Sections:* `docs/functions.md#(top)` bullets 11–16; `devdocs/builtins.md#The
Gamma and Beta families`, `#Not in this design`; `devdocs/cost.md#What the
costs come from` (for the qualitative cost notes only). *Modules:*
`builtins/{gamma,beta,incomplete,erf,incbeta}.ts` (signatures, exact
cases, domains, refusals; not `fixed-*.ts`). *Output:* entries; the
decision on cost sentences (§12, question 9). *Context:* A5, §4.

**D8. Existing foundation-level content in docs/ to dissolve.**
*Sections:* `docs/functions.md#Very large results and approx`;
`docs/settings.md#How a number is held…` and the two tail paragraphs of
`#(top)` (notes and relations); `docs/definitions.md#Functions` (last
paragraph: cost and precision of calls). *Modules:* none new; cross-check
against A2/A5 findings. *Output:* for each paragraph, its destination in
`numbers.md` or `quantities.md` (§7) or devdocs, and the sentence that
replaces it where it stands. *Context:* A2, A5, §6.1, §9.1.

**D9. The index, the intro and the app's surface.** *Sections:*
`docs/README.md`; root `README.md#(top)`; `docs/settings.md#(top)` (first
paragraph and "Tapping the build number…"); `devdocs/architecture.md#UI`,
`#The shell and its parts`, `#The converter and its lines` (what the user
sees); `devdocs/offline.md#Offline behavior` (user-facing statuses).
*Modules (list only, to name the surface):* `src/unit-converter.ts`,
`copy-button.ts`, `app-footer.ts`, `register-service-worker.ts`,
`service-worker-updates.ts`, `settings-button.ts`. *Output:* the
getting-started skeleton's facts and the decision on `app.md` (§12,
question 3). *Context:* A8, §7.

### 10.c devdocs/ units (each with the docs sections and claims it touches as read-only context)

**V1. `devdocs/numbers.md`.** All sections. *Modules:* those of A1–A6 (the
unit re-reads only where the page's statements were not covered by an A
unit: `#The kernel's boundary`, `#Memoized constants`, `#Roots and
powers`, `#Failures`). *Context:* claims N1–N25 with A1–A6 findings;
`docs/settings.md#How a number is held…`, `docs/functions.md#Very large
results and approx` (to be replaced by links to `numbers.md`); §9.1, §9.4
rows for this page. *Output:* which passages become links to docs, which
stay as mechanism, which are marked historical.

**V2. `devdocs/architecture.md`.** All sections. *Modules:* those of A7–A9
and D1 (`pipeline.ts`, `evaluate.ts`, `convert.ts`, `table.ts`,
`build.ts`, `expr.ts`, `parser.ts`, `print.ts`; the UI modules by header
only). *Context:* claims Q1–Q19; `docs/definitions.md#Expressions`,
`#Names`, `#Unit lists`; §9.1 (precedence, lists, calls duplication), §9.4
(the pipeline diagram). *Output:* the pared "Expressions", "Definitions",
"Unit lists" sections that link to the references; the UI sections
checked against `app.md`'s decision.

**V3. `devdocs/builtins.md`.** All sections. *Modules:* `builtin.ts`,
`builtins.ts`, `builtins/*.ts` (as in D5–D7), `fixed-*.ts` by header only.
*Context:* D5–D7 entries; claims N6, N15, N21, N22, Q5, Q8; §9.1 (angle
rules, cost figures). *Output:* the user-rule passages replaced by links
to `functions.md` entries; the algorithms, bounds and measurements kept.

**V4. `devdocs/functions.md`.** All sections. *Modules:* `definitions.ts`,
`build.ts`, `dimension-of.ts`, `evaluate.ts`, `pipeline.ts`, `outcome.ts`
(as in D2 and A6/A8). *Context:* D2 output; claims N14–N16, Q3, Q5, Q16;
`docs/definitions.md#Functions`; §9.1 (triplicated cost paragraph), §9.4
(the unworded rejection). *Output:* `#Calls`, `#Display`, `#Conditions`
reduced to links plus mechanism; "Deferred" and "Alternatives
considered" kept as record.

**V5. `devdocs/notation.md` and `devdocs/settings.md`.** All sections.
*Modules:* `display.ts`, `outcome.ts`, `settings.ts`, `settings-lines.ts`,
`settings-panel.ts`, `limits.ts`, `app-shell.ts` (headers). *Context:* D4
output; claims N11, N13, N19; `docs/settings.md`; §9.1 (representation,
the sheet), §9.4 (`ABOUT`, "six settings"). *Output:* `#The model`
rewritten to build on `numbers.md` and `settings.md`; the storage,
probe, sheet and controls kept as design.

**V6. `devdocs/future.md` and `devdocs/cost.md`.** All sections. *Modules:*
`bench/stress/*` by header; `pipeline.ts` (`PassObserver`). *Context:*
claims N7, N25; `docs/functions.md` cost sentences; §9.4 (stale counts in
cost.md's prose). *Output:* the prose of cost.md reconciled with its
tables or dated; future.md's "Extensions that fit" checked against the
issue list in both corpora.

**V7. `devdocs/layout.md`, `devdocs/testing.md`, `devdocs/benchmarks.md`.** All
sections. *Modules:* the tree (§11) against `layout.md#The modules`; test
and bench files by name. *Context:* §11; no docs dependency. *Output:*
the module table reconciled with the tree (e.g. `exact.test.ts` listed
among modules; `fixed-incbeta.ts` without a test), and the
"what a test may depend on" claims checked against the settings' hard
bounds (A5).

**V8. `devdocs/README.md`, `devdocs/development.md`, `devdocs/offline.md`,
`devdocs/deployment.md`, `devdocs/security.md`.** All sections. *Modules:*
`scripts/*`, `.claude/*`, `vite-plugin-*.ts`, `src/sw.ts`,
`src/register-service-worker.ts`, `src/service-worker-updates.ts`,
`wrangler.jsonc`, `package.json`, `pnpm-workspace.yaml` (headers and
settings only). *Context:* D9 output; `docs/README.md`;
`docs/settings.md#(top)` update paragraph; §12 question 1 (the README's
self-description). *Output:* `devdocs/README.md`'s page list and framing
revised to the new docs/ outline; the user-facing update/offline facts
moved to `app.md` or getting started with links back.

---

## 11. User-facing surface files (from the tree; not read)

For later mechanical coverage checks. No grammar file (`.peg`, `.ebnf`,
`.y`, `.pegjs`, `.ohm` or similar) exists anywhere in the tree.

**Expression language parser and grammar**
- `src/core/expr.ts` — `Expr`, `parseExpr`, `parseUnitList`, `Rejection`;
  the grammar's levels and binary operators as data (`LEVELS`, `BINARY`).
- `src/core/parser.ts` — the parser combinators both grammars are built
  from.
- `src/core/print.ts` — the printer (canonical text; the inverse of
  `parseExpr`).
- `src/core/span.ts` — spans.
- Semantics the reference must match: `src/core/evaluate.ts`,
  `src/core/pipeline.ts` (how the `want` is read), `src/core/table.ts`
  (name and function resolution), `src/core/names.ts`.
- Tests that encode the grammar: `src/core/expr.test.ts`,
  `src/core/parser.test.ts`, `src/core/print.test.ts`,
  `src/testing/expr.ts`.

**Definition language parser and grammar**
- `src/core/definitions.ts` — `Definition`, `parseDefinitions`, the head
  grammar, the rejections.
- Semantics: `src/core/build.ts`, `src/core/graph.ts`,
  `src/core/names.ts`, `src/core/name-index.ts`, `src/core/table.ts`,
  `src/core/dimension-of.ts`, `src/core/evaluate.ts` (`applyFunction`,
  `invertFunction`, `checkConditions`).
- Tests: `src/core/definitions.test.ts`, `src/core/build.test.ts`,
  `src/units.test.ts`.

**Built-in function registry**
- `src/core/builtins.ts` — `BUILTINS`, the map by name.
- `src/core/builtin.ts` — the `Builtin` type (name, arity range,
  dimension rule, function), error types, rule helpers.
- `src/core/builtins/abs.ts`, `approx.ts`, `beta.ts`, `division.ts`,
  `erf.ts`, `exp.ts`, `gamma.ts`, `hyperbolic.ts`, `incbeta.ts`,
  `incomplete.ts`, `integers.ts`, `inverse-trig.ts`, `log.ts`, `pi.ts`,
  `pow.ts`, `roots.ts`, `round.ts`, `trig.ts` (18 modules, one function
  or family each; each with a `*.test.ts` beside it).
- `src/core/builtins/exact.test.ts` — the exact functions through the
  pipeline in every mode.
- `src/core/edges.sweep.ts` — enumerates `BUILTINS` by arity (a second
  source for the completeness check).

**Unit definitions**
- `src/units.txt` — the system definitions file (units, prefixes,
  primitives, lists, functions and inverses).
- `src/units.test.ts` — builds the file and checks the list of lists.
- `src/system-table.ts`, `src/system-build.ts` — loading and building.

**Settings**
- `src/settings.ts` — `Settings`, `ModeSetting`, `Notation`, `Working`,
  defaults, ranges (`rangesOf`), clamps, refusals, storage and
  migrations, `contextOf`, `ratioOf`.
- `src/settings-lines.ts` — every line, label, refusal and proposal text
  the sheet shows.
- `src/settings-panel.ts` — the controls.
- `src/limits.ts` — the probe (`recommendLimits`).
- `src/core/context.ts` — `NumberContext`, `ceilingFor`, the defaults.
- `src/core/rounding.ts` — `RoundingMode`, `ROUNDING_MODES`.
- `src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`,
  `MIN_SIGNIFICAND_LIMIT_BITS`), `src/core/scaled.ts` (`MAX_EXPONENT`) —
  the hard bounds the ranges quote.

**Messages and output (for an error and line catalogue)**
- `src/messages.ts` — every error as a sentence.
- `src/core/display.ts` — the kinds and notes.
- `src/outcome.ts` — the lines, the reciprocal, the warnings.

---

## 12. Open questions

Each with a proposed answer, none decided.

1. **What counts as the "historical record" in devdocs/?** The prompt
   treats `devdocs/` as a deliberate record of design intent and says
   nothing in it will be discarded; `devdocs/README.md` says the pages are
   current-state and that git holds the history, and the 2026-10-08
   pare deleted fourteen design notes and four plans (listed at the top).
   *Proposed:* keep the current pages as the record; do not resurrect
   the deleted notes; add a short `devdocs/history.md` index naming the
   deleted notes with their last paths and the commits (54aec25,
   270b471) so the record is reachable; mark every "earlier version"
   passage in the current pages as history inline rather than cutting
   it; drop the sentence "not a history" from `devdocs/README.md` or
   reword it to "current state, with the history of each decision kept
   where it is".
2. **Which framing leads docs/: unit converter or calculator?** The root
   and docs READMEs open with "converts units, in the spirit of GNU
   units"; `devdocs/architecture.md` opens with "grown into an
   arbitrary-precision calculator"; the prompt says calculator.
   *Proposed:* "an exact, unit-aware calculator whose primary interaction
   is a conversion", GNU units named once in getting started and in one
   "Differences from GNU units" appendix there; the eight-digit default
   keeps its "as GNU units shows" note in the settings reference.
3. **Where do the interface facts live?** The two fields, the lines, the
   copy button, the settings sheet's mechanics, installation, offline
   use and updates have no page in the target. *Proposed:* reading
   results goes into the foundation pages (it is semantics); the rest
   into one short `docs/app.md` guide page, or into getting started if
   it stays under a screen.
4. **Should the system units catalogue be its own page?**
   `docs/definitions.md#What the file contains` is a catalogue inside a
   language reference. *Proposed:* yes, `docs/units.md`, checked
   mechanically against `src/units.txt` (every unit, prefix, list and
   function name present), with the language page linking to it.
5. **How much representation may the settings reference show?** The
   significand limit is in bits and the precision limit in digits, which
   cannot be explained without saying what a significand and a grid
   are; the ownership rule allows naming the representation at a high
   level. *Proposed:* `numbers.md` says "a fraction times a power of ten,
   with an error radius" and "approximate values are kept to a number of
   digits"; `settings.md` explains each limit in one paragraph in those
   terms ("the size of an exact value, in bits of its numerator and
   denominator"; "the most digits an approximate value may be computed
   to"); grids, bits-per-digit, the 2,453 derivation and the dyadic
   cost stay in devdocs with a link.
6. **An error-message catalogue in docs/?** Messages are quoted all over
   both corpora and `src/messages.ts` has no page. *Proposed:* an
   appendix to `expressions.md` listing each message family with the rule
   it enforces and the page that owns the rule, generated or checked
   from `messages.ts`; internal kind names never appear in docs.
7. **Chronology inside devdocs/.** Given the three-day history and the
   pare, is "which passage is current" to be decided from the text
   alone? *Proposed:* yes; the current pages are authoritative, the
   narrated predecessors are marked historical, and git is cited only in
   `devdocs/history.md`.
8. **"certain" vs "certified".** The notes say "8 of 12 digits are
   certain"; devdocs say "certified" 100+ times; docs mix both.
   *Proposed:* "certified" as the concept in both corpora, the note text
   unchanged; alternatively rename the concept "certain digits" in docs
   only, which costs a mapping sentence in devdocs.
9. **Cost figures in docs/.** `docs/functions.md` gives timings for the
   Gamma family that disagree with devdocs and depend on the machine.
   *Proposed:* docs state qualitative cost rules only (expressions that
   never certify run to the ceiling; the first Gamma call at a new
   precision pays for the Bernoulli numbers); every number stays in
   `devdocs/cost.md` and `devdocs/builtins.md`.
10. **Who owns the exponent-bound explanation and the pass table?**
    Duplicated today (§9.1). *Proposed:* `numbers.md` (docs) owns the
    rule, the thresholds (`2.3026e18`) and the log-space advice with one
    example; `devdocs/numbers.md` owns the table and the measurements;
    `docs/functions.md#Very large results and approx` is dissolved.
11. **Does the parser accept `×`, `≤`, `≥` or `#` in the fields?** The
    screen writes `×` and the copy text `*`; conditions accept `≤`/`≥`;
    comments are a file feature. Nothing states what the two fields
    accept. *Proposed:* decide from `expr.ts` in D1 and state it in the
    grammar; if `×` is not accepted, say so beside the copy button's
    behaviour.
12. **Are user definitions documented as a feature?** Only the system
    file exists (#132). *Proposed:* the definition reference documents
    the language as the file's, with one sentence that typed definitions
    are not yet available; "Adding a unit" stays a contributor task in
    `devdocs/development.md`.
13. **Which page owns "conversion into a function"?** It is an output
    mode (quantities) and a consequence of inverses (definitions).
    *Proposed:* `quantities.md` owns what the answer is and when it
    exists; `definitions.md` owns writing an inverse and what is checked;
    `functions.md` says built-ins have none.
14. **`approx`: foundation or reference?** *Proposed:* both, with the
    foundation owning the concept (making a value inexact on purpose,
    never narrowing, identity in decimal mode) and the reference entry
    owning the signature and linking up.
15. **The width's name.** The panel's accessible label is "Ratio width";
    devdocs say "the notation's width". *Proposed:* "ratio width".
16. **How to count the settings.** "Six settings" with two nested
    sub-settings. *Proposed:* the reference has one entry per control
    (eight), and says the two nested ones belong to a mode.
17. **Generating part of the built-in reference.** *Proposed:* a script
    that imports `BUILTINS` and emits name, arity and dimension rule as a
    table, run in CI against the reference's headings; descriptions stay
    hand-written; adding a description field to `Builtin` is a source
    change to raise separately.
18. **Root `README.md` vs `docs/README.md`.** Identical intros.
    *Proposed:* the root README becomes three sentences and two links;
    `docs/README.md` is the user index.
19. **"Interval" for the temperature units.** Collides with the ball's
    interval. *Proposed:* "temperature difference" in docs.
20. **"Plain number" vs "dimensionless".** `architecture.md` calls kind
    primitives "dimensionless markers", so "dimensionless" there admits
    kinds. *Proposed:* "plain number" = no dimension and no kind, in
    both corpora; "dimensionless" in devdocs only for the empty vector.
21. **Getting started's scope.** Conversions only, or the calculator too?
    *Proposed:* both, conversions first, about ten worked examples, each
    linking to its owner; no definitions of its own.
22. **Offline/PWA content.** Currently in `docs/README.md`'s intro.
    *Proposed:* in `app.md` (question 3) with one line in the index.
23. **The probe's description in docs.** "the costliest built-ins" vs
    devdocs' elementary composite. *Proposed:* docs say "a composite of
    the elementary functions at the candidate ceiling, deliberately not
    the costlier special functions", citing the rationale's location.
24. **Devdocs re-explaining user semantics.** The ownership rule says
    devdocs link to docs for user-level semantics; today every topical
    page restates them. How far to cut? *Proposed:* each devdocs section
    opens with one sentence and a link to the owning docs section, then
    mechanism and rationale only; rules restated for the sake of a
    rationale are quoted in one line, not re-derived.
