# Architecture

A unit converter in the style of GNU units. The user types a quantity to
convert (**have**) and a unit to convert it to (**want**); the app answers with
the converted value, or with an error saying why the two do not conform.

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

The number type is an exact rational over `bigint`:

```ts
type Rational = { readonly num: bigint; readonly den: bigint }; // den > 0, gcd 1
```

Rationals rather than arbitrary-precision floats because almost every unit
definition is a rational (`2.54 cm`, `0.45359237 kg`), so conversions are
exact and rounding happens only once, at display time. Decimal literals parse
exactly (`1.5e-3` is `3/2000`).

The only irrational operation in the first iteration is the n-th root, needed
for fractional exponents. It, and any future special function, takes a
`Precision` (a count of significant digits) and truncates its result back to a
`Rational`. Irrational constants such as `pi` are plain decimal literals in the
definitions file, as in GNU units.

`format(r, digits)` renders a rational as a decimal string, rounding to the
requested significant digits and switching to exponent notation when the
magnitude warrants it.

## Quantities, dimensions and kinds

```ts
type BaseId = string; // the name of a primitive unit, e.g. "m", "radian"
type Dimension = ReadonlyMap<BaseId, Rational>; // exponent vector; zeros omitted
type Quantity = { readonly value: Rational; readonly dimension: Dimension };
```

Every unit resolves to a `Quantity`: a magnitude and an exponent vector over
the primitive units. Exponents are rational so that roots are exact on the
dimension side (`sqrt(m)` is `m^(1/2)`).

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

The format is a pared-down GNU units file: one definition per line, name then
whitespace then body, `#` comments.

```
m         !                 # dimension primitive
radian    !kind             # kind primitive (dimensionless)
kilo-     1000              # prefix (trailing dash)
inch      2.54 cm           # unit, defined by an expression
newton    kg m / s^2
hertz     1 / s
```

```ts
type Definition =
  | { kind: "primitive"; name: string; role: "dimension" | "kind" }
  | { kind: "prefix"; name: string; body: Expr }
  | { kind: "unit"; name: string; body: Expr };
```

`buildTable` evaluates each body to a `Quantity`, resolving references on
demand with memoization and a visiting set, so definitions may appear in any
order and cycles are reported rather than looping. Prefix bodies must be
dimensionless. The result:

```ts
type UnitTable = {
  readonly primitives: ReadonlyMap<BaseId, "dimension" | "kind">;
  readonly prefixes: ReadonlyMap<string, Rational>;
  readonly units: ReadonlyMap<string, Quantity>;
};
```

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
be typed can also be defined. It is the basic GNU units expression language:
decimal numbers, unit names, juxtaposition and `*` for multiplication, `/`,
`^` with an integer or parenthesized rational exponent, and parentheses, with
GNU units precedence. No functions, unit lists or `+`/`-` yet.

```ts
type Span = { readonly start: number; readonly end: number };
type Expr = { readonly span: Span; readonly node: ExprNode };
type ExprNode =
  | { kind: "number"; value: Rational }
  | { kind: "unit"; name: string }
  | { kind: "binary"; op: "mul" | "div"; left: Expr; right: Expr }
  | { kind: "pow"; base: Expr; exponent: Rational };
```

Juxtaposition is surface syntax only: it parses to a `mul` node like `*`
does, and differs from it only in precedence (it binds tighter than `/`, as
in GNU units), which is the parser's business.

`parseExpr(text): Result<Expr, ParseError>` knows nothing about units;
`evaluate(expr, table, precision): Result<Quantity, EvalError>` knows nothing
about text. Spans (character offsets) travel from the parser into every error
so the UI can highlight the offending input.

## Conversion

```ts
type ConvertError = DimensionMismatch | KindMismatch;

function convert(
  have: Quantity,
  want: Quantity,
): Result<Rational, ConvertError>;
```

The result is the output value: how many `want`s make up `have`, which after
the conformance check is simply `have.value / want.value`, since each quantity
already carries its own scale. `want` may have a magnitude (`3 ft` into `in`
gives `36`), matching GNU units.
The mismatch errors carry both dimension vectors, and a core function formats a
`Dimension` as text (`m^2 / s`), so the UI can explain the failure without
interpreting anything itself.

All errors are plain discriminated unions:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

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
src/core/expr.ts          Expr, Span, parseExpr
src/core/definitions.ts   Definition, parseDefinitions
src/core/table.ts         UnitTable, buildTable, name lookup
src/core/evaluate.ts      evaluate
src/core/convert.ts       convert
src/core/result.ts        Result and the error types
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
