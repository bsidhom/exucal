# Functions in the definitions file

Status: the design note of stage 7 (task 7.0 of docs/calculator-plan.md),
revised from the first design for D23 and D24 and the owner's rulings on
them; not yet implemented. Until task 7.1 lands, the code reads the
bracketed form this note replaces, which "The first form" at the end
records with its implementation notes. Three choices are this note's
own, for review before 7.1: the spelling of a dimension-generic
parameter, the syntax of domain bounds, and the check of a written
inverse at the want ("Choices for review").

The goal of the first design was `tempC` and `tempF` for temperature
readings, without adding anything to the core that only temperature
needs. The goal of this revision is user-defined functions as the study
describes them (docs/calculator.md, feature 6): shorthand compositions
of the expression language and the built-ins, of several parameters,
with the units of their arguments declared where that helps and an
inverse only where one is wanted, agnostic to the precision and the
rounding in force.

## The problem

GNU units defines a nonlinear unit as a pair of expressions, the
function and its inverse, and declares the units of its argument and
its result:

```
tempC(x) units=[1;K] domain=[-273.15,) range=[0,) x K + stdtemp ; tempC + (-stdtemp)
```

The inverse serves a want: typed as the unit to convert to, the bare
name `tempC` applies it. This converter writes every answer as a
quantity, `value` beside the want, so that the line reads as the
expression it is and can be typed back as a have; an inverse yields a
plain number with no unit to write beside it.

A user function is more often a composition with no inverse worth
writing, `normcdf(x) = (1 + erf(x / sqrt(2))) / 2`, of more than one
argument, `kinetic(mass, v)`, for which GNU's required declaration and
inverse are noise.

## The design in one line

A function is a signature, `=` and a body; an inverse is a definition of
its own; and a want that names a function is answered by writing the
call that would produce the have, `tempF(212) = tempC(100)`, which needs
the inverse.

## Definitions

```
normcdf(x) = (1 + erf(x / sqrt(2))) / 2
kinetic(mass: kg, v: m/s) = mass v^2 / 2
bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
hypot(a: *, b: *) = sqrt(a^2 + b^2)

tempC(x >= -273.15) = x K + 273.15 K
~tempC(y) = y / K - 273.15

dozen(n: in) = 12 n
~dozen(len) = len / 12
```

The grammar of a function line:

```
function   := name "(" params? ")" (":" annotation)? "=" expr
inverse    := "~" name "(" (expr cmp)? name (cmp expr)? ")" "=" expr
params     := param ("," param)*
param      := (expr cmp)? name (":" (annotation | "*"))? (cmp expr)?
cmp        := "<" | "<=" | ">" | ">="          a bound, at most one per side
annotation := a unit expression (below)
```

- **The head decides the grammar,** as a trailing dash decides a
  prefix: a name directly followed by `(` makes the line a function,
  and a line whose first character is `~` an inverse. Inside the head,
  spaces are free around every token, so the head is read by a parser
  rather than the single-token regex of the first form; between the
  name and `(` there is no space, as in a call.
- **`=` ends the head.** An annotation is an expression and
  juxtaposition multiplies, so whitespace cannot end it: after `: J
mass v^2 / 2` the parser would read `J mass v^2 / 2` as one product.
  `=`, `:`, `~` and the comparisons appear nowhere in the expression
  grammar, and `*` cannot start an expression, so every decision is
  still made from the text alone, and the parser still never consults
  the table.
- **A parameter without an annotation is a plain number.** `x: kg`
  admits a mass, `x: *` any dimension ("Dimension-generic parameters"),
  and `x: 1` says explicitly what no annotation says.
- **The result's annotation is optional.** Without one, the result's
  dimension is inferred from the body by `dimensionOf`, with each
  parameter bound to its annotation's dimension; the inference is exact,
  since a body's dimension never depends on its arguments' values. With
  one, the inferred dimension is checked against it, so that `: 1`
  asserts a plain result and catches a body that is not.
- **An inverse is optional.** `~name(p) = body` defines the inverse of
  `name`, which must be defined, with exactly one parameter, which is
  not generic. The inverse's parameter has `name`'s result dimension
  and takes no annotation, since that dimension is known; its body must
  conform to `name`'s parameter. A function without an inverse cannot
  be the want ("A function as the want"). The two lines may stand
  anywhere in the file, as every definition may, and are conventionally
  adjacent; a `~` line whose function is not defined is a build error,
  and a second `~` line for one function is a duplicate.
- **Bounds are written around the parameter,** as in mathematics:
  `x >= -273.15`, `x > 0`, `-1 <= x <= 1`, `x: K >= 0 K`. "Domain
  bounds" describes them; they are task 7.4's, and the grammar reserves
  their place now so that nothing else takes it.

The five functions of units.txt are rewritten in the same commit as the
parser (task 7.1), since the bracketed form stops parsing, and convert
as before:

```
tempC(x)    = x K + 273.15 K
~tempC(y)   = y / K - 273.15
tempF(x)    = (x + 459.67) degF
~tempF(y)   = y / degF - 459.67
neper(x)    = exp(x)
~neper(y)   = ln(y)
bel(x)      = pow(10, x)
~bel(y)     = log10(y)
decibel(x)  = pow(10, x / 10)
~decibel(y) = 10 log10(y)
```

`tempC` and `tempF` gain their domain bounds with task 7.4.

A function's name lives in the unit namespace, with units and lists: a
function and a unit of one name are a duplicate, and so are a function
and a built-in. It must not read as a prefix followed by a unit, for
the reason a list's may not: typed as the want, `ms` would mean the
function, and typed as the have, milliseconds. An inverse's name is
its function's, behind the `~`, which no other name can start with.

`Definition` gains a `function` kind (the name, the parameters each
with an optional annotation and optional bounds, the optional result
annotation, the body, the span) and an `inverse` kind (the function's
name, the parameter with its optional bounds, the body, the span).

## Annotations

**An annotation checks a dimension and changes no value.** A quantity
carries no unit of its own: its magnitude is held in the primitives
(docs/calculator-plan.md, D22), so `100 lb` and `45.359237 kg` are one
value, and nothing remembers which was typed. `weight: kg` therefore
means "a mass", exactly as `weight: lb` does. An argument in any
conformable unit is accepted as it stands, by conformance, the test a
sum applies to its operands, kinds included (`x: radian` admits an
angle and not a plain number). There is no conversion step, since there
is nothing to convert: `bmi(100 lb, 4 ft)` is exactly `bmi(45.359237
kg, 1.2192 m)`.

The result has a dimension, not a unit. The want chooses the unit, as
for any value, and a blank want writes the primitives, as it always
does (`tempC(100) = 373.15 K`, `1 ft = 0.3048 m`). So for

```
bmi(weight: lb, height: ft): lb/ft^2 = weight / height^2
```

`bmi(100 lb, 4 ft)` is shown as `≈ 30.515173 kg / m^2` with a blank
want and as `= 6.25 lb/ft^2` into `lb/ft^2`. That surprises a reader
of the head, but the alternatives below are worse, and the want is
always there. Showing a lone call's value in its annotated result unit
by default is deferred, a change of the display alone ("Deferred").

**A number in a particular unit is divided out in the body.** A formula
fitted to numbers in given units, or a result that is an index on a
defined scale, divides those units out, and the division, not the
annotation, is what makes it right; writing `weight: lb` with `weight /
kg` in the body is still correct, since an annotation cannot change
what a function computes. Such a result is annotated `: 1`, so that a
division left out fails the build rather than quietly giving a
dimension:

```
bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
```

`bmi(100 lb, 4 ft)` is then `≈ 30.515173`, a number on BMI's scale
whatever the arguments were typed in, where a dimensioned BMI would
invite conversions that mean nothing (a BMI in `lb/in^2`). A physical
result keeps its dimension: `kinetic(mass: kg, v: m/s) = mass v^2 /
2` is an energy, and converts to `J`, `kcal` or `ft lbf`.

Temperature is the one case where dividing a unit out is not enough. A
formula fitted to Fahrenheit readings needs the reading, `T / degF -
459.67`, since `T / degF` alone counts Fahrenheit degrees from absolute
zero; `~tempF(T)` will say the same once an inverse can be called in an
expression ("Not in this design").

**An annotation is a unit expression.** It is the expression grammar
restricted to unit names, juxtaposition, `*`, `/`, `^` with its literal
exponent, parentheses, and the number `1`, written `1`: `kg`, `m/s`,
`kg m^2 / s^2`, `1 / s`, `1`. Any other number, a sum or difference, a
negation and a call are rejected where they are written, with a message
that says why:

```
f(x: 2) = …       An annotation names units and cannot scale. Write a scale in the body; for a plain number, write 1.
f(x: 1000 m) = …  (the same)
f(x): kg/2 = …    (the same)
```

Conformance ignores magnitude, so `: 2` could only be read two ways,
and both bite: as `: 1`, which is a lie to the reader who expects a
scale, or as a scale, which breaks the rule that an annotation changes
no value. The `1` is kept because a plain result needs a spelling and
`1 / s` needs a numerator. A unit name is accepted whatever its
magnitude, `percent` and `dozen` included: `: percent` asserts a plain
number and multiplies by nothing, as `: lb` asserts a mass and converts
nothing, and the rule that an annotation changes no value covers both.
A scale in the result's annotation, and a list there (`: ft;in`), are
use cases for the deferred default want, and the restriction can be
relaxed when that design takes them up.

An annotation's unit matters beyond its dimension in one place only: a
recovered argument is written as a count of it ("Display"), so
`2 ft` into `dozen` is `dozen(2 in)`. An annotation must be nonzero, as
a declared unit had to be, since a count of zero means nothing; with
the restriction above, that can fail only for a unit defined as zero.

## Names and shadowing

Annotations and bounds are evaluated among the units alone; the body
resolves a parameter before any unit, by its exact name. So a name
resolves one way wherever it stands: in `kinetic(mass: kg, v: m/s)`, `m`
in the annotation is the metre whatever the parameters are called, and
in a body whose parameter is `m`, `m` is the parameter and `km` is
still the kilometre, since a prefixed name is looked up among the
units. An annotation cannot name a parameter, so it cannot say that one
parameter has the unit of another; that needs a notation for shared
dimensions, which is not in this design.

Shadowing a unit is allowed and silent. `t`, `s`, `m`, `c`, `g`, `h` and
`T` are units, and the list grows; forbidding them as parameters would
take the short names formulas use (`tcdf(t, nu)`), and would let a unit
added to the system file break a user's function that loaded before.
Under the rule below, a unit added later never breaks a function: an
annotation could only have named it if it already existed.

Two cases are errors, each found from the definition's text alone, and
reported when the definitions are parsed:

- **A duplicate parameter**, `f(x, x)`, at its second occurrence: no
  rule could say which one the body means.
- **A parameter named like a unit that the same head uses,**
  `kinetic(m: kg, v: m/s) = m v^2 / 2`, where the head's `m` is the
  metre and the body's is the mass. The name resolves one way in each
  place, but the line reads both ways. The message names the parameter
  and the annotation, and suggests renaming the parameter.

The second error is meant to become a warning once user definitions
have an editor and the build has a way to report warnings; there is
nowhere to show one today, and relaxing an error later breaks no file,
where tightening a silence would. "Deferred" lists it.

## Dimension-generic parameters

A parameter annotated `*` takes an argument of any dimension:

```
hypot(a: *, b: *) = sqrt(a^2 + b^2)
mean(a: *, b: *) = (a + b) / 2
```

`*` cannot start an expression, so after a `:` it is unambiguous, and it
is not a name, which matters since an annotation is evaluated among the
units, which may grow (`any` could become a unit). A generic function's
body has no dimension until it is called, so it is checked in two parts:

- **At build time**, what does not depend on dimensions: the names in
  the body resolve, and the calls in it have the right counts of
  arguments. A result annotation is evaluated, as any annotation is.
- **At the call**, before anything is evaluated, `dimensionOf` runs on
  the body with each generic parameter bound to its argument's
  dimension and each annotated one to its annotation's. A failure is
  an error on the arguments, `genericMismatch`, carrying the failure
  inside the body (`hypot(1 m, 1 s)`: the sum in `hypot`'s body needs
  `a^2` and `b^2` of one dimension, and they are `m^2` and `s^2`); a
  result annotation is checked against the dimension found. So a call
  can still fail only on its arguments or on a value.

A generic function has no inverse: a recovered argument with no unit
has nothing to be written in, so a `~` line for one is a build error.
Nor does a generic parameter take bounds in this design, since a bound
must conform to the parameter. Mixing generic and annotated parameters
is allowed: `scale(x: *, k) = k x`.

## Domain bounds

A parameter may carry a bound on each side, written as a comparison
with the parameter, as in mathematics; each comparison bounds it from
one side, whichever way round it is written, and a second bound on the
same side is a parse error:

```
tempC(x >= -273.15) = x K + 273.15 K
ln1p(x > -1) = ln(1 + x)
asinish(-1 <= x <= 1) = asin(x) / radian
absolute(x: K >= 0 K) = x
```

A bound is an expression evaluated among the units, as an annotation
is, so it cannot name a parameter, and it must conform to the
parameter's annotation (to a plain number without one), which the
build checks; two exact bounds that admit nothing are a build error.
A bound may be inexact (`x < pi() / 2`). `<` and `>` exclude the
bound and `<=` and `>=` include it, which decides the exact boundary
case: `ln1p(-1)` is outside, `tempC(-273.15)` inside.

A bound is checked at the call, after the argument's conformance and
before the body, on the argument's ball, and the check is
three-valued: inside, outside, or not decided, when the ball straddles
the bound. Outside is an error at the call, `outOfDomain`, naming the
function, the parameter and the bound (`tempC(-300)`: the argument must
be at least -273.15). Not decided is `unresolved`, which the retry loop
retries at more digits; an inexact argument exactly at a bound,
`tempC(approx(-273.15))`, stays unresolved to the ceiling, as `floor`
does at a cell's edge.

The range of a function needs no syntax: it is the domain of its
inverse, written on the `~` line's parameter (`~tempC(y >= 0 K)`), and
checked at the want as a domain is at a call. At the want, the
recovered argument is checked against the function's own bounds too, so
that `-5 K` into `tempC` is refused, the reading it would need,
`-278.15`, lying below `-273.15`, with or without a bound on `~tempC`.

## Calls in expressions

A call is a name immediately followed by `(`, zero or more expressions
separated by commas, and `)`, with no space between the name and the
parenthesis; it is an atom like a name, so `2 tempC(100)`,
`tempC(100)^2` and `-tempC(100)` mean what they look like, and each
argument is any expression.

**Decision (first design, kept): a call is decided by the text alone.**
The parser cannot ask the table whether `kg` is a function, since
parsing never touches the table. The rule is lexical: no space before
`(` is a call, a space is a product. `kg (m/s)` is a product, and
`kg(m/s)` a call of `kg`, which is not a function, and the error says
so and shows the product with the space:

```
kg(m/s)       "kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.
foo(2)        Unknown function "foo".
```

A call of a defined function evaluates in these steps, and the first
failure ends it:

1. The name resolves among the functions and the built-ins; a name that
   is neither is `notAFunction`.
2. The call must give as many arguments as the function has
   parameters; another count is `arityMismatch`, checked before any
   argument is evaluated.
3. The arguments are evaluated, left to right, each once (a call is by
   value).
4. Each argument must conform to its parameter's annotation, or be a
   plain number without one; a failure is `argumentMismatch`, naming
   the argument. If any parameter is generic, the body's dimension is
   then taken with the arguments' dimensions, and a failure is
   `genericMismatch`.
5. Each argument is checked against its parameter's bounds; outside is
   `outOfDomain`, not decided is `unresolved`.
6. The body is evaluated with each parameter bound to its argument. Its
   failures carry spans into the definitions text, so they come back as
   `callFailed`, naming the function and carrying the body's error; an
   `unresolved` inside the body, at any depth, is still retried.

The result is a quantity like any other. Its dimension is not checked
at the call, the build having checked or inferred it once, except for a
generic function's annotated result, checked at step 4.

A bare function name in an expression is not a unit: `tempC` alone, or
`2 tempC`, is `functionAsUnit`, whose message shows the call form.

## A function as the want

The pipeline reads a want of one bare name specially when the name is a
unit list; a name that is a function comes next, before the name is
read as a unit:

1. The function must have an inverse; one without is `noInverse` on the
   want side, whose message says so and names the form that would give
   it one: `"normcdf" has no inverse, so it cannot be the unit to
convert to. Define ~normcdf(y) = … to give it one.`
2. The have must conform to the function's result dimension; a failure
   is the ordinary mismatch of the pair, so the existing wording holds.
3. The have is checked against the inverse's bounds, as an argument is
   at a call.
4. The inverse's body is evaluated with its parameter bound to the
   have, giving the recovered argument; a failure is `inverseFailed`,
   carrying the body's error.
5. The recovered argument is checked against the function's bounds.
6. If the check of "Choices for review" is adopted, the function is
   applied to the recovered argument, and a value disjoint from the
   have is `inverseMismatch`.

`Conversion` keeps its `function` kind: the have, the want's text, the
recovered argument, the parameter's annotation with its text, and the
argument as a count of it. A function's name is not a unit anywhere
else: in a unit list (`tempC;degC`) it is an unknown unit, as a list's
name is. A want that is a call, `tempC(100)`, is not special: it is an
expression, and the conversion is the ratio, with a reciprocal.

## Display

A function conversion is one line, `have = name(argument)`. The
argument is written as a count of its parameter's annotation, followed
by the annotation's text by the rule a want's text follows, and by
nothing when the annotation is `1` or absent:

```
tempF(212) = tempC(100)
300 K = tempF(80.33)
2 ft = dozen(2 in)
```

The relation is `=` when the count shows exactly at the display
precision, as for any value. There is no reciprocal line, since a
function conversion is not a ratio. A call as the have with a blank
want shows its value in the primitives, `tempC(100) = 373.15 K`, and
with a unit want is a ratio and gets its reciprocal.

## Build-time checks

Functions and inverses join the walk as nodes, so that a unit may be
defined by a call (`boiling  tempC(100)`), a body may call another
function, an inverse may call its own function, and a cycle through a
function is reported like any other. Checking a function means:

1. Evaluating its annotations and bounds among the units; each
   annotation must be nonzero, each bound must conform to its
   parameter, and two exact bounds must admit something.
2. For a function with no generic parameter, taking the body's
   dimension by `dimensionOf`, with each parameter bound to its
   annotation's dimension (plain without one), through the walk's own
   lookup, so that a name that means nothing, a sum whose operands do
   not conform, or a call of the wrong count or dimension is an
   ordinary build error with its span in the definitions text; that
   dimension is the function's result. For a generic function, checking
   the names and the counts of the calls only.
3. Checking the result against its annotation, when there is one; a
   failure is `functionMismatch`, naming the result.

Checking an inverse means finding its function (a build error when
there is none, or when the function has several parameters or a generic
one), evaluating its bounds against the function's result dimension,
taking its body's dimension with its parameter bound to that dimension,
and checking the body against the function's parameter
(`functionMismatch`, naming the inverse).

The bodies are not evaluated at build time at all: a body that fails at
some value, or at every value, builds and fails at the call that
reaches it, since `ln(x - 1)`, `asin(x + 1)` and `1 / ln(x)` fail at
some value and are fine functions. The table holds each body as an
expression, and a call evaluates it afresh through the table's lookup.

## Precision and the radius

A user function's value is its body's value as an expression, and the
machinery that certifies an expression certifies it (D24). The
arguments are evaluated once, to balls; the body is evaluated with the
parameters bound to those balls, and every operation in it is one that
already exists on balls, settled at each node as anywhere else. Each
pass of the retry loop evaluates the whole expression again, bodies
included, so a cancellation inside a body is paid for by the next
pass's digits, as one typed inline is: `(exp(x) - 1) / x` is correct at
`x = 1e-30`, and its author wrote nothing about precision. Cycles are
build errors, so evaluation terminates, and the build's check evaluates
nothing. A user can write no primitive, no series and no loop, only
compositions of operations that already carry honest radii, so the
radius needs nothing new. The caveats:

- **A parameter used twice is two occurrences of one ball,** treated as
  independent, the dependency problem of interval arithmetic: `x - x`
  and `sin(x)^2 + cos(x)^2` of an inexact argument never certify an
  exact `0` or `1`, exactly as the same text typed inline would not.
- **A hand-written equivalent of a built-in is slower, and can fail
  where the built-in does not.** A built-in is one kernel routine at the
  bits its result needs plus a guard, with its radius from one
  derivative or truncation bound over the whole ball, its exact cases
  recognized (`log(2, 8) = 3`, where `ln(8) / ln(2) ≈ 3`), and its own
  edges handled. A composition pays at every operation: each step
  rounds and adds its rounding to the radius, the radii compound, a
  cancellation in the body costs digits that only a later pass buys
  back (`(exp(x) - exp(-x)) / 2` for `sinh` near zero), and an
  intermediate value can pass a bound that the result does not
  (`(exp(x) - exp(-x)) / (exp(x) + exp(-x))` is refused at `x = 3e18`,
  where `tanh(3e18)` is `≈ 1`). The retry loop makes a composition's
  digits right all the same, at more passes, up to the ceiling.
- **Decimal mode rounds each step of the body to Digits,** as it rounds
  an expression typed inline: `f(x)` is the hand calculator's sequence
  of keystrokes, not a correctly rounded `f`.
- **A written inverse is trusted.** The build checks its dimensions, not
  that it inverts; "Choices for review" proposes a check at the want.
- **A bound on a ball is three-valued,** as "Domain bounds" says.
- **There is no inversion without a written inverse.** Certifying a
  root of a composition needs monotonicity, or an enclosure of the
  derivative over the bracket, which the evaluator has neither of;
  that is the one place user functions would make the radius hard, and
  the optional inverse stays clear of it.

## Cost

Calls are not memoized: a body that calls a function twice evaluates it
twice, so nesting such calls `k` levels deep evaluates the innermost
`2^k` times, at every pass of the retry loop. That is what the same
expression written out in full costs, so it is no new limit, and the
ceiling bounds it as it bounds any expression; but a definition that
reads small can be large, and README ("Functions") and ARCHITECTURE.md
("Functions") say so (task 7.5).

## Where it goes

- `src/core/definitions.ts`: the head's parser in place of its regex,
  the annotation's grammar, the bounds, the `~` line, the two parse
  errors of "Names and shadowing", the `function` and `inverse`
  definitions; the bracketed grammar removed (7.1, with bounds in 7.4).
- `src/core/table.ts`: `UnitFunction` with its parameters, its result
  dimension, its body and an optional inverse.
- `src/core/dimension-of.ts`: the call case binds parameters by
  position and takes a defined function's arity from it; generic
  functions at the call (7.3).
- `src/core/evaluate.ts`: binding several names; the call's steps
  above; `invertFunction` through the inverse's own parameter.
- `src/core/build.ts`: the checks above.
- `src/core/pipeline.ts`: the want's steps above.
- `src/messages.ts`: `noInverse`, `genericMismatch`, `outOfDomain`, the
  parse errors, and `inverseMismatch` if adopted.
- `src/units.txt`: the five functions rewritten (7.1), with bounds on
  `tempC` and `tempF` (7.4).
- Tests: each module's own; `units.test.ts` keeps its conversions.

## Choices for review

This note makes three choices that the owner's rulings did not, for
review before 7.1:

- **`*` for a dimension-generic parameter,** since it cannot start an
  expression and is not a name; `?` would do as well.
- **Bounds as comparisons around the parameter,** chosen over GNU's
  interval notation (`domain=[-273.15,)`), whose half-open `)` inside
  the head's parentheses reads badly, and over a keyword such as `in`,
  which is the inch.
- **A check of a written inverse at the want:** apply the function to
  the recovered argument and refuse the conversion when the value is
  disjoint from the have. Overlap is what balls can decide, so the
  check refuses only an inverse that is certainly wrong at that value,
  at the cost of one forward evaluation per conversion into a function.
  The recommendation is to adopt it in 7.1: an inverse is the one part
  of a definition the build cannot check, and a wrong one otherwise
  gives a confident `=`.

## Not in this design

- **Inverse calls in expressions,** `~tempC(373.15 K)`. The `~` line
  makes this the call of a name that already exists, a change to the
  call's grammar and its lookup.
- **Bounds on generic parameters,** and comparisons with zero in any
  dimension (`x: * > 0`).
- **Shared dimensions** between parameters (`a` and `b` of one
  dimension, whatever it is), which an annotation cannot say, since it
  cannot name a parameter.
- **Optional parameters** and defaults.
- **Built-ins defined in the file**: a built-in is code, and its name is
  a duplicate of any definition.

## Deferred

Each of these has, or is to have, an issue of its own
(docs/calculator-plan.md, "Deferred from stage 7"):

- **The result annotation as the default want of a bare call.** When the
  have is one call of a function with an annotated result and the want
  is blank, the value could be shown in the annotated unit (`lb/ft^2`,
  `percent`). Scaled results and lists in that position are its use
  cases, and the restriction on annotations can be relaxed for them
  then.
- **The shadowing error as a warning,** once there is somewhere to show
  one.
- **Definitions typed into the converter:** `f(x) = …` in the have field
  is unambiguous, since `=` is in no expression.

## Alternatives considered

- **The syntax (D23).** The bracketed form extended in place,
  `kinetic(mass, v) [kg, m/s; J] …`, matches annotations to parameters
  by position, all or nothing, and has no home for bounds; annotated
  signatures with the inverse after a `;` keep the first form's use of
  the function's own name for its value and crowd the line; GNU's
  keyword clauses lengthen every line and grow the ways to get one
  wrong; a multi-line block makes the file indentation-sensitive for
  one kind of definition.
- **A parameter bound to its number in the annotated unit,** as GNU's
  `units=` reads (`w: kg` making `w` the number `w / kg`). It matches
  how empirical formulas are printed, but changing `kg` to `lb` would
  silently change the function, and the body would lose its dimension
  checks; `w / kg` in the body is explicit and survives either
  annotation.
- **An argument required in exactly the annotated unit:** a value does
  not remember the unit it was typed in, so this cannot be checked, and
  would not be wanted.
- **A result unit implied by the parameters' units** (`min` and `mi`
  giving `min/mi`): a dimension can be written over the parameters'
  units in several ways or none, and constants such as the `/ 2` of
  kinetic energy get in the way. The result's own annotation, should
  the deferred default want be taken up, says it directly.
- **A number in an annotation read as `1`, or as a scale:** the first is
  a lie and the second breaks the rule that an annotation changes no
  value ("Annotations").
- **Forbidding every parameter named like a unit,** or marking
  parameters with a sigil (`$t`): the first takes the short names and
  lets a new unit break an old function, the second reads unlike
  mathematics.
- **Affine units, a bare number as a want's answer, a display name on
  the function, and calls decided by the table** were weighed by the
  first design and set aside for the reasons it gave: an offset on
  `Quantity` needs a rule in every operation; `tempF(212) = 100` does
  not say what `100` is and cannot be typed back; `100 °C` cannot be
  typed back; and the parser does not consult the table.

## The first form

Until 7.1, the code reads the bracketed form of the first design:

```
tempC(x)  [1;K]  x K + 273.15 K       ; tempC / K - 273.15
```

the declared units of the argument and the result in brackets, both
required, the forward body, `;`, and the inverse body, in which the
function's own name stands for its value. A function took one argument.
Its implementation departed from the first design in these ways, which
the revision keeps unless it says otherwise:

- **Declared units are nonzero** (`zeroDeclaredUnit`), since a recovered
  argument is written as a count of the declared argument unit; the
  result unit was held to the same rule for symmetry. The revision keeps
  the rule for every annotation.
- **The prefixed-name check is one error for lists and functions**,
  `prefixedName`.
- **A function used as a unit is its own error**, `functionAsUnit`,
  beside `unknownUnit`.
- **`callFailed` carries the body's own error only.** The evaluator is
  generic in the lookup's error type, so a body is evaluated through a
  lookup whose failures are boxed, the evaluator's own failures are
  wrapped in `callFailed`, and a lookup failure inside a body, which a
  built table cannot produce, is passed up unchanged; `applyFunction`
  and `invertFunction` return the two apart (`BodyError`).
- **`Lookup` is an object** with `unit` and `function` resolvers, and
  the function resolver is given the span of the whole call as well as
  the name's.
- **The `function` conversion carries the count** of the declared unit,
  so that the UI does no arithmetic.
- **The build's check takes dimensions without evaluating** (stage 3 of
  docs/calculator-plan.md): the first version evaluated each body at
  one of the declared unit, which `ln(x - 1)` and its like made
  untenable.
