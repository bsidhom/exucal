# Exucal

An offline-first progressive web app (PWA) that converts units, in the
spirit of GNU units: type a quantity you have (`3 ft`) and a unit you want
(`in`), and it answers `3 ft = 36 in`; want a list of units (`ft;in`) and
it answers `1 m ≈ 3 ft + 3.3700787 in`. As GNU units does, it also
answers the other way round: `3 ft = 36 in` and then `in ≈ 0.027777778 ×
3 ft`. That goes with a conversion into one unit only, since a sum over a
list has no other way round. A button beside each answer copies it, units
and all, as text the app itself reads back: `36 in`, or `0.027777778 *
3 ft` for the other way round, so that an answer pasted into "You have"
is the quantity it showed. The app can be
installed to the home screen and works without a network connection once it
has been loaded once.

These pages describe the app from the user's side:

- [Settings](settings.md): the display digits, the rounding, the exact and
  decimal modes, the notation, the working digits, the two limits and the
  probe, and how a number is held.
- [Unit definitions](definitions.md): what the definitions file contains,
  its format, the rules for names, the expression language, unit lists and
  user-defined functions.
- [Functions in expressions](functions.md): the built-in functions, and
  what happens with very large results.

The developer's documentation is in [`devdocs/`](../devdocs/README.md).
