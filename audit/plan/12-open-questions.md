*Section 12 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 12. Open questions

The owner's decisions, recorded question by question from the review of
this plan; the numbering is kept so that references elsewhere still
resolve. Every question is decided; 20 and 31 are decided for now, with
the later work each needs noted.

1. **The removed design notes.** Decided: not resurrected, and no
   history page. An audit unit may read a removed note in git for one
   purpose, to recover the reason for a decision that a current page
   states without one, and writes that reason into the page in one or
   two sentences. Where the note does not settle it, the unit defers to
   the owner.
2. **Which framing leads docs/.** Decided: the calculator, with unit
   awareness and kind checking as a feature. The calculator is the bulk
   of the work and the app's original motivation; a setting or toggle
   that suppresses the conversion target, for first-class calculator
   use, is under consideration (§1.3). The docs are not grounded on GNU
   units: a similarity is called out only where it helps a user onboard,
   in unit-conversion semantics and definitions, and never for numeric
   semantics, so the "as GNU units shows" note on the display digits
   goes. The getting started guide opens with the calculator (question
   21), and there is no "Differences from GNU units" section.
3. **Where the interface facts live.** Decided: how to use the have and
   want fields and how to interpret the results belong to the foundation
   pages; what is specific to the web app, installing, offline use,
   updates, the settings sheet's mechanics and copying, goes in
   `docs/app.md`, an app-specific guide.
4. **The units page.** Decided: kept, as a friendly guide, with
   `src/units.txt` the source of truth the page may defer to. Later it
   may be generated from structured comments in the definitions file,
   by the docs tool (§4.4).
5. **Foundational detail and the settings reference.** Decided against
   the division first proposed: the settings page is not where
   foundational details surface; it references the numerics foundation.
   `numbers.md` owns how a value is held, to the depth a user needs to
   understand the behaviour: the fraction and its bit size, the power
   of ten and its bound, the error radius, the digits an approximate
   value is kept to, and the two limits that bound them; each settings
   entry explains its limit in a sentence and links there. The dyadic
   cost (`2^-30000` refused where `2^-28000` is a value) goes to the
   user docs too, on this reasoning: it decides which inputs are
   refused, and a user of a ball-arithmetic calculator, like a user of
   Arb or FLINT, needs the representation's cost model to predict both
   refusals and cost; the derivation (the factor of `log2 5`) stays in
   devdocs. The owner leaned the same way and may still overrule.
6. **An error-message catalogue.** Decided: generated from
   `src/messages.ts` by the docs tool, as one of its extractors, at
   build time (question 30); nothing is hand-written in the interim;
   internal kind names never appear in docs.
7. **What is authoritative.** Decided: the current pages are
   authoritative; a passage describing a superseded design is rewritten
   to the current design and only its intent kept, whatever its date
   (`audit/principles.md`); git is not cited in the pages.
8. **"certain" vs "certified".** Decided: "certified" and
   "certification" everywhere applicable, in both corpora and in the
   app's notes, since the term has its specific meaning on the ball. The
   note wording in the app ("8 of 12 digits are certain") is a code
   change, recorded for unit A2.
9. **Cost figures in docs/.** Decided: user docs give qualitative
   descriptions and warnings only, never concrete runtime
   characteristics; numbers stay with the benchmarks and the stress
   tools.
10. **The exponent-bound explanation and the pass table.** Decided as
    proposed: `numbers.md` owns the rule, the thresholds and the
    log-space advice with one example; `devdocs/numbers.md` owns the
    table and the measurements; `docs/functions.md#Very large results and
    approx` is dissolved. `approx` still gets an explicit built-in
    entry, through the generated reference (question 14).
11. **Display-only characters and the copy path.** Decided: rendering
    characters such as `×` are not accepted by the grammar today (they
    may be added later). The copy button does not copy the display text;
    it produces its output from the internal representation through a
    copy-output path. The guiding principle of the output format is that
    every result pastes back into the calculator, modulo display
    niceties; `numbers.md` states the principle and `expressions.md` what
    the grammar accepts. Whether `#` is accepted in the fields is read
    from `expr.ts` in unit D1.
12. **User definitions.** Decided: true user-defined functions and units
    are intended; the editing UX, a general text-editing problem, is not
    designed yet (#132). The definition reference documents the language
    as the language of definitions, system and user alike, and says that
    today only the system file is loaded; the intent is recorded (§1.3).
13. **Conversion into a function.** Decided as proposed: `quantities.md`
    owns what the answer is and when it exists; `definitions.md` owns
    writing an inverse and what is checked; `functions.md` says
    built-ins have none.
14. **`approx`: foundation and reference.** Decided as proposed: the
    foundation owns the concept and its semantics; the reference entry
    is mechanical (signature and the like) with a brief description that
    need not be self-contained.
15. **The width's name.** Decided: the panel's "width" with a "digits"
    unit on the input stays; the docs call it the ratio width, in
    digits, naming its unit as every setting's is named.
16. **Counting the settings.** Decided: no count anywhere; the reference
    lists the settings grouped and nested by mode.
17. **Generating the built-in reference.** Decided, and inverted: the
    documentation of each built-in lives beside its implementation as a
    structured comment, and a TypeScript tool generates the reference
    from those comments at build time (question 30); the design and the
    implementation follow the docs refactor as a separate block of work
    (§4). Nothing is hand-documented per function in the meantime.
18. **Root `README.md` vs `docs/README.md`.** Decided as proposed: the
    root README becomes three sentences and two links; `docs/README.md`
    is the user index and `devdocs/README.md` the developer index,
    revised to the map in §7.1.
19. **"Interval" for the temperature units.** Decided: "temperature
    difference".
20. **"dimensionless" and the kinds.** Decided for now: "dimensionless"
    is reserved for a plain scalar number, with neither dimension nor
    kind, and never describes a kind. The radian is believed to be the
    only kind today (unit D3 confirms it in the file), so the docs refer
    to it verbosely, "an angle" or "a quantity of the radian kind", and
    a general term for a quantity with a kind and no dimension is
    settled later, when the kind abstraction itself is shored up.
21. **Getting started's scope.** Decided: both, opening with the basic
    calculator and adding conversions after it (question 2).
22. **Offline and installation content.** Decided: `app.md` (question
    3), with one line in the index.
23. **The probe's description in docs.** Decided as proposed; "the
    costliest built-ins" is incorrect and stays incorrect for the
    elementary composite.
24. **Devdocs re-explaining user semantics.** Decided as proposed: each
    devdocs section opens with one sentence and a link to the owning
    docs section, then mechanism and rationale only; a rule restated for
    the sake of a rationale is quoted in one line, not re-derived.
25. **Measurements in documentation.** Decided: concrete timings leave
    the pages wherever reasonable and live in the benchmarks and the
    stress tools; a decision keeps the qualitative reason it rests on.
26. **Issue pointers.** Decided, with the clarification the owner asked
    for: the docs do not mirror issues. An open issue is linked from at
    most one place, the passage that owns the concept it concerns, and
    the link says only what is open. When the issue is resolved, every
    reference to it is deleted and the page is fixed to state the
    current design.
27. **The settings migrations.** Decided: `devdocs/settings.md` keeps why
    migrations exist, the envelope and the format version, the
    interface and the load-and-migrate flow, and the intent and
    structure of the current version's fields. The per-version list of
    migrated fields is a code concern and goes (§1.1.5).
28. **Unification across the two sides.** Decided as proposed: the map
    in §7.1 is the instrument; a concept that lacks either owner after
    the restructuring is a gap to fill, not a page to pad.
29. **The principle's permanent home.** Decided as proposed:
    `devdocs/development.md#Style guide`, with `devdocs/README.md` linking
    to it; a `CLAUDE.md`, if ever added, points at the style guide; it
    merges into `main` with the revamp.
30. **The generated references: built, not committed; one tool.**
    Decided: only the code and the structured comments are checked in.
    The documentation is generated at build time, with the rest of the
    build artifacts, and distributed with the web app so that it is
    cached for offline use; devdocs need not ship that way, though
    shipping them is not opposed. One docs tool carries the extractors
    (structured comments, the grammar DSL, the messages), wired into the
    standard build and never run out of band against the tracked tree.
31. **Do the hand-written pages ship with the app too?** Decided in
    principle: yes. The intention is to package every document useful
    to a user with the app itself and cache it for offline use. That is
    its own work chunk with its own design questions, not to be solved
    now: the owner leans away from shipping raw Markdown, so it needs a
    homegrown Markdown parser and HTML generator, and it touches the
    pipeline and the packaging. What the refactor does now is keep the
    door open: stable file names and heading anchors, repo-relative
    links, and pages written in a small, stable Markdown subset that
    such a renderer can carry (`audit/principles.md`, "Markdown
    principle", proposed).
