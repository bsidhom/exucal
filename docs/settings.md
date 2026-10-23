# Settings

Exucal's settings are the parameters of its numeric model: how many
digits a result is shown with, whether the arithmetic is exact or rounds
every step and how it rounds, how an exact value is written, and how
much a computation may cost before it is refused. One more, the probe
budget, sets how long the panel may take to measure the device. They
are set in the settings panel, which opens from the cog in the top
right corner of the page, and every change applies as it is made
([The settings panel](app.md#the-settings-panel) describes the panel).
[Numbers](numbers.md) explains the model behind the settings and how to
read a result, its `=` or `≈` and the note beside it. Every setting has
a default and a range, and some are bounded by another setting.

The panel groups the settings by what each is for:

- **How a result is shown.**
  - The [display digits](#display-digits).
  - In exact mode, the [notation and ratio width](#notation-and-ratio-width).
- **How it is computed.**
  - The [mode](#mode), exact or decimal.
  - In decimal mode, the
    [working digits and the extended count](#working-digits-and-the-extended-count).
  - The [rounding](#rounding) mode: once, on the whole result, in
    exact mode; at every step in decimal mode.
- **How much it may cost.**
  - The [precision limit](#precision-limit).
  - The [significand limit](#significand-limit).
  - The [probe budget](#probe-budget-and-measure-this-device), with
    "Measure this device", which proposes the two limits for your
    device.

Every setting can be reset to its default, and the settings survive a
reload ([Defaults and resets](#defaults-and-resets)). The settings that
bound others form a chain, in which a change to one setting can move
the settings below it
([How the settings bound each other](#how-the-settings-bound-each-other)).

## Display digits

The **display digits** are the significant digits the final result is
shown with, in either mode. The default is 8 digits; the range is 1
digit up to the precision limit, which bounds them. In exact mode they
are the digits the calculator must certify before it shows the answer
([Digits you can trust](numbers.md#digits-you-can-trust)). In decimal
mode the working digits decide the digits each intermediate step is
rounded to, and they default to the display digits
([Working digits and the extended count](#working-digits-and-the-extended-count)).
[The two modes](numbers.md#the-two-modes) gives decimal mode's rules.

## Notation and ratio width

The **notation** says how an exact value is written in exact mode: as
its decimal digits, or as a ratio of two whole numbers in lowest terms
([How numbers are written](numbers.md#how-numbers-are-written)). The
panel offers the two as "digits" and "ratio"; the default is digits.
The notation is a setting of exact mode alone: a value shown in decimal
mode has no more digits than the display digits, so its decimal digits
already write it in full.

With "ratio" chosen, the **ratio width** appears beside it. The default
is 20 digits; the range is 1 to 1,000 digits, bounded by no other
setting. An exact value is written as a whole number or a ratio where
one fits the width, and as decimal digits otherwise; the rule is in
[How numbers are written](numbers.md#how-numbers-are-written).

## Mode

The **mode** chooses between the two arithmetics, which
[The two modes](numbers.md#the-two-modes) describes. Exact mode, the
default, certifies every digit it shows and rounds only what it shows,
never the value of an exact result. Decimal mode rounds every step to
the working digits, as a hand calculator does, and holds each rounded
value as exact, so it writes its answers with `=`. The panel offers the
two as "exact" and "decimal". Each mode carries settings that exist in
that mode alone: exact mode the notation with its ratio width, decimal
mode the working digits with their extended count.

## Working digits and the extended count

The **working digits** are the digits every intermediate step of
decimal mode is rounded to. The panel has an "extended" box for them.
Unchecked, the default, the working digits are locked to the display
digits. Checked, they are extended to the **extended count**, which
appears beside the box. The count's default is the display digits; its
range is the display digits up to the precision limit, which bound it
from either side. With a count above the display digits, every step but
the last is rounded to the count, and the last step is rounded to the
display digits, as a calculator keeps hidden digits behind its display.
[The two modes](numbers.md#the-two-modes) says which step of a result
is its last.

## Rounding

The **rounding mode** decides the last digit kept when a value is cut
to fewer digits than it has
([Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)).
The panel offers three modes to nearest, which differ only on a value
exactly halfway between two roundings: ties to even, the default; ties
away from zero; and ties toward zero. It offers four modes that round
in one direction: toward zero, away from zero, up and down. In exact
mode the rounding mode acts exactly once, on the whole expression's
result as it is displayed; no intermediate value is rounded unless you
call the built-in `round`, which rounds in the rounding mode
([Magnitude, sign and rounding](builtins.md#magnitude-sign-and-rounding)).
In decimal mode the rounding mode acts at every step
([The two modes](numbers.md#the-two-modes)).

## Precision limit

The **precision limit** is the most digits an answer may be asked for,
and a limit on effort. The default is 1,000 digits; the range is 1
digit up to the most the significand limit allows, 2,453 digits at that
limit's default. The significand limit sets that most because the
values on the finest grid, the grid of the ceiling's pass, are
fractions, and they must fit within the significand limit with room for
a product of two of them
([How a value is held](numbers.md#how-a-value-is-held)). The limit caps
the display digits and the extended count. It bounds effort through the
**ceiling** of the passes, the highest precision any pass computes at:
four times the sum of the limit and ten digits, 4,040 at the default
limit. The ceiling is derived from the limit and never set, and the
panel writes it as a number only in the proposal of "Measure this
device". An expression whose digits never certify runs every pass up to
the ceiling, and that is the cost the limit bounds
([Digits you can trust](numbers.md#digits-you-can-trust),
[What costs time](numbers.md#what-costs-time)).

## Significand limit

The **significand limit** is the most bits an exact value's numerator
may have and the most bits its denominator may have, each counted on
its own. The default is 65,536 bits, a numerator or a denominator of
about 19,700 digits. The range is 358 to 1,048,576 bits, bounded by no
other setting; the floor is the least that lets a precision limit of
one digit fit. An exact result past the limit is refused, and the
message names what to try: decimal mode, or `approx`, the one operation
whose purpose is to make a value inexact
([Values too big to hold](numbers.md#values-too-big-to-hold)).
[How a value is held](numbers.md#how-a-value-is-held) says what a value
costs to hold.

## Probe budget and "Measure this device"

The panel's "Measure this device" button runs the probe, which
measures the device and proposes the two limits for it. The limits'
defaults are fixed, the same on every device, but both are cost limits
whose right values depend on the device. The **probe budget** is the
time the probe allows each operation it times: one product for the
significand limit, one pass of its expression for the precision limit.
The default is 50 ms; the range is 10 to 10,000 ms, bounded by no other
setting. The budget is a setting of the probe alone. It is per pass
because the passes double in precision, so an expression that runs to
the ceiling costs about twice its last pass.

The probe times one operation for each limit, at a series of candidate
sizes:

1. For the significand limit, the probe times an exact product of two
   fractions with the candidate's bits in each part. The candidates are
   the limit's lowest value and then sizes doubling from 512 bits up to
   its highest.
2. For the precision limit, the probe times one expression of four
   elementary functions, `sin`, `atan`, `exp` and `ln`, each called
   once, at the ceiling each candidate limit gives. The candidates are
   1, 2 and 5 times a power of ten, up to the most the proposed
   significand limit allows. The special functions, the Gamma family
   among them, are not timed. Their passes cost more, and a limit that
   keeps them within the budget holds the elementary functions far
   below what they deliver within the same budget.

Each candidate is timed as the shortest of three runs after one run
that is not timed, and the probe stops at the first candidate over the
budget. The proposal names the sizes it timed and what each took
against the budget. Nothing changes until "Apply" is pressed, which is
a change like any edit: the two limits are set and what depends on them
follows
([How the settings bound each other](#how-the-settings-bound-each-other)).
The probe runs only when pressed, and the page waits while it runs. It
measures time alone, not memory.

## Defaults and resets

Beside the name of a setting that is off its default, a "default …"
link names the default and restores it, and "Reset all settings" at the
foot of the panel restores every default. A reset is a change like any
other, and what depends on the reset setting follows it as after any
change ([How the settings bound each other](#how-the-settings-bound-each-other)).
The settings are kept by the browser and survive a reload.

## How the settings bound each other

A setting is **clamped** when its value is held to the nearest end of a
range that another setting sets: the panel does not accept an edit past
the range, and when the bounding setting moves, the dependent setting
moves with it to the nearest end of its new range, and the panel says
so beneath it. The bound runs one way, down a chain. A change to a
setting never moves the setting above it, so a limit, a cost bound you
set, is never raised unasked. A clamped value stays clamped, so moving
the bound back afterwards does not restore it.

The chain runs from the significand limit down to the extended count.
The extended count has two bounds: the precision limit above it is its
ceiling, and the display digits beside it are its floor. The ratio
width and the probe budget have fixed ranges and stand outside the
chain.

```
significand limit
└── precision limit      at most what the significand limit allows
    ├── display digits   at most the precision limit
    └── extended count   at most the precision limit, at least the display digits
```

After any change, the clamps run down the chain in this order:

1. The precision limit is clamped to the most the significand limit
   allows ([Precision limit](#precision-limit) says why).
2. The display digits are clamped to the precision limit.
3. The extended count is clamped between the display digits and the
   precision limit: it is raised when the display digits rise above it,
   and lowered when the precision limit falls below it.

So lowering the significand limit can lower the precision limit, which
can lower the display digits and the extended count in turn, and
raising the display digits above the extended count raises the count
with them.
