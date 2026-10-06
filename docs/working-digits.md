# The working digits of decimal mode

The design note for step S2b of docs/settings-plan.md, written after
the decimal mode's restatement (D26, docs/decimal-mode.md) landed and
the S2 note (docs/settings-modes.md) was reviewed, and before either is
implemented. It adds one thing to decimal mode: a floor on the digits
every step is computed at, set apart from the digits the answer is shown
with, so that a short chain of operations does not visibly lose digits.
Exact mode is untouched: it has no such setting and needs none, since
its working precision is the retry schedule's and the digits asked for
are certified at the end.

## The problem

In decimal mode every step is rounded to Digits (D26). At eight digits,
`ln(exp(1/10))` is `0.099999984`: `exp(0.1)` is `1.1051709180756476…`,
rounded to `1.1051709`, which drops `1.8e-8`, and `ln` of that is
`0.0999999836…`, rounded to `0.099999984`. The arithmetic is right and
the answer is the mode's, but it is not the answer a hand calculator
gives. Every calculator sold rounds each step to more digits than it
shows: a ten-digit display over twelve or thirteen internal digits, so
that the error of a step lands below the last digit shown and
`ln(exp(0.1))` displays as `0.1`. Google's calculator does the same and
exposes the extra digits in its answer variable. Decimal mode as landed
has no guard digits at all, so the first rounding is visible in the
answer whenever a later step amplifies it, and `1/3 * 3` is `0.99999999`
where a calculator shows `1`.

The S2 note weighed splitting Digits into the digits shown and the
digits computed with (P6) and declined, on the ground that a second
number would mean "compute with more digits than you show", which is
what exact mode is for. This note takes the other side for decimal mode
alone: that is exactly what a calculator does, it is what a user of
decimal mode expects from the name, and the digits shown and the digits
computed with are two settings there, not one.

## The rule

In decimal mode, with Digits `p` and working digits `w`, `w >= p`:

- **Every step but the last is rounded to `w` digits** in the rounding
  mode, exact after it, as D26 has every step rounded to `p` today: each
  literal, each unit, each operator, each built-in's call as a whole,
  certified at `w` as it is certified at `p` today.
- **The last step of a displayed value is rounded to `p` digits**
  directly from the exact result of its operation, not from a `w`-digit
  intermediate. The root of the `have` expression, the conversion's
  ratio, a list's counts and remainder, a function want's recovered
  count and the reciprocal are each the last step of what they show.
  Rounding the exact result once, at `p`, avoids the double rounding a
  calculator's display has (a `w`-digit value that lands on a `p`-digit
  tie by its own rounding, rounded again), so that the answer is the
  correctly rounded value of the last operation on `w`-digit operands.
- **The answer is exact and written with `=`**, as every decimal-mode
  value is: the last step's rounding is a step of the mode like any
  other. `ln(exp(1/10))` at eight digits over twelve is `= 0.1`, and
  `1/3 * 3` is `= 1`.
- **With `w = p` nothing changes**: every step, the last included, is
  rounded to `p`, which is D26 as landed. That is the default.

The ceiling applies as it does today: a built-in's rounding at `w` is
certified by computing it at rising precision from `w` plus the guard up
to the ceiling, so `w` may not exceed the precision limit, from which the
ceiling is derived; `p` may not exceed `w`. The uncertified mark of D26
(provisional, #173) is unchanged in meaning: it marks a step whose
rounding at `w` could not be certified, and it carries to the answer as
it does today.

Nothing about this reaches exact mode. There the working precision is
the pass's, rising until the digits asked for are certified, and the
display rounds once. A floor on it would be a floor on the schedule's
first pass, which is a different knob with a different purpose, and
this note does not add one.

## The setting

The S2 note puts the fractions display inside the exact variant of the
mode setting, because it applies to exact mode alone. The working digits
apply to decimal mode alone, and go inside the decimal variant for the
same reason:

```ts
/** How many digits every step but the last is rounded to in decimal mode: Digits, or an extended count above them. */
export type Working =
  | { readonly kind: "digits" }
  | { readonly kind: "extended"; readonly digits: number };

export type ModeSetting =
  | { readonly kind: "exact"; readonly notation: Notation }
  | { readonly kind: "decimal"; readonly working: Working };
```

- `digits` is the default: the working digits are locked to Digits, and
  the mode is D26 as landed. It is a choice, not a boolean, by the house
  rule; the panel shows it as the checkbox below.
- `extended` holds the count. Its range is `[digits, maxDigits]`, Digits at
  the bottom (a floor below the digits shown would be no floor) and the
  precision limit at the top (the ceiling must hold the certification of
  a step at `w`). Both bounds are clamps in the sense of `clampSettings`:
  raising Digits above an extended count raises the count to meet it, and
  lowering the precision limit below it lowers it. The clamp runs in the
  order of dependence after the existing three: the range limit, the
  precision limit, Digits, then the working digits. `clampSettings`
  keeps its name, this being a clamp.
- The stored shape is the decimal variant with its `working`, at the
  version S2 introduces; the migration from version 2 builds
  `{ kind: "decimal", working: { kind: "digits" } }` for a stored
  `mode: "decimal"`. If S2 lands first, this is a version 4 and a
  second migration; the recommendation below is that they land together.

A value named "working digits" in the settings and "working precision"
in the core is the vocabulary #172 is to settle; this note uses "working
digits" for the setting and leaves the core's word to that study.

## The panel

Under the Mode select, when the mode is decimal (as the notation's
control appears under it when the mode is exact, S2):

```
Mode          [decimal ▾]
              every step is rounded to Digits in the rounding mode, as a
              hand calculator does; the answer is exact in that arithmetic.

Working digits  [ ] extended
              every step is computed with Digits. Extended working digits
              keep a step's rounding out of the answer, as a calculator's
              hidden digits do: at twelve, ln(exp(1/10)) is 0.1.
```

and with the box checked:

```
Working digits  [x] extended    [ 12 ]
              the digits every step but the last is computed with; the
              answer is shown at Digits.
```

- The checkbox is unchecked by default, which is the `digits` kind: the
  working digits are locked to Digits, and no number is shown, since
  there is none to set.
- Checking it is the `extended` kind: a number input appears, at Digits
  (or the last extended count), for the extended working digits. The
  input's range is the clamp's, Digits to the precision limit, and a
  value outside it snaps back as the other number inputs do; a count
  below Digits is never stored, since the floor must be at least the
  digits shown.
- Unchecking it returns to `digits` and removes the input.
- The control is absent in exact mode, as the notation's control is
  absent in decimal mode: each variant shows what it carries.

The line under Digits in decimal mode says "the digits of the answer;
every step before the last is computed with the working digits", and
README's "Settings" gains the setting and the `ln(exp(1/10))` example.
S4 may lay the controls out otherwise; this is the minimum the model
needs.

## Where it goes

- `src/core/context.ts`: `NumberContext` gains an optional `working`,
  the digits every step but the last is rounded to in decimal mode,
  absent meaning `precision` (and ignored in exact mode, where the pass
  sets the precision). `checkContext` requires `working >= precision`
  and `4 (working + GUARD_DIGITS) <= ceiling`.
- `src/core/evaluate.ts`: a node steps at its context and evaluates its
  children at the working context (`precision` set to `working`), so
  that the root of the expression is the one node rounded to the digits
  asked for; `step` itself is unchanged, since a context says what to
  round to.
- `src/core/pipeline.ts`: the conversion's ratio, a list's counts and
  remainder and a function's count are stepped at the user's context,
  as they are today, their operands having been computed at the working
  context; `src/outcome.ts` the reciprocal likewise. Nothing in the
  display changes: a value with at most `p` digits is `exact`.
- `src/settings.ts`: the decimal variant's `working`, its validation,
  the clamp and its range in `rangesOf`, `contextOf` setting `working`
  for an extended count; the migration.
- `src/settings-panel.ts`: the control above.
- Tests: `ln(exp(1/10))` and `1/3 * 3` at eight digits over twelve, in
  each rounding mode, against exact mode's certified digits at eight (the
  answer of the last step over twelve-digit operands rounds to the same
  eight digits as the exact value whenever the twelve-digit error is
  below half a unit of the eighth, which these are); the clamp's order;
  a version 2 fixture; the panel's control present in decimal mode only
  and its input present only with "extended" checked.
- Docs: docs/decimal-mode.md (the promise's point 2 gains the last
  step's rounding; "As landed"), D26 amended as D27 says below, README
  ("Settings", the Mode and Digits entries), ARCHITECTURE.md
  ("Settling").

## D27, proposed

**D27. Decimal mode rounds every step but the last to the working
digits, a setting of the mode at or above Digits, and the last step of
a displayed value to Digits, directly from its exact result (added after
S2's note; ruled by the owner on the case of `ln(exp(1/10))`).** The
working digits default to Digits, under which the mode is D26 as landed;
set above Digits they keep a step's rounding out of the answer, as a
calculator's internal digits do. The last step is rounded once, from the
exact result of its operation on working-digit operands, so that the
answer is never a double rounding. Exact mode has no such setting: its
working precision is the retry schedule's.

## Sequencing

This step is S2b, between S2 and S3, and the recommendation is to
implement it with S2 in one change: both reshape the mode setting, and
one version bump with one migration is better than two. The core part
is small (a field in the context, the evaluator passing a working
context to its children) and the panel part is one control, so the
combined change stays the size S2 was estimated at. If S2 has landed
alone when this is taken up, it is a version 4 on its own.

## Not in this step

- **A floor on exact mode's first pass**, which this note declines above.
- **Default working digits above Digits.** The default is Digits, by the
  owner's ruling, so that a user who has not touched the setting sees
  D26's mode; whether the default should be Digits plus a few, as
  calculators ship, is a question for S3's look at the defaults.
- **The uncertified mark (#173), `approx` (#171) and the vocabulary
  (#172).**
