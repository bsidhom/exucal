---
name: work-order
description: Carry out one work order of the documentation rewrite (audit/work-orders/) on a branch of its own and open a pull request into docs-revamp, changing nothing the work order does not name. Use only when the user invokes it by name, as /work-order <NN> [label], for example /work-order 01 fable or /work-order 00.1 fable; never start it on your own.
argument-hint: "<NN | 00.B> [label] [part]"
---

# Carry out one work order of the documentation rewrite

Arguments: `$ARGUMENTS` (when this file is read as a plain prompt
instead of invoked as a skill, the arguments are the ones the prompt
gives). The first word is the work order: `01` to `26`
for a page, or `00.1`, `00.2`, `00.3` for a batch of the code track
(work order 00). The second word, optional, is the run label (the
model's name or a run number), used in the branch name; without it,
use `run`. For `00.3` only, a third word may name one part of batch 3,
as section 4 of work order 00 divides it: `messages` (B-015 to B-029),
`tests` (B-030 to B-033), `comments` (B-034 to B-067) or `hangs`
(B-070); do only that part. Without it, do all four, in that order.
B-069 is never part of a run: it waits until the pages ship with the
app. Do exactly this one work order, batch or part, then stop.

## 1. Set up the branch on the latest `docs-revamp`

The checkout a session starts from can be stale: a cloud session's
clone may lag the remote and be shallow, and no branch but the default
is brought up to date for you. So take the base from the remote, every
time, before anything else, and never trust a local `docs-revamp`.

1. Check that the working tree is clean (`git status --porcelain`
   prints nothing); if it is not, stop and say so.
2. Fetch the two heads from the remote, forcing the remote-tracking
   refs:
   `git fetch origin +refs/heads/docs-revamp:refs/remotes/origin/docs-revamp +refs/heads/main:refs/remotes/origin/main`.
   When `git rev-parse --is-shallow-repository` prints `true`, run it
   as `git fetch --unshallow origin …` with the same two refspecs, so
   that the whole history is there for step 6. If the
   fetch fails on the network, retry up to four times, waiting 2, 4, 8
   and 16 seconds.
3. Check the result against the remote itself: the hash that
   `git ls-remote origin refs/heads/docs-revamp` prints must equal
   `git rev-parse origin/docs-revamp`. If it does not, fetch again as in
   step 2; if it still differs, stop and say so, changing nothing.
4. Put your branch on that head. Your branch is the one your session
   names for your work, if it names one (a cloud session does);
   otherwise `claude/wo-<NN>-<label>` (for a batch,
   `claude/wo-00-<B>-<label>`), adding `-2`, `-3`, … to the label if the
   remote already has a branch of that name.
   - If the branch exists locally with commits of its own (that is,
     `git log --oneline <branch> --not origin/docs-revamp origin/main`
     prints anything), check it out and merge the head into it:
     `git merge origin/docs-revamp`. On a conflict, stop and say so.
   - Otherwise create it at the head, or move it there:
     `git checkout -B <branch> origin/docs-revamp`.
5. Confirm that `git merge-base --is-ancestor origin/docs-revamp HEAD`
   succeeds, and note `git rev-parse --short origin/docs-revamp` as the
   base revision; the pull request names it.
6. Read the row for your work order in the table of
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
  (07, 16 and 18 do; in batch 3, B-032's clause of
  `devdocs/development.md` and B-070's regenerated table in
  `devdocs/cost.md`). Do not edit another page, `audit/`, the plan, the
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
2. Fetch again as in steps 2 and 3 of section 1. If `docs-revamp` has
   moved since you began, merge it (`git merge origin/docs-revamp`); on a
   conflict, stop and say so. Then repeat section 4's checks for what
   the merge brought in that touches your files.
3. `git push -u origin <your branch>`, retrying on a network failure as
   in section 1. If the push is rejected, stop and say so; never
   force-push.
4. Open a pull request into `docs-revamp`, titled `Work order <NN>:
   <the page's path>` (for a batch, `Work order 00, batch <B>`, adding
   the part in parentheses when you were given one), whose
   body has these sections: "Summary" (what changed, in a few lines);
   "Choices" (what your work order asks you to record, sections 7 and
   8); "Done when" (each item of section 10, met or not); "Questions
   for the owner" (or `None.`); "Base" (the base revision of section 1,
   and the head you merged at the end, if it moved); for a batch, also
   "User-visible wording" (the final text of every line the app shows
   that you changed). If you cannot open a pull request, put that body
   in your reply instead.
5. Reply in one line with the branch and the pull request, then stop.
   Do not merge, and do not start another work order.
