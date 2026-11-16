# Defined functions

A **defined function** is a function that the definitions file defines,
as a head, `=` and a body. An inverse is a definition of its own, on a
line that starts with `~`. A want that names a function is answered with
the call that produces the have, as `tempF(212)` into `tempC` is
`= tempC(100)`, and that conversion needs the inverse.
[Functions](../docs/definitions.md#functions) and
[Inverses](../docs/definitions.md#inverses) in the user docs state how
each is written and what a call does, and
[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states what the conversion answers with. The mechanism is described
here, with each design decision, its reasons and the alternatives ruled
out.

Functions serve two purposes:

- A reading such as a temperature is not a multiple of a unit. A
  function computes it, so `Quantity` needs no offset
  ([Alternatives considered](#alternatives-considered)).
- A composition of the built-ins gets a name, where an author would
  otherwise type it out at every use:
  `normcdf(x) = (1 + erf(x / sqrt(2))) / 2`.

A function takes any number of parameters. It declares the units of its
arguments where that helps and an inverse only where one is wanted, and
it says nothing of the precision or the rounding in force. Functions add
nothing to quantities: a call is a quantity like any other once the body
has run, and the rest of the expression goes on as before.

These words are used in a particular sense:

- The **head** of a function's or an inverse's line is everything before
  the `=`: the name, the parameters, the result's annotation and the
  conditions.
- The **build** is the construction of the definitions table from the
  definitions, as the app starts. The user docs say that the file is
  loaded, and a build error is a fault that keeps the file from loading.
- A **plain number** is a dimensionless quantity: one with neither a
  dimension nor a kind.
- A **pass** is one evaluation at one precision. The **retry loop** runs
  passes at rising precision, up to the **ceiling**, the highest
  precision any pass computes at
  ([Passes and errors](architecture.md#passes-and-errors)).
- The **recovered argument** is the argument that an inverse gives back
  for a have.
- **The outcome** is the module that composes the output lines from a
  conversion (`src/outcome.ts`).

Every value is a `Ball`: a midpoint and a radius that bounds the error
of the midpoint. A value is exact when its radius is zero
([The types](numbers.md#the-types)).

The design rests on these decisions, each described in the section
linked:

- **The head of a line decides its grammar, from the text alone.** The
  parser never consults the table ([Definitions](#definitions)).
- **An annotation checks a dimension and changes no value.** The want
  chooses the unit a result is written in, never the head
  ([Annotations](#annotations)).
- **A parameter may shadow a unit, except a unit that its own head names.**
  A definition may not take a built-in's name
  ([Names and shadowing](#names-and-shadowing)).
- **A condition is a chain of orderings, decided on balls with three verdicts.**
  There is no equality ([Conditions](#conditions),
  [The check at a call](#the-check-at-a-call)).
- **An undecided condition is assumed to hold, and the value is shown with a warning.**
  The retry loop tries more digits first
  ([An undecided condition](#an-undecided-condition)).
- **A call is by value and evaluates its body afresh.** Each argument is
  checked as soon as it is evaluated ([Calls](#calls)).
- **A conversion into a function applies the inverse, then checks it by applying the function back.**
  The check refutes a wrong answer and proves nothing
  ([A function as the want](#a-function-as-the-want),
  [Display](#display)).
- **The build checks a function over dimensions alone and never evaluates a body**
  ([Build-time checks](#build-time-checks)).
- **A call costs its body typed out in its place.** The arithmetic needs
  nothing new for functions
  ([Precision, the radius and cost](#precision-the-radius-and-cost)).
- **Some designs are ruled out, and each alternative weighed is set aside for what it loses**
  ([Not in this design](#not-in-this-design),
  [Alternatives considered](#alternatives-considered)).

## Definitions

[Functions](../docs/definitions.md#functions) and
[Inverses](../docs/definitions.md#inverses) state how a function and an
inverse are written. These lines show the forms. Only `tempC` and its
inverse are in the predefined definitions file:

```
normcdf(x) = (1 + erf(x / sqrt(2))) / 2
kinetic(mass: kg, v: m/s) = mass v^2 / 2
bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
logit(p) | 0 < p < 1 = ln(p / (1 - p))

tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15

twelve(n: in) = 12 n
~twelve(len) = len / 12
```

The grammar of a function's line and of an inverse's line follows. The
block is maintained by hand. The whole line grammar, with every form of
definition, is the comment at the top of `src/core/definitions.ts`.

```
function   := name "(" params? ")" (":" annotation)? ("|" conditions)? "=" expr
inverse    := "~" name "(" name ")" ("|" conditions)? "=" expr
params     := param ("," param)*
param      := name (":" annotation)?
conditions := condition ("," condition)*
condition  := expr cmp expr (cmp expr)*      every cmp of one condition points one way
cmp        := "<" | "<=" | ">" | ">=" | "≤" | "≥"
annotation := a unit expression ("Annotations")
```

### The head

- **The head decides the grammar of the line.** A definition that starts
  with `~` is an inverse. A name directly followed by `(` is a function,
  with no space between the two, as in a call. A name directly followed
  by `[` is rejected (`unsupported`): the bracket is reserved for
  dimension variables, which are future work
  ([Extensions that fit](future.md#extensions-that-fit)). Inside the
  head, spaces are free around every token. So the head is read by
  parser combinators and not by a regular expression over one token.
- **`=` ends the head.** An annotation is an expression, and
  juxtaposition multiplies, so whitespace cannot end an annotation. With
  only a space between them, a result annotation `J` and a body
  `mass v^2 / 2` would read as one product. The expression grammar has
  no `=`, `:`, `~` or `|` and no comparison. So every decision is made
  from the text alone, and the parser never consults the table.
- **Conditions follow a `|`**, read "such that", after the parameters
  and the result's annotation ([Conditions](#conditions)).

### The parameters and the result

- **A function has any number of parameters, none included.** A call
  binds them by position. A parameter named twice is rejected
  (`duplicateParameter`).
- **A function of no parameters is evaluated at every call.**
  `twopi() = 2 pi()` is called with empty parentheses, as `pi()` is. It
  differs from a unit of the same body, `twopi 2 pi()`, in when it is
  evaluated. The build evaluates a unit once, at the ceiling. A call
  evaluates the body afresh at the working precision of every pass. So a
  function of no parameters names a computed constant without fixing its
  value in the table. It has no inverse, since it has no argument to
  recover (`inverseArity`).
- **A parameter without an annotation takes a plain number.** `x: 1`
  says explicitly what no annotation says. The table holds such a
  parameter with the unit `1`, written `1`. So one path writes the
  recovered argument of every function, whether its parameter is
  annotated or not ([Display](#display)).
- **The result's annotation is optional.** Without one, the build infers
  the result's dimension from the body, with each parameter bound to its
  annotation's dimension. The inference is exact, since a body's
  dimension never depends on the values of its arguments. With one, the
  build checks the inferred dimension against it. So `: 1` asserts a
  plain result and catches a body that gives another.

### The inverse

`~name(p) = body` defines the inverse of `name`. It is optional, and a
function without one cannot be the want.

- The function must be defined (`orphanInverse` otherwise) and must have
  exactly one parameter (`inverseArity` otherwise). A conversion
  recovers one argument from one value.
- The inverse's parameter has the function's result dimension. That
  dimension is known, so the parameter takes no annotation, and one
  written there is rejected where it stands (`inverseAnnotation`).
- The parameter may take conditions, which restrict the haves that a
  conversion into the function accepts.
- The body must conform to what the function's parameter takes.
- A second `~` line for one function is a `duplicate`.

The two lines may stand anywhere in the file, as every definition may.
By convention they are adjacent.

### What the parser keeps

`Definition` has a `function` kind and an `inverse` kind:

- The `function` kind holds the name, the parameters, the result's
  annotation, the conditions, the body and the span, the offsets of the
  definition's text. Each parameter has an optional annotation, and the
  result's annotation is optional too.
- The `inverse` kind holds its function's name, the parameter, the
  conditions, the body and the span.

An annotation and a condition each keep the text they were written as
([What the parser keeps, and what it rejects](architecture.md#what-the-parser-keeps-and-what-it-rejects)).

The predefined definitions file defines functions of its own, the
temperature readings `tempC` and `tempF` among them
([Temperature and logarithmic levels as functions](../docs/quantities.md#temperature-and-logarithmic-levels-as-functions)).
`src/units.txt` is their source of truth.

## Annotations

[Functions](../docs/definitions.md#functions) states the rule: an
annotation, the unit a parameter takes, checks a dimension and changes
no value.
[A quantity carries no unit](../docs/quantities.md#a-quantity-carries-no-unit)
gives the reason, with the body-mass index as its example. A quantity's
scalar is held in the primitives, so `weight: kg` means "a mass",
exactly as `weight: lb` does.

### An argument is accepted as it stands

A call accepts an argument in any unit that conforms to the annotation.
The test is conformance, the test a sum applies to its operands, kinds
included: `x: radian` admits an angle and not a plain number. There is
no conversion step, since a value remembers no unit to convert from.

### The result has a dimension, not a unit

The result's annotation is a check as well. The want chooses the unit a
value is written in, as for any value, and a blank want writes the
primitives. Say the file defines:

```
pressure(force: lbf, area: in^2): psi = force / area
```

| You type                    | Into  | Exucal shows             | Note                               |
| --------------------------- | ----- | ------------------------ | ---------------------------------- |
| `pressure(100 lbf, 4 in^2)` |       | `≈ 172368.93 kg / m s^2` | a blank want writes the primitives |
| `pressure(100 lbf, 4 in^2)` | `psi` | `= 25 psi`               | the want chooses the unit          |

The first line surprises a reader of the head. The alternatives below
are worse, and the want is always there. Showing a lone call's value in
the unit of its result's annotation is future work
([Extensions that fit](future.md#extensions-that-fit)).

A result that is a number on a defined scale is annotated `: 1`. Such a
body divides its units out, as `bmi` does with `weight / kg`. With
`: 1`, a division left out fails the build, where without it the body
would quietly give a dimension. A physical result keeps its dimension:
`kinetic` gives an energy, which converts into `J`, `kcal` or `ft lbf`.

### An annotation is a unit expression

An annotation is the expression grammar restricted to these: unit names,
prefixed or not; juxtaposition, `*` and `/`; `^` with its literal
exponent; parentheses; and the number `1`, written `1`. So `kg`, `m/s`,
`kg m^2 / s^2`, `1 / s` and `1` are annotations. The parser rejects
anything else where it is written:

- Any other number is an `annotationScale`: `f(x: 2)`, `f(x: 1000 m)`
  and `f(x): kg/2` alike.
- A sum, a difference, a negation or a call is an `annotationNotUnits`.

No message is worded for a definitions rejection today: only the
predefined definitions file is loaded.

The number is rejected because conformance ignores the scalar. So `: 2`
could be read in two ways only, and both mislead. Read as `: 1`, it
deceives a reader who expects a scale. Read as a scale, it breaks the
rule that an annotation changes no value. The `1` is kept because a
plain result needs a spelling and `1 / s` needs a numerator.

A unit's name is accepted whatever the unit's scalar. `: percent`
asserts a plain number and multiplies by nothing, as `: lb` asserts a
mass and converts nothing.

### Where the annotation's unit matters

An annotation's unit matters beyond its dimension in one place. The
outcome writes a recovered argument as a count of it
([Display](#display)), so `2 ft` into `twelve` is `= twelve(2 in)`.

For that count, an annotation must be certainly nonzero. The build
rejects one whose value is zero or cannot be told from zero
(`zeroDeclaredUnit`), since nothing is a count of either. It holds the
result's annotation to the same rule. An annotation names units only, so
the check can fail only through a unit of the file: one defined as zero,
or one defined as an inexact value around zero.

### Alternatives weighed

- **A parameter bound to its number in the annotated unit**, as GNU
  units' `units=` reads: `w: kg` would make `w` the number `w / kg`.
  That matches how empirical formulas are printed. But changing `kg` to
  `lb` would silently change the function, and the body would lose its
  dimension checks. `w / kg` in the body is explicit and survives either
  annotation.
- **An argument required in exactly the annotated unit.** It cannot be
  checked, since a value does not remember the unit it was typed in, and
  it would not be wanted.
- **A result unit implied by the parameters' units**, as `min` and `mi`
  would give `min/mi`. A dimension can be written over the parameters'
  units in several ways or in none, and constants such as the `/ 2` of
  kinetic energy get in the way.

## Names and shadowing

[Names](../docs/definitions.md#names) states the rules for the file's
names, and [Names](architecture.md#names) describes the namespaces and
the check for an ambiguous name.

### A function's name

A function's name is in the namespace that the units, the unit lists and
the built-ins share. A function and a unit of one name are a
`duplicate`, and so are a function and a built-in: a definition may not
take a built-in's name. A table that builds therefore never holds a
defined function and a built-in of one name, and no order between the
two can be observed. The lookup, which resolves the names of an
expression against the table, tries them in an order that is left to the
code's own comment (`resolveFunction` in `table.ts`).

The name must not read as a prefix followed by a unit (`prefixedName`,
one error for lists, functions and built-ins).
[The order of the build](architecture.md#the-order-of-the-build) gives
the reason.

An inverse's name is its function's, behind the `~`, which no other name
can start with. The build keys an inverse by its function's name, apart
from every namespace.

### A parameter's name

A name resolves one way wherever it stands:

- An annotation is evaluated among the units alone.
- A condition and the body resolve a parameter before any unit, by its
  exact name.

In `kinetic(mass: kg, v: m/s)`, the `m` of the annotation is the meter
whatever the parameters are called. In a body whose parameter is `m`,
`m` is the parameter and `km` is still the kilometer, since a prefixed
name is looked up among the units. An annotation cannot name a
parameter, so it cannot say that one parameter has the unit of another.

**Shadowing a unit is allowed and silent.** Single letters such as `t`,
`s`, `m` and `T` are units of the predefined file. Forbidding them as
parameters would take away the short names that formulas use, as
`tcdf(t, nu)` does. It would also let a unit added to the definitions
file break a function that built before. A sigil on parameters, `$t`,
is the alternative, and it reads unlike mathematics.

The parser rejects two cases, each found from the definition's text
alone:

- **A parameter named twice**, `f(x, x)`, is rejected at its second
  occurrence (`duplicateParameter`). No rule could say which one the
  body means.
- **A parameter named like a unit that its own head uses** is rejected
  at the annotation's use of the name (`parameterNamesUnit`). In
  `kinetic(m: kg, v: m/s) = m v^2 / 2`, the head's `m` is the meter and
  the body's `m` is the mass. The name resolves one way in each place,
  but the line reads both ways. The rejection carries the parameter's
  name.

The second case fires only when an annotation names the unit, and an
annotation can name only a unit that exists. So a unit added to the file
later never breaks a function that built before.

The second case is an error and not a warning, since the build reports
no warnings. An error can be relaxed without breaking a file, where a
silence could not be tightened. Relaxing it to a warning is future work
([Extensions that fit](future.md#extensions-that-fit)).

## Conditions

[Functions](../docs/definitions.md#functions) states how a condition is
written and what it does to a call, and
[Comparison and equality](../docs/numbers.md#comparison-and-equality)
states when a comparison is decided. A function or an inverse restricts
its arguments by conditions, written behind a `|` in the head and
separated by commas.

### The grammar of a condition

- **A condition is a chain of comparisons.** Two or more terms are
  joined by `<`, `<=`, `>` or `>=`, with `≤` and `≥` read as `<=` and
  `>=`. The comparisons of one chain point one way. A chain that turns,
  `0 < x > 1`, bounds nothing as an interval does, and the parser
  rejects it at the whole chain (`mixedComparison`).
- **Several conditions are a conjunction.** There is no disjunction. A
  domain in two pieces is usually one condition on an expression, as
  `abs(x) >= 1` is.
- **There is no equality and no `!=`.** The comparators are the four
  orderings, and `=` ends the head. Two balls can be found apart or
  found to overlap, and never found equal. So an equality condition
  would be undecided for every inexact argument, and a design for
  equality has to say what such a comparison gives. The equality
  operators are future work
  ([Extensions that fit](future.md#extensions-that-fit)).
- **A term is any expression**, calls of the built-ins and of other
  defined functions included. Those calls check their own conditions in
  turn. A unit list is not an expression, and neither is a comparison.
  There are no truth values, so `(x < 1) + 1` is a parse error, and a
  condition is only ever a chain at the top level.
- **A condition sees the parameters before the units**, as the body
  does. So a condition is written as the body would write the same
  expression.

The grammar stays unambiguous, and the text alone still decides it:

- An annotation ends at `,`, `)`, `|` or `=`. A unit expression contains
  none of them.
- A term ends at a comparison, at a comma outside parentheses, or at
  `=`. None of them can continue an expression. A comma inside a call's
  parentheses belongs to the call, by nesting.
- A comparison binds looser than anything in a term, since it is no part
  of the expression grammar. `| a + b < c d` compares `a + b` with
  `c d`, and `| x > -1` compares `x` with the negation of `1`.
- `<=` and `>=` are each one token, read before `<` and `>`.
- `|` appears once, and only in a head.

### What the build checks of a condition

- **Each condition must mention a parameter**
  (`conditionWithoutParameter`). One that mentions none could only hold
  always or never.
- **Adjacent terms must conform**, as a sum's operands must. The build
  takes each term's dimension with the parameters bound as in the body.
  A failure is a `nonconformingComparison`, which carries the spans of
  both terms and the mismatch. With `x: K`, `| x > 0` is an error, and
  `| x > 0 K` is the condition meant.
- **A call in a function's condition is a dependency**, as a call in its
  body is ([The walk](architecture.md#the-walk)). So
  `f(x) | f(x) > 0 = …` is a cycle, reported at build, and evaluation
  terminates.

### The check at a call

A call checks its conditions after the arguments conform and before the
body (`checkConditions` in `evaluate.ts`). It evaluates each condition's
terms on balls, with the parameters bound to the arguments. The terms
are no part of a displayed value. So they are evaluated at the operand
context, the context that a step's operands are computed at
([The working digits](numbers.md#the-working-digits)).

`decide` compares each adjacent pair of terms and gives a **verdict**:
the comparison holds, fails or is undecided. "Holds" and "fails" are
certain, true of every value within the two balls. A comparison is
undecided when the balls allow both.

The conditions are taken left to right, and the pairs of a chain left to
right, as one conjunction in three-valued logic:

- **The first failure that is certain ends the check.** The call is a
  `conditionFailed`. The error names the function and the condition as
  written, and it carries the argument of each parameter that the
  condition mentions, in the parameters' order. Such a failure ends the
  check even after an undecided comparison, since one false conjunct
  makes the conjunction false.
- **A term that cannot be computed ends the check too**, as a
  `callFailed`, as a failure of the body does. It ends the check only
  when every comparison before it certainly holds. So a condition may
  guard the next: in `| x > 0, ln(x) > 1`, a negative argument fails the
  first condition and never reaches `ln`. After an undecided comparison,
  a term that cannot be computed leaves its own condition undecided as
  well, since the guard may yet exclude the argument.
- **Every other undecided comparison is assumed to hold.** The call
  records an **assumption** for the condition: the function's name and
  the condition as written.

#### The verdict of one comparison

A comparison is decided by the ball model, with no tolerance. Both sides
conformed at build, and a quantity's scalar is held in the primitives,
so the two scalars compare directly: `x > 30 cm` holds for `1 ft`.

`orderOf` in `ball.ts` places the left side against the right, and
[Comparison](numbers.md#comparison) describes how. Two of its rules
matter to a condition:

- Two exact values are compared exactly and always decide, the bound
  included. `tempC(-273.15)` meets `x >= -273.15`. A condition
  `x <= 0.3` holds for `0.1 + 0.2`, since the sum is exactly `0.3`.
- Two inexact values are compared through their difference against zero.
  The two always align, with the smaller absorbed into the radius. A
  difference that cannot be formed as a value, past the exponent bound
  or straddling it, counts as straddling zero, and the comparison is
  undecided.

A ball either lies wholly on one side of a point, touches it or
straddles it. A **touch** is a ball with one end exactly on the point.
A **straddle** is a ball that reaches across the point. The verdicts
follow from where the left side lies against the right, under the names
`orderOf` returns:

| The left side against the right                         | `<`       | `<=`      | `>`       | `>=`      |
| ------------------------------------------------------- | --------- | --------- | --------- | --------- |
| `below`: below it throughout                            | holds     | holds     | fails     | fails     |
| `touchingBelow`: below, its upper end exactly on it     | undecided | holds     | fails     | undecided |
| `at`: exactly equal, as two exact equal sides are       | fails     | holds     | fails     | holds     |
| `touchingAbove`: above, its lower end exactly on it     | fails     | undecided | undecided | holds     |
| `above`: above it throughout                            | fails     | fails     | holds     | holds     |
| `straddles`: reaching across it, or of unbounded radius | undecided | undecided | undecided | undecided |

A ball is closed, so an end exactly on the bound leaves equality
possible. An inexact value at its bound therefore never decides a strict
comparison in its favor. It decides a non-strict comparison only when
its ball ends exactly on the bound, from the side the comparison admits.
The ball of `approx(-273.15)` straddles `-273.15`, so
`tempC(approx(-273.15))` stays undecided up to the ceiling.

In decimal mode every value is exact. Every comparison decides there,
and no condition is undecided.

### An undecided condition

[Functions](../docs/definitions.md#functions) states what a user sees
when a condition cannot be decided, and why a condition differs from a
built-in's edge. At an edge the value jumps or does not exist, so a
guess would be a wrong value, and `floor(sqrt(2)^2)` is an error. A
condition restricts a body that usually computes on both sides of the
bound, so the body's value is shown and the doubt is stated.

When a condition is undecided, the call goes on. It assumes that the
condition holds and evaluates the body. The assumption travels with the
value to the retry loop and on to the outcome.

#### The retry loop tries more digits first

A result that carries an assumption is not final. The retry loop keeps
it as the best so far and computes again at more digits
([Passes and errors](architecture.md#passes-and-errors)). A condition
that only the radius of a coarse pass leaves undecided decides at a
finer one.

A later pass may decide against the argument. The loop then ends with
that error, and not with the earlier result that rested on the
assumption. Say the file defines these two functions. The table shows
them at the default settings:

```
nonneg(x) | x >= 0 = x
recip(x) | x > 0 = 1 / x
```

| You type                         | Exucal shows                                                                           | Note                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `nonneg(1 + 1e-40 - exp(1e-40))` | an error: `nonneg` requires `x >= 0`                                                   | about `-5e-81`: undecided at the first passes, certainly negative at a later one |
| `nonneg(sqrt(2)^2 - 2)`          | `≈ 0 (within 4e-4049 of zero)`, with a warning                                         | undecided at every pass                                                          |
| `recip(sqrt(2)^2 - 2)`           | an error: could not tell whether `x > 0`, and assuming so, the body cannot be computed | the body fails under the assumption, at every pass                               |
| `recip(-1)`                      | an error: `recip` requires `x > 0`                                                     | a failure that is certain                                                        |

#### The warning at the ceiling

If an assumption remains at the ceiling, the outcome shows the value.
Every line's relation, `=` or `≈`, becomes `≈`, whatever its digits. A
**warning** beside the lines names each assumed condition, one warning
for each distinct wording. A warning is not a note, the remark on digits
that follows a line. The converter, the component of the two fields,
styles a warning apart from the notes, so that it is not read as one.
The warnings belong to the outcome and not to a line, so every output
mode carries them alike:

| You type                 | Into    | Exucal shows                                     | Note                                                          |
| ------------------------ | ------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `tempC(approx(-273.15))` |         | `≈ 0 K (within 2e-4047 of zero)`, with a warning | the condition of `tempC`                                      |
| `tempC(approx(-273.15))` | `tempF` | `≈ tempF(-459.67)`, with two warnings            | the condition of `tempC`, and that of `tempF` on its argument |

#### A failure under an assumption

A failure that is certain still fails. A condition that certainly fails
is a `conditionFailed`, whatever else is undecided. A term or a body
that fails under no assumption is a `callFailed`.

A body that fails under an assumption reports the assumption instead,
since the assumption may have caused the failure. The call is then an
`undecidedCondition`, which names the condition and carries the body's
error. The retry loop continues on it, as it does on an `unresolved`,
the error of a value that cannot be told from an edge.
`recip(sqrt(2)^2 - 2)` above is such a call.

#### The collector of assumptions

An assumption travels in a collector:

- `evaluate` takes an optional array. Each call it makes, at any depth,
  adds its assumptions to the array once its body has computed.
- A call gathers its own assumptions and its body's apart from its
  caller's. A body that fails under one is thereby told from a body that
  fails under none.
- The assumptions of calls in a condition's terms are kept with the
  condition's own.
- A pass that fails drops its assumptions with it.
- `resolve`, the retry loop, gives each pass a fresh collector. It hands
  the assumptions of the pass it returns to `evaluateText` and
  `convertText`, which take an optional collector of their own. The
  outcome turns them into the warnings.

#### What a condition costs

A condition has no effect beyond its verdict, and it costs what the same
expression typed inline costs. A call evaluates its conditions at every
pass, as it evaluates its body. Evaluating one changes nothing but the
memos of constants that any expression fills
([Memoized constants](numbers.md#memoized-constants)).

A condition that restates an identity, `| x - x >= 0`, holds for every
argument on paper. On an inexact argument the two uses of `x` are
independent balls, so the difference straddles zero at every precision
([Identities and cancellation](../docs/numbers.md#identities-and-cancellation)).
Every such call runs to the ceiling, and its value is shown with the
warning. The build cannot detect such a condition in general.

#### A unit defined by a call

The build evaluates a unit's body, so it checks the conditions of a call
in that body, at the ceiling
([The order of the build](architecture.md#the-order-of-the-build)).
`cold tempC(-300)` fails the build with the condition it breaks. A
condition left undecided there fails the build too, as in
`cold tempC(approx(-273.15))`: the error is the build's
`undecidedCondition`, which carries no error of a body. A unit's value
has nowhere to carry a warning, and no later pass could decide the
condition, since the table is built at the ceiling.

#### No assertion on a result

Conditions restrict arguments only. The build checks a function's result
for its dimension, once. Nothing checks the result's value against a
range, at the call or anywhere downstream.

A range assertion would have nothing to feed. No part of the evaluator
narrows a value by what is known of its range: a value's ball is all
that the rest of an expression learns of it. A built-in can use what it
knows of its own range, in its own code. A defined function is a
composition and has no such code. So a range condition could only check
the body against itself, an assertion that nothing else would act on.
For that reason GNU units' `range=` has no counterpart. Ranges that
narrow a result's ball are future work
([Extensions that fit](future.md#extensions-that-fit)).

#### The conditions a conversion into a function checks

A conversion into a function checks conditions twice
([A function as the want](#a-function-as-the-want), steps 3 and 5), and
neither check is a range on forward calls:

- The inverse's own conditions restrict the haves that the conversion
  accepts.
- The function's conditions are checked on the recovered argument.

An inverse's condition is worth writing where the inverse's body would
otherwise fail less clearly. Say the file defines two functions that
differ only in that condition:

```
lev(x) = exp(x)
~lev(y) | y > 0 = ln(y)
lev2(x) = exp(x)
~lev2(y) = ln(y)
```

| You type | Into   | Exucal shows                                                       | Note                     |
| -------- | ------ | ------------------------------------------------------------------ | ------------------------ |
| `-1`     | `lev`  | an error: the inverse of `lev` requires `y > 0`                    | the condition, by name   |
| `-1`     | `lev2` | an error: the inverse applies `ln` to a value that is not positive | the domain error of `ln` |

## Calls

[Calls and arity](../docs/expressions.md#calls-and-arity) states the
call rule: a name directly followed by `(` is a call, and a space
between them makes a juxtaposition.
[Functions](../docs/definitions.md#functions) states what a call of a
defined function does, and
[Three decisions of the parser](architecture.md#three-decisions-of-the-parser)
gives the reasons for the call rule. The parser decides a call from the
text alone, so two errors about a name are the lookup's:

- A call of a name that is no function is a `notAFunction`. The error
  carries what the name is otherwise: a unit, a prefixed unit or
  nothing. For a unit, the message shows the product with the space,
  which it writes from the call's span. A name that is nothing is an
  unknown function.
- A bare function name in an expression is not a unit. `tempC` alone, or
  `2 tempC`, is a `functionAsUnit`. The error carries the function's
  arity, so that the message can show the call form.

A call of a defined function evaluates in five steps, and the first
failure ends it:

1. The name resolves through the lookup, to a defined function or to a
   built-in.
2. The call must give as many arguments as the function has parameters
   (`arityOf` in `table.ts`). Another count is an `arityMismatch`, found
   before any argument is evaluated.
3. The arguments are evaluated left to right, each once: a call is by
   value. Each argument is checked as soon as it is evaluated. It must
   conform to its parameter's annotation, or be a plain number without
   one. A failure is an `argumentMismatch`, reported before any later
   argument is evaluated. The error carries the parameter and the count
   of parameters, so that the message names the parameter only where
   there is more than one.
4. The conditions are checked
   ([The check at a call](#the-check-at-a-call)). A failure that is
   certain is a `conditionFailed`. An undecided condition is assumed to
   hold, and the assumption travels with the result.
5. The body is evaluated with each parameter bound to its argument
   (`evaluateBound`). It goes through the table's lookup, with the bound
   parameters resolved before any unit or prefix. A failure of the body
   is a `callFailed`, which names the function and carries the body's
   error. Under an assumption it is an `undecidedCondition` instead. An
   `unresolved` inside the body, at any depth, is still retried.

A body's error has spans into the definitions text, and a lookup's
failure inside a body comes back unwrapped
([Where each error points](architecture.md#where-each-error-points)).

The result is a quantity like any other. The call does not check its
dimension, since the build checked or inferred it once. In decimal mode
each step of the body is one rounded step, as the same text typed inline
is ([Decimal mode](numbers.md#decimal-mode)).

## A function as the want

[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states what the conversion answers with and the checks a user meets.

The pipeline, the code that parses, evaluates and converts the two
texts, reads a want of one bare name in a fixed order
([The output modes](architecture.md#the-output-modes)). A name that is a
defined list means the list. A name that is a defined function means the
function. Only then is the name read as a unit. For a function, each
pass of the pipeline takes these steps (`convertToFunction` in
`pipeline.ts`):

1. The function must have an inverse. A function without one is a
   `noInverse` on the want side.
2. The have must conform to the function's result dimension. A failure
   is the ordinary mismatch of the pair.
3. The have is checked against the inverse's conditions, as an argument
   is at a call. A failure that is certain is a `wantConditionFailed`,
   of the inverse. An undecided condition is assumed and warned of.
4. The inverse's body is evaluated with its parameter bound to the have
   (`invertFunction`), which gives the recovered argument. A failure is
   an `inverseFailed`, which carries the body's error.
5. The recovered argument is checked against the function's conditions,
   in the same way (`wantConditionFailed`, of the function).
6. The function is applied to the recovered argument (`applyFunction`).
   A value certainly other than the have is an `inverseMismatch` on the
   want side, and so is a failure of the function's body there. Two
   exact values are compared exactly. Any other two certainly differ
   when their difference lies wholly on one side of zero.

The message of a `noInverse` names the form that would give the function
an inverse:

```
"normcdf" has no inverse, so it cannot be the unit to convert to. Define "~normcdf(y) = …" to give it one.
```

Steps 3 to 6 run at the operand context of the pass
([The working digits](numbers.md#the-working-digits)). The inverse, the
function applied back and both sets of conditions are operands of the
count. The count is the step shown, and it is taken at the pass's own
context.

### The check of the inverse

Step 6 checks the one part of a definition that the build cannot: that
an inverse inverts. The check refutes and does not prove:

- If the function's value at the recovered argument lies wholly apart
  from the have, no point of the recovered argument's ball gives the
  have, and the answer is certainly wrong.
- An overlap proves nothing. Balls can decide an overlap, and they
  cannot decide equality.

So every answer shown has passed the check at the precision it is shown
at. An inverse that is wrong elsewhere is caught when a conversion
reaches the values where it is wrong. An inverse that is wrong by less
than the answer's own uncertainty passes, and its error lies below the
digits shown. [Inverses](../docs/definitions.md#inverses) shows a wrong
inverse caught.

The check costs one evaluation of the function at each pass of a
conversion, beside the one evaluation of the inverse. Nothing else pays
it, since a conversion is the only use an inverse has. Three
alternatives are set aside:

- Trusting the inverse gives a confident `=` for a wrong one.
- Checking the inverse once, lazily, says little about the next value.
- Sampling the inverse at build is a heuristic. It meets domain errors
  at its samples, and it costs load time at the ceiling.

Applying and inverting are one operation, a body evaluated under a
binding, which `applyFunction` and `invertFunction` share.

### What the conversion carries

The conversion (the `function` kind of `Conversion`) carries these:

- the have, as read and as evaluated;
- the function's name;
- the recovered argument;
- the parameter's annotation, with its text;
- the argument as a count of that annotation.

So the outcome does no arithmetic. The count is a quotient: the
recovered argument's scalar over the annotation's. It can be refused as
a conversion's ratio can, at the exponent bound or at the significand
limit, and the refusal is then the conversion's. Say the file defines a
unit with a long significand and a function annotated with it:

```
wide 5^20000 m
span(x: wide) = x
~span(y) = y
```

| You type            | Into   | Exucal shows                                                            | Note                                   |
| ------------------- | ------ | ----------------------------------------------------------------------- | -------------------------------------- |
| `3 m`               | `span` | `≈ span(1.1940831e-13979 wide)`                                         | the count is a quotient                |
| `3^30000 m`         | `span` | refused: the count's exact significand would pass the significand limit | in exact mode, at the default limit    |
| `approx(3^30000 m)` | `span` | `≈ span(1.7280443e+334 wide)`                                           | an inexact have gives an inexact count |

`approx` is the one operation whose purpose is to make a value inexact,
and the refusal's message names it as the remedy.

A function's name is not a unit anywhere else. In a typed list,
`tempC;degC`, it is a `functionAsUnit`, as it is in an expression
([Calls](#calls)). A defined list's name in the same place is an unknown
unit. A want that is a call, `tempC(100)`, is not a conversion into a
function. It is an expression, and the conversion is the ratio, with a
reciprocal line.

## Display

[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states the line: the have, then the call at the recovered argument, with
no reciprocal line. [A function's line](architecture.md#a-functions-line)
describes a defect of the line, which drops its note.

The outcome writes the line from the conversion alone (`functionResult`
in `outcome.ts`):

- The argument is the count, written as any value is, at the display
  digits and in the rounding mode.
- The count is the first factor of the parameter's annotation. The
  printer writes the annotation back from its expression, as it writes a
  want, so an annotation written `(in)` shows as `in`.
- The annotation's text serves one test. An annotation that is `1`,
  written or absent, adds no unit, so a plain number's argument is bare.
- The relation is the count's: `=` when the count shows exactly at the
  display digits, as for any value.
- Under the ratio notation an exact count may be a ratio. A ratio is
  written bare inside the call for a plain number, and parenthesized
  before its unit as it is anywhere else
  ([Where a ratio is written](notation.md#where-a-ratio-is-written)).
- A negative argument is written inside the call.

Say the file holds `twelve` and its inverse, as above. The ratio
notation is at its default width:

| You type     | Into     | Notation | Exucal shows              | Note                                   |
| ------------ | -------- | -------- | ------------------------- | -------------------------------------- |
| `tempF(212)` | `tempC`  | digits   | `= tempC(100)`            | a plain number, so no unit             |
| `2 ft`       | `twelve` | digits   | `= twelve(2 in)`          | the count before its annotation        |
| `-2 ft`      | `twelve` | digits   | `= twelve(-2 in)`         | a negative argument inside the call    |
| `1 K`        | `tempC`  | ratio    | `= tempC(-5443/20)`       | a ratio, bare inside the call          |
| `1 m`        | `twelve` | ratio    | `= twelve((1250/381) in)` | a ratio, parenthesized before its unit |

A call as the have is not special. With a blank want it shows its value
in the primitives, as `tempC(100)` is `= 373.15 K`. With a unit as the
want it is a ratio and gets its reciprocal line.

## Build-time checks

[When the file does not load](../docs/definitions.md#when-the-file-does-not-load)
lists every fault of the file with an example, and
[The order of the build](architecture.md#the-order-of-the-build) gives
the order of the build as a whole. A function and an inverse are each
checked in a fixed order, and the first failure ends the build.

### A function

A function is an entry of the build's walk
([The walk](architecture.md#the-walk)). So a unit may be defined by a
call, a body may call another function, and a cycle through a function
is reported like any other. Checking a function takes four steps:

1. Each parameter's annotation is evaluated among the units alone. Each
   must be certainly nonzero (`zeroDeclaredUnit`), since the outcome
   writes an argument as a count of it.
2. The body's dimension is taken by `dimensionOf` in `dimension-of.ts`,
   with each parameter bound to its annotation's dimension, and
   dimensionless without one. The dimension found is the function's
   result.
3. Each condition's terms are taken in the same way, and each condition
   is checked ([Conditions](#conditions)).
4. The result's annotation, when there is one, is evaluated under the
   rule of step 1, and the body's dimension is checked against it. A
   failure is a `functionMismatch`, which carries the function's
   definition.

`dimensionOf` applies the evaluator's rules over dimensions alone,
through the walk's own lookup:

- A number is dimensionless.
- A unit is its dimension.
- A sum checks that its operands conform.
- A product combines, and a power raises.
- A call checks the count of its arguments and applies the callee's
  rule: a defined function's annotations, or a built-in's dimension
  rule.

So a name that means nothing, a sum whose operands do not conform, or a
call of the wrong count or dimension is an ordinary build error, with
its span in the definitions text. `wave(x) = sin(x)` fails the build,
since `sin` takes an angle (`builtinArgument`), and
`wave(x: radian) = sin(x)` builds. The result's dimension is exact,
because a body's dimension cannot vary with the values of its arguments.

### An inverse

An inverse is not an entry of the walk, since nothing can refer to it.
It is checked in its place in the file's order:

1. An inverse of no defined function is found as soon as the definitions
   are indexed, before any body is looked at (`orphanInverse`).
2. The inverse requests its function from the top of the walker, which
   can never close a cycle. So an inverse may call its own function, in
   its body or in a condition. The function must have exactly one
   parameter (`inverseArity` otherwise, for none as for several).
3. The conditions are checked as a function's are, with the inverse's
   parameter bound to the function's result dimension.
4. The body's dimension is taken under the same binding and checked
   against what the function's parameter takes. A failure is a
   `functionMismatch`, which carries the inverse's definition.

The checked inverses are attached to their functions at the end of the
build. The table holds each function as `UnitFunction` in `table.ts`,
and [The walk](architecture.md#the-walk) lists what that holds.

### No body is evaluated

The build never evaluates a body. A body that fails at some value, or at
every value, builds and fails at the call that reaches it. `ln(x - 1)`,
`asin(x + 1)` and `1 / ln(x)` each fail at some value, and each is a
fine function. Evaluating a body at a value chosen by the build would
reject such functions.

The significand limit is applied to one number of a body and not to the
others:

- **A literal is not checked.** A body whose literal has more digits
  than the significand limit holds builds, and fails at the call. Such a
  literal is still within the hard bound, the most the significand limit
  can be set to. The parser refuses a longer one as it is typed.
- **A `^` exponent is checked.** `dimensionOf` reduces it to one
  fraction within the significand limit, as the evaluator does
  (`reduceExponent`). The power's dimension depends on the exponent, and
  the build's context supplies the limit. `huge(x) = x^(1e30000)` fails
  the build at the default limit.

## Precision, the radius and cost

[Functions](../docs/definitions.md#functions) states what a call costs a
user, and
[Identities and cancellation](../docs/numbers.md#identities-and-cancellation)
gives the examples: a parameter used twice, and a function written by
hand in place of a built-in.

A defined function's value is its body's value as an expression, and the
machinery that certifies an expression certifies it:

- The arguments are evaluated once, to balls.
- The body is evaluated with the parameters bound to those balls. Every
  operation in it already exists on balls, and each result is settled at
  its node as anywhere else ([Settling](numbers.md#settling)).
- Each pass of the retry loop evaluates the whole expression again,
  bodies included. So a cancellation inside a body is paid for by the
  next pass's digits, as one typed inline is.
- Cycles are build errors, so evaluation terminates.

A definition can write no primitive, no series and no loop. It can only
compose operations that already bound their own error, so the radius
needs nothing new. These consequences follow:

- **Calls are not memoized.** A body that calls a function twice
  evaluates it twice. Nesting such calls `k` levels deep evaluates the
  innermost `2^k` times, at every pass. The same expression written out
  in full costs as much, so a call sets no new limit. A definition that
  reads small can still be large.
- **A parameter used twice is two occurrences of one ball.** Each use
  reads the ball as an independent value, which is the dependency
  problem of interval arithmetic. `x - x` in a body never certifies an
  exact `0` for an inexact argument, as the same text typed inline does
  not.
- **A composition pays at every operation.** A built-in is one routine
  of the kernel, the layer that computes the inexact functions
  ([The kernel](numbers.md#the-kernel)). The routine runs at the bits
  its result needs plus a guard. Its radius comes from one bound over
  the whole ball, its exact cases are recognized, and its own edges are
  handled. A composition rounds at each step and adds each rounding to
  the radius. The retry loop makes its digits right all the same, at
  more passes, up to the ceiling.
- **Decimal mode rounds each step of the body** to the working digits,
  as it rounds the same expression typed inline. `f(x)` is the hand
  calculator's sequence of keystrokes, not a correctly rounded `f`
  ([Decimal mode](numbers.md#decimal-mode)).
- **A written inverse is checked where it is used**, which refutes a
  wrong answer and proves nothing about other values
  ([A function as the want](#a-function-as-the-want)).
- **There is no inversion without a written inverse.** Certifying a root
  of a composition needs monotonicity, or an enclosure of the derivative
  over the bracket. The evaluator has neither. Inversion is the one
  place where defined functions would make the radius hard, and the
  optional inverse stays clear of it.

The build of a file of functions grows linearly with their number. Each
function's line is parsed once, each function is checked once however
many functions call it, and each inverse is checked once against its
function. A benchmark holds the build to that: it parses and builds a
file of 500 functions, each calling an earlier one and each with an
inverse, then a file of 2,000. It asserts that neither step costs more
than eight times as much for four times the functions.

A seeded property test draws 400 function and inverse lines, with none
to three parameters and none to two conditions, and checks that each
parses to what it was built from. It then injects five faults into each
line where they apply, and checks that each is rejected where it is
written:

- a chain that turns (`mixedComparison`);
- a scale in an annotation (`annotationScale`);
- a parameter named again (`duplicateParameter`);
- an annotation on an inverse's parameter (`inverseAnnotation`);
- `[D]` after the name (`unsupported`).

The test does not draw `annotationNotUnits` or `parameterNamesUnit`.
Tests written by hand cover those two.

## Where it lives

These modules hold the defined functions:

- `definitions.ts` holds the head's parser, the annotation's grammar,
  the `~` line and the conditions. It holds the seven rejections of the
  definitions parser and the `function` and `inverse` kinds of
  `Definition`.
- `table.ts` holds `UnitFunction`, `arityOf`, `resolveFunction` and the
  lookup's errors `functionAsUnit` and `notAFunction`.
- `dimension-of.ts` holds `dimensionOf`, the dimension check.
- `evaluate.ts` holds the call's steps, `applyFunction` and
  `invertFunction`, `checkConditions` and `decide`, and the collector of
  assumptions.
- `ball.ts` holds `orderOf` and `position`.
- `build.ts` holds the checks of a function and of an inverse. Its
  errors are `orphanInverse`, `inverseArity`, `functionMismatch`,
  `zeroDeclaredUnit`, `nonconformingComparison`,
  `conditionWithoutParameter` and the build's `undecidedCondition`.
- `pipeline.ts` holds the steps of a conversion into a function and the
  retry loop, which treats a result under an assumption as not final.
- `messages.ts` holds the wording of the errors of a call and of a
  conversion into a function, and the warning of an assumed condition.
- `outcome.ts` holds the function's line and the warnings, and
  `unit-converter.ts` holds the warning's style.
- `units.txt` holds the predefined functions.

## Not in this design

The user docs state three of these as rules
([Functions](../docs/definitions.md#functions),
[Inverses](../docs/definitions.md#inverses),
[Names](../docs/definitions.md#names)). These designs are ruled out:

- **A call of an inverse in an expression**, `~tempC(373.15 K)`. An
  inverse is applied by a conversion alone. A call of one would change
  the call's grammar and its lookup. Each use would also need the check
  that a conversion makes, the function applied back at every pass,
  since nothing else checks that an inverse inverts.
- **A disjunction in a condition**, and **an assertion on a result's value**
  ([Conditions](#conditions) and
  [An undecided condition](#an-undecided-condition) give the reasons).
- **Optional parameters and defaults.** A call gives exactly as many
  arguments as the function has parameters, so a wrong count is always
  an error at the call. A function that fixes an argument of another is
  a second definition, as `cube(x) = power(x, 3)` is beside
  `power(x, n)`.
- **A built-in defined in the file.** A built-in is code, and its name
  is a duplicate of any definition.
- **A bare number as the answer of a conversion into a function.**
  `tempF(212) = 100` does not say what `100` is, and the line does not
  parse back.
- **A display name on a function.** `100 °C` does not parse back.
- **A call decided by the table.** The parser does not consult the
  table.

Future work on defined functions is described in
[Extensions that fit](future.md#extensions-that-fit).

## Alternatives considered

[Grammar](../docs/definitions.md#grammar) states the syntax as it is.
The alternatives to it follow, and the alternative to functions for a
temperature reading.

### Other forms of a function's line

Four forms are set aside, each for what it loses:

- **A bracketed head**,
  `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`. It declares the
  argument's and the result's units in brackets, both required. The
  inverse follows a `;`, and in it the function's own name stands for
  its value. It takes one argument only. Extended in place to several
  parameters, `kinetic(mass, v) [kg, m/s; J] …`, it matches annotations
  to parameters by position, all or nothing, and has no place for
  bounds.
- **Annotated signatures with the inverse after a `;`.** They keep the
  function's own name standing for its value, and they crowd the line.
- **Keyword clauses**, as GNU units writes them,
  `units=[…] domain=[…]`. They lengthen every line and add ways to get
  one wrong.
- **A multi-line block.** It makes the file sensitive to indentation for
  one form of definition.

The inverse on a line of its own makes "optional" literal. A function
has no inverse slot to leave empty, and adding an inverse adds a line.

### Bounds written in the parameter list

Three forms are set aside:

- **Comparisons around the parameter**, `f(0 K <= x: K <= 100 K)`. They
  wedge the annotation between the bounds, so that `K <= 100 K` reads as
  a comparison of its own. They leave no place for a condition that
  relates parameters.
- **Interval notation after the parameter**, `f(x: K [0 K, 100 K))`. It
  puts a half-open `)` inside the head's own parentheses and makes an
  open side easy to miss.
- **A lower bound always on the left**, `f(0 < x)`. It gives one
  spelling for each bound, and it does not accept the `x > 0` that
  everyone writes.

The `|` clause keeps the parameter list clean, reads the same in every
case, and takes relations between parameters with no new syntax.

### An offset in `Quantity`

A temperature reading could be a unit with an offset, held in
`Quantity`.
[Temperature and logarithmic levels as functions](../docs/quantities.md#temperature-and-logarithmic-levels-as-functions)
gives the reason against it: every operation would need a rule for an
offset. `Quantity` holds a scalar and a dimension and nothing else, so
each operation on quantities is the arithmetic of balls with a rule for
dimensions. An offset would be a third part, and sums, products, powers,
conversion and every built-in would each need a rule for it. A function
with an inverse needs nothing new: the offset lives in a body, and a
call is a quantity like any other once the body has run.
