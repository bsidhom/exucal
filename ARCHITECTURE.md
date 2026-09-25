# Architecture

A unit converter inspired by GNU units. The user types a quantity to convert
(**have**) and a unit to convert it to (**want**); the app answers with the
converted value, or with an error saying why the two do not conform.

GNU units is the source of the conceptual patterns: a definitions file that
defines every unit in terms of others down to a few primitives, an expression
language that serves both the definitions and the input, and the have/want
interaction. It is not a specification. Where this design borrows a rule from
GNU units it says so, and where it diverges in grammar (a number may only
start a product; a name is never split into a unit and an exponent) or in
behavior (exact rational arithmetic; kinds that keep angles apart from plain
numbers) it does so deliberately, and the GNU units behavior is not a fallback.

Two rules shape everything below:

- **The core is pure.** Every function in `src/core/` maps immutable inputs to
  immutable outputs, with no I/O, no globals and no exceptions across module
  boundaries: failures are returned as `Result` values. The UI is a thin layer
  that calls into it.
- **No third-party runtime dependencies** beyond Lit. Arithmetic is built on
  `bigint`.

## Pipeline

```
definitions text ──parseDefinitions──▶ Definition[] ──buildTable──▶ UnitTable
                                                                        │
have text ──parseExpr──▶ Expr ──evaluate──▶ Quantity ─┐                 │
                                                      ├─▶ convert ──▶ Result<Conversion>
want text ──parseExpr──▶ Expr ──evaluate──▶ Quantity ─┘
                                                              └──▶ format ──▶ string
```

Each arrow is one pure function in its own module. Parsing never touches the
table, evaluation never checks conformance, and conversion never formats.

## Numbers: `Rational`

The number type is an exact rational over `bigint`: a numerator and a
positive denominator, kept in lowest terms. Rationals rather than
arbitrary-precision floats because almost every unit definition is a rational
(`2.54 cm`, `0.45359237 kg`), so conversions are exact and rounding happens
only once, at display time. Decimal literals parse exactly (`1.5e-3` is
`3/2000`). Irrational constants such as `pi` are plain decimal literals in the
definitions file, as in GNU units.

`src/core/rational.ts` provides the arithmetic and comparison, integer powers
and rational powers (through the n-th root), rounding to significant digits,
and conversion to and from decimal text.

### Precision and rounding

Three rules say where, and only where, a value can lose precision:

1. **Exact operations never round.** Addition, subtraction, multiplication,
   division, integer powers and comparisons are exact, and their results are
   as long as they need to be. Nothing in the pipeline rounds an intermediate
   to keep it small.

2. **Inexact operations truncate once, immediately.** The n-th root is the
   only irrational operation in the first iteration; it, and any future
   special function (`ln`, `exp`, trigonometry), takes a `Precision` (a count
   of significant digits), computes its result correct to at least that many
   digits, and truncates it toward zero to exactly that many. The truncated
   value is an ordinary `Rational`, and everything downstream of it is exact
   again. So the number of roundings in a computation equals the number of
   inexact operations in it, and each one is visible in the code as a
   `precision` argument. A root that is rational (`sqrt(9/4)`, `sqrt(2.25)`,
   `cbrt(-8)`) is detected and returned exactly, so `(4 m^2)^(1/2)` is
   exactly `2 m`.

   Truncation rather than rounding to nearest, because truncation composes:
   truncating a truncated value to fewer digits gives what truncating the
   exact value would, so the digits an inexact result carries are always the
   true leading digits of the exact result. `x^(p/q)` is computed as the
   `q`-th root of `x^p`, not the `p`-th power of the root, so that its single
   truncation comes last and the rule holds for it too.

3. **Display rounds to nearest, once.** `format(r, digits)` rounds to
   `digits` significant digits, ties away from zero (the `halfExpand` mode of
   `Intl.NumberFormat`; C's `%g` differs only on exact ties, which are rare
   with doubles but ordinary with rationals: `0.125` at two digits is `0.13`).
   `round(r, digits)` is the same rounding as a `Rational`, so
   `equals(round(r, digits), r)` tells the UI whether what it shows is exact
   (`1 in = 2.54 cm`) or an approximation (`1 m ≈ 39.370079 in`).

**Working precision.** `evaluate` takes one precision and passes it to every
inexact operation; it is a working precision, not the display precision. The
app passes `DEFAULT_PRECISION` (40 significant digits) everywhere, including
when building the unit table, and lets the display precision vary
independently below it (GNU units shows 8 digits). Each truncation is a
relative error below `10^(1-p)`, and the exact operations that follow it
combine such errors at worst additively, scaled by any integer exponent
applied afterwards, so with a display precision that stays well under the
working precision, the truncation errors never reach the displayed digits.
What remains is the double-rounding case: a truncated value can sit on the
near side of a display rounding boundary that the exact value is on the far
side of, if the exact value lies within `10^(1-p)` of the boundary. At 40
working digits this is accepted as unreachable in practice, and it is why the
working precision is fixed high rather than derived from the display
precision.

### Size limits

Exact arithmetic cannot overflow, but it can grow without bound:
`10^(10^9)`, `1e999999999` and `2^(1/999999999)` are all valid input. The
operations whose result can be exponentially larger than their inputs (`pow`,
`root`, and the exponent of a decimal literal) predict the size of their
result from the sizes of the inputs and return `tooLarge` instead of
computing anything beyond `MAX_BITS` (2^16 bits, about 19,700 decimal
digits, at which every operation still takes milliseconds). The operations
that grow their inputs by at most a constant factor do not check: an
expression of bounded length applies a bounded number of them.

### Failures

A value that cannot be computed is a `Result` error, never an exception:
division by zero (including `0` to a negative power), an even root of a
negative number, a result beyond `MAX_BITS`, or text that is not a number.

A violated precondition (a zero denominator passed to the `rational`
constructor, a precision that is not a positive integer, a root degree below
one) is a bug in the caller, not a value that can fail, and throws
`RangeError`, as `1n / 0n` does. Every value that can be zero or negative
because the user typed it reaches the numerics through `divide`, `pow`,
`root` and `powRational`, which report it.

### Formatting

`format(r, digits)` renders a rational as a decimal string in the style of
C's `%g`: rounded to `digits` significant digits as above, trailing zeros
dropped, and exponent notation when the decimal exponent is below -4 or at
least `digits`, with the exponent written as JavaScript writes it (`1.5e+21`,
`1e-7`). Nothing goes through a `number` on the way, so a value of any
magnitude renders exactly.

## Quantities, dimensions and kinds

Every unit resolves to a quantity: a magnitude, which is a `Rational`, and a
dimension, which is an exponent vector over the primitive units, keyed by
primitive name with zero exponents left out. Exponents are rational so that
roots are exact on the dimension side (`sqrt(m)` is `m^(1/2)`).

Primitives come in two roles, declared in the definitions file:

- **Dimension primitives** (`m`, `kg`, `s`, ...) are the physical base
  quantities.
- **Kind primitives** (`radian`, ...) are dimensionless markers. They ride
  along in the same exponent vector, so no separate mechanism is needed, but
  the conformance check treats them differently.

Conformance between `have` and `want` is checked in two steps:

1. Compare the vectors restricted to dimension primitives. A difference is a
   `DimensionMismatch` (length vs time).
2. Compare the full vectors. A remaining difference is a `KindMismatch`: the
   quantities are dimensionally compatible but semantically different, and the
   error names the kind primitives that differ.

So `rad/s` does not conform to `Hz` (`1/s`), because the former carries
`radian^1`. Torque is separated from energy the same way, by defining torque
units with a `/ radian` factor as the SI brochure suggests. Which kinds exist
is entirely a matter of the definitions file; the core has no list of them.

## Definitions

System units are not special: they live in a static definitions file that is
bundled into the app (a raw string import, so it is precached with the rest of
the build) and go through the same parser as any user-supplied definitions.
`buildTable` takes one list of definitions, so user definitions are simply
appended to the system ones.

The format is in the spirit of a GNU units file, pared down: one definition
per line, name then whitespace then body, `#` comments. The whitespace after
the name is required, so that `inch2.54 cm` is an error rather than a
definition of `inch2`.

```
m         !                 # dimension primitive
radian    !kind             # kind primitive (dimensionless)
kilo-     1000              # prefix (trailing dash)
inch      2.54 cm           # unit, defined by an expression
newton    kg m / s^2
hertz     1 / s
```

A definition is one of three things: a primitive with its role, a prefix
(named without its dash) with a body, or a unit with a body, where a body is
an expression. `parseDefinitions` returns them in the order written,
duplicates included, and knows nothing about what they mean. Every span is an
offset into the whole text, not the line: a definition carries the span of
its text from name to body, for the errors `buildTable` reports against a
definition as a whole (a duplicate name, a cycle, a prefix that is not
dimensionless), and the spans inside its body serve the errors within it.

`buildTable` evaluates each body to a quantity, resolving references on
demand with memoization and a visiting set, so definitions may appear in any
order and cycles are reported rather than looping. Prefix bodies must be
dimensionless. The result is the unit table: the primitives with their roles,
the prefixes with their factors, and the units with their quantities, each a
map keyed by name.

A name in an expression resolves to an exact unit name if there is one, and
otherwise to one prefix followed by a unit name. Prefixes do not stack, and
there is no plural handling: `inches  inch` is an ordinary alias definition.

Every name is known once the table is built, so ambiguity is a property of the
table rather than of the input, and `buildTable` checks for it. A name with
two different prefix-unit splits (`d`+`am` against `da`+`m`, were `am` a unit)
is a build error, so a table that builds has at most one split per name. A
unit name that is also a valid split (`min`, the minute, against `m`+`in`) is
allowed, because real unit conventions are full of them, and the exact name
wins. The check is cheap: for each pair of prefixes where one extends the
other, and each unit, one map lookup.

## Expressions

One grammar serves both definition bodies and user input, so anything that can
be typed can also be defined. It is a small expression language: decimal
numbers, unit names, juxtaposition and `*` for multiplication, `/`, `^` with
a literal exponent, and parentheses. The precedence follows GNU units:
juxtaposition binds tighter than `*` and `/`, which are one left-associative
level, so `kg m / s^2` is `(kg m) / (s^2)` and `m/s*s` is `(m/s)*s`. No
functions, unit lists or `+`/`-` yet.

Juxtaposition means "this many of these units" (`2 m`) or a product of units
(`kg m`), so a number may only be the first factor of a product: `m 2`,
`1 2 3` and `2 3 m` are errors, and multiplying numbers is written with `*`.
In the tree it is an ordinary multiplication, indistinguishable from `*`.

An exponent is a signed decimal (`m^2`, `s^-1`, `m^0.5`) or a parenthesized
rational (`m^(1/2)`), never an expression, so it is known at parse time and
travels in the tree as a `Rational`. A unit name is a letter or underscore
followed by letters, digits and underscores, in any script, taken as long as
it goes: `m2` is one name rather than `m` beside `2`, and whether a name
means anything is decided by the table, not the parser. Whitespace is spaces
and tabs, never a newline, because a definition body is one line.

The tree has four kinds of node: a number, a unit name, a multiplication or
division of two subtrees, and a subtree raised to a rational exponent. Every
node carries the span of text it came from, so an error found later in the
pipeline (an unknown unit, a dimension mismatch) can point back at the input.
`parseExpr` knows nothing about units, and `evaluate` knows nothing about
text. `Span` and `ParseError` come from the parsing toolkit below, which both
parsers are built from.

## Parsing

Both parsers are assembled from a small set of parser combinators in
`src/core/parser.ts`. A parser is a plain function from the input text and a
position to a reply: the value it recognized and the position just past it,
or an error. A grammar is plain code that combines parsers into parsers, with
primitives for literals, patterns and the end of input, and combinators for
sequencing, ordered choice, repetition, one left-associative precedence level
(`chainl1`), attaching spans (`spanned`), validating a recognized value
(`check`) and self-reference (`lazy`). The types carry the grammar's shape: a
sequence of parsers is a parser of a tuple and a choice is a parser of a
union, so a grammar that type-checks produces the tree its types say it does.

We chose combinators instead of a hand-written recursive-descent parser or a
Pratt (top-down operator precedence) parser because the grammars are small
and fixed. The expression language has a handful of precedence levels, each
of which is one `chainl1` (or `many`, for juxtaposition) over the level
below, and the definitions file is a line with two or three fields. A Pratt
parser is general: it drives a table of operators with numeric binding powers
from a loop whose invariant has to be checked. That generality buys nothing
here, while a combinator grammar is checked by reading it against the grammar
it transcribes. Should the language ever need user-defined or many-levelled
operators, a Pratt loop can be written with `flatMap` on the same primitives,
without changing them.

Three properties make the combinators simple to reason about:

- **`alt` is ordered choice, and the only backtracking is local.**
  `alt(a, b)` tries `a`; if `a` fails, however far into the input it got
  before failing, the position is rewound and `b` is tried from the same
  place. The first alternative that matches is taken for good: a failure
  later in the parse never reopens an earlier choice to try its remaining
  alternatives, so the parser never searches a space of parse trees.
  "Backtracking" here means only that rewinding, which is what lets an
  alternative be written without lookahead: an optional exponent, written
  `optional(seq(string("^"), exponent))`, may consume the `^` before finding
  no exponent, and still cleanly matches nothing.

  That makes the cost easy to bound. The work of a parse is the number of
  primitive (`string`, `regex`) matches attempted. Text is read more than
  once only when an alternative fails after consuming some of it and the next
  alternative reads the same text again. That is the exponential case of
  unmemoized ordered choice: `alt(seq(p, a), seq(p, b))` parses `p` twice,
  and nesting that pattern `k` deep parses the innermost `p` `2^k` times. Our
  grammars never share a prefix between alternatives. At every `alt`, the
  alternatives are told apart by their first character (a digit, a letter,
  `(`, or an operator symbol), so all but at most one of them fail on their
  first primitive, at constant cost. The one way an alternative fails after
  consuming input is an operator with nothing valid after it (`3 m ^`), which
  rewinds by one token and is followed at once by a failure at that token. So
  each character is consumed by exactly one primitive, each failed alternative
  costs one primitive attempt, and a parse costs a constant number of
  primitive attempts per token, times the depth of the grammar for passing
  each reply up through the enclosing combinators. A hundred-character line
  is a few hundred primitive attempts. The discipline that keeps this true,
  and that any new grammar built on these combinators must follow, is that
  the alternatives of one `alt` begin with different tokens, and repetition
  is expressed with `many`, `many1` or `chainl1` rather than with a
  recursive alternative.

- **Every reply carries the furthest expectation.** An `Expectation` is a
  position and the labels of the primitives tried there. Not only failures but
  successes carry one, and every combinator keeps whichever of its parts got
  furthest (merging the labels of those that tie), so the error reported for a
  parse is where the parser got furthest and what it wanted there, whatever
  alternatives it undid afterwards. This is what makes the error for `3 m ^` say
  "expected a number" after the `^`: the optional exponent fails there, the
  parser backs out of it, the product ends, and `eof` fails earlier at the
  `^`; the furthest expectation survives. Without it, backtracking parsers
  report the position where the outermost rule gave up, which is usually not
  where the mistake is.

- **Rejection is final.** `check(parser, validate)` turns a recognized value
  into a `rejected` error carrying its span and a reason when `validate` says
  so, and no combinator retries past a rejection: the text was understood and
  found unacceptable, not misread, so trying another reading would only
  produce a worse error. This is how a numeric literal that `parseDecimal`
  reports as `tooLarge` becomes a parse error pointing at the literal.
  `check` is the only source of `rejected` errors.

A parse error is therefore one of two things: nothing acceptable at a
position, with the labels of what would have been, or text at a span that was
recognized and rejected, with the reason. Spans are attached with `spanned`
on the leaves, and a composite node spans from its first child to its last.

The combinators are pure: a parser is a closure over its configuration and a
function of `(text, pos)`. The two pieces of mutable state are internal and
unobservable: `regex` reuses one sticky `RegExp` whose `lastIndex` it sets
before every use, and `lazy` memoizes the parser it builds. `many` of a
parser that matches the empty string would loop forever; that is a bug in the
grammar, not an input that can fail, and it throws.

## Conversion

`convert` takes the two quantities and returns the output value: how many
`want`s make up `have`, which after the conformance check is simply the ratio
of their magnitudes, since each quantity already carries its own scale.
`want` may have a magnitude (`3 ft` into `in` gives `36`), as in GNU units.
A failure is a dimension mismatch or a kind mismatch, carrying both dimension
vectors; a core function formats a dimension as text (`m^2 / s`), so the UI
can explain the failure without interpreting anything itself.

Every failure in the core is a `Result`: a discriminated union of a value or
an error, with each module defining its own error type.

## UI

`<unit-converter>` is a Lit component with two text inputs and an output area.
Its only state is the two strings; on every change it runs the pipeline and
renders either the formatted result or the error. `<app-shell>` hosts it. The
`UnitTable` is built once at startup from the bundled definitions and passed
down as a property.

Because the core's whole surface is `(table, haveText, wantText) → Result`
plus the table itself, richer UX later is a matter of new components that
edit the same two strings or read the table: autocomplete lists
`table.units` and `table.prefixes`, unit buttons insert text, and error spans
drive highlighting. None of that needs changes to the core.

## Layout

```
src/core/rational.ts      Rational, arithmetic, root, parsing and formatting
src/core/dimension.ts     Dimension arithmetic, conformance check, formatting
src/core/parser.ts        Parser combinators, Span, ParseError
src/core/expr.ts          Expr, parseExpr
src/core/definitions.ts   Definition, parseDefinitions
src/core/table.ts         UnitTable, buildTable, name lookup
src/core/evaluate.ts      evaluate
src/core/convert.ts       convert
src/core/result.ts        Result; each module defines its own error types
src/units.txt             the system definitions
src/unit-converter.ts     the component
```

Each core module has a `*.test.ts` beside it, run by `pnpm test`.

## Later

Planned extensions, listed to show that they fit without reshaping the core:

- **Functions** (`tempC(x)`, `ln`) add a `call` node to `Expr` and a function
  definition form; each function takes and returns a `Quantity` and a
  `Precision`.
- **Unit lists** (`ft;in`) are a second output mode over the same
  `convert`.
- **User definitions** are already supported by `buildTable`; only storage and
  an editor are missing.
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request) is a flag
  to `convert` that skips step 2 of the conformance check.
