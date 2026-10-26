# Exucal

The pages of the user documentation, in reading order:

- [Getting started](getting-started.md): a tour by example, through a
  first calculation, conversions, unit lists, readings, inexact values,
  a settings change and what you see when something fails. A unit list
  gives one measure in several units, such as feet and inches. A
  reading is a value on a scale, such as degrees Celsius. A failure is
  an error, or a refusal of a value too big to hold.
- [Numbers](numbers.md): exact and inexact values, and the digits you
  can trust. How the calculator certifies a digit, how it compares
  values, and what happens at an edge such as a division by zero or a
  pole. The two modes: exact mode, the default, and decimal mode,
  which rounds every step as a hand calculator does. `approx`, the one
  function whose purpose is to make a value inexact. The rounding
  modes, the size limits that refuse a value too big to hold, and how
  the calculator writes a number.
- [Quantities](quantities.md): units, dimensions and kinds; and
  conformance, the test two quantities must pass to be added or
  converted. A kind keeps apart quantities that would otherwise look
  alike, such as an angle and a plain number. What a conversion gives,
  whether into one unit, a unit list or a function such as the one
  behind a temperature reading. Why such a reading needs a function
  and not a unit: a reading on a scale is not a multiple of anything.
- [The expression language](expressions.md): how a number, a name, an
  operator and a call are each typed, and how they combine. What goes
  into the calculator's two fields, one for the quantity you have and
  one for what to measure it in.
- [The definition language](definitions.md): the format of the
  definitions file and the semantics of its six forms of definition.
  The definitions file is a text file loaded as the calculator starts.
  It defines every unit the calculator knows. A definition is a
  primitive, a prefix, a unit, a unit list, a function or an inverse.
- [Units](units.md): a guide to what the definitions file defines, by
  system and by family, and which conversion factors are exact.
- [Settings](settings.md): the settings, each by what it sets, and how
  one setting limits the range of another.
- [Built-in functions](builtins.md): the functions the calculator
  itself provides, by family, as against those the definitions file
  defines; the cases where each is exact; and what is not provided.
- [The app](app.md): installing, which is optional; offline use;
  updates and the build ID; the settings panel, as against the settings
  themselves; copying a result; and which of the two fields an error
  marks.

The [developer documentation](../devdocs/README.md) is in `devdocs/`.
