# Settings

The settings open from the cog in the top right corner, as a sheet
over the page that leaves the result in view: on a phone a panel that
slides up over the lower part of the screen, which its handle drags
taller, with the settings scrolling inside it; on a wider screen a
panel along the right edge. Every change applies as it is made, so the
result shows what a setting does while it is changed, and Done, Escape
or the cog closes the sheet. A number typed on a phone is committed
from the keyboard's Done key, and the display digits, the working
digits and the ratio width have − and + buttons beside them. The
settings sit in three groups, by what each is for and in the order of
how often it is touched: how a result is shown (the display digits, the
notation), how it is computed (the mode with what belongs to it under
it, the rounding), and how much it may cost (the two limits and the
probe). Under each control a line opens with the number's range, naming
the setting that bounds it ("From 1 to 1,000 digits, up to the
precision limit"), and says in a sentence what it does; the rest is
here. Beside the name of any setting that is not at its default, a
"default …" link names the default and restores it when pressed, with
what depends on it clamped and told as after any change, and "Reset all
settings" at the foot restores every default; a setting at its default
has no such link, so a glance shows what has been changed. There are
six settings, kept in the
browser so that they survive a reload (under a format version of their
own, so that a later build migrates what an earlier one stored;
`devdocs/settings.md` is the design). The mode carries one more under it, which
one depending on the mode: exact mode the notation its exact values are
written in, decimal mode its working digits. Every number carries its
unit, on screen after the input and in the stored key: the display
digits and the precision limit in decimal digits, the significand limit
in bits, the probe budget in milliseconds (`devdocs/settings.md`, "The model").

- **Display digits** (`displayDigits` in the stored settings): how many
  significant digits an answer is shown with, from 1 up to the
  precision limit; eight by default, as GNU units shows. `1 m` in `in`
  is `≈ 39.370079 in` at eight digits and `≈ 39.3700787402 in` at
  twelve. In decimal mode it is also the digits of every value: a
  number typed with more is rounded to them as it is read, and every
  step is rounded to them unless the working digits are extended, below.
- **Rounding**: one of the seven standard modes; to nearest with ties to
  even by default (`0.125` at two digits is `0.12`; `0.135` is `0.14`),
  which is IEEE 754's default and unbiased over many roundings where
  ties away from zero drift. In exact mode it rounds the last digit
  shown; in decimal mode it rounds every step, the last digit shown with
  it. The directed modes (toward zero, away from zero, up, down) show
  the value on the side they name, so at twelve digits `1 m` in `in` is
  `39.3700787401` rounded down and `39.3700787402` to nearest.
- **Mode**: exact, the default, or decimal. In exact mode every digit
  shown is certain: the app computes at rising precisions until the
  digits asked for are certified, and nothing rounds before the display,
  so `1 / 3 * 3` is `= 1`. In decimal mode every step is rounded to the
  display digits, in the rounding mode, as a hand calculator does, and the
  rounded value is the value: `1 / 3 * 3` at eight digits is
  `= 0.99999999`, and `1 / (1 / 3 * 3 - 1)` is `= -100000000`. Every
  answer in decimal mode is written with `=`, since every value there is
  exact under the mode's rounding. A step is an operation you can see:
  each `+`, `*`, `/` or `^`, each number typed (one with more digits than
  the display digits is rounded to them as it is read), each unit, and each function
  call as a whole, `gamma(4.5)` being computed to whatever precision it
  takes for its rounding to be certified and then rounded once
  (`devdocs/numbers.md`, "Decimal mode"). A value with the digits asked for or fewer is
  exact in either mode (`1 ft` in `in` is `= 12 in`). In the rare case
  that a function's rounding cannot be certified at the precision limit,
  the value is rounded all the same and the line is written with the `≈`
  sign bearing a dot above it, and a note says a step could not be
  certified. The panel offers the modes as two choices, `exact` and
  `decimal`, and says under them what the one in force does.
- **Notation** (exact mode; `mode.notation` in the stored settings,
  `digits` or `ratio` with a width): digits by default. With `ratio`
  chosen, a width appears beside it, twenty by default, and the width
  is the one thing that decides whether a line is a ratio: an exact
  value that is not a whole number is written as a ratio of two whole
  numbers in lowest terms when the two have at most the width in
  digits between them (`1 m = (5000/127) in`, `1 in = (127/50) cm`,
  `m / (3 m) = 1/3`, a unit list as `1 m = 3 ft + (428/127) in`, and
  `in = (1/36) × 3 ft` on the second line of `3 ft = 36 in`); a whole
  number is written entire when it has at most the width in digits
  (`3^20 = 3486784401`, where the digits notation writes
  `≈ 3.4867844e+9` at eight digits); and a ratio that fits only with
  its power of ten factored out is written as the ratio times the power
  (`(1/3) * 1e30 = 1/3 × 1e+30`, which reads back as itself).
  Anything longer is written as a decimal at the display digits, `=` when the
  decimal is exact and `≈` otherwise, and an inexact value is always
  a decimal with `≈` (`sqrt(2) m ≈ 1.4142136 m`): the notation changes
  how an exact value is written, never what is exact. The ratio is in
  parentheses before a unit, since `5000/127 in` would read as
  `5000 / (127 in)`, and bare when nothing follows it. It is a setting
  of exact mode alone, since in decimal mode every value is a decimal
  of the display digits, which its digits write entire; choosing decimal
  mode and coming back finds digits again. `devdocs/notation.md` is the design.
- **Working digits** (decimal mode, under the mode in the panel;
  `mode.working` in the stored settings, locked to the
  display digits or `extended` with a count): locked to the display
  digits by default, under which every step is rounded to them. With
  `extended` checked, a count from the display digits up to the
  precision limit appears, and every step but the last is rounded to
  that many digits while the answer is rounded to the display digits
  directly from the exact result
  of its last step, as a calculator keeps hidden digits behind its
  display: `ln(exp(1/10))` at eight digits is `= 0.099999984`, the
  first rounding's error having been amplified, and over twelve working
  digits it is `= 0.1`; `1 / 3 * 3` is `= 0.99999999` and `= 1`. Under
  a directed rounding mode the answer is the neighbor of a value that
  sits on the grid, as that mode asks (`0.099999999` toward zero), since
  the working digits change what is rounded, never how.
  `devdocs/numbers.md` ("The working digits") is the design.
- **Precision limit**, in digits (`precisionLimitDigits` in the stored
  settings): the most digits any grid may be asked for ("How a number
  is held" below says what the grid is), 1,000 by default: the precision limit on
  the display digits and on the working digits, and through the finest
  grid the app rounds onto, four times this plus ten digits (4,040 by
  default), a limit on effort. To certify an answer, exact mode rounds
  onto finer and finer grids up to that one, and an expression whose
  digits can never be certain (`(2^(1/2))^2 - 2`, which is zero within
  a bound) runs all the way up on every keystroke; in decimal mode a
  step's rounding is certified on grids up to the same one. The panel's
  line says the limit's own top under the significand limit and the
  finest grid as numbers, never as a formula. Changing it rebuilds the
  unit table, since the angle units carry `pi()` to that grid; changing
  the display digits never does.
- **Significand limit**, in bits (`significandLimitBits` in the stored
  settings): a value is a significand, a numerator over a denominator
  in lowest terms, times a power of ten, and this is the most bits the
  numerator and, separately, the denominator may have, 65,536 by default
  (a numerator or a denominator of about 19,700 digits; a ratio such as
  `1/3` has no digit count of its own). It is a hard limit on cost, in
  time and in memory, not on how large a value may be: the power of ten
  is free (`10^1000000000` is `1e+1000000000`, and only its exponent,
  bounded at `10^18` either way, is counted), while a fraction with a
  power of two in its denominator is stored with fives instead, so
  `2^-30000`, a 30,000-bit value, costs 69,658 bits. That is the one
  case where the cost is more than the value's own bits, by a factor of
  about 2.3 at most, and it only matters for a value already within
  that factor of the limit: a number that simple by its factors is
  still a big number by its digits (`3^-100000` costs its 158,497 bits
  under any way of storing it as digits), and `approx` is the way to
  compute with one, as below. The limit is what makes `3^1000000000`
  an error rather than a hang. The limit is strict: no exact value past
  it is ever formed, and an operation predicts the size of its result
  before forming it. When a result would need a significand
  past the limit, the app refuses that part of the expression, names
  it and says how many bits it would need, exactly or about, where the
  operation knows. Where the operation that refused expects the same step to fit
  when computed inexactly, the message suggests what to try: `approx(…)`
  around the operand it names, so that the part is computed to the
  digits asked and shown with `≈` instead of `=`, or decimal mode, which
  rounds every step and so never holds the exact value. Where the
  operation expects the value to pass the limit however it is computed,
  a built-in whose value needs more bits than the limit holds even
  rounded (`factorial(20000)`, `sin` of an angle whose reduction passes
  the limit), a literal of more digits than the limit, a power whose
  exponent cannot be formed within it (`2^1e-30000`), the message says
  so and suggests nothing; what a higher limit would need is the user's
  to judge. The suggestion is the operation's expectation, not a
  promise. In exact mode the app never rounds an exact value on its
  own.
  The finest grid must fit inside it, so it also bounds the precision
  limit: 2,453 digits at the default.
- **Probe budget**, in milliseconds (`budgetMs` in the stored settings):
  the time the probe below allows one pass, 50 by default, from 10 to
  10,000.

The limits are set top-down: the significand limit bounds the precision
limit, the precision limit the display digits, and the two of them the
working digits. An edit within a setting's range is accepted; one past
a bound is refused, and a line under the input names the bound and the
setting that sets it ("at most 2,453 digits under the significand
limit"). An accepted edit that lowers a limit lowers what depends on it,
and a line under each setting moved says so ("lowered from 1,000 to 26
digits to fit the significand limit"), until the next change: the
bounding setting always wins, since a limit is a cost bound the user
set and an edit to a dependent must not raise it unasked. The defaults
are the app's and depend on no device. Both limits are cost limits whose
right values do depend on the device, so the panel's "Measure this
device" button times the costliest exact product and the costliest
built-ins at rising sizes, within the probe budget a pass, and proposes
the largest significand limit and precision limit at which each stays
within it, so that an expression that runs to the finest grid answers
within a keystroke; the proposal shows the sizes and the timings it
found, and nothing changes until "Apply" is pressed. The probe runs only
when pressed, on the main thread, for a fraction of a second.

Tapping the build number in the footer asks at once whether a new version
of the app has been deployed, rather than waiting for the app's own checks
(see devdocs/offline.md); the footer says "checking…" and then what
the check found: "up to date", "downloading…" while a new version
downloads, then the "update to …" link that switches to it, or "couldn't
check (offline?)". The build number is plain text in development or in a
browser without service workers, which have no service worker to ask.

An answer shows every digit asked for when the computation can vouch for
them all. When it cannot, a note in parentheses says what the digits are
worth: how many of them are certain ("8 of 12 digits are certain"), that
the value is zero within a bound ("within 2e-30 of zero", the value
written `0` whatever the sign of the noise it is within), or that none
is certified.

An answer is written with `=` when it is exact and every digit it has is
shown (`1 in = 2.54 cm`, `3 ft = 36 in`), and with `≈` when digits were
rounded away or when a step of the computation was inexact: `1 m ≈
39.370079 in`, and `2^(1/2) m` in `2^(1/2) m` is `≈ 1`, since the two roots
were each computed to a finite number of digits, however exactly they
cancel. A value that cannot be told from zero at any precision up to the
ceiling (`(2^(1/2))^2 - 2`) cannot be divided by, and the app says so.

## How a number is held, and what the settings touch

A value is a fraction times a power of ten: `2.54` is `254/100`, kept as
`127/50`, and `1e999999999` is `1` times `10^999999999`. The fraction is
exact, so `1/3` is one over three and not a string of threes, and the
power of ten is a separate exponent, so a value's magnitude costs
nothing. Every value also carries a radius, a bound on how far the
number held may lie from the number meant. An exact value has radius
zero, and `=` means that. A value with a nonzero radius is inexact, and
in exact mode it arises in exactly two ways: an inexact function (a
root, `exp`, `sin`, `pi()`) and `approx`. In decimal mode no value is
inexact: every step is rounded and the rounded value is the value, and
the radius serves only inside a function, to certify its rounding.

The fraction is the value's significand, the part the power of ten
scales, as a float's significand is the part its exponent scales, with
the one difference that here it is a rational rather than a binary
fraction. When a value is rounded, it is not snapped to a nearby
rational: its significand is snapped onto a decimal grid, an integer of
some number of significant digits times a power of ten, and the number
of digits of the grid is the working precision of the arithmetic at
that moment. A rounding adds half a grid cell to the radius, which is
what decides what digits of an answer are certain; a finer grid is
necessary for more certain digits and never sufficient, since
cancellation keeps `(2^(1/2))^2 - 2` at a radius of a grid cell on every
grid. The two kinds of value are limited by two different things, and
that is why the limits come in two units.

- **An exact value is limited by the significand limit, in bits.** `1/3`
  is small, `3^100000` is not, and what it costs to store and multiply
  is the bits of its numerator and denominator. The significand limit
  bounds each of them, and nothing else touches an exact value in exact
  mode: it is never rounded, and no digits setting applies to it. The
  display writes as many of its digits as the display digits ask for
  and marks the rest rounded away with `≈`.
- **An inexact value is limited by the precision limit, in decimal
  digits.** What is known of it is its midpoint within its radius, and
  the app keeps the midpoint on a grid, rounding it after every step and
  adding the rounding to the radius, so that an inexact number never
  grows past what its radius makes meaningful. The grid is decimal
  because the exponent is decimal: a midpoint rounded to `w` digits is
  an integer of `w` digits times a power of ten, the smallest form the
  type has, and it is what the display writes, so the digits shown and
  the digits computed are the same kind of thing. The functions
  themselves work in binary, at the bits those digits are worth plus a
  guard, and round their results onto the decimal grid on the way out.
  A grid point is itself a significand, an integer over one, so it must
  fit inside the significand limit: that is how the two limits meet.

In exact mode, the display digits are how many digits of the answer
must be certain before it is shown, and the app raises the grid of the
inexact values, pass by pass, until the two ends of the ball round to
the same digits. The precision limit is how far it may raise them, four
times the limit plus ten, which is also the most digits an answer may
be asked for. In decimal mode every step is rounded onto the grid of
the display digits (or the working digits), exact values included, and
is exact after it; a function's value is computed on finer grids, up to
the same ceiling, until its rounding onto that grid is certified, so the
precision limit bounds the display digits and the working digits and
bounds that certification. In both modes, the significand limit is the
one limit on exact values, and it also bounds the precision limit, since
a grid point at the ceiling must fit within it with room for a product
of two: at 65,536 bits the precision limit may be 2,453 digits.

**Why four times the limit plus ten.** The schedule of passes, and why its factor is four and its guard ten, are explained in `devdocs/numbers.md` ("Working precision and the schedule").
