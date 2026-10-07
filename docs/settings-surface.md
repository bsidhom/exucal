# The surface: where the settings live, and when a change applies

The design note for step S4 of docs/settings-plan.md: where the settings
live, how they are reached when a result is long, and whether a change
applies as it is made or when the panel closes, which the plan's P13
(its placement half) and P14 raise. **Status: proposed.** It decides
the container, the apply semantics and the entry point, and no more:
the grouping, the widgets, the explanations and the names are S5's, and
the reset's buttons, which S1 left to S5, stay there; this step moves
the controls as they are into a container that fits them, so that S5
can change the controls without moving them again. It changes no
setting's meaning and nothing in the core.

## The surface as it is

A `<details>` under the converter's output, closed on every load, whose
summary is the word "Settings". Open, it holds the six settings, the
notation or the working digits under the mode, the probe's budget and
its button, each with a line under it, in a wrapping row that is one
column on a phone. Every change applies as it is made: the panel emits
it, the shell clamps what depends on it and saves, and the result above
re-renders at once, so that the user sees what the display digits, the
rounding, the mode and the notation do to the line they are looking at.

Measured on the current build, at a phone's width (390 by 844) with the
panel open under a one-line result, the page is 1,783 pixels tall and
the panel 1,400 of them: the first control sits a third of the way down
and the result is off the screen by the second. At a desktop's width
(1,024 by 900) the result and the first row of controls share the
screen and the rest scrolls below. Two things follow, and they pull
against each other:

- **The entry point moves with the result.** The summary sits under the
  output, so a result of many lines (a unit list, a long refusal) pushes
  it down, and a phone has to scroll past the result to find it.
- **A setting is best changed beside its effect.** The display digits,
  the rounding, the mode and the notation are each a change the user
  makes to see the result written otherwise, and apply-on-change is what
  lets them see it. On a phone the inline panel defeats that: by the
  second control the result is above the fold, and the user scrolls up
  to read what the change did and down to change it again.

The plan lists four containers: the disclosure as it is, a modal, a
popover from a control in the shell, and a page of its own. The second
and the fourth hide the result, which the second point above rules out
for the four settings that are changed to see their effect; a modal
would need apply-on-close and a draft of the settings, and a page would
need the user to go back and forth. What is wanted is a surface that
is reachable from anywhere on the page, that leaves the result visible
while it is open, and that applies a change as it is made.

## Decision: a sheet, opened from the header, live

**The container is a sheet**: a panel laid over the page rather than in
its flow, fixed to the viewport, scrolling inside itself, with the page
behind it still live and still scrollable. On a narrow viewport it is a
bottom sheet, the lower part of the screen, so that the inputs and the
first lines of the result stay in view above it; on a wide viewport it
is a side sheet along the right edge, the full height, so that the
centered column of inputs and result stays in view beside it. One
element, two placements by a media query at the width where the column
and the sheet no longer fit side by side (the column is 32rem wide and
the sheet about 24rem, so about 60rem with margins).

The sheet is a `<dialog>` shown non-modally (`show()`, not
`showModal()`): the element the platform has for a panel that is opened
and closed, with its `open` state, its role and its labelling, and
without the modal's backdrop, focus trap and inert page, since the page
behind it is exactly what must stay usable. It closes from its own
Close button, from the Escape key (which a non-modal dialog does not
handle on its own; the panel does) and from the button that opened it;
it does not close on a tap outside it, since on a desktop the user may
type in the inputs with it open and watch the result, and on a phone a
tap on the result above the sheet is reading, not dismissing. It is
closed on every load, as the disclosure was.

**A change applies as it is made**, as today. Apply-on-close would need
a draft copy of the settings, a dirty state, a Cancel, and a rule for
what a reset does to a draft, and would take away the one thing the
sheet is for, seeing the effect of a change while making it. The costs
of applying at once are already paid: a change to the precision limit
rebuilds the unit table (P14), a few milliseconds that the shell
memoizes by the ceiling and that no other setting incurs, and the probe
proposes rather than applies, with its own Apply. A refused number
snaps back with its line and a clamp tells what it moved, as S3 landed
them; nothing about that changes.

**The entry point is a button in the header**, beside the title, on the
page from the first paint and above the inputs, so that it is in the
same place whatever the result's length: a short scroll to the top on
a phone when a long result has been read, and one tap. It is a toggle
(`aria-expanded`, `aria-controls` naming the sheet), labelled
"Settings" with a gear glyph, and it is the one entry point: the
summary under the output goes. Focus moves into the sheet when it opens
and back to the button when it closes. The header is not made sticky:
it would cost a line of every screen for the one case of a long result,
and the browser's own scroll to the top is a flick; S5 can revisit it
with the layouts if the phone's use finds otherwise.

**A result does not offer a quick change of the settings that shaped
it** (more digits, the other mode, a ratio): deferred, not refused. The
sheet is a tap away and shows the result live, which is what such an
affordance would give, and it would have to be designed per line (which
settings, where on the line, how it reads in a list of terms) against
the display rules of docs/fractions.md and docs/ratio-width.md. If S5
or S6 finds the sheet too far for the display digits in particular, a
stepper beside the output is the shape to consider then, as a
convenience over the same setting and never a second place it is kept.

## What the sheet holds

Everything the panel holds today, in the order it has today, unchanged
in this step: the display digits with decimal mode's working digits,
the two limits, the rounding, the mode with its notation, the probe's
budget and button, and the proposal with its Apply. Above them a
header with the title "Settings" and the Close button. The sheet
scrolls when its content is taller than it, which on a phone it is: the
bottom sheet is at most three fifths of the viewport's height, so that
the inputs and the result's first lines stay above it, and the user
scrolls the controls within it. S5 decides whether the lines are shown
always or on request, which is what will shorten it; this step makes no
line shorter and hides none.

## Where it goes

- `src/settings-panel.ts`: the `<dialog>` as the root of the panel in
  place of the `<details>`, with the header; an `open` property the
  shell sets and a `settings-close` event the panel emits when it
  closes itself (Close, Escape), so that the shell's state and the
  dialog's agree; `show()` and `close()` called in `updated` when the
  property changes; the two placements in the panel's own styles, with
  the media query and the height and width above; focus into the sheet
  on open. The controls and their lines as they are.
- `src/app-shell.ts`: the header as a row holding the title and the
  toggle button, which flips an `open` state the shell owns and passes
  to the panel, and takes focus back when the panel closes; the panel
  moved out of `<main>`'s flow, since the sheet is fixed to the
  viewport.
- `src/styles.ts`: nothing new unless the toggle shares the button's
  look, which it does.
- README ("Settings"): the first sentence, "under the converter", says
  where the sheet is and how it opens, and that a change applies as it
  is made. ARCHITECTURE.md: the shell's description of the panel and the
  settings' flow. docs/shell-refactor.md's open questions for the UX
  step: the one about the settings' surface answered here.
  docs/settings-plan.md: S4 done, with this note.
- Tests: the shell and the panel are Lit components, which the Node
  suite does not render, as today; the lines stay in settings-lines.ts
  with their tests. The change is verified as #147 was, by a Playwright
  run against the built app recorded in the change's description: at
  320 to 480 pixels wide with the sheet open, the page's `scrollWidth`
  is the viewport's width and the output's top edge is within the
  viewport; at 1,024 wide the column and the sheet do not overlap; the
  toggle, Close and Escape agree with the dialog's `open`.

## Done when

- The settings open from a button in the header and nowhere else, as a
  sheet over the page: a bottom sheet at a phone's width, a side sheet
  at a desktop's, the page behind it live and scrollable, the result
  visible with the sheet open at both widths.
- A change applies as it is made, and the result shows it while the
  sheet is open; the refusal's and the clamp's lines are as S3 landed
  them.
- The sheet closes from its Close button, from Escape and from the
  header's button, and focus returns to that button.
- Nothing in the sheet overflows a phone's width (#147 stays closed).
- Every control, line and value is as it was: this step moves the
  panel and changes nothing in it.

## D30, proposed

**D30. The settings are a sheet over the page, opened from the header,
and a change applies as it is made.** A bottom sheet on a narrow
viewport and a side sheet on a wide one, a non-modal `<dialog>` fixed
to the viewport with the page live behind it, so that the result stays
in view while a setting is changed to see its effect; opened and
closed from a toggle beside the title, which is on the page whatever
the result's length, and closed from its own Close button and Escape.
Apply-on-change stays: the costs it incurs are the table's memoized
rebuild on a change to the precision limit and nothing else, and
apply-on-close would need a draft and a Cancel and would hide what the
sheet is for. A result offers no shortcut to the settings that shaped
it; a stepper beside the output for the display digits is the one shape
to consider later, as a convenience over the same setting.

## Not in this step

- **The grouping, the widgets, the explanations on request, the names,
  the reset's buttons and the per-control feedback (S5).** The sheet
  holds the controls as they are.
- **The user's guide (S6).**
- **The probe's freeze (#163)** and responsiveness while a cost is paid
  (#118): the sheet changes nothing about what blocks the main thread.
- **A sticky header**, revisited by S5 if the phone's use wants it.
- **The quick change from a result**, deferred as above.
