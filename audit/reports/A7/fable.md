# Unit A7: Dimensions, kinds, conformance and quantity arithmetic (fable)

- Plan revision: 716c74e
- Date: 2026-10-09
- Model: claude-fable-5-1
- Doc sections read: `devdocs/architecture.md#Quantities, dimensions and
  kinds`, `#Evaluation`; `devdocs/builtins.md#Dimension rules`;
  `devdocs/numbers.md#Decimal mode` (the whole section, for its
  dimensions bullet)
- Modules read: `src/core/dimension.ts`, `src/core/quantity.ts`,
  `src/core/evaluate.ts`, `src/core/dimension-of.ts`,
  `src/core/builtin.ts`, in full; `src/units.txt:1-25` (the header and
  the primitive declarations)
- Also read: `src/core/build.ts:331-334`, `397-406`, `578-598`,
  `662-682`, `709-753` (the primitives collected before the walk;
  conformance of a function's result annotation, of an inverse's body
  and of a condition's terms at build time); `src/core/convert.ts:168-184`,
  `217-233` (have against want, and each unit of a list);
  `src/core/pipeline.ts:703-718` (the function want's conformance step)
  and `420-470` (the signatures the probe below uses);
  `src/core/definitions.ts:262-266` (`!` and `!kind` read as roles);
  `src/core/table.ts:5-7`, `52-53`; `src/core/expr.ts:147` (`Exponent`);
  `src/core/print.ts:115-119`, `150-163` (how `^` and a fractional
  exponent are written); `src/core/ball.ts:631-653`, `808-840` (what the
  product and the quotient take their context for);
  `src/messages.ts:172-175`, `192-200` (the angle wording); the `name`,
  `arity` and `dimensions` lines of every module under
  `src/core/builtins/`, with `src/core/builtins/round.ts:341-360` and
  `src/core/builtins/integers.ts:178-231`; `src/units.txt:142-158`,
  `233-242`, `357-361`, `368-371`, `490-491` (`rad`, `Hz`, `N`, `J`,
  `W`, `V`, `min`, `deg`, `turn`, `rev`, `rpm`, `in`, `ft`, `lb`) and a
  search of the file for a torque unit; the tests
  `src/core/dimension.test.ts:44-56`, `143-165`, `216-323`, `328-392`,
  `src/core/evaluate.test.ts:783-798`, `949-1008`, `1093-1123`,
  `1696-1745`, `src/core/quantity.test.ts:441-457`,
  `src/core/build.test.ts:245-249`, `476-492`,
  `src/core/convert.test.ts:109`, `279-286`, `604-615`,
  `src/units.test.ts:58-96`, `476-493`; and, to run the examples
  through the existing pipeline, `src/core/context.ts:82-125`,
  `src/outcome.ts:117-215`, `src/core/display.ts:238-246`,
  `src/system-build.ts:70-90`, `src/system-table.ts:1-60`

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 8 |
| Claims corrected | 1 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 1 / 2 / 0 |
| Gaps confirmed / refuted / new | 0 / 0 / 0 |
| Proposed edits | 7 |
| Questions for the owner | 3 |

Where the evidence says "probe", the value is the output of a scratch
script, kept outside the tree and not committed, that builds the table
from `src/units.txt` as `src/units.test.ts` does and runs each example
through `outcomeOf` (`src/outcome.ts`) at the default context, exact
mode unless "decimal mode" is said; the quoted text is the line as
`displayText` writes it, or the error message. The six modules' test
suites and `src/units.test.ts` were also run and pass (140 tests).

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| Q1. A quantity is a magnitude paired with a dimension, an exponent vector over the primitives with rational exponents and zeros absent; exponents are rational so that dimensions stay exact, which is why `^` takes only a literal rational exponent; the exponents stay exact in both modes. | confirmed | `src/core/quantity.ts:69-72` (`Quantity` is `magnitude: Ball` and `dimension: Dimension`); `src/core/dimension.ts:68` (`Dimension = ReadonlyMap<string, Rational>`), `139-154` (`combine` deletes an exponent that cancels to zero), `129-136` (`powDimension` multiplies every exponent by the rational exponent); `src/core/expr.ts:147` (`Exponent = { num: Literal; den?: Literal }`); `src/core/evaluate.ts:1217-1251` (`reduceExponent` forms the fraction from the two literals and takes no mode); `src/core/quantity.ts:85-87`, `110-114` (`stepQuantity` rounds or settles the magnitude alone and keeps the computed dimension); `src/core/dimension.test.ts:152-160` (`powDimension(dim({ m: 2 }), half)` is `LENGTH`); probe: `(m^2)^(1/2)` formats as `m`, `(m^3 / s^2)^(1/3)` as `m / s^(2/3)`, and in decimal mode at eight digits `(8 m)^(1/3)` is `= 2 m^(1/3)`. | The grammar's exponent is one literal or a literal over a literal, so an irrational exponent cannot be written; the fraction is reduced in lowest terms within the significand limit, which is A5's. |
| Q2. Primitives are declared by the definitions file in two roles, dimension primitives (body `!`) and kind primitives (body `!kind`), markers that ride in the same vector; which kinds exist is the file's business, not the core's. | confirmed | `src/units.txt:17-25` (`m !` through `cd !`, `radian !kind`, `bit !`); `src/core/definitions.ts:262-266` (`!` gives the role `dimension`, `!kind` the role `kind`); `src/core/dimension.ts:70-74` (`Role`, `Primitives`), `11-18` ("which kinds exist is entirely up to the definitions file"); `src/core/build.ts:397-406` (`declaredPrimitives`, in the order given); `src/core/table.ts:52-53`; `src/core/dimension.test.ts:303-317` ("which names are kinds comes from the table alone"); probe: the table's primitives are `m kg s A K mol cd` as dimensions, `radian` as the one kind, then `bit`. | One nuance: the angle rules name one kind by convention, `RADIAN` (`src/core/builtin.ts:189-192`), and look it up among the table's primitives (`328-330`), so a table that declares no `radian` has no angles (`noAngles`), as `devdocs/builtins.md:278-280` says; the core still holds no list of kinds. |
| Q3. Conformance is checked in two steps, the dimension primitives first (dimension mismatch), then the full vectors (kind mismatch naming the kinds that differ); the same check, with the same roles, decides have against want, the operands of `+` and `-`, a call's argument against its parameter's annotation, and adjacent terms of a condition. | confirmed | `src/core/dimension.ts:165-183` (`checkConformance`: the names whose exponents differ, in declaration order; a `dimensionMismatch` if any has the dimension role, else a `kindMismatch` naming them all); every call site passes the table's primitives: `src/core/convert.ts:174-179` (have against want), `src/core/quantity.ts:155` through `combineConforming` (the operands of a sum, the left as have), `src/core/evaluate.ts:702-706` (a call's argument against its parameter's unit), `src/core/dimension-of.ts:110-114`, `198-202` (the same two at build time), `src/core/build.ts:739-750` (adjacent terms of a condition, `nonconformingComparison`); `src/core/dimension.test.ts:273-301` (precedence; every differing kind named in declaration order); `src/core/evaluate.test.ts:977-989`, `1120-1122`; probe: `1 rad + 1` says the two "differ in kind: radian", `rad/s` into `Hz` the same. | The terms of a condition are checked once, at build time, through `dimensionOf`, since their dimensions do not depend on the argument's value; at the call `checkConditions` compares magnitudes only (`src/core/evaluate.ts:1010-1015`). The same check also decides each unit of a unit list against have (`src/core/convert.ts:223-227`), a function's body against its result annotation and an inverse's body against the parameter's unit (`src/core/build.ts:586-597`, `670-681`), and the function want (Q16 below). |
| Q4. There is no special case for zero: `0` is a plain number, so `1 m + 0` and `sin(0)` are mismatches; `1 rad + 1` is a kind mismatch; `rad/s` does not convert to `Hz`, while `rpm` converts to `rad/s`. | confirmed | `src/core/evaluate.ts:505-524` (a literal is `scalar(node.value)`), `src/core/quantity.ts:75-77` (`scalar` has `DIMENSIONLESS`); `checkConformance` sees only dimensions (`src/core/dimension.ts:165-183`); `src/core/evaluate.test.ts:993-998` ("a plain number is not a quantity of anything, zero included"); `src/units.txt:142`, `145`, `357-361` (`rad radian`, `Hz 1 / s`, `turn 2 pi() radian`, `rev turn`, `rpm rev / min`); `src/units.test.ts:476-479`, `491` (`1 rpm` into `Hz` is a `kindMismatch` naming `radian`; `1 rpm` into `rad/s` is pi over thirty); probe: `1 m + 0` is refused ("1 m has dimension m, but 0 has dimension 1"), `sin(0)` is refused with "write sin(0 radian)", `1 rad + 1` and `rad/s` into `Hz` "differ in kind: radian", and `1 rpm ≈ 0.10471976 rad / s`. | In decimal mode the same three refusals appear unchanged (probe). |
| Q5. A quantity carries no unit of its own, its magnitude is held in the primitives, so `100 lb` and `45.359237 kg` are one value; an annotation checks a dimension and changes no value; `floor`, `ceil`, `trunc`, `round` and the integer functions take plain numbers; `abs`, `sign`, `div`, `mod`, `approx` take quantities. | confirmed | `src/core/quantity.ts:69-72` (no unit field), `1-5` (`2.54 cm` is the magnitude `127/5000` of `m`); `src/units.txt:490` (`lb 0.45359237 kg`); `src/core/evaluate.ts:702-718` (the argument's dimension is checked against the parameter's unit and the argument's value is pushed unchanged); `src/core/builtins/round.ts:323`, `330`, `337`, `348-353` (`plainNumbers(1)`; `round` checks both arguments dimensionless), `src/core/builtins/integers.ts:188-189`, `211-231` (`plainNumbers(count)` for `gcd`, `lcm`, `factorial`, `doublefactorial`, `binomial`), `src/core/builtins/abs.ts:49`, `56` (`sameAsArgument`, `anyToNumber`), `src/core/builtins/approx.ts:39` (`sameAsArgument`), `src/core/builtins/division.ts:157`, `164` (`conformingArguments("number")`, `("first")`); `src/core/builtin.ts:201-209`, `289-321`; probe: `100 lb = 45.359237 kg` and `45.359237 kg = 100 lb`; `floor(3.7 ft)` is refused ("must be a plain number") and `floor(3.7 ft / ft) ft = 0.9144 m`; `mod(7 ft, 2 ft) = 0.3048 m` (`= 1 ft` into `ft`), `div(7 ft, 2 ft) = 3`, `abs(-3 ft) = 0.9144 m`, `sign(-3 ft) = -1`, `approx(3 ft) ≈ 0.9144 m`, `gcd(12 m, 8 m)` refused. | None. |
| Q6. Juxtaposition and `*` multiply dimensions, `/` divides, `^` raises by its literal rational exponent, `+` and `-` require conformance and keep the shared dimension, negation touches the magnitude only; only the magnitude can fail. | confirmed | `src/core/evaluate.ts:547-597` (`add` and `sub` through `summed`, `mul` and `juxtapose` through `multiplyQuantities`, `div` through `divideQuantities`), `599-648` (`pow` through `reduceExponent` and `powered`), `649-664` (`neg` through `negateQuantity`); `src/core/quantity.ts:149-160` (`combineConforming`: the check, then `dimension: a.dimension`), `163-165` (`negateQuantity` returns a `Quantity`, not a `Result`), `171-182`, `189-200`, `214-225` (each a ball operation beside the matching dimension operation, failing only as the ball does); `src/core/dimension.ts:120-136` (the dimension operations return a `Dimension` and cannot fail); `src/core/quantity.test.ts:277`, `441-457`; `src/core/evaluate.test.ts:581-611`. | The one dimension-side failure is the sum's `ConformanceError`, which the claim's "require conformance" covers; decimal mode's neighbor rule for a sum keeps the left's dimension as well (`src/core/evaluate.ts:1183-1187`). |
| Q7. A dimension is written in the expression language: primitives in declaration order, positive exponents first, negative ones after `/`, `1` for an empty numerator, a non-integer exponent parenthesized, so an error's dimension can be typed back. | confirmed | `src/core/dimension.ts:196-235` (`formatDimension`, `dimensionExpr`: positive exponents juxtaposed, negative ones after a `div` node, `literalExpr(ONE)` for an empty numerator, `"1"` for the dimensionless dimension), `245-252` (`factor` builds a `pow` node with `num` and `den`), `273-284` (`byDeclaration`); `src/core/print.ts:115-119`, `150-163` (`^` written with the exponent, a fraction as `(num/den)`); `src/units.txt:17-20` (the order `m`, `kg`, `s`, `A`) and `6-7` (juxtaposition binds tighter than `/`); `src/core/dimension.test.ts:328-366`, `376-392` (what a dimension formats as parses); probe: `V = 1 m^2 kg / s^3 A`, `1 V` into `m^2 kg / s^3 A` is `= 1`, `m^(1/2)`, `1 / s`, `radian / s`, `m / s^(2/3)`. | The `kg m^2 / s^3 A` of `src/core/dimension.ts:191` and `src/core/dimension.test.ts:345-347` is declaration order for the test table, which declares `kg` first (`src/core/dimension.test.ts:44`); the page's `m^2 kg / s^3 A` is `src/units.txt`'s order, as the probe shows. |
| Q8. `sin`, `cos`, `tan` require the `radian` kind (`sin(30 deg)` works, `sin(1)` says to write `sin(1 radian)`); `asin`, `acos`, `atan`, `atan2` return the `radian` kind, so `asin(0.5)` into `deg` is `30` and `asin(0.5)` into `turn` or `/ radian` is the number; the hyperbolic functions take plain numbers; `atan2` takes two quantities of one dimension, kinds included. | corrected | `src/core/builtins/trig.ts:141`, `148`, `155` (`angleToNumber`), `src/core/builtins/inverse-trig.ts:498`, `505`, `512` (`numberToAngle`), `519` (`conformingToAngle`), `src/core/builtins/hyperbolic.ts:434-469` (`plainNumbers(1)` for all six); `src/core/builtin.ts:217-222`, `231-236`, `244-259` (the three rules; `conformingToAngle` runs `checkConformance` on the full vectors); `src/messages.ts:172-175` (the wording ends "write sin(1 radian)"); `src/units.txt:241`, `357` (`deg pi() radian / 180`, `turn 2 pi() radian`); probe: `sin(30 deg) ≈ 0.5`, `sin(1)` refused with "write sin(1 radian)", `sin(0 radian) = 0`, `asin(0.5) ≈ 30 deg` in exact mode and `= 30 deg` in decimal mode, `asin(0.5) ≈ 0.083333333 turn`, `asin(0.5) / radian ≈ 0.52359878`, `2 asin(0.5) + 1` a kind mismatch, `sin(asin(0.5)) ≈ 0.5`, `sinh(1 radian)` refused, `atan2(3 m, 4 s)` a dimension mismatch, `atan2(3 rad/s, 4 Hz)` a kind mismatch. | Corrected: `asin(0.5)` into `turn` is the angle counted in turns (`1/12 turn`), of the `radian` kind still, and only `asin(0.5) / radian` is the plain number. Statement: Angles: `sin`, `cos`, `tan` require the `radian` kind (`sin(30 deg)` works, `sin(1)` says to write `sin(1 radian)`); `asin`, `acos`, `atan`, `atan2` return the `radian` kind, so `asin(0.5)` into `deg` is `30 deg` and into `turn` is `1/12 turn`, an angle still, while `asin(0.5) / radian` is the plain number; the hyperbolic functions take plain numbers; `atan2` takes two quantities of one dimension, kinds included. (The conversions into `deg` and `turn` are `≈`, the angle units carrying `pi()`; A2's rule.) |
| Q16, the conformance step: a function as the want needs the have to conform to the function's result. | confirmed | `src/core/pipeline.ts:713-718` (`checkConformance(have.dimension, fn.result, table.primitives)` before the inverse is evaluated); probe: `300 K` into `tempF` is `= tempF(80.33)`, and `1 m` into `tempF` is refused ("1 m has dimension m, but tempF has dimension K"). | The rest of Q16 is A8's. |

## Stale passages

The plan tags no passage in this unit's sections. Its rows for these
pages fall in other units' sections: `devdocs/numbers.md` (§1.1.5, the
rows for `#The types`, `#Roots and powers`, `#The kernel's boundary`,
`#Certification and the display rule`, `#Working precision and the
schedule`, `#Settling`, `#The significand limit`), `devdocs/builtins.md`
(§1.1.5 and §9.4, `#The elementary routines`, `#The Gamma and Beta
families`, `#Huge and tiny arguments`) and `devdocs/architecture.md`
(§1.2.5, `#Parsing`, `#Pipeline`). The one such row in a section read
here is confirmed first; the rest of the table is what this unit found.

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/numbers.md#Decimal mode` (§1.1.5's row) | "An earlier version of the mode rounded every step and also tracked, in the radius, how far the roundings had carried the value… That was withdrawn" (`devdocs/numbers.md:1066-1075`) | keep as intent (confirmed) | A4's: the passage lies in the section's rounding paragraphs, outside this unit's dimensions bullet, and is left to that unit. |
| `devdocs/architecture.md#Quantities, dimensions and kinds` | "and the power is the one of the three that takes a `NumberContext`: for the significand limit of an exact power, the settling of an inexact base, and the root, or the log-space route, of a non-integer exponent" (`devdocs/architecture.md:146-149`) | update | and each of the three takes a `NumberContext`: the product and the quotient for the significand limit within which an exact result is formed, as `ball.ts` rules, and the power for that limit, for the settling of an inexact base, and for the root, or the log-space route, of a non-integer exponent. |
| `devdocs/builtins.md#Dimension rules` | "and the degree-radian confusion is the mistake they were introduced against" (`devdocs/builtins.md:286-287`) | keep as intent | the degree-radian confusion first among such mistakes |

## Findings

The quantity model of Q1 to Q8 is the code's, nearly sentence for
sentence: `dimension.ts` is the vector, the two-role check and the
formatter the page describes, `quantity.ts` pairs it with the ball
exactly as `#Quantities, dimensions and kinds` says, and `evaluate.ts`
applies the operations the claims list. What the code adds or corrects:

- **One check, one set of roles, more places than the plan lists.**
  `checkConformance` is the only conformance test in the tree, and every
  caller hands it the table's primitives with their roles: have against
  want (`src/core/convert.ts:174-179`), the operands of a sum
  (`src/core/quantity.ts:155`), a call's argument (`src/core/evaluate.ts:702-706`),
  the function want's have against the function's result
  (`src/core/pipeline.ts:713-718`), and, at build time only, the two of a
  sum and a call again (`src/core/dimension-of.ts:110-114`, `198-202`), a
  function's body against its result annotation, an inverse's body
  against the parameter's unit, and each term of a condition against the
  next (`src/core/build.ts:586-597`, `670-681`, `739-750`). Each unit of a
  unit list is checked against have the same way
  (`src/core/convert.ts:223-227`). Q3's "adjacent terms of a condition"
  is therefore a build-time check, never one at the call: the terms'
  dimensions do not depend on the argument, and `checkConditions`
  compares magnitudes alone (`src/core/evaluate.ts:1010-1015`). §1.2.6
  item 1 holds with that location.
- **Error locations in `#Evaluation` hold.** A nonconforming sum points
  at the whole sum and carries both operands' spans, the left as have
  (`src/core/evaluate.ts:565-572`; `src/core/evaluate.test.ts:949-991`);
  a nonconforming argument points at the call and carries the argument's
  span (`src/core/evaluate.ts:708-716`; `src/core/evaluate.test.ts:1093-1123`);
  a built-in's rule failure is a `builtinArgument` at the call with every
  argument's span (`src/core/evaluate.ts:824-832`;
  `src/core/evaluate.test.ts:1696-1735`); the arity is checked before any
  argument is evaluated (`src/core/evaluate.ts:668-679`); the primitives
  are collected before the walk (`src/core/build.ts:331-334`). The
  messages word a sum's mismatch as a conversion's ("1 m has dimension
  m, but 0 has dimension 1"), as Q19 expects.
- **The rules table of `#Dimension rules` matches every `dimensions`
  field** (the lines listed under "Also read"), and §1.2.6 item 5 holds:
  `atan2` runs the full-vector check (`src/core/builtin.ts:244-259`) and
  `mod` returns its first argument's dimension, the two having conformed
  (`src/core/builtin.ts:305-321`; probe: `mod(7 ft, 2 ft) = 0.3048 m`).
  The `div` and `mod` rows understate their rule: they require the kinds
  to match exactly as `atan2`'s row says (probe: `mod(1 rad/s, 1 Hz)` is
  a kind mismatch); the edit below adds the words.
- **One stale statement.** `#Quantities, dimensions and kinds` says the
  power is the one of the three operations that takes a `NumberContext`;
  all three do (`src/core/quantity.ts:171-175`, `189-193`, `214-218`),
  the product and the quotient for the significand limit within which
  the exact result is formed (`src/core/ball.ts:644-648`, `821-831`).
  Tagged above and rewritten below.
- **One imprecision in Q8** and in the page it rests on: converting
  `asin(0.5)` into `turn` gives `1/12 turn`, an angle, not a plain
  number; `/ radian` does. Corrected in the claim; the page's sentence is
  rewritten below.
- **The decimal-mode bullet holds.** `reduceExponent` takes no mode
  (`src/core/evaluate.ts:1217-1251`) and `stepQuantity` touches the
  magnitude alone (`src/core/quantity.ts:94-114`), so `(8 m)^(1/3)` at
  eight digits is `= 2 m^(1/3)` (probe).
- **§1.2.6 item 6 holds**, with the parenthesized fraction coming from
  `print.ts` (`150-163`) rather than from `dimension.ts`, which only
  builds the `pow` node; the volt example is right for `src/units.txt`'s
  order and the module comment's `kg m^2 / s^3 A` is the test table's.
- **Terminology.** The page calls kind primitives "dimensionless
  markers", which §12 question 20 rules out; see the edit and the
  Terminology section.

## Proposed edits

### devdocs/architecture.md#Quantities, dimensions and kinds

Old (the second bullet of the two roles, `devdocs/architecture.md:104-106`):

```markdown
- **Kind primitives** (`radian`, ...) are dimensionless markers. They
  ride along in the same exponent vector, so no separate mechanism is
  needed, but the conformance check treats them differently.
```

New:

```markdown
- **Kind primitives** (`radian`, ...) mark a kind of quantity that has
  no physical dimension, so that an angle is told from a plain number.
  They ride along in the same exponent vector, so no separate mechanism
  is needed, but the conformance check treats them differently.
```

Old (in the `src/core/quantity.ts` paragraph, `devdocs/architecture.md:146-149`):

```markdown
so the
failures are those of `ball.ts`, and the power is the one of the three
that takes a `NumberContext`: for the significand limit of an exact
power, the settling of an inexact base, and the root, or the log-space
route, of a non-integer exponent.
```

New:

```markdown
so the
failures are those of `ball.ts`, and each of the three takes a
`NumberContext`: the product and the quotient for the significand limit
within which an exact result is formed, as `ball.ts` rules, and the
power for that limit, for the settling of an inexact base, and for the
root, or the log-space route, of a non-integer exponent.
```

### devdocs/architecture.md#Evaluation

The one reference-style link in the section, and the page's only use of
`[88]`. Old (`devdocs/architecture.md:580-581`):

```markdown
`^` and `pow` disagree on such an exponent, which
[#88][88] tracks ([numbers.md](numbers.md), "Roots and powers").
```

New:

```markdown
`^` and `pow` disagree on such an exponent
([numbers.md](numbers.md), "Roots and powers", which links the open issue).
```

And delete the definition line `[88]: https://github.com/bsidhom/exucal/issues/88`
(`devdocs/architecture.md:1119`). Two reasons: the Markdown subset
(`audit/principles.md`), and §12 question 26, which links an open issue
from one place, the passage that owns the concept; the `^` versus `pow`
disagreement is `devdocs/numbers.md#Roots and powers`'s, where
`devdocs/numbers.md:480` links the issue. Question 2 below asks the owner
to confirm the owner page.

### devdocs/builtins.md#Dimension rules

Old (the end of the first paragraph, `devdocs/builtins.md:244-245`):

```markdown
so
that a message can write `sin(1 radian)` or `(2 m)^2` from the text.
```

New:

```markdown
so
that a message can write `sin(1 radian)` or `(2 m)^2` from the text. A
plain number, in the table, is a dimensionless quantity: one with
neither dimension nor kind.
```

Old (two rows of the table, `devdocs/builtins.md:259-260`):

```markdown
| `div(a, b)`                                                                                  | two quantities of one dimension                 | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension                 | the arguments' |
```

New:

```markdown
| `div(a, b)`                                                                                  | two quantities of one dimension, kinds included | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension, kinds included | the arguments' |
```

Old (in the **Angles** paragraph, `devdocs/builtins.md:273-274`):

```markdown
`2 asin(0.5) + 1` is the kind mismatch it is, and the
number is one token away: `asin(0.5)` into `turn`, or `/ radian`.
```

New:

```markdown
`2 asin(0.5) + 1` is the kind mismatch it is, and the
plain number is one token away, `asin(0.5) / radian`; `asin(0.5)` into
`turn` is the same angle counted in turns, an angle still.
```

Old (in the alternative's paragraph, `devdocs/builtins.md:285-288`):

```markdown
Kinds exist to keep
an angle from being mistaken for a number, and the degree-radian
confusion is the mistake they were introduced against, so the rule is
strict;
```

New:

```markdown
Kinds exist to keep
an angle from being mistaken for a number, the degree-radian confusion
first among such mistakes, so the rule is strict;
```

## Terminology

- "dimensionless markers" for the kind primitives
  (`devdocs/architecture.md:104`; also the code's comments,
  `src/core/dimension.ts:13`, `src/core/definitions.ts:11` and `123`)
  conflicts with §8 and §12 question 20, under which a kind is never
  called dimensionless. Proposed canonical: **kind primitive**, described
  as marking a kind of quantity that has no physical dimension (the edit
  above).
- "plain number" (`devdocs/builtins.md#Dimension rules` throughout, and
  the app's messages: "1 is a plain number, but sin takes an angle")
  against the canonical **dimensionless**: keep "plain number" in the
  table as the gloss §8 allows, defined once in the section (the edit
  above); question 3 below.
- "dimension mismatch" and "kind mismatch" (both pages; the code's
  `dimensionMismatch` and `kindMismatch`; the messages say "differ in
  kind") are not in §8. Proposed canonical: **dimension mismatch** and
  **kind mismatch** for the two failures, **conform** for the relation,
  as the pages already have them.
- The messages write a plain number's dimension as `1` ("0 has dimension
  1"), the formatter's text for the empty dimension (Q7). Consistent with
  the pages; a docs page that quotes such a message will show it, and
  the user docs should gloss it once where the message is quoted.

## Questions for the owner

1. Three code comments contradict the pages or the decisions, which no
   unit may change: `src/core/quantity.ts:17-20` says an exact result
   past the significand limit is refused by the evaluator, "not here",
   while `multiplyBalls` and `divideBalls` form the product within the
   context's limit (`src/core/ball.ts:644-648`, `821-831`) and the
   evaluator only asserts afterwards (`src/core/evaluate.ts:409-421`);
   `src/core/dimension.ts:191` gives `kg m^2 / s^3 A`, the test table's
   order, where `src/units.txt`'s is `m^2 kg / s^3 A`; and
   `src/core/dimension.ts:13`, `src/core/definitions.ts:11` and `123`
   call the kind primitives "dimensionless markers". Proposed answer: one
   code-comment change after the audit, outside any unit, in the
   direction `src/core/evaluate.ts:7-11`'s own note sets, module headers
   restating less of the architecture page.
2. Issue #88 is linked from two pages, `devdocs/architecture.md#Evaluation`
   and `devdocs/numbers.md#Roots and powers`, against §12 question 26.
   Proposed answer: `devdocs/numbers.md#Roots and powers` owns the `^`
   versus `pow` disagreement and keeps the one link; the edit above makes
   `#Evaluation` point at that section without the issue; the unit that
   rewrites `devdocs/numbers.md`'s reference-style links (A5, or the V
   unit for that page) keeps it inline there.
3. `#Dimension rules` writes "plain number" in every row where §8 makes
   "dimensionless" the canonical term in both corpora. Proposed answer:
   keep "plain number" in the rows as the gloss and define it once (the
   edit above), rather than rewrite the table.

## Notes on this run

The plan's scope for this unit was nearly right, with three additions.
The examples in Q4, Q5 and Q8 (`rad`, `Hz`, `rpm`, `turn`, `deg`, `lb`)
cannot be verified from the primitive declarations alone, so a dozen
lines of `src/units.txt` beyond "the primitive and kind declarations"
were read; Q3's check of a condition's terms lives in `src/core/build.ts`
and Q16's conformance step in `src/core/pipeline.ts`, neither on the
module list; and the rules table of `#Dimension rules` needs the
`dimensions` line of every module under `src/core/builtins/`, a mechanical
grep. The cheapest verification by far was a scratch script through
`outcomeOf`, which gives the displayed line or the worded message for
each example at once and settled the volt's text, the `turn` question
and the decimal-mode exponent in one run; A8 may want the same probe for
the output modes. For the next units: `src/core/convert.ts:223-227`
checks every unit of a list against have with the one conformance check
(A8), and the kind-mismatch message names the differing kinds in
declaration order, which the catalogue of §12 question 6 will show.
