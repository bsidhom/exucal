# Defined functions

A **defined function** is a function that the definitions file defines:
a name with its parameters, `=` and a body. An inverse is a definition
of its own, on a line that starts with `~`.
[Functions](../docs/definitions.md#functions) and
[Inverses](../docs/definitions.md#inverses) in the user docs state how
each is written and what a call does, and
[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states what a function answers with as the want. The mechanism is
described here, with each design decision, its reasons and the
alternatives.

Functions serve two purposes:

- A reading such as a temperature is not a multiple of a unit: zero
  degrees Celsius is not zero kelvin. A function computes the
  temperature from the reading's number. So a quantity needs no offset,
  a constant added to the multiple of a unit
  ([Alternatives considered](#alternatives-considered)).
- A composition of the built-ins gets a name, where an author would
  otherwise type it out at every use:
  `normcdf(x) = (1 + erf(x / sqrt(2))) / 2`.

A function adds nothing to `Quantity`, the type that holds a scalar with
its dimension. A call evaluates to a quantity like any other.

Only the predefined definitions file is loaded
([What the app loads](../docs/definitions.md#what-the-app-loads)). An
example that says "say the file defines" supposes lines added to that
file. In an example table an error is described in a few words and not
quoted, as in the user docs.

These words are used in a particular sense:

- The **head** of a function's or an inverse's line is everything before
  the `=`: the name, the parameters, the result's annotation and the
  conditions.
- The **build** is the construction of the **definitions table** from
  the definitions, as the app starts. The table holds every unit,
  prefix, unit list and function by name. The user docs say that the
  file is loaded, and a build error is a fault that keeps the file from
  loading.
- A **rejection** is the definitions parser's error for text that it
  read and does not accept. It carries the span of the text at fault,
  the offsets of that text, so "rejected at" names the text. The parser
  raises a rejection as it reads the file. The build raises a build
  error afterwards, from the parsed definitions. Either keeps the file
  from loading. The name an error has in the code follows it in
  parentheses, as in (`duplicate`).
- A **plain number** is a dimensionless quantity: one with neither a
  dimension nor a kind.
- A scalar is a `Ball`: a midpoint and a radius that bounds the error of
  the midpoint. It is exact when its radius is zero
  ([The types](numbers.md#the-types)).
- A **pass** is one evaluation at one precision. The **retry loop** runs
  passes at rising precision, up to the **ceiling**, the highest
  precision any pass computes at
  ([Passes and errors](architecture.md#passes-and-errors)).
- The pipeline is the code that parses, evaluates and converts the two
  texts (`pipeline.ts`). The outcome is the module that composes the
  output lines from the pipeline's result (`src/outcome.ts`).

The design rests on these decisions, each described in the section
linked:

- **The start of a definition decides which form it is, from the text alone.**
  The parser never consults the table ([Definitions](#definitions)).
- **An annotation checks a dimension and changes no value.** The want
  chooses the unit a result is written in, never the head
  ([Annotations](#annotations)).
- **A parameter may shadow a unit, except a unit that an annotation of its own head names.**
  A definition may not take a built-in's name
  ([Names and shadowing](#names-and-shadowing)).
- **A condition is a chain of comparisons, and each comparison holds, fails or is undecided.**
  There is no equality ([Conditions](#conditions),
  [The check at a call](#the-check-at-a-call)).
- **An undecided condition is assumed to hold, and the value is shown with a warning.**
  The retry loop tries more digits first
  ([An undecided condition](#an-undecided-condition)).
- **A call evaluates each argument once and keeps nothing for the next call**
  ([Calls](#calls)).
- **A conversion into a function applies the inverse, then checks it by applying the function back.**
  The check refutes a wrong answer and does not prove the inverse
  ([A function as the want](#a-function-as-the-want),
  [Display](#display)).
- **The build checks a function over dimensions alone, without evaluating its body**
  ([Build-time checks](#build-time-checks)).
- **A call costs what its body costs, typed out in its place.** The
  arithmetic needs nothing new for functions
  ([Precision, the radius and cost](#precision-the-radius-and-cost)).
- **No expression calls an inverse, and no condition bounds a result.**
  These and other designs are excluded on purpose
  ([Not in this design](#not-in-this-design)).
- **The inverse has a line of its own, and the conditions follow a `|`.**
  Each other form of the line loses something, and so does an offset in
  place of functions
  ([Alternatives considered](#alternatives-considered)).

## Definitions

A function's line and an inverse's line take the forms below, which
[Functions](../docs/definitions.md#functions) and
[Inverses](../docs/definitions.md#inverses) describe for a user. Of
these lines, only `tempC` and its inverse are in the predefined
definitions file, and the others are supposed for the examples:

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

The predefined file defines other functions too
([Temperature and logarithmic levels as functions](../docs/quantities.md#temperature-and-logarithmic-levels-as-functions)),
and `src/units.txt` is their source of truth.

The grammar of the two lines follows. The block is maintained by hand.
Where the block and the parser differ, the parser is right. The whole line
grammar, with every form of definition, is the comment at the top of
`src/core/definitions.ts`.

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

- **The start of a definition decides its form.** A definition that
  starts with `~` is an inverse. A name directly followed by `(` is a function,
  with no space between the two, as in a call. A name directly followed
  by `[` is rejected (`unsupported`): the bracket is reserved for
  dimension variables, which are future work
  ([Extensions that fit](future.md#extensions-that-fit)). Everywhere
  else in the head, spaces are free around every token.
- **`=` ends the head.** An annotation is an expression, and
  juxtaposition multiplies, so whitespace cannot end an annotation. With
  only a space between them, a result annotation `J` and a body
  `mass v^2 / 2` would read as one product. The expression grammar has
  no `=`, `:`, `~` or `|` and no comparison, so each of them ends an
  expression wherever it stands.
- **The text alone decides every reading.** The parser never consults
  the table, and it could not: the table is built from the parsed
  definitions, which may stand in any order. A text also parses to one
  tree whatever the file defines
  ([Three decisions of the parser](architecture.md#three-decisions-of-the-parser)).
- **Conditions follow a `|`**, read "such that", after the parameters
  and the result's annotation ([Conditions](#conditions)).

[Alternatives considered](#alternatives-considered) has the other forms
of the line and what each loses.

### The parameters and the result

- **A function has any number of parameters, none included.** A call
  binds them by position.
- **A function of no parameters differs from a unit in when it is evaluated.**
  `twopi() = 2 pi()` is called with empty parentheses, as `pi()` is. A
  unit of the same body is written `twopi 2 pi()`. The build evaluates a
  unit once, at the ceiling. Every call
  evaluates the body again, at the working precision of its pass. So a
  function of no parameters names a computed constant without fixing its
  value in the table.
- **A parameter without an annotation takes a plain number.** `x: 1`
  says the same explicitly, and the table gives a parameter without an
  annotation the annotation `1` too.
- **The result's annotation is optional.** Without one, the build infers
  the result's dimension from the body. With one, the build also checks
  the inferred dimension against it ([Annotations](#annotations),
  [Build-time checks](#build-time-checks)).

### The inverse

`~name(p) = body` defines the inverse of `name`. It is optional, and a
function without one cannot be the want. The inverse's parameter stands
for a value of the function, so its dimension is the function's result
dimension. An annotation there could only repeat that dimension or
contradict it, and one written is rejected (`inverseAnnotation`). The
parameter may take conditions.

The two lines may stand anywhere in the file, as every definition may.
By convention they are adjacent. [Build-time checks](#build-time-checks)
has the checks that the build makes of an inverse.

### What the parser keeps

`Definition`, the parser's result for one line, has a `function` form
and an `inverse` form:

- The `function` form holds the name, the parameters, the result's
  annotation, the conditions and the body. Each parameter has an
  optional annotation, and the result's annotation is optional too.
- The `inverse` form holds its function's name, the parameter, the
  conditions and the body.

Each form also holds its span. An annotation and a condition each keep
the text they were written as
([What the parser keeps, and what it rejects](architecture.md#what-the-parser-keeps-and-what-it-rejects)).

No message is worded for a definitions rejection today: only the
predefined definitions file is loaded.

## Annotations

An annotation, the unit a parameter takes, checks a dimension and
changes no value ([Functions](../docs/definitions.md#functions)).
[A quantity carries no unit](../docs/quantities.md#a-quantity-carries-no-unit)
gives the reason: a quantity's scalar is held in the primitives, so
`weight: kg` means "a mass", exactly as `weight: lb` does.

### An argument is accepted as it stands

A call accepts an argument in any unit that conforms to the annotation.
The test is conformance, the test a sum applies to its operands, kinds
included: `x: radian` admits an angle and not a plain number. There is
no conversion step.

### The result has a dimension, not a unit

The result's annotation is a check as well. The want chooses the unit a
value is written in, as for any value, and a blank want gives the
primitives. Say the file defines:

```
pressure(force: lbf, area: in^2): psi = force / area
```

| You type                    | Into  | Exucal shows             | Note                              |
| --------------------------- | ----- | ------------------------ | --------------------------------- |
| `pressure(100 lbf, 4 in^2)` |       | `≈ 172368.93 kg / m s^2` | a blank want gives the primitives |
| `pressure(100 lbf, 4 in^2)` | `psi` | `= 25 psi`               | the want chooses the unit         |

The first row surprises a reader of the head, and it is the design. A
call evaluates to a `Quantity`, which holds no unit, so the result's
annotation does not reach the display. Showing a lone call's value
in the unit of its result's annotation is future work
([Extensions that fit](future.md#extensions-that-fit)).

An author annotates a result `: 1` to have the build check that the body
gives a plain number, as an index is. The body of such a function
divides its units out, as `bmi` does with `weight / kg`. If a division
is left out, the build fails. Without the annotation, the build infers a
result with a dimension and reports nothing. A physical result keeps its
dimension: `kinetic` gives an energy, which converts into `J`, `kcal` or
`ft lbf`.

### An annotation is a unit expression

An annotation only checks conformance. So nothing in an annotation may
read as something that will be applied: not a scale, and not an
operation. Every limit below follows from that.

An annotation is the expression grammar restricted to these:

- unit names, prefixed or not;
- juxtaposition, `*` and `/`;
- `^` with its literal exponent;
- parentheses;
- the number one, written as the single character `1`.

So `kg`, `m/s`, `kg m^2 / s^2`, `1 / s` and `1` are annotations. The
parser rejects anything else, at the text at fault:

- Any other number is an `annotationScale`: `f(x: 2)`, `f(x: 1000 m)`
  and `f(x): kg/2` alike.
- A sum, a difference, a negation or a call is an `annotationNotUnits`.

A number in an annotation reads as a scale to apply, and an annotation
applies none, since conformance ignores the scalar. So `: 2` misleads
under either reading. Read as `: 1`, it deceives a reader who expects a
scale. Read as a scale, it breaks the rule that an annotation changes no
value. The parser rejects the number, and a scale is written in the
body. The `1` is kept because a plain result needs a spelling and
`1 / s` needs a numerator.

A unit's name does not read as a scale to apply, so it is accepted
whatever the unit's scalar. `: percent` asserts a plain number and
multiplies by nothing, as `: lb` asserts a mass and converts nothing.

### Where the annotation's unit matters

An annotation's unit matters beyond its dimension in one place. A
conversion into a function recovers an argument, and the answer writes
that argument as a **count** of the annotation: the argument divided by
the annotation's value ([Display](#display)). So `2 ft` into `twelve` is
`= twelve(2 in)`.

The count is a quotient, so an annotation must be certainly nonzero. An
annotation whose value is zero, or cannot be told from zero, is a build
error (`zeroDeclaredUnit`). The result's annotation is held to the same
rule, so that one rule covers an annotation in either position. An
annotation names units only, so the check can fail only through a unit
of the file: one defined as zero, or one defined as an inexact value
around zero.

### Other readings of an annotation

Three other readings are set aside:

- **A parameter bound to its number in the annotated unit**, as the
  `units=` clause of [GNU units](https://www.gnu.org/software/units/)
  reads: `w: kg` would make `w` the number `w / kg`. That matches how
  empirical formulas are printed. But changing `kg` to `lb` would
  silently change the function, and the body would lose its dimension
  checks. `w / kg` in the body is explicit and survives either
  annotation.
- **An argument required in exactly the annotated unit.** It cannot be
  checked, since a quantity carries no unit.
- **A result shown in a unit built from the parameters' annotations.**
  With `time: min` and `distance: mi`, a pace would show in `min/mi`. A
  result's dimension can be written in the parameters' units in several
  ways or in none, so the annotations do not determine a unit.

## Names and shadowing

[Names](../docs/definitions.md#names) in the user docs states the rules
for the file's names. [Names](architecture.md#names) on the architecture
page describes the namespaces and the check for an ambiguous name.

### A function's name

A function's name is in the namespace that the units, the unit lists and
the built-ins share. A function and a unit of one name are a
`duplicate`, and so are a function and a built-in: a definition may not
take a built-in's name. A table that builds therefore never holds a
defined function and a built-in of one name, and a call's name means at
most one function.

The name must not read as a prefix followed by a unit (`prefixedName`).
Typed as the want, such a name would mean the function, and typed in the
have it would mean the prefixed unit
([The order of the build](architecture.md#the-order-of-the-build)).

An inverse's name is its function's, after the `~`, which no other name
can start with. The build keys an inverse by its function's name,
outside every namespace, and a second `~` line for one function is a
`duplicate`.

### A parameter's name

The place where a name stands decides what the name means:

- In an annotation, a name is a unit. An annotation is evaluated among
  the units alone.
- In a condition and in the body, a name is a parameter first, by its
  exact name, and a unit otherwise.

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
- **A parameter named like a unit that an annotation of its own head names**
  is rejected at the annotation's use of the name
  (`parameterNamesUnit`). In `kinetic(m: kg, v: m/s) = m v^2 / 2`, the
  `m` of `m/s` is the meter and the `m` of the body is the mass. Each
  has one meaning by the rule above, but a reader sees one name mean two
  things on one line. The rejection carries the parameter's name.

The second case fires only when an annotation names the unit, and an
annotation can name only a unit that exists. So a unit added to the file
later never breaks a function that built before.

The second case is an error and not a warning, since the build reports
no warnings. An error can become a warning without breaking any file. A
case accepted in silence could not become an error without breaking the
files that use it. Relaxing the error to a warning is future work
([Extensions that fit](future.md#extensions-that-fit)).

## Conditions

A function or an inverse restricts its arguments by conditions, written
after a `|` in the head and separated by commas
([Functions](../docs/definitions.md#functions)).
[Comparison and equality](../docs/numbers.md#comparison-and-equality)
states when a comparison is decided.

### The grammar of a condition

- **A condition is a chain of comparisons.** Two or more terms are
  joined by `<`, `<=`, `>` or `>=`, with `≤` and `≥` read as `<=` and
  `>=`. The comparisons of one chain point one way. A chain that turns,
  `0 < x > 1`, does not bound `x` as an interval does, and it is
  rejected at the whole chain (`mixedComparison`).
- **Several conditions are a conjunction.** There is no disjunction,
  since the usual case does not need one: a domain in two pieces is one
  condition on an expression, as `abs(x) >= 1` is.
- **There is no equality and no `!=`.** The four comparisons are
  orderings, and `=` ends the head. Both operators are future work
  ([Extensions that fit](future.md#extensions-that-fit)). An equality
  condition could never be decided for an inexact argument: a ball can
  be found apart from another or found to overlap it, and never found
  equal to it.
- **A term is any expression**, calls of the built-ins and of other
  defined functions included. Those calls check their own conditions in
  turn. A unit list is not an expression, and neither is a comparison.
  There are no truth values, so `(x < 1) + 1` is a parse error, and a
  condition is only ever a chain at the top level.

The grammar stays unambiguous, and the text alone still decides it:

- An annotation ends at `,`, `|` or `=`, or at a `)` that closes no
  parenthesis of its own. A unit expression contains none of them.
- A term ends at a comparison, at a comma outside parentheses, or at
  `=`. None of them can continue an expression. A comma inside a call's
  parentheses belongs to the call, by nesting.
- A comparison binds looser than anything in a term, since it is no part
  of the expression grammar. `| a + b < c d` compares `a + b` with
  `c d`, and `| x > -1` compares `x` with the negation of `1`.
- `<=` and `>=` are each one token, read before `<` and `>`.
- `|` appears once, and only in a head.

[Bounds written in the parameter list](#bounds-written-in-the-parameter-list)
has the forms that the `|` clause is preferred to.

### What the build checks of a condition

- **Each condition must mention a parameter**
  (`conditionWithoutParameter`). One that mentions none could only hold
  always or never.
- **Adjacent terms must conform**, as a sum's operands must. The build
  infers each term's dimension with the parameters bound as in the body.
  A failure is a `nonconformingComparison`, which carries the spans of
  both terms and the mismatch. With `x: K`, `| x > 0` is an error, and
  `| x > 0 K` is the condition meant.
- **A call in a function's condition is a dependency**, as a call in its
  body is. So `f(x) | f(x) > 0 = …` is a cycle, reported at build
  ([Build-time checks](#build-time-checks)).

### The check at a call

A call checks its conditions after the arguments conform and before the
body (`checkConditions` in `evaluate.ts`). It evaluates each condition's
terms on balls, with the parameters bound to the arguments.

`decide` compares each adjacent pair of terms and gives a **verdict**:
the comparison holds, fails or is undecided. "Holds" and "fails" are
certain, true of every value within the two balls. A comparison is
undecided when the balls allow both.

The conditions are taken left to right, and the pairs of a chain left to
right, as one conjunction in three-valued logic. Four rules cover every
case:

- **A comparison that certainly fails ends the check.** The call is a
  `conditionFailed`. The error names the function and the condition as
  written, and it carries the argument of each parameter that the
  condition mentions, in the parameters' order. The failure ends the
  check even after an undecided comparison, since one false conjunct
  makes the conjunction false.
- **A term that cannot be computed ends the check when nothing before it is undecided.**
  The call is then a `callFailed`, the error that a failure of the body
  gives.
- **A term that cannot be computed after an undecided comparison leaves its condition undecided.**
  An earlier condition may be a guard. In `| x > 0, ln(x) > 1`, a
  negative argument certainly fails the first condition, and `ln` is
  never reached. When the first condition is undecided, the argument's
  ball reaches below zero, and `ln` cannot be computed on it. The values
  it fails on are the ones the guard excludes, so the failure decides
  nothing.
- **An undecided condition is assumed to hold, and the check goes on.**
  The call records an **assumption** for the condition: the function's
  name and the condition as written
  ([An undecided condition](#an-undecided-condition)).

#### The verdict of one comparison

A comparison is decided on the two balls, with no tolerance. Both sides
conformed at build, and a quantity's scalar is held in the primitives,
so the two scalars compare directly: `x > 30 cm` holds for `1 ft`.

`orderOf` in `ball.ts` finds where the left side lies against the right,
in three cases ([Comparison](numbers.md#comparison) has the mechanism of
each):

- Two exact values are compared exactly and always decide, the bound
  included. The condition `x >= -273.15` holds for the argument
  `-273.15`. A condition `x <= 0.3` holds for `0.1 + 0.2`, since the sum
  is exactly `0.3`.
- An inexact value is compared with an exact one directly, as a ball
  with a point (`position`).
- Two inexact values are compared through their difference, which is
  compared with zero. The difference is formed even where the two are
  too far apart in size to subtract within the significand limit: the
  smaller is then absorbed into the radius of the larger. Only the
  exponent bound keeps a difference from being formed. A difference that
  cannot be formed counts as reaching across zero, and the comparison is
  undecided.

A ball lies wholly on one side of a point, touches it or straddles it. A
**touch** is a ball with one end exactly on the point. A **straddle** is
a ball that reaches across the point. The table gives the verdict for
each place the left side can take against the right, under the names
`orderOf` returns. For two inexact values, the left side is their
difference and the right side is zero:

| The left side against the right                         | `<`       | `<=`      | `>`       | `>=`      |
| ------------------------------------------------------- | --------- | --------- | --------- | --------- |
| `below`: below it throughout                            | holds     | holds     | fails     | fails     |
| `touchingBelow`: below, its upper end exactly on it     | undecided | holds     | fails     | undecided |
| `at`: exactly equal, as two exact equal sides are       | fails     | holds     | fails     | holds     |
| `touchingAbove`: above, its lower end exactly on it     | fails     | undecided | undecided | holds     |
| `above`: above it throughout                            | fails     | fails     | holds     | holds     |
| `straddles`: reaching across it, or of unbounded radius | undecided | undecided | undecided | undecided |

A ball is closed, so an end that lies exactly on the other value leaves
equality possible. An inexact argument that equals a condition's bound
therefore never makes a strict comparison hold. It makes a non-strict
comparison hold only when its ball ends exactly on the bound, from the
side the comparison admits. `approx`, the one operation whose purpose is
to make a value inexact, gives such an argument: the ball of
`approx(-273.15)` straddles `-273.15`, so `tempC(approx(-273.15))` stays
undecided up to the ceiling.

In decimal mode every value is exact. Every comparison decides there,
and no condition is undecided. A condition's terms are no part of a
displayed value. So where decimal mode has extended working digits, it
rounds the terms to the working digits, as it rounds every step but the
last ([The working digits](numbers.md#the-working-digits)).

### An undecided condition

[Functions](../docs/definitions.md#functions) states what a user sees
when a condition cannot be decided. Showing the value rests on how a
condition differs from a built-in's edge. At an edge the value jumps or
does not exist, so a guess would be a wrong value, and
`floor(sqrt(2)^2)` is an error. A condition restricts a body that
usually computes on both sides of the bound, so the body's value is
shown and the doubt is stated.

When a call's check ends with a condition assumed, the call evaluates
the body. The assumptions travel with the value to the retry loop.

#### The retry loop tries more digits first

A result that carries an assumption is not final. The retry loop keeps
it as the best so far and computes again at more digits
([Passes and errors](architecture.md#passes-and-errors)). A coarse pass
may leave a condition undecided only because its radius is wide, and a
finer pass decides such a condition.

A later pass may decide against the argument. The loop then ends with
that error, and not with the earlier result that rested on the
assumption.

#### A body that fails under an assumption

A body that fails under an assumption reports the assumption, since the
assumption may have caused the failure. The call is then an
`undecidedCondition`, which names the condition and carries the body's
error. The retry loop continues on it. It continues the same way on an
`unresolved`, the error of a value that cannot be told from an edge, at
any depth inside a body.

A body that fails under no assumption is a `callFailed`.

#### The warning at the ceiling

If an assumption remains at the ceiling, the outcome shows the value all
the same:

- Every line's relation, `=` or `≈`, becomes `≈`, whatever its digits.
- A **warning** beside the lines names each assumed condition, one
  warning for each distinct wording.

A warning is not a note, the remark on digits that follows a line. The
converter, the component of the two fields, styles a warning differently
from a note, so that it is not read as one. A warning belongs to the whole
answer and not to one line. So every output mode carries it alike,
whether the answer is a ratio, a sum, a call or the primitives.

Say the file defines these two functions. The table shows them at the
default settings:

```
nonneg(x) | x >= 0 = x
recip(x) | x > 0 = 1 / x
```

| You type                         | Into    | Exucal shows                                                                           | Note                                                                             |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `nonneg(1 + 1e-40 - exp(1e-40))` |         | an error: `nonneg` requires `x >= 0`                                                   | about `-5e-81`: undecided at the first passes, certainly negative at a later one |
| `nonneg(sqrt(2)^2 - 2)`          |         | `≈ 0 (within 4e-4049 of zero)`, with a warning                                         | undecided at every pass                                                          |
| `recip(sqrt(2)^2 - 2)`           |         | an error: could not tell whether `x > 0`, and assuming so, the body cannot be computed | the body fails under the assumption, at every pass                               |
| `recip(-1)`                      |         | an error: `recip` requires `x > 0`                                                     | a failure that is certain                                                        |
| `tempC(approx(-273.15))`         |         | `≈ 0 K (within 2e-4047 of zero)`, with a warning                                       | the condition of `tempC`                                                         |
| `tempC(approx(-273.15))`         | `tempF` | `≈ tempF(-459.67)`, with two warnings                                                  | the condition of `tempC`, and that of `tempF` on its argument                    |

#### The collector of assumptions

An assumption travels in a collector:

- `evaluate`, the evaluator's entry point, takes an optional array. Each
  call of a defined function that it evaluates, at any depth, adds its
  assumptions to the array once its body has computed.
- A call gathers its own assumptions and its body's separately from its
  caller's. A body that fails under one is thereby told from a body that
  fails under none.
- The assumptions of calls in a condition's terms are kept with the
  condition's own.
- A pass that fails drops its assumptions with it.
- `resolve`, the retry loop, gives each pass a fresh collector. It hands
  the assumptions of the pass it returns to `evaluateText` and
  `convertText`, the pipeline's two entry points, which take an optional
  collector of their own. The outcome turns them into the warnings.

#### What a condition costs

A condition has no effect beyond its verdict, and it costs what the same
expression typed inline costs. A call evaluates its conditions at every
pass, as it evaluates its body. Evaluating one changes nothing but the
memos of constants that any expression fills
([Memoized constants](numbers.md#memoized-constants)).

A condition that restates an identity, `| x - x >= 0`, holds for every
argument on paper. On an inexact argument the two uses of `x` read one
ball as two independent values, so the difference straddles zero at
every precision
([Identities and cancellation](../docs/numbers.md#identities-and-cancellation)).
Every such call runs to the ceiling, and its value is shown with the
warning. The build cannot detect such a condition in general.

#### An undecided condition at build

The build evaluates a unit's body, so it checks the conditions of a call
in that body, at the ceiling
([The order of the build](architecture.md#the-order-of-the-build)).
`cold tempC(-300)` fails the build with the condition it breaks. A
condition left undecided there fails the build too, as in
`cold tempC(approx(-273.15))`: the error is the build's
`undecidedCondition`, which carries no error of a body. A unit's value
has nowhere to carry a warning, and no later pass could decide the
condition, since the table is built at the ceiling.

### No condition on a result

Conditions restrict arguments only. The build checks a function's result
for its dimension. Nothing checks the result's value against a range, at
the call or anywhere downstream.

A condition on a result is ruled out for two reasons:

- It would check the author's body against the author's own claim, at
  every call, on a ball, where it could be undecided. The check of a
  result's dimension is a check of the same sort, made once, at build,
  for every argument at once.
- Nothing would use the range. No part of the evaluator narrows a value
  by what is known of its range, and a value's ball is all that the rest
  of an expression learns of it. A built-in can use what it knows of its
  own range, in its own code. A defined function is a composition and
  has no such code.

The `range=` clause of GNU units has no counterpart here. Ranges that
narrow a result's ball are future work
([Extensions that fit](future.md#extensions-that-fit)).

## Calls

[Calls and arity](../docs/expressions.md#calls-and-arity) states the
call rule: a name directly followed by `(` is a call, and a space
between them makes a juxtaposition.
[Functions](../docs/definitions.md#functions) states what a call of a
defined function does.

The parser decides a call from the text alone, so it cannot say whether
the name is a function. The lookup, which resolves the names of an
expression against the table, reports the two errors about the name:

- A call of a name that is no function is a `notAFunction`. The error
  carries what the name is otherwise: a unit, a prefixed unit or
  nothing. For a unit, the message shows the product that a space would
  make, written from the call's span: `kg(m/s)` gets `kg (m/s)`. A name
  that is neither a unit nor a function is reported as an unknown
  function.
- A bare function name in an expression is not a unit. `tempC` alone, or
  `2 tempC`, is a `functionAsUnit`. The error carries the number of
  arguments the function takes, so that the message can show the call
  form.

A call of a defined function evaluates in five steps, and the first
failure ends it:

1. The name resolves through the lookup, to a defined function or to a
   built-in.
2. The call must give as many arguments as the function has parameters
   (`arityOf` in `table.ts`). Another number is an `arityMismatch`,
   found before any argument is evaluated.
3. The arguments are evaluated left to right, each once. Each argument
   is checked as soon as it is evaluated. It must conform to its
   parameter's annotation, or be a plain number without one. A failure
   is an `argumentMismatch`, reported before any later argument is
   evaluated. The error carries the parameter and the number of
   parameters, so that the message names the parameter only where there
   is more than one.
4. The conditions are checked
   ([The check at a call](#the-check-at-a-call)).
5. The body is evaluated with each parameter bound to its argument's
   ball (`evaluateBound`). A bound parameter is resolved before any unit
   or prefix, and every other name goes through the table's lookup. A
   failure of the body is a `callFailed`, which names the function and
   carries the body's error, or an `undecidedCondition` under an
   assumption ([An undecided condition](#an-undecided-condition)).

Nothing is kept from one call to the next: the body is evaluated at
every call, at every pass
([Precision, the radius and cost](#precision-the-radius-and-cost)).

A body's error has spans into the definitions text, which a user does
not see, so a message describes it without quoting text
([Where each error points](architecture.md#where-each-error-points)).

The call does not check the result's dimension, since the build checked
or inferred it once.

## A function as the want

[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states what the conversion answers with and the checks a user meets.

For a want of one bare name, the pipeline first looks among the defined
lists, then among the defined functions. It evaluates any other want as
an expression ([The output modes](architecture.md#the-output-modes)). A
list, a function and a unit cannot share a name, so the order changes
nothing. For a function, each pass takes these steps
(`convertToFunction`):

1. The function must have an inverse. A function without one is a
   `noInverse` on the want side.
2. The have must conform to the function's result dimension. A failure
   is the ordinary mismatch of the pair.
3. The have is checked against the inverse's conditions, as an argument
   is at a call. A condition that certainly fails is a
   `wantConditionFailed`, of the inverse. An undecided condition is
   assumed and warned of.
4. The inverse's body is evaluated with its parameter bound to the have
   (`invertFunction`). Its value is the **recovered argument**. A
   failure is an `inverseFailed`, which carries the body's error.
5. The recovered argument is checked against the function's conditions,
   in the same way (`wantConditionFailed`, of the function).
6. The function is applied to the recovered argument (`applyFunction`).
   A value certainly other than the have is an `inverseMismatch` on the
   want side, and so is a failure of the function's body there. Two
   exact values are compared exactly. Any other two certainly differ
   when their difference lies wholly on one side of zero (`disjoint`).
7. The count is computed: the recovered argument divided by the value
   of the parameter's annotation.

The message of a `noInverse` names the form that would give the function
an inverse:

```
"normcdf" has no inverse, so it cannot be the unit to convert to. Define "~normcdf(y) = …" to give it one.
```

The count is the one value shown, so it is the last step of the
conversion. Steps 3 to 6 compute and check its operand, the recovered
argument. Where decimal mode has extended working digits, it therefore
rounds steps 3 to 6 to the working digits and the count to the display
digits
([The working digits](numbers.md#the-working-digits)).

Applying and inverting are one operation, a body evaluated under a
binding, which `applyFunction` and `invertFunction` share.

### The check of the inverse

Step 6 checks at a conversion what no check at build can: that an
inverse inverts. The check refutes a wrong answer. It does not prove
that the inverse inverts:

- If the function's value at the recovered argument lies wholly apart
  from the have, no point of the recovered argument's ball gives the
  have, and the answer is certainly wrong.
- An overlap proves nothing. For inexact values, balls can decide an
  overlap and cannot decide equality. And an answer that is right for
  one have says nothing of another.

So every answer shown has passed the check at the precision it is shown
at. An inverse that is wrong elsewhere is caught when a conversion
reaches the values where it is wrong. An inverse that is wrong by less
than the radii of the two values compared passes, since the check cannot
see an error smaller than its own uncertainty.
[Inverses](../docs/definitions.md#inverses) shows a wrong inverse
caught.

The check costs one evaluation of the function at each pass of a
conversion, in addition to the one evaluation of the inverse. Nothing else pays
it, since a conversion is the only use an inverse has. Three
alternatives are set aside:

- Trusting the inverse gives a confident `=` for a wrong one.
- Checking the inverse once, lazily, says little about the next value.
- Sampling the inverse at build is a heuristic. It meets domain errors
  at its samples, and it costs load time at the ceiling.

### The conditions of an inverse

The inverse's conditions restrict the haves that the conversion accepts
(step 3). One is worth writing where the inverse's body would otherwise
fail less clearly. Say the file defines two functions that differ only
in that condition:

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

### What the conversion carries

The pipeline returns a `Conversion`, and the one for a function carries
these:

- the have, as read and as evaluated;
- the function's name;
- the recovered argument;
- the parameter's annotation, with its text;
- the count.

So the outcome does no arithmetic.

### A count that is refused

The count is a quotient, and it can be refused as a conversion's ratio
can: at the exponent bound or at the significand limit. The conversion
then fails with that refusal. Say the file defines a unit with a long
significand and a function annotated with it:

```
wide 5^20000 m
span(x: wide) = x
~span(y) = y
```

| You type            | Into   | Exucal shows                                                            | Note                                                              |
| ------------------- | ------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `3 m`               | `span` | `≈ span(1.1940831e-13979 wide)`                                         | the exact count needs about 20,000 bits, within the default limit |
| `3^30000 m`         | `span` | refused: the count's exact significand would pass the significand limit | it needs about 67,500 bits, in exact mode at the default limit    |
| `approx(3^30000 m)` | `span` | `≈ span(1.7280443e+334 wide)`                                           | an inexact have gives an inexact count, which is rounded          |

The refusal's message names `approx` as the remedy.

### Where a function's name is not the want

A function's name is the want only when it stands alone. In a typed
list, `tempC;degC`, it is a `functionAsUnit`, as it is in an expression
([Calls](#calls)). A defined list's name in the same place is an unknown
unit. A want that is a call, `tempC(100)`, is not a conversion into a
function. It is an expression, and the conversion is the ratio, with a
reciprocal line.

## Display

[Conversion into a function](../docs/quantities.md#conversion-into-a-function)
states the line: the have, then the call at the recovered argument, with
no reciprocal line. The line carries no note, which is a defect: a count
that certifies fewer digits than asked is shown with `≈` alone
([A function's line](architecture.md#a-functions-line)).

The outcome writes the line from the conversion alone (`functionResult`
in `outcome.ts`):

- The argument is the count, written as any value is, at the display
  digits and in the rounding mode.
- The annotation follows the count, as a unit follows its number:
  `2 in`. The printer, which writes an expression back as text, writes
  the annotation from its expression, as it writes a want. So an
  annotation written `(in)` shows as `in`.
- An annotation whose text is `1` adds no unit, so an argument that is a
  plain number is written bare. A parameter without an annotation has
  the annotation `1` in the table, so the one test covers both. The
  outcome reads the text for nothing else.
- The line takes the count's relation: `=` when the count shows exactly
  at the display digits, as for any value.
- Under the ratio notation an exact count may be a ratio. A ratio is
  written bare inside the call for a plain number, and parenthesized
  before its unit as it is anywhere else
  ([Where a ratio is written](notation.md#where-a-ratio-is-written)).
- A negative count keeps its sign inside the call. The call itself is
  never negated.

Say the file defines `twelve(n: in) = 12 n` and its inverse,
`~twelve(len) = len / 12`. The ratio notation is at its default width:

| You type     | Into     | Notation | Exucal shows              | Note                                   |
| ------------ | -------- | -------- | ------------------------- | -------------------------------------- |
| `tempF(212)` | `tempC`  | digits   | `= tempC(100)`            | a plain number, so no unit             |
| `2 ft`       | `twelve` | digits   | `= twelve(2 in)`          | the count before its annotation        |
| `-2 ft`      | `twelve` | digits   | `= twelve(-2 in)`         | the sign inside the call               |
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

The build evaluates a unit and checks a function when another definition
first needs it, or else when the file's order reaches it. That mechanism
is the walk ([The walk](architecture.md#the-walk)). A
function is an entry of the walk. So a unit may be defined by a call, a
body may call another function, and a cycle through a function is
reported like any other. Checking a function takes four steps:

1. Each parameter's annotation is evaluated among the units alone. Each
   must be certainly nonzero ([Annotations](#annotations)).
2. The body's dimension is inferred by `dimensionOf` in
   `dimension-of.ts`, with each parameter bound to its annotation's
   dimension, and dimensionless without one. The dimension inferred is
   the function's result.
3. The dimension of each condition's terms is inferred in the same way,
   and each condition is checked ([Conditions](#conditions)).
4. The result's annotation, when there is one, is evaluated under the
   rule of step 1, and the body's dimension is checked against it. A
   failure is a `functionMismatch`, which carries the function's
   definition.

`dimensionOf` applies the evaluator's rules over dimensions alone,
through the walk's own lookup:

- A number is dimensionless.
- A unit is its dimension.
- A sum's operands must conform.
- A product has the product of its factors' dimensions, and a power has
  its base's dimension raised to the exponent.
- A call checks the number of its arguments and applies the callee's
  rule: a defined function's annotations, or a built-in's dimension
  rule.

So a name that means nothing, a sum whose operands do not conform, or a
call with the wrong number of arguments or a wrong dimension is an
ordinary build error, with its span in the definitions text.
`wave(x) = sin(x)` fails the build, since `sin` takes an angle
(`builtinArgument`), and `wave(x: radian) = sin(x)` builds.

The inferred dimension is the result's for every argument, because no
rule above reads a value. The exponent of `^` is a literal and never a
parameter, and a built-in's dimension rule reads its arguments'
dimensions alone.

### An inverse

An inverse is not an entry of the walk, since nothing can refer to it.
It is checked in its place in the file's order:

1. An inverse of no defined function is found as soon as the definitions
   are indexed, before any body is looked at (`orphanInverse`).
2. The inverse's function is requested from the walk. The request comes
   from outside any evaluation in progress, and a cycle is a request for
   a definition whose evaluation is in progress. So the request can
   close no cycle, and an inverse may call its own function, in its body
   or in a condition.
3. The function must have exactly one parameter (`inverseArity`
   otherwise, for none as for several). A conversion recovers one
   argument from one value.
4. The conditions are checked as a function's are, with the inverse's
   parameter bound to the function's result dimension.
5. The body's dimension is inferred under the same binding and checked
   against what the function's parameter takes. A failure is a
   `functionMismatch`, which carries the inverse's definition.

The checked inverses are attached to their functions at the end of the
build. The table holds each function as `UnitFunction` in `table.ts`,
and [The walk](architecture.md#the-walk) lists what that holds.

### The check evaluates no body

The check of a function or of an inverse never evaluates the body. The
build runs a body only where a definition that it evaluates, such as a
unit's, calls the function. A body that fails at some value, or at every
value, builds and fails at the call that reaches it. `ln(x - 1)`,
`asin(x + 1)` and `1 / ln(x)` each fail at some value, and each is a
fine function. Evaluating a body at a value chosen by the build would
reject such functions.

Of the numbers in a body, the build holds only a `^` exponent to the
significand limit:

- **A literal is not checked.** A body may hold a literal with more
  digits than the significand limit allows. It builds, and it fails at
  the call. Such a literal is still within the hard bound, the most the
  significand limit can be set to. The parser refuses a longer one as it
  is typed.
- **A `^` exponent is checked.** `dimensionOf` reduces it to one
  fraction within the significand limit, as the evaluator does
  (`reduceExponent`). The power's dimension depends on the exponent, and
  the build's context supplies the limit. `huge(x) = x^(1e30000)` fails
  the build at the default limit.

## Precision, the radius and cost

[Functions](../docs/definitions.md#functions) states what a call costs a
user, and
[Identities and cancellation](../docs/numbers.md#identities-and-cancellation)
gives the examples: a parameter used twice, which reads one ball as two
independent values, and a function written by hand in place of a
built-in.

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

A definition can add no operation of its own: no series and no loop. It
can only compose operations that already bound their own error, so
certifying a call needs no new rule for the radius. Three things hold
for a call as they hold for its body typed out:

- **Calls are not memoized.** A body that calls a function twice
  evaluates it twice. Nesting such calls `k` levels deep evaluates the
  innermost `2^k` times, at every pass. The same expression written out
  in full costs as much, so a call sets no new limit. A definition that
  reads small can still be large.
- **A composition rounds at every operation.** A built-in is one routine
  of the kernel, the layer that computes the inexact functions
  ([The kernel](numbers.md#the-kernel)). The routine computes with as
  many bits as its result needs, plus guard bits. Its radius comes from
  one bound over the whole ball, its exact cases are recognized, and its
  own edges are handled. A composition rounds at each step and adds each
  rounding to the radius. The retry loop still certifies its digits, in
  more passes, unless it reaches the ceiling first.
- **Decimal mode rounds each step of the body** to the working digits,
  as it rounds the same expression typed inline. `f(x)` is the hand
  calculator's sequence of keystrokes, not a correctly rounded `f`
  ([Decimal mode](numbers.md#decimal-mode)).

The build of a file of functions grows linearly with their number. Each
function's line is parsed once, each function is checked once however
many functions call it, and each inverse is checked once against its
function. A benchmark guards that growth. It parses and builds a file of
500 functions, each calling an earlier one and each with an inverse,
then a file of 2,000. It allows a margin: it asserts that neither step
costs more than eight times as much for four times the functions.

## Not in this design

A design listed here is excluded on purpose. The user docs state three
of the exclusions as rules: no expression calls an inverse
([Inverses](../docs/definitions.md#inverses)), no condition bounds a
result ([Functions](../docs/definitions.md#functions)), and no
definition takes a built-in's name
([Names](../docs/definitions.md#names)).

- **A call of an inverse in an expression**, `~tempC(373.15 K)`. An
  inverse is applied by a conversion alone. A call of one would change
  the call's grammar and its lookup. Each use would also need the check
  that a conversion makes, the function applied back at every pass,
  since nothing else checks that an inverse inverts.
- **A disjunction in a condition**
  ([The grammar of a condition](#the-grammar-of-a-condition)).
- **A condition on a result's value**
  ([No condition on a result](#no-condition-on-a-result)).
- **A built-in defined in the file.** A definition of a built-in's name
  would need a rule for which of the two a call means. It is a
  `duplicate` instead ([A function's name](#a-functions-name)).
- **A bare number as the answer of a conversion into a function.**
  `tempF(212) = 100` does not say what `100` is, and the line does not
  parse back.
- **A display name on a function**, so that a reading shows as `100 °C`
  and not as `tempC(100)`. `100 °C` does not parse back.
- **A call decided by the table**, so that `kg (m/s)` and `kg(m/s)` read
  alike ([The head](#the-head)).

Future work on defined functions is described in
[Extensions that fit](future.md#extensions-that-fit).

## Alternatives considered

[Grammar](../docs/definitions.md#grammar) states the syntax as it is. An
alternative listed here does what the design does, in another way, and
is set aside for what it loses.

### Other forms of a function's line

- **A bracketed head**,
  `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`. It declares the
  argument's and the result's units in brackets, both required. The
  inverse follows a `;`, and in it the function's own name stands for
  its value. In that form a function takes one argument. A variant for
  several parameters, `kinetic(mass, v) [kg, m/s; J] …`, matches
  annotations to parameters by position, all or nothing, and has no
  place for bounds.
- **Annotated signatures with the inverse after a `;`.** The function's
  own name still stands for its value there, so one name means two
  things on the line. The inverse also crowds the line.
- **Keyword clauses**, as GNU units writes them,
  `units=[…] domain=[…]`. They lengthen every line and add ways to get
  one wrong.
- **A multi-line block.** It makes the file sensitive to indentation for
  one form of definition.

With the inverse on a line of its own, a function has no inverse slot to
leave empty, and adding an inverse adds a line.

### Bounds written in the parameter list

- **Comparisons around the parameter**, `f(0 K <= x: K <= 100 K)`. They
  wedge the annotation between the bounds, so that `K <= 100 K` reads as
  a comparison of its own. They leave no place for a condition that
  relates parameters.
- **Interval notation after the parameter**, `f(x: K [0 K, 100 K))`. It
  puts a half-open `)` inside the head's own parentheses and makes an
  open side easy to miss.
- **A lower bound always on the left**, `f(0 < x)`. Its merit is one
  spelling for each bound. It does not accept `x > 0`, the usual way to
  write a positive argument.

The `|` clause keeps the parameter list clean, reads the same in every
case, and takes relations between parameters with no new syntax.

### An inverse found by the calculator

A function could be inverted with no written inverse, by a search for
the argument that gives the have. A search gives a candidate, and the
radius of the answer has to be certified. Certifying a root of a
composition needs monotonicity, or an enclosure of the derivative over
the range searched, and the evaluator has neither. So the inverse is
written by the author and checked at each use
([The check of the inverse](#the-check-of-the-inverse)).

### An offset in `Quantity`

A temperature reading could be a unit with an offset, held in
`Quantity`.
[Temperature and logarithmic levels as functions](../docs/quantities.md#temperature-and-logarithmic-levels-as-functions)
gives the reason a user needs: every operation would need a rule for an
offset. `Quantity` holds a scalar and a
dimension and nothing else, so each operation on quantities is the arithmetic of
balls with a rule for dimensions. An offset would be a third part, with
a rule of its own in sums, products, powers, conversion and every
built-in. A function with an inverse needs nothing new, since the offset
lives in a body.

## Where it lives

These modules hold the defined functions. The first seven are in
`src/core/`, and the others in `src/`:

- `definitions.ts` holds the head's parser, the annotation's grammar,
  the `~` line and the conditions. It holds the rejections of the
  definitions parser and the `function` and `inverse` forms of
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

`definitions.test.ts` holds a seeded property test of the head's parser.
It draws hundreds of function and inverse lines, with none to three
parameters and none to two conditions, and checks that each parses to
what it was built from. It then injects five faults into each line where
they apply, and checks that each is rejected at the text at fault:

- a chain of comparisons that turns (`mixedComparison`);
- a scale in an annotation (`annotationScale`);
- a parameter named again (`duplicateParameter`);
- an annotation on an inverse's parameter (`inverseAnnotation`);
- `[D]` after the name (`unsupported`).

The test draws neither of the parser's two other rejections,
`annotationNotUnits` and `parameterNamesUnit`. Tests written by hand
cover those.
