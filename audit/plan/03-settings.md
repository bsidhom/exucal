*Section 3 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 3. Settings

Every setting mentioned in either corpus. "Where documented" cites the
current owner of the user-level description (docs/) and the design
(devdocs/). The stored keys are from `devdocs/settings.md#Storage`.

| Setting (panel label) | Stored key | Controls (model parameter / behaviour) | Default; range (bounded by) | docs/ | devdocs/ |
| --- | --- | --- | --- | --- | --- |
| Display digits | `displayDigits` | `NumberContext.precision`: digits certified in exact mode; the grid of every step and of literals in decimal mode | 8; 1 … precision limit | `docs/settings.md#(top) > Display digits`; `#How a number is held…` | `devdocs/settings.md#The model > Display digits`; `devdocs/numbers.md#Certification…`, `#Decimal mode` |
| Rounding | `rounding` | the context's rounding mode: the display's last digit in exact mode, every step in decimal mode, `round()` | half even; the seven modes | `docs/settings.md#(top) > Rounding` | `devdocs/settings.md#The model > Rounding`; `devdocs/numbers.md#The types` (rounding.ts); `devdocs/builtins.md#The exact functions` |
| Mode | `mode.kind` | `NumberContext.mode`: exact or decimal arithmetic | exact | `docs/settings.md#(top) > Mode` | `devdocs/settings.md#The model > The mode is a nested choice`; `devdocs/numbers.md#Exact mode`, `#Decimal mode` |
| Notation (exact mode) | `mode.notation.kind` | how an exact value is written: `digits` or `ratio` | digits | `docs/settings.md#(top) > Notation` | `devdocs/notation.md#(top)`, `#The rule`; `devdocs/settings.md#The model` |
| Ratio width (with `ratio`) | `mode.notation.width` | `RatioDisplay.width`: most digits of a whole number or of a ratio's two parts written entire | 20; 1 … 1000 (nothing clamps it) | `docs/settings.md#(top) > Notation` | `devdocs/notation.md#The width`; `devdocs/settings.md#The model > The chain` |
| Working digits (decimal mode) | `mode.working.kind` | locked to the display digits, or extended | digits (locked) | `docs/settings.md#(top) > Working digits` | `devdocs/numbers.md#The working digits`; `devdocs/settings.md#The model > Working digits` |
| Extended working digits (with `extended`) | `mode.working.digits` | `NumberContext.working`: the grid of every step but the last | display digits; display digits … precision limit | `docs/settings.md#(top) > Working digits` | same |
| Precision limit | `precisionLimitDigits` | caps display and working digits; `ceiling = 4 × (L + 10)`; rebuilds the unit table | 1,000; 1 … `precisionLimitFor(S)` (2,453 at the default) | `docs/settings.md#(top) > Precision limit`; `#How a number is held…` | `devdocs/settings.md#The model > Precision limit`, `> The two limits meet in the grid`; `devdocs/numbers.md#Working precision and the schedule`, `#The significand limit` |
| Significand limit | `significandLimitBits` | `NumberContext.significandLimitBits`: most bits per part of an exact significand; strict refusals | 65,536; 358 … 1,048,576 | `docs/settings.md#(top) > Significand limit`; `#How a number is held…` | `devdocs/settings.md#The model > Significand limit`; `devdocs/numbers.md#The significand limit` |
| Probe budget | `budgetMs` | the per-pass time the probe allows when proposing the two limits; no model parameter | 50 ms; 10 … 10,000 | `docs/settings.md#(top) > Probe budget` | `devdocs/settings.md#The model > Probe budget`, `#The probe` |

Not settings but documented beside them:

- "Measure this device" / Apply (the probe's proposal):
  `docs/settings.md#(top)` (paragraph "The limits are set top-down");
  `devdocs/settings.md#The probe`.
- The chain of clamps and refusals ("At most 2,453 digits under the
  significand limit", "lowered from 1,000 to 26 digits…"):
  `docs/settings.md#(top)` (same paragraph); `devdocs/settings.md#Applying a
  change`.
- Per-setting "default …" reset links and "Reset all settings":
  `docs/settings.md#(top)`; `devdocs/settings.md#Applying a change > Resets`.
- The sheet's mechanics (cog, bottom/side sheet, Done/Escape, steppers,
  on-screen keyboard): `docs/settings.md#(top)`; `devdocs/settings.md#The
  sheet`, `#The controls`.
- Storage: one JSON envelope under `settings`, format version 5, `savedBy`,
  migrations 1→5, newer-version policy: `docs/settings.md#(top)` ("under a
  format version of their own"); `devdocs/settings.md#Storage`.
- The build number tap (update check) is described in
  `docs/settings.md#(top)` though it is not a setting; design in
  `devdocs/offline.md#Offline behavior > Update checks`.
- Constants that are deliberately not settings: the exponent bound
  (`devdocs/numbers.md#Why the exponent bound stays at 10^18`, "A setting for
  the bound was weighed and set aside"); the ceiling ("derived and
  shown, never set", `devdocs/settings.md#The model`); the guard and factor.
