# Functions in the definitions file

Status: implemented; "Implementation notes" at the end records where the
code departs from the text. The goal is `tempC` and `tempF` for temperature
readings, defined in `src/units.txt` the way GNU units defines them,
without adding anything to the core that only temperature needs.

## The problem

GNU units defines a nonlinear unit as a pair of expressions, the function
and its inverse, and declares the units of its argument and its result:

```
tempC(x) units=[1;K] domain=[-273.15,) range=[0,) x K + stdtemp ; tempC + (-stdtemp)
```

The argument is a plain number, and the body gives it a dimension: `x K`.
Typed as the want, the bare name `tempC` applies the inverse, which takes
a temperature in kelvin and gives the plain number back. That is fine for
GNU units, which prints a number and nothing else, but this converter
writes every answer as a quantity, `value` beside the want, so that the
line reads as the expression it is and can be typed back as a have. An
inverse yields no unit to write beside its value, and `100 tempC` would
read as a product with something that is not a unit.

## The design in one line

A want that names a function is answered by writing the call that would
produce the have: `tempF(212) = tempC(100)`. The function itself is the
"unit" of the answer, and the recovered argument stands inside it, written
in the unit the definition declares for the argument. Nothing about the
answer is a bare number, and the line can be typed back as a have.

Everything below follows from that: the definition form has to declare the
argument's unit, since the display writes the argument in it; a call has
to be an expression, so that a have can contain one; and the pipeline has
to know a function want from a unit want, as it already knows a list want.

## Definitions

A function definition is a name with a parameter in parentheses, the
declared units of the argument and the result in brackets, then the
forward body, `;`, and the inverse body:

```
tempC(x)  [1;K]  x K + 273.15 K       ; tempC / K - 273.15
tempF(x)  [1;K]  (x + 459.67) degF    ; tempF / degF - 459.67
```

- **The name form selects the definition**, as a trailing dash selects a
  prefix: `name(param)` followed by the required whitespace. The parameter
  is a name.
- **The declaration** `[argument;result]` is two expressions, each
  evaluated like a body, and is required: the display writes the argument
  in it, and the checks below need it. The argument's text is kept as
  written, as a unit list keeps the text of its items, and `1` declares a
  plain number.
- **The forward body** is an expression in which the parameter stands for
  the argument. **The inverse body** is an expression in which the
  function's own name stands for its value, as in GNU units, so that
  `tempC / K - 273.15` reads as "the temperature in kelvin, less 273.15",
  a plain number, as the declaration requires. A bound name is resolved
  before any unit or prefix.
- **`;` between the bodies** is the same separator a unit list uses. There
  is no conflict: the name form has already chosen the function grammar,
  which reads exactly two bodies.

A function's name lives in the unit namespace, with units and lists: a
function and a unit of one name are a duplicate. It must not read as a
prefix followed by a unit, by the rule and for the reason that a list's
name must not: typed as the want, `ms` would mean the inverse, and typed as
the have, milliseconds.

`Definition` gains a `function` kind: the name, the parameter, the two
declared units (expression and text), the two bodies, and the span.

## Calls in expressions

A call is a name immediately followed by `(`, an expression, and `)`, with
no space between the name and the parenthesis. It is an atom like a name,
so `2 tempC(100)`, `tempC(100)^2` and `-tempC(100)` mean what they look
like, and the argument is any expression: `tempC(20 + 5)`, `tempC(x)`
inside another definition.

**Decision: a call is decided by the text alone.** The parser cannot ask
the table whether `kg` is a function, since parsing never touches the
table; GNU units decides in its lexer, which has the table. The
alternative, parsing every `name(...)` as one node and letting the
evaluator multiply when the name is a unit, would change what
`kg(m/s)^2` means, so the rule is lexical: no space before `(` is a call,
a space is a product. `kg (m/s)` stays the product it is today, and
`kg(m/s)` becomes a call of `kg`, which is not a function. That is the
one whitespace-sensitive rule in the grammar, and the one way existing
input changes meaning; nothing in `src/units.txt` writes a product that
way. `Expr` gains a `call` node: the name with its own span, and the
argument.

Since a call of a unit is the likeliest mistake, the failure has to say
what happened. The name of a call resolves among the functions alone, and
when there is none the error, `notAFunction`, carries the name, its span,
the span of the whole call, and what the name is otherwise: a unit, a
prefix followed by a unit, or nothing. The message says which, and for a
unit shows the product the user probably meant, with the space:

```
kg(m/s)       "kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.
km(2)         "km" is a unit, not a function. For a product, write "km (2)", with a space.
foo(2)        Unknown function "foo".
```

The check is the evaluator's, since only the table knows the names, and
the input is marked invalid on the side the call is on, as any unknown
unit is.

A call evaluates in four steps, and the first failure ends it:

1. The name resolves among the functions; a name that is not one is the
   `notAFunction` error above.
2. The argument evaluates as any expression.
3. The argument must conform to the declared argument unit, by the same
   check a sum applies to its operands; a failure is an `argumentMismatch`
   at the call, carrying the conformance error with the argument's
   dimension as its have and the declared one as its want.
4. The forward body evaluates with the parameter bound to the argument.
   Its failures (a division by zero for some value, say) carry spans into
   the definitions text, which the user cannot see, so they come back as a
   `callFailed` at the call, naming the function and carrying the body's
   error.

The result is a quantity like any other, and the rest of the expression
goes on as before. The declared result is not checked here: the build has
checked the body against it once, and a body's dimension does not depend
on the value of its argument.

A bare function name in an expression is not a unit: `tempC` alone, or
`2 tempC`, is an unknown unit, and the message says the name is a function
and shows the call form.

## A function as the want

The pipeline already reads a want of one bare name specially when the name
is a unit list. A name that is a function comes next, before the name is
read as a unit:

1. The have must conform to the declared result; a failure is the ordinary
   conformance error of the pair, so the existing wording holds:
   `"3 ft" has dimension m, but "tempC" has dimension K`.
2. The inverse body evaluates with the function's name bound to the have.
   A failure is an `inverseFailed` error on the want side, naming the
   function and carrying the body's error, as `callFailed` does.

`Conversion` gains a `function` kind: the have, the want's text, the
recovered argument, and the declared argument unit with its text. A
function name is not a unit anywhere else: in a unit list (`tempC;degC`),
it is an unknown unit, as a list's name is.

A want that is a call, `tempC(100)`, is not special: it is an expression,
evaluates to a temperature in kelvin, and the conversion is the ratio, as
for any unit with a magnitude.

## Display

A function conversion is one line, `have = name(argument)`. The argument
is written as a count of the declared argument unit, the exact ratio of
the two magnitudes, followed by the unit's text by the rule a want's text
follows (`× 1000 ft` after a number, parentheses around a sum), and by
nothing when the declared unit is `1`:

```
tempF(212) = tempC(100)
300 K = tempF(80.33)
tempF(-40) = tempC(-40)
```

The relation is `=` when the count shows exactly at the display precision,
as for any value. There is no reciprocal line: a function conversion is not
a ratio, so there is no other way round, as there is none for a list.

The other directions need nothing new. A call as the have with a blank
want shows its value in the primitives, `tempC(100) = 373.15 K`; with a
unit want it is a ratio and gets its reciprocal, `K ≈ 0.0026798874
tempC(100)`, which reads correctly since a call starts with a letter; and a
difference of two calls is a temperature interval, `tempC(100) - tempC(0)`
into `degF` being `180`.

## Build-time checks

Function definitions join the walk as nodes whose value is the checked
function, so that a unit may be defined by a call (`boiling  tempC(100)`),
a function's body may call another function, and a cycle through a
function is reported like any other. Checking a function means:

1. Evaluating the two declared units.
2. Evaluating the forward body with the parameter bound to one of the
   declared argument unit, and the inverse body with the name bound to one
   of the declared result unit, each through the walk's own lookup. A
   failure is an ordinary build error, with its span in the definitions
   text, where it belongs.
3. Checking that the forward body conforms to the declared result and the
   inverse body to the declared argument; a failure is a
   `functionMismatch` build error: the definition, which body, and the
   conformance error.

Step 2 catches a body that fails for every argument, and step 3 a body
whose dimension does not match its declaration, both at load time, so
that a call at run time can fail only on its argument (`argumentMismatch`)
or on a value (`callFailed`). A body that fails only at the value one
(`1 / (x - 1)`) fails the build; that is accepted, since no function in
sight is like that. The bodies are not evaluated further at build time:
the table holds them as expressions, and a call evaluates the forward
body afresh, resolving units through the table's lookup, which applies the
same name rule the build did.

## Where it goes

- `src/core/expr.ts`: the `call` node and its grammar, a name directly
  followed by `(`.
- `src/core/definitions.ts`: the `function` definition and its grammar.
- `src/core/table.ts`: `functions` beside `units` and `unitLists`, the
  `UnitFunction` type, and the lookup over it.
- `src/core/evaluate.ts`: `Lookup` resolves functions too; the `call`
  case; `invertFunction` for the pipeline, since applying and inverting
  are both a body evaluated under a binding.
- `src/core/build.ts`: functions in the index, in the walk, and the checks
  above.
- `src/core/pipeline.ts`: the function want, the `function` conversion,
  and its errors.
- `src/unit-converter.ts`: the `name(argument)` line, with no reciprocal.
- `src/messages.ts`: wording for the new errors.
- `src/units.txt`: `tempC` and `tempF`; the interval units' comment loses
  its "yet".
- Tests: each module's own; `units.test.ts` converts `tempF(212)` to
  `tempC`, `tempC(100)` to `K` and `300 K` to `tempF`, and rejects
  `tempC(1 m)`.
- README.md and ARCHITECTURE.md: the definition form, calls, the function
  want and the display; "Later" loses its functions item.

## Not in this design

- **Domain and range** (`domain=[-273.15,)`): `tempC(-300)` gives a
  negative kelvin value rather than an error. A later addition, as two
  optional bounds on the definition, checked at the call and at the
  inverse.
- **Inverse calls in expressions** (`~tempC(373.15 K)`), which would let a
  function's inverse be written in terms of another's. `tempF` is defined
  on its own instead.
- **Built-in functions** (`ln`, `sqrt`): the "special function" of
  ARCHITECTURE.md ("Precision and rounding"), which would take the working
  precision. They need only the `call` node.
- **A function without an inverse**, or with several parameters.

## Alternatives considered

- **Affine units**: an offset on `Quantity`, so that `degC` could be a
  reading. Every arithmetic operation would need a rule for offsets, and
  the interval units would have to change meaning or double. GNU units'
  functions cover the case without touching quantities.
- **A bare number as the answer**, as GNU units prints: `tempF(212) = 100`.
  It does not say what the number is, and cannot be typed back.
- **A display name on the function** (`100 °C`): another thing to declare,
  for a line that can no longer be typed back, when the call form is
  already the notation the user typed.
- **Deciding calls by the table**, so that `kg(m/s)` stays a product: it
  makes the parser depend on the table, which the architecture rules out.
  See the decision under "Calls in expressions".

## Implementation notes

Where the code departs from the text above, and why:

- **The declared units must be nonzero.** A recovered argument is written
  as a count of the declared argument unit, which a unit of zero cannot
  be, so the build rejects a declared unit of zero (`zeroDeclaredUnit`)
  rather than leave the display to fail. The result unit is held to the
  same rule for symmetry.
- **The prefixed-name check is one error for lists and functions.** The
  build error `prefixedListName` became `prefixedName`, carrying either
  definition, since the rule and the reason are the same.
- **A function used as a unit is its own error**, `functionAsUnit`, beside
  `unknownUnit`, rather than a field on it, so that the existing error and
  its tests stay as they were; the message shows the call form as
  described.
- **`callFailed` carries the body's own error only.** The evaluator is
  generic in the lookup's error type, and a type that carries that type
  inside `callFailed` would have to refer to itself through a generic
  alias, which TypeScript does not allow. So a body is evaluated through a
  lookup whose failures are boxed, the evaluator's own failures are
  wrapped in `callFailed`, and a lookup failure inside a body, which a
  built table cannot produce, is passed up unchanged. `applyFunction` and
  `invertFunction` return the two apart (`BodyError`), so that the build
  can report a body's failure with its span in the definitions and the
  pipeline can wrap it as `inverseFailed`.
- **`Lookup` is an object** with `unit` and `function` resolvers, and the
  function resolver is given the span of the whole call as well as the
  name's, since `notAFunction` carries both and the evaluator returns a
  lookup's failure unchanged.
- **The `function` conversion also carries the count.** Beside the have,
  the name, the recovered argument and the declared unit, it carries the
  argument as a count of that unit, so that the UI does no arithmetic.
- **The example `tempC` inverse in the first draft**, `tempC - 273.15 K`,
  gave a temperature where a plain number was declared, and the build
  check of step 3 rejected it, as it should; it is `tempC / K - 273.15`
  above.
