# Architecture

Exucal is a calculator. Three goals guide its design, in priority
order:

1. Arithmetic is exact, and the calculator is explicit wherever a result
   is not. A value that a fraction can hold is held as that fraction and
   is never rounded. An inexact result shows only the digits the
   calculator has certified and is marked inexact. A note or a message
   says what the calculator could not certify, decide or hold. All of it
   runs as JavaScript in a browser, so the app installs from a web page
   and works offline.
2. The functions a calculator is used for come under the same guarantee:
   the elementary functions, and the special functions most used in
   combinatorics, probability and physics. Each returns an exact value
   in its exact cases and a certified one otherwise.
3. Calculation and conversion are aware of units and kinds. A quantity
   carries its dimension through every operation, and its kind where it
   has one. A kind is a marker that keeps apart quantities a dimension
   alone cannot, as the radian keeps an angle apart from a plain number.
   A mismatch of dimension or kind is an error and never a number.

The design follows from the goals in that order. The numeric type and
the passes of the evaluator serve the first two
([Numbers and precision](numbers.md)). Unit awareness and kind checking
stand beside them, in the quantity and its conformance check. The
definitions file and the two fields, the have and the want, are in the
lineage of [GNU units](https://www.gnu.org/software/units/).

Two rules bind all of the code:

- **The core is pure.** Every function in `src/core/` maps immutable
  inputs to immutable outputs, with no I/O and no globals. A failure
  that the input can cause is returned as a `Result`, a discriminated
  union of a value or an error, and each module defines its own error
  type. A throw marks a violated precondition, which is a bug and never
  an input. Two breaches of that are known: the table's lookup of a
  prefixed unit near the exponent bound ([Definitions](#definitions)),
  and the verification of a root ([Failures](numbers.md#failures)). The
  UI is a thin layer that calls into the core.
- **Lit is the one third-party runtime dependency.** Arithmetic is built
  on `bigint`. [Security](security.md) gathers what follows from the
  rule, with the rest of the project's security stance.

The overview follows the pipeline stage by stage, from the definitions
file to the **output lines**, the lines of text the app answers with.
The parts with a design of their own have pages of their own, and
[Developer documentation](README.md) lists them all. The overview leans
most on five:

- [Numbers and precision](numbers.md): the number type, the precision
  model, the retry loop, the two modes and the size limits.
- [Built-in functions](builtins.md).
- [Defined functions](functions.md).
- [The ratio notation](notation.md).
- [The settings](settings.md).

The design rests on these decisions, each described in the section
linked:

- **The core is one pipeline of pure functions.** The shape of the want
  selects the form of the answer, and the UI composes the output lines
  from what the pipeline returns ([Pipeline](#pipeline)).
- **Every scalar is a `Ball`**, an exact midpoint with a radius
  ([Numbers](#numbers)).
- **A quantity is a ball paired with a dimension, and a kind is an entry of the dimension.**
  No separate mechanism carries a kind, and only the conformance check
  tells the two roles apart
  ([Quantities, dimensions and kinds](#quantities-dimensions-and-kinds)).
- **A conversion is one quotient of two scalars, taken after the conformance check.**
  The errors that a later pass can resolve are kept apart from those it
  cannot ([Conversion](#conversion)).
- **A unit list is counted on midpoints and rounded as one sum**
  ([Unit lists](#unit-lists)).
- **A function is a body evaluated under a binding.** Applying a
  function and inverting it are one operation ([Functions](#functions)).
- **One grammar serves the two fields and the definitions file.** The
  binary operators are data that the parser and the printer share
  ([Expressions](#expressions)).
- **The parsers are built from combinators with ordered choice.** A
  parse costs a constant number of attempts per token, and an error is
  reported where the parser got furthest ([Parsing](#parsing)).
- **The evaluator resolves names through a lookup function**, so that
  one evaluator serves the user's texts and the build of the table
  ([Evaluation](#evaluation)).
- **The definitions table is built by walking the definitions on demand.**
  Definitions may stand in any order, and an ambiguous name is a fault
  of the table, never of the input ([Definitions](#definitions)).
- **The view is a function of the state.** The shell is the one place
  where an event becomes a change of state ([UI](#ui)).
- **The outcome composes every output line as an expression, and the printer writes it.**
  So every line parses back
  ([The converter and its lines](#the-converter-and-its-lines)).

## Pipeline

```
definitions text ──parseDefinitions──▶ Definition[] ──buildTable──▶ UnitTable
                                                                        │
have text ──parseExpr──▶ Expr ──evaluate──▶ Quantity ─┐                 │
                                                      ├─▶ convert ──▶ Result<Conversion>
want text ──parseUnitList──▶ Expr[] ──evaluate──▶ Quantity[] ─┘   (or convertToList,
                                                                   or invertFunction)
```

Each arrow is one pure function of the core, and the two parsers of the
user's texts share `expr.ts`. Parsing never touches the table, and
conversion never formats.

`convertText` in `src/core/pipeline.ts` composes the arrows of the two
texts. It adds one decision of its own: it chooses the **output mode**,
the form of the answer, from the shape of the want
([The want field](../docs/expressions.md#the-want-field)).

| The want                                                                        | Output mode                       | Function         |
| ------------------------------------------------------------------------------- | --------------------------------- | ---------------- |
| the bare name of a unit list the definitions file defines, or two or more items | conversion into a unit list       | `convertToList`  |
| the bare name of a defined function                                             | conversion into a function        | `invertFunction` |
| any other single expression                                                     | conversion into one unit, a ratio | `convert`        |

A blank want is a fourth output mode, the have in the primitives. It
converts nothing, so it takes `evaluateText`, which runs the have's
arrows alone.

`convertText` returns a `Conversion`: the values of the answer, with the
have and the want as the expressions the parser read. It writes no text.
**The outcome** is `src/outcome.ts`, a module of the UI. Its `outcomeOf`
calls `convertText`, or `evaluateText` for a blank want, and composes
the output lines from the result
([The converter and its lines](#the-converter-and-its-lines)).

The pipeline parses each text once and then evaluates in passes. A
**pass** is one evaluation and conversion at one working precision. The
passes rise along a retry schedule until every value is certified at the
display digits
([Working precision and the schedule](numbers.md#working-precision-and-the-schedule)).

Each stage's error keeps its own type. An error in a text carries a
**span**, the pair of offsets of the text at fault. The pipeline adds
only the side: it tags the error with the field it came from, have or
want. **The converter**, the component of the two fields, marks that
field. An error of the conversion is about the pair and has no side.

## Numbers

[Numbers](../docs/numbers.md) gives the model as a user needs it, and
[Numbers and precision](numbers.md) gives the design. In brief, every
scalar is a `Ball`: a midpoint and a radius. The midpoint is an exact
fraction times a power of ten (`Scaled` over `Rational`, both on
`bigint`). The radius is a coarse binary bound on the distance from the
midpoint to the true value. An exact value has a radius of zero and
stays exact through every exact operation. So in exact mode a conversion
between units with rational definitions is exact, and it is rounded
once, at the display. The inexact functions run on a binary fixed-point
kernel and return a ball whose radius bounds their error. In exact mode
the pipeline retries at more digits until the display certifies the
display digits, up to a ceiling. In decimal mode it rounds every step
once, as a hand calculator does, and treats the rounded value as exact.
A significand limit and an exponent bound keep every value to a size the
machine can hold.

## Quantities, dimensions and kinds

[Quantities](../docs/quantities.md) defines a quantity, its dimension
and its kind, and states the rules they follow. Two types and one check
implement them.

### The two types

`Quantity` (`src/core/quantity.ts`) pairs a `Ball` with a `Dimension`.
The ball is the quantity's scalar, which the code names `magnitude`.
`ball.ts` and `dimension.ts` know nothing of each other, and
`quantity.ts` is the one layer that joins them. The table stores
quantities, the evaluator produces them, and `convert` consumes them.

A `Dimension` (`src/core/dimension.ts`) is an exponent vector: a map
from a primitive's name to a `Rational` exponent, with zero exponents
left out. The exponents are rational so that a root is exact on the
dimension side. The dimension arithmetic is multiplication, division and
raising to a rational power. It drops an exponent that cancels to zero,
takes no context, and never fails.

The definitions file declares each primitive in one of two roles:

- A dimension primitive (`m`, `kg`, `s`, etc.) is a base quantity.
- A kind primitive (`radian`, for one) is a marker of a kind, with no
  dimension of its own.

A kind primitive rides in the same exponent vector as the dimension
primitives, so no separate mechanism carries a kind. Only the
conformance check treats the two roles differently. The core holds no
list of kinds. The roles come from the table, as its `Primitives`, in
the order the file declares them. A name the table does not declare
counts as a dimension primitive.

### The conformance check

[Conformance](../docs/quantities.md#conformance) states the rule and
the pairs of quantities it is required of. `checkConformance` in
`dimension.ts` is its one implementation, in two steps:

1. It compares the two vectors restricted to the dimension primitives. A
   difference is a `dimensionMismatch`.
2. It compares the full vectors. A remaining difference is a
   `kindMismatch`, which names the kind primitives that differ, in
   declaration order.

The order of the steps reports the physical error first. A kind mismatch
therefore always means that the two dimensions agree. Every caller
passes the table's primitives, so the roles are the same in a sum, in a
call and in a conversion.

`formatDimension` writes a dimension for a message, by the rule
[How dimensions are written in messages](../docs/quantities.md#how-dimensions-are-written-in-messages)
gives. It builds the dimension as an expression (`dimensionExpr`) and
hands it to the printer ([Expressions](#expressions)). The text is
therefore in the expression language, and it parses back.

### The arithmetic on quantities

The arithmetic the evaluator needs lives in `quantity.ts`. Each
operation is a ball operation beside the matching dimension operation.
Only the scalar can fail, so the failures of a product, a quotient and a
power are those of `ball.ts`. Each of the three takes a `NumberContext`:

- A product and a quotient take it for the significand limit, within
  which an exact result is formed, and for the working grid, the digits
  a pass rounds an inexact value onto ([Settling](numbers.md#settling)).
  When an inexact product or quotient would pass the limit, its operands
  are put onto the grid first.
- A power takes it for both of those, and for the root or the log-space
  route of an exponent that is not an integer
  ([Roots and powers](numbers.md#roots-and-powers)).

A negation touches the scalar alone and cannot fail.

A sum and a difference have a dimension side too. Only two quantities of
one dimension and one kind have a sum, so the dimension side is the
conformance check, and its failure is a `ConformanceError`. These two
operations therefore take the primitives, as `convert` does. The scalars
are added within the significand limit of the context
([Sums and alignment](numbers.md#sums-and-alignment)). No case is
special for zero: `0` is dimensionless, and `1 m + 0` is a dimension
mismatch.

## Conversion

[How a conversion is answered](../docs/quantities.md#how-a-conversion-is-answered)
states what a conversion into one unit answers with, and what stops it.

`convert` takes the two quantities, the table's primitives and the
context. It runs the conformance check, for which it needs the
primitives' roles. The answer is then the ball quotient of the two
scalars: the exact quotient of the midpoints, with the radii propagated.
No factor is looked up, since each quantity is already held in the
primitives. So `1 m` into `in` is exactly `5000/127`, and it becomes
`39.370079` only at the display. The context serves the quotient's size
prediction ([The significand limit](numbers.md#the-significand-limit)).

`convert` fails in five ways. The retry loop treats them differently,
and that difference is the reason the errors are kept apart.

| Error                                 | Cause                                                                       | Retried at the next pass        |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------- |
| `dimensionMismatch` or `kindMismatch` | The pair does not conform. The error carries both dimensions.               | no                              |
| `zeroWant`                            | The want's scalar is exactly zero, and nothing is a multiple of it.         | no                              |
| `unresolvedWant`                      | The want's ball contains zero without being exactly zero.                   | yes: a later pass may narrow it |
| `unresolvedBound`                     | The ratio's ball straddles the exponent bound.                              | yes, for the same reason        |
| `overflow`, `underflow` or `tooLarge` | The quotient is refused, at the exponent bound or at the significand limit. | no: a refusal is never retried  |

The conformance check comes first, so `1 m` into `0 s` is a mismatch and
never a `zeroWant`. `unresolvedWant` is to `zeroWant` as the ball's
`unresolved` is to its `divisionByZero`. `unresolvedBound` also covers a
list's count, product or remainder that straddles the bound, and its
message is worded apart from that of `unresolvedWant`.

The quotient is refused at either size limit:

| You type                 | Into                      | The refusal                                                                    |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| `1e999999999999999999 m` | `1e-999999999999999999 m` | `overflow`: the ratio's exponent passes the bound                              |
| `3^30000 m`              | `5^20000 m`               | `tooLarge`: the ratio's exact significand passes the default significand limit |

The message of the second names `approx` around the have, the one
operation whose purpose is to make a value inexact.

The pipeline then takes the ratio as one step of the expression. It
settles the ratio in exact mode and rounds it once in decimal mode
([Settling](numbers.md#settling)).

### Unit lists

[Unit lists](../docs/quantities.md#unit-lists) states what a unit list
answers with, the rules its units must satisfy and how the remainder is
rounded. `convertToList` is the conversion into a unit list, over the
same conformance check as `convert`. A **typed list** is one typed out
in the want, `ft;in`. A **defined list** is one the definitions file
names, `time`.

#### How the want is read

The pipeline parses the want as a unit list, and a single expression is
a list of one item. It then reads the items in this order:

1. One item that is the bare name of a defined list means that list.
2. One item that is the bare name of a defined function means a
   conversion into the function ([Functions](#functions)).
3. Any other single item is a unit and goes through `convert`.
4. Two or more items are a typed list. Each is evaluated as an
   expression and kept with its text, which is sliced from the want by
   the item's span.

When a unit of a typed list fails a check, the error carries the texts
of all the units, so that the message can quote the one at fault. A
defined list passed the checks when the table was built
([Definitions](#definitions)). It can fail only for not conforming to
the have. That failure is reported as the mismatch of the pair, as for a
single want, so that the message quotes the name the user typed.

#### The checks on the units

`convertToList` checks the units in order, each for three things:

1. The unit conforms to the have (`nonconformingUnit` otherwise).
2. The unit's scalar is positive and its ball excludes zero
   (`nonpositiveUnit`).
3. The unit is smaller than the one before it, by midpoint
   (`unitOutOfOrder`).

The first failure is the error, and it carries the index of the unit at
fault.

#### A typed list's unit that straddles zero is not retried

A unit of a typed list whose ball straddles zero at a pass fails as not
positive, and the retry loop does not try the next pass. The same
expression as a single want is retried, and answers. Three facts of the
code produce the difference:

- The second check is on the unit's whole ball. It fails when the
  midpoint is zero or negative, and also when the ball contains zero.
  One error, `nonpositiveUnit`, covers both: a unit that is
  certainly not positive, which no pass can change, and a unit that
  cannot be told from zero at this pass, which a later pass may narrow.
- The retry loop continues on four errors only, and a list's error is
  none of them
  ([Working precision and the schedule](numbers.md#working-precision-and-the-schedule)).
  So the loop ends on `nonpositiveUnit` at the first pass, whichever of
  the two cases it stands for.
- A single want takes another path. `convert` divides by the want, the
  ball quotient is `unresolved` for a divisor that contains zero, and
  `convert` reports it as `unresolvedWant`, which the loop retries.

| You type | Into                           | Exucal shows                                                    |
| -------- | ------------------------------ | --------------------------------------------------------------- |
| `1 m`    | `(1e-30 + approx(1) - 1) m`    | `≈ 1e+30 × (1e-30 + approx(1) - 1) m`                           |
| `1 m`    | `ft;(1e-30 + approx(1) - 1) m` | an error: the unit is not positive, or cannot be told from zero |

At the default settings the first pass settles onto a grid of 28 digits,
so `approx(1)` has a radius of about `1e-27` there, and the want's ball
contains zero. The second pass gives `approx(1)` a radius far below
`1e-30`, and the want is positive. The single want reaches that pass,
and the list does not.

The check is on the whole ball by design. A unit that cannot be told
from zero is no size to count by, and a unit that excludes zero keeps
the remainder's division from ever being `unresolved`. The gap is that
the failure is final at the first pass. It is accepted as today's
behavior, and the retry is
[#198](https://github.com/bsidhom/exucal/issues/198).

#### The counts and the remainder

The counts are taken from the midpoints. Each unit but the last gets the
integer count of it that fits in what the earlier units left, truncated
toward zero, so that every term has the sign of the have. A count is
therefore an exact integer and is never `unresolved`. The last unit gets
the remainder: the ball of the have less the counted units, computed
with the ball operations. So the terms times the units add up to the
have exactly when everything is exact, and they contain it otherwise.

Three cases depart from the truncation:

- **A ratio whose ball straddles an integer counts as that integer.**
  `turn / deg` straddles 360 once both units carry the radius of `pi()`.
  Counting 360 leaves a remainder that is a ball around zero, which the
  outcome leaves out. Truncating would leave a whole of the unit:
  `359 deg + 60 arcmin`.
- **A ratio whose integer part cannot be formed within the significand limit is counted as its midpoint settled toward zero.**
  The count is taken at the working digits and is still an exact
  integer. The remainder is what that count leaves. `1e999999999 m` into
  `ft;in` is such a ratio.
- **A count whose ratio falls below the exponent bound is zero.**
  Nothing of that unit fits in what is left, as in
  `1e-999999999999999999 s` into `hr;min;s`.

Any other refusal of a count, of a count times its unit or of the
difference it leaves is the list's failure, and so is an `unresolved` of
any of them. The pipeline reports it as the conversion's, as it reports
a refused ratio. `3^32767 m` into `ft/7^21845; in/7^21845` is
`tooLarge`: its remainder does not align within the default significand
limit.

#### Rounding the terms as one sum

Rounding each term on its own is wrong for a sum. A remainder of
`11.9999999988 in` at eight digits is `12 in`, which beside `2 ft` reads
as a different quantity. `roundTerms` of `convert.ts` is the display
rounding that goes with the sum:

1. It rounds the remainder's midpoint in the display's rounding mode, as
   `roundTo` does. The outcome passes the digits to round at: the digits
   the remainder certifies, which are the display digits when it
   certifies them all.
2. It widens the remainder's radius by the distance the rounding moved
   the midpoint, so that the rounded terms still contain the have.
3. When the rounding changed the remainder, it takes the counts again
   from the rounded sum. A remainder that rounds up to a whole of an
   earlier unit then carries into that unit, through as many units as it
   must.

That is one rounding of the whole sum, by less than a unit in the last
digit of the remainder, and the second decomposition is exact.
`3599.9999999999 s` into `hr;min;s` is `≈ 1 hr`. Under the rounding mode
`floor` nothing rounds up, and it stays `≈ 59 min + 59.999999 s`.

`roundTerms` returns the terms as they are in two cases. The first is a
remainder already exact at those digits. The second is a carry whose
rebuilt total fails, since the rebuilt total can pass the exponent bound
where the terms did not. The uncarried terms still contain the have, so
the outcome can show them.

The counts are integers, and `roundTerms` leaves them alone. The outcome
writes each count with the decimal display at the display digits. Under
the ratio notation that produces a defect
([#248](https://github.com/bsidhom/exucal/issues/248)). The relation is
taken from `show`, which under the ratio notation counts any integer as
exact, while the count's text is rounded to the display digits. So a
count longer than the display digits is shown rounded and the line still
says `=`:

| You type | Into    | Exucal shows                        | Note                                 |
| -------- | ------- | ----------------------------------- | ------------------------------------ |
| `1e10 m` | `ft;in` | `= 3.2808399e+10 ft + (200/127) in` | under the ratio notation at width 20 |
| `1e10 m` | `ft;in` | `≈ 3.2808399e+10 ft + 1.5748031 in` | under the digits notation            |

The count is 32,808,398,950.
[In a unit list](notation.md#in-a-unit-list) says what the ratio
notation writes in a list.

### Functions

[Functions](../docs/definitions.md#functions) states how a function is
defined, and
[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states what a function answers with as the want.
[Defined functions](functions.md) has the whole design: the grammar,
the annotations, the conditions and their three-valued check, the
build-time checks, what a call costs and the alternatives weighed. The
parts that touch the pipeline follow.

#### A defined function

A **defined function** is one the definitions file defines: a body with
parameters, bound by position, and an optional inverse. Nothing about a
function touches `Quantity`. A call is a quantity like any other once
the body has run, and the rest of the expression goes on as before. A
call checks the function's conditions after the arguments conform and
before the body runs. A condition left undecided is assumed to hold. If
it is still undecided at the ceiling, it reaches the outcome as a
warning ([An undecided condition](functions.md#an-undecided-condition)).

Applying a function and inverting it are one operation: a body evaluated
under a binding. `applyFunction` and `invertFunction` share it, in two
steps:

- The bound parameter is resolved before any unit or prefix.
- The lookup's failures are boxed on the way in and unboxed on the way
  out. The body's own failures can then be told from the lookup's, and
  the evaluator need not know the lookup's error type.

#### Conversion into a function

The pipeline reads a want that is the bare name of a defined function as
a conversion into that function. It answers with the call that produces
the have: `tempF(212)` into `tempC` is `= tempC(100)`. `invertFunction`
runs the steps the user page lists, and each failure has its own error:

1. A function without an inverse is a `noInverse`, on the want side.
2. A have that does not conform to the function's result is the ordinary
   mismatch of the pair.
3. The have must meet the inverse's conditions. `invertFunction` then
   evaluates the inverse's body with its parameter bound to the have,
   through the table's lookup. A body that fails for the value is an
   `inverseFailed`, on the want side, carrying the body's error as a
   call carries its body's.
4. The recovered argument must meet the function's conditions. A
   condition that fails on either side is a `wantConditionFailed`, and
   an undecided one is assumed, as at a call.
5. The function is applied to the recovered argument, since the inverse
   is the one part of a definition the build cannot check against its
   function. A value certainly other than the have is an
   `inverseMismatch`, and so is a failure of the function's body there.
   Two exact values are compared exactly. Otherwise the two differ
   certainly when their difference lies wholly on one side of zero. The
   check refutes a wrong answer and proves nothing, since overlap is all
   that two balls can decide.

The `Conversion` carries the recovered argument, the unit the parameter
takes with its text, and the argument as a count of that unit. The
outcome can then write the count as it writes any value beside a unit.
The count is a quotient. It can be refused as a ratio can, and the
refusal is then the conversion's.

A want that is a call, `tempC(100)`, is not a conversion into a
function. It is an expression, and the conversion is the ratio, with a
reciprocal line.

#### A built-in

A **built-in** is a function the core implements in code
(`src/core/builtin.ts`, with the set in `builtins.ts`):

- a name;
- the count of arguments it takes;
- a dimension rule, from the dimensions of its arguments to the
  dimension of its result;
- the function itself, from balls to a ball at a working context.

The function returns the kernel's ball as it is and rounds in no mode.
The evaluator settles the result, as it settles every result.

Built-ins share the function namespace. The table carries the set of
built-ins it was built against, and a call's name resolves to a defined
function first and a built-in second. A built-in has no inverse and is
not looked up as a want. Its bare name as the want falls to the unit
lookup, which reports a `functionAsUnit` error, as it does for a defined
function's name anywhere but in a call or as the want.
[Built-in functions](builtins.md) lists each built-in's rule, domain,
exact cases and edges.

#### What a call costs

A call costs what its body typed out in its place would, and its digits
are certified the same way. The body is an expression evaluated on
balls, settled after every operation and evaluated afresh at every pass.
So a call is not memoized, two uses of a parameter are two independent
copies of its argument, and a composition of built-ins is not a
built-in.
[Precision, the radius and cost](functions.md#precision-the-radius-and-cost)
has the consequences and the reasoning, and
[Exactness and cost](../docs/definitions.md#exactness-and-cost) states
them for a user.

## Expressions

[The expression language](../docs/expressions.md) states the language,
and [Grammar and precedence](../docs/expressions.md#grammar-and-precedence)
gives its six levels. One grammar serves the two fields and the bodies
of the definitions file, so anything that can be typed can also be
defined. The grammar is written out, production by production, in the
header comment of `src/core/expr.ts`. That comment is the
hand-maintained form of the grammar, and none of it is repeated here.
The user docs say "number" where the code says **literal**, and both
words name a decimal as it is typed.

### What the parser and the printer share

The binary operators are data in `expr.ts`. `BINARY` gives each operator
its level and its symbol, and `LEVELS` orders the levels, loosest first.
The parser builds its two left-associative levels, `+` with `-` and `*`
with `/`, from that data. The printer, `src/core/print.ts`, places its
parentheses by the same data. So the parser and the printer cannot
disagree on the level or the symbol of a binary operator.

The rest of the grammar is written once in each: the nesting of the
levels, the negation, the power, and the rule that a number only starts
a product. A property test keeps the two in step for those. It prints
random trees (`src/testing/expr.ts`) and parses them back.

### The tree

A node of the tree is one of six things:

- a number, which keeps the text it was read from, so that `1e3` is
  written back as `1e3` and not as `1000`;
- a unit name;
- a binary operation of two subtrees: a sum, a difference, a product, a
  quotient or a juxtaposition;
- a negated subtree;
- a subtree raised to an exponent;
- a call, which holds the name, with a span of its own, and the
  arguments.

Juxtaposition, writing two factors side by side, is its own operator in
the tree, `juxtapose`. The evaluator multiplies it as it does `*`. The
tree keeps the two apart so that the printer can write `2 m` back as it
was read. A number is never negative in the tree: `-2` is the negation
of `2`.

Every node carries the span of the text it came from. An error found
later in the pipeline, an unknown unit or a mismatch, points back at the
input through it. `parseExpr` knows nothing about units, and `evaluate`
knows nothing about text. `Span` has a small module of its own, since it
is not a parsing concept: every later stage locates its errors with it.

### Three decisions of the parser

**A call is decided by the text alone.** The parser cannot ask the table
whether a name is a function, so the rule is lexical
([Calls and arity](../docs/expressions.md#calls-and-arity)). No space
before the `(` makes a call, and a space makes a juxtaposition. So
`kg (m/s)` is a product, and `kg(m/s)` is a call of `kg`, which the
evaluator reports with a message that shows the product. That is the one
rule of the grammar that depends on whitespace, and
[Alternatives considered](functions.md#alternatives-considered) weighs
the alternative. The count of arguments is the evaluator's to check, not
the parser's.

**An exponent travels undivided.** An exponent is never an expression,
so it is known when the text is parsed. The tree holds it as the two
literals the parser read (`Exponent`), with no quotient taken. The
parser checks two things, both read off the literals with nothing
formed:

- Each literal can be formed as a fraction within **the hard bound**,
  the most the significand limit can be set to.
- The divisor is not zero.

The evaluator takes the quotient, where the significand limit of the
context applies (`reduceExponent`). Reducing the exponent in the parser
is ruled out. The parser has no context to bound a reduction by, so it
would run Euclid's algorithm on literals as long as the hard bound
allows, on every keystroke. That is far too slow for long literals.

**A name is taken as long as it goes.** `m2` is one name, never `m`
beside `2`. Whether a name means anything is the table's to say.
Whitespace is spaces and tabs and never a line break, since a definition
is one line and the definitions parser embeds this grammar.

### The list grammar

A unit list, `ft;in`, is one or more expressions separated by `;`. It is
not an expression: `;` binds looser than every operator and cannot stand
inside parentheses. `parseUnitList` reads one. `expr.ts` also exports
the list grammar over any item parser (`unitListOf`), since the
definitions parser keeps each item with its text.

### The printer

The printer writes a tree back as text and never changes a tree. Its
text is **canonical**: a tree has one text, whatever text it was parsed
from ([What the app writes back](../docs/expressions.md#what-the-app-writes-back)).
The rules are these:

- One space stands between juxtaposed factors and around every other
  binary operator.
- A quotient of two literals is written tight, as `5000/127`.
- The parentheses are the fewest that parse back as the same tree.
  Each position of the grammar reads an operand that binds at least at
  some level, and an operand that binds looser is parenthesized
  (`levelOf`). One position has a rule the levels do not express. A
  number cannot follow a factor by juxtaposition, so a right operand of
  a juxtaposition that leads with a number is parenthesized too, as in
  `2 (3 m)`.

The output is a list of pieces, each of which says what it is: a number,
a name, an exponent or a symbol. The converter styles a result's numbers
through them, and `text` joins them. The caller chooses the product
sign, so that the screen shows `×` where the copy text has `*`.

## Parsing

[Errors](../docs/expressions.md#errors) states how a parse error reads
to a user. Both parsers, of expressions and of definitions, are built
from one small set of parser combinators in `src/core/parser.ts`.

A parser is a plain function from the input text and a position to a
reply. The reply is the value the parser recognized with the position
just past it, or an error. A grammar is plain code that combines parsers
into parsers:

- primitives for a fixed string, a pattern and the end of input;
- combinators for sequencing, ordered choice and repetition;
- `chainl1`, for one left-associative precedence level;
- `spanned`, which attaches a span;
- `check`, which validates a recognized value;
- `lazy`, for self-reference.

The types carry the shape of the grammar. A sequence of parsers is a
parser of a tuple, and a choice is a parser of a union, so a grammar
that type-checks produces the tree its types say it does.

### Why combinators

Combinators were chosen over a hand-written recursive-descent parser and
over a Pratt parser, a top-down operator-precedence parser, because the
grammars are small and fixed. The expression language has a handful of
precedence levels. Each is one `chainl1` over the level below it, or one
`many` for juxtaposition. A definition has two or three fields.

A Pratt parser is general. It drives a table of operators with numeric
binding powers from a loop, and the loop's invariant has to be checked.
That generality buys nothing for a grammar this size. A combinator
grammar is checked by reading it against the grammar it transcribes. A
Pratt loop can also be written with `flatMap` on the same primitives,
without changing them, so the choice closes no door.

### Ordered choice, and what a parse costs

`alt` is ordered choice, and the only backtracking is local. `alt(a, b)`
tries `a`. If `a` fails, however far into the input it got, the position
is rewound and `b` is tried from the same place. The first alternative
that matches is taken for good. A failure later in the parse never
reopens an earlier choice, so the parser never searches a space of parse
trees.

The rewinding lets an alternative be written without lookahead. An
optional exponent, written `optional(seq(symbol("^"), exponent))`, may
consume the `^` before it finds no exponent, and it still matches
nothing cleanly.

The work of a parse is the number of primitive matches attempted, of
`string` and of `regex`. Text is read more than once only when an
alternative fails after it has consumed some text, and the next
alternative reads the same text again. Unmemoized ordered choice is
exponential in that case. `alt(seq(p, a), seq(p, b))` parses `p` twice,
and that pattern nested `k` deep parses the innermost `p` `2^k` times.

The grammars here never share a prefix between alternatives. At every
`alt`, the first primitive tells the alternatives apart: a digit, a name
followed by `(`, a name not followed by it, a `(`, or an operator's
symbol. So all but at most one alternative fail on their first
primitive, at a constant cost. An alternative fails after it has
consumed input in three ways only:

- **An operator has nothing valid after it**, as in `3 m ^`. The parser
  rewinds to the operator and fails there at once.
- **A call's argument list fails.** The call has consumed its text. The
  alternatives after it are a plain name and an expression in
  parentheses, and each fails at its first primitive.
- **An expression in parentheses fails inside**, as in `(2 m`. It is the
  last alternative of its `alt`, so no alternative reads the text after
  it.

In none of the three is text read twice. Each character is consumed by
one primitive, and each failed alternative costs one primitive attempt.
A parse therefore costs a constant number of primitive attempts per
token, times the depth of the grammar, since each reply passes up
through the enclosing combinators. A text of a hundred characters is a
few hundred primitive attempts.

Any grammar built on these combinators must keep two disciplines for
that bound to hold:

- The alternatives of one `alt` begin with different tokens.
- Repetition is written with `many`, `many1` or `chainl1`, never with a
  recursive alternative.

The call rule shows what the first discipline takes. A call and a plain
name begin alike, with a name. A plain name is read only where no `(`
follows it, and the lookahead includes the name's own characters, so
that the match cannot back off to a shorter name in front of the `(`.
With a lookahead for `(` alone, a call whose argument list fails would
be read again as a shorter name before a parenthesized factor. A nested
call with an error in it would then cost `2^k` for `k` levels.

A cut combinator is ruled out for this. A cut commits an `alt` once a
prefix has matched, and it would serve other grammars. But a committed
failure skips every enclosing `alt`, `optional` and `many`, so a
misplaced cut changes the meaning of valid input. The local lookahead
has no such failure mode.

### The furthest expectation

Every reply carries the furthest expectation. An `Expectation` is a
position and the labels of the primitives tried there. A success carries
one as a failure does. Every combinator keeps whichever of its parts got
furthest, and merges the labels of those that tie. So the error of a
parse says where the parser got furthest and what it wanted there,
whatever alternatives it undid afterwards.

For `3 m ^` the error says "expected a number or `(`" after the `^`. The
optional exponent fails there, the parser backs out of it, the product
ends, and the end of input is then expected at the `^`, which is
earlier. The furthest expectation survives. A backtracking parser
without it reports the position where the outermost rule gave up, which
is usually not where the mistake is.

### A rejection is final

`check(parser, validate)` turns a recognized value into a `rejected`
error when `validate` says so. The error carries the value's span and a
reason. No combinator retries past a rejection: the text was understood
and found unacceptable, not misread, so another reading would only
produce a worse error. `check` is the only source of `rejected` errors.

The reason is data, the `R` of `Parser<A, R>`. The expression grammar's
reason is its `Rejection`, which has five cases. A user meets four of
them as a size refusal, made as the text is typed:

| `Rejection`             | Cause                                                                    | To a user               |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------- |
| `numberTooLarge`        | a literal whose significand is past the hard bound                       | a size refusal          |
| `numberOverflow`        | a literal whose exponent passes the exponent bound                       | a size refusal          |
| `numberUnderflow`       | a literal whose exponent falls below the exponent bound                  | a size refusal          |
| `exponentTooLarge`      | a `^` exponent that cannot be formed as a fraction within the hard bound | a size refusal          |
| `exponentDividesByZero` | a `^` exponent written as a quotient by zero                             | an error as it is typed |

`parseDecimal` returns a literal past the exponent bound as the bound's
own `overflow` or `underflow`, the refusal a computed value past the
bound gets, and the grammar maps it to its `Rejection`. The parser
reports each case as a parse error at the literal's span.
`describeRejection` in `src/messages.ts` words the reason, and the
message quotes the literal before it:
`"12e1000000000000000000": this number's exponent passes 10^18.` No
sentence is written in the core.

### What a parse error is

A parse error is therefore one of two things:

- Nothing acceptable stands at a position. The error carries the
  position and the labels of what would have been accepted.
- Text at a span was recognized and rejected. The error carries the span
  and the reason.

Spans are attached with `spanned` on the leaves. A composite node spans
from its first part to its last: a negation from its `-`, a call from
its name to its `)`, and an expression in parentheses with its
parentheses. A message quotes that text, so `1 / (2 - 2)` quotes
`(2 - 2)`.

### Purity

The combinators are pure: a parser is a closure over its configuration
and a function of the text and the position. Two pieces of mutable state
are internal and cannot be observed. `regex` reuses one sticky `RegExp`,
whose `lastIndex` it sets before every use, and `lazy` memoizes the
parser it builds. A `many` of a parser that matches the empty string
would loop forever. That is a bug in a grammar, not an input that can
fail, and it throws.

## Evaluation

[Evaluation order and error locations](../docs/expressions.md#evaluation-order-and-error-locations)
states the order in which an expression is computed and the text each
error quotes.

`evaluate` takes four things: an `Expr`, a `Lookup` for the names of
units and functions, the table's `Primitives` and the working
`NumberContext`. It returns the `Quantity` the expression denotes. A
**node** is one operation of the tree as the evaluator walks it, which
the user docs call a step.

### What each node computes

- A number is a dimensionless quantity.
- A unit name is whatever the lookup says it is.
- Juxtaposition and `*` multiply, `/` divides, `+` and `-` add and
  subtract, and a negation negates, all by the arithmetic on quantities
  ([Quantities, dimensions and kinds](#quantities-dimensions-and-kinds)).
- `^` raises to the exponent the parser read.
- A call applies a function.

**The exponent of `^`** is made a fraction at this point, within the
significand limit (`reduceExponent`, which `dimensionOf` applies under
the build's context too). Each literal's significand is held to the
limit, as every literal's is. The quotient of the two is taken on
`Scaled` values, whose powers of ten cancel at no cost. The fraction is
then formed within the limit.

| You type           | Exucal shows                        | Note                                        |
| ------------------ | ----------------------------------- | ------------------------------------------- |
| `2^(1e30/1e30)`    | `= 2`                               | the powers of ten cancel, at any limit      |
| `2^1e-30000`       | refused: past the significand limit | at the default limit                        |
| `pow(2, 1e-30000)` | `≈ 1`                               | `pow` takes log space for the same exponent |

`^` and `pow` disagree on such an exponent
([Roots and powers](numbers.md#roots-and-powers)).

**A call** resolves its name through the lookup, to a defined function
or to a built-in (`ResolvedFunction`). It then checks the count of
arguments, before any argument is evaluated, since the count belongs to
the shape of the call
([Calls and arity](../docs/expressions.md#calls-and-arity)). A wrong
count is an `arityMismatch`. The rest depends on the function:

- For a defined function, the call evaluates the arguments, checks that
  each conforms to the unit its parameter takes, and evaluates the body
  with the parameters bound to the arguments by position
  ([Functions](#functions)).
- For a built-in, the call evaluates the arguments and applies the
  built-in's dimension rule to their dimensions. A failure of the rule
  is a `builtinArgument` at the call, carrying the rule's error and
  every argument's span. The call then applies the built-in's function
  to the scalars.

### The context, the primitives and the collector

Every node is a step at the context. Its result is settled in exact mode
and rounded once in decimal mode ([Settling](numbers.md#settling)). The
arithmetic takes the context too:

- Every sum aligns within the significand limit.
- Every product, quotient and power holds its exact result to that limit
  and to the exponent bound.
- Every built-in computes at the precision of the context.
- Every literal's significand is checked against the limit.

In exact mode an exact value is never rounded.

The primitives go to every sum, whose operands must conform. The check
is the one that conversion applies to the have and the want, with the
same roles, so two quantities can be added exactly when one converts
into the other. The primitives come from the table for the user's texts.
While the table is being built, they come from the definitions,
collected before the walk ([Definitions](#definitions)).

`evaluate` also takes a collector of assumptions, when the caller gives
one. It gathers the conditions that the calls in the expression assume
([An undecided condition](functions.md#an-undecided-condition)).

### Names are resolved through a lookup

Names are resolved through a lookup function, not a table, because one
evaluator serves both ends of the pipeline:

- The table supplies a lookup over its finished units, for the user's
  have and want. It applies the rule that reads a name as a unit or as
  one prefix and a unit ([Definitions](#definitions)).
- `buildTable` supplies a lookup that evaluates definitions on demand,
  while the table is still being built.

Each lookup defines its own error type, since the two fail differently:
only the second can meet a cycle among the definitions. `evaluate` takes
that type as a type parameter and returns a lookup failure unchanged.

The lookup is given the span of the reference with the name, so that its
error points at the text as the evaluator's own errors do. The function
resolver is given the span of the whole call as well as the name's.
`notAFunction` shows the product with the space, `kg (m/s)`, from it.

### Where each error points

Operands are evaluated left to right, and the first failure ends the
evaluation. The evaluator never sees the text: the spans in the tree are
all it knows of it. Each of its own errors carries the span of the part
at fault, chosen as follows:

- **A division by zero carries the divisor's span**, since the divisor's
  value is what is wrong. So does a division by a value that cannot be
  told from zero at this precision (`unresolved`): the divisor's ball
  contains zero without being exactly zero, as `sqrt(2)^2 - 2` does.
- **A power whose base cannot be told from zero carries the base's span**,
  when the base is raised to a negative power or put under an even root.
  The reason is the same.
- **Any other power that fails carries the span of the whole power**,
  since the combination of base and exponent fails: `0^-1`, an even root
  of a negative value, or a result past a size limit.
- **A sum, a product or a quotient refused at a size limit carries the span of the whole operation**
  (`tooLarge`, `overflow`, `underflow`).
- **A literal whose significand is past the significand limit carries its own span.**
- **A sum whose operands do not conform carries the span of the whole sum**,
  with the span of each operand and the `ConformanceError` between them.
  The left operand's dimension is the error's `have` and the right
  operand's is its `want`, so that a message says what each side is in
  the words a conversion's mismatch uses.
- **A call whose argument does not conform carries the span of the whole call**,
  with the argument's span, in the same way.
- **A built-in's failure carries the span of the call**, with one
  exception. An `unresolved` carries the span of the argument that
  straddles the edge the error names. A failure of the domain is a
  `domainError`.
- **A call whose body fails is one `callFailed` at the call.** It names
  the function and carries the body's error, whose spans point into the
  definitions text. Only the evaluator's own failures are wrapped so. A
  lookup failure inside a body comes back as any lookup failure does,
  and a table that built cannot produce one.

## Definitions

[The definition language](../docs/definitions.md) states the format of
the definitions file, its six forms of definition and its rules for
names. [Names](../docs/expressions.md#names) states how a typed name is
read. The core's handling of the file follows. The devdocs say that the
table is **built** where the user docs say that the file is loaded.

The predefined units are not special. They live in the definitions file,
`src/units.txt`, and the core knows nothing of them but what the file
says. `buildTable` takes one list of definitions, and today the
predefined definitions file is the whole list. The file is bundled as an
asset of its own: a URL import, so that it is emitted beside the
scripts, precached with the rest of the build, and fetched when the app
starts. `src/units.test.ts` builds the file and checks a
sample of conversions from each of its sections.
[Adding a unit](development.md#adding-a-unit) says how to add to it.

### What the parser keeps, and what it rejects

`parseDefinitions` reads one definition per line. It returns the
definitions in the order written, duplicates included, and knows nothing
of what they mean.

The parser keeps three texts beside the tree, each as it was written:
every item of a unit list, every annotation and every condition. The
tree alone cannot give a text back as it was written. A message quotes a
condition's text, and the outcome reads an annotation's text to tell a
unit written as `1`.

Every span is an offset into the whole text, not into the line. A
definition carries the span of its text from name to body, for the
errors `buildTable` reports against a definition as a whole. The spans
inside its body serve the errors within it.

The parser rejects seven things, each where it is written:

| Rejected                                                              | Error                |
| --------------------------------------------------------------------- | -------------------- |
| an annotation with a number other than `1`                            | `annotationScale`    |
| an annotation that is a sum, a difference, a negation or a call       | `annotationNotUnits` |
| an annotation on an inverse's parameter                               | `inverseAnnotation`  |
| a parameter named twice, at its second occurrence                     | `duplicateParameter` |
| a parameter named like a unit that an annotation of its own line uses | `parameterNamesUnit` |
| a condition whose comparisons do not all point one way, `0 < x > 1`   | `mixedComparison`    |
| a `[` directly after a function's name, which is reserved             | `unsupported`        |

### The walk

`buildTable` evaluates each body to a quantity. It resolves references
on demand, with memoization and a set of the definitions being visited.
So definitions may stand in any order, and a cycle is reported and never
looped on.

The result is the **definitions table**, a `UnitTable`: the primitives
with their roles, the prefixes with their factors, the units with their
quantities, the unit lists and the functions. Each is a map keyed by
name, in declaration order. The primitives are among the units, each as
a quantity of one of itself, so that a lookup is one map read.

The primitives and their roles are collected from the definitions before
any body is evaluated. A body that is a sum needs them to check its
operands, and a body may refer to a primitive declared after it.

Three forms of definition differ in how the walk treats them:

- **A function is a node of the walk**, since a call in any body can
  refer to it. Evaluating it means checking it
  ([Build-time checks](functions.md#build-time-checks)). A call in a
  condition is a dependency of the walk as a call in a body is. So a
  unit may be defined by a call, a function's body may call another
  function, and a cycle through a function is reported like any other.
- **A unit list stays out of the walk**, since no expression can refer
  to one. Each list is evaluated in its place in the order, item by
  item, through the same lookup a body uses. It requests what it refers
  to from the top of the walker, so it can never close a cycle. Its
  units are checked as `convertToList` checks any list, against the
  first of them. A defined list can then fail to convert only for not
  conforming to the have. The table holds each list as its units with
  their texts.
- **An inverse stays out of the walk too.** It is keyed by its
  function's name, apart from every namespace, and nothing can refer to
  it. It is checked in its place in the order and requests its function
  from the top, which lets it call its own function.

The table holds each function as its body, still an expression, since a
call evaluates the body afresh through the table's lookup. Beside the
body it holds:

- the parameters in order, each with the unit it takes and that unit's
  text;
- the dimension of the result;
- the conditions, each with the parameters it mentions;
- the inverse, when one is defined.

The table is built at the ceiling, where no later pass could decide a
condition. A unit, a prefix, an item of a list or an annotation that
calls a function evaluates the call's conditions at the build. A
condition left undecided there fails the build, since a definition has
nowhere to carry the warning.

### Names

The rules for names are the user docs'. The build applies them over
definitions, before any quantity exists, and the finished table applies
them over quantities. `names.ts` is therefore generic in what a prefix
or a unit maps to.

Prefixes are a namespace of their own. Primitives, units, unit lists,
functions and the built-ins share another, so a list or a function named
like a unit is a duplicate. A call's name resolves among the defined
functions and the built-ins exactly, so `ktempC(1)` is a call of nothing
(`notAFunction`).

Every name is known once the definitions are indexed, so ambiguity is a
property of the table and not of the input, and `buildTable` checks for
it. A name with two different splits into a prefix and a unit is a build
error: `d` + `am` against `da` + `m`, if `am` were a unit. A table that
builds therefore has at most one split per name. A unit's name that is
also a valid split is allowed, since real unit conventions are full of
them, and the exact name wins: `min` is the minute, against `m` + `in`.

The check is cheap. For each pair of prefixes where one extends the
other, it makes one map lookup per unit that starts with the extension.
It finds those units in an index of the unit names, and for most
extensions, `icro` or `eci`, the index holds none.

### The lookup's one throw

The table's lookup forms a prefixed unit as the prefix's factor times
the unit's quantity, under the context it is given. It assumes that the
product is never refused. The predefined file's prefixes and units are
nowhere near the exponent bound, and the node that names the unit holds
the product to the significand limit, not the lookup.

The lookup has no error to return for a refusal, so the one case that
could reach it throws (`table.ts`): a user's input naming a prefixed
form of a unit that a definition puts within a prefix's factor of the
bound. The build's own lookup differs. It reports the same product,
refused, as a located error at the reference that forms it. So a
definition that itself writes such a prefixed form fails the build, and
only a prefixed form that no definition writes can reach the throw.

That throw is the one place in this part of the core where the rule on
exceptions is knowingly not met.

### The modules and the order of the build

Building is five modules:

- `table.ts` holds the `UnitTable` and the lookup over it that the
  evaluator resolves the user's texts against.
- `names.ts` holds the rule that resolves a name and the ambiguity
  check.
- `name-index.ts` is the index the check searches: the names sorted, so
  that those starting with any text are one contiguous run.
- `graph.ts` is the on-demand evaluation. A walker takes a function that
  computes a node's value, given a way to request the values of the
  nodes it depends on, and memoizes each result. A request for a node
  whose evaluation is in progress is a cycle. The walker returns the
  cycle to the requester, which knows where the request came from.
  Nothing in `graph.ts` knows what a definition is.
- `build.ts` puts them together.

`build.ts` runs its checks in a fixed order, and the first failure ends
the build:

1. It indexes the definitions by name and rejects a duplicate. A
   definition named like a built-in is a duplicate too.
2. It rejects an inverse of no defined function.
3. It checks the index for an ambiguous name.
4. It checks the names of the lists, the functions and the built-ins for
   one that reads as a prefix followed by a unit. A list's name means
   the list only as a bare want, and a unit's name means the unit
   everywhere. So `ms` as a list's name would make one text mean two
   things in the two fields, and the same holds for a function's name.
5. It collects the primitives and their roles.
6. It walks every definition in the order written. `evaluate` computes a
   body against a lookup that resolves each name through the index and
   requests the definitions it means from the walker. A function is
   checked over dimensions alone, and a list or an inverse is checked in
   its place.

[When the file does not load](../docs/definitions.md#when-the-file-does-not-load)
lists every fault, the parser's and the build's, with an example of
each. Each `BuildError` locates its fault: it carries the definition or
definitions at fault, or a span into the whole definitions text. No
message is worded for a build error: only the predefined definitions
file is loaded, and the shell reports a failed build by the error's name
([The shell and its parts](#the-shell-and-its-parts)).

## UI

[The app](../docs/app.md) describes the interface as a user meets it.
The UI is a handful of Lit components under `src/`. The shell,
`<app-shell>` (`src/app-shell.ts`), is their composition root. The rest
follows four rules:

- **The view is a function of the state.** Every template is
  `render(state) → html`. Anything the view needs that is not state is
  derived in a pure function beside the component and checked under
  Node. `outcome.ts`, `messages.ts` and `settings-lines.ts` are such
  modules, and so are `tableOf` in `system-build.ts` and `rangesOf` and
  `clampsOf` in `settings.ts`.
- **Properties go down, and events come up.** A child component takes
  what it shows as properties and reports what the user did as an event.
  It never reaches for storage or for its parent. The shell is the one
  place that turns an event into a change of state and an effect, the
  save.
- **Composition uses Lit's own terms.** Lit gives three units of
  composition: a custom element, for a piece with its own state or
  styles; a template function, for a piece with neither; and a reactive
  controller, for a piece of lifecycle. Those are used, and nothing from
  outside Lit.
- **One file has one job**, and is named for the thing it renders
  ([Layout](layout.md)).

### The shell and its parts

The shell holds the three pieces of state the parts share: the
definitions, the settings and the service worker's status. Each has one
source, and the shell derives everything else in `render`.

#### The definitions

`src/system-table.ts` fetches the bundled `units.txt` and parses it
once, on the main thread. The parse is quick enough that a worker would
cost more than it saves. The shell starts the load when it is connected
and shows a loading message until the promise settles. Loading the
components never waits on the definitions.

`src/system-build.ts` builds the table from the definitions, at the
ceiling of the retry schedule in force.
[Working precision and the schedule](numbers.md#working-precision-and-the-schedule)
gives the design: why the table is built once, at the ceiling and in
exact mode. The build is synchronous and memoized, so the shell builds
in `render`:

- The memo holds one table, keyed by the definitions and the ceiling.
  The shell rebuilds only when the precision limit moves the ceiling,
  and the new table replaces the old.
- The memo holds a failed build too. `units.test.ts` checks the
  predefined file, so a failure is a bug, and rebuilding on every render
  would not change it.
- The significand limit is not part of the key, although a build holds
  every exact result to it. The predefined file builds at the least
  limit the settings allow (`MIN_SIGNIFICAND_LIMIT_BITS`, which
  `units.test.ts` checks), and the clamp of the settings already keeps
  the ceiling within the limit.

`tableOf` gives the state of the table as a pure function: loading,
failed or ready. When the fetch, the parse or the build fails, the shell
says so in place of the converter, with a Retry button. A failed fetch
is not memoized, so the button asks again. The user decides when to
retry, since the user may know that the network was down a moment ago,
and the app never retries on its own.

#### The settings

[The settings](settings.md) has the design. The shell reads the settings
from `localStorage` through `settings.ts` when it is created, validated
and migrated. It hands the converter the `NumberContext` they make
(`contextOf`) and the settings of the ratio notation.

`<settings-panel>` (`src/settings-panel.ts`) is the settings panel. It
takes the settings, and whether it is open, as properties. It reports
three events:

- `settings-change`, for each change the user makes;
- `settings-reset`, for each reset, of one setting or of all;
- `settings-close`, when it closes itself.

The shell applies a change and a reset alike. It clamps what depends on
the change, saves the settings, and hands back what the clamp moved, for
the panel to say.

The panel is a non-modal `<dialog>` fixed to the viewport. The cog in
the header's corner opens it (`<settings-button>`,
`src/settings-button.ts`). The cog's `click` flips the shell's open
state, and the cog takes focus back when the panel closes. The probe
behind the panel's "Measure this device" button (`src/limits.ts`) runs
only when asked, and its proposal is applied as a change like any other.

#### The service worker's status

`<app-footer>` (`src/app-footer.ts`) takes the status as a property, and
checks for a new version when its build ID is tapped
([Offline behavior, the build ID and the icons](offline.md)). A reactive
controller (`src/subscription.ts`) mirrors the status into the shell for
as long as the shell is connected.

The source, `onWorkerStatus`, calls its listener with the current value
at once, synchronously, and then with each new value. It returns the
function that stops it. The controller subscribes on each connect and
unsubscribes on each disconnect. So its `value` is set before the
shell's first render, and the shell overrides no lifecycle method for
it.

#### The buttons

The buttons are three small components, each the one place its look is
defined:

- `<app-button>`, for a button with words in it: Done, Apply, Retry.
- `<link-button>`, for a button that reads as a link: the resets and the
  footer's links.
- `<step-button>`, for the `−` or `+` of a stepper beside a number
  input.

`src/styles.ts` holds the styles the components share: the feedback
every button gives, and the hint.

### The converter and its lines

[The two fields](../docs/app.md#the-two-fields) and
[Copying a result](../docs/app.md#copying-a-result) describe the fields
and the copy button as a user meets them. `<unit-converter>`
(`src/unit-converter.ts`) is the converter: two text inputs, labeled
"You have" and "You want", and an output area. It takes three
properties: the table (`table`), the `NumberContext` (`context`) and the
settings of the ratio notation (`ratio`). Its only state is the two
strings. On every change it calls `outcomeOf` and renders the lines or
the error.

The core's surface to the UI is one function,
`(table, haveText, wantText, context) → Result`, which is `convertText`
([Pipeline](#pipeline)). The outcome turns its result into the lines the
output area shows. The outcome has no DOM dependency, so
`outcome.test.ts` checks the lines under Node.

#### How a line is composed

An output line is two expressions and a relation between them: the
have as it was read, and the result. The outcome composes the result as
an expression, from two sources:

- The values come from `show` of `display.ts`, which writes a value's
  text, and from `roundTerms` of `convert.ts`. Both are views of the
  result, not steps of it.
- The units come from the `Conversion`, which carries the have and the
  want as the expressions the parser read. Nothing is parsed a second
  time. The one exception is a blank want, whose result is a quantity
  alone: the outcome parses the have again to write it.

The outcome joins a value to its unit by the grammar's own operators
(`timesFirst`). The value becomes the first factor of the unit, as in
`36 m / s`. Where the unit leads with a number, the value multiplies it
whole with `*`, as in `5.28 × 1000 ft`, since a number cannot follow a
factor by juxtaposition. The terms of a list are summed, and the
argument of a conversion into a function is put inside the call.

The printer then writes both sides, in its canonical text
([Expressions](#expressions)). It decides the parentheses from the tree,
by the grammar's levels, so a want that is a sum or a negation is
parenthesized: `1 m ≈ 3.0284676 (ft + in)`. No code decides the
parentheses of a line as such.
[Where a ratio is written](notation.md#where-a-ratio-is-written) gives
the same mechanism for a ratio.

The printer writes a product as `×` for the screen, and the converter
styles the numbers among the printer's pieces. A `<copy-button>` beside
each line (`src/copy-button.ts`) copies the result as the printer writes
it with `*`. That text parses back. Typed as a have and converted into
the line's own unit, it gives the line again, which `outcome.test.ts`
checks.

#### The relation and the note

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
what the relation and the note tell a user. The **relation** is `=`, `≈`
or `≈̇`, the uncertified sign of decimal mode. The outcome decides it from
`show`, at the display digits and in the rounding mode of the user's
settings
([Certification and the display rule](numbers.md#certification-and-the-display-rule)).
`show` returns the text of a value with a `kind`, and the relation
follows the `kind` of every value the line shows:

- `=` when every value is `exact`;
- the uncertified sign when every value is `exact` or `uncertified`, and
  at least one is `uncertified`;
- `≈` otherwise.

A **note** follows a line in parentheses when the line does not show
every digit asked for. It comes from the `kind` too: how many of the
display digits are certified, the bound within which a value lies that
cannot be told from zero, that no digit is certified, or that a step
could not be certified at the precision limit.

A **warning** is not a note. A condition left undecided at the ceiling
makes the relation of every line `≈` and adds one warning for each
distinct condition, styled apart from the notes
([An undecided condition](functions.md#an-undecided-condition)).

#### A unit list's line

[Unit lists](../docs/quantities.md#unit-lists) states how a list's line
reads. The outcome writes it as the sum of its terms, each unit written
as a single want is. The first term keeps its sign, and each later term
is joined by `+` or `-` and written unsigned, so that the line parses
back. The outcome takes four steps:

1. It certifies the list on its unrounded terms. `roundTerms` moves the
   remainder's midpoint onto the end of a rounding cell in a directed
   mode, where certifying it again would lose a digit.
2. It rounds the terms with `roundTerms`, at the digits the remainder
   certifies ([Unit lists](#unit-lists)). Under the ratio notation, an
   exact remainder that fits as a ratio is written entire, so nothing is
   rounded and nothing carries.
3. When the rounding carried into an earlier unit, the remainder that is
   left is a new value, and the outcome takes its `kind` afresh.
4. It leaves out a term of zero. It also leaves out a last term that
   cannot be told from zero, with its note. A sum of nothing but zeros
   keeps its last term.

The relation is `=` only when every unrounded term is exact. The counts
carry no note.

#### A function's line

[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states the line. It is the have and then the call at the recovered
argument, `tempF(212) = tempC(100)`. The outcome writes the argument as
a count of the unit the function's parameter takes, followed by that
unit, as a want's unit is written. It writes nothing after the count
when the unit is `1`, as for a parameter without an annotation.

#### The reciprocal line

[The reciprocal line](../docs/quantities.md#the-reciprocal-line) states
when a conversion has a second line and what it says. The outcome writes
it as the first line is written, with the sides swapped:

```
3 ft = 36 in
in ≈ 0.027777778 × 3 ft
```

The have takes the unit's place and is written as a unit is, by the same
rules as a want. Each line's relation is decided from its own value.

**The swapped form is a decision.** The second line carries one number,
the reciprocal of the ratio, `0.027777778` here. One `in` is
`0.027777778` of `3 ft`, so the number answers the conversion in the
opposite direction, from the want to the have. Two other ways of showing
that number are ruled out:

- The number as a divisor, `/ 0.027777778`, beside the multiplier
  `* 36`. Neither is a statement about quantities, and neither parses
  back.
- The identity `3 ft = (1 / 0.027777778) in`. It is true, and it says
  nothing that the first line does not.

The swapped line says what the number is for, and it parses back as a
have.

**Only a conversion into one unit has a reciprocal.** That conversion is
one ratio, `have / want`, and the reciprocal is the same ratio in the
opposite direction, `want / have`. A conversion into a unit list is a
sum, `3 ft + 3.3700787 in`, a positional way of writing one quantity,
and it has no opposite direction. Three readings of one are ruled out:

- Inverting each term gives numbers that add up to nothing.
- `1 / have` in the same list never conforms, since its dimension is the
  inverse.
- The reciprocal of the total in one unit of the list is the reciprocal
  of a different conversion, for a unit chosen by a rule the user did
  not ask for.

So a list, typed or defined, gets no second line. Neither does a
conversion into a function, since a call is not a ratio. A blank want
gets none either, since its line gives the have in the primitives and
converts nothing.

**The outcome computes the reciprocal, outside the pipeline.** The
reciprocal is the ball quotient of one by the ratio the pipeline
returns. It is a second view of the same value, as the rounding is, and
not a step of the conversion. So it stays in the outcome. It is one step
at the user's context, settled in exact mode and rounded once in decimal
mode. In decimal mode the value it inverts is the ratio as shown
([The working digits](numbers.md#the-working-digits)).

The line is left out whenever that quotient fails. A value of zero has
no reciprocal, and neither has one that cannot be told from zero.

The step runs outside the retry loop, and two gaps follow
([#92](https://github.com/bsidhom/exucal/issues/92)):

- The line shows whatever `kind` `1 / value` has at that one step. A
  reciprocal that a higher pass would certify is not retried on its own.
- A refusal of the reciprocal has no words. The line is left out, as in
  `5e1000000000000000000 m` into `m`.

### Messages

The errors the core returns are values with spans and dimensions, not
sentences. `src/messages.ts` puts them into words. It quotes the text at
fault and formats each dimension with `formatDimension`. The wording is
therefore tested under Node, beside the core, and not in a browser.

A sum that does not conform is worded as the same mismatch between a
have and a want is, with the two operands quoted in place of the two
texts. The two size limits refuse with errors of their own, and the
messages word them apart
([Which limit a refusal names](numbers.md#which-limit-a-refusal-names)).

### Not in this design

Four pieces of state machinery are ruled out. Each would cover a part of
the shell. The shell has one asynchronous value, one subscription and
two levels of nesting, which is too little to pay for a library, and the
rule is nothing beyond Lit.

- **A settings store or a state manager.** The settings are one value,
  one reducer expression (`clampSettings({...settings, ...change})`) and
  one effect (`saveSettings`). A class around those would hide the
  simplest part of the app.
- **Signals (`@lit-labs/signals`).** Signals would make the status and
  the settings readable from anywhere, and a flow is hard to follow for
  exactly that reason. The UI is one page with no routes, so nothing
  needs either value from a distance.
- **`@lit/task` for the load of the definitions.** One promise set on
  one state field is already the idiom, and `tableOf` gives the
  three-state view without a dependency.
- **`@lit/context` for the service worker's status.** Two properties on
  two children are not deep enough to need it.
