*Section 8 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 8. Terminology

Conflicting or synonymous terms found, with a proposed canonical term.
"Both" means the term is used in both corpora with that meaning.

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "the quantity to convert" / "the unit to convert to" (docs) vs `have` / `want` (devdocs, 100+ uses) vs "You have" / "You want" (the fields) | `docs/definitions.md`; `devdocs/architecture.md` | **have** and **want**, introduced once in getting started as the fields' names; devdocs keep the code names unchanged. |
| "exact" / "inexact" (both) vs "approximate", "known to a precision" (docs) | `docs/functions.md`, `devdocs/numbers.md` | **exact** / **inexact** as the model's words; "approximate" only as the plain-language gloss and in `approx`'s name. |
| "certain" (the notes; docs) vs "certified" (devdocs) | counts in §9.1 | **certified** / **certification** everywhere applicable, in both corpora and in the app's notes, since the term has its specific meaning on the ball (§12, question 8); aligning the note text is a code change recorded for unit A2. |
| "pass", "retry loop", "retries", "escalation", "schedule", "working contexts" | `devdocs/numbers.md`, `cost.md`, `docs/settings.md` | **pass** (one evaluation at a precision) and **retry loop** in both; "schedule" devdocs-only. |
| "finest grid" (docs) vs "ceiling" (devdocs) | `docs/settings.md`; `devdocs/numbers.md`, `settings.md` | **ceiling**, glossed once as "the finest grid the app rounds onto". |
| "working digits" (the decimal-mode setting) vs "working digits" / "working precision" of a pass (`workingDigits`, `workingContexts`; #172) | `devdocs/numbers.md#The working digits` | **working digits** = the setting only; **working precision** = a pass's precision; devdocs to rename the schedule's "working digits" (code vocabulary is #172's). |
| "display digits" vs "digits asked for" vs "digits shown" vs `precision` | both | **display digits**; devdocs map `NumberContext.precision` once. |
| "significand" vs "mantissa"; "significand limit" vs `maxBits`, "size limit", "most bits" | settled in `devdocs/settings.md#The model` | **significand**, **significand limit** (already canonical). |
| "precision limit" vs `maxDigits`, "digits limit", "grid limit" | settled | **precision limit**. |
| "exact mode" / "decimal mode" vs "certified", "calculator", "rounded" | settled in `devdocs/settings.md` | **exact mode** / **decimal mode**. |
| "ratio notation" / "ratio" vs "fractions" (old flag, commit subjects) vs "fraction" (devdocs for the value's representation) | `devdocs/notation.md`, `settings.md#Storage` | **ratio notation**, **ratio** (the written form), **width**; "fraction" reserved for the significand in devdocs. |
| "digits notation" vs "the decimal display" / "decimal expansion" | `devdocs/notation.md` | **digits** (the notation's value) and **the decimal display** (the mechanism, devdocs). |
| "decimal" overloaded: decimal mode, decimal literal, decimal display, decimal grid, decimal exponent | both | keep, but each page says which on first use; never "decimal" alone for the mode in docs ("decimal mode"). |
| "plain number" (docs, builtins.md) vs "dimensionless" (architecture.md, sometimes including kinds) vs "number" | both | **dimensionless** is reserved for a plain scalar number, with neither dimension nor kind, in both corpora, glossed "a plain number" in docs; a kind is never called dimensionless, and the term for a quantity with a kind and no dimension is open (§12, question 20). |
| "kind" / "kind primitive" (devdocs) vs "dimensionless marker" (docs) vs "angle" | both | **kind**; "the radian kind" / "an angle" for the one kind the file declares. |
| "conform" / "conformance" (devdocs) vs "quantities of the same thing", "the same test" (docs) | both | **conform** / **conformance**, defined in `quantities.md`. |
| "primitive" / "dimension primitive" / "base unit" | both | **primitive** (with its role); "base unit" only when quoting the SI. |
| "ball", "midpoint", "radius" (devdocs; leaks into docs/functions.md ×4, docs/settings.md ×1) vs "error radius", "how well a value is known", "within a bound" (docs) | §9.1 | docs: **error radius** (named once) and plain phrasing; **ball** devdocs-only. |
| "unresolved" (internal) vs "cannot be told from …" (messages) vs "straddles" vs "undecided" (conditions) | both | docs: **cannot be told from** (edges) and **undecided** (conditions); devdocs keep `unresolved`. |
| "refused" / "refusal" vs "error" | both | **refusal** for the three size refusals; **error** for everything else. |
| `tooLarge` vs "past the significand limit" vs "would need a significand of N bits" | both | docs: **past the significand limit**. |
| `overflow` / `underflow` vs "too large / too small to compute" vs "the bound" | both | docs: **too large / too small to compute** (the exponent bound's refusals); **exponent bound** for the limit. |
| "unit list" / "list" / "a sum" | both | **unit list**; "sum" only for the written form. |
| "reciprocal" (devdocs) vs "the other way round" (docs) vs "the second line" | both | **the reciprocal line**, glossed "the conversion the other way round". |
| "a function as the want" / "function conversion" / "converting into a function" / "the reading that gives the quantity" | both | **conversion into a function**. |
| "recovered argument" / "the reading" / "count" | both | **recovered argument**; "count of the parameter's unit" for how it is written. |
| "annotation" vs "the unit it takes" vs "declared unit" (`zeroDeclaredUnit`) | both | **annotation**. |
| "condition" vs "domain" (GNU `domain=`) vs "restriction" | both | **condition**; "domain" reserved for built-ins. |
| "inverse" vs "the `~` line" | both | **inverse**. |
| "definitions file" / "units file" / "the file" / "system definitions" / "the unit table" vs "user definitions" | both | **the definitions file** (the system one, `src/units.txt`) vs **user definitions**; "unit table" devdocs-only. |
| "interval" for `degC` etc. (docs) vs "interval" of a ball (devdocs) | `docs/definitions.md#What the file contains` | **temperature difference** for the units; "interval" devdocs-only. |
| "note" vs "warning" | `devdocs/architecture.md`, `functions.md` | **note** (about digits) and **warning** (an assumed condition). |
| "`≈` with a dot", "uncertified" | both | **uncertified** (`≈̇`), named in docs. |
| "grid" | `docs/settings.md` (many), devdocs | explained once in `numbers.md`'s section on how a value is held, as the digits an approximate value is kept to; the mechanism in devdocs (§12, question 5). |
| "settle" / "settling" | devdocs | devdocs-only. |
| "kernel" (leaks once into docs/functions.md) | both | devdocs-only. |
| "the probe" vs "Measure this device" | both | **"Measure this device"** in docs with "(the probe)" once; **probe** in devdocs. |
| "format version" (docs) vs "stored version" / "storage version" (commits, `STORAGE_VERSION`) | both | **format version**. |
| "whole number" (docs) vs "integer" (devdocs) | both | **whole number** in docs, **integer** in devdocs, mapped once. |
| "Exucal" / "the app" / "the converter" / "the calculator" | both | **Exucal** for the product, **the calculator** for what it is, with unit awareness and kind checking as features, **the app** generically, **the converter** only for the two-field component (§12, question 2). |
| "span" vs "the text at fault" | both | docs: "the text at fault"; **span** devdocs-only. |
| "exact case" vs "recognized as exact" | both | **exact case**. |
| "juxtaposition" (both) | both | keep; gloss "writing two factors side by side" once. |
