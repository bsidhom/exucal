# Architecture

Exucal is a calculator. Three goals guide its design, in priority
order:

1. Arithmetic is exact, and the calculator is explicit wherever a result
   is not. A value that a fraction can hold is held as that fraction,
   and exact mode never rounds it. An inexact result shows only the
   digits the calculator has certified and is marked inexact. A note or
   a message says what the calculator could not certify, decide or hold.
   The format is portable: the calculator runs as JavaScript in a
   browser, installs from a web page and works offline.
2. The functions a calculator is used for come under the same guarantee:
   the elementary functions, and the special functions most used in
   combinatorics, probability and physics. Each returns an exact value
   in its exact cases and a certified one otherwise.
3. Calculation and conversion are aware of units and kinds. A quantity
   carries its dimension through every operation, and its kind where it
   has one. A mismatch of dimension or kind is an error and never a
   number.

The design follows from the goals in that order. The numeric type and
the passes of the evaluator serve the first two
([Numbers and precision](numbers.md)). Unit awareness and kind checking
are separate from the numeric type: they live in the quantity and its
conformance check.

The definitions file and the two fields, the have and the want, are in
the lineage of [GNU units](https://www.gnu.org/software/units/).

Two rules bind all of the code:

- **The core is pure.** Every function in `src/core/` maps immutable
  inputs to immutable outputs, with no I/O and no globals. A failure
  that the input can cause is returned as a `Result`, a discriminated
  union of a value or an error, and each module defines its own error
  type. A throw marks a violated precondition, which is a bug and never
  an input. Two breaches of that are known: the lookup of a prefixed
  unit near the exponent bound
  ([The lookup's throw](#the-lookups-throw)), and the verification of a
  root ([Failures](numbers.md#failures)). The UI is a thin layer that
  calls into the core.
- **Lit is the one third-party dependency of the page.** Lit is the
  library the UI's components are built on. Nothing else is pulled in,
  so the arithmetic is the project's own, built on `bigint`. A new
  dependency is a decision to justify in review
  ([Dependencies](security.md#dependencies)).

The sections follow the order of the user docs: numbers, quantities,
conversion, the expression language, the definitions file, the app. The
first section, on the pipeline, introduces the parts that the later
sections refer to before they describe them. The parts with a design of
their own have pages of their own, and
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
  selects the form of the answer, and the UI writes the answer as text
  ([Pipeline](#pipeline)).
- **Every value is a `Ball`**, an exact midpoint with a radius
  ([Numbers](#numbers)).
- **A quantity is a ball paired with a dimension, and a kind is an entry of the dimension.**
  No separate mechanism carries a kind
  ([Quantities, dimensions and kinds](#quantities-dimensions-and-kinds)).
- **A conversion is one quotient, taken after the conformance check.**
  The errors that a later pass can resolve are kept apart from those it
  cannot ([Conversion](#conversion)).
- **A unit list's counts are exact integers, and its terms are rounded as one sum**
  ([Unit lists](#unit-lists)).
- **A defined function is a body evaluated with its parameters bound.**
  Applying a function and inverting it share that evaluation
  ([Functions](#functions)).
- **One grammar serves the two fields and the definitions file.** The
  binary operators are data that the parser and the printer share
  ([Expressions](#expressions)).
- **The parsers are built from combinators with ordered choice.** A
  parse costs a constant number of attempts per token, and an error is
  reported where the parser got furthest ([Parsing](#parsing)).
- **The evaluator resolves names through a function it is given**, so
  that one evaluator serves the user's texts and the build of the table
  ([Evaluation](#evaluation)).
- **The table is built by evaluating the definitions on demand.**
  Definitions may stand in any order, and an ambiguous name is found
  when the table is built, never when a name is typed
  ([Definitions](#definitions)).
- **The view is a function of the state.** One component holds the state
  the others share, and is the one place where an event changes it
  ([UI](#ui)).
- **Every line of the answer is composed as an expression and written by the printer.**
  So every line parses back
  ([The converter and its lines](#the-converter-and-its-lines)).

## Pipeline

[The have field](../docs/expressions.md#the-have-field) and
[The want field](../docs/expressions.md#the-want-field) state what a
user types into the two fields. The core turns the two texts into an
answer along one pipeline:

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

### The parts

The later sections refer to five parts of the pipeline before they
describe them:

- The **definitions table** is a `UnitTable`: the primitives, the
  prefixes, the units, the unit lists and the functions that the
  definitions file defines, each keyed by name. The developer docs say
  that the table is **built** from the file, where the user docs say
  that the file is loaded. `buildTable` is **the build**
  ([Definitions](#definitions)).
- A **lookup** is a function from a name to its meaning: a unit's
  quantity, or a function. The evaluator resolves every name through a
  lookup it is given ([Evaluation](#evaluation)).
- The **context** is a `NumberContext`, the settings that the arithmetic
  reads ([Numbers](#numbers)).
- A **span** is a pair of offsets into a text. Every error in a text
  carries the span of the part at fault ([Expressions](#expressions)).
- `show` of `display.ts` writes a value as text and says how much of it
  is certified
  ([Certification and the display rule](numbers.md#certification-and-the-display-rule)).

### The output modes

`convertText` in `src/core/pipeline.ts` composes the arrows of the two
texts. It adds one decision of its own: it chooses the **output mode**,
the form of the answer, from the shape of the want. It parses the want
as a unit list, of which a single expression is a list of one item, and
tests the shapes in this order:

| The want                                                      | Output mode                       | Function         |
| ------------------------------------------------------------- | --------------------------------- | ---------------- |
| one item, the bare name of a unit list that the table defines | conversion into a unit list       | `convertToList`  |
| one item, the bare name of a function that the table defines  | conversion into a function        | `invertFunction` |
| any other single item                                         | conversion into one unit, a ratio | `convert`        |
| two or more items                                             | conversion into a unit list       | `convertToList`  |

A blank want is a fourth output mode, the have in the primitives. It
converts nothing, so it takes `evaluateText`, which runs the have's
arrows alone.

`convertText` returns a `Conversion`: the values of the answer, with the
have and the want as the expressions the parser read. It writes no text.
**The outcome** is `src/outcome.ts`, a module of the UI. Its function
`outcomeOf` calls `convertText`, or `evaluateText` for a blank want, and
composes the **output lines** from the result: the lines of text that
the app answers with
([The converter and its lines](#the-converter-and-its-lines)).

### Passes and errors

The pipeline parses each text once and then evaluates in passes. A
**pass** is one evaluation and conversion at one precision. The passes
rise along a retry schedule until every value is certified at the
display digits
([Working precision and the schedule](numbers.md#working-precision-and-the-schedule)).

Each function's error keeps its own type. The pipeline adds only the
side: it tags an error in a text with the field the text came from, have
or want. **The converter**, the component of the two fields, marks that
field. An error of the conversion is about the pair and has no side.

## Numbers

[Numbers](../docs/numbers.md) gives the model as a user needs it, and
[Numbers and precision](numbers.md) gives the design. The rest of the
overview uses these words of that design:

- A `Ball` is a midpoint and a radius. The midpoint is an exact fraction
  times a power of ten (`Scaled` over `Rational`, both on `bigint`). The
  radius is a coarse binary bound on the distance from the midpoint to
  the true value. An exact value is a ball of radius zero.
- The context, a `NumberContext`, holds a precision, a rounding mode,
  the mode (exact or decimal), the significand limit and the ceiling.
  The user's context has the display digits as its precision. A
  **working context** is the context of one pass, and its precision is
  the pass's.
- The **kernel** is the set of routines that compute the inexact
  functions, on binary fixed-point numbers. It returns a ball whose
  radius bounds its error.
- The **working grid** of a pass is the grid of digits that the pass
  keeps of an inexact value, a little finer than the pass's precision.
  To **settle** an inexact value is to round its midpoint onto that grid
  and to add the rounding to the radius. An exact value is never
  settled ([Settling](numbers.md#settling)).
- A result **taken as a step** is treated as the mode treats one
  operation: it is settled in exact mode, and in decimal mode it is
  rounded once and is exact from then on.
- A **refusal** is an error of a size limit: `tooLarge` at the
  significand limit, `overflow` or `underflow` at the exponent bound.
  The retry loop never retries a refusal.
- `unresolved` is the error of a value whose ball reaches across an edge
  that the result depends on, as a divisor's ball that contains zero
  without being exactly zero. A later pass may narrow the ball, so the
  retry loop retries it.

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

- A dimension primitive, such as `m`, `kg` or `s`, is a base quantity.
- A kind primitive, such as `radian`, is a marker of a kind, with no
  dimension of its own.

A kind primitive is an entry of the same exponent vector as the
dimension primitives, so no separate mechanism carries a kind. The core
holds no list of kinds. The roles are data: the table holds them as its
`Primitives`, in the order the file declares them.

### The conformance check

[Conformance](../docs/quantities.md#conformance) states the rule and
the pairs of quantities it is required of. `checkConformance` in
`dimension.ts` is its one implementation. It takes two dimensions and
the primitives with their roles, and it is the one place that treats the
two roles differently:

1. It compares the two vectors restricted to the dimension primitives. A
   difference is a `dimensionMismatch`.
2. It compares the full vectors. A remaining difference is a
   `kindMismatch`, which names the kind primitives that differ, in
   declaration order.

The order of the steps reports the physical error first. A kind mismatch
therefore always means that the two dimensions agree. A name that the
primitives do not list counts as a dimension primitive in the check.
Every caller passes the primitives of one definitions file, so the roles
are the same in a sum, in a call and in a conversion.

### Writing a dimension

`formatDimension` writes a dimension for a message.
[How dimensions are written in messages](../docs/quantities.md#how-dimensions-are-written-in-messages)
gives the rule. `formatDimension` builds the dimension as an expression
(`dimensionExpr`) and hands it to the printer
([The printer](#the-printer)). The text is therefore in the expression
language, and it parses back.

### The arithmetic on quantities

The arithmetic the evaluator needs is in `quantity.ts`. A product, a
quotient and a power are each a ball operation beside the matching
dimension operation. Only the ball operation can fail, so the failures
of the three are those of `ball.ts`. Each of the three takes the
context:

- A product and a quotient take it for the significand limit and for the
  working grid. An exact result is formed within the limit or refused.
  When an inexact result would pass the limit, the operands are rounded
  onto the grid first.
- A power takes it for both of those, and for the precision at which the
  kernel computes a root or a power whose exponent is not an integer
  ([Roots and powers](numbers.md#roots-and-powers)).

A negation changes the scalar alone and cannot fail.

A sum and a difference can fail on the dimension side too. Only two
quantities that conform have a sum, so the two operations run the
conformance check, take the primitives for it, and fail with its
`ConformanceError`. The scalars are added within the significand limit
of the context ([Sums and alignment](numbers.md#sums-and-alignment)).
Zero is no special case: `0` is dimensionless, and `1 m + 0` is a
dimension mismatch.

## Conversion

[How a conversion is answered](../docs/quantities.md#how-a-conversion-is-answered)
states what a conversion into one unit answers with, and what stops it.

`convert` takes the two quantities, the primitives and the context. It
runs the conformance check first. The answer is then the ball quotient
of the two scalars: the exact quotient of the midpoints, with the radii
propagated. No factor is looked up, since each quantity is already held
in the primitives. So `1 m` into `in` is exactly `5000/127`, and it
becomes `39.370079` only at the display. The quotient takes the context
for the significand limit: the size of an exact quotient is predicted
before the quotient is formed
([The significand limit](numbers.md#the-significand-limit)).

`convert` fails in five ways. The retry loop treats them differently,
and that difference is the reason the errors are kept apart.

| Error                                 | Cause                                                                    | Retried at the next pass        |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| `dimensionMismatch` or `kindMismatch` | The pair does not conform. The error carries both dimensions.            | no                              |
| `zeroWant`                            | The want's scalar is exactly zero, and nothing is a multiple of it.      | no                              |
| `unresolvedWant`                      | The want's ball contains zero without being exactly zero.                | yes: a later pass may narrow it |
| `unresolvedBound`                     | The quotient's ball reaches across the exponent bound.                   | yes, for the same reason        |
| `overflow`, `underflow` or `tooLarge` | The quotient is refused, at the exponent bound or the significand limit. | no                              |

The conformance check comes first, so `1 m` into `0 s` is a mismatch and
never a `zeroWant`. `unresolvedWant` and `unresolvedBound` are the
quotient's `unresolved`, named by the edge it could not decide, since
the two are worded differently for a user.

The quotient is refused at either size limit:

| You type                 | Into                      | The refusal                                                                    |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| `1e999999999999999999 m` | `1e-999999999999999999 m` | `overflow`: the ratio's exponent passes the bound                              |
| `3^30000 m`              | `5^20000 m`               | `tooLarge`: the ratio's exact significand passes the default significand limit |

The message of the second suggests `approx(3^30000 m)`. `approx` is the
one operation whose purpose is to make a value inexact, and an inexact
ratio is settled and never refused for its significand.

The pipeline takes the ratio that `convert` returns as a step.

### Unit lists

[Unit lists](../docs/quantities.md#unit-lists) states what a unit list
answers with, the rules its units must satisfy and how the remainder is
rounded. `convertToList` is the conversion into a unit list. A
**typed list** is one typed out in the want, as `ft;in`. A
**defined list** is one the definitions file names, as `time`.

#### The checks on the units

`convertToList` checks the units in order, each for three things:

1. The unit conforms to the have (`nonconformingUnit` otherwise).
2. The unit's scalar is positive and its ball excludes zero
   (`nonpositiveUnit`).
3. The unit is smaller than the unit before it, by midpoint
   (`unitOutOfOrder`).

The first failure is the error, and it carries the index of the unit at
fault. The retry loop retries none of the three.

The two sorts of list report a failure differently:

- For a typed list, the pipeline keeps each item with its text, which it
  slices from the want by the item's span. The error carries the texts
  of all the units, so that the message can quote the unit at fault.
- A defined list passed the second and third checks when the table was
  built ([The walk](#the-walk)). It can fail only the first, and that
  failure is reported as the mismatch of the pair, as for a single want.
  So the message quotes the name the user typed.

#### A typed list's unit that cannot be told from zero is not retried

A unit of a typed list whose ball contains zero at a pass fails the
second check, and the retry loop does not try the next pass. The same
expression as a single want is retried, and answers. Three facts of the
code produce the difference:

- The second check is on the unit's whole ball. It fails when the
  midpoint is zero or negative, and also when the ball contains zero.
  One error, `nonpositiveUnit`, covers both: a unit that is certainly
  not positive, which no pass can change, and a unit that cannot be told
  from zero at this pass, which a later pass may narrow.
- The retry loop continues on four errors only: an `unresolved` in
  either text, `unresolvedWant`, `unresolvedBound`, and a condition of a
  function left undecided. `nonpositiveUnit` is none of them. So the
  loop ends on it at the first pass, whichever of the two cases it
  stands for.
- A single want takes another path. `convert` divides by the want, the
  ball quotient is `unresolved` for a divisor that contains zero, and
  `convert` reports it as `unresolvedWant`, which the loop retries.

| You type | Into                           | Exucal shows                                                    |
| -------- | ------------------------------ | --------------------------------------------------------------- |
| `1 m`    | `(1e-30 + approx(1) - 1) m`    | `≈ 1e+30 × (1e-30 + approx(1) - 1) m`                           |
| `1 m`    | `ft;(1e-30 + approx(1) - 1) m` | an error: the unit is not positive, or cannot be told from zero |

At the default settings the working grid of the first pass has 28
digits. `approx(1)` has a radius of one unit in the last digit of the
grid, about `1e-27` there, so the want's ball contains zero. On the grid
of the second pass that radius is far below `1e-30`, and the want is
positive. The single want reaches the second pass, and the list does
not.

The check is on the whole ball by design. A unit that cannot be told
from zero is no size to count by. A unit whose ball excludes zero also
keeps every division by it from being `unresolved` at zero. The gap is
that the failure is final at the first pass. It is accepted as today's
behavior, and
[#198](https://github.com/bsidhom/exucal/issues/198) is open for the
retry.

#### The counts and the remainder

The list is decomposed unit by unit. For each unit but the last,
`convertToList` divides what the earlier units left by the unit, and
takes the count from the midpoint of that ratio, truncated toward zero.
So every term has the sign of the have, and a count is an exact integer
whatever the ratio's radius. The last unit gets the remainder: the ball
of the have less the counted units, computed with the ball operations.
So the counts and the remainder, each times its unit, add up to the have
exactly when everything is exact, and they contain it otherwise.

Three cases depart from the truncation:

- **A ratio whose ball reaches across the integer nearest its midpoint counts as that integer.**
  `turn / deg` reaches across 360, since both units carry the radius of
  `pi()`. Counting 360 leaves a remainder that is a ball around zero,
  which the outcome leaves out. Truncating can leave a whole of the
  unit instead: `359 deg + 60 arcmin`.
- **A ratio whose integer part cannot be formed within the significand limit is rounded toward zero onto the working grid.**
  The result is still an exact integer, and the remainder follows from
  that count. `1e999999999 m` into `ft;in` is such a ratio.
- **A ratio that falls below the exponent bound counts as zero.**
  Nothing of that unit fits in what is left, as in
  `1e-999999999999999999 s` into `hr;min;s`.

The arithmetic of the decomposition can fail in two other ways, and
either is the conversion's failure:

- A ratio, a count times its unit, or the difference it leaves is
  refused. `3^32767 m` into `ft/7^21845; in/7^21845` is `tooLarge`: its
  remainder does not align within the default significand limit.
- One of the same three reaches across the exponent bound. The pipeline
  reports that as `unresolvedBound`, which the loop retries, as it does
  for a single want.

#### Rounding the terms as one sum

Rounding each term on its own is wrong for a sum. A remainder of
`11.9999999988 in` at eight digits is `12 in`, and `2 ft + 12 in` shows
a whole foot as a remainder. `roundTerms` of `convert.ts` is the display
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

#### A long count under the ratio notation

The counts are integers, and `roundTerms` leaves them alone. The outcome
writes each count as a decimal at the display digits. That produces a
defect under the ratio notation, the setting that writes an exact value
entire, as a ratio, where the ratio fits a width
([#248](https://github.com/bsidhom/exucal/issues/248)). Under that
setting `show` reports an integer that fits the width as exact, and the
line's relation follows `show`. The count's text is rounded to the
display digits all the same. So a count longer than the display digits
is shown rounded, and the line still says `=`:

| You type | Into    | Exucal shows                        | Note                                 |
| -------- | ------- | ----------------------------------- | ------------------------------------ |
| `1e10 m` | `ft;in` | `= 3.2808399e+10 ft + (200/127) in` | under the ratio notation at width 20 |
| `1e10 m` | `ft;in` | `≈ 3.2808399e+10 ft + 1.5748031 in` | without the ratio notation           |

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
build-time checks, what a call costs and the alternatives weighed.

#### A defined function

A **defined function** is one the definitions file defines: a body with
parameters, bound by position, and an optional inverse. A function adds
nothing to `Quantity`. A call is a quantity like any other once the body
has run, and the rest of the expression goes on as before.

A call checks the function's conditions after the arguments conform and
before the body runs. A condition left undecided is assumed to hold. If
it is still undecided at the ceiling, it reaches the outcome as a
warning ([An undecided condition](functions.md#an-undecided-condition)).

`applyFunction` evaluates a function's body with its parameters bound to
the arguments, and `invertFunction` evaluates an inverse's body with its
parameter bound to the have. The two share that evaluation. It wraps the
lookup, in two ways:

- A parameter's name resolves to its argument before any unit or prefix
  of that name.
- A failure of the lookup itself is marked as the lookup's while the
  body is evaluated, and the mark is removed afterwards. So a failure of
  the body can be told from a failure of the lookup, and the evaluator
  need not know the lookup's error type.

#### Conversion into a function

`invertFunction` answers with the call that produces the have:
`tempF(212)` into `tempC` is `= tempC(100)`. It runs the steps the user
page lists, and each failure has its own error:

1. A function without an inverse is a `noInverse`, tagged with the want.
2. A have that does not conform to the function's result is the ordinary
   mismatch of the pair.
3. The have must meet the inverse's conditions. `invertFunction` then
   evaluates the inverse's body. A body that fails for the value is an
   `inverseFailed`, tagged with the want, and it carries the body's
   error as a call carries its body's.
4. The recovered argument must meet the function's conditions. A
   condition that fails, the inverse's or the function's, is a
   `wantConditionFailed`. An undecided one is assumed, as at a call.
5. The function is applied to the recovered argument. The build cannot
   check that an inverse undoes its function, so the answer is checked
   here. A value certainly other than the have is an `inverseMismatch`,
   and so is a failure of the function's body there. Two exact values
   are compared exactly. Two others differ certainly when their
   difference lies wholly on one side of zero. The check refutes a wrong
   answer and proves nothing, since two balls that overlap may or may
   not be equal.

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
(`src/core/builtin.ts`, with the set in `builtins.ts`). It has four
parts:

- A name.
- The count of arguments it takes.
- A dimension rule, from the dimensions of its arguments to the
  dimension of its result.
- The function itself, from balls to a ball at a working context.

The function returns the kernel's ball as it is and rounds nothing. The
evaluator takes the result as a step, as it takes every result.

Built-ins share a namespace with the defined functions, and the build
rejects a definition named like a built-in. The table carries the set of
built-ins it was built against, so a call's name resolves among the
defined functions and that set.

A built-in has no inverse, and the pipeline does not look a want up
among the built-ins. A built-in's bare name as the want is therefore
evaluated as a unit, and the lookup reports a `functionAsUnit` error. It
reports the same error for a defined function's name anywhere but in a
call or as the bare want.
[Built-in functions](builtins.md) lists each built-in's rule, domain,
exact cases and edges.

#### What a call costs

A call costs what its body typed out in its place would, and its digits
are certified the same way. The body is an expression evaluated on
balls, taken as a step after every operation and evaluated afresh at
every pass. So a call is not memoized, and two uses of a parameter are
two independent copies of its argument.
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

`parseExpr` returns a tree, an `Expr`. A **node** of the tree is one of
six things:

- A number. It keeps the text it was read from, so that `1e3` is written
  back as `1e3` and not as `1000`.
- A unit name.
- A binary operation of two subtrees: a sum, a difference, a product, a
  quotient or a juxtaposition.
- A negated subtree.
- A subtree raised to an exponent.
- A call. It holds the function's name, with a span of its own, and the
  arguments.

Juxtaposition, writing two factors side by side, is its own operator in
the tree, `juxtapose`. The evaluator multiplies it as it does `*`. The
tree keeps the two apart so that the printer can write `2 m` back as it
was read. A number is never negative in the tree: `-2` is the negation
of `2`.

Every node carries the span of the text it came from. An error found
after parsing, an unknown unit or a mismatch, points back at the input
through it. `parseExpr` knows nothing about units, and `evaluate` knows
nothing about text. `Span` has a small module of its own, since it is
not a parsing concept: every later function locates its errors with it.

### Three decisions of the parser

**A call is decided by the text alone.** The parser cannot ask the table
whether a name is a function, so the rule is lexical
([Calls and arity](../docs/expressions.md#calls-and-arity)). No space
before the `(` makes a call, and a space makes a juxtaposition. So
`kg (m/s)` is a product, and `kg(m/s)` is a call of `kg`, which the
evaluator reports with a message that shows the product. That is the one
rule of the grammar that depends on whitespace
([Calls](functions.md#calls)). The count of arguments is the evaluator's
to check, not the parser's.

**An exponent is kept as the literals it was written with.** An exponent
is one literal, as in `m^0.5`, or a quotient of two, as in `m^(1/2)`. It
is never an expression, so it is known when the text is parsed. The tree
holds the literals as read (`Exponent`), and the parser takes no
quotient. It checks two things, both read off the literals with nothing
computed:

- Each literal can be held as a fraction within **the hard bound**, the
  most the significand limit can be set to.
- The divisor is not zero.

The evaluator forms the exponent as one fraction
([The exponent of a power](#the-exponent-of-a-power)). Forming it in the
parser is ruled out. The parser has no context, so no significand limit
bounds the work. It would run Euclid's algorithm on literals as long as
the hard bound allows, on every keystroke, which is far too slow for
long literals.

**A name takes every character that can continue it.** `m2` is one name,
never `m` beside `2`. The table, not the parser, decides whether a name
means anything.

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
It follows three rules:

- One space stands between juxtaposed factors and around every other
  binary operator.
- A quotient of two literals is written without the spaces, as
  `5000/127`.
- The parentheses are the fewest that parse back as the same tree. Each
  position of the grammar accepts an operand down to some level of
  binding, and the printer parenthesizes an operand that binds looser
  than its position accepts (`levelOf`). The levels do not express the
  rule of one position. A number cannot follow a factor by
  juxtaposition, so a right operand of a juxtaposition that leads with a
  number is parenthesized too, as in `2 (3 m)`.

The printer's output is a list of pieces. Each piece says what it is: a
number, a name, an exponent or a symbol. The converter styles the
numbers of a result through the pieces, and `text` joins them. The
caller chooses the product sign: the screen shows `×`, and the copy
button gives `*`, which parses.

## Parsing

[Errors](../docs/expressions.md#errors) states how a parse error reads
to a user. Both parsers, of expressions and of definitions, are built
from one small set of parser combinators in `src/core/parser.ts`.

A parser is a plain function from the input text and a position to a
reply. The reply is the value the parser recognized with the position
just past it, or an error. A grammar is plain code that combines parsers
into parsers:

- Primitives match a fixed string (`string`), a pattern (`regex`) or the
  end of input.
- Combinators sequence parsers, choose between them in order, and repeat
  them.
- `chainl1` builds one left-associative precedence level.
- `spanned` attaches a span.
- `check` validates a recognized value.
- `lazy` allows self-reference.

The types carry the shape of the grammar. A sequence of parsers is a
parser of a tuple, and a choice is a parser of a union, so a grammar
that type-checks produces the tree its types say it does.

### Why combinators

Combinators were chosen over a hand-written recursive-descent parser and
over a Pratt parser, a top-down operator-precedence parser. The grammars
are small and fixed, so a combinator grammar is short enough to be
checked by reading it against the grammar it transcribes. The expression
language has six levels. Each is one `chainl1` over the level below it,
or one `many` for juxtaposition. A definition has two or three fields.

A Pratt parser is general. It drives a table of operators with numeric
binding powers from a loop, and the loop's invariant has to be checked.
A grammar of six fixed levels gains nothing from that generality.

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

The work of a parse is counted in the primitive matches it attempts.
Text is read more than once only when an alternative fails after it has
consumed some text, and the next alternative reads the same text again.
Unmemoized ordered choice is exponential in that case.
`alt(seq(p, a), seq(p, b))` parses `p` twice, and that pattern nested
`k` deep parses the innermost `p` `2^k` times.

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
So a parse attempts a constant number of primitive matches per token. A
text of a hundred characters takes a few hundred attempts.

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

| `Rejection`             | Cause                                                                  | To a user               |
| ----------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `numberTooLarge`        | a literal whose significand is past the hard bound                     | a size refusal          |
| `numberOverflow`        | a literal whose exponent passes the exponent bound                     | a size refusal          |
| `numberUnderflow`       | a literal whose exponent falls below the exponent bound                | a size refusal          |
| `exponentTooLarge`      | a `^` exponent that cannot be held as a fraction within the hard bound | a size refusal          |
| `exponentDividesByZero` | a `^` exponent written as a quotient by zero                           | an error as it is typed |

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
  position and the labels of what the parser tried there.
- Text at a span was recognized and rejected. The error carries the span
  and the reason.

Spans are attached with `spanned` on the leaves. A composite node spans
from its first part to its last: a negation from its `-`, a call from
its name to its `)`, and an expression in parentheses with its
parentheses. A message quotes that text, so `1 / (2 - 2)` quotes
`(2 - 2)`.

### Purity, and one throw

The combinators are pure: a parser is a closure over its configuration
and a function of the text and the position. Two pieces of mutable state
are internal and cannot be observed. `regex` reuses one sticky `RegExp`,
whose `lastIndex` it sets before every use, and `lazy` memoizes the
parser it builds.

A `many` of a parser that matches the empty string would loop forever.
That is a bug in a grammar, not an input that can fail, and it throws.

## Evaluation

[Evaluation order and error locations](../docs/expressions.md#evaluation-order-and-error-locations)
states the order in which an expression is computed and the text each
error quotes.

`evaluate` takes an `Expr`, a lookup, the primitives and a working
context. It returns the `Quantity` the expression denotes. It takes one
optional argument more, a collector of assumptions, which gathers the
conditions that the calls in the expression assume
([An undecided condition](functions.md#an-undecided-condition)).

### What each node evaluates to

- A number is a dimensionless quantity.
- A unit name is whatever the lookup says it is.
- Juxtaposition and `*` multiply, `/` divides, `+` and `-` add and
  subtract, and a negation negates, all by the arithmetic on quantities
  ([The arithmetic on quantities](#the-arithmetic-on-quantities)).
- `^` raises its base to the exponent the parser read.
- A call applies a function.

The evaluator takes the result of every node as a step, and the user
docs call a node a step. In exact mode an exact value is therefore never
rounded. The arithmetic reads the context as well:

- Every sum aligns within the significand limit.
- Every product, quotient and power holds its exact result to that limit
  and to the exponent bound.
- Every built-in computes at the precision of the context.
- Every literal's significand is checked against the limit.

The primitives go to every sum, for its conformance check. For the
user's texts they come from the table. While the table is being built,
they come from the definitions, collected before any body is evaluated
([The order of the build](#the-order-of-the-build)).

### The exponent of a power

The evaluator forms the exponent of `^` as one fraction, within the
significand limit (`reduceExponent`). It holds each literal's
significand to the limit, as it holds every literal's. It divides the
two as `Scaled` values, whose powers of ten cancel at no cost, and forms
the fraction from the quotient.

| You type           | Exucal shows                        | Note                                                |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| `2^(1e30/1e30)`    | `= 2`                               | the powers of ten cancel, at any limit              |
| `2^1e-30000`       | refused: past the significand limit | at the default limit: the denominator is `10^30000` |
| `pow(2, 1e-30000)` | `≈ 1`                               | `pow` computes the power from the exponent's value  |

`^` refuses an exponent that `pow` answers. That difference is a known
defect, and [Roots and powers](numbers.md#roots-and-powers) describes
it.

### A call

A call resolves its name through the lookup, to a defined function or to
a built-in (`ResolvedFunction`). It then checks the count of arguments
before it evaluates any of them, since the count belongs to the shape of
the call ([Calls and arity](../docs/expressions.md#calls-and-arity)). A
wrong count is an `arityMismatch`. The rest depends on the function:

- For a defined function, the call evaluates the arguments, checks that
  each conforms to the unit its parameter takes, and applies the
  function ([A defined function](#a-defined-function)).
- For a built-in, the call evaluates the arguments and applies the
  built-in's dimension rule to their dimensions. A failure of the rule
  is a `builtinArgument` at the call, and it carries the rule's error
  and every argument's span. The call then applies the built-in's
  function to the scalars.

### Names are resolved through a lookup

The evaluator is given a lookup, not a table, because one evaluator
serves both ends of the pipeline:

- For the user's have and want, the table supplies a lookup over its
  finished units. It applies the rule that reads a name as a unit or as
  one prefix and a unit ([Names](#names)).
- For the build, `buildTable` supplies a lookup that evaluates
  definitions on demand, while the table is still being built.

Each lookup defines its own error type, since the two fail differently:
only the second can meet a cycle among the definitions. `evaluate` takes
that type as a type parameter and returns a lookup's failure unchanged.

The lookup is given the span of the reference with the name, so that its
error points at the text as the evaluator's own errors do. For a call it
is given the span of the whole call as well as the name's. The error for
a call of what is not a function, `notAFunction`, shows the product with
the space, `kg (m/s)`, from that span.

### Where each error points

Operands are evaluated left to right, and the first failure ends the
evaluation. The evaluator never sees the text: the spans in the tree are
all it knows of it. Each of its own errors carries the span of the part
at fault, chosen as follows:

- **A division by zero carries the divisor's span**, since the divisor's
  value is at fault. So does a division that is `unresolved`, by a
  divisor that cannot be told from zero, as `sqrt(2)^2 - 2` cannot.
- **A power whose base cannot be told from zero carries the base's span**,
  when the base is raised to a negative power or put under an even root.
  The base's value is at fault there too.
- **Any other power that fails carries the span of the whole power**,
  since the combination of base and exponent fails: `0^-1`, an even root
  of a negative value, or a result past a size limit.
- **A sum, a product or a quotient that is refused carries the span of the whole operation.**
- **A literal whose significand is past the significand limit carries its own span.**
- **A sum whose operands do not conform carries the span of the whole sum**,
  with the span of each operand and the `ConformanceError` between them.
  The left operand's dimension is the error's `have` and the right
  operand's is its `want`. So a message words the mismatch as it words
  the mismatch of a conversion.
- **A call whose argument does not conform carries the span of the whole call**,
  with the argument's span, in the same way.
- **A built-in's failure carries the span of the call**, with one
  exception. An `unresolved` carries the span of the argument whose ball
  reaches across the edge that the error names. An argument outside the
  built-in's domain is a `domainError`.
- **A call whose body fails is one `callFailed` at the call.** It names
  the function and carries the body's error, whose spans point into the
  definitions text. Only the evaluator's own failures are wrapped so. A
  lookup's failure inside a body comes back as any lookup's failure
  does, and a table that built cannot produce one.

## Definitions

[The definition language](../docs/definitions.md) states the format of
the definitions file, its six forms of definition and its rules for
names. [Names](../docs/expressions.md#names) states how a typed name is
read.

The predefined units are not special. They live in the definitions file,
`src/units.txt`, and the core knows nothing of them but what the file
says. `buildTable` takes one list of definitions, and today the
predefined definitions file is the whole list. The file is bundled as an
asset of its own: a URL import, so that it is emitted beside the
scripts, precached with the rest of the app's files, and fetched when
the app starts. `src/units.test.ts` builds the table from the file and
checks a sample of conversions from each of the file's sections.
[Adding a unit](development.md#adding-a-unit) says how to add to it.

### What the parser keeps, and what it rejects

`parseDefinitions` reads one definition per line. It returns the
definitions in the order written, duplicates included, and knows nothing
of what they mean.

The parser keeps three texts beside the tree, each as it was written:
every item of a unit list, every annotation and every condition. The
tree alone cannot give a text back as it was written. A message quotes a
condition's text. The outcome compares an annotation's text with `1`,
the annotation of a dimensionless parameter, after which it writes no
unit.

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

### The order of the build

The build is five modules:

- `table.ts` holds the `UnitTable` and the lookup over it that the
  evaluator resolves the user's texts against.
- `names.ts` holds the rule that resolves a name and the check for an
  ambiguous name.
- `name-index.ts` is the index that check searches: the names sorted, so
  that those starting with any text are one contiguous run.
- `graph.ts` is the evaluation on demand ([The walk](#the-walk)).
- `build.ts` puts them together.

`build.ts` runs its checks in a fixed order, and the first failure ends
the build:

1. It indexes the definitions by name and rejects a duplicate. A
   definition named like a built-in is a duplicate too.
2. It rejects an inverse of no defined function.
3. It checks the index for an ambiguous name ([Names](#names)).
4. It checks the names of the lists, the functions and the built-ins for
   one that reads as a prefix followed by a unit. A list's name means
   the list only as a bare want, and a unit's name means the unit
   everywhere. So `ms` as a list's name would make one text mean two
   things in the two fields, and the same holds for a function's name.
5. It collects the primitives and their roles. A body that is a sum
   needs them to check its operands, and a body may refer to a primitive
   declared after it.
6. It takes every definition in the order written and evaluates or
   checks it ([The walk](#the-walk)).

The table is built at the ceiling, where no later pass could decide a
condition. A unit, a prefix, an item of a list or an annotation that
calls a function evaluates the call's conditions during the build. A
condition left undecided there fails the build, since a definition has
nowhere to carry the warning.

[When the file does not load](../docs/definitions.md#when-the-file-does-not-load)
lists every fault, the parser's and the build's, with an example of
each. Each `BuildError` locates its fault: it carries the definition or
definitions at fault, or a span into the whole definitions text. No
message is worded for a build error: only the predefined definitions
file is loaded, and the shell reports a failed build by the error's name
([The shell and its parts](#the-shell-and-its-parts)).

### The walk

A body may refer to a definition that comes later in the file. So the
build evaluates a definition when it is first needed, not when it is
reached. `graph.ts` holds that mechanism, the **walker**, and nothing in
it knows what a definition is:

- The walker is given a function that computes the value of one entry.
  That function is handed a way to request the values of the entries it
  depends on.
- The walker memoizes each value, so an entry is computed once.
- A request for an entry whose computation is in progress is a cycle.
  The walker returns the cycle to the requester, which knows where the
  request came from. So a cycle is reported at the reference that closes
  it, and never looped on.

The build's lookup is the link between the two. It resolves each name
through the index and requests the definition the name means from the
walker.

The entries of the walk are the definitions that an expression can refer
to. The two other forms are handled when the order reaches them:

- **A primitive, a prefix and a unit are entries.** The value of each is
  a quantity. A primitive is a quantity of one of itself, so that every
  lookup of a unit is one map read. A prefix's or a unit's body is
  computed by `evaluate`.
- **A function is an entry**, since a call in any body can refer to it.
  Computing its value means checking it, over dimensions alone
  ([Build-time checks](functions.md#build-time-checks)). A call in a
  condition is a dependency as a call in a body is. So a unit may be
  defined by a call, a function's body may call another function, and a
  cycle through a function is reported like any other.
- **A unit list is not an entry**, since no expression can refer to one.
  Each list is evaluated when the order reaches it, item by item,
  through the same lookup a body uses. It requests what it refers to
  from outside any computation in progress, so it can never close a
  cycle. Its units are checked as `convertToList` checks any list,
  against the first of them.
- **An inverse is not an entry either.** It is keyed by its function's
  name, apart from every namespace, and nothing can refer to it. It is
  checked when the order reaches it. It requests its function as a list
  requests its units, so it may call its own function.

The table holds each function as its body, still an expression, since a
call evaluates the body afresh through the table's lookup. Beside the
body it holds four things:

- The parameters in order, each with the unit it takes and that unit's
  text.
- The dimension of the result.
- The conditions, each with the parameters it mentions.
- The inverse, when one is defined.

### Names

The rules for names are the user docs'. The build applies them over
definitions, before any quantity exists, and the finished table applies
them over quantities. `names.ts` is therefore generic in what a prefix
or a unit maps to.

Prefixes are a namespace of their own. Primitives, units, unit lists,
functions and the built-ins share another, so a list or a function named
like a unit is a duplicate. A call's name resolves among the defined
functions and the built-ins exactly, with no prefix. So `ktempC(1)` is a
call of nothing (`notAFunction`).

Every name is known once the definitions are indexed, so ambiguity is a
property of the table and not of the input, and the build checks for it.
A name with two different splits into a prefix and a unit is a build
error: `d` + `am` against `da` + `m`, if `am` were a unit. A table that
builds therefore has at most one split per name. A unit's name that is
also a valid split is allowed, since real unit conventions are full of
them, and the exact name wins: `min` is the minute, against `m` + `in`.

The check is cheap. Two splits of one name need two prefixes of which
one extends the other, as `da` extends `d` by `a`. For each such pair,
the check looks at the units that start with the extension, and makes
one map lookup for each. It finds those units in the index of the unit
names. For most pairs the index holds none: `micro` extends `m` by
`icro`, and no unit starts with `icro`.

### The lookup's throw

The table's lookup forms a prefixed unit as the prefix's factor times
the unit's quantity, under the context it is given. The product can be
refused at the exponent bound, and the lookup has no error to return for
a refusal. It throws instead (`table.ts`).

No input reaches the throw with the predefined definitions file, whose
prefixes and units are nowhere near the exponent bound. A file could
make it reachable by defining a unit within a prefix's factor of the
bound. A user who then typed that unit with the prefix would reach it.

The build's own lookup differs. It reports the same product, refused, as
an error at the reference that forms it. So a definition that itself
writes such a prefixed form fails the build, and only a prefixed form
that no definition writes can reach the throw.

The significand limit is not the lookup's concern. The evaluator holds
the product to that limit at the node that names the unit.

## UI

[The app](../docs/app.md) describes the interface as a user meets it.
The UI is a handful of Lit components under `src/`. **The shell**,
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
  composition. A custom element serves a piece with its own state or
  styles. A template function serves a piece with neither. A reactive
  controller serves a piece of lifecycle. Those are used, and nothing
  from outside Lit.
- **One file has one job**, and is named for the thing it renders
  ([Layout](layout.md)).

### The shell and its parts

The shell holds the three pieces of state the parts share: the
definitions, the settings and the service worker's status. Each has one
source, and the shell derives everything else in `render`. The parts are
the converter, the settings panel with its cog, the footer and the
buttons.

#### The definitions

`src/system-table.ts` fetches the bundled `units.txt` and parses it
once, on the main thread. The parse takes a few milliseconds, a rough
figure, so a worker would cost more than it saves. The shell starts the
load when it is connected and shows a loading message until the promise
settles. Loading the components never waits on the definitions.

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
  every exact result to it. A key needs the limit only if a change of
  the limit can change the table, and it cannot. The predefined file
  builds at the least limit the settings allow
  (`MIN_SIGNIFICAND_LIMIT_BITS`, which `units.test.ts` checks), so it
  builds to the same table at every limit.

`tableOf` gives the state of the table as a pure function: loading,
failed or ready. When the fetch, the parse or the build fails, the shell
says so in place of the converter, with a Retry button. The button asks
for the definitions again:

- A failed fetch is not memoized, so the button fetches again. The user
  decides when, since the user may know that the network was down a
  moment ago. The app never retries on its own.
- A failed parse or build repeats, and the shell's message says that it
  is a bug in the app.

#### The settings

[The settings](settings.md) has the design. When the shell is created,
it reads the settings from `localStorage` through `settings.ts`, which
validates and migrates what was stored. The shell hands the converter
the context the settings make (`contextOf`) and the settings of the
ratio notation.

`<settings-panel>` (`src/settings-panel.ts`) is the settings panel. It
takes the settings, and whether it is open, as properties. It reports
three events:

- `settings-change`, for each change the user makes.
- `settings-reset`, for each reset, of one setting or of all.
- `settings-close`, when it closes itself.

The shell applies a change and a reset alike. It clamps what depends on
the change and saves the settings. It hands back what the clamp moved,
so that the panel can report it.

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

- `<app-button>` is a button with words in it: Done, Apply, Retry.
- `<link-button>` is a button that reads as a link: the resets and the
  footer's links.
- `<step-button>` is the `−` or `+` of a stepper beside a number input.

`src/styles.ts` holds the styles the components share: the feedback
every button gives, and the hint.

### The converter and its lines

[The two fields](../docs/app.md#the-two-fields) and
[Copying a result](../docs/app.md#copying-a-result) describe the fields
and the copy button as a user meets them. `<unit-converter>`
(`src/unit-converter.ts`) is the converter: two text inputs, labeled
"You have" and "You want", and an output area. It takes three
properties: the table (`table`), the context (`context`) and the
settings of the ratio notation (`ratio`). Its only state is the two
strings. On every change it calls `outcomeOf` and renders the lines or
the error. The outcome has no DOM dependency, so `outcome.test.ts`
checks the lines under Node.

#### How a line is composed

An output line is two expressions and a relation between them: the
have as it was read, and the result. The outcome composes the result as
an expression, from two sources:

- The values come from `show`, which writes a value's text.
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

The printer then writes both sides ([The printer](#the-printer)). It
decides the parentheses from the tree, so a want that is a sum or a
negation is parenthesized: `1 m ≈ 3.0284676 (ft + in)`. No code decides
the parentheses of a line as such.
[Where a ratio is written](notation.md#where-a-ratio-is-written) gives
the same mechanism for a ratio.

A `<copy-button>` beside each line (`src/copy-button.ts`) copies the
result as the printer writes it with `*`. That text parses back. Typed
as a have and converted into the line's own unit, it gives the line
again, which `outcome.test.ts` checks.

#### The relation and the note

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
what the relation and the note tell a user. The **relation** is `=`, `≈`
or `≈̇`, the uncertified sign of decimal mode. The outcome decides it from
`show`, at the display digits and in the rounding mode of the user's
settings. `show` returns the text of a value with a tag, which the code
names `kind`. The relation follows the tags of every value the line
shows:

- `=` when every value is tagged `exact`.
- The uncertified sign when every value is tagged `exact` or
  `uncertified`, and at least one is `uncertified`.
- `≈` otherwise.

A **note** follows a line in parentheses when the line does not show
every digit asked for. It comes from the tag too, and says one of four
things:

- How many of the display digits are certified.
- The bound within which a value lies that cannot be told from zero.
- That no digit is certified.
- That a step could not be certified at the precision limit.

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

1. It certifies the list on its unrounded terms. In a directed rounding
   mode, `roundTerms` puts the remainder's midpoint exactly on a
   boundary between two roundings, and a value there certifies one digit
   fewer.
2. It rounds the terms with `roundTerms`, at the digits the remainder
   certifies
   ([Rounding the terms as one sum](#rounding-the-terms-as-one-sum)).
   Under the ratio notation, an exact remainder that fits as a ratio is
   written entire, so nothing is rounded and nothing carries.
3. When the rounding carried into an earlier unit, the remainder that is
   left is a new value, and the outcome asks `show` for its tag afresh.
4. It leaves out a term of zero. It also leaves out a last term that
   cannot be told from zero, with its note. A sum of nothing but zeros
   keeps its last term.

The relation is `=` only when `show` tags every unrounded term `exact`.
The counts carry no note.

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
no part of the conversion. So it stays in the outcome, which takes the
quotient as a step at the user's context. In decimal mode the ratio is
already rounded to the display digits when the outcome inverts it
([The working digits](numbers.md#the-working-digits)).

The line is left out whenever that quotient fails. A value of zero has
no reciprocal, and neither has one that cannot be told from zero.

The quotient is taken outside the retry loop, and two gaps follow
([#92](https://github.com/bsidhom/exucal/issues/92)):

- The line shows whatever tag the quotient has at the user's context. A
  reciprocal that a pass at more digits would certify is not retried on
  its own.
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

Four pieces of state machinery are ruled out of the UI. Each would cover
a part of the shell. The shell has one asynchronous value, one
subscription and two levels of nesting, which is too little to pay for a
library, and the rule is nothing beyond Lit.

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
