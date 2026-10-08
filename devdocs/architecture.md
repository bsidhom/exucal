# Architecture

A unit converter inspired by GNU units, grown into an arbitrary-precision
calculator. The user types a quantity to convert (**have**) and a unit to
convert it to (**want**); the app answers with the converted value, or
with an error saying why the two do not conform. With the `want` blank,
the answer is what the `have` is worth in the primitive units, and the
`have` alone may be any expression over the built-in and user-defined
functions.

GNU units is the source of the conceptual patterns: a definitions file
that defines every unit in terms of others down to a few primitives, an
expression language that serves both the definitions and the input, and
the have/want interaction. It is not a specification. Where this design
borrows a rule from GNU units it says so, and where it diverges in
grammar (a number may only start a product; a name is never split into a
unit and an exponent) or in behavior (exact rational arithmetic; kinds
that keep angles apart from plain numbers) it does so deliberately, and
the GNU units behavior is not a fallback.

Two rules shape everything below:

- **The core is pure.** Every function in `src/core/` maps immutable
  inputs to immutable outputs, with no I/O, no globals and no exceptions
  across module boundaries: failures are returned as `Result` values, a
  discriminated union of a value or an error, each module defining its
  own error type. A throw is reserved for a precondition failure, which
  is a bug, never an input, with one known exception, the table's lookup
  of a prefixed unit near the exponent bound ("Definitions" below). The
  UI is a thin layer that calls into it.
- **No third-party runtime dependencies** beyond Lit. Arithmetic is
  built on `bigint`. [security.md](security.md) gathers what follows
  from this rule and the rest of the project's security stance.

This page is the overview: the pipeline and each of its stages, from the
definitions file to the lines on the screen. The parts with a design of
their own have pages of their own:

- [numbers.md](numbers.md): the number type, the precision model, the
  retry loop, the two modes and the size limits.
- [builtins.md](builtins.md): the built-in functions.
- [functions.md](functions.md): user-defined functions in the
  definitions file.
- [notation.md](notation.md): the ratio notation of exact mode.
- [settings.md](settings.md): the settings, their storage and the sheet.
- [testing.md](testing.md), [benchmarks.md](benchmarks.md) and
  [layout.md](layout.md): the suites, the benchmarks and where each
  module lives.

## Pipeline

```
definitions text ──parseDefinitions──▶ Definition[] ──buildTable──▶ UnitTable
                                                                        │
have text ──parseExpr──▶ Expr ──evaluate──▶ Quantity ─┐                 │
                                                      ├─▶ convert ──▶ Result<Conversion>
want text ──parseUnitList──▶ Expr[] ──evaluate──▶ Quantity[] ─┘   (or convertToList)
                                                              └──▶ format ──▶ string
```

Each arrow is one pure function in its own module. Parsing never touches
the table, and conversion never formats. The pipeline
(`src/core/pipeline.ts`) runs the evaluation and the conversion at each
working context of a retry schedule until every value is certified at
the digits asked for ([numbers.md](numbers.md), "Working precision and
the schedule"). Evaluation checks conformance in the operands of a sum
and the argument of a call, and with the same check that conversion
applies to the pair. The `want` is read as a unit list, of which one
expression is a list of one: one unit goes through `convert`, several
(or the name of a list the table defines) through `convertToList`
("Unit lists" below), and the name of a function the table defines
through `invertFunction` ("Functions" below).

## Numbers

Every magnitude is a `Ball`: a midpoint, which is an exact fraction
times a power of ten (`Scaled` over `Rational`, both on `bigint`), beside
a coarse binary radius bounding the distance to the true value. Exact
values have a radius of zero and stay exact through every exact
operation, so a conversion between rationally defined units is exact and
rounds once, at the display; the inexact functions run on a fixed-point
kernel and return a ball whose radius bounds their error. The pipeline
evaluates at a working precision and retries at more digits until the
display can certify the digits asked for, up to a ceiling; decimal mode
instead rounds every step to the digits asked for, as a calculator does.
A significand limit and an exponent bound keep every value a size the
machine can hold. [numbers.md](numbers.md) is the whole of it: the
types, the kernel's boundary, the exponent bound and why it stays where
it is, certification and the display rule, the retry schedule, the two
modes, the significand limit, `approx` and the failures.

## Quantities, dimensions and kinds

Every unit resolves to a quantity: a magnitude, which is a `Ball`, and a
dimension, which is an exponent vector over the primitive units, keyed by
primitive name with zero exponents left out. Exponents are rational so
that roots are exact on the dimension side (`m^(1/2)` is a dimension, and
`(m^2)^(1/2)` is `m`).

Primitives come in two roles, declared in the definitions file:

- **Dimension primitives** (`m`, `kg`, `s`, ...) are the physical base
  quantities.
- **Kind primitives** (`radian`, ...) are dimensionless markers. They
  ride along in the same exponent vector, so no separate mechanism is
  needed, but the conformance check treats them differently.

Conformance between `have` and `want` is checked in two steps:

1. Compare the vectors restricted to dimension primitives. A difference
   is a `dimensionMismatch` (length vs time).
2. Compare the full vectors. A remaining difference is a `kindMismatch`:
   the quantities are dimensionally compatible but semantically
   different, and the error names the kind primitives that differ.

So `rad/s` does not conform to `Hz` (`1/s`), because the former carries
`radian^1`. Torque could be separated from energy the same way, by
defining torque units with a `/ radian` factor as the SI brochure
suggests; units.txt defines no torque unit, and its `J` is `N m`. Which
kinds exist is entirely a matter of the definitions file; the core has
no list of them.

`src/core/dimension.ts` holds the dimension arithmetic (multiplication,
division and raising to a rational power, with exponents that cancel to
zero dropped), the conformance check and the formatter. The check takes
the primitives with their roles from the table, in declaration order, so
the kinds a `kindMismatch` names come out in that order; a name the
table does not declare counts as a dimension primitive. A dimension
formats in the expression language itself: the primitives in declaration
order, those with positive exponents first and those with negative ones
after a `/` (`m^2 kg / s^3 A` for units.txt's volt, which the grammar
reads as `(m^2 kg) / (s^3 A)`), `1` standing in for an empty numerator,
and a non-integer exponent parenthesized (`m^(1/2)`). So what the UI
shows in an error is something the user could type back.

`src/core/quantity.ts` holds the `Quantity` type itself, and is the
layer that pairs the two below it: a `Ball` from `ball.ts` and a
`Dimension` from `dimension.ts`, neither of which knows about the other.
The table stores quantities, the evaluator produces them, and the
converter consumes them. The arithmetic the evaluator needs lives here
as well: multiplication, division and raising to a rational power, each
a ball operation beside the matching dimension operation. Only the
magnitude can fail (a zero divisor, or one that cannot be told from
zero, `0` to a negative power, an even root of a negative number, a
result beyond the significand limit or the exponent bound), so the
failures are those of `ball.ts`, and the power is the one of the three
that takes a `NumberContext`: for the significand limit of an exact
power, the settling of an inexact base, and the root, or the log-space
route, of a non-integer exponent. Negation touches the magnitude alone
and cannot fail. Addition and subtraction have both sides: only
quantities of one dimension have a sum, so the dimension side is the
conformance check above, the sum has the dimension its terms share, and
the failure is a `ConformanceError`; and the magnitudes align within the
significand limit of the `NumberContext` the two take, failing
`tooLarge` as `addBalls` does, or `overflow`, `underflow` or
`unresolved` at the bound for a sum that aligns and passes the exponent
bound. Since that check tells dimensions from kinds by the roles of the
primitives, these two operations take the primitives as `convert` does;
`1 rad + 1` is a kind mismatch and `1 m + 1 s` a dimension mismatch,
exactly as the same pair would be as `have` and `want`. There is no
special case for zero: `0` is a plain number, and `1 m + 0` is a
mismatch, as in GNU units.

## Definitions

System units are not special: they live in a static definitions file,
`src/units.txt`, that is bundled into the app as an asset of its own (a
URL import, so it is emitted beside the scripts and precached with the
rest of the build, and fetched when the app starts) and go through the
same parser as any user-supplied definitions. `buildTable` takes one
list of definitions, so user definitions are simply appended to the
system ones.

The format, the name rules and the expression language are user-facing,
so [docs/definitions.md](../docs/definitions.md) describes them, along
with what the system file contains and how to add to it. This section
covers what the core does with a definitions file. In short, the format
is in the spirit of a GNU units file, pared down: one definition per
line, name then whitespace then body, `#` comments, where a name with a
trailing dash is a prefix, a body of `!` or `!kind` declares a
primitive, a name directly followed by `(` is a function,
`name(parameter) = body`, and a line that starts with `~` is a
function's inverse. The whitespace after a unit's or a prefix's name is
required, so that `inch2.54 cm` is an error rather than a definition of
`inch2`. `src/units.test.ts` builds the system file and checks a sample
of conversions from each of its sections.

A definition is one of six things: a primitive with its role; a prefix
(named without its dash) with a body; a unit with a body, where a body
is an expression; a unit list, whose body is two or more expressions
separated by `;` (a body of one is a unit), each kept with the text it
was written as, since that text is what the UI shows beside its term
and the table has no other way to get at it; a function, named with its
parameters in parentheses, separated by commas and none named twice,
each of them and the result optionally annotated with a unit expression
(kept with its text, as a list's items are), optionally conditions
after a `|`, and its body after `=`; or the inverse of a function,
`~name(parameter) = body`, which may have conditions too
([functions.md](functions.md)). A condition is a chain of expressions
joined by comparisons that all point one way, kept with its text for
the messages that quote it; a chain that turns, `0 < x > 1`, is
rejected. The parser rejects an annotation with a number other than
`1`, a sum, a negation or a call, and a parameter named like a unit its
own head's annotations use, each where it is written; it reserves a `[`
after a function's name, for dimension variables, and rejects it
(`unsupported`). `parseDefinitions` returns them in the order written,
duplicates included, and knows nothing about what they mean. Every span
is an offset into the whole text, not the line: a definition carries
the span of its text from name to body, for the errors `buildTable`
reports against a definition as a whole (a duplicate name, a cycle, a
prefix that is not dimensionless), and the spans inside its body serve
the errors within it.

`buildTable` evaluates each body to a quantity, resolving references on
demand with memoization and a visiting set, so definitions may appear
in any order and cycles are reported rather than looping. Prefix bodies
must be plain numbers: no dimension and no kind. The result is the unit
table: the primitives with their roles, the prefixes with their
factors, and the units with their quantities, each a map keyed by name
in declaration order. The primitives are among the units, as quantities
of one of themselves, so that a lookup is one map read. The primitives
with their roles are collected from the definitions before any body is
evaluated, because a body that is a sum needs them to check its
operands, and a body may refer to a primitive declared after it.

Prefixes and units are separate namespaces, so `m-` (milli) and `m`
(the metre) coexist, while a primitive and a unit share one. A name in
an expression resolves to an exact unit name if there is one, and
otherwise to one prefix followed by a unit name (the rule
docs/definitions.md states for users). Prefixes do not stack, and there
is no plural handling: `inches  inch` is an ordinary alias definition.
Prefixes apply to units alone: a call's name resolves among the
functions and the built-ins exactly, so `ktempC(1)` is a call of
nothing (`notAFunction`), and a function's or a built-in's name may not
itself read as a prefix followed by a unit, which the build checks.

The table's lookup forms a prefixed unit as the prefix's factor times
the unit's quantity, under the context the lookup is given, and assumes
the product is never refused: the file's prefixes and units are nowhere
near the exponent bound, and the product's size is held to the
significand limit by the node that names the unit, not here. A lookup
has no error to return for a refusal, so the one case that could reach
it, a definition that puts a unit within a prefix's factor of the bound,
throws (`table.ts`). That is the one place the core's rule on exceptions
is knowingly not met; the error kind it needs belongs with the editor
for user definitions, the only way such a unit can be written.

Unit lists share the unit namespace (a list and a unit of one name are
a duplicate) but are not units: no expression can refer to one, so they
stay out of the walk, and each is evaluated in its place in the order,
item by item, through the same lookup a body uses, requesting what it
refers to from the top of the walker (which can never close a cycle).
Since a list's name means the list only as a bare `want`, while a
unit's name means the unit everywhere, a list's name that also reads as
a prefix followed by a unit (`ms`) would make one text mean two things
in the two fields, and the build rejects it once the ambiguity check
has passed. A list's units are checked as `convertToList` checks any
list, against the first of them, so that a defined list can fail to
convert only for not conforming to the `have`. The table holds each
list as its units with their texts, apart from the units.

Functions share the unit namespace as lists do, and their names are
held to the same rule against reading as a prefixed unit, for the same
reason. Unlike a list, a function can be referred to, by a call in any
body, so a function is a node of the walk, and evaluating it means
checking it ([functions.md](functions.md), "Build-time checks"): its
annotations are evaluated, and its body's dimension is taken without
evaluating it (`dimension-of.ts`), with the parameter bound to its
annotation's dimension (plain without one), through the walk's own
lookup; that dimension is the function's result, checked against the
result's annotation when there is one; and each condition's terms are
taken the same way, each conforming to the next, and each condition
must mention a parameter. A call in a condition is a dependency of the
walk as one in a body is. A unit may then be defined by a call
(`boiling  tempC(100)`), a function's body may call another, and a
cycle through a function is reported like any other. An inverse is
keyed by its function's name apart from every namespace, and nothing
can refer to it, so, like a list, it stays out of the walk and is
checked in its place in the order, requesting its function from the
top, which lets it call its own function: its function must have one
parameter, and its body's dimension, with its own parameter bound to
the function's result, must conform to what that parameter takes, its
conditions checked as a function's are. The table holds each function
as its body, still an expression, with its parameters in order, each
with the unit it takes and its text, its result's dimension, its
conditions with the parameters each mentions, and its inverse when one
is defined: a call evaluates the body afresh, through the table's
lookup. A unit, a list's unit or an annotation that calls a function
evaluates the call's conditions when the table is built, at the
ceiling, and one left undecided fails the build, since a unit has
nowhere to carry the warning.

Every name is known once the table is built, so ambiguity is a property
of the table rather than of the input, and `buildTable` checks for it.
A name with two different prefix-unit splits (`d`+`am` against `da`+`m`,
were `am` a unit) is a build error, so a table that builds has at most
one split per name. A unit name that is also a valid split (`min`, the
minute, against `m`+`in`) is allowed, because real unit conventions are
full of them, and the exact name wins. The check is cheap: for each
pair of prefixes where one extends the other, one map lookup per unit
that starts with the extension, found in an index of the unit names,
which for most extensions (`icro`, `eci`) is no unit at all.

Building is five modules. `table.ts` holds the `UnitTable` itself and
the lookup over it that the evaluator resolves user input against.
`names.ts` holds the resolution rule and the ambiguity check, generic in
what a prefix or a unit maps to, because the build applies the same
rule over definitions before any quantity exists; `name-index.ts` is
the index the check searches, the names sorted so that those starting
with any text are one contiguous run. `graph.ts` is the on-demand
evaluation: a walker takes a function that computes a node's value
given a way to request the values of the nodes it depends on, and
memoizes each result; a request for a node whose evaluation is in
progress is a cycle, and the walker returns it to the requester, which
knows where the request came from. Nothing in it knows what a
definition is. `build.ts` puts them together in a fixed order: index
the definitions by name, rejecting a duplicate; check the index for an
ambiguous name, and the names of the lists, the functions and the
built-ins for one that reads as a prefixed unit; collect the primitives
and their roles; then walk every definition in order, where a body is
evaluated by `evaluate` against a lookup that resolves each name
through the index and requests the definitions it means from the
walker, with those primitives. The first failure ends the build.

A build error is one of: a duplicate name, carrying both definitions,
or the built-in's name and the definition that takes it; an ambiguous
name with its two splits; a unit list, function or built-in whose name
reads as a prefix and a unit, carrying the definition (or the built-in's
name) and the split; a lookup failure at its reference (an unknown
name, a function used as a unit, a call of what is not a function, or a
prefix times a unit refused as too large or too small); a cycle,
carrying the definitions on it in order and the span of the reference
that closed it; a prefix whose body is not a plain number, carrying the
definition and the dimension it has; a unit list whose units do not
make a list, carrying the definition and the list error with the index
of the unit at fault; a function whose body does not conform to its
result's annotation, or an inverse whose body does not conform to what
its function's parameter takes, carrying the definition and the
mismatch; an inverse of no defined function; a function whose
parameter's or result's annotation is zero, or cannot be told from
zero, since a recovered argument is written as a count of the
parameter's; or an arithmetic failure from the evaluator, located as
the evaluator locates it. Every span is an offset into the whole
definitions text, and a definition's span covers its text from name to
body, so each error points at something the user can see.

## Expressions

One grammar serves both definition bodies and user input, so anything
that can be typed can also be defined. docs/definitions.md describes it
from the user's side; this section is about how it is parsed and what
the tree holds. It is a small expression language: decimal numbers,
unit names, juxtaposition and `*` for multiplication, `/`, `+` and `-`,
`^` with a literal exponent, parentheses, and calls. The precedence
follows GNU units: juxtaposition binds tighter than `*` and `/`, which
are one left-associative level, so `kg m / s^2` is `(kg m) / (s^2)` and
`m/s*s` is `(m/s)*s`; `+` and `-` are one more left-associative level
below those, so `1 ft + 3 in` is `(1 ft) + (3 in)` and `2 m * 3 + 1 m`
is `(2 m * 3) + (1 m)`. A `-` before a product negates it, binding
tighter than `*` and `/` and looser than juxtaposition and `^`, so
`-2 m` is `-(2 m)`, `2 * -3` is `2 * (-3)` and `-2^2` is `-(2^2)`, as
in arithmetic; it does not stack, and there is no unary `+`. A unit
list, `ft;in`, is one or more expressions separated by `;`, and is not
an expression: `;` binds looser than anything and cannot appear inside
parentheses. `parseUnitList` reads one, and `expr.ts` exports the list
grammar over any item parser, since the definitions parser wants each
item with its text.

A call, `tempC(100)`, is a name directly followed by `(`, zero or more
expressions separated by commas, and `)` (`pi()`, `atan2(3 m, 4 m)`),
and is an atom like a name: `2 tempC(100)`, `tempC(100)^2` and
`-tempC(100)` mean what they look like. The comma appears nowhere else
in the grammar, and how many arguments a function takes is the
evaluator's to check, not the parser's. The parser decides a call by
the text alone, since it cannot ask the table whether a name is a
function, and the rule is lexical: no space before the `(` makes a
call, and a space makes a product, so `kg (m/s)` stays the product it
always was and `kg(m/s)` is a call of `kg`, which the evaluator rejects
with a message that shows the product with the space. That is the one
whitespace-sensitive rule in the grammar; [functions.md](functions.md)
("Alternatives considered") weighs the alternative. The tree holds a
call as the name with its own span and its arguments.

Juxtaposition means "this many of these units" (`2 m`) or a product of
units (`kg m`), so a number may only be the first factor of a product:
`m 2`, `1 2 3` and `2 3 m` are errors, and multiplying numbers is
written with `*`. In the tree it is an ordinary multiplication,
indistinguishable from `*`.

Whether the two sides of a sum can be added is not the parser's
concern: `1 m + 1 s` parses, and the evaluator rejects it. What the
parser decides is where a `-` belongs. A number's literal is read as
far as it goes, so `2e-3` is one number and `2 - 3` a difference, and
an exponent's sign is part of the exponent, so `m^-1` is a power while
`m^2 - 1` and `m^2-1` are differences. Elsewhere a `-` where an operand
can start is a negation and a `-` after an operand is a subtraction, so
`2 -3` is a difference and `2 * -3` a product with a negation. A number
is never negative in the tree: `-2` is the negation of `2`.

An exponent is a signed decimal (`m^2`, `s^-1`, `m^0.5`) or a
parenthesized rational (`m^(1/2)`), never an expression, so it is known
at parse time and travels in the tree as the two literals the parser
read, undivided (`Exponent`): each must be formable within the hard
bound and a zero divisor is rejected, both read off the literals with
nothing formed, and the evaluator takes the quotient where the
significand limit applies. The parser has no context, and a reduction
there took seconds on long literals and minutes at the hard bound, on
every keystroke. A unit name is a letter or underscore followed by
letters, digits and underscores, in any script, taken as long as it
goes: `m2` is one name rather than `m` beside `2`, and whether a name
means anything is decided by the table, not the parser. Whitespace is
spaces and tabs, never a newline, because a definition body is one
line.

The tree has six kinds of node: a number, a unit name, a binary
operation (a sum, difference, product or quotient) of two subtrees, a
negated subtree, a subtree raised to a rational exponent, and a call.
Every node carries the span of text it came from, so an error found
later in the pipeline (an unknown unit, a dimension mismatch) can point
back at the input. `parseExpr` knows nothing about units, and
`evaluate` knows nothing about text. `ParseError` comes from the parsing
toolkit below, which both parsers are built from; `Span` has its own
small module, because it is not a parsing concept but the vocabulary
every later stage uses to locate its errors.

The grammar's levels of binding and its binary operators are data in
`src/core/expr.ts` (`LEVELS`, `BINARY`): the two left-associative levels
of the parser are built from the table, and the printer,
`src/core/print.ts`, writes a tree back by it, so the two cannot
disagree. Juxtaposition is its own operator in the tree, `juxtapose`,
and a number node keeps the text it was read from, so that a tree can
be written back as it was read: the printer's text is canonical, one
space between juxtaposed factors and around the other operators, a
quotient of two literals tight as a fraction, and the fewest
parentheses that read the tree back as it is, which `levelOf` and the
levels decide position by position. The printer never changes a tree.
Its output is pieces, each saying what it is (a number, a name, an
exponent, a symbol), so that the converter can style a result's numbers
apart; `text` joins them. A property test prints random trees
(`src/testing/expr.ts`) and parses them back, and `formatDimension` is
the printer over a dimension built as an expression (`dimensionExpr`).

## Parsing

Both parsers are assembled from a small set of parser combinators in
`src/core/parser.ts`. A parser is a plain function from the input text
and a position to a reply: the value it recognized and the position
just past it, or an error. A grammar is plain code that combines
parsers into parsers, with primitives for literals, patterns and the
end of input, and combinators for sequencing, ordered choice,
repetition, one left-associative precedence level (`chainl1`),
attaching spans (`spanned`), validating a recognized value (`check`)
and self-reference (`lazy`). The types carry the grammar's shape: a
sequence of parsers is a parser of a tuple and a choice is a parser of
a union, so a grammar that type-checks produces the tree its types say
it does.

Combinators were chosen over a hand-written recursive-descent parser or
a Pratt (top-down operator precedence) parser because the grammars are
small and fixed. The expression language has a handful of precedence
levels, each of which is one `chainl1` (or `many`, for juxtaposition)
over the level below, and the definitions file is a line with two or
three fields. A Pratt parser is general: it drives a table of operators
with numeric binding powers from a loop whose invariant has to be
checked. That generality buys nothing here, while a combinator grammar
is checked by reading it against the grammar it transcribes. Should the
language ever need user-defined or many-levelled operators, a Pratt
loop can be written with `flatMap` on the same primitives, without
changing them.

Three properties make the combinators simple to reason about:

- **`alt` is ordered choice, and the only backtracking is local.**
  `alt(a, b)` tries `a`; if `a` fails, however far into the input it
  got before failing, the position is rewound and `b` is tried from the
  same place. The first alternative that matches is taken for good: a
  failure later in the parse never reopens an earlier choice to try its
  remaining alternatives, so the parser never searches a space of parse
  trees. "Backtracking" here means only that rewinding, which is what
  lets an alternative be written without lookahead: an optional
  exponent, written `optional(seq(string("^"), exponent))`, may consume
  the `^` before finding no exponent, and still cleanly matches nothing.

  That makes the cost easy to bound. The work of a parse is the number
  of primitive (`string`, `regex`) matches attempted. Text is read more
  than once only when an alternative fails after consuming some of it
  and the next alternative reads the same text again. That is the
  exponential case of unmemoized ordered choice: `alt(seq(p, a),
seq(p, b))` parses `p` twice, and nesting that pattern `k` deep parses
  the innermost `p` `2^k` times. Our grammars never share a prefix
  between alternatives. At every `alt`, the alternatives are told apart
  by their first primitive (a digit, a name followed by `(`, a name not
  followed by it, `(`, or an operator symbol), so all but at most one of
  them fail on their first primitive, at constant cost. An alternative
  fails after consuming input in two ways only: an operator with
  nothing valid after it (`3 m ^`), which rewinds by one token and is
  followed at once by a failure at that token; and a call whose
  argument list fails, which has consumed its text, and the
  alternatives after it, a plain name (one not directly followed by
  `(`, decided by a lookahead that includes the name's own characters,
  so that the match cannot back off to a shorter name in front of the
  `(`) and a parenthesized expression, fail at their first primitive,
  so nothing is read twice. So each character is consumed by exactly
  one primitive, each failed alternative costs one primitive attempt,
  and a parse costs a constant number of primitive attempts per token,
  times the depth of the grammar for passing each reply up through the
  enclosing combinators. A hundred-character line is a few hundred
  primitive attempts. The discipline that keeps this true, and that any
  new grammar built on these combinators must follow, is that the
  alternatives of one `alt` begin with different tokens, and repetition
  is expressed with `many`, `many1` or `chainl1` rather than with a
  recursive alternative. (The call rule broke it once: a call and a
  name began alike, told apart only by a lookahead for `(`, so a nested
  call with an error in it cost `2^k` for `k` levels. A cut combinator,
  which commits an `alt` once a prefix has matched and would serve other
  grammars, was set aside for the fix: a committed failure skips every
  enclosing `alt`, `optional` and `many`, so a misplaced cut changes the
  meaning of valid input, where the local lookahead has no such failure
  mode.)

- **Every reply carries the furthest expectation.** An `Expectation` is
  a position and the labels of the primitives tried there. Not only
  failures but successes carry one, and every combinator keeps
  whichever of its parts got furthest (merging the labels of those that
  tie), so the error reported for a parse is where the parser got
  furthest and what it wanted there, whatever alternatives it undid
  afterwards. This is what makes the error for `3 m ^` say "expected a
  number or `(`" after the `^`: the optional exponent fails there, the
  parser backs out of it, the product ends, and `eof` fails earlier at
  the `^`; the furthest expectation survives. Without it, backtracking
  parsers report the position where the outermost rule gave up, which
  is usually not where the mistake is.

- **Rejection is final.** `check(parser, validate)` turns a recognized
  value into a `rejected` error carrying its span and a reason when
  `validate` says so, and no combinator retries past a rejection: the
  text was understood and found unacceptable, not misread, so trying
  another reading would only produce a worse error. This is how a
  numeric literal that `parseDecimal` refuses (a significand past the
  hard bound, or an exponent past the exponent bound) becomes a parse
  error pointing at the literal. `check` is the only source of
  `rejected` errors. The reason is data, the `R` of `Parser<A, R>`: the
  expression grammar's is its `Rejection` (a literal past the hard
  bound or past the exponent bound on either side; a `^` exponent that
  cannot be formed; one that divides by zero), and `src/messages.ts`
  words it, as it words every other error, so that no sentence is
  written in the core.

A parse error is therefore one of two things: nothing acceptable at a
position, with the labels of what would have been, or text at a span
that was recognized and rejected, with the reason. Spans are attached
with `spanned` on the leaves, and a composite node spans from its first
child to its last.

The combinators are pure: a parser is a closure over its configuration
and a function of `(text, pos)`. The two pieces of mutable state are
internal and unobservable: `regex` reuses one sticky `RegExp` whose
`lastIndex` it sets before every use, and `lazy` memoizes the parser it
builds. `many` of a parser that matches the empty string would loop
forever; that is a bug in the grammar, not an input that can fail, and
it throws.

## Evaluation

`evaluate` takes an `Expr`, a `Lookup` for unit and function names, the
table's `Primitives` and the working `NumberContext`, and returns the
`Quantity` the expression denotes. A number is a dimensionless quantity,
a unit name is whatever the lookup says it is, and the operators are the
quantity arithmetic above: juxtaposition and `*` multiply, `/` divides,
`+` and `-` add and subtract, a leading `-` negates, and `^` raises to
the exponent the parser read, made a fraction here within the
significand limit (`reduceExponent`, which `dimensionOf` applies under
the build's context too): each literal's significand is held to the
limit as every literal's is, the quotient of the two is taken as
`Scaled` values, whose powers of ten cancel for nothing, and the
fraction is formed from it within the limit as `pow` forms an exact
exponent, so that `2^(1e30/1e30)` is `2` at any limit and `2^1e-30000`
is refused at the default, at the bound when the power would pass it
and otherwise at the limit, where `pow(2, 1e-30000)` goes to log space
instead and is `≈ 1`: `^` and `pow` disagree on such an exponent, which
[#88][88] tracks ([numbers.md](numbers.md), "Roots and powers"). A call resolves its
name among the functions, through the lookup, to a function the table
defines or a built-in (`ResolvedFunction`), checks that it gives as
many arguments as the function takes (`arityMismatch` otherwise, before
any argument is evaluated, since the count is about the call's shape; a
defined function takes exactly as many as it has parameters), and then,
for a defined function, evaluates its arguments, checks that each
conforms to the unit its parameter takes, and evaluates the body with
the parameters bound to the arguments by position ("Functions" below);
for a built-in it evaluates every argument, applies the built-in's
dimension rule to their dimensions (`builtinArgument` at the call when
it fails, carrying the rule's error and every argument's span) and its
function to their magnitudes, and locates a `domain` failure at the
call (`domainError`), an `unresolved` at the argument that straddles
the edge the error names, and any other failure at the call. The
context goes to every power and every built-in, the operations that can
lose digits, and to every sum, which aligns within its significand
limit, and every literal's significand is checked against that limit;
everything else is exact, and every result is settled
([numbers.md](numbers.md), "Settling"). The primitives go to every sum,
whose operands must conform: this is where evaluation checks
conformance, beside a call's argument against what the function takes,
and it is the same check, with the same roles, that conversion applies
to `have` and `want`, so that what can be added is exactly what can be
converted. The primitives come from the table for user input, and from
the definitions, collected before the walk, while the table is being
built.

Names are resolved through a lookup function rather than a table,
because the same evaluator serves both ends of the pipeline. The table
supplies a lookup over its finished units for the user's `have` and
`want`, applying the prefix-splitting rule described under Definitions;
`buildTable` supplies one that evaluates definitions on demand, with
its memoization and visiting set, while the table is still being built.
Each lookup defines its own error type (an unknown name, a cycle among
definitions); `evaluate` takes that type as a type parameter and
returns a lookup failure unchanged. The lookup is given the span of the
reference along with the name, so that its error can point at the text
as the evaluator's own errors do; the function resolver is given the
span of the whole call as well as the name's, which is how
`notAFunction` shows the product with the space (`kg (m/s)`).

Operands are evaluated left to right and the first failure ends the
evaluation, so `bogus / 0` reports the unknown unit rather than the
division. The evaluator's own errors are the arithmetic failures, each
located in the input: a division by zero points at the divisor, since
its value is what is wrong, and so does a division by a value that
cannot be told from zero at this precision (`unresolved`: the divisor's
ball contains zero without being exactly zero, as `sqrt(2)^2 - 2`
does); a power whose base cannot be told from zero, raised to a
negative power or put under an even root, points at the base for the
same reason, and any other power that fails (`0^-1`, an even root of a
negative magnitude, a result beyond the significand limit or the
exponent bound) points at the whole power, since it is the combination
of base and exponent that fails. A sum, a product or a quotient refused
as too large or too small (`tooLarge`, `overflow`, `underflow`) points
at the whole operation, as a power does, and a literal whose
significand is beyond the significand limit at the literal. A sum whose
operands do not conform points at the whole sum for the same reason,
and carries the span of each operand and the `ConformanceError`
between them, with the left operand's dimension as its `have` and the
right's as its `want`, so that a message can say what each side is, in
the words a conversion error uses. A call whose argument does not
conform points at the whole call and carries the argument's span the
same way. A call whose body fails for the argument is one `callFailed`
at the call, naming the function and carrying the body's error, whose
spans are into the definitions text; only the evaluator's own failures
are wrapped so, and a lookup failure inside a body (which a table that
built cannot produce) comes back as any lookup failure does. The
evaluator never sees the text: the spans in the tree are all it knows
of it.

## Conversion

`convert` takes the two quantities, the table's primitives (whose roles
the conformance check needs) and the context, for the quotient's size
prediction, and returns the output value: how
many `want`s make up `have`, which after the conformance check is
simply the ratio of their magnitudes, since each quantity already
carries its own scale. `want` may have a magnitude (`1 mi` into
`1000 ft` gives `5.28`), as in GNU units. The ratio is the ball quotient
of the two magnitudes, exact on the midpoints with the radii
propagated, so `1 m` into `in` is exactly `5000/127`, and the display
is where it becomes `39.370079`. A failure is a dimension mismatch or a
kind mismatch, carrying both dimension vectors, a `want` whose
magnitude is zero, of which nothing is a multiple, or a `want` whose
magnitude cannot be told from zero at this precision (`unresolvedWant`,
kept apart from `zeroWant` as the ball's `unresolved` is from its
division by zero, since the retry loop retries the one and never the
other), a ratio, or a list's count, product or remainder, that straddles
the exponent bound at this precision (`unresolvedBound`, retried as
`unresolvedWant` is and worded apart from it: the pair cannot be told
from the point where the result passes the exponent bound), or a ratio
refused as the quotient it is, today at the exponent bound
(`1e999999999999999999 m` into `1e-999999999999999999 m` is an
`overflow`); the conformance check comes first, so `0 s` as the `want`
for a length is reported as the mismatch it is. A core function formats
a dimension as text (`m^2 / s`), so the UI can explain a mismatch
without interpreting anything itself.

### Unit lists

`convertToList` is the second output mode, over the same conformance
check: `have` as a sum over a list of units, largest first, `1 m` into
`ft;in` being `3 ft` plus `3.37 in`. Each unit but the last gets the
integer count of it that fits in what the earlier units left, truncated
toward zero so that every term has the sign of `have` (`-1 m` is
`-3 ft - 3.37 in`), and the last gets the remainder. The counts are
taken from the midpoints, so a count is an exact integer and never
`unresolved`, and the remainder is the ball `have` less the counted
units, computed with the ball operations, so the terms times the units
add up to `have` exactly when everything is exact and contain it
otherwise. A ratio whose integer part cannot be formed within the
significand limit (`1e999999999 m` into `ft;in`) is counted as its
midpoint settled toward zero at the working digits, still an exact
integer, and the remainder is what that count leaves, and a count whose
ratio falls below the exponent bound is zero, nothing of that unit
fitting in what is left (`1e-999999999999999999 s` into `hr;min;s`).
Any other refusal of a count, of a count times its unit, or of the
difference it leaves, and an `unresolved` of them, is the list's
failure, which the pipeline reports as the conversion's, as it reports
a refused ratio (`3^32767 m` into `ft/7^21845; in/7^21845` is
`tooLarge`, its remainder not aligning within the significand limit). A
ratio whose ball straddles an integer, as `turn / deg` does once both
carry `pi()`'s radius, counts as that integer rather than its
truncation, so that the remainder is a ball around zero, which the
display leaves out, rather than a whole of the unit (`≈ 360 deg`, not
`359 deg + 60 arcmin`). That is only a meaningful sum when the units
run from the largest to the smallest, so the units are checked in
order, each for conformance with `have`, for a positive magnitude whose
ball excludes zero (a unit that cannot be told from zero is no size to
count by), and for being smaller than the one before it by midpoint,
and the first failure is reported with the index of the unit at fault.
The units need not be multiples of one another (`mi;km` works) and may
carry magnitudes (`ft;in/8`).

The terms are exact for exact quantities, as the ratio `convert`
returns is, and rounding them for display is more than rounding each:
a remainder of `11.9999999988 in` shown at eight digits is `12 in`,
which beside `2 ft` reads wrongly. So `roundTerms` is the display
rounding that goes with the sum: it rounds the remainder's midpoint to
the display precision, in the display's rounding mode, as `roundTo`
does, widening its radius by the rounding's shift so that the rounded
terms still contain `have`, and, when that changes it, takes the counts
again from the rounded sum, so that a remainder which rounds up to a
whole of an earlier unit carries into it, through as many units as it
must (`3599.9999999999 s` in `hr;min;s` is `1 hr`; under `floor`
nothing rounds up, and it stays `59 min + 59.999999 s`). That is one
rounding of the whole sum, by less than a unit in the last digit of the
remainder, and the second decomposition is exact. The counts are
integers and are left alone; one too long for the display is the
display's to round, as any value is. When the remainder is already
exact at the display precision, the terms come back as they are, and
so do they, uncarried, when rebuilding the total from the rounded terms
fails, since the display calls `roundTerms` and the uncarried terms
still contain `have`: the carry's rebuilt total can pass the exponent
bound where the terms did not.

The pipeline reads the `want` as a unit list. One item that is a bare
name of a list in the table means that list, with the texts of its
units from the definition; any other one item is a unit and goes
through `convert`; two or more items are a list typed out, each
evaluated as an expression and paired with its text, sliced from the
`want` by its span. A unit of a typed list that fails the list's checks
is reported with the texts of all of them, so that a message can quote
the one at fault; a list from the table passed those checks when it was
built, and can fail only for not conforming to the `have`, which is
reported as the mismatch of the pair, as for a single `want`, so that
the message quotes the name the user typed.

### Functions

A function is a body with any number of parameters, bound by position,
as in `tempC(x) = x K + 273.15 K` or
`kinetic(mass: kg, v: m/s) = mass v^2 / 2`, or none, as in
`twopi() = 2 pi()`, called `twopi()`; and, for a function of one
parameter, an optional inverse on a line of its own,
`~tempC(y) = y / K - 273.15`. It exists for readings such as a
temperature, which are not multiples of a unit, without giving
`Quantity` an offset that every operation would then need a rule for,
and for compositions of the built-ins that a user would otherwise type
out. Nothing about functions touches quantities: a call is a quantity
like any other once the body has run, and the rest of the expression
goes on as before. A parameter's annotation checks a dimension and
changes no value, since a quantity carries no unit of its own: `x: kg`
admits any mass, as `x: lb` does, and a body that needs a number in a
given unit divides it out. A function may restrict its arguments by
conditions, `tempC(x) | x >= -273.15 = …`, checked at the call after the
arguments conform and before the body; an undecided condition is
assumed to hold and reaches the outcome as a warning when it is still
undecided at the ceiling. [functions.md](functions.md) has the whole
design: the grammar, the annotations, the conditions and their
three-valued check, the build-time checks, what a call costs and the
alternatives weighed.

The pipeline reads a `want` that is the bare name of a function, after
a list's name and before a unit's, as the third output mode: the answer
is the call that would produce the `have`, `tempF(212)` into `tempC`
being `tempC(100)`. It needs the function's inverse, and a function
without one is a `noInverse` on the want side. The `have` must conform
to the function's result, which is the ordinary mismatch of the pair
when it does not; the `have` must meet the inverse's conditions, which
are the inverse's own domain, and `invertFunction` evaluates the
inverse's body with its parameter bound to the `have`, through the
table's lookup; the recovered argument must meet the function's
conditions, so that `-5 K` into `tempC` is refused as needing a reading
below absolute zero (a condition failing on either side is a
`wantConditionFailed`, and an undecided one is assumed as at a call).
Since an inverse is the one part of a definition the build cannot
check, the answer is then checked: the function is applied to the
recovered argument, and a value certainly other than the `have` (two
exact values compared exactly, otherwise a difference wholly on one
side of zero) is an `inverseMismatch`, as is a failure of the
function's body there; the check refutes a wrong answer and proves
nothing, overlap being what balls can decide. The conversion carries
the recovered argument, the unit the parameter takes with its text, and
the argument as a count of that unit, so that the UI writes it as it
writes any value beside a unit; a count refused as a ratio may be (a
quotient past the exponent bound) is the conversion's refusal. An
inverse's body that fails for the value is an `inverseFailed` on the
want side, carrying the body's error as a call carries its body's. A
`want` that is a call is not special: it is an expression, and the
conversion is the ratio, with a reciprocal.

A built-in (`src/core/builtin.ts`, and the set in `builtins.ts`) is a
function the core implements in code rather than a definition: a name,
the count of arguments it takes, a dimension rule from its arguments'
dimensions to its result's, and the function itself from balls to a
ball at a working context, which returns the kernel's ball as it is and
rounds in no mode, the evaluator settling it as it settles every
result. Built-ins share the function namespace: the table carries the
set it was built against, the build rejects a definition named like one
as a duplicate and a built-in whose name reads as a prefixed unit as it
rejects a function's, and a call's name resolves to a defined function
first and a built-in second. A built-in has no inverse, so its name is
not a `want`. [builtins.md](builtins.md) lists each one's rule, domain,
exact cases and edges, and the modules under `builtins/` hold one
function or one family each. The neper, the bel and the decibel are
defined functions in units.txt whose bodies call the built-ins.

The build checks each function once so that a call at run time can
fail only on its argument or on a value: the annotations are evaluated
and must be nonzero, since an argument is written as a count of the
parameter's; the body's dimension is taken without evaluating it, by
`dimensionOf` in `dimension-of.ts`, the evaluator's rules over
dimensions alone (a number is dimensionless, a unit is its dimension
through the walk's lookup, a sum checks conformance, a product
combines, a power raises, a call applies the callee's rule), with each
parameter bound to its annotation's dimension, so that a body which
refers to nothing, or is put together wrongly, fails the build with its
span in the definitions text; that dimension is the result's, exact
because a body's dimension cannot vary with the value of its argument,
and is checked against the result's annotation when there is one; and
an inverse's body is taken the same way, with its parameter bound to
the result, and checked against what the parameter takes. A body that
fails at some value, or at every value, builds and fails at the call
that reaches the value: evaluating each body at a sample value is no
check once the elementary functions exist (`ln(x - 1)` fails at one).
Applying and inverting are one operation, a body evaluated under a
binding, and `applyFunction` and `invertFunction` share it: the bound
parameter is resolved before any unit or prefix, and the lookup's
failures are boxed on the way in and unboxed on the way out, so that
the body's own failures can be told from the lookup's without the
evaluator knowing the lookup's error type.

A call costs what its body typed out in its place would, and is
certified the same way: the body is an expression evaluated on balls,
settled at every node, and evaluated again at each pass of the retry
loop, so a cancellation in a body is paid for by the next pass's
digits, and the radius needs nothing new, since a user can write no
primitive, series or loop. Calls are not memoized: a body that calls a
function twice evaluates it twice, so calls nested `k` deep evaluate
the innermost `2^k` times at every pass. That is the cost of the
expression written out, bounded by the ceiling as any expression is,
but a definition that reads small can be large. A composition is not a
built-in, and the difference is the caveat to keep in mind: a parameter
used twice is two occurrences of one ball, treated as independent (the
dependency problem), so `x - x` of an inexact argument never certifies
`0`; a hand-written equivalent of a built-in rounds at every step where
the built-in rounds once, with its radius from one bound over the whole
ball, loses the built-in's exact cases (`ln(8) / ln(2)` is `≈ 3` where
`log(2, 8)` is `= 3`), and can be refused where an intermediate passes
a bound the result does not; and decimal mode rounds each step of a
body to the working digits. [functions.md](functions.md) ("Precision,
the radius and cost") has the reasoning.

## UI

The UI is a handful of Lit components under `src/`, and the shell,
`<app-shell>` (`src/app-shell.ts`), is their composition root. The rest
follows four rules:

- **The view is a function of the state.** Every template is
  `render(state) → html`, and anything the view needs that is not state
  is derived in a pure function beside the component, checked under Node
  (`outcome.ts`, `messages.ts`, `settings-lines.ts`, `system-build.ts`'s
  `tableOf`, `settings.ts`'s `rangesOf` and `clampsOf`).
- **Properties down, events up.** A child component takes what it shows
  as properties and reports what the user did as an event. It never
  reaches for storage or the parent. The shell is the one place that
  turns an event into a state change and an effect (the save).
- **Compose in Lit's own terms.** Lit gives three units of composition:
  custom elements (for a piece with its own state or styles), template
  functions (for a piece with neither), and reactive controllers (for a
  piece of lifecycle). Those are used, and nothing from outside Lit.
- **One file, one job**, named for the thing it renders
  ([layout.md](layout.md)).

### The shell and its parts

The shell holds the three pieces of state the parts share, each with
one source, and derives everything else in `render`: the definitions,
the settings, and the service worker's status.

The definitions: `src/system-table.ts` fetches the bundled `units.txt`
and parses it on the main thread (a few milliseconds), once, and
`src/system-build.ts` builds the table from the definitions at the
ceiling of the retry schedule in force, memoizing one table by its
ceiling, so that the shell, which starts the load when it is connected
and shows a loading message until the promise settles, builds in
`render` and rebuilds only when the precision limit setting moves the
ceiling. The memo is keyed by the definitions and the ceiling, and holds
a failed build too: the system file is checked by `units.test.ts`, so a
failure is a bug, and rebuilding on every render would not change it.
The significand limit is not part of the key, although a build holds
every exact result to it: the shipped file builds at the least limit the
settings allow (`MIN_SIGNIFICAND_LIMIT_BITS`, which `units.test.ts`
checks), and the settings' clamp already keeps the ceiling within the
limit. Loading the components never waits on the table. Should the
fetch fail, or the file fail to parse or build (which `units.test.ts`
guards against), the shell says so instead of rendering a converter;
`tableOf` is the three-state view (loading, failed, built) as a pure
function.

The settings ([settings.md](settings.md)): the shell reads them from
`localStorage` through `settings.ts` when it starts, validated and
migrated, and hands the converter the `NumberContext` they make
(`contextOf`) and the ratio notation's width. `<settings-panel>`
(`src/settings-panel.ts`), the settings sheet, takes the settings and
whether it is open as properties and reports each change the user makes
as a `settings-change` event, and each reset, of one setting or of all,
as `settings-reset`, which the shell applies alike, clamping what
depends on it and saving, and hands back what the clamp moved for the
panel to say; its closing itself is `settings-close`, which the shell
follows. The sheet is a non-modal `<dialog>` fixed to the viewport, a
bottom sheet on a phone and a side sheet on a desktop, opened from the
cog in the header's corner (`<settings-button>`,
`src/settings-button.ts`), whose `click` flips the shell's open state
and which takes focus back when the sheet closes. The probe behind the
sheet's "Measure this device" button (`src/limits.ts`) runs only when
asked, and its proposal is applied as a change like any other.

The worker's status: `<app-footer>` (`src/app-footer.ts`) takes it as a
property, which a reactive controller (`src/subscription.ts`) mirrors
into the shell for as long as it is connected, and checks for an update
when its build number is tapped ([offline.md](offline.md)). The source
(`onWorkerStatus`) calls the listener with the current value at once,
synchronously, and with each new one, and returns the stop; the
controller subscribes on each connect and unsubscribes on each
disconnect, so its `value` is set before the shell's first render and
the shell overrides no lifecycle method for it.

The buttons are three small components, each the one place its look is
defined: `<app-button>` for a button with words in it (Done, Apply,
Retry), `<link-button>` for one that reads as a link (the resets, the
footer's reload and update), and `<step-button>` for a stepper's `−` or
`+` beside a number input. `src/styles.ts` holds the feedback every
button gives and the hint line, the styles the components share.

### Not in this design

A settings store or state manager: the settings are one value, one
reducer line (`clampSettings({...settings, ...change})`) and one effect
(`saveSettings`), and a class around that would hide the simplest part
of the app. Signals (`@lit-labs/signals`) would make the status and the
settings globally readable, which is exactly what keeps a flow hard to
follow; worth revisiting only if the UI gains routes or more than one
page. `@lit/task` for the definitions load: one promise set on one
state field is already the idiom, and `tableOf` gives the three-state
view without a dependency. `@lit/context` for the worker status: two
properties on two children is not deep enough to need it. Each would
cover a part of the shell, but the shell has one async value, one
subscription and two levels of nesting, which is not enough to pay for
a library, and the rule is nothing beyond Lit.

### The converter and its lines

`<unit-converter>` (`src/unit-converter.ts`) is two text inputs, "you
have" and "you want", and an output area. It takes the table, the
`NumberContext` and the ratio notation's width as properties (`table`,
`context`, `ratio`), and its only state is the two strings; on every
change it runs the pipeline and renders either the lines or the error.

The core's surface to the UI is `(table, haveText, wantText, context) →
Result`, and `src/core/pipeline.ts` is that function: `convertText`
parses and evaluates each text and converts the pair, and returns each
step's own error, a text's tagged with the side (`have` or `want`) it
came from, so that the component can mark the input at fault, and the
conversion's about the pair. `evaluateText` is the first half alone;
with the `want` field blank, the outcome is what `have` is in the
primitives (`1 in = 0.0254 m`), as GNU units does. `src/outcome.ts`
turns the result into the lines the output area shows: it calls the
display's `show` and `roundTerms`, and parses the `want` again to write
it, which are views of the result rather than steps of it, and it has
no DOM dependency, so `outcome.test.ts` checks the lines under Node.

A result line is two expressions and a relation: the have as it was
read, and the result composed from the values the display wrote and the
units as they were read, by the grammar's own operators, the value as
the first factor of its unit (`36 m / s`), or multiplying it whole with
`*` where it leads with a number (`5.28 × 1000 ft`), the terms of a list
summed, the argument inside the call. The printer writes both sides
canonically, with `×` for the screen, so every line can be typed back
as a have, and the component styles the numbers among the printer's
pieces. A `<copy-button>` beside each line (`src/copy-button.ts`) copies
the result as the printer writes it with `*`, which parses: typed back
as a have and converted into the line's own unit it gives the line
again, which `outcome.test.ts` checks.

The line is written so that it reads as the expression it means: a
`want` with a magnitude of its own is written with a multiplication
sign (`1 mi = 5.28 × 1000 ft`), since juxtaposing two numbers would read
as one product, and a `want` that is a sum, a difference or a negation
is parenthesized (`1 m ≈ 3.0284676 (ft + in)`,
`1 m ≈ -3.2808399 (-ft)`), since `3.0284676 ft + in` would read as
`(3.0284676 ft) + in` and `-3.2808399 -ft` as a difference. The
component parses the `want` once more to tell, which is the same parse
the pipeline did a moment earlier.

**The relation and the note.** The output shows the two texts and the
value between `=` or `≈`, decided by `show` of `src/core/display.ts` at
the digits and in the rounding mode of the user's settings (eight
digits, half even, by default; the digits asked for are kept apart from
the working precision, [numbers.md](numbers.md), "Certification and the
display rule"): `=` when the value's radius is zero and every digit it
holds is shown, `≈` otherwise. What follows the relation is what `show`
certifies: every digit asked for when the value allows, and otherwise a
note in parentheses after the line, "8 of 12 digits are certain" with
the certified digits shown, "within 2e-30 of zero" with the value shown
as `0`, or "the digits are not certified" for a radius not known. In
decimal mode every line is `=`, except a value whose rounding the
ceiling left uncertified, which is written with the `≈` sign bearing a
dot above it and a note. A condition left undecided at the ceiling
makes every line's relation `≈` and adds a warning per condition,
styled apart from the notes on digits ([functions.md](functions.md),
"An undecided condition").

**A unit list** is shown as the sum of its terms, each unit written as
a single `want` would be, with `roundTerms` applied at the display
precision in the display's mode, and the relation `=` only when every
term is exact by the same rule. The first term keeps its sign and each
later one is joined by `+` or `-` and written unsigned, so that
`-1 m ≈ -3 ft - 3.3700787 in` reads as the expression it is and could
be typed back as a `have`. A term of zero is left out, as it would be
in speech (`1 hr + 1 s`), except that a sum of nothing but zeros keeps
its last term (`0 in`). A list is certified on its unrounded terms, its
remainder is rounded at the digits certified, and its counts, exact
integers, carry no note; when the rounding carried into an earlier unit
the remainder left is a new value, judged on its own, and a last term
that cannot be told from zero is left out as a term of zero is, with
its note, unless it is the only term.

**A conversion into a function** is one line, the `have` and then the
call at the recovered argument, `tempF(212) = tempC(100)`, the argument
written as a count of the unit the function's parameter takes followed
by that unit's text as a `want`'s is written, and by nothing when the
unit is `1`, as for a parameter without an annotation. There is no
reciprocal line: a call is not a ratio, so there is no other way round,
as there is none for a list.

**The reciprocal.** GNU units answers every conversion twice, with the
number to multiply by (`* 36`) and the number to divide by
(`/ 0.027777778`). Dividing by the second number converts the other
way, from `want`s to `have`s, so it is the reverse conversion in
disguise: one `in` is `0.027777778` of `3 ft`. The converter shows that
reverse conversion on a second line, written as the first line is with
the sides swapped, so that both read as statements about quantities and
could be typed back as a `have`:

```
3 ft = 36 in
in ≈ 0.027777778 × 3 ft
```

The `have` takes the unit's place and is written as a unit is, by the
same rule as a `want`: with a multiplication sign when it starts with a
number, since `0.027777778 3 ft` would read as one product, and
parenthesized when it is a sum, a difference or a negation
(`in ≈ -0.027777778 (-3 ft)`). Each line's relation is decided from its
own value: `2 m = 2 m` and `m = 0.5 × 2 m` are both exact, while
`1 in = 2.54 cm` has the approximate `cm ≈ 0.39370079 × 1 in`. The
reciprocal is the ball quotient of one by the ratio the pipeline
returns (the ratio of `want` to `have`, as `convert` would give it with
the two swapped), and it stays in the component: it is a second view of
the same value, like the rounding, not a step of the conversion. GNU
units' verbose form writes the second line as `3 ft = (1 / 0.027777778)
in` instead, which is true but reads as nothing; the swapped line says
what the number is for.

Only a conversion into one unit has a reciprocal. That conversion is
one ratio, `have / want`, and the reciprocal is the same ratio the
other way round, `want / have`, which says the same thing. A conversion
into a unit list is not a ratio but a sum, `3 ft + 3.3700787 in`, a
positional way of writing one quantity, and there is no other way round
for it: inverting each term gives numbers that add up to nothing,
`1 / have` in the same list never conforms (its dimension is the
inverse), and the reciprocal of the total in any one unit of the list
would be a reciprocal of a different conversion, for a unit chosen by
some rule the user did not ask for. GNU units prints no reciprocal for
a unit list either. So a list, typed or named, gets no second line, nor
does a blank `want`, which shows a definition, as GNU units shows one
without a reciprocal. A value of zero has no reciprocal (`0 ft = 0 in`,
and nothing is a multiple of `0 ft`), nor has one that cannot be told
from zero, and the line is left out rather than shown as anything, as
it is whenever the quotient fails. The reciprocal is one step at the
user's context, settled in exact mode and rounded once in decimal mode,
and it runs outside the retry loop: the line shows whatever kind
`1 / value` has at that one pass, a reciprocal that a higher pass would
certify is not retried on its own, and a refusal of it has no words,
the line being left out. Both are [#92][92].

### Messages

The errors the core returns are values with spans and dimensions, not
sentences; `src/messages.ts` puts them into words, quoting the text at
fault and formatting dimensions with `formatDimension`, so that the
wording is tested under Node beside the core rather than in a browser.
A sum that does not conform is worded as the same mismatch between
`have` and `want` would be, with the two operands quoted in place of
the two texts. The two size limits refuse with errors of their own, and
the message words them apart ([numbers.md](numbers.md), "Which limit a
refusal names").

Richer UX is a matter of new components that edit the same two strings
or read the table: autocomplete lists `table.units` and
`table.prefixes`, unit buttons insert text, and error spans drive
highlighting. None of that needs changes to the core.

[88]: https://github.com/bsidhom/exucal/issues/88
[92]: https://github.com/bsidhom/exucal/issues/92
