# Settings

Exucal's settings are the parameters of its numeric model: how many
digits a result is shown with, whether the arithmetic is exact or rounds
every step and how it rounds, how an exact value is written, and how
much a computation may cost before it is refused. They are set in the
settings panel, which opens from the cog in the top right corner of the
page, and every change applies as it is made
([The settings panel](app.md#the-settings-panel) describes the panel).
[Numbers](numbers.md) explains the model behind the settings and how to
read a result, its `=` or `≈` and the note beside it. Every setting has
a default and a range, most are bounded by another setting, and each is
stored under a key, given for anyone who reads the browser's storage.

The panel groups the settings by what each is for:

- **How a result is shown.** The [display digits](#display-digits), and
  in exact mode the [notation and ratio width](#notation-and-ratio-width).
- **How it is computed.** The [mode](#mode), exact or decimal; in
  decimal mode the
  [working digits and the extended count](#working-digits-and-the-extended-count);
  and the [rounding](#rounding) mode, which rounds the whole result
  once in exact mode and every step in decimal mode.
- **How much it may cost.** The [precision limit](#precision-limit),
  the [significand limit](#significand-limit), and the
  [probe budget](#probe-budget-and-measure-this-device) with "Measure
  this device", which proposes the two limits for your device.

The limits form a chain, from the significand limit down to the
extended count: a setting cannot be set past the bound above it, and
lowering a bound lowers the settings below it
([How the settings bound each other](#how-the-settings-bound-each-other)).
Every setting has a default and can be reset, and the settings survive
a reload ([Defaults and resets; storage](#defaults-and-resets-storage)).

## Display digits

The **display digits** are the significant digits the final result is
shown with, in either mode. They are stored as `displayDigits`, in
digits. The default is 8; the range is 1 up to the precision limit,
which bounds them. In exact mode they are the digits the calculator must
certify before it shows the answer
([Digits you can trust](numbers.md#digits-you-can-trust)). In decimal
mode the working digits decide the digits each intermediate step is
rounded to, and they default to the display digits
([Working digits and the extended count](#working-digits-and-the-extended-count)).
[The two modes](numbers.md#the-two-modes) gives decimal mode's rules.

## Notation and ratio width

The **notation** says how an exact value is written in exact mode: as
its digits, or as a ratio of two whole numbers in lowest terms
([How numbers are written](numbers.md#how-numbers-are-written)). The
choice is stored as `mode.notation.kind`. The default is digits, and
the panel offers the two as "digits" and "ratio". The notation is a
setting of exact mode alone: a value shown in decimal mode has no more
digits than the display digits, so its digits already write it in full.

With "ratio" chosen, the **ratio width** appears beside it. It is
stored as `mode.notation.width`, in digits. The default is 20; the
range is 1 to 1,000, bounded by no other setting. An exact value is
written as a whole number or a ratio where one fits the width, and as
digits otherwise; the rule is in
[How numbers are written](numbers.md#how-numbers-are-written). The
width is stored with the settings while "ratio" is in force. After a
switch to "digits" the panel remembers the width until the page is
reloaded, so choosing "ratio" again offers it.

## Mode

The **mode** chooses between the two arithmetics, which
[The two modes](numbers.md#the-two-modes) describes. It is stored as
`mode.kind`. The default is exact, and the panel offers the two as
"exact" and "decimal". Exact mode certifies every digit it shows, and it
holds an exact result of exact operands with all its digits, cutting
only the display. Decimal mode rounds every step in the rounding mode,
to the working digits, and holds each rounded value as exact, so every
answer is written with `=`. The one exception is a built-in's value
whose rounding could not be certified at the precision limit, which
carries the uncertified mark, `≈` with a dot above it.

Each mode carries one setting that exists in that mode alone: exact
mode carries the notation, and decimal mode carries the working digits.
Leaving a mode drops the setting it carried, so a return to the mode
finds that setting at its default: the digits notation, or the working
digits at the display digits.

## Working digits and the extended count

The **working digits** are the digits every intermediate step of
decimal mode is rounded to. By default they are locked to the display
digits, the "extended" box unchecked. With the box checked they are
extended to the **extended count**, which appears beside it. The choice
is stored as `mode.working.kind` and the count as `mode.working.digits`,
in digits. The count's default is the display digits; its range is the
display digits up to the precision limit, which bound it from either
side. With a count above the display digits, every step but the last is
rounded to the count and the result to the display digits, as a
calculator keeps hidden digits behind its display.
[The two modes](numbers.md#the-two-modes) says which step of a result
is its last. The count is stored with the settings while "extended" is
checked. After the box is unchecked the panel remembers the count until
the page is reloaded, so checking it again offers the count.

## Rounding

The **rounding mode** decides the last digit kept when a value is cut
to fewer digits than it has
([Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)).
It is stored as `rounding`. The panel offers three modes to nearest,
which differ only on a value exactly halfway between two roundings:
ties to even, the default; ties away from zero; and ties toward zero.
It offers four modes that round in one direction: toward zero, away
from zero, up and down. In exact mode the rounding mode acts exactly
once, on the whole expression's result as it is displayed, so no
intermediate value is rounded. In decimal mode it acts at every step
([The two modes](numbers.md#the-two-modes)). Inside an expression, the
built-in `round` rounds in the rounding mode
([Magnitude, sign and rounding](builtins.md#magnitude-sign-and-rounding)).

## Precision limit

The **precision limit** is the most digits an answer may be asked for,
and a limit on effort. It is stored as `precisionLimitDigits`, in
digits. The default is 1,000; the range is 1 up to the most the
significand limit allows, 2,453 digits at that limit's default. The
limit caps the display digits and the extended count. It bounds effort
through the **ceiling** of the passes, the highest precision any pass
computes at: four times the sum of the limit and ten digits, 4,040 at
the default limit. The ceiling is derived from the limit and never set,
and the panel writes it as a number only in the proposal of "Measure
this device". An expression whose digits never certify runs every pass
up to the ceiling at every keystroke, and that is the cost the limit
bounds ([Digits you can trust](numbers.md#digits-you-can-trust),
[What costs time](numbers.md#what-costs-time)).

## Significand limit

The **significand limit** is the most bits an exact value's numerator
may have and the most bits its denominator may have, each counted on
its own. It is stored as `significandLimitBits`, in bits. The default
is 65,536 bits, a numerator or a denominator of about 19,700 digits;
the range is 358 to 1,048,576 bits, bounded by no other setting. An
exact result past the limit is refused, and the message names what to
try: decimal mode, or `approx`, the one operation whose purpose is to
make a value inexact
([Values too big to hold](numbers.md#values-too-big-to-hold)).
[How a value is held](numbers.md#how-a-value-is-held) says what a value
costs to hold.

## Probe budget and Measure this device

The **probe budget** is the time the panel's "Measure this device"
button, the probe, allows one pass when it measures the device. It is
stored as `budgetMs`, in milliseconds. The default is 50; the range is
10 to 10,000, bounded by no other setting. The budget is per pass
because the passes double in precision, so an expression that runs to
the ceiling costs about twice its last pass. The budget is a setting of
the probe alone.

The probe proposes the two limits. Their defaults are fixed, the same on
every device, but both are cost limits whose right values depend on the
device. The probe times one operation for each limit. Each size is
timed as the shortest of three runs after one run that is not timed,
and the probe stops at the first size over the budget.

1. For the significand limit, the probe times an exact product of two
   fractions with the candidate's bits in each part. The candidates are
   the limit's lowest value and then sizes doubling from 512 bits up to
   its highest.
2. For the precision limit, the probe times one expression of four
   elementary functions, `sin`, `atan`, `exp` and `ln`, each called
   once, at the ceiling each candidate limit gives. The candidates are
   1, 2 and 5 times a power of ten, up to the most the proposed
   significand limit allows. The special functions, the Gamma family
   among them, are not timed: their passes cost more, so a limit that
   fit them within the budget would hold the elementary functions far
   below what they can deliver within it.

The proposal names the sizes it timed and what each took against the
budget. Nothing changes until "Apply" is pressed, which is a change like
any edit: the two limits are set and what depends on them follows
([How the settings bound each other](#how-the-settings-bound-each-other)).
The probe runs only when pressed, and the page waits while it runs. It
measures time alone, not memory.

## How the settings bound each other

The limits form a chain: a limit is a cost bound you set, and an edit
to a setting below it in the chain never raises it unasked. The
significand limit bounds the precision limit, since the values on the
finest grid, the grid of the ceiling's pass, are fractions that must
fit within the significand limit, with room for a product of two of
them ([How a value is held](numbers.md#how-a-value-is-held)). The
precision limit bounds the display digits and the extended count, and
the display digits are the extended count's floor.

| Setting           | Bounded by                                          | Moved by a change above it                                                                    |
| ----------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Significand limit | nothing: a fixed range                              | never                                                                                         |
| Precision limit   | the significand limit (2,453 digits at its default) | lowered when the significand limit no longer allows it                                        |
| Display digits    | the precision limit                                 | lowered when the precision limit falls below them                                             |
| Extended count    | the display digits below, the precision limit above | raised when the display digits rise above it; lowered when the precision limit falls below it |
| Ratio width       | nothing: a fixed range                              | never                                                                                         |
| Probe budget      | nothing: a fixed range                              | never                                                                                         |

The panel does not accept an edit past a bound: the setting keeps its
value, and the panel says beneath the control which bound was passed
and which setting sets it. An accepted edit that moves a bound holds
each setting below it in the chain to its new range, as the table's
last column says, and the panel says so beneath each moved setting. A
moved value is stored as moved, so moving the bound back afterwards
does not restore it.

## Defaults and resets; storage

Beside the name of a setting that is off its default, a "default …"
link names the default and restores it, and "Reset all settings" at the
foot of the panel restores every default. A reset is a change like any
other: what depends on the reset setting is held to its range, and the
panel says so. The settings are kept in the browser's storage as one
object, so that they survive a reload. The object carries a format
version of its own, so that a later build migrates what an earlier one
stored. A stored value the build cannot read falls back to that
setting's default, and a stored object written by a newer build falls
back to all the defaults, in either case without notice. A stored
significand limit or probe budget out of its range falls back to its
default too; every other stored number out of its range is held to the
range, as after an edit.
