---
name: work-order
description: Carry out one work order of the documentation rewrite (audit/work-orders/) on a branch of its own and open a pull request into docs-revamp, changing nothing the work order does not name. Use only when the user invokes it by name, as /work-order <NN> [label], for example /work-order 01 fable or /work-order 00.1 fable; never start it on your own.
argument-hint: "<NN | 00.B> [label] [part]"
---

# Carry out one work order of the documentation rewrite

Arguments: `$ARGUMENTS`. The first word is the work order: `01` to `26`
for a page, or `00.1`, `00.2`, `00.3` for a batch of the code track
(work order 00). The second word, optional, is the run label (the
model's name or a run number), used in the branch name; without it,
use `run`. For `00.3` only, a third word may name one part of batch 3,
`messages`, `tests` or `comments`; do only that part. Do exactly this
one work order, or batch, then stop.

## 1. Set up the branch

1. `git fetch origin docs-revamp`.
2. `git checkout -b claude/wo-<NN>-<label> origin/docs-revamp` (for a
   batch, `claude/wo-00-<B>-<label>`). If the remote already has a
   branch of that name, add `-2`, `-3`, … to the label.
3. Read the row for your work order in the table of
   `audit/work-orders/README.md` ("Waits on"); batch 2 waits on batch 1,
   and batch 3 on every page work order, 01 to 26. For each work order
   or batch it waits on, check that it has landed:
   `git log --oneline origin/docs-revamp --grep "Work order <NN>"`
   (for a batch, `--grep "Work order 00, batch <B>"`). If any has not
   landed, stop and say which, changing nothing.

Everything you read comes from this checkout; nothing comes from
memory of other sessions.

## 2. Read, in this order

1. `audit/work-orders/README.md`, in full: the conventions every work
   order follows (ids, report pointers, anchors, hand-offs, the pull
   request).
2. Your work order, in full. It governs your session.
3. `audit/principles.md`, in full. Where your work order and a
   principle seem to disagree, the work order applies the principle
   to your page; if they truly conflict, follow the principle and say
   so in the pull request.
4. What your work order cites, at the place it cites: a finding
   (`audit/findings.md`), an open item (`audit/open-items.md`) or a bug
   (`audit/bugs.md`) at its id, the entry alone; a report at the lines
   a pointer names (`audit/reports/<UNIT>/fable.md`, `merged.md` for
   D1); a plan section it names, under `audit/plan/`.
5. The page you rewrite, as it stands; the pages your work order tells
   you to link or check, as they have landed (an earlier session hands
   you a name, a wording or a check's result through its landed page:
   read it there, and if it is missing, ask in the pull request rather
   than guess); and the code your work order tells you to read or
   check, and only that. Code line numbers in the audit may have moved:
   find the place by its identifier.

Read nothing else in the corpus or the tree.

## 3. Rules for the work

- **Scope.** Change only the files your work order names (its page, or
  for 09 its two files, or for a batch of 00 that batch's code and
  tests), and the links it explicitly tells you to repoint elsewhere
  (07, 16 and 18 do). Do not edit another page, `audit/`, the plan, the
  principles or, outside the code track, any code. A problem you find
  elsewhere goes under "Questions for the owner" in one line.
- **Decisions are settled.** The owner's answers (`audit/plan/12-open-questions.md`,
  sections 12.1 to 12.3) and your work order are binding: do not
  reopen or re-decide them. Where your work order leaves a choice to
  you (which draft, which figure stays as rough), make it and record
  it in the pull request.
- **When the work order and the code disagree,** or a fact cannot be
  checked: write only what you verified, never invent a fix outside
  your scope, and put the question to the owner in the pull request.
- **One pass.** Write the page whole, under the headings section 4 of
  your work order fixes, in the order it gives; keep every heading
  another page links.
- **The words and the format** follow `audit/plan/08-terminology.md` and
  the principles: the Markdown subset (inline links only, repo-relative
  between pages, absolute only for an external reference such as an
  issue; no reference-style links, no raw HTML); no history.
- **Quoting the app** follows your work order and the code as it is at
  your base revision.
- **The code track** (00) follows work order 00: one commit per bug, or
  per group it names; tests with each change; a wording change updates
  the test that pins the old text; the repository's checks
  (`devdocs/development.md#Commands`) pass before you push.

## 4. Check before committing

Go through section 10 of your work order ("Done when"), item by item.
For a page, also check that every link resolves: the path exists, and
the anchor is a heading of the target, or a heading your work order
allows for a page written later. Fix what fails; what you cannot fix
goes in the pull request.

## 5. Finish

1. Commit with the subject `Work order <NN>: <the page's path>` (for a
   batch, one commit per change, each subject starting
   `Work order 00, batch <B>: `).
2. `git push -u origin <your branch>`.
3. Open a pull request into `docs-revamp`, titled `Work order <NN>:
   <the page's path>` (for a batch, `Work order 00, batch <B>`), whose
   body has these sections: "Summary" (what changed, in a few lines);
   "Choices" (what your work order asks you to record, sections 7 and
   8); "Done when" (each item of section 10, met or not); "Questions
   for the owner" (or `None.`); for a batch, also "User-visible
   wording" (the final text of every line the app shows that you
   changed). If you cannot open a pull request, put that body in your
   reply instead.
4. Reply in one line with the branch and the pull request, then stop.
   Do not merge, and do not start another work order.
