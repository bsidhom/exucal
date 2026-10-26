# Exucal

Exucal is a calculator that runs in the browser and makes one
guarantee: it computes exactly wherever it can, or else shows only the
digits it has certified, in its arithmetic and in its functions alike,
the elementary ones and the special ones that matter most in
combinatorics, probability and physics. Through every calculation and
conversion it keeps track of units and of kinds, the markers that keep
an angle apart from a plain number, so that a mismatch is an error and
never a number.

The pages of the user documentation, in reading order:

- [Getting started](getting-started.md): a tour by example through a
  first calculation; conversions; unit lists, one measure written in
  several units such as feet and inches; readings on a scale such as
  degrees Celsius; inexact values; and a settings change. It ends with
  what you see when something fails, whether an error or a refusal of
  a value too big to hold.
- [Numbers](numbers.md): exact and inexact values; the digits you can
  trust, and how the calculator certifies them; comparison and
  equality; values that cannot be told from a zero or a pole; exact
  mode, the default, and decimal mode, which rounds every step as a
  hand calculator does; `approx`, the one function whose purpose is to
  make a value inexact; rounding; the size limits; and how the
  calculator writes a number.
- [Quantities](quantities.md): units, dimensions, kinds and
  conformance; what a conversion into one unit, into a unit list or
  into a function answers with; and why a temperature reading is a
  function and not a unit.
- [The expression language](expressions.md): how a number, a name, an
  operator and a call are each typed and how they combine, and what
  goes into the calculator's two fields, one for the quantity you have
  and one for what to measure it in.
- [The definition language](definitions.md): the format of the
  definitions file, the text file that the calculator loads as it
  starts and that defines every unit it knows, and the semantics of
  each of its six forms of definition. A definition is a primitive, a
  prefix, a unit, a unit list, a function or an inverse.
- [Units](units.md): a guide to what the definitions file defines, by
  system and by family, and which conversion factors are exact.
- [Settings](settings.md): the settings, each by what it sets, and how
  one setting limits the range of another.
- [Built-in functions](builtins.md): the functions the calculator
  computes in code, by family, with the exact cases of each and what is
  not provided.
- [The app](app.md): installing, which is optional; offline use;
  updates and the build ID; the settings panel; copying a result; and
  which of the two fields an error marks.

The [developer documentation](../devdocs/README.md) is in `devdocs/`.
