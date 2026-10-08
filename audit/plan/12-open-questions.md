*Section 12 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 12. Open questions

Each with a proposed answer, none decided.

1. **The removed design notes.** Settled in principle: the pages
   preserve design intentions and the salient decisions and
   decisions-against, not the archaeological record, so the notes
   removed on 2026-10-08 are not resurrected and no history page is
   added. One question remains. Several current passages give a ruling
   without its ground ("was set aside", "was weighed and left undone"
   in `devdocs/numbers.md` and `devdocs/settings.md`). May an audit unit
   read the removed note in git to recover the reason? *Proposed:* yes,
   for that purpose only; the recovered reason is written into the
   current page in one or two sentences, and nothing else is taken from
   the notes.
2. **Which framing leads docs/: unit converter or calculator?** The root
   and docs READMEs open with "converts units, in the spirit of GNU
   units"; `devdocs/architecture.md` opens with "grown into an
   arbitrary-precision calculator"; the prompt says calculator.
   *Proposed:* "an exact, unit-aware calculator whose primary interaction
   is a conversion", GNU units named once in getting started and in one
   "Differences from GNU units" appendix there; the eight-digit default
   keeps its "as GNU units shows" note in the settings reference.
3. **Where do the interface facts live?** The two fields, the lines, the
   copy button, the settings sheet's mechanics, installation, offline
   use and updates have no page in the target. *Proposed:* reading
   results goes into the foundation pages (it is semantics); the rest
   into one short `docs/app.md` guide page, or into getting started if
   it stays under a screen.
4. **Should the system units catalogue be its own page?**
   `docs/definitions.md#What the file contains` is a catalogue inside a
   language reference. *Proposed:* yes, `docs/units.md`, checked
   mechanically against `src/units.txt` (every unit, prefix, list and
   function name present), with the language page linking to it.
5. **How much representation may the settings reference show?** The
   significand limit is in bits and the precision limit in digits, which
   cannot be explained without saying what a significand and a grid
   are; the ownership rule allows naming the representation at a high
   level. *Proposed:* `numbers.md` says "a fraction times a power of ten,
   with an error radius" and "approximate values are kept to a number of
   digits"; `settings.md` explains each limit in one paragraph in those
   terms ("the size of an exact value, in bits of its numerator and
   denominator"; "the most digits an approximate value may be computed
   to"); grids, bits-per-digit, the 2,453 derivation and the dyadic
   cost stay in devdocs with a link.
6. **An error-message catalogue in docs/?** Messages are quoted all over
   both corpora and `src/messages.ts` has no page. *Proposed:* an
   appendix to `expressions.md` listing each message family with the rule
   it enforces and the page that owns the rule, generated or checked
   from `messages.ts`; internal kind names never appear in docs.
7. **What is authoritative.** Settled: the current pages are
   authoritative; a narrated predecessor is classified by the test at
   the top of this plan, never by its date; git is not cited in the
   pages.
8. **"certain" vs "certified".** The notes say "8 of 12 digits are
   certain"; devdocs say "certified" 100+ times; docs mix both.
   *Proposed:* "certified" as the concept in both corpora, the note text
   unchanged; alternatively rename the concept "certain digits" in docs
   only, which costs a mapping sentence in devdocs.
9. **Cost figures in docs/.** `docs/functions.md` gives timings for the
   Gamma family that disagree with devdocs and depend on the machine.
   *Proposed:* docs state qualitative cost rules only (expressions that
   never certify run to the ceiling; the first Gamma call at a new
   precision pays for the Bernoulli numbers); every number stays in
   `devdocs/cost.md` and `devdocs/builtins.md`.
10. **Who owns the exponent-bound explanation and the pass table?**
    Duplicated today (§9.1). *Proposed:* `numbers.md` (docs) owns the
    rule, the thresholds (`2.3026e18`) and the log-space advice with one
    example; `devdocs/numbers.md` owns the table and the measurements;
    `docs/functions.md#Very large results and approx` is dissolved.
11. **Does the parser accept `×`, `≤`, `≥` or `#` in the fields?** The
    screen writes `×` and the copy text `*`; conditions accept `≤`/`≥`;
    comments are a file feature. Nothing states what the two fields
    accept. *Proposed:* decide from `expr.ts` in D1 and state it in the
    grammar; if `×` is not accepted, say so beside the copy button's
    behaviour.
12. **Are user definitions documented as a feature?** Only the system
    file exists (#132). *Proposed:* the definition reference documents
    the language as the file's, with one sentence that typed definitions
    are not yet available; "Adding a unit" stays a contributor task in
    `devdocs/development.md`.
13. **Which page owns "conversion into a function"?** It is an output
    mode (quantities) and a consequence of inverses (definitions).
    *Proposed:* `quantities.md` owns what the answer is and when it
    exists; `definitions.md` owns writing an inverse and what is checked;
    `functions.md` says built-ins have none.
14. **`approx`: foundation or reference?** *Proposed:* both, with the
    foundation owning the concept (making a value inexact on purpose,
    never narrowing, identity in decimal mode) and the reference entry
    owning the signature and linking up.
15. **The width's name.** The panel's accessible label is "Ratio width";
    devdocs say "the notation's width". *Proposed:* "ratio width".
16. **How to count the settings.** "Six settings" with two nested
    sub-settings. *Proposed:* the reference has one entry per control
    (eight), and says the two nested ones belong to a mode.
17. **Generating part of the built-in reference.** *Proposed:* a script
    that imports `BUILTINS` and emits name, arity and dimension rule as a
    table, run in CI against the reference's headings; descriptions stay
    hand-written; adding a description field to `Builtin` is a source
    change to raise separately.
18. **Root `README.md` vs `docs/README.md`.** Identical intros.
    *Proposed:* the root README becomes three sentences and two links;
    `docs/README.md` is the user index.
19. **"Interval" for the temperature units.** Collides with the ball's
    interval. *Proposed:* "temperature difference" in docs.
20. **"Plain number" vs "dimensionless".** `architecture.md` calls kind
    primitives "dimensionless markers", so "dimensionless" there admits
    kinds. *Proposed:* "plain number" = no dimension and no kind, in
    both corpora; "dimensionless" in devdocs only for the empty vector.
21. **Getting started's scope.** Conversions only, or the calculator too?
    *Proposed:* both, conversions first, about ten worked examples, each
    linking to its owner; no definitions of its own.
22. **Offline/PWA content.** Currently in `docs/README.md`'s intro.
    *Proposed:* in `app.md` (question 3) with one line in the index.
23. **The probe's description in docs.** "the costliest built-ins" vs
    devdocs' elementary composite. *Proposed:* docs say "a composite of
    the elementary functions at the candidate ceiling, deliberately not
    the costlier special functions", citing the rationale's location.
24. **Devdocs re-explaining user semantics.** The ownership rule says
    devdocs link to docs for user-level semantics; today every topical
    page restates them. How far to cut? *Proposed:* each devdocs section
    opens with one sentence and a link to the owning docs section, then
    mechanism and rationale only; rules restated for the sake of a
    rationale are quoted in one line, not re-derived.
25. **Measurements that justify decisions.** The threshold between a
    quirk and a decision-against is settled by the principle's own
    criterion: keep a ruled-out path wherever knowing it would stop a
    future reader from re-proposing or re-litigating it; drop a slip no
    one would repeat, or one the rule's own statement already excludes.
    What remains open is the measurements that justify decisions in
    `devdocs/numbers.md`, `devdocs/builtins.md` and `devdocs/future.md`
    (timings of a scratch build, of gcds, of `pi`), which no tool
    regenerates. *Proposed:* keep a measurement only where the decision
    rests on its order of magnitude, dated and attributed to the
    machine; otherwise replace it by the qualitative reason it supports.
26. **Open-issue pointers as the living record.** The pages carry some
    forty links to open decisions and deferred extensions. *Proposed:*
    keep them, one per concept where a decision is pending, as the
    living record of what is open; drop a link once its issue is closed
    and the page states the outcome.
27. **The settings migrations.** The list in `devdocs/settings.md#Storage`
    reads like history (versions 1 to 5 with their shapes). *Proposed:*
    it is mechanism the code needs and stays, written as what each
    migration reads and writes, without the reasons for the renames,
    which live with the concept in `#The model`.
28. **Unification across the two sides.** *Proposed:* the concept map in
    §7.1 is the instrument. Each core concept has exactly one user-side
    owner and one developer-side owner, each linking to the other; the
    user side states the rule, the developer side the mechanism, the
    decision and the decisions-against. A concept that lacks either
    owner after the restructuring is a gap to fill, not a page to pad.
29. **The principle's permanent home.** `audit/principles.md` holds the
    documentation principle during the revamp. *Proposed:* install it in
    `devdocs/development.md#Style guide` when the revamp lands, beside the
    existing rule that a code comment names a page and a section and
    never a decision number, which is the same principle applied to
    comments; `devdocs/README.md` keeps its one-sentence statement and
    links to it. A `CLAUDE.md`, if one is ever added, points at the
    style guide rather than restating it, since the rule binds every
    contributor. It should merge into `main` with the revamp: it is a
    standing rule for the pages, not an artifact of the audit.
