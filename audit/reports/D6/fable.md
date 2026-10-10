# Unit D6: Built-ins: `approx`, magnitude, rounding, division and integers (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session's `session_context.model`; `last_served_model` the same)
- Doc sections read: `docs/functions.md#(top)` bullets 7 to 10 (lines 23 to 49; the rest of `#(top)` only to locate them); `devdocs/builtins.md#The exact functions` (lines 496 to 616); `devdocs/numbers.md#approx` (lines 1448 to 1527)
- Modules read: `src/core/builtins/approx.ts`, `src/core/builtins/abs.ts`, `src/core/builtins/round.ts`, `src/core/builtins/division.ts`, `src/core/builtins/integers.ts`, `src/core/builtins/exact.test.ts`
- Also read: `src/core/builtin.ts` in full (the rule helpers, `BuiltinError`, `tooLarge`, `sideOfZero`, `unresolvedAt`); `src/core/ball.ts` (`widened`, `position`); `src/core/scaled.ts` (`trunc`, `toRational`, `bitsOfTens`, `decimalDigits`, `isRefusal`, `BITS_PER_DIGIT`); `src/core/rational.ts` (`gcd`, `trailingZeros`, the head of `lehmer`, `Reach`, `Need`, `boundOf`, `MAX_SIGNIFICAND_LIMIT_BITS`); `src/core/rounding.ts` in full; `src/core/evaluate.ts` (the header on settling, lines 108 to 132, and the built-in call node, lines 824 to 868); `src/messages.ts` (the domain reasons, `factorialRemedy`, the `unresolved` and `tooLarge` wording); `src/core/context.ts` (`workingDigits`); `src/core/builtins/integers.test.ts` and `src/core/rational.test.ts` (their `gcd` assertions only, by search); the issue-link definitions at the foot of `devdocs/numbers.md` and `devdocs/builtins.md`; `src/core/builtins.ts` and `src/units.txt` searched for the name `ceiling` only. The pages' examples were run through `evaluateText` from a scratch script outside the tree, as `exact.test.ts` runs them, at eight digits and the default settings; `exact.test.ts` and `integers.test.ts` pass.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 9 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 3 / 1 / 0 |
| Gaps confirmed / refuted / new | 8 / 0 / 7 |
| Proposed edits | 14 (in 3 sections) |
| Questions for the owner | 9 |

## Claims

None assigned. The context claims these modules bear on (A4: N17; A5: N3's `approx` part, N21, N22, N23; A6: N14, N15; and N11 and Q5, whose sources include these pages) are checked below as evidence for those units. No claim is rewritten here; the two places where the code departs from a claim's rule are findings (C1, C2 below), not corrections.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N3, the `approx` part | confirmed | `src/core/builtins/approx.ts:29-34` (`approxBall` is `widened`); `src/core/ball.ts:1158-1163`; harness: `approx(2)` is `≈ 2` with a radius of one unit in the last working digit, `approx(0)` and `approx(2 - 2)` stay `= 0` | `approx` is the one built-in that makes an exact value inexact in exact mode, and it leaves a zero alone. |
| N11, the `round` part | confirmed | `src/core/builtins/round.ts:13-18`, `src/core/builtins/round.ts:309` (`context.rounding`); `src/core/builtins/exact.test.ts:61-62`; harness: `round(2.5)` is `2`, `3`, `2`, `2`, `3`, `3`, `2` across the seven modes in the order of `ROUNDING_MODES`, and `round(1234, -2)` is `1300` under `awayFromZero` and `ceiling` | `round(x[, places])` is the one exact-function call that reads the rounding mode; `floor`, `ceil`, `trunc`, `div` and `mod` give the same value in every mode (harness). The directed-mode display part is A2's: the harness shows `approx(2)` under `ceiling` or `floor` as the *partial* kind. |
| N14, touching counts as straddling, as the exact functions apply it | confirmed | `src/core/ball.ts:362-392` (`position` answers `touchingAbove` or `touchingBelow` for a ball with one end on the point); `src/core/builtins/round.ts:193-194` (anything but `above` or `below` is `unresolved`); `src/core/builtin.ts:363-376` (`sideOfZero` maps a touch to `straddles`); harness: `round(0.5 + sqrt(2) - sqrt(2))` is undecided at `0.5`, `sign(sqrt(2) - sqrt(2))` at zero | A ball that touches a cell boundary or zero is undecided, as the claim says. |
| N15, the edges of `floor` and `round`, zero for `sign` and `div`, and that an exact case decides | confirmed | `src/core/builtins/round.ts:181-196` (`isExact` gives the exact result; a boundary touched or crossed gives `unresolvedAt`); `src/core/builtins/division.ts:64-92`; `src/core/builtins/exact.test.ts:101-108`; harness: `floor(2)` is `= 2`, `floor(sqrt(2))` is `= 1`, `floor(sqrt(2)^2)` reads `cannot be told from 2 at this precision, and the result depends on which side of 2 it lies`, `div(8 + sqrt(2) - sqrt(2), 2)` names `8` | The message wording holds. The retries before the ceiling are `pipeline.ts`'s, A6's to read; the harness sees only the refusal at the ceiling. |
| N17, `approx` the identity and a call rounded once | confirmed | `src/core/builtins/approx.ts:41` (`decimal: "identity"`); `src/core/evaluate.ts:838-850`; `src/core/builtins/exact.test.ts:137`; harness in decimal mode: `approx(sqrt(2))` is `= 1.4142136`, `factorial(20)` is `= 2.432902e+18`, `binomial(1e400, 2)` is `= 5e+799` | In decimal mode `factorial(approx(5))` is `= 120`, `approx` being the identity there; bullet 10 of `docs/functions.md` says "refused" without naming the mode. |
| N21, the `factorial` part: predicted, refused with reach `exceeds`, no suggestion | confirmed | `src/core/builtins/integers.ts:107-116`, `src/core/builtins/integers.ts:87-89` (`pastLimit`), `src/core/builtins/integers.ts:73-78` (`log2Factorial`); `src/core/builtins/exact.test.ts:97-100`; harness: `factorial(5000)` is a value, `factorial(20000)` reads `would need a significand of about 256,909 bits, past the significand limit, however it is computed`, the same in decimal mode | In these five modules every refusal is `tooLarge` with reach `exceeds` and a need that is a Stirling bound, a digit-count bound (`boundOf(bitsOfTens(digits))`, `src/core/builtins/round.ts:149`) or `unknown` (`UNKNOWN_NEED`); none carries `fits`. One of them should: finding C2. |
| N22, as `div` and `mod` meet the bound | confirmed | `src/core/builtins/division.ts:69-82`, `src/core/builtins/division.ts:122-123`; harness: `div(1e999999999999999999, 1e-999999999999999999)` reads `is too large to compute: its exponent would pass 10^18`, `mod` of the same pair is `tooLarge`, `div(-1e-999999999999999999, 30)` is `= -1`, `mod(1e-999999999999999999, 30)` is the dividend | A quotient below the bottom of the bound has a floor by the signs, as the page says. |
| N23 | confirmed | `src/core/ball.ts:1158-1163` (`maxRadius(b.rad, unit)`, the unit one in the last of `workingDigits`); `src/core/context.ts:144-146`; `src/core/builtin.ts:289-290` (`sameAsArgument`); harness: `approx(approx(2))` has `approx(2)`'s radius, `approx(sqrt(2) - sqrt(2))` keeps the argument's radius about a zero midpoint, `approx(30 deg)/deg` is `≈ 30`, `approx(1e999999999) + 1` is `≈ 1e+999999999` where `1e999999999 + 1` is refused, `approx(2)^100000` is a value where `2^100000` is refused, `approx(1e999999999999999999) * 100` cannot be told from the exponent bound | "Zero passes through" holds for any zero midpoint, exact or not (`isZero(b.mid)`), as `devdocs/numbers.md#approx` says; the header comment of `approx.ts` says "an exact zero", which understates (question 9). |
| Q5, which functions take quantities, with `mod`'s dimension (§1.2.6 item 5) | confirmed | `src/core/builtins/round.ts:323`, `src/core/builtins/round.ts:348-353` (`plainNumbers`; both arguments of `round` dimensionless); `src/core/builtins/integers.ts:189`; `src/core/builtins/abs.ts:49`, `src/core/builtins/abs.ts:56` (`sameAsArgument`, `anyToNumber`); `src/core/builtins/division.ts:157`, `src/core/builtins/division.ts:164` (`conformingArguments("number")`, `conformingArguments("first")`); `src/core/builtins/approx.ts:39`; harness: `floor(3.7 ft)` and `gcd(6 m, 4 m)` refused as plain-number arguments, `round(3.7, 1 m)` names "the second argument", `mod(-30 deg, 360 deg)` has the radian kind, `mod(30 deg, 1)` is a kind mismatch | `mod` returns the arguments' dimension, kinds included; `div` a plain number. |

## Stale passages

No row of §1.1.5 or §9.4 falls within this unit's three sections: the rows for `devdocs/numbers.md`, `devdocs/builtins.md` and `docs/functions.md#(top)` name other sections, which belong to D5, D7, V1 and V3. Found:

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/builtins.md#The exact functions` (lines 519 to 520) | "Rounding to significant digits is [#98][98]." (a reference-style link, outside the Markdown subset) | update | "Rounding to significant digits is [#98](https://github.com/bsidhom/exucal/issues/98)." The definition at the foot of the page goes once every section's link is inline (V3). |
| `devdocs/numbers.md#approx` (lines 1510, 1527) | "is [#100][100]" and "under study in [#171][171]" (reference-style links) | update | "is [#100](https://github.com/bsidhom/exucal/issues/100)" and "under study in [#171](https://github.com/bsidhom/exucal/issues/171)". The definitions at the foot of the page go once every section's link is inline (V1). |
| `devdocs/numbers.md#approx` (line 1525) | "Significant-figure propagation then needs no new machinery ([#98][98])", the second place the issue is linked from (§12, question 26) | update | "Significant-figure propagation then needs no new machinery, the rounding to significant digits that `round` lacks ([the exact functions](builtins.md#the-exact-functions)) included." The issue stays linked from the `round` passage alone. |
| `devdocs/numbers.md#approx` (lines 1499 to 1501) | "a postfix `~` on a literal (`2.54~`), terse and the likely spelling of `approx(x)` later, but it needs grammar, applies to literals alone, and has no binary form" | keep as intent | "a postfix `~` on a literal (`2.54~`), terse, and the natural short spelling of `approx(x)` if one is ever wanted, but it needs grammar, applies to literals alone, and has no binary form" |

## Findings

### The family-level rules, verified

1. **Exact on exact arguments, in every mode.** All thirteen functions give the same exact value in each of the seven rounding modes and in decimal mode, `round` aside, which reads the mode by design (harness tables for `floor(-3.7)`, `ceil(-3.7)`, `trunc(-3.7)`, `mod(-7, 2)`, `div(-7, 2)`; `src/core/builtins/exact.test.ts:129-139`).
2. **Dimension rules.** As the Q5 row says. The messages name the argument's place ("the second argument of `round`", `src/core/builtin.ts:266-281`).
3. **The cells.** `floor` decides a ball against the cell from its result to the next integer, `ceil` the cell below, `trunc` the cell on the result's side of zero and the open cell between minus one and one at zero; `round` against half a unit either side for the three modes to nearest, one unit on the side the mode rounds from for `ceiling` and `floor`, both sides at zero for `towardZero`, and the point itself at zero for `awayFromZero` (`src/core/builtins/round.ts:211-301`). The consequence, all seen in the harness: a value that cannot be told from zero is `= 0` under `trunc`, under `round` in a mode to nearest and under `towardZero`, and undecided under `floor`, `ceil`, `sign`, and under `round` in `awayFromZero`, `ceiling` and `floor`. Neither corpus states this; it is a user-visible rule.
4. **`div` and `mod`.** One quotient serves both (`src/core/builtins/division.ts:64-92`); the identity `a = b × div(a, b) + mod(a, b)` holds through the arithmetic for exact and inexact arguments (`= 0`, or `≈ 0` for an inexact pair); the remainder's sign is the divisor's; the Boute paragraph and the three reasons for the floored pair are rationale and stay. The undecided edge of `div` is named in the dividend's terms, the quotient's boundary times the divisor (`src/core/builtins/division.ts:88-91`): `div(8 + sqrt(2) - sqrt(2), 2)` "cannot be told from 8".
5. **`round(x, places)`.** `places` is an exact integer formed within the significand limit (`src/core/builtins/integers.ts:35-53`; `round(2.5, 1e20000)` is `tooLarge`); the count of units is held to the limit too (`src/core/builtins/round.ts:146-150`): `round(1/3, 20000)` is `tooLarge` and `round(1/3, 19000)` is a value, which the page does not say; a value below a tenth of the unit forms no power of ten (`round(1e-999999999, 2)` is `0`, or `0.01` under `awayFromZero` and `ceiling`, `src/core/builtins/round.ts:112-123`).
6. **The integer functions.** `gcd(0, 0)` is `0`, `gcd(0, 5)` is `5`, `lcm(5, 0)` is `0`, `gcd(-6, 4)` is `2`, `lcm(-6, 4)` is `12`; `binomial` is zero outside `0..n`; `doublefactorial(-1)` and `doublefactorial(0)` are `1`; the prediction is Stirling's formula with its first correction, three terms for `binomial`, the power form past a double's exactness (`src/core/builtins/integers.ts:66-78`, `src/core/builtins/integers.ts:129-133`, `src/core/builtins/integers.ts:161-166`), and `binomial(1e400, 2)` is the value it is; the refusal applies in decimal mode too. Two constants are mechanism the page does not mention: past `FACTORIAL_LIMIT` (one million, `src/core/builtins/integers.ts:92`) and for `binomial`'s smaller index past it, the need is `unknown` and the message names no count (`doublefactorial(2000001)`, `factorial(1e400)` read "would need a significand, past the significand limit, however it is computed"); `STIRLING_LIMIT` (2^52, `src/core/builtins/integers.ts:141`) is where the prediction changes form. But `gcd(a, 0)` is wrong for `a` above one: finding C1.
7. **`approx`.** As the N23 row says; and a definitions-file body may call it: a table built from `src/units.txt` plus the line `Gtest approx(6.674e-11) N m^2 / kg^2` converts `Gtest` into `N m^2 / kg^2` as `≈ 6.674e-11`, and as `= 6.674e-11` in decimal mode.

### Inaccuracies in the pages

- **I1.** `devdocs/builtins.md#The exact functions`, lines 498 to 502: "on an inexact argument is either exact where the argument's interval decides the answer or `unresolved` where it does not" is false for `abs` and `mod`, which return inexact results (`src/core/builtins/abs.ts:25-27`; `src/core/builtins/division.ts:148-151`; harness: `abs(-sqrt(2))` is `≈ 1.4142136`, `mod(7 + sqrt(2) - sqrt(2), 2)` is `≈ 1` with a radius), and for the five integer functions, where an inexact argument is a `domain` error (`src/core/builtins/integers.ts:40-42`). The second sentence reads as if all thirteen keep the dimension.
- **I2.** Same section, lines 517 to 519: "two of the modes' names, `floor` and `ceiling`, are functions". Only `floor` is; the function is `ceil` (`ceiling(2.5)` reads `Unknown function "ceiling"`; `src/core/rounding.ts:80`; no such name in `src/core/builtins.ts` or `src/units.txt`).
- **I3.** Same section, lines 594 to 596: "The refusals of a value `factorial` does not take point at `gamma(x + 1)`, and `binomial`'s at …". Only the `notInteger` and `notExact` errors carry the pointer (`src/messages.ts:241-244`, `src/messages.ts:267-277`); the `negative` error does not (`src/messages.ts:245-248`; harness: `factorial(-1)`, `binomial(-1, 0)`), rightly, since `gamma(x + 1)` has a pole at a negative integer and `n + 1` is zero at `n = -1`. These are `domain` errors, not refusals (§8).
- **I4.** Same section, lines 613 to 615: "`div`, `mod` and the rounding functions nothing larger than their arguments". `round(1/3, 19000)` is a value of nineteen thousand digits and so is `mod(-1, 1e19000)`; both are held to the limit by their arithmetic, not by their arguments' size (`src/core/builtins/round.ts:146-150`; `src/core/builtins/division.ts:130-146`).
- **I5.** Same section, lines 585 to 587: "a remainder whose alignment passes the significand limit (`mod(-1, 1e20000)`) is `tooLarge`, as any exact sum's is". The kind is the same; the message is not: a sum's refusal carries reach `fits`, a count and a remedy, `mod`'s carries `exceeds` and no count (`src/core/builtins/division.ts:136`, `src/core/builtins/division.ts:146`), although `mod(approx(-1), 1e20000)` is `≈ 1e+20000`. Finding C2.
- **I6.** `devdocs/numbers.md#approx`, lines 1473 to 1474: "`approx` can turn a value into a refusal and never the reverse". It turns `1e999999999 + 1`, a refusal, into `≈ 1e+999999999`, which `#The significand limit` and N4 call its purpose. The sentence means that it never casts a value to exact or raises its precision, which is what the paragraph argues.
- **I7.** `docs/functions.md#(top)`: bullets 7 and 8 say "units" for a quantity's dimension (Q5: a quantity carries no unit of its own); bullet 10 says "known to a precision" for inexact and "refused" for a `domain` error (§8), and "`factorial(approx(5))` is refused" holds in exact mode only (N17 row).

### Code findings, reported and not changed

- **C1. `gcd(a, 0)` is wrong for every `a` above one.** Through the pipeline `gcd(5, 0)` is `= 2`, `gcd(7, 0)` is `= 3`, `gcd(100, 0)` is `= 12`, `gcd(2, 0)` is `= 0`, `gcd(1000000007, 0)` is `500000003`, while `gcd(0, 5)` is `= 5`, `gcd(0, 0)` is `= 0` and `gcd(1, 0)` is `= 1`; `gcdOfIntegers` alone gives the same values. Cause: `src/core/builtins/integers.ts:56-58` calls `gcd(abs(a), abs(b))` of `src/core/rational.ts:515-521`, whose contract (`src/core/rational.ts:507-514`) is "the non-negative `a` and the positive `b`"; that function special-cases a zero `a` and not a zero `b`, `trailingZeros(0n)` (`src/core/rational.ts:503-505`) is minus one, and the final shift by the smaller count becomes a right shift by one of `a`'s odd part. The page states the intent correctly ("`gcd(a, 0)` is the magnitude of `a`"); no test covers a zero second argument (`src/core/builtins/exact.test.ts:70` has `gcd(-6, 4)` only; `integers.test.ts` and `rational.test.ts` searched). Question 1.
- **C2. `mod`'s alignment refusal carries the wrong reach.** `mod(-1, 1e20000)` reads "would need a significand, past the significand limit, however it is computed", yet `mod(approx(-1), 1e20000)`, `mod(-1, approx(1e20000))` and `mod(approx(-1), approx(1e20000))` are each `≈ 1e+20000`. By the reach rule (`src/core/rational.ts:60-66`; N21) the refusal should carry `fits` with the alignment's need, so that the message offers `approx` and decimal mode as a sum's does (`1e999999999 + 1` shows that wording). The quotient-overflow case (`src/core/builtins/division.ts:122-123`) is rightly `exceeds`, since `approx` never relaxes the exponent bound. Question 2.
- **C3. The wording for `round`'s second argument.** `round(2.5, 1.5)` reads `Cannot compute "round(2.5, 1.5)": "1.5" is not a whole number, and "round" is defined only for whole numbers.`, and `round(2.5, approx(2))` says `"round" needs a whole number known exactly`; both are worded for a function of integers (`src/messages.ts:241-244`), which `round` is not in its first argument (`src/core/builtins/round.ts:356` reuses `integerOf` for the places). Question 3.

### The gaps of §6

Confirmed, with what the code adds:

- **§6.1, comparison and equality where they surface** (the rounding functions, `sign`, `div`, `mod`): confirmed; the "On balls" paragraph is the right source, and rule 3 above is the user-facing statement for `numbers.md`'s "Values at an edge".
- **§6.1, `approx` as a concept:** confirmed; `devdocs/numbers.md#approx` is the source and is accurate apart from I6. The decimal-mode identity and the zero pass-through belong to the concept, not to the entry.
- **§6.1, rounding modes and where the mode acts:** confirmed; the docs never say which way `round(2.5)` goes under the default (§1.1.3 lists it as an edge case users hit).
- **§6.1, the two size limits from the user's side:** confirmed for this family: the integer functions' refusals never offer `approx` or decimal mode and apply in both modes; `round(x, places)` and `mod` are refused when their results would pass the limit (I4).
- **§6.6, `round(x, places)`:** confirmed, with the count limit added (rule 5).
- **§6.6, `div` and `mod`, the sign convention and the `overflow`/`tooLarge` edges:** confirmed (rule 4, the N22 row, C2).
- **§6.6, `gcd(0, 0)`, `lcm(a, 0)`, `binomial` outside `0..n`, `doublefactorial(-1)`:** confirmed as absent from the docs; `gcd(a, 0)` is wrong in the code (C1).
- **§6.6, decimal-mode behaviour of each family:** confirmed; for this family every argument is exact, so no edge is ever undecided (`floor(sqrt(2)^2)` is `= 2`, `sign(sqrt(2) - sqrt(2))` is `= 0`, `div(1, sqrt(2) - sqrt(2))` is a division by zero), the result is rounded once to the display digits (`factorial(20)`), `approx` is the identity (`factorial(approx(5))` is `120`), and the size refusals are unchanged (`factorial(20000)`).

Refuted: none.

New:

- the count limit of `round(x, places)` (rule 5);
- which functions decide a value that cannot be told from zero and which do not (rule 3);
- `approx` of a zero midpoint of any radius is returned as it is (the N23 row; the docs do not say);
- `factorial(approx(5))` is `120` in decimal mode (the N17 row);
- the `negative` error carries no Gamma pointer (I3);
- `div`'s undecided edge is named in the dividend's terms (rule 4);
- past a million the integer functions' needs are unknown and the message names no count (rule 6).

All of these are entry-level facts for the generated reference (§4.1: exact cases, edges, decimal mode, related settings), not for hand-written entries (§4.4). Bullets 7, 8 and 10 of `docs/functions.md` need links to the foundation pages once they exist (§6.8): bullet 7 to `numbers.md`'s `approx` section, bullet 8's plain-number rule to `quantities.md`, bullet 10's "known exactly" to `numbers.md`'s exact and inexact values.

## Proposed edits

### docs/functions.md#(top)

Bullets 7, 8 and 10 as old → new pairs; bullet 9 stands as it is. The additions beyond terminology (the default's effect on `round(2.5)`, the decimal-mode identity, `sign` at zero) are marked so that question 5 can leave them out.

Bullet 7, old:

`approx(x)`, the value of `x` known to the working precision and no better: its argument is any quantity, its result has the argument's units, and it is the one way to make an exact value inexact on purpose, so `approx(2.54) cm` in `in` is `≈ 1` where `2.54 cm` in `in` is `= 1`. It never narrows a value that is already inexact.

Bullet 7, new:

`approx(x)`, the value of `x` known to the working precision and no better: its argument is any quantity, angles included, its result has the argument's dimension, and in exact mode it is the one way to make an exact value inexact on purpose, so `approx(2.54) cm` in `in` is `≈ 1` where `2.54 cm` in `in` is `= 1`. It never narrows a value that is already inexact and leaves a zero as it is; in decimal mode, where every value is already rounded, `approx(x)` is `x` (addition).

Bullet 8, old:

`abs`, `sign`, `floor`, `ceil`, `trunc` and `round`. `abs` keeps its argument's units and `sign` takes any quantity, giving `-1`, `0` or `1`. The other four take a plain number, since a quantity is stored in the base units and `floor(3.7 ft)` would floor the metres; write `floor(3.7 ft / ft) ft`. `round(x)` rounds to a whole number and `round(x, places)` to that many decimal places, in the Rounding setting's mode, a negative count rounding to the left of the point: `round(3.14159, 2)` is `3.14` and `round(1234, -2)` is `1200`. A value that cannot be told from a boundary (`floor(sqrt(2)^2)`, a hair from `2` at any precision) is reported as such rather than guessed.

Bullet 8, new:

`abs`, `sign`, `floor`, `ceil`, `trunc` and `round`. `abs` keeps its argument's dimension and `sign` takes any quantity, giving `-1`, `0` or `1`. The other four take a plain number, since a quantity is held in the primitives and `floor(3.7 ft)` would floor the metres; write `floor(3.7 ft / ft) ft`. `round(x)` rounds to a whole number and `round(x, places)` to that many decimal places, in the Rounding setting's mode, so `round(2.5)` is `2` under the default, to nearest with ties to even, and `3` under half away from zero (addition); a negative count rounds to the left of the point: `round(3.14159, 2)` is `3.14` and `round(1234, -2)` is `1200`. A value that cannot be told from a boundary (`floor(sqrt(2)^2)`, a hair from `2` at any precision; `sign` of a value that cannot be told from zero (addition)) is reported as such rather than guessed.

Bullet 10, old:

`gcd(a, b)` and `lcm(a, b)` of whole numbers, never negative; and `factorial(n)`, `binomial(n, k)` and `doublefactorial(n)` of whole numbers known exactly (`factorial(approx(5))` is refused, since a value known to a precision is not known to be `5`), refused past the significand limit before anything is computed: `factorial(5000)` is a value of 16,326 digits and `factorial(20000)`, with 77,338, is not (`gamma(20001)` gives it to the digits asked).

Bullet 10, new:

`gcd(a, b)` and `lcm(a, b)`, never negative, and `factorial(n)`, `binomial(n, k)` and `doublefactorial(n)`, all of whole numbers known exactly: `factorial(approx(5))` is an error in exact mode, since an inexact value is not known to be `5` (in decimal mode `approx` is the identity and it is `120`) (addition). The last three are refused past the significand limit before anything is computed: `factorial(5000)` is a value of 16,326 digits and `factorial(20000)`, with 77,338, is not (`gamma(20001)` gives it to the digits asked).

### devdocs/builtins.md#The exact functions

Old → new pairs, in the section's order.

(a) Lines 498 to 502, old:

Thirteen functions that need no precision: each is exact on exact arguments, and on an inexact argument is either exact where the argument's interval decides the answer or `unresolved` where it does not. They are the functions whose result keeps its argument's dimension (`abs`, `mod`), or takes any quantity (`sign`, `div`).

New:

Thirteen functions that are exact on exact arguments whatever the working precision. On an inexact argument, `sign`, `floor`, `ceil`, `trunc`, `round` and `div` are exact where the argument's interval decides the answer and `unresolved` where it does not; `abs` and `mod` carry the radius through, as the arithmetic does; and `gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial`, which take integers known exactly, refuse it as a `domain` error. Four of them take quantities: `abs` and `mod` return their argument's dimension, `sign` and `div` a plain number; the other nine take plain numbers (`#Dimension rules`).

(b) Lines 517 to 520, old:

There is no mode argument: the grammar has no strings, a bare name is a unit, and two of the modes' names, `floor` and `ceiling`, are functions. Rounding to significant digits is [#98][98].

New:

There is no mode argument: the grammar has no strings, a bare name is a unit, and one of the modes' names, `floor`, is a function (`ceiling` is a letter from `ceil`). Rounding to significant digits is [#98](https://github.com/bsidhom/exucal/issues/98).

(c) Lines 510 to 512, old:

`places` must be an exact integer, and one that cannot be formed within the significand limit (`round(x, 1e20000)`) is `tooLarge`.

New:

`places` must be an exact integer, and one that cannot be formed within the significand limit (`round(x, 1e20000)`) is `tooLarge`, as is a result whose count of units has more digits than the limit holds (`round(1/3, 20000)`, where `round(1/3, 19000)` is a value of nineteen thousand digits); a value below a tenth of the unit forms no power of ten, so `round(1e-999999999, 2)` is `0`, or one unit away from zero under a directed mode that rounds that way.

(d) Lines 577 to 579, old:

`div` and `mod` take one division between them: the quotient `q = a / b` is formed once, as a ball, `div` is its floor, and `mod` is `(q - floor(q)) × b` from the same quotient,

New:

`div` and `mod` take one division between them: the quotient `q = a / b` is formed once, as a ball, `div` is its floor, decided against the floor's cell with the boundary named in `a`'s terms, the quotient's boundary times `b`, so that `div(8 + sqrt(2) - sqrt(2), 2)` cannot be told from `8`, and `mod` is `(q - floor(q)) × b` from the same quotient,

(e) Lines 585 to 587, old:

a remainder whose alignment passes the significand limit (`mod(-1, 1e20000)`) is `tooLarge`, as any exact sum's is.

New, if question 2 is decided for the code change:

a remainder whose alignment passes the significand limit (`mod(-1, 1e20000)`) is `tooLarge`, as any exact sum's is, and with the same remedy offered, since an inexact operand settles it (`mod(approx(-1), 1e20000)` is a value).

New, if the code stays:

a remainder whose alignment passes the significand limit (`mod(-1, 1e20000)`) is `tooLarge`; unlike a sum's refusal it names no count and offers no remedy, though `approx` around either argument gives a value.

(f) Lines 594 to 596, old:

The refusals of a value `factorial` does not take point at `gamma(x + 1)`, and `binomial`'s at `1 / ((n + 1) beta(n - k + 1, k + 1))`.

New:

The errors for a non-integer or an inexact argument point at `gamma(x + 1)` for `factorial` and at `1 / ((n + 1) beta(n - k + 1, k + 1))` for `binomial`; the error for a negative integer does not, `gamma` having a pole there and `n + 1` being zero at `n = -1`.

(g) Lines 613 to 615, old:

`gcd` and `lcm` form nothing larger than their arguments' product, and `div`, `mod` and the rounding functions nothing larger than their arguments.

New:

Past a million the prediction is not evaluated, the need is `unknown`, and the message names no count. `gcd` and `lcm` form nothing larger than their arguments' product; `div`, `mod` and the rounding functions form their results through the exact arithmetic, which holds each to the significand limit as it holds any sum or product, so `round(1/3, 20000)` and `mod(-1, 1e20000)`, whose results would have twenty thousand digits, are `tooLarge`.

### devdocs/numbers.md#approx

(a) Lines 1473 to 1475, old:

`approx` can turn a value into a refusal and never the reverse. Its errors are none of its own, the dimension rule accepting any dimension.

New:

`approx` never turns an inexact value exact and never decides an edge: `factorial(approx(5))` is an error where `factorial(5)` is a value, and `1 / approx(sqrt(2) - sqrt(2))` is as undecided as `1 / (sqrt(2) - sqrt(2))`. What it does relax is the significand limit (`#The significand limit`): `approx(1e999999999) + 1` is `≈ 1e+999999999` where `1e999999999 + 1` is refused, since an inexact result is settled to the working precision rather than formed exactly. Its errors are none of its own, the dimension rule accepting any dimension.

(b) Lines 1510 and 1527: the inline links of the stale-passages table, first and second rows for this section.

(c) Line 1525: the `#98` sentence of the stale-passages table, third row.

(d) Lines 1499 to 1501: the `~` phrase of the stale-passages table, fourth row.

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "units" for a quantity's dimension ("its result has the argument's units", "`abs` keeps its argument's units") | `docs/functions.md#(top)` bullets 7, 8 | **dimension**; a quantity carries no unit of its own (Q5). |
| "known to a precision" for an inexact value | `docs/functions.md#(top)` bullet 10 | **inexact** (§8). |
| "refused" / "refusals" for a `domain` error ("`factorial(approx(5))` is refused"; "The refusals of a value `factorial` does not take") | `docs/functions.md#(top)` bullet 10; `devdocs/builtins.md#The exact functions` | **error**; "refusal" for the three size refusals only (§8). |
| "base units" ("a quantity is stored in the base units") | `docs/functions.md#(top)` bullet 8 | **primitives** (§8: "base unit" only when quoting the SI). |
| "half-way mode" ("a ball of a tie under a half-way mode") | `devdocs/builtins.md#The exact functions` | **a mode to nearest**, the term of `rounding.ts` and of the panel's labels; "tie" stays. |
| "F-division", "concordant" (Boute's terms) | `devdocs/builtins.md#The exact functions` | keep, devdocs-only, defined where used. |
| "count" for `div`'s result | both pages | keep; agrees with §8's "count" for unit lists and the recovered argument. |
| "whole number" (docs, messages) and "integer" (devdocs) | both pages | both as §8 maps them; the messages say "whole number". |
| "dimensionless" for `div`'s result (devdocs), "plain number" (docs) | both pages | both as §8 settles them. |

## Questions for the owner

1. **`gcd(a, 0)` (C1).** Proposed: `gcdOfIntegers` returns the magnitude of the other argument when one is zero (or `rational.ts`'s `gcd` is made total), with `gcd(5, 0)`, `gcd(0, 5)`, `gcd(0, 0)`, `gcd(-10, 0)` and `lcm(5, 0)` added to `src/core/builtins/integers.test.ts` and the first to `exact.test.ts`; the page stands.
2. **`mod`'s reach (C2).** Proposed: the two `tooLarge("exceeds", UNKNOWN_NEED)` of `modBall`'s exact path become `fits` with the need `subtract` or `multiply` report, and edit (e)'s first form applies; otherwise its second form.
3. **The wording for `round`'s second argument (C3).** Proposed: `src/messages.ts` words `notInteger` and `notExact` by the argument's place where the function's first argument need not be an integer, for example "the number of places of `round` must be a whole number"; a code change for the error catalogue (§12, question 6).
4. **The one place for #98.** Proposed: `devdocs/builtins.md#The exact functions`, the `round` passage; `devdocs/numbers.md#approx` mentions the concept without the link (stale-passages table, third row).
5. **Bullets 7 to 10 now or later.** §4.4 corrects `docs/functions.md` "only where §9.4 tags a stale passage"; the proposed bullets also align terminology (I7) and add three clauses marked "(addition)". Proposed: apply the terminology changes now under §8, which binds, and the additions too, since each states today's behaviour in one clause; the rest waits for the generated reference.
6. **The cell rule in the user docs.** Proposed: one sentence in `numbers.md`'s "Values at an edge" (A6, V1) saying that `trunc`, and `round` in a mode to nearest, decide a value that cannot be told from zero as `0`, while `floor`, `ceil` and `sign` do not.
7. **D5's territory.** The tail paragraph of `docs/functions.md#(top)` (line 115), "Every built-in takes plain numbers, apart from the angles above", is contradicted by `approx`, `abs`, `sign`, `div` and `mod`; proposed: "apart from the angles above and the functions of bullets 7 to 9, which take quantities".
8. **A2's territory.** `approx(2)` under `ceiling` or `floor` shows the *partial* kind (`≈ 2`, no digit certified), so N10's partial kind is reachable today (§1.1.6, item 13); proposed: recorded for A2's finding.
9. **§4's structured comments.** The header of `src/core/builtins/approx.ts` says an exact zero is returned as it is, where `widened` returns any zero midpoint and `devdocs/numbers.md#approx` says so; proposed: the comment follows the page when the structured comments are written.

## Notes on this run

The plan's module list for this unit was right, and the three sections were the right scope; `exact.test.ts` is thinner than "a checklist of exact behaviour in every mode" suggests (two functions in every rounding mode, three in decimal mode), so the checking was done through a scratch script that runs expressions through `evaluateText` as that test does, which was the most productive step: it confirmed every example the pages give and found the `gcd(a, 0)` defect, the reach of `mod`'s refusal and the `ceiling` slip, none of which reading alone would have caught. Verifying the rules needed `builtin.ts` (the dimension-rule helpers and the error constructors), `ball.ts`'s `widened` and `position`, `messages.ts` and the call node of `evaluate.ts`, all outside the list; the next units of this group (D7 in particular) should expect the same and budget a harness run for every example their pages state. The reports of A4, A5 and A6 under `audit/reports/` were not consulted, the reading list naming `audit/plan/` only, so the overlap with those units (N15's retries, N21's `tooLarge` classes, the partial kind) is reported here as evidence for them rather than reconciled. The plan treats docs/functions.md's tail paragraph as D5's preamble; it contradicts bullets 7 to 9 and should be read with them. Two MCP calls to queue the code findings as suggested tasks timed out; the findings are recorded here only.
