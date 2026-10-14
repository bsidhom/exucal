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

Your id, used in titles, commit subjects and the check of section 1,
is the first word (`01` to `26`, `00.1`, `00.2`, `00.3`), followed for a
part of batch 3 by a comma and the part: `00.3, tests`.

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
   names for your work, if it names one (a cloud session does) and it
   is not `docs-revamp` itself, the target of your pull request;
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
   base revision; the review notes name it (section 5).
6. Read the row for your work order in the table of
   `audit/work-orders/README.md` ("Waits on"); batch 2 waits on batch 1,
   and batch 3 on every page work order, 01 to 26. For each work order
   or batch it waits on, check that it has landed: with its id,
   `git log --oneline -F --grep "(work order <id>)" origin/docs-revamp`
   prints at least one commit (every landed commit carries that
   marker, section 5). Add a second `--grep` for the older form,
   `Work order <NN>` (for a batch, `Work order 00, batch <B>`), which
   counts too. If any has not landed, stop and say which, changing
   nothing.

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
   so in the review notes.
4. What your work order cites, at the place it cites: a finding
   (`audit/findings.md`), an open item (`audit/open-items.md`) or a bug
   (`audit/bugs.md`) at its id, the entry alone; a report at the lines
   a pointer names (`audit/reports/<UNIT>/fable.md`, `merged.md` for
   D1); a plan section it names, under `audit/plan/`.
5. The page you rewrite, as it stands; the pages your work order tells
   you to link or check, as they have landed (an earlier session hands
   you a name, a wording or a check's result through its landed page:
   read it there, and if it is missing, ask in the review notes rather
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
  elsewhere goes under "Questions for the owner" in the review notes,
  in one line.
- **Decisions are settled.** The owner's answers (`audit/plan/12-open-questions.md`,
  sections 12.1 to 12.3) and your work order are binding: do not
  reopen or re-decide them. Where your work order leaves a choice to
  you (which draft, which figure stays as rough), make it and record
  it in the review notes; a choice a reader of the result would care
  about (a message's wording, a rule the code now follows) also goes
  in the description, with its reason.
- **When the work order and the code disagree,** or a fact cannot be
  checked: write only what you verified, never invent a fix outside
  your scope, and put the question to the owner in the review notes.
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
goes in the review notes.

## 5. Write for the history

Titles, commit messages and the pull request's description stay in the
repository's history after the revamp, and `audit/` does not: it is
removed when the revamp lands. So each must read on its own, for
someone who has never seen the audit. Say what changed and why, in
words, with the docs' terms (`audit/plan/08-terminology.md`). Outside
the marker that ends a title, the `Audit:` trailer, the References
section and the review notes, write no audit ids (F-, Q-, B-), no
report names (A1 to V8), no section or conflict numbers, and none of
"batch", "session", "skill" or "work order". Never name who decided:
not "the owner", and no one's name. A change made at a reviewer's
request is made "in review" or "as decided in review"; the trail of
the review is welcome, the person is not. The review notes, which are
not for the history, may say "the owner".

- **Titles.** The pull request's title and every commit subject take the
  form `<Topic>: <what changed> (work order <id>)`. The topic is a
  capitalized word naming the area: `Docs` or `Devdocs` for a page;
  for code, the area the change touches (`Display`, `Settings`,
  `Messages`, `Built-ins`, `Tests`, `Comments`, …), or `App` for a pull
  request that spans several. What changed is a short phrase starting
  in lower case, as the repository's history writes them. The marker
  `(work order <id>)` ends every title and subject, since section 1's
  check finds landed work by it. Keep a title under about 100
  characters. For example:
  - `Docs: rewrite the numbers page around exact and inexact values (work order 01)`
  - `Devdocs: rewrite the settings page, "The sheet" becoming "The panel" (work order 16)`
  - `Display: refuse a rounding past the exponent bound instead of crashing (work order 00.1)`
  - `Tests: pin the partial note and the exact functions' cases (work order 00.3, tests)`
- **Commit messages.** Under the subject, a body in plain prose,
  wrapped at 72 columns: what changed and why, and for code the text
  the app shows before and after wherever it changed. The audit ids
  the commit follows go in one trailer line, `Audit: B-068, F-021`,
  ahead of any trailers your session adds.
- **The description**, in this order:
  1. An opening paragraph, without a heading, that begins: "Part of the
     documentation revamp, which rewrites the user docs (`docs/`) and
     the developer docs (`devdocs/`) so that they match the code, agree
     with each other, and can be read by someone new to the project."
     Then a sentence or two on this pull request: for a page, which
     page and what it is for; for code, which changes, and that they
     land before the pages (so that the pages describe the app as it
     will be) or after them (so that the code catches up with them).
  2. `## What changes`: bullets a reader can follow without the page or
     the code open. For a page: what it now covers, what it used to get
     wrong, what moved in or out. For code: each change, the behaviour
     before and after.
  3. For code, `## What the app shows`: the final text of every line
     the app shows that changed, each with the text it replaces.
  4. `## Decisions`: each decision the pull request applies or makes,
     with its reason, in words.
  5. `## Testing`: for code, the tests added or changed and the checks
     run; for a page, the examples re-run and the facts checked in the
     code.
  6. `## Follow-ups`: what you found that this pull request leaves
     alone, stated plainly, or `None.`
  7. `## References`, last, for a reader who has the audit: a link to
     your work order pinned to the full hash of your base revision
     (`https://github.com/<owner>/<repo>/blob/<hash>/audit/work-orders/<file>`),
     and the audit ids the pull request follows, each with the file it
     is in. Pin every link into `audit/` the same way, so that it keeps
     working after the directory is removed.
- **The review notes**, posted as the pull request's first comment
  right after you open it, are for the owner's review and not for the
  history; here audit ids, report pointers and section numbers are
  welcome. The comment is headed `Review notes`, with:
  `Done when` (each item of section 10 of your work order, met or not);
  `Base` (your base revision, and the head you merged at the end, if it
  moved); `Sources and choices` (which drafts and report lines you
  used, what you read in the code, and any choice about the process,
  such as the branch name); `Questions for the owner` (numbered), or
  `None.`

## 6. Finish

1. Commit, with titles and messages as section 5 has them: for a page,
   one commit; for the code track, one commit per bug, or per group
   work order 00 names.
2. Fetch again as in steps 2 and 3 of section 1. If `docs-revamp` has
   moved since you began, merge it (`git merge origin/docs-revamp`, the
   merge commit's subject ending with your marker too); on a conflict,
   stop and say so. Then repeat section 4's checks for what the merge
   brought in that touches your files.
3. `git push -u origin <your branch>`, retrying on a network failure as
   in section 1. If the push is rejected, stop and say so; never
   force-push.
4. Open a pull request into `docs-revamp`, with the title and the
   description of section 5.
5. Post the review notes as its first comment.
6. If you cannot open the pull request or post the comment, put what
   you could not post in your reply. Then reply in one line with the
   branch and the pull request, and stop. Do not merge, and do not
   start another work order.
