# Settings

Exucal's settings are the parameters of its numeric model. They say how
many digits a result is shown with and how its last digit is rounded;
whether the arithmetic is exact or rounds every step; how an exact
value is written; and how much a computation may cost, in time and in
memory, before it is refused. An output line is a function of the
value, its exactness and these settings, and of nothing else
([How numbers are written](numbers.md#how-numbers-are-written)). So a
reader who knows what each setting does can predict what the
calculator will show, read its refusals, and trade digits against
time. The settings are set in the settings panel.

[Numbers](numbers.md) explains the model behind the settings: exact
and inexact values, certified digits, the two modes and the two size
limits. Every setting has a default and a range, and most are bounded
by another setting; the key each is stored under is given beside it,
for anyone who reads the browser's storage.

The settings panel groups the settings by what each is for:

- **How a result is shown.**
  - The [display digits](#display-digits) are the significant digits
    an answer is shown with.
  - In exact mode, the [notation](#notation-and-ratio-width) writes an
    exact value as its digits or, where a ratio fits the ratio width,
    as a ratio.
- **How it is computed.**
  - The [mode](#mode) is exact or decimal. Exact is the default;
    decimal rounds every step as a hand calculator does.
  - In decimal mode, the
    [working digits](#working-digits-and-the-extended-count) are locked
    to the display digits or extended to a count above them.
  - The [rounding](#rounding) mode decides the last digit kept: at the
    display in exact mode, and at every step in decimal mode.
- **How much it may cost.**
  - The [precision limit](#precision-limit) caps the digits that may be
    asked for and bounds the effort an expression may cost.
  - The [significand limit](#significand-limit) bounds the fraction
    every value is held as, and an exact result past it is refused.
  - The [probe budget](#probe-budget-and-measure-this-device) is the
    time the "Measure this device" button allows one pass when it
    proposes the two limits for your device.

Three rules hold across them:

- **The settings panel opens from the cog, and every change applies as it is made**
  ([Where the settings are and how a change applies](#where-the-settings-are-and-how-a-change-applies)).
- **The limits bound each other in a chain, and a bound always wins.**
  The significand limit bounds the precision limit, which bounds the
  display digits and the extended count. The panel does not accept an
  edit past a bound, and lowering a limit lowers what depends on it to
  fit, and a line under each moved setting says so
  ([How the settings bound each other](#how-the-settings-bound-each-other)).
- **Every setting has a default and can be reset, and the settings survive a reload**
  ([Defaults and resets; storage](#defaults-and-resets-storage)).

## Where the settings are and how a change applies

The settings panel opens from the cog in the top right corner of the
page, and lies over the page with the result still in view. Every
change applies as it is made, so the result shows what a setting does
while you change it. Every numeric setting shows its unit after its
input: digits, bits or milliseconds. Under each control a line says
what the setting does in the mode in force. Under a numeric setting the
line opens with the range and names the setting that bounds it, where
one does. Under the display digits at the defaults it reads "From 1 to
1,000 digits, up to the precision limit.", the 1,000 being the
precision limit's default.
[The settings panel](app.md#the-settings-panel) says how the panel
works on a phone and on a wider screen.

## Display digits

The **display digits** are the significant digits an answer is shown
with. They are stored as `displayDigits`, in digits. The default is
eight; the range is 1 up to the precision limit, which bounds them.

In exact mode they are the digits that must be certified before the
answer is shown ([Digits you can trust](numbers.md#digits-you-can-trust)).
In the digits notation, an exact value with the display digits or fewer
is shown with all its digits, with `=`.

In decimal mode they are also the digits of every value: the grid
every step is rounded onto
([How a value is held](numbers.md#how-a-value-is-held) explains the
grid). A number typed with more digits is rounded to them as it is
read, and so is every step, unless the working digits are extended
([Working digits and the extended count](#working-digits-and-the-extended-count)).

In the tables, the "Into" column gives what the value is converted
into, typed in the second field; it is empty where nothing is
converted.

| You type | Into | Display digits | Exucal shows (exact mode) |
| -------- | ---- | -------------- | ------------------------- |
| `1 m`    | `in` | 8              | `≈ 39.370079 in`          |
| `1 m`    | `in` | 12             | `≈ 39.3700787402 in`      |
| `1/3`    |      | 8              | `≈ 0.33333333`            |
| `1 ft`   | `in` | 8              | `= 12 in`                 |

## Notation and ratio width

The **notation** says how an exact value is written in exact mode: as
its digits, or as a ratio of two whole numbers in lowest terms. It is
stored as `mode.notation.kind`. The default is digits, and the panel
offers the two as `digits` and `ratio`. The notation is a setting of
exact mode alone: a value shown in decimal mode has no more digits than
the display digits, so writing its digits writes all of it. The notation changes how an exact value is
written, never what is exact, and an inexact value is always written as
digits.

With `ratio` chosen, the **ratio width** appears beside it. It is
stored as `mode.notation.width`, in digits. The default is twenty; the
range is 1 to 1,000, bounded by no other setting. The width chooses
the form of an exact value: a whole number or a ratio where one fits
the width, and digits otherwise. A whole number fits when it has at
most the width's digits, and a ratio when its two parts together have
at most that many. The rule in full, with where a ratio is bare and
where it is in parentheses, is in
[How numbers are written](numbers.md#how-numbers-are-written). The
width is stored with the settings while `ratio` is in force, and comes
back with them after a reload. After a switch to `digits` the panel
remembers the width until the page is reloaded, so choosing `ratio`
again offers it; after a reload, `ratio` starts at twenty again.

| You type       | Into    | Digits notation                                               | Ratio notation, width 20                               |
| -------------- | ------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `1 m`          | `in`    | `≈ 39.370079 in`                                              | `= (5000/127) in`                                      |
| `1 in`         | `cm`    | `= 2.54 cm`                                                   | `= (127/50) cm`                                        |
| `m / (3 m)`    |         | `≈ 0.33333333`                                                | `= 1/3`                                                |
| `1 m`          | `ft;in` | `≈ 3 ft + 3.3700787 in`                                       | `= 3 ft + (428/127) in`                                |
| `3^20`         |         | `≈ 3.4867844e+9`                                              | `= 3486784401`                                         |
| `(1/3) * 1e30` |         | `≈ 3.3333333e+29`                                             | `= 1/3 × 1e+30`                                        |
| `sqrt(2) m`    |         | `≈ 1.4142136 m`                                               | `≈ 1.4142136 m`                                        |
| `3 ft`         | `in`    | `= 36 in`, with the reciprocal line `in ≈ 0.027777778 × 3 ft` | `= 36 in`, with the reciprocal line `in = 1/36 × 3 ft` |

The width chooses the form:

| You type | Into | Ratio width | Exucal shows     |
| -------- | ---- | ----------- | ---------------- |
| `1/3`    |      | 1           | `≈ 0.33333333`   |
| `1/3`    |      | 2           | `= 1/3`          |
| `3^20`   |      | 9           | `≈ 3.4867844e+9` |
| `3^20`   |      | 10          | `= 3486784401`   |
| `1 in`   | `cm` | 1           | `= 2.54 cm`      |
| `1 in`   | `cm` | 20          | `= (127/50) cm`  |

## Mode

The **mode** chooses between the two arithmetics, which
[The two modes](numbers.md#the-two-modes) describes. It is stored as
`mode.kind`. The default is exact. The panel offers the two under the
names `exact` and `decimal`, with a line under them that says what the
mode in force does.

Exact mode certifies every digit it shows. It holds an exact result
of exact operands with all its digits, and cuts only its display to the
display digits. An exact value is written as its digits or as a ratio,
which the notation chooses.

Decimal mode rounds every step in the rounding mode, as a hand
calculator does, to the display digits or to the extended count where
the working digits are extended, and the rounded value is the value.
Every answer is written with `=`, since every step has been rounded and
the rounded value is exact. The one exception is a built-in's value
whose rounding could not be certified at the precision limit: it is
written with the uncertified mark, `≈` with a dot above it.
[The two modes](numbers.md#the-two-modes) says what counts as a step
and how a built-in's call is certified and rounded once.

| You type              | Into | Mode    | Exucal shows (eight display digits) | Note                                           |
| --------------------- | ---- | ------- | ----------------------------------- | ---------------------------------------------- |
| `1 / 3 * 3`           |      | exact   | `= 1`                               |                                                |
| `1 / 3 * 3`           |      | decimal | `= 0.99999999`                      | each step rounded to eight digits              |
| `1 / (1 / 3 * 3 - 1)` |      | decimal | `= -1e+8`                           |                                                |
| `gamma(4.5)`          |      | decimal | `= 11.631728`                       | a built-in's value, certified and rounded once |
| `1 ft`                | `in` | either  | `= 12 in`                           |                                                |

Each mode carries one setting that exists in that mode alone: exact
mode carries the notation, and decimal mode carries the working digits,
which the panel shows under the mode. Since the setting exists only in
its mode, leaving the mode drops it, and a return to the mode finds the
setting at its default: the digits notation, or the working digits
locked.

## Working digits and the extended count

The **working digits** are the digits every step of decimal mode is
rounded to. They are stored as `mode.working.kind`. By default they are
locked to the display digits, the `extended` box unchecked, and every
step is rounded to the display digits. With the box checked, they are
extended to a count above them.

With `extended` checked, the **extended count** appears beside the box.
It is stored as `mode.working.digits`, in digits. The default is the
display digits; the range is the display digits up to the precision
limit, which bound it from either side. The count is stored with the
settings while `extended` is checked, and comes back with them after a
reload. After the box is unchecked the panel remembers the count until
the page is reloaded, so checking it again offers the count; after a
reload, `extended` starts at the display digits again. Every step but
the last is rounded to the count. The answer is rounded to the display
digits directly from its last step, not from a value already rounded to
the count, as a calculator keeps hidden digits behind its display.
[The two modes](numbers.md#the-two-modes) says which step of a result
is its last. The working digits change how many digits a step keeps,
never how the rounding mode rounds: under a rounding mode that rounds
in one direction ([Rounding](#rounding)), the last step rounds that way
too.

| You type        | Working digits | Rounding                 | Exucal shows (decimal mode, eight display digits) |
| --------------- | -------------- | ------------------------ | ------------------------------------------------- |
| `ln(exp(1/10))` | locked, 8      | to nearest, ties to even | `= 0.099999984`                                   |
| `ln(exp(1/10))` | extended to 12 | to nearest, ties to even | `= 0.1`                                           |
| `ln(exp(1/10))` | extended to 12 | toward zero              | `= 0.099999999`                                   |
| `1 / 3 * 3`     | locked, 8      | to nearest, ties to even | `= 0.99999999`                                    |
| `1 / 3 * 3`     | extended to 12 | to nearest, ties to even | `= 1`                                             |

At eight working digits `exp(1/10)` is rounded to `1.1051709` before
the logarithm is taken, and the answer shows that rounding. At twelve,
under a mode to nearest, the rounding lies beyond the eight digits
shown. Under toward zero the last step comes out a little below `0.1`,
and the rounding mode rounds it down to `0.099999999`, however small
the shortfall.

## Rounding

The **rounding mode** decides the last digit kept when a value is cut
to fewer digits than it has. It is stored as `rounding`, and the panel
offers seven modes under these names:

- to nearest, ties to even, the default
- to nearest, ties away from zero
- to nearest, ties toward zero
- toward zero
- away from zero
- up (toward +∞)
- down (toward −∞)

The three modes to nearest differ only on a value exactly halfway
between two roundings. Ties to even is the default of IEEE 754
arithmetic: it sends a tie to the even neighbor, so over many roundings
ties go up as often as down. Ties away from zero sends every tie up in
magnitude, and ties toward zero sends every tie down in magnitude.

The rounding mode acts in three places:

- In exact mode it acts once, at the display, on the last digit shown.
  A mode that rounds in one direction shows the value on the side it
  names
  ([Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)).
- In decimal mode it acts at every step, and the last digit shown is
  rounded with the last step ([The two modes](numbers.md#the-two-modes)).
- Inside an expression, the built-in `round` rounds in the mode
  ([Magnitude, sign and rounding](builtins.md#magnitude-sign-and-rounding)).

| You type     | Into | Display digits | Rounding                        | Exucal shows (exact mode) |
| ------------ | ---- | -------------- | ------------------------------- | ------------------------- |
| `0.125`      |      | 2              | to nearest, ties to even        | `≈ 0.12`                  |
| `0.135`      |      | 2              | to nearest, ties to even        | `≈ 0.14`                  |
| `0.125`      |      | 2              | to nearest, ties away from zero | `≈ 0.13`                  |
| `1 m`        | `in` | 12             | to nearest, ties to even        | `≈ 39.3700787402 in`      |
| `1 m`        | `in` | 12             | down (toward −∞)                | `≈ 39.3700787401 in`      |
| `round(2.5)` |      | 8              | to nearest, ties to even        | `= 2`                     |
| `round(2.5)` |      | 8              | to nearest, ties away from zero | `= 3`                     |

## Precision limit

The **precision limit** is the most digits an answer may be asked for,
and a limit on effort. It is stored as `precisionLimitDigits`, in
digits. The default is 1,000; the range is 1 up to the most the
significand limit allows, 2,453 digits at that limit's default.

The limit caps the display digits and, in decimal mode, the extended
count: neither may be set above it, and lowering it lowers them
([How the settings bound each other](#how-the-settings-bound-each-other)).
And it bounds the effort an expression may cost, through the
**ceiling** of its passes, the highest precision any pass computes at.
Exact mode certifies an answer by computing at a precision ten digits
above the display digits. While the digits do not certify, it computes
again at twice the precision, pass by pass, up to the ceiling
([Digits you can trust](numbers.md#digits-you-can-trust)). The ceiling
is four times the sum of the limit and ten digits, 4,040 at the default
limit; the factor and the ten digits are the schedule's design, whose
reasons [Digits you can trust](numbers.md#digits-you-can-trust) links.
It is derived from the limit and never set, and the panel writes
it as a number only in the proposal of "Measure this device"
([Probe budget and Measure this device](#probe-budget-and-measure-this-device)).
The calculator evaluates as you type, so an expression whose digits can
never be certified runs every pass up to the ceiling at every
keystroke. `(2^(1/2))^2 - 2` is one: it is zero within a bound at every
precision. That is the cost the limit bounds
([What costs time](numbers.md#what-costs-time)). In decimal mode a
step's rounding is certified at precisions up to the same ceiling.

| You type          | Precision limit | Exucal shows                   | Note                                         |
| ----------------- | --------------- | ------------------------------ | -------------------------------------------- |
| `(2^(1/2))^2 - 2` | 1,000           | `≈ 0 (within 4e-4049 of zero)` | every pass up to the ceiling of 4,040 digits |
| `(2^(1/2))^2 - 2` | 100             | `≈ 0 (within 4e-449 of zero)`  | every pass up to the ceiling of 440 digits   |

## Significand limit

The **significand limit** is the most bits an exact value's numerator
may have and the most bits its denominator may have, each counted on
its own. It is stored as `significandLimitBits`, in bits. The default
is 65,536 bits, a numerator or a denominator of about 19,700 digits.
The range is 358 to 1,048,576 bits, bounded by no other setting; the
floor is the least that allows a precision limit of one digit. An exact result
that would pass the limit is refused, and the message names what to
try: decimal mode, or `approx`, the one operation whose purpose is to
make a value inexact.
[Values too big to hold](numbers.md#values-too-big-to-hold) says what
the limit refuses and what each remedy changes, and
[How a value is held](numbers.md#how-a-value-is-held) says what a
value costs to hold.

| You type   | Significand limit | Exucal shows                        |
| ---------- | ----------------- | ----------------------------------- |
| `3^100000` | 65,536 bits       | refused: past the significand limit |
| `3^100000` | 262,144 bits      | `≈ 1.3349714e+47712`                |

## Probe budget and Measure this device

The defaults are fixed, the same on every device. Both limits are cost
limits whose right values do depend on the device, so the panel's
"Measure this device" button (the probe) proposes them, within the
**probe budget**. The budget is stored as `budgetMs`, in milliseconds.
The default is 50; the range is 10 to 10,000, bounded by no other
setting. The budget is the time the probe allows one pass. It is a
setting of the probe alone and never touches the arithmetic. The line
under the button says what the probe does: "Times an exact product and
the four elementary functions at rising sizes and proposes the largest
limits that stay within the budget a pass; nothing changes until the
proposal is applied."

The probe times one operation for each limit:

1. For the significand limit, it times an exact product of two
   fractions with the candidate's bits in each part. The candidates are
   the limit's lowest value and then sizes doubling from 512 bits up to
   its highest, and it keeps the largest whose product stays within the
   budget.
2. For the precision limit, it times one expression of the four
   elementary functions, `sin`, `atan`, `exp` and `ln`, each called
   once, at the ceiling each candidate limit would give. The candidates
   are 1, 2 and 5 times a power of ten, up to the most the proposed
   significand limit allows, and it keeps the largest within the budget.
   The special functions are not timed. A limit low enough for their
   passes would be lower than the one the elementary functions allow,
   and the probe does not take digits away from the elementary
   functions for the sake of the special ones.

Each size is timed as the shortest of three runs after one run that is
not timed, and the probe stops at the first size over the budget. The
budget is per pass. The passes double in precision, so an expression
that runs to the ceiling costs about twice its last pass, and a budget
on one pass bounds the whole.

The proposal names the sizes it timed and what each took against the
budget, and says so when even the lowest value of a limit cost more
than the budget. Nothing changes until "Apply" is pressed. Applying is
a change like any edit: the two limits are set, what depends on them is
lowered to fit, and a line under each moved setting says so
([How the settings bound each other](#how-the-settings-bound-each-other)).

The probe runs only when pressed, and the page waits while it runs. It
measures time alone, not memory.

## How the settings bound each other

The limits form a chain, and a bound always wins: a limit is a cost
bound you set, and an edit to a setting under it never raises it
unasked. The significand limit bounds the precision limit. The finest
grid is the grid of the ceiling's pass, and its values are fractions
like any other ([How a value is held](numbers.md#how-a-value-is-held)).
The significand limit must hold not one such value but the product of
two, since a step may multiply two of them; so a significand limit
allows only the precision limits whose ceiling keeps that product
within it. The precision limit bounds the display digits and the
extended count, and the display digits are the extended count's
floor.

| Setting           | Lowest             | Highest                                                             | Moved by a change above it                                                                    |
| ----------------- | ------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Significand limit | 358 bits           | 1,048,576 bits                                                      | never                                                                                         |
| Precision limit   | 1 digit            | the most the significand limit allows (2,453 digits at its default) | lowered when the significand limit no longer allows it                                        |
| Display digits    | 1 digit            | the precision limit                                                 | lowered when the precision limit falls below them                                             |
| Extended count    | the display digits | the precision limit                                                 | raised when the display digits rise above it; lowered when the precision limit falls below it |
| Ratio width       | 1 digit            | 1,000 digits                                                        | never                                                                                         |
| Probe budget      | 10 ms              | 10,000 ms                                                           | never                                                                                         |

An edit within a setting's range is accepted. The panel does not accept
one past a bound: the input shows the setting in force again, and a
line under it names the bound and the setting that sets it, until the
next change. An accepted edit that moves a bound holds each setting
under it to its new range: the setting is moved to the bound, as the
table's last column says, and a line under it says so, until the next
change. A moved value is stored as moved, so moving the bound back
afterwards does not restore it. A reset does the same
([Defaults and resets; storage](#defaults-and-resets-storage)).

| You edit                                                              | The panel says                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| the precision limit to 3,000 digits, at the default significand limit | "At most 2,453 digits under the significand limit."                                        |
| the extended count to 4 digits, at eight display digits               | "At least 8 digits, the display digits."                                                   |
| the ratio width to 2,000 digits                                       | "At most 1,000 digits."                                                                    |
| the display digits to 2.5                                             | "A whole number."                                                                          |
| the significand limit to 1,024 bits, from the defaults                | under the precision limit: "Lowered from 1,000 to 26 digits to fit the significand limit." |
| the display digits to 20, with the count extended to 16               | under the working digits: "Raised from 16 to 20 digits to the display digits."             |

## Defaults and resets; storage

Beside the name of a setting that is off its default, a "default …"
link names the default and restores it. "Reset all settings" at the foot of the panel restores
every default. A reset is a change like any other: what depends on the
reset setting is held to its range, and a line under it says so.
[The settings panel](app.md#the-settings-panel) describes the links.

The settings are kept in the browser's storage as one object, so that
they survive a reload. The object carries a format version of its own,
so that a later build migrates what an earlier one stored. A stored
value the build cannot read falls back to that setting's default, and a
stored object written by a newer build falls back to all the defaults,
in either case without notice. A stored significand limit or probe
budget out of its range falls back to its default too. Every other
stored number out of its range is held to the range as after an edit: a
precision limit past the most the significand limit allows, display
digits past the precision limit, an extended count out of its range,
and a ratio width past its limit.

[Digits you can trust](numbers.md#digits-you-can-trust) says how to
read a result, its `=` or `≈` and the note beside it.
