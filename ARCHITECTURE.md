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
want text ──parseUnitList──▶ Expr[] ──evaluate──▶ Quantity[] ─┘   (or convertToList)
                                                              └──▶ format ──▶ string
```

Each arrow is one pure function in its own module. Parsing never touches the
table, and conversion never formats. Evaluation checks conformance in the
operands of a sum and the argument of a call, and with the same check that
conversion applies to the pair. The `want` is read as a unit list, of which
one expression is a list of one: one unit goes through `convert`, several
(or the name of a list the table defines) through `convertToList`, which
"Unit lists" below describes, and the name of a function the table defines
through `invertFunction`, which "Functions" below describes.

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

`src/core/dimension.ts` holds the dimension arithmetic (multiplication,
division and raising to a rational power, with exponents that cancel to zero
dropped), the conformance check and the formatter. The check takes the
primitives with their roles from the table, in declaration order, so the kinds
a `KindMismatch` names come out in that order; a name the table does not
declare counts as a dimension primitive. A dimension formats in the expression
language itself: the primitives in declaration order, those with positive
exponents first and those with negative ones after a `/` (`kg m^2 / s^3 A`,
which the grammar reads as `(kg m^2) / (s^3 A)`), `1` standing in for an
empty numerator, and a non-integer exponent parenthesized (`m^(1/2)`). So what
the UI shows in an error is something the user could type back.

`src/core/quantity.ts` holds the `Quantity` type itself, and is the layer
that pairs the two below it: a `Rational` from `rational.ts` and a
`Dimension` from `dimension.ts`, neither of which knows about the other. The
table stores quantities, the evaluator produces them, and the converter
consumes them. The arithmetic the evaluator needs lives here as well:
multiplication, division and raising to a rational power, each a magnitude
operation beside the matching dimension operation. Only the magnitude can
fail (a zero divisor, `0` to a negative power, an even root of a negative
number, a result beyond `MAX_BITS`), so the failures are those of
`rational.ts`, and the power is the one operation that takes a `Precision`,
for the root of a non-integer exponent. Negation touches the magnitude alone
and cannot fail. Addition and subtraction are the
other way about: the magnitudes always combine, but only quantities of one
dimension have a sum, so the dimension side is the conformance check above,
the sum has the dimension its terms share, and the failure is a
`ConformanceError`. Since that check tells dimensions from kinds by the
roles of the primitives, these two operations take the primitives as
`convert` does; `1 rad + 1` is a kind mismatch and `1 m + 1 s` a dimension
mismatch, exactly as the same pair would be as `have` and `want`. There is
no special case for zero: `0` is a plain number, and `1 m + 0` is a
mismatch, as in GNU units.

## Definitions

System units are not special: they live in a static definitions file,
`src/units.txt`, that is bundled into the app as an asset of its own (a URL
import, so it is emitted beside the scripts and precached with the rest of
the build, and fetched when the app starts) and go through the same parser
as any user-supplied definitions. `buildTable` takes one list of definitions, so
user definitions are simply appended to the system ones.

The format, the name rules and the expression language are user-facing, so
README.md ("Unit definitions") describes them, along with what the system
file contains and how to add to it. This section covers what the core does
with a definitions file. In short, the format is in the spirit of a GNU
units file, pared down: one definition per line, name then whitespace then
body, `#` comments, where a name with a trailing dash is a prefix and a body
of `!` or `!kind` declares a primitive. The whitespace after the name is
required, so that `inch2.54 cm` is an error rather than a definition of
`inch2`. `src/units.test.ts` builds the system file and checks a sample of
conversions from each of its sections.

A definition is one of five things: a primitive with its role, a prefix
(named without its dash) with a body, a unit with a body, where a body is
an expression, a unit list, whose body is two or more expressions
separated by `;` (a body of one is a unit), each kept with the text it was
written as, since that text is what the UI shows beside its term and the
table has no other way to get at it, or a function, named with its
parameter in parentheses, whose body declares the units of its argument
and its result in brackets (each kept with its text, as a list's items
are) and then gives the forward body and, after a `;`, the inverse body
("Functions" below). `parseDefinitions` returns them in the order written,
duplicates included, and knows nothing about what they mean. Every span is an
offset into the whole text, not the line: a definition carries the span of
its text from name to body, for the errors `buildTable` reports against a
definition as a whole (a duplicate name, a cycle, a prefix that is not
dimensionless), and the spans inside its body serve the errors within it.

`buildTable` evaluates each body to a quantity, resolving references on
demand with memoization and a visiting set, so definitions may appear in any
order and cycles are reported rather than looping. Prefix bodies must be plain
numbers: no dimension and no kind. The result is the unit table: the
primitives with their roles, the prefixes with their factors, and the units
with their quantities, each a map keyed by name in declaration order. The
primitives are among the units, as quantities of one of themselves, so that a
lookup is one map read. The primitives with their roles are collected from
the definitions before any body is evaluated, because a body that is a sum
needs them to check its operands, and a body may refer to a primitive
declared after it.

Prefixes and units are separate namespaces, so `m-` (milli) and `m` (the
metre) coexist, while a primitive and a unit share one. A name in an
expression resolves to an exact unit name if there is one, and otherwise to
one prefix followed by a unit name (the rule README.md states for users).
Prefixes do not stack, and there is no plural handling: `inches  inch` is
an ordinary alias definition.

Unit lists share the unit namespace (a list and a unit of one name are a
duplicate) but are not units: no expression can refer to one, so they stay
out of the walk, and each is evaluated in its place in the order, item by
item, through the same lookup a body uses, requesting what it refers to
from the top of the walker (which can never close a cycle). Since a list's
name means the list only as a bare `want`, while a unit's name means the
unit everywhere, a list's name that also reads as a prefix followed by a
unit (`ms`) would make one text mean two things in the two fields, and the
build rejects it once the ambiguity check has passed. A list's units are
checked as `convertToList` checks any list, against the first of them, so
that a defined list can fail to convert only for not conforming to the
`have`. The table holds each list as its units with their texts, apart from
the units.

Functions share the unit namespace as lists do, and their names are held
to the same rule against reading as a prefixed unit, for the same reason.
Unlike a list, a function can be referred to, by a call in any body, so a
function is a node of the walk, and evaluating it means checking it
("Functions" below): its declared units are evaluated, its forward body is
evaluated with the parameter bound to one of the declared argument unit
and its inverse body with the name bound to one of the declared result
unit, through the walk's own lookup, and each body is checked to conform
to what it should give. A unit may then be defined by a call
(`boiling  tempC(100)`), a function's body may call another, and a cycle
through a function is reported like any other. The table holds each
function as its two bodies, still as expressions, with the declared units
and their texts: a call evaluates the forward body afresh, through the
table's lookup.

Every name is known once the table is built, so ambiguity is a property of the
table rather than of the input, and `buildTable` checks for it. A name with
two different prefix-unit splits (`d`+`am` against `da`+`m`, were `am` a unit)
is a build error, so a table that builds has at most one split per name. A
unit name that is also a valid split (`min`, the minute, against `m`+`in`) is
allowed, because real unit conventions are full of them, and the exact name
wins. The check is cheap: for each pair of prefixes where one extends the
other, one map lookup per unit that starts with the extension, found in an
index of the unit names, which for most extensions (`icro`, `eci`) is no
unit at all.

Building is four concerns in four modules. `table.ts` holds the `UnitTable`
itself and the lookup over it that the evaluator resolves user input against.
`names.ts` holds the resolution rule and the ambiguity check, generic in what
a prefix or a unit maps to, because the build applies the same rule over
definitions before any quantity exists; `name-index.ts` is the index the
check searches, the names sorted so that those starting with any text are
one contiguous run. `graph.ts` is the on-demand
evaluation: a walker takes a function that computes a node's value given a
way to request the values of the nodes it depends on, and memoizes each
result; a request for a node whose evaluation is in progress is a cycle, and
the walker returns it to the requester, which knows where the request came
from. Nothing in it knows what a definition is. `build.ts` puts them together
in a fixed order: index the definitions by name, rejecting a duplicate;
check the index for an ambiguous name; collect the primitives and their
roles; then walk every definition in order, where a body is evaluated by
`evaluate` against a lookup that resolves each name through the index and
requests the definitions it means from the walker, with those primitives.
The first failure ends the build.

A build error is one of: a duplicate name, carrying both definitions; an
ambiguous name with its two splits; a unit list or function whose name
reads as a prefix and a unit, carrying the definition and the split; a
lookup failure at its reference (an unknown name, a function used as a
unit, or a call of what is not a function); a cycle, carrying the
definitions on it in order and the span of the reference that closed it; a
prefix whose body is not a plain number, carrying the definition and the
dimension it has; a unit list whose units do not make a list, carrying the
definition and the list error with the index of the unit at fault; a
function whose body does not conform to its declaration, carrying the
definition, which body, and the mismatch; a function whose declared unit is
zero; or an arithmetic failure from the evaluator, located as the evaluator
locates it. Every span is an offset into the whole definitions text, and a
definition's span covers its text from name to body, so each error points
at something the user can see.

## Expressions

One grammar serves both definition bodies and user input, so anything that can
be typed can also be defined. README.md ("Unit definitions") describes it
from the user's side; this section is about how it is parsed and what the
tree holds. It is a small expression language: decimal
numbers, unit names, juxtaposition and `*` for multiplication, `/`, `+` and
`-`, `^` with a literal exponent, and parentheses. The precedence follows
GNU units: juxtaposition binds tighter than `*` and `/`, which are one
left-associative level, so `kg m / s^2` is `(kg m) / (s^2)` and `m/s*s` is
`(m/s)*s`; `+` and `-` are one more left-associative level below those, so
`1 ft + 3 in` is `(1 ft) + (3 in)` and `2 m * 3 + 1 m` is
`(2 m * 3) + (1 m)`. A `-` before a product negates it, binding tighter than
`*` and `/` and looser than juxtaposition and `^`, so `-2 m` is `-(2 m)`,
`2 * -3` is `2 * (-3)` and `-2^2` is `-(2^2)`, as in arithmetic; it does
not stack, and there is no unary `+`. A unit list, `ft;in`, is one or more
expressions separated by `;`, and is not an expression: `;` binds looser
than anything and cannot appear inside parentheses. `parseUnitList` reads
one, and `expr.ts` exports the list grammar over any item parser, since the
definitions parser wants each item with its text.

A call, `tempC(100)`, is a name directly followed by `(`, an expression and
`)`, and is an atom like a name: `2 tempC(100)`, `tempC(100)^2` and
`-tempC(100)` mean what they look like. The parser decides a call by the
text alone, since it cannot ask the table whether a name is a function,
and the rule is lexical: no space before the `(` makes a call, and a space
makes a product, so `kg (m/s)` stays the product it always was and
`kg(m/s)` is a call of `kg`, which the evaluator rejects with a message
that shows the product with the space. That is the one whitespace-sensitive
rule in the grammar; docs/functions.md weighs the alternative. The tree
holds a call as the name with its own span and the argument.

Juxtaposition means "this many of these units" (`2 m`) or a product of units
(`kg m`), so a number may only be the first factor of a product: `m 2`,
`1 2 3` and `2 3 m` are errors, and multiplying numbers is written with `*`.
In the tree it is an ordinary multiplication, indistinguishable from `*`.

Whether the two sides of a sum can be added is not the parser's concern:
`1 m + 1 s` parses, and the evaluator rejects it. What the parser decides is
where a `-` belongs. A number's literal is read as far as it goes, so `2e-3`
is one number and `2 - 3` a difference, and an exponent's sign is part of
the exponent, so `m^-1` is a power while `m^2 - 1` and `m^2-1` are
differences. Elsewhere a `-` where an operand can start is a negation and a
`-` after an operand is a subtraction, so `2 -3` is a difference and
`2 * -3` a product with a negation. A number is never negative in the tree:
`-2` is the negation of `2`.

An exponent is a signed decimal (`m^2`, `s^-1`, `m^0.5`) or a parenthesized
rational (`m^(1/2)`), never an expression, so it is known at parse time and
travels in the tree as a `Rational`. A unit name is a letter or underscore
followed by letters, digits and underscores, in any script, taken as long as
it goes: `m2` is one name rather than `m` beside `2`, and whether a name
means anything is decided by the table, not the parser. Whitespace is spaces
and tabs, never a newline, because a definition body is one line.

The tree has five kinds of node: a number, a unit name, a binary operation
(a sum, difference, product or quotient) of two subtrees, a negated
subtree, and a subtree raised to a rational exponent. Every
node carries the span of text it came from, so an error found later in the
pipeline (an unknown unit, a dimension mismatch) can point back at the input.
`parseExpr` knows nothing about units, and `evaluate` knows nothing about
text. `ParseError` comes from the parsing toolkit below, which both parsers
are built from; `Span` has its own small module, because it is not a parsing
concept but the vocabulary every later stage uses to locate its errors.

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

## Evaluation

`evaluate` takes an `Expr`, a `Lookup` for unit and function names, the
table's `Primitives` and the working `Precision`, and returns the `Quantity`
the expression denotes. A number is a dimensionless quantity, a unit name
is whatever the lookup says it is, and the operators are the quantity
arithmetic above: juxtaposition and `*` multiply, `/` divides, `+` and `-`
add and subtract, a leading `-` negates, and `^` raises to the exponent the
parser already read. A call resolves its name among the functions, through
the lookup, evaluates its argument, checks that the argument conforms to
the unit the function declares for it, and evaluates the forward body with
the parameter bound to the argument ("Functions" below).
The precision goes to every power, where the root of a non-integer exponent
is the only operation that can lose digits; everything else is exact. The
primitives go to every sum, whose operands must conform: this is the one
place evaluation checks conformance, and it is the same check, with the
same roles, that conversion applies to `have` and `want`, so that what can
be added is exactly what can be converted. The primitives come from the
table for user input, and from the definitions, collected before the walk,
while the table is being built.

Names are resolved through a lookup function rather than a table, because the
same evaluator serves both ends of the pipeline. The table supplies a lookup
over its finished units for the user's `have` and `want`, applying the
prefix-splitting rule described under Definitions; `buildTable` supplies one
that evaluates definitions on demand, with its memoization and visiting set,
while the table is still being built. Each lookup defines its own error type
(an unknown name, a cycle among definitions); `evaluate` takes that type as a
type parameter and returns a lookup failure unchanged. The lookup is given
the span of the reference along with the name, so that its error can point
at the text as the evaluator's own errors do.

Operands are evaluated left to right and the first failure ends the
evaluation, so `bogus / 0` reports the unknown unit rather than the division.
The evaluator's own errors are the arithmetic failures, each located in the
input: a division by zero points at the divisor, since its value is what is
wrong, and a power that fails (`0^-1`, an even root of a negative magnitude,
a result beyond `MAX_BITS`) points at the whole power, since it is the
combination of base and exponent that fails. A sum whose operands do not
conform points at the whole sum for the same reason, and carries the span of
each operand and the `ConformanceError` between them, with the left
operand's dimension as its `have` and the right's as its `want`, so that a
message can say what each side is, in the words a conversion error uses.
A call whose argument does not conform points at the whole call and carries
the argument's span the same way. A call whose body fails for the argument
is one `callFailed` at the call, naming the function and carrying the
body's error, whose spans are into the definitions text; only the
evaluator's own failures are wrapped so, and a lookup failure inside a body
(which a table that built cannot produce) comes back as any lookup failure
does. The evaluator never sees the text: the spans in the tree are all it
knows of it.

## Conversion

`convert` takes the two quantities and the table's primitives (whose roles
the conformance check needs) and returns the output value: how many `want`s
make up `have`, which after the conformance check is simply the ratio of their
magnitudes, since each quantity already carries its own scale. `want` may have
a magnitude (`3 ft` into `in` gives `36`), as in GNU units. The ratio is exact,
so `1 m` into `in` is `5000/127`, and the display is where it becomes
`39.370079`. A failure is a dimension mismatch or a kind mismatch, carrying
both dimension vectors, or a `want` whose magnitude is zero, of which nothing
is a multiple; the conformance check comes first, so `0 s` as the `want` for
a length is reported as the mismatch it is. A core function formats a
dimension as text (`m^2 / s`), so the UI can explain a mismatch without
interpreting anything itself.

Every failure in the core is a `Result`: a discriminated union of a value or
an error, with each module defining its own error type.

### Unit lists

`convertToList` is the second output mode, over the same conformance check:
`have` as a sum over a list of units, largest first, `1 m` into `ft;in`
being `3 ft` plus `3.37 in`. Each unit but the last gets the integer count
of it that fits in what the earlier units left, truncated toward zero so
that every term has the sign of `have` (`-1 m` is `-3 ft - 3.37 in`), and
the last gets the exact remainder, so the terms times the units add up to
`have` exactly. That is only a meaningful sum when the units run from the
largest to the smallest, so the units are checked in order, each for
conformance with `have`, for a positive magnitude, and for being smaller
than the one before it, and the first failure is reported with the index
of the unit at fault. The units need not be multiples of one another
(`mi;km` works) and may carry magnitudes (`ft;in/8`).

The terms are exact, as the ratio `convert` returns is, and rounding them
for display is more than rounding each: a remainder of `11.9999999988 in`
shown at eight digits is `12 in`, which beside `2 ft` reads wrongly. So
`roundTerms` is the display rounding that goes with the sum: it rounds the
remainder to the display precision as `round` does and, when that changes
it, takes the counts again from the rounded sum, so that a remainder which
rounds up to a whole of an earlier unit carries into it, through as many
units as it must (`3599.9999999999 s` in `hr;min;s` is `1 hr`). That is
one rounding of the whole sum, by less than a unit in the last digit of the
remainder, and the second decomposition is exact. The counts are integers
and are left alone; one too long for the display is the display's to round,
as any value is. When the remainder is already exact at the display
precision, the terms come back as they are.

The pipeline reads the `want` as a unit list. One item that is a bare name
of a list in the table means that list, with the texts of its units from
the definition; any other one item is a unit and goes through `convert`;
two or more items are a list typed out, each evaluated as an expression and
paired with its text, sliced from the `want` by its span. A unit of a
typed list that fails the list's checks is reported with the texts of all
of them, so that a message can quote the one at fault; a list from the
table passed those checks when it was built, and can fail only for not
conforming to the `have`, which is reported as the mismatch of the pair, as
for a single `want`, so that the message quotes the name the user typed.

### Functions

A function (docs/functions.md is the design, with the reasoning) is a pair
of bodies with a declaration of the units of its argument and its result.
It exists for readings such as a temperature, which are not multiples of a
unit, without giving `Quantity` an offset that every operation would then
need a rule for; GNU units defines them the same way. Nothing about
functions touches quantities: a call is a quantity like any other once the
forward body has run, and the rest of the expression goes on as before.

The pipeline reads a `want` that is the bare name of a function, after a
list's name and before a unit's, as the third output mode: the answer is
the call that would produce the `have`, `tempF(212)` into `tempC` being
`tempC(100)`. The `have` must conform to the declared result, which is the
ordinary mismatch of the pair when it does not, and `invertFunction`
evaluates the inverse body with the function's name bound to the `have`,
through the table's lookup; the conversion carries the recovered argument,
the declared argument unit with its text, and the argument as a count of
that unit, so that the UI writes it as it writes any value beside a unit.
An inverse body that fails for the value is an `inverseFailed` on the want
side, carrying the body's error as a call carries its body's. A `want`
that is a call is not special: it is an expression, and the conversion is
the ratio, with a reciprocal.

The build checks each function once so that a call at run time can fail
only on its argument or on a value: the declared units are evaluated and
must be nonzero, since an argument is written as a count of the declared
one; the forward body is evaluated with the parameter bound to one of the
declared argument unit and the inverse body with the name bound to one of
the declared result unit, through the walk's own lookup, so that a body
which fails for every argument, or refers to nothing, fails the build with
its span in the definitions text; and each body's dimension is checked
against what it should give, which a body's dimension cannot vary with the
value of its argument. Applying and inverting are one operation, a body
evaluated under a binding, and `applyFunction` and `invertFunction` share
it: the bound name is resolved before any unit or prefix, and the lookup's
failures are boxed on the way in and unboxed on the way out, so that the
body's own failures can be told from the lookup's without the evaluator
knowing the lookup's error type.

## UI

`<unit-converter>` is a Lit component with two text inputs, "you have" and
"you want", and an output area. Its only state is the two strings; on every
change it runs the pipeline and renders either the formatted result or the
error. `<app-shell>` hosts it and owns the `UnitTable`: `src/system-table.ts`
fetches the bundled definitions, parses and builds them on the main thread
(a few milliseconds) and memoizes the result, and the shell starts that load
when it is connected, shows a loading message until the promise settles, and
then passes the table down as a property. Loading the components never waits
on the table. Should the fetch fail, or the file fail to build (which
`units.test.ts` guards against), the shell says so instead of rendering a
converter.

The core's whole surface to the UI is `(table, haveText, wantText) →
Result`, and `src/core/pipeline.ts` is that function: `convertText` parses
and evaluates each text and converts the pair, and returns each step's own
error tagged with the side (`have` or `want`) it came from, so that the
component can mark the input at fault. `evaluateText` is the first half
alone; with the `want` field blank, the component uses it to show what
`have` is in the primitives (`1 in = 0.0254 m`), as GNU units does.

A conversion into a function is one line, the `have` and then the call at
the recovered argument, `tempF(212) = tempC(100)`, the argument written as
a count of the declared argument unit followed by that unit's text as a
`want`'s is written, and by nothing when the declared unit is `1`. There is
no reciprocal line: a call is not a ratio, so there is no other way round,
as there is none for a list.

The output shows the two texts and the value between `=` or `≈`, decided by
`equals(round(value, digits), value)` at the display precision of 8
significant digits (`DISPLAY_PRECISION`, kept apart from the working
precision as "Precision and rounding" describes). The line is written so
that it reads as the expression it means: a `want` with a magnitude of its
own is written with a multiplication sign (`1 mi = 5.28 × 1000 ft`), since
juxtaposing two numbers would read as one product, and a `want` that is a
sum, a difference or a negation is parenthesized (`1 m ≈ 3.0284676 (ft + in)`,
`1 m ≈ -3.2808399 (-ft)`), since `3.0284676 ft + in` would read as
`(3.0284676 ft) + in` and `-3.2808399 -ft` as a difference. The component
parses the `want` once more to tell, which is the same parse the pipeline
did a moment earlier.

A conversion into a unit list is shown as the sum of its terms, each unit
written as a single `want` would be, with `roundTerms` applied at the
display precision and the relation `=` only when every exact term shows as
it is. The first term keeps its sign and each later one is joined by `+` or
`-` and written unsigned, so that `-1 m ≈ -3 ft - 3.3700787 in` reads as
the expression it is and could be typed back as a `have`. A term of zero is
left out, as it would be in speech (`1 hr + 1 s`), except that a sum of
nothing but zeros keeps its last term (`0 in`).

GNU units answers every conversion twice, with the number to multiply by
(`* 36`) and the number to divide by (`/ 0.027777778`). Dividing by the
second number converts the other way, from `want`s to `have`s, so it is the
reverse conversion in disguise: one `in` is `0.027777778` of `3 ft`. The
converter shows that reverse conversion on a second line, written as the
first line is with the sides swapped, so that both read as statements about
quantities and could be typed back as a `have`:

```
3 ft = 36 in
in ≈ 0.027777778 × 3 ft
```

The `have` takes the unit's place and is written as a unit is, by the same
rule as a `want`: with a multiplication sign when it starts with a number,
since `0.027777778 3 ft` would read as one product, and parenthesized when
it is a sum, a difference or a negation (`in ≈ -0.027777778 (-3 ft)`). Each
line's relation is decided from its own value: `2 m = 2 m` and `m = 0.5 ×
2 m` are both exact, while `1 in = 2.54 cm` has the approximate `cm ≈
0.39370079 × 1 in`. The reciprocal is `invert` of the ratio the pipeline
returns (the ratio of `want` to `have`, as `convert` would give it with the
two swapped), and it stays in the component: it is a second view of the
same value, like the rounding, not a step of the conversion. GNU units'
verbose form writes the second line as `3 ft = (1 / 0.027777778) in`
instead, which is true but reads as nothing; the swapped line says what
the number is for.

Only a conversion into one unit has a reciprocal. That conversion is one
ratio, `have / want`, and the reciprocal is the same ratio the other way
round, `want / have`, which says the same thing. A conversion into a unit
list is not a ratio but a sum, `3 ft + 3.3700787 in`, a positional way of
writing one quantity, and there is no other way round for it: inverting
each term gives numbers that add up to nothing, `1 / have` in the same
list never conforms (its dimension is the inverse), and the reciprocal of
the total in any one unit of the list would be a reciprocal of a different
conversion, for a unit chosen by some rule the user did not ask for. GNU
units prints no reciprocal for a unit list either. So a list, typed or
named, gets no second line, nor does a blank `want`, which shows a
definition, as GNU units shows one without a reciprocal. A value of zero
has no reciprocal (`0 ft = 0 in`, and nothing is a multiple of `0 ft`), and
the line is left out rather than shown as anything.

The errors the core returns are values with spans and dimensions, not
sentences; `src/messages.ts` puts them into words, quoting the text at fault
and formatting dimensions with `formatDimension`, so that the wording is
tested under Node.js beside the core rather than in a browser. A sum that
does not conform is worded as the same mismatch between `have` and `want`
would be, with the two operands quoted in place of the two texts. Richer UX
later is a matter of new components that edit the same two strings or read
the table: autocomplete lists `table.units` and `table.prefixes`, unit
buttons insert text, and error spans drive highlighting. None of that needs
changes to the core.

## Layout

```
src/core/rational.ts      Rational, arithmetic, root, parsing and formatting
src/core/dimension.ts     Dimension arithmetic, conformance check, formatting
src/core/quantity.ts      Quantity (a Rational with a Dimension), its arithmetic
src/core/span.ts          Span, a location in the input text
src/core/parser.ts        Parser combinators, ParseError
src/core/expr.ts          Expr, parseExpr
src/core/definitions.ts   Definition, parseDefinitions
src/core/graph.ts         on-demand evaluation of a dependency graph, cycles
src/core/names.ts         the prefix-unit resolution rule, the ambiguity check
src/core/name-index.ts    the names that start with a text, by binary search
src/core/table.ts         UnitTable, UnitFunction, the lookup over it
src/core/build.ts         buildTable
src/core/evaluate.ts      evaluate, Lookup, applyFunction, invertFunction
src/core/convert.ts       convert
src/core/pipeline.ts      convertText, evaluateText: the pipeline over text
src/core/result.ts        Result; each module defines its own error types
src/units.txt             the system definitions; src/units.test.ts checks them
src/messages.ts           the errors as sentences; src/messages.test.ts checks them
src/system-table.ts       loadSystemTable: fetches and builds the system table, once
src/unit-converter.ts     the component
src/app-shell.ts          the host: loads the table, renders the component
```

Each core module has a `*.test.ts` beside it, run by `pnpm test`.

## Benchmarks

The core has costs that a later change could quietly undo: the ambiguity
check is indexed so that it does not grow with the number of prefixes, and
the walker memoizes so that a definition is evaluated once however many
others refer to it. The benchmarks in `bench/` exist to catch such
regressions; README.md ("Benchmarks") says how and when to run them.

They are `*.bench.ts` files, run by `pnpm bench` through Node's test runner
and nothing else: no benchmark library, in keeping with the rule against
third-party dependencies. The suffix keeps them out of `pnpm test`, whose
default discovery never matches it, so the two are separate without a second
runner. `tsconfig.node.json` includes `bench/`, so they type-check with the
tests. The rest of the directory is what they share:

- `bench/harness.ts` holds a seeded random source (mulberry32), so that
  every run measures the same data, and `bestOf`, which times a function
  several times after one untimed run and takes the shortest, the estimate
  least disturbed by whatever else the machine is doing.
- `bench/synthetic.ts` builds tables of a chosen size. Prefix names are
  drawn from the letters `n` to `z` and unit names from `a` to `m`, so
  that no name is ambiguous and the ambiguity check scans everything: its
  cost when it finds nothing is its cost on a table that builds. The names
  are short, like real ones, so prefixes extend one another more often than
  real prefixes do, which makes the tables the hard case for the check. A
  synthetic definitions file has two primitives, the prefixes, and units
  that are each a small expression over one earlier unit, so that building
  it walks reference chains of the depth random references make and every
  body goes through the evaluator.

A timing in milliseconds depends on the machine, so a benchmark reports its
timings as diagnostics, for a person to compare between runs, and asserts
only how a cost scales between two sizes measured in the same run, which
holds anywhere. `names.bench.ts` asserts that the ambiguity check with 1076
prefixes costs at most five times the check with 76 (it costs about the
same; before the index it cost fifty times as much and failed), and with
12000 units at most eight times that with 3000 (the sort makes it a little
more than linear). `build.bench.ts` asserts that parsing and building 6000
units each cost at most eight times parsing and building 1500, since each
definition is parsed once and evaluated once; a walk that re-evaluated its
dependencies would cost more. The thresholds are twice the expected ratios,
so that noise never fails a benchmark that a regression would not fail by a
wide margin. It also reports, without asserting, the cost of a file the size
of the GNU units database, as a reference for the startup cost.

## Later

Planned extensions, listed to show that they fit without reshaping the core:

- **Built-in functions** (`ln`, `sqrt`) are the "special function" of
  "Precision and rounding", which would take the working precision. They
  need only the `call` node, resolved by a lookup that knows them.
  docs/calculator.md weighs them, with the special functions, a decimal
  mode with rounding modes, a rational display and richer user-defined
  functions, as one program toward an arbitrary-precision calculator,
  under a precision model that replaces the fixed working precision and
  the truncation rule above with correct rounding to a precision the
  user sets.
- **Domain and range** on a function definition (`tempC(-300)` is a
  negative temperature today) are two optional bounds, checked at the call
  and at the inverse; docs/functions.md lists them with the other
  extensions of functions.
- **User definitions** are already supported by `buildTable`; only storage and
  an editor are missing.
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request) is a flag
  to `convert` that skips step 2 of the conformance check. Sums would keep
  the strict check: adding an angle to a plain number is a mistake whether
  or not the user asked to convert between them.
