---
name: prose-style
description: House style for nonfiction prose, technical documentation first. Load before writing or editing anything a person will read as prose, such as a docs page, a README, a design note, a report, a long commit message or a pull request description, and before reviewing such text.
---

# Nonfiction prose style

These rules describe how nonfiction prose is written and edited in
this repository, and they apply to any nonfiction. They were collected
from the ten rounds of review of `docs/numbers.md`, so the examples are
that page's; where a rule says "page", read "document". The audit's
principles (`audit/principles.md`, "Narrative pages and typed
examples") record where each rule came from; this file is where the
rules are kept and read.

When a rule and clarity conflict, clarity wins; say so in a note, and
keep the rule everywhere else. A rule arrives for a reason, so apply
it to the whole text, not only to the sentence that prompted it.

## 1. The reader and the shape of a page

- Write for a technical reader who is new to the subject. The page
  on-boards them; it does not test them.
- A page is a narrative, read once from top to bottom, not a reference
  card. It opens by saying what the thing is and what it is for, then
  why its semantics matter, then the rules, each with examples.
- Lead with the subject itself. "Exucal is first and foremost a
  calculator, and it was built to ..." beats any sentence that
  approaches the subject sideways.
- After the introduction, a summary of the rules the page explains,
  one line each, each linking its section.
- Every section opens with a lead-in that says what question it
  answers. A long section gets sub-headings.
- A page reads linearly: no term is used before the page defines it,
  and no passage asks the reader to jump ahead or to read twice.
- Define a word the page leans on at its first use, even an ordinary
  word used in a particular sense ("an output line is ...").
- Bold a defined term once, where it is defined. Bold otherwise marks
  only the statement of a rule, as in a summary's lead phrases; it
  never marks emphasis.
- Examples are set apart in a table: what the reader types or does,
  and what happens. The typed column must paste back and work; never
  put the system's own output there.
- Two passages that say the same thing become one. Say a thing once,
  where it belongs, and link to it from elsewhere.
- Keep the page to its topic. Material that belongs to another page
  moves there, with a link; orthogonal material is left out.

## 2. Sentences

- Direct, active, concise. Use an active construction wherever it
  simplifies or clarifies; the exceptions are a matter of judgement.
- The subject first, then the verb. Never open a sentence with a
  what-clause as its subject, and never write "X is what lets Y";
  both invert the order and hide the subject.
  - Not "What costs time is passes and bits." but "Two things cost
    time, passes and bits."
  - Not "The limit is what makes `3^1000000000` a refusal rather than
    a hang." but "The limit makes `3^1000000000` a refusal rather than
    a hang."
  - No cleft sentence at all: not "what the precision limit limits is
    effort" but "the precision limit limits effort".
- Keep sentences short. A sentence that carries three or more parts
  is broken up, or becomes a list.
- Every sentence has a subject and a verb. No fragment ("only its
  exponent counted"); write a second sentence instead.
- In a pair of parallel clauses, repeat the verb rather than leaving it
  for the reader to carry over: not "how many bits its numerator may
  have, and how many its denominator" but "how many bits its numerator
  may have and how many bits its denominator may have". Parallel ideas
  take parallel construction.
- Few asides. A clause set off by commas in the middle of a sentence
  usually belongs in its own sentence, or nowhere.
- No filler and no rhetorical weight: drop "before it is anything
  else", "in the words of number theory", "the very point", and any
  phrase that adds nothing when removed.
- No teasing. Name the thing: not "two limits bound a value" and a wait,
  but "two limits bound a value: the significand limit, on the fraction,
  and the exponent bound, on the power of ten".
- No private phrasing that a reader cannot parse ("works at its
  argument's own size"). Say the mechanism instead.
- Simple present tense; the plain verb, not "would", "is to be" or
  "comes to".
- Write as you would explain the thing to a colleague across a desk,
  without chattiness and without the stiffness of a specification.

## 3. Lists and punctuation

- Items of a list that themselves contain commas are separated by
  semicolons.
- An enumeration whose items each carry a qualifier of their own is set
  as a bulleted list, not run into a sentence, unless the flow needs it
  inline.
- A list of examples is examples, never an inventory; say so, and say
  where the inventory lives.
- Nested lists use list syntax, one idea per item, with a full sentence
  where an item makes a claim.
- Order the items of a list by what matters: the fundamental thing
  first, then what it bounds or depends on it. Do not explain the
  ordering in the prose unless the reader needs it.

## 4. Precision and honesty in technical prose

- Verify every claim against the source of truth before writing it:
  the code, the specification, a run of the program. If a fact is
  surprising, say that it is the design, give the reason, and say when
  it changed if it did.
- A claim a reader could doubt is argued, not asserted. Give the
  mechanism: not "the error lies well beyond the display digits" but
  "the first pass computes ten digits above the display digits, so the
  radius lies at least ten digits beyond them, whatever the settings".
- Scope every claim: which mode, which setting, which conditions. A
  sentence must not sit ambiguously between two contexts.
- Prefer the exact statement to the approximate one: "ten digits" when
  it is always ten, "each counted on its own" when the limit tests the
  numerator and the denominator separately.
- One word per concept, used in its sense everywhere: a precision is a
  count of digits of working accuracy; a grid is the coarseness of the
  discrete space itself. Do not ban a precise term; use it precisely.
  Never use a reserved term loosely ("kind", "line", "refusal").
- In human-facing prose, name mechanisms in words, not by identifiers.
  An identifier appears only when the reader must go to it.
- When comparing with other work, link each thing compared to its own
  site, and say of it only what its own documentation says.
- Credit prior art. Claim novelty or uniqueness only after checking;
  one counterexample makes the claim false.
- State facts about today. No history ("it used to"), no futures ("it
  will"), no speculation, in anything a user reads.
- Quote a system's own output verbatim or describe it; never
  paraphrase it as if quoting.

## 5. Markdown and mechanics

- A small CommonMark subset: headings, paragraphs, bulleted and
  numbered lists, emphasis, inline code, fenced code blocks, tables and
  inline links. No raw HTML, no reference-style links, no footnotes.
- An inline code span, a link or an emphasis is written within one
  line and never broken across a line ending; re-break the line around
  it. A line-by-line viewer does not join them, and a subset renderer
  need not.
- Identifiers, typed input and output go in code spans; prose stays
  prose.
- Links between pages are repo-relative paths; an absolute URL is for
  an external reference only.
- Headings are the anchors other pages link; keep them stable.

## 6. Working under review

- A rule given in review applies to the whole text at once. Sweep every
  occurrence before the next revision and say how many were changed.
- Re-run every example after every edit.
- When answering a review comment, name the revision and quote the new
  sentence, so the reviewer need not open the text.
- Credit a decision to the review, not to a person, in anything that
  stays in the history.
- Before handing a text to its reviewer, have it critiqued as section
  7 says, by a reader with no part in the writing, and fix what the
  critique finds. The reviewer's time goes to what has passed that
  reading.

## 7. Critiquing a text against this guide

A critique is a reader's account of the text, not a list of rules
broken. When asked to critique a text against this guide:

- Read it as the reader it is written for, from the top, once, as they
  would.
- Report by passage, in the text's order, quoting the words: what
  stopped you; what you could not follow, or had to read twice; what
  you did not believe, because it was asserted and not argued; what was
  said twice; what was teased rather than named; what a term meant
  before the text defined it; what you could not parse.
- Say why each point costs the reader, in this guide's terms, naming
  the section it falls under. A point that fits no rule is still a
  point; the rules came from such readings.
- Rank by what costs the reader most, and leave out what a careful
  reviewer would not raise.
- Where it helps the author see the point, say in a clause what would
  read better; never rewrite the text. The author fixes; you read.
- Say what reads well only where the author might otherwise change it.
- Stop when you would raise nothing with the author.

The author fixes every point they agree with, across the whole text
where a point recurs, says why for each point they leave, and has the
text read again by a fresh reader, until a reading raises nothing. The
reviewer then reads a text that has passed that first reading.

## Quick check before handing over

1. Does the page open with what the thing is and what it is for?
2. Is every term defined before its first use, and bold once?
3. Does any sentence open with "What ...", or contain "is what"?
4. Any fragment, any clause missing its verb, any aside set off by
   commas that could be its own sentence?
5. Any sentence with three or more parts that should be a list?
6. Any claim asserted without its mechanism, or without its scope?
7. Any code span, link or emphasis broken across a line?
8. Any filler phrase that reads the same without it?
