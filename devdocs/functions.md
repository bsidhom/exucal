# User-defined functions

A function in the definitions file is a signature, `=` and a body; an
inverse is a definition of its own, on a line that starts with `~`; and a
`want` that names a function is answered by writing the call that would
produce the `have`, `tempF(212) = tempC(100)`, which needs the inverse.
[docs/definitions.md](../docs/definitions.md) describes functions from the
user's side; this page is the design and its reasons.

Functions exist for readings such as a temperature, which are not
multiples of a unit, without giving `Quantity` an offset that every
operation would then need a rule for, and for compositions of the
built-ins that a user would otherwise type out (`normcdf(x) = (1 +
erf(x / sqrt(2))) / 2`), of several parameters, with the units of their
arguments declared where that helps and an inverse only where one is
wanted, agnostic to the precision and the rounding in force. Nothing
about functions touches quantities: a call is a quantity like any other
once the body has run, and the rest of the expression goes on as
before.

## Definitions

```
normcdf(x) = (1 + erf(x / sqrt(2))) / 2
kinetic(mass: kg, v: m/s) = mass v^2 / 2
bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
logit(p) | 0 < p < 1 = ln(p / (1 - p))

tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15

dozen(n: in) = 12 n
~dozen(len) = len / 12
```

The grammar of a function line:

```
function   := name dims? "(" params? ")" (":" annotation)? ("|" conditions)? "=" expr
inverse    := "~" name "(" name ")" ("|" conditions)? "=" expr
params     := param ("," param)*
param      := name (":" annotation)?
conditions := condition ("," condition)*
condition  := expr cmp expr (cmp expr)*      every cmp of one condition points one way
cmp        := "<" | "<=" | ">" | ">=" | "≤" | "≥"
annotation := a unit expression ("Annotations")
dims       := "[" name ("," name)* "]"       reserved ("Deferred")
```

- **The head decides the grammar,** as a trailing dash decides a prefix:
  a name directly followed by `(` makes the line a function, a line whose
  first character is `~` an inverse, and a name directly followed by `[`
  is reserved for dimension variables and rejected (`unsupported`).
  Inside the head, spaces are free around every token, so the head
  is read by parser combinators rather than a regex over one token;
  between the name and `(` there is no space, as in a call.
- **`=` ends the head.** An annotation is an expression and
  juxtaposition multiplies, so whitespace cannot end it: were a result
  annotation `J` followed by the body `mass v^2 / 2` with only a space
  between them, the parser would read one product. `=`, `:`, `~`, `|`
  and the comparisons appear nowhere in the expression grammar, so every
  decision is still made from the text alone, and the parser never
  consults the table.
- **A function has any number of parameters, none included,** bound by
  position at a call; a parameter may not be named twice. A function of
  none, `twopi() = 2 pi()`, is called with empty parentheses, as `pi()`
  is. It differs from a unit of the same body, `twopi  2 pi()`, in when
  it is evaluated: a unit is evaluated once, when the table is built at
  the ceiling, and a call afresh at the working precision of every pass,
  so a function of none is the way to name a computed constant without
  fixing it in the table. It has no inverse, since it has no argument to
  recover (`inverseArity`).
- **A parameter without an annotation is a plain number.** `x: kg`
  admits a mass, and `x: 1` says explicitly what no annotation says. A
  parameter without an annotation takes `1`, written `1`, so that the
  want writes its recovered argument as a bare number by the same path
  as an annotated one's count.
- **The result's annotation is optional.** Without one, the result's
  dimension is inferred from the body by `dimensionOf`, with each
  parameter bound to its annotation's dimension; the inference is exact,
  since a body's dimension never depends on its arguments' values. With
  one, the inferred dimension is checked against it, so that `: 1`
  asserts a plain result and catches a body that is not.
- **An inverse is optional.** `~name(p) = body` defines the inverse of
  `name`, which must be defined, with exactly one parameter, since only
  a function of one argument has one argument that gives a value. The
  inverse's parameter has `name`'s result dimension and takes no
  annotation, since that dimension is known, but may take conditions,
  which restrict the `have`s a conversion into the function accepts; its
  body must conform to `name`'s parameter. A function without an inverse
  cannot be the `want`. The two lines may stand anywhere in the file, as
  every definition may, and are conventionally adjacent; a `~` line whose
  function is not defined is a build error (`orphanInverse`), one of a
  function of other than one parameter is `inverseArity`, and a second
  `~` line for one function is a duplicate.
- **Conditions follow a `|`,** read "such that", after the parameters and
  the result annotation ("Conditions" below).

A function's name lives in the unit namespace, with units and lists: a
function and a unit of one name are a duplicate, and so are a function
and a built-in. It must not read as a prefix followed by a unit
(`prefixedName`, one error for lists, functions and built-ins), for the
reason a list's may not: typed as the `want`, `ms` would mean the
function, and typed as the `have`, milliseconds. An inverse's name is its
function's, behind the `~`, which no other name can start with.

The functions of `units.txt`:

```
tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15
tempF(x) | x >= -459.67 = (x + 459.67) degF
~tempF(y) = y / degF - 459.67
neper(x)    = exp(x)
~neper(y)   = ln(y)
bel(x)      = pow(10, x)
~bel(y)     = log10(y)
decibel(x)  = pow(10, x / 10)
~decibel(y) = 10 log10(y)
```

`Definition` has a `function` kind (the name, the parameters each with
an optional annotation, the optional result annotation, the conditions
each with its text, the body, the span) and an `inverse` kind (the
function's name, the parameter, the conditions, the body, the span); an
annotation and a condition are kept with their text, for the messages
that quote them.

## Annotations

**An annotation checks a dimension and changes no value.** A quantity
carries no unit of its own: its magnitude is held in the primitives, so
`100 lb` and `45.359237 kg` are one value, and nothing remembers which
was typed. `weight: kg` therefore means "a mass", exactly as `weight: lb`
does. An argument in any conformable unit is accepted as it stands, by
conformance, the test a sum applies to its operands, kinds included (`x:
radian` admits an angle and not a plain number). There is no conversion
step, since there is nothing to convert: `bmi(100 lb, 4 ft)` is exactly
`bmi(45.359237 kg, 1.2192 m)`.

The result has a dimension, not a unit. The `want` chooses the unit, as
for any value, and a blank `want` writes the primitives, as it always
does (`tempC(100) = 373.15 K`). So for `bmi(weight: lb, height: ft):
lb/ft^2 = weight / height^2`, `bmi(100 lb, 4 ft)` is shown as
`≈ 30.515173 kg / m^2` with a blank `want` and as `= 6.25 lb/ft^2` into
`lb/ft^2`. That surprises a reader of the head, but the alternatives
below are worse, and the `want` is always there; showing a lone call's
value in its annotated result unit by default is deferred
([#130][130]).

**A number in a particular unit is divided out in the body.** A formula
fitted to numbers in given units, or a result that is an index on a
defined scale, divides those units out, and the division, not the
annotation, is what makes it right; writing `weight: lb` with
`weight / kg` in the body is still correct, since an annotation cannot
change what a function computes. Such a result is annotated `: 1`, so
that a division left out fails the build rather than quietly giving a
dimension: `bmi(100 lb, 4 ft)` is then `≈ 30.515173`, a number on BMI's
scale whatever the arguments were typed in, where a dimensioned BMI
would invite conversions that mean nothing. A physical result keeps its
dimension: `kinetic(mass: kg, v: m/s) = mass v^2 / 2` is an energy, and
converts to `J`, `kcal` or `ft lbf`. Temperature is the one case where
dividing a unit out is not enough: a formula fitted to Fahrenheit
readings needs the reading, `T / degF - 459.67`, since `T / degF` alone
counts Fahrenheit degrees from absolute zero.

**An annotation is a unit expression.** It is the expression grammar
restricted to unit names (prefixed or not), juxtaposition, `*`, `/`, `^`
with its literal exponent, parentheses, and the number `1`, written `1`:
`kg`, `m/s`, `kg m^2 / s^2`, `1 / s`, `1`. Any other number, a sum or
difference, a negation and a call are rejected where they are written
(`annotationScale` for the number, `annotationNotUnits` for the rest;
`f(x: 2)`, `f(x: 1000 m)` and `f(x): kg/2` alike). No message is worded
for a definitions rejection today, since definitions cannot be typed
([#132][132]); the wording meant for this one is "An annotation names
units and cannot scale. Write a scale in the body; for a plain number,
write 1." Conformance ignores magnitude, so `: 2`
could only be read two ways, and both bite: as `: 1`, which is a lie to
the reader who expects a scale, or as a scale, which breaks the rule that
an annotation changes no value. The `1` is kept because a plain result
needs a spelling and `1 / s` needs a numerator. A unit name is accepted
whatever its magnitude, `percent` and `dozen` included: `: percent`
asserts a plain number and multiplies by nothing, as `: lb` asserts a
mass and converts nothing. A scale in the result's annotation, and a
list there (`: ft;in`), are use cases for the deferred default `want`,
and the restriction can be relaxed when that design takes them up.

An annotation's unit matters beyond its dimension in one place only: a
recovered argument is written as a count of it ("Display" below), so
`2 ft` into `dozen` is `dozen(2 in)`. An annotation must be nonzero
(`zeroDeclaredUnit`), since a count of zero means nothing; with the
restriction above, that can fail only for a unit defined as zero.

The alternatives weighed: a parameter bound to its number in the
annotated unit, as GNU units' `units=` reads (`w: kg` making `w` the
number `w / kg`), which matches how empirical formulas are printed, but
changing `kg` to `lb` would silently change the function and the body
would lose its dimension checks, where `w / kg` in the body is explicit
and survives either annotation; an argument required in exactly the
annotated unit, which cannot be checked since a value does not remember
the unit it was typed in, and would not be wanted; and a result unit
implied by the parameters' units (`min` and `mi` giving `min/mi`), where
a dimension can be written over the parameters' units in several ways or
none, and constants such as the `/ 2` of kinetic energy get in the way.

## Names and shadowing

Annotations are evaluated among the units alone; conditions and the body
resolve a parameter before any unit, by its exact name. So a name
resolves one way wherever it stands: in `kinetic(mass: kg, v: m/s)`, `m`
in the annotation is the metre whatever the parameters are called, and
in a body whose parameter is `m`, `m` is the parameter and `km` is still
the kilometre, since a prefixed name is looked up among the units. An
annotation cannot name a parameter, so it cannot say that one parameter
has the unit of another; that is what the deferred dimension variables
are for.

Shadowing a unit is allowed and silent. `t`, `s`, `m`, `c`, `g`, `h` and
`T` are units, and the list grows; forbidding them as parameters would
take the short names formulas use (`tcdf(t, nu)`), and would let a unit
added to the system file break a user's function that loaded before.
Under the rule below, a unit added later never breaks a function: an
annotation could only have named it if it already existed. (A sigil on
parameters, `$t`, was the other alternative, and reads unlike
mathematics.) Two cases are errors, each found from the definition's
text alone and reported when the definitions are parsed:

- **A duplicate parameter**, `f(x, x)`, at its second occurrence
  (`duplicateParameter`): no rule could say which one the body means.
- **A parameter named like a unit that the same head uses**
  (`parameterNamesUnit`, at the annotation's use of the name):
  `kinetic(m: kg, v: m/s) = m v^2 / 2`, where the head's `m` is the metre
  and the body's is the mass. The name resolves one way in each place,
  but the line reads both ways. The rejection carries the parameter, and
  the message meant for it names the parameter and the annotation and
  suggests renaming the parameter. The error is meant to become a
  warning once user definitions have an editor and the build
  has a way to report warnings ([#131][131]): relaxing an error later
  breaks no file, where tightening a silence would.

## Conditions

A function may restrict its arguments by conditions, written behind a
`|` after its parameters and its result annotation and separated by
commas. Every condition must hold:

```
tempC(x) | x >= -273.15 = x K + 273.15 K
ln1p(x) | x > -1 = ln(1 + x)
logit(p) | 0 < p < 1 = ln(p / (1 - p))
frac(x) | 0 <= x < 1 = …
band(temp: K) | 0 K <= temp <= 373.15 K = …
npdf(x, mu, sigma) | sigma > 0 = exp(-((x - mu) / sigma)^2 / 2) / (sigma sqrt(2 pi()))
uniformcdf(x, a, b) | a < b, a <= x <= b = (x - a) / (b - a)
indisc(x, y) | x^2 + y^2 <= 1 = …
~tempC(y) | y >= 0 K = y / K - 273.15
```

- **A condition is a chain of comparisons:** two or more terms, each an
  expression, joined by `<`, `<=`, `>` or `>=` (or `≤` and `≥`). `<` and
  `>` exclude their bound and `<=` and `>=` include it, which decides the
  exact boundary: `ln1p(-1)` fails, `tempC(-273.15)` holds. A bound on one
  side is a chain of two terms, written either way round; a bound on
  both sides is a chain of three, in either direction. The comparisons
  of one chain point one way, so `0 < x > 1`, which bounds nothing as an
  interval does, is a parse error (`mixedComparison`, at the whole
  chain).
- **Several conditions are a conjunction,** separated by commas. A
  parameter may appear in any number of them, a condition may relate
  parameters (`a < b`), and its terms may be any expressions of them
  (`x^2 + y^2 <= 1`). There is no disjunction: a domain in two pieces is
  usually one condition on an expression (`abs(x) >= 1`).
- **There is no equality and no `!=`.** `=` always ends the head, and
  equality of an inexact argument can never be decided on a ball, so an
  equality condition would be undecided for every inexact argument. A
  body that cannot be computed at a point already fails there.
- **Conditions see the parameters before the units,** as the body does,
  so a condition is written as the body would write the same expression.
  Each condition must mention a parameter (`conditionWithoutParameter`);
  one that does not could only always hold or never.
- **Dimensions are checked at build time.** `dimensionOf` takes each
  term's dimension with the parameters bound as in the body, and
  adjacent terms must conform, as a sum's operands must
  (`nonconformingComparison`, naming both): with `x: K`, `| x > 0` is an
  error, whose message suggests `0 K`.
- **A term is any expression** of the language: numbers, units, sums,
  products, juxtaposition, negation, `^`, parentheses, and calls of the
  built-ins and of other defined functions, which check their own
  conditions in turn. A unit list is not an expression, and neither is a
  comparison: there are no truth values, so a comparison cannot stand
  inside a term (`(x < 1) + 1` is a parse error), and a condition is only
  ever a chain at the top level.
- **Calls in conditions are dependencies,** as calls in a body are. The
  build's walk follows them, on functions and on inverses alike, so
  `f(x) | f(x) > 0 = …` is a cycle reported at build time, and
  evaluation still terminates.

The grammar is unambiguous, and still decided by the text alone: an
annotation ends at `,`, `)`, `|` or `=`, none of which a unit expression
contains; a term ends at a comparison, at a comma outside parentheses,
or at `=`, none of which can continue an expression (a comma inside a
call's parentheses belongs to the call, by nesting); comparisons bind
looser than anything in a term, since they are not part of the
expression grammar, so `| a + b < c d` compares `a + b` with `c d` and
`| x > -1` compares `x` with the negation of `1`; `<=` and `>=` are each
one token, read before `<` and `>`; `|` appears once, and only in a head;
and the deferred dimension variables fit before the parameters without
touching any of this.

### The check at a call

A call checks its conditions after the arguments conform and before the
body (`checkConditions` in `evaluate.ts`). Each condition's terms are
evaluated on balls, with the parameters bound to the arguments, at the
working context (the operands' context, in decimal mode with extended
working digits, since a condition's terms are no part of a displayed
value), and each adjacent pair is compared three-valued (`decide`):
certainly holds, certainly fails, or not decided, when the two balls
overlap at the boundary. The conditions are taken left to right, and the
pairs of a chain left to right, as one conjunction in three-valued
logic:

- **The first certain failure ends the check,** as `conditionFailed` at
  the call, naming the function, the condition as written, and the
  arguments of the parameters it mentions, in the parameters' order:
  `"logit" requires "0 < p < 1", and p is "1.5"`. A certain failure ends
  it even after an undecided comparison, since one false conjunct makes
  the whole false.
- **A term that cannot be computed ends it too,** as `callFailed`, as a
  body's failure does, but only when every comparison before it
  certainly holds. So a condition may guard the next: in
  `| x > 0, ln(x) > 1`, a negative argument fails the first condition and
  never reaches `ln`. After an undecided comparison, a term that cannot
  be computed is undecided as well, since the guard may yet exclude it.
- **Otherwise, an undecided comparison is assumed to hold,** and the
  assumption is recorded.

**A comparison is decided by the ball model, with no tolerance.** Its
two sides have conformed at build time, and a quantity's magnitude is
held in the primitives, so their magnitudes compare directly: `1 ft >
30 cm` holds. Two exact values are compared exactly, as the numbers they
are, and always decide, the boundary included: `tempC(-273.15)` meets
`x >= -273.15`, and `0.1 + 0.2 <= 0.3` holds, since the sum is exactly
`0.3`; they are compared without forming their difference, so a
comparison of exact values is never refused for size. An inexact value
against an exact one is placed against it directly, by `position` of
`ball.ts`, without forming a difference whose rounding could only widen
it; otherwise the right side is subtracted from the left as balls, and
the difference's position against zero decides, a difference refused as
too large to form counting as across zero (`orderOf` in `ball.ts`). The
verdicts, for the position of the left side against the right:

| Difference against zero                     | `<`       | `<=`      | `>`       | `>=`      |
| ------------------------------------------- | --------- | --------- | --------- | --------- |
| below it throughout                         | holds     | holds     | fails     | fails     |
| below, its upper end exactly on it          | undecided | holds     | fails     | undecided |
| exactly zero (as two exact equal sides are) | fails     | holds     | fails     | holds     |
| above, its lower end exactly on it          | fails     | undecided | undecided | holds     |
| above it throughout                         | fails     | fails     | holds     | holds     |
| across it, or unbounded                     | undecided | undecided | undecided | undecided |

A ball is closed, so an end exactly on zero leaves equality possible,
and a strict comparison undecided. So an inexact value equal to its
bound never decides a strict comparison, and decides a non-strict one
only if its ball happens to end exactly on the bound:
`tempC(approx(-273.15))` stays undecided to the ceiling. `position`
answers "across" when its coarse radius bounds cannot tell, which can
only turn a verdict into undecided, never into a wrong one. In decimal
mode every value is exact, so every comparison decides and no condition
is undecided there.

### An undecided condition

When a condition cannot be decided, the call goes on: the condition is
assumed to hold, the body is evaluated, and the assumption travels with
the value to the pipeline, naming the function, the condition as
written, and the call. The result is shown best-effort, with the
uncertainty called out, rather than refused:

- **Retried first.** A result that carries an assumption is not final:
  the retry loop treats it as a result that certifies too few digits,
  keeping it as the best so far and computing again at more digits, at
  which a condition across its bound by noise alone usually decides.
  When a later pass decides against the argument and fails outright,
  the loop ends with that error, not with the earlier result that rested
  on the assumption (`nonneg(1 + 1e-40 - exp(1e-40))`, undecided at the
  first pass and certainly negative at the third, is refused).
- **Shown at the end, with a warning.** If an assumption remains at the
  ceiling, the value is shown, every line's relation is `≈` whatever its
  digits, and a warning beside the lines names each assumed condition,
  one per distinct wording, styled apart from the notes on digits so that
  it is not read as one: `tempC(approx(-273.15))` is `≈ 0 K`, with "Could
  not tell whether the argument of "tempC" meets "x >= -273.15"; the
  value assumes it does." The warnings are the outcome's, so the
  reciprocal line, a list's line and a function want's line carry them
  with no word of their own.
- **A definite failure still fails.** A condition that certainly fails is
  `conditionFailed`, whatever else is undecided, and so is a term or a
  body that certainly fails under no assumption. A body that fails under
  an assumption reports the assumption instead, since the failure may be
  the assumption's: the call is then `undecidedCondition`, naming the
  condition and carrying the body's error, which the retry loop retries
  as it does an `unresolved`.
- **Why conditions differ from the built-ins' edges.** `floor(sqrt(2)^2)`
  is refused, not guessed, because at an edge of a built-in the value
  jumps or does not exist, and a guess would be a wrong value. A
  condition is a restriction the author declared on a body that usually
  computes on both sides of it (`tempC` of a reading below absolute zero
  is a number, merely a meaningless one), and where the body cannot
  compute, it fails or is unresolved itself. So the value shown is the
  body's honest ball, and the only thing in doubt is whether the
  definition admits the argument, which the warning says. A traditional
  calculator would return a `NaN`, or a value from the wrong side,
  without saying why.

An assumption travels in a collector: `evaluate` takes an optional array
that each call it makes, at any depth, adds its assumptions to once its
body has computed, a call gathering its own and its body's apart so that
a body failing under one is told from one failing outright, and the
assumptions of calls in a condition's terms are kept with the condition's
own; a pass that fails drops its assumptions with it. `resolve` gives
each pass a fresh collector, and hands the returned pass's assumptions
to `evaluateText` and `convertText`, which take an optional collector of
their own; the outcome holds the warnings.

Conditions have no effect beyond their verdict, and their costs are an
expression's: evaluating one changes nothing but the memos of constants
that any expression fills; a call evaluates its conditions on every
pass, as it does its body, and a condition costs what the same
expression typed inline would. A condition that restates an identity
(`| sin(x)^2 + cos(x)^2 <= 1` for an angle, `| x - x >= 0`) holds for
every argument, but on an inexact one the dependency problem keeps the
ball across the boundary at every precision, so every such call runs to
the ceiling and its value is shown with the warning; this cannot be
detected at build time in general, and the user's docs say that a
condition should bound the arguments, not restate what the body
guarantees. A unit defined by a call checks the call's conditions when
the table is built, at the ceiling, so `cold  tempC(-300)` fails the
build with the condition it breaks, and a condition undecided there
fails the build too (the build's `undecidedCondition`, without an
error), since a unit's value has nowhere to carry a warning and a
definitions file should not depend on noise.

**No assertion on a result.** Conditions restrict arguments only. A
function's result is checked for its dimension, once, at build time, and
its value is never checked against a range, at the call or anywhere
downstream. A range assertion would have nothing to feed: no part of the
evaluator narrows a value by what is known of its range, and a value's
ball is all that the rest of an expression ever learns of it. Only a
built-in can use what it knows of its own range, in its own code, as
`asin` knows that its angle lies within `±pi() / 2` radians; a defined
function is a composition, and has no such code. So a range condition
could only check the body against itself, an assertion for the author
that nothing else would act on, and GNU units' `range=` has no
counterpart. Whether ranges, on defined functions and more
systematically on the built-ins, could instead narrow a result's ball
and so carry their knowledge through the pipeline is [#134][134].

What a conversion into a function checks is two things, neither a range
on forward calls: the inverse's conditions, its own domain, which
restrict the `have`s a conversion into the function accepts (worth
writing where the inverse's body would otherwise fail less clearly:
`~neper(y) | y > 0 = ln(y)` refuses `-1` into `neper` by naming `y > 0`,
where without the condition `ln` would refuse it by its own domain); and
the function's own conditions, checked on the recovered argument, an
undecided one being assumed and warned of as at a call. So `-5 K` into
`tempC` is refused, the reading it would need, `-278.15`, lying below
`-273.15`, with or without a condition on `~tempC`.

## Calls

A call is a name immediately followed by `(`, zero or more expressions
separated by commas, and `)`, with no space between the name and the
parenthesis; it is an atom like a name, so `2 tempC(100)`, `tempC(100)^2`
and `-tempC(100)` mean what they look like. A call is decided by the
text alone: the parser cannot ask the table whether `kg` is a function,
since parsing never touches the table, and the rule is lexical, no space
before `(` a call and a space a product. `kg (m/s)` is a product, and
`kg(m/s)` a call of `kg`, which is not a function, and the error says so
and shows the product with the space: `"kg" is a unit, not a function.
For a product, write "kg (m/s)", with a space.` A name that is nothing,
`foo(2)`, is `Unknown function "foo".` A bare function name in an
expression is not a unit: `tempC` alone, or `2 tempC`, is
`functionAsUnit`, whose message shows the call form.

A call of a defined function evaluates in these steps, and the first
failure ends it:

1. The name resolves among the functions and the built-ins; a name that
   is neither is `notAFunction`.
2. The call must give as many arguments as the function has parameters
   (`arityOf` in `table.ts`); another count is `arityMismatch`, checked
   before any argument is evaluated.
3. The arguments are evaluated, left to right, each once: a call is by
   value.
4. Each argument must conform to its parameter's annotation, or be a
   plain number without one; a failure is `argumentMismatch`, carrying
   the parameter and the count, so that the message names the parameter
   only where there is more than one.
5. The conditions are checked; a certain failure is `conditionFailed`,
   and a condition not decided is assumed to hold, the assumption
   travelling with the result.
6. The body is evaluated with each parameter bound to its argument
   (`evaluateBound`), through the table's lookup, the bound parameters
   resolved before any unit or prefix. Its failures carry spans into the
   definitions text, so they come back as `callFailed`, naming the
   function and carrying the body's error; an `unresolved` inside the
   body, at any depth, is still retried; under an assumption, a failure
   of the body is an `undecidedCondition` instead. Only the evaluator's
   own failures are wrapped so: the lookup's failures are boxed on the
   way in and unboxed on the way out, so that the body's own failures
   can be told from the lookup's without the evaluator knowing the
   lookup's error type, and a lookup failure inside a body, which a
   table that built cannot produce, comes back as any lookup failure
   does.

The result is a quantity like any other. Its dimension is not checked at
the call, the build having checked or inferred it once. In decimal mode
each step of the body is one rounded step, as the same text typed inline
would be ([numbers.md](numbers.md), "Decimal mode").

## A function as the want

The pipeline reads a `want` of one bare name specially: a name that is a
list means the list, a name that is a function comes next, and only then
is the name read as a unit. For a function:

1. The function must have an inverse; one without is `noInverse` on the
   want side, whose message says so and names the form that would give it
   one: `"normcdf" has no inverse, so it cannot be the unit to convert
to. Define ~normcdf(y) = … to give it one.`
2. The `have` must conform to the function's result dimension; a failure
   is the ordinary mismatch of the pair.
3. The `have` is checked against the inverse's conditions, as an argument
   is at a call, an undecided one being assumed and warned of
   (`wantConditionFailed`, of the inverse).
4. The inverse's body is evaluated with its parameter bound to the
   `have` (`invertFunction`), giving the recovered argument; a failure is
   `inverseFailed`, carrying the body's error.
5. The recovered argument is checked against the function's conditions,
   in the same way (`wantConditionFailed`, of the function).
6. The function is applied to the recovered argument, at the same
   working context, and a value certainly other than the `have` (two
   exact values compared exactly, otherwise a difference wholly on one
   side of zero) is `inverseMismatch`, on the want side, as is a failure
   of the function's body there.

Step 6 checks the one part of a definition the build cannot: that an
inverse inverts. It refutes and does not prove: if the function's value
over the recovered argument's ball is disjoint from the `have`, no point
of that ball gives the `have`, and the answer is certainly wrong; an
overlap proves nothing, but overlap is what balls can decide, and
equality is not. So every answer shown has passed the check at the
precision it is shown at, an inverse wrong elsewhere is caught when a
conversion reaches the values where it is wrong, and an inverse wrong by
less than the answer's own uncertainty passes, its error below the
digits shown. The cost is one evaluation of the function per pass of a
conversion into it, at most about twice the conversion, since the want
is the only use an inverse has. The alternatives, trusting the inverse
(a confident `=` for a wrong one), checking it once lazily (says little
about the next value) and sampling it at build time (heuristic, meets
domain errors at its samples, and costs load time at the ceiling), were
set aside. Applying and inverting are one operation, a body evaluated
under a binding, which `applyFunction` and `invertFunction` share.

The conversion (`Conversion`'s `function` kind) carries the `have`, the
want's text, the recovered argument, the parameter's annotation with its
text, and the argument as a count of that unit, so that the UI does no
arithmetic; a count refused as a ratio may be (a quotient past the
exponent bound) is the conversion's refusal. A function's name is not a
unit anywhere else: in a unit list (`tempC;degC`) it is an unknown unit,
as a list's name is. A `want` that is a call, `tempC(100)`, is not
special: it is an expression, and the conversion is the ratio, with a
reciprocal.

## Display

A function conversion is one line, `have = name(argument)`. The argument
is written as a count of its parameter's annotation, followed by the
annotation's text by the rule a `want`'s text follows, and by nothing
when the annotation is `1` or absent:

```
tempF(212) = tempC(100)
300 K = tempF(80.33)
2 ft = dozen(2 in)
```

The relation is `=` when the count shows exactly at the display digits,
as for any value, and a ratio is written bare inside the call
([notation.md](notation.md)). There is no reciprocal line, since a
function conversion is not a ratio. A call as the `have` with a blank
`want` shows its value in the primitives, `tempC(100) = 373.15 K`, and
with a unit `want` is a ratio and gets its reciprocal. Whatever the
output mode, an assumed condition adds its warning beside the value.

## Build-time checks

Functions join the walk as nodes, so that a unit may be defined by a call
(`boiling  tempC(100)`), a body may call another function, and a cycle
through a function is reported like any other. Checking a function
means:

1. Evaluating its annotations among the units; each must be nonzero,
   since an argument is written as a count of the parameter's.
2. Taking the body's dimension by `dimensionOf` (`dimension-of.ts`, the
   evaluator's rules over dimensions alone: a number is dimensionless, a
   unit is its dimension through the walk's lookup, a sum checks
   conformance, a product combines, a power raises, a call applies the
   callee's rule), with each parameter bound to its annotation's
   dimension (plain without one), through the walk's own lookup, so that
   a name that means nothing, a sum whose operands do not conform, or a
   call of the wrong count or dimension is an ordinary build error with
   its span in the definitions text; that dimension is the function's
   result, exact because a body's dimension cannot vary with the value
   of its argument. Each condition's terms are taken the same way.
3. Checking the result against its annotation, when there is one; a
   failure is `functionMismatch`, naming the result.

An inverse is keyed by its function's name apart from every namespace,
and nothing can refer to it, so, like a list, it stays out of the walk
and is checked in its place in the definitions' order, requesting its
function from the top of the walker, which can never close a cycle; so
an inverse may call its own function, in its body or in a condition.
Checking it means finding its function (a build error when there is
none, or when the function has several parameters), taking its
conditions' and its body's dimensions with its parameter bound to the
function's result dimension, and checking the body against what the
function's parameter takes (`functionMismatch`, naming the inverse). The
checked inverses are attached to their functions at the end of the
build.

The bodies are not evaluated at build time at all: a body that fails at
some value, or at every value, builds and fails at the call that reaches
it, since `ln(x - 1)`, `asin(x + 1)` and `1 / ln(x)` fail at some value
and are fine functions. (The first version of the check evaluated each
body at one of the declared unit, which the elementary functions made
untenable.) A literal in a body is not checked against the significand
limit either, so a body of `1e30000` builds and fails at the call; a `^`
exponent is (`reduceExponent`), since its reduction is what the limit
bounds and the build's context supplies it. The table holds each
function as its body, still an
expression, with its parameters in order, each with the unit it takes and
its text, its result's dimension, its conditions with the parameters each
mentions, and its inverse when one is defined (`UnitFunction` in
`table.ts`); a call evaluates the body afresh through the table's lookup.

## Precision, the radius and cost

A user function's value is its body's value as an expression, and the
machinery that certifies an expression certifies it. The arguments are
evaluated once, to balls; the body is evaluated with the parameters
bound to those balls, and every operation in it is one that already
exists on balls, settled at each node as anywhere else. Each pass of the
retry loop evaluates the whole expression again, bodies included, so a
cancellation inside a body is paid for by the next pass's digits, as one
typed inline is: `em(x) = (exp(x) - 1) / x` gives `≈ 1` at `1e-30`, and
its author wrote nothing about precision. Cycles are build errors, so
evaluation terminates. A user can write no primitive, no series and no
loop, only compositions of operations that already carry honest radii,
so the radius needs nothing new. The caveats:

- **A parameter used twice is two occurrences of one ball,** treated as
  independent, the dependency problem of interval arithmetic: `x - x`
  and `sin(x)^2 + cos(x)^2` of an inexact argument never certify an
  exact `0` or `1`, exactly as the same text typed inline would not.
- **A hand-written equivalent of a built-in is slower, and can fail
  where the built-in does not.** A built-in is one kernel routine at the
  bits its result needs plus a guard, with its radius from one
  derivative or truncation bound over the whole ball, its exact cases
  recognized (`log(2, 8) = 3`, where `ln(8) / ln(2) ≈ 3`), and its own
  edges handled. A composition pays at every operation: each step rounds
  and adds its rounding to the radius, the radii compound, a cancellation
  in the body costs digits that only a later pass buys back (`(exp(x) -
exp(-x)) / 2` for `sinh` near zero), and an intermediate value can pass
  a bound that the result does not (`(exp(x) - exp(-x)) / (exp(x) +
exp(-x))` is refused at `x = 3e18`, where `tanh(3e18)` is `≈ 1`). The
  retry loop makes a composition's digits right all the same, at more
  passes, up to the ceiling.
- **Decimal mode rounds each step of the body** to the working digits,
  as it rounds an expression typed inline: `f(x)` is the hand
  calculator's sequence of keystrokes, not a correctly rounded `f`.
- **A written inverse is checked where it is used,** which refutes a
  wrong answer and proves nothing about other values.
- **A condition on a ball is three-valued,** and one left undecided is
  assumed and warned of.
- **There is no inversion without a written inverse.** Certifying a root
  of a composition needs monotonicity, or an enclosure of the derivative
  over the bracket, which the evaluator has neither of; that is the one
  place user functions would make the radius hard, and the optional
  inverse stays clear of it.
- **Calls are not memoized.** A body that calls a function twice
  evaluates it twice, so nesting such calls `k` levels deep evaluates the
  innermost `2^k` times, at every pass of the retry loop. That is what
  the same expression written out in full costs, so it is no new limit,
  and the ceiling bounds it as it bounds any expression; but a
  definition that reads small can be large.

The build of a file of functions scales as the build of units does: the
benchmark builds 500 and 2,000 functions, each calling an earlier one and
each with an inverse, and the cost grows about fourfold; a seeded
property test draws hundreds of function and inverse lines, with zero to
three parameters and up to two conditions, and injects each rejected
piece where it should be rejected.

## Where it lives

- `definitions.ts`: the head's parser, the annotation's grammar, the `~`
  line, the conditions, the parse errors (`annotationScale`,
  `annotationNotUnits`, `inverseAnnotation`, `parameterNamesUnit`,
  `duplicateParameter`, `mixedComparison`, `unsupported` for `name[`), the
  `function` and `inverse` definitions.
- `table.ts`: `UnitFunction`, `arityOf`.
- `dimension-of.ts`: the dimension check, binding parameters by position.
- `evaluate.ts`: the call's steps, `applyFunction` and `invertFunction`,
  `checkConditions` and `decide`, the collector of assumptions.
- `ball.ts`: `orderOf`.
- `build.ts`: the checks above, `orphanInverse`, `inverseArity`,
  `functionMismatch`, `zeroDeclaredUnit`, `nonconformingComparison`,
  `conditionWithoutParameter`, the build's `undecidedCondition`.
- `pipeline.ts`: the want's steps, and assumptions carried to the result
  and treated as uncertified by the retry loop.
- `messages.ts`: `noInverse`, `inverseMismatch`, `inverseFailed`,
  `conditionFailed`, `undecidedCondition`, `wantConditionFailed`,
  `functionAsUnit`, `notAFunction`, the warning of an assumed condition.
- `outcome.ts` and `unit-converter.ts`: the warning's line and its style.
- `units.txt`: the five functions, with conditions on `tempC` and
  `tempF`.

## Not in this design

- **Inverse calls in expressions,** `~tempC(373.15 K)`. The `~` line
  makes this the call of a name that already exists, a change to the
  call's grammar and its lookup; `~tempF(T)` would then recover a
  Fahrenheit reading in a body. The check of an inverse at every use
  would be reconsidered with that use's costs.
- **Disjunctions and `!=` in conditions**, and **an assertion on a
  result's value** ("Conditions" says why; ranges that narrow balls are
  [#134][134]).
- **Optional parameters** and defaults.
- **Built-ins defined in the file**: a built-in is code, and its name is
  a duplicate of any definition.
- **Affine units** (an offset on `Quantity` needs a rule in every
  operation), **a bare number as a want's answer** (`tempF(212) = 100`
  does not say what `100` is and cannot be typed back), **a display name
  on the function** (`100 °C` cannot be typed back), and **calls decided
  by the table** (the parser does not consult it).

## Deferred

Each has an issue of its own:

- **The result annotation as the default `want` of a bare call**
  ([#130][130]): when the `have` is one call of a function with an
  annotated result and the `want` is blank, the value could be shown in
  the annotated unit (`lb/ft^2`, `percent`), a change of the display
  alone; `2 bmi(…)` would show the primitives again. Scaled results and
  lists in the result's annotation are its use cases.
- **The shadowing error as a warning** ([#131][131]), once there is
  somewhere to show one.
- **Definitions typed into the converter** ([#132][132]): `f(x) = …` in
  the `have` field is unambiguous, since `=` is in no expression.
- **Dimension-generic functions** ([#133][133]). The intended design: a
  function declares dimension variables in brackets after its name and
  uses them in its annotations to take arguments of any dimension and to
  tie the dimensions of its parameters and its result together,
  `hypot[D](a: D, b: D) = sqrt(a^2 + b^2)`, `rate[Q](amount: Q, time:
s): Q / s = amount / time`, `rms[D](x: D^2) = sqrt(x)`. A variable
  appears only in its head's annotations, as a factor of a unit
  expression, and within the head comes before a unit of its name; a
  parameter's annotation may mention one variable at most, and left to
  right the first parameter that mentions a variable binds it, by solving
  its annotation for it (a dimension's exponents are rationals, so `x:
D^2` always solves), every later mention being a check. A variable that
  no parameter mentions is an error, as is one named like a parameter,
  and the result's annotation can only check one; a variable comes
  before a unit of its name because it is declared there and deliberate,
  so a unit added later cannot break the function. At build time each
  variable is a fresh stand-in primitive, which no unit can equal, and
  `dimensionOf` checks the body in full (`D + D` holds, `D + D^2`,
  `exp(x)` and `sin(x)` fail), which is sound since substituting a
  dimension for a primitive keeps every conformance; the result's
  dimension comes out in the variables and is filled in at the call. A
  call can then fail only on its arguments, against the annotations
  (`hypot(1 m, 1 s)`: `b` must have `a`'s dimension, `m`, but has `s`),
  or on a value, as for any function. Conditions relate generic
  parameters to one another as they are; a
  comparison with a constant needs one of dimension `D`, which only zero
  could be, and whether a literal `0` stands for zero in any dimension
  is for the issue. No inverse, since a recovered argument with no unit
  has nothing to be written in. Type bounds on a variable, in the manner
  of the constraints of ad-hoc polymorphism (a length or a time,
  dimensionless or an angle, a dimension of a given kind), and a body
  chosen by the dimension a variable binds, would go in the same
  brackets. A mark on each parameter (`x: *`) can neither tie two
  parameters together nor carry a bound, and a sigil on undeclared
  variables (`x: 'D`) is what a phone's smart punctuation turns into
  `’D`. The parser reserves `name[` for this.

## Alternatives considered

- **The syntax.** The first form, `tempC(x) [1;K] x K + 273.15 K ;
tempC / K - 273.15`, declared the units of the argument and the result
  in brackets, both required, with the inverse after a `;` in which the
  function's own name stood for its value, and took one argument.
  Extending it in place (`kinetic(mass, v) [kg, m/s; J] …`) matches
  annotations to parameters by position, all or nothing, and has no home
  for bounds; annotated signatures with the inverse after a `;` keep the
  first form's use of the function's own name for its value and crowd
  the line; GNU units' keyword clauses (`units=[…] domain=[…]`) lengthen
  every line and grow the ways to get one wrong; a multi-line block makes
  the file indentation-sensitive for one kind of definition. The inverse
  on its own line makes "optional" literal: a function has no inverse
  slot to leave empty, and adding an inverse adds a line.
- **Bounds written in the parameter list.** Comparisons around the
  parameter (`f(0 K <= x: K <= 100 K)`) wedge the annotation between the
  bounds, so that `K <= 100 K` reads as a comparison of its own, and
  leave no place for a condition relating parameters; interval notation
  after the parameter (`f(x: K [0 K, 100 K))`) puts a half-open `)`
  inside the head's own parentheses and makes an open side easy to miss;
  a lower bound always on the left (`f(0 < x)`) gives one spelling per
  bound but refuses the `x > 0` everyone writes. The `|` clause keeps the
  parameter list clean, reads the same in every case, and takes
  relations between parameters with no new syntax.

[130]: https://github.com/bsidhom/exucal/issues/130
[131]: https://github.com/bsidhom/exucal/issues/131
[132]: https://github.com/bsidhom/exucal/issues/132
[133]: https://github.com/bsidhom/exucal/issues/133
[134]: https://github.com/bsidhom/exucal/issues/134
