# The documentation audit

This directory holds the audit and restructuring of `docs/` and
`devdocs/`: the principles that govern it (`principles.md`), the plan
(`plan.md`, the index, with one file per section under `plan/`), and the
reports the audit units produce (`reports/`).

## Running a unit

The units are defined in [plan/10-audit-units.md](plan/10-audit-units.md).
Each is sized for one session and runs through the project skill
`audit-unit` (`.claude/skills/audit-unit/SKILL.md`), so that every run
follows the same prompt whatever the model:

1. Start a Claude Code session on `docs-revamp`, or on any branch that
   contains the skill; a session started from `main` will not have it
   until the revamp merges.
2. Run `/audit-unit <UNIT> [label]`, for example `/audit-unit A1 fable`.
   The label names the model or the run and goes into the branch name
   and the report's file name; without it the label is `run`.
3. The session branches from `docs-revamp` as `claude/audit-<UNIT>-<label>`,
   reads the principles, the plan, the unit's pages and modules, writes
   `reports/<UNIT>/<label>.md`, commits that file alone, pushes the
   branch, and stops. It changes no page and no code.

A session loads its skills once, at startup, from the checkout it starts
on, and a cloud session starts on a checkout made when its container was
prepared, which can be an hour or more before the session itself; a
skill merged into `docs-revamp` after that is not in the session. If the
session answers that `/audit-unit` is not available, do not let it
improvise: send it this instead, with the unit and the label filled in.
It fetches the branch's current tip and runs the same prompt from it.

```
Run `git fetch origin docs-revamp`, read the skill with
`git show origin/docs-revamp:.claude/skills/audit-unit/SKILL.md`,
and carry it out exactly as if I had typed `/audit-unit A7 fable`.
```

To run one unit on several models, run it once per model with the
model as the label; the reports land side by side under
`reports/<UNIT>/`, with the same headings in the same order, so they can
be read against each other. To run units in parallel, start one session
per unit; the branches never touch the same file.

Outside Claude Code, the body of `SKILL.md` is a plain prompt: paste it
with the unit and the label filled in.

## After the runs

Merge into `docs-revamp` the branch of each run you keep, or every run
for the record; the reports only add files. Pages are changed in a
later phase, from the "Proposed edits" sections of the reports, never by
the units themselves. Questions the units raise are answered in
[plan/12-open-questions.md](plan/12-open-questions.md), where the
owner's decisions are recorded.

## The units

| Unit | Title |
| --- | --- |
| A1 | Values, exactness and exact arithmetic |
| A2 | Certification, the display rule and the ratio notation |
| A3 | The retry schedule, settling and the ceiling |
| A4 | Decimal mode and the working digits |
| A5 | Size limits, refusals and `approx` |
| A6 | Comparison, edges and undecided conditions |
| A7 | Dimensions, kinds, conformance and quantity arithmetic |
| A8 | Conversion and the output modes |
| A9 | Names, the table and the system definitions' exactness |
| D1 | Expression language |
| D2 | Definition language |
| D3 | The system units catalogue |
| D4 | Settings |
| D5 | Built-ins: the elementary families |
| D6 | Built-ins: `approx`, magnitude, rounding, division and integers |
| D7 | Built-ins: Gamma, Beta, incomplete and error functions |
| D8 | Existing foundation-level content in docs/ to dissolve |
| D9 | The index, the intro and the app's surface |
| V1 | `devdocs/numbers.md` |
| V2 | `devdocs/architecture.md` |
| V3 | `devdocs/builtins.md` |
| V4 | `devdocs/functions.md` |
| V5 | `devdocs/notation.md` and `devdocs/settings.md` |
| V6 | `devdocs/future.md` and `devdocs/cost.md` |
| V7 | `devdocs/layout.md`, `devdocs/testing.md`, `devdocs/benchmarks.md` |
| V8 | `devdocs/README.md`, `devdocs/development.md`, `devdocs/offline.md`, `devdocs/deployment.md`, `devdocs/security.md` |

The A units verify the claims of section 1 against the code; the D
units audit the existing `docs/` content by target area and confirm the
gaps; the V units audit each `devdocs/` page with the docs sections and
claims it touches as read-only context. The getting started guide has
no unit; it is written last.
