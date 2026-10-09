---
name: audit-unit
description: Run one unit of the documentation audit (defined in audit/plan/10-audit-units.md) and write its report under audit/reports/ on a branch of its own, without editing any page. Invoke as /audit-unit <UNIT> [label], for example /audit-unit A1 fable.
argument-hint: "<UNIT> [label]"
disable-model-invocation: true
---

# Run one documentation audit unit

Arguments: `$ARGUMENTS`. The first word is the unit, one of A1 to A9,
D1 to D9 or V1 to V8 as defined in `audit/plan/10-audit-units.md`. The
second word, optional, is the run label: the model's name or a run
number, used in the branch name and the report's file name; without
it, use `run`. Run exactly this one unit, then stop.

## 1. Set up the branch

1. `git fetch origin docs-revamp`.
2. `git checkout -b claude/audit-<UNIT>-<label> origin/docs-revamp`. If
   the remote already has a branch of that name, add `-2`, `-3`, … to
   the label and say so in the report.
3. Record `git rev-parse --short origin/docs-revamp` as the plan
   revision for the report header.

Everything you read comes from this checkout; nothing comes from
memory of other units or sessions.

## 2. Read, in this order

1. `audit/principles.md`, in full. It governs; where the plan and a
   principle conflict, the principle wins.
2. `audit/plan.md`, in full: the pointer conventions (`file#Heading`,
   `file#Heading > Label`, `#(top)`, the `→` source lines) and what
   "history" means for the pages.
3. The unit's entry in `audit/plan/10-audit-units.md`: the paragraph
   beginning `**<UNIT>.`, and the paragraph that opens its group (10.a,
   10.b or 10.c). The entry names the unit's doc sections, its source
   modules, its read-only context and its output.
4. The read-only context it names, under `audit/plan/`: the claims of
   section 1 it cites (`01-core-abstractions.md`, by claim number), the
   rows of §1.1.5, §1.2.5 and §9.4 for its pages, the section 5 entries
   for its concepts, section 8 (terminology) and section 12 (the
   owner's decisions, which are binding).
5. The unit's doc sections, read in full, and its source modules, read
   in full. If verifying a claim needs a module outside the list, read
   it and list it under "Also read" in the report. Read nothing else in
   the corpus or the tree.

## 3. Rules for the work

- **Scope.** This unit's pages, modules and claims only. A finding about
  another unit's territory goes under "Questions for the owner" in one
  line, not into the body of the report.
- **No page changes.** Do not edit anything under `docs/`, `devdocs/`,
  `audit/plan.md`, `audit/plan/` or `audit/principles.md`, and do not
  change code or tests. The unit's product is a report: units run in
  parallel and across models, and their reports are compared before any
  page is changed.
- **Verdicts on claims:** `confirmed`, `corrected` or `not verifiable
  here`. Every verdict cites evidence as a repo-relative `path:line` (or
  `path:line-line`), naming the identifier or quoting the line. A
  corrected claim gets its corrected statement, written as the plan
  writes claims.
- **Tags on passages:** `update`, `keep as intent` or `drop`, as the
  index defines them. A rewrite is in the present tense, as a rationale
  or a ruled-out alternative, never "previously X".
- **Read-only context stays read-only.** In a D or V unit, a section 1
  claim that the code or the page contradicts is reported as a finding
  with evidence; the claim itself is not rewritten.
- **Terminology** follows section 8 and the section 12 decisions (for
  example: certified, not certain; dimensionless only for a plain
  scalar; have and want; temperature difference).
- **No timings or machine-dependent numbers** in any proposed text;
  qualitative statements only.
- **Proposed text** keeps to the Markdown subset of
  `audit/principles.md`: inline links only, repo-relative between pages
  and absolute only for an external reference such as an issue; no
  reference-style link definitions; no raw HTML.
- **Checking an example's output** is allowed: run the existing test
  suites, or evaluate an expression through the existing harness from a
  scratch script kept outside the working tree and never committed. Do
  not add or change code or tests in the tree.
- **Where a current page states a decision without its reason,** you
  may read the removed design note in git (`devdocs/design/*.md` and
  `devdocs/history/*.md` at commit 54aec25) for that reason alone, and
  quote nothing else from it; where the note does not settle it, put
  the question to the owner.

## 4. Write the report

Write `audit/reports/<UNIT>/<label>.md` with exactly these headings in
this order, so that runs of one unit can be read side by side. Keep each
section to what it needs; a heading with nothing under it says `None.`

```markdown
# Unit <UNIT>: <the unit's title from the plan> (<label>)

- Plan revision: <short hash of origin/docs-revamp>
- Date: <YYYY-MM-DD>
- Model: <as the session reports it, or "unknown">
- Doc sections read: <list>
- Modules read: <list>
- Also read: <list, or None>

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | n |
| Claims corrected | n |
| Claims not verifiable here | n |
| Stale passages: update / keep as intent / drop | n / n / n |
| Gaps confirmed / refuted / new | n / n / n |
| Proposed edits | n |
| Questions for the owner | n |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |

(In the plan's order. A unit with no claims assigned writes `None assigned.`)

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |

(The plan's rows for these pages first, each confirmed or revised, then
any found. "Rewrite" holds the replacement text, or `delete`.)

## Findings

(What the unit's entry in section 10 names as its output: for an A unit,
how the model holds up against the code; for a D unit, each gap of
section 6 confirmed, refuted or added; for a V unit, which sections
become links to docs/ and which stay as mechanism, intent or ruled-out
alternatives.)

## Proposed edits

### <path#Heading>

(The complete proposed text for that section, or an old → new pair,
ready to apply later. One subsection per target section, in page order.)

## Terminology

(Terms met that section 8 does not cover, or that conflict with it, each
with a proposed canonical term.)

## Questions for the owner

(Only what the unit could not settle; each with a proposed answer.)

## Notes on this run

(One paragraph: what the plan got wrong about this unit's scope, what
was hard, what the next unit should know. No timings.)
```

Before committing, check the file: no line starts with `>`, every row
of a table has the same number of columns, and every path is
repo-relative.

## 5. Finish

1. `git add audit/reports/<UNIT>/<label>.md` and nothing else; commit
   with the message `Audit <UNIT> (<label>): <the unit's title>`.
2. `git push -u origin claude/audit-<UNIT>-<label>`. Do not open a pull
   request.
3. Reply in one line with the branch and the report path, then stop. Do
   not start another unit.
