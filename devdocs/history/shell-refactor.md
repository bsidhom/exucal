# Refactoring the app shell

Implemented, in the seven steps at the end, with three departures from
the text below: `styles.ts` shares the button and hint rules but leaves
the converter's control look where it is, since the converter was not to
change; `isMaxBits` stays, for `loadSettings` and the bench; and
devdocs/history/calculator-plan.md is left as it is, since it records the tasks as
they landed. The questions for the UX step still stand, but one is answered since:
the update check moved out of the settings panel into the footer, where
tapping the build number checks and the footer's one status slot reports
what the check found (app-footer.ts); `update-check.ts` and
`update-report.ts` went with it, and the panel has no slot.

The proposal. Behavior stays exactly as it is; the aim is that a programmer
new to the project can read `src/app-shell.ts` top to bottom and see what
the app is made of. A later step rethinks the UX (the settings above all),
and this layout is meant to make that step a change to one or two files.

## What the shell does today

`src/app-shell.ts` is one 668-line class with ten jobs:

1. The page layout and **all** of the page's CSS, including the settings
   form's and the footer's (145 lines of styles).
2. Loading the definitions: the async state, the loading message, the
   failure message and the retry.
3. Building the unit table from them in `render`.
4. The settings: the state, reading and saving storage, clamping.
5. Six change handlers, one per control, each doing the same four things:
   cast the event target, read the value, validate it against a range that
   is also spelled out in the template's `min`/`max`, and on a bad value
   write the old one back into the DOM by hand.
6. The "Recommend limits" probe: a `recommending` flag and the
   paint-then-block dance.
7. Subscribing to the service worker's status in `connectedCallback`, and
   unsubscribing in `disconnectedCallback`.
8. The footer: the build ID and a ten-case switch over the worker's status.
9. The "Check for updates" button: an `updateCheck` flag and a second
   switch over the worker's status for the line under the button.
10. The display labels of the rounding modes and the modes.

Nothing here is wrong, and each piece is well commented. The trouble is
that they are interleaved in one class, so the reader has to hold the
settings form, the service worker and the table build in mind at once to
follow any of them, and the data flow (what is state, what is derived from
it, what is an effect) is implicit in method bodies rather than visible in
the structure.

Three specific things make it harder to read than it needs to be:

- **Knowledge is duplicated.** Each number setting's range appears twice:
  in the `min`/`max` the template renders and in the `isDigits`,
  `isMaxDigits`, `isMaxBits` predicates the handler calls. The worker's
  status is interpreted in two unrelated switches.
- **The DOM is written imperatively.** On a rejected value the handler
  does `input.value = String(this.settings.digits)`, because Lit's `.value`
  binding does not re-set a property whose bound value has not changed.
  So the view is not quite a function of the state.
- **Lifecycle plumbing is hand-rolled.** The status subscription is three
  members and two lifecycle overrides for what is one fact: "while
  connected, mirror this source into state".

## Principles

- **The view is a function of the state.** Every template is
  `render(state) → html`, and anything the view needs that is not state is
  derived in a pure function that can be tested under Node, as `outcome.ts`
  and `messages.ts` already are.
- **Properties down, events up.** A child component takes what it shows as
  properties and reports what the user did as an event. It never reaches
  for storage or the parent. The shell is the one place that turns an
  event into a state change and an effect (the save).
- **Compose, in Lit's own terms.** Lit gives three units of composition:
  custom elements (for a piece with its own state or styles), template
  functions (for a piece with neither), and reactive controllers (for a
  piece of lifecycle). Use those, and nothing from outside Lit.
- **One file, one job**, named for the thing it renders.
- **No new dependencies.** `@lit/task`, `@lit-labs/signals` and
  `@lit/context` would each cover a part of this, but the shell has one
  async value, one subscription and two levels of nesting, which is not
  enough to pay for a library, and the project's rule is "nothing beyond
  Lit" (ARCHITECTURE.md). The proposal below is about 40 lines of generic
  code in total.

## The target

```
src/app-shell.ts          composition root: the state, the layout, the wiring
src/settings-panel.ts     <settings-panel>: the controls, from a list of fields; emits settings-change
src/update-check.ts       <update-check>: the button and the line under it
src/app-footer.ts         <app-footer>: the build ID and the worker's status
src/subscription.ts       Subscription: a reactive controller that mirrors a source into the host
src/styles.ts             the button and control styles the components share
src/settings.ts           (existing) + rangesOf: the bounds of the three number settings
```

Data flow:

```
localStorage ──loadSettings──▶ settings ──contextOf──▶ context ──┐
                                   │                             ├──▶ <unit-converter>
loadSystemDefinitions ──▶ definitions ──buildSystemTable(…, context)──▶ table ┘
                                   │
                                   └──▶ <settings-panel .settings> ──settings-change──▶ clampSettings + saveSettings
onWorkerStatus ──Subscription──▶ status ──▶ <app-footer .status>
                                        └─▶ <update-check .status>   (slotted into the panel)
```

Three pieces of state live in the shell, each with one source: `settings`
(storage, then the panel's events), `definitions` (one promise) and the
worker's `status` (the subscription). Everything else is derived in
`render`. Nothing else in the tree holds app state; the children hold only
their own transient UI state (a probe running, a check under way).

### `app-shell.ts` (about 120 lines plus comments)

```ts
@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = css`
    /* layout: :host, main, h1, the loading and failure messages */
  `;

  @state() private definitions?: Result<
    readonly Definition[],
    SystemDefinitionsError
  >;
  @state() private settings: Settings = loadSettings(localStorage);
  private readonly worker = new Subscription(this, onWorkerStatus);

  connectedCallback() {
    super.connectedCallback();
    this.load();
  }

  render() {
    const context = contextOf(this.settings);
    return html`
      <main>
        <h1>Units</h1>
        ${this.renderContent(context)}
        <settings-panel
          .settings=${this.settings}
          @settings-change=${this.onSettingsChange}
        >
          <update-check .status=${this.worker.value}></update-check>
        </settings-panel>
      </main>
      <app-footer .status=${this.worker.value}></app-footer>
    `;
  }

  /** The one place a settings change becomes state and an effect. */
  private onSettingsChange(event: CustomEvent<Partial<Settings>>) {
    this.settings = clampSettings({ ...this.settings, ...event.detail });
    saveSettings(localStorage, this.settings);
  }

  private load() {
    /* as today */
  }

  private renderContent(context: NumberContext) {
    const table = tableOf(this.definitions, context);
    switch (table.kind) {
      case "loading":
        return html`<p class="loading" aria-live="polite">Loading units…</p>`;
      case "failed":
        return renderFailure(table.error, this.load);
      case "ready":
        return html`<unit-converter
          .table=${table.value}
          .context=${context}
          .fractions=${this.settings.fractions}
        ></unit-converter>`;
    }
  }
}
```

`tableOf` is a small pure function (`undefined` → loading; a failed load
or build → failed; else ready) so that `renderContent` is a three-way
switch rather than two nested `if`s over two kinds of `Result`. The shell
keeps no reference to the service worker beyond the one subscription, and
knows nothing of what a setting is or how it is validated.

The `<update-check>` goes into the panel through a slot rather than being
rendered by the panel, so that `settings-panel.ts` knows nothing of the
service worker, and the button can move elsewhere in the UX step by
changing one line here.

### `settings-panel.ts`

Takes `settings` as a property and emits `settings-change` with a
`Partial<Settings>`. Owns the `recommending` flag, since the probe's result
is just another settings change. Owns the `.settings` CSS that is in the
shell now, and the label tables.

The six handlers collapse into two generic ones over a declarative list of
fields:

```ts
/** A number setting: which, how it is labeled, and the line under it. */
type NumberField = {
  readonly key: "digits" | "precisionLimitDigits" | "significandLimitBits";
  readonly label: string;
  readonly hint: (settings: Settings) => string;
};

const NUMBER_FIELDS: readonly NumberField[] = [
  { key: "digits", label: "Digits", hint: () => "Significant digits shown. …" },
  {
    key: "precisionLimitDigits",
    label: "Precision limit",
    hint: ({ precisionLimitDigits }) =>
      `… ${ceilingFor(precisionLimitDigits).toLocaleString("en-US")} digits, …`,
  },
  {
    key: "significandLimitBits",
    label: "Most bits",
    hint: () => "The most bits in …",
  },
];
```

```ts
private renderNumber(field: NumberField) {
  const { min, max } = rangesOf(this.settings)[field.key];
  return html`<label>
    ${field.label}
    <input type="number" inputmode="numeric" step="1" min=${min} max=${max}
      .value=${live(String(this.settings[field.key]))}
      @change=${this.onNumberChange(field)} />
    <small class="hint">${field.hint(this.settings)}</small>
  </label>`;
}

private onNumberChange(field: NumberField) {
  return (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (isIntegerIn(value, rangesOf(this.settings)[field.key])) {
      this.emit({ [field.key]: value });
    } else {
      this.requestUpdate(); // not a setting: the render below snaps the input back
    }
  };
}
```

Two things to note:

- **`rangesOf(settings)`** moves to `settings.ts` and becomes the one
  statement of each number setting's bounds (`significandLimitBits` in
  `[MIN_SIGNIFICAND_LIMIT_BITS, MAX_SIGNIFICAND_LIMIT_BITS]`, `precisionLimitDigits` in `[1, precisionLimitFor(significandLimitBits)]`,
  `digits` in `[1, precisionLimitDigits]`). The template's `min`/`max`, the validation,
  and `clampSettings` all read it, so the range can no longer drift between
  them. `isDigits`, `isMaxDigits` and `isMaxBits` become
  `isIntegerIn(value, rangesOf(settings).digits)` and so on; their tests
  carry over to `rangesOf`.
- **`live()`** is Lit's directive for exactly the snap-back case: it
  compares the bound value with the input's _live_ DOM value rather than
  with the last value Lit committed, so a rejected edit is undone by the
  next render instead of by an imperative write. The view is a function of
  the state again, and the handler shrinks to "valid → emit, else →
  re-render".

The two selects get one `renderSelect(label, options, labels, value,
onChange)` with `isMode` and an exported `isRoundingMode` as the guards.
The checkbox stays as it is.

The probe keeps its paint-then-run sequence (`await this.updateComplete`,
then a `setTimeout(0)`), as a tiny named helper, `afterPaint(this)`, so the
reader learns what the two awaits are for from the name rather than from a
comment.

### `update-check.ts`

Takes `status: WorkerStatus` as a property; owns the `check` flag; calls
`checkForUpdate()`. Renders nothing when the status is one with nothing to
check (development, unsupported, failed), as today. The line under the
button becomes a pure function, `checkReport(check, status): string |
undefined`, which is one of the two status switches today and gets a Node
test alongside `service-worker-updates.test.ts`.

### `app-footer.ts`

Takes `status` as a property; renders the build ID and `renderWorkerStatus(status)`,
which is the other status switch, moved verbatim, plus the footer's CSS.
Its two actions, `applyUpdate` and `location.reload()`, are called
directly, as today.

### `subscription.ts`

```ts
/** Mirrors a source into the host for as long as the host is connected. */
export class Subscription<T> implements ReactiveController {
  value!: T;
  private stop?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly subscribe: (listener: (value: T) => void) => () => void,
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.stop = this.subscribe((value) => {
      this.value = value;
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.stop?.();
  }
}
```

`onWorkerStatus` already has the shape it wants (call the listener at
once and on every change, return the stop) and calls back synchronously,
so `value` is set before the first render. This is the only generic
abstraction the proposal adds; it replaces the `workerStatus` state, the
`stopStatusReports` field and both lifecycle overrides, and would serve any
other external source the app grows later. `register-service-worker.ts`
does not change.

### `styles.ts`

The `button` rule is needed by four components now (the shell's retry,
the panel, the check, the footer's links), and the panel and the converter
share the bordered-control look. One exported `buttonStyles` and
`controlStyles`, composed as `static styles = [buttonStyles, css\`…\`]`,
keeps each component's sheet to what is its own.

## What does not change

- `<unit-converter>` and its properties (`table`, `context`, `fractions`).
- `settings.ts`'s storage format, `loadSettings`, `saveSettings`,
  `clampSettings`, `contextOf`, and the clamp order.
- `register-service-worker.ts`, `service-worker-updates.ts`,
  `system-table.ts`, `system-build.ts`, `limits.ts`.
- Every string the user sees, every `role`/`aria-*` attribute, the
  `<details>`, the markup order, and the CSS rules (they move, they are not
  rewritten).
- The build memo still runs in `render`, keyed by the ceiling.

## Not proposed, and why

- **A settings store or state manager.** The settings are one value and
  one reducer line (`clampSettings({...settings, ...change})`) and one
  effect (`saveSettings`). Wrapping that in a class would hide the simplest
  part of the app.
- **Signals (`@lit-labs/signals`).** They would make `status` and
  `settings` globally readable, which is exactly what makes the current
  file hard to follow; properties down and events up keep the flow visible.
  Worth revisiting only if the UX step adds routes or more than one page.
- **`@lit/task`** for the definitions load. One promise set on one state
  field is already the idiom; the `tableOf` function gives the three-state
  view without a dependency.
- **Context (`@lit/context`)** for passing the worker status. Two
  properties on two children is not deep enough to need it.
- **Splitting `unit-converter.ts`.** It already follows the pattern this
  proposal asks of the shell.

## Steps

Each step keeps the app working and is one commit, checked by
`pnpm typecheck && pnpm test && pnpm format:check`, and by `pnpm build &&
pnpm preview` to click through what moved (the settings' snap-back, the
retry, the update check, the footer link).

1. `app-footer.ts`: move the footer and its CSS; the shell renders
   `<app-footer .status=${this.workerStatus}>`.
2. `subscription.ts`: replace the status state and both lifecycle
   overrides with `new Subscription(this, onWorkerStatus)`.
3. `update-check.ts`: move the button, the `check` flag and
   `checkReport` (with a test); the shell slots it into the panel in step 4
   and renders it inside the `<details>` until then.
4. `settings.ts`: add `rangesOf` and `isIntegerIn`, re-express the three
   predicates and `clampSettings` through them, move the tests.
   `settings-panel.ts`: move the controls, the labels, the probe and the
   `.settings` CSS; fields from `NUMBER_FIELDS`; `live()` for snap-back;
   `settings-change` events; the shell gains `onSettingsChange`.
5. `styles.ts`: factor the shared button and control rules.
6. The shell: `tableOf`, the layout-only sheet, the doc comment rewritten
   to describe the wiring rather than every feature (each feature's
   comment moves with its code).
7. Docs: the file lists in README.md ("Repository layout") and
   ARCHITECTURE.md (the table at the end and "UI"), and the three places
   that say which file holds a control (devdocs/design/decimal.md 4.7,
   devdocs/design/fractions.md, devdocs/history/calculator-plan.md D16) now name
   `settings-panel.ts`.

New Node tests: `rangesOf` (in `settings.test.ts`), `checkReport` and
`tableOf` (small, beside their modules). There is no DOM test harness in
the repo and this proposal does not add one; the components are kept thin
enough that what they do is visible in the template.

## Questions for the UX step, not this one

The layout above is meant to leave these open rather than answer them:
whether the settings become a dialog or a page of their own (the panel
already takes everything by property, so it can move; answered since
by S4 of devdocs/history/settings-plan.md, devdocs/design/settings-surface.md: a non-modal
dialog, a sheet over the page), whether the
limits and the probe are "advanced" settings apart from digits, rounding
and mode (the field list splits in two), and where "Check for updates"
belongs (one line in the shell).
