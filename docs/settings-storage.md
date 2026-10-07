# Settings storage: a version, migrations, and reset

The design note for S1 of docs/settings-plan.md. The settings are stored
as one JSON object with no version, so a field that is renamed, split or
merged by a later step would silently fall back to its default on the
next load. This note gives the stored settings a version and a migration
path, a reset, and a record of which build wrote them, and changes
nothing about what the settings are: no field is renamed or reshaped
here. The first migration carries the current fields over unchanged, so
that the mechanism is exercised end to end before S2 and S3 need it.

## Two versions, kept apart

The number stored with the settings is a format version: it says what
shape the stored object has and what its fields mean, so that a later
build can read it. It is bumped only in the commit that changes the
stored format, it is never renumbered, and it is never computed from any
release identifier.

The app's own version is a different thing. Today a release is named by
the commit it was built from (build-id.ts), and a study of semantic
versioning is under way and continues on its own, asynchronously of
this step. The two do not conflict, because they answer different
questions: the format version answers "can this build read this stored
object", and a release version answers "what changed for the user
between two releases". They move at different rates, since most releases
leave the stored format alone, and semantic versioning's rules say
nothing about stored data. Every system that persists data keeps the
two apart in just this way: a database schema, a file format, IndexedDB's
own `version` and a browser's preference files all carry an integer
format version independent of the product's release number.

Kept apart, they combine well once semantic versioning lands: a release
note can say which format versions a release migrates between, and a
major release can be the signal that a stored setting could not be
carried over, which is then a decision about communication, not about
storage. The one thing that would create a mismatch is deriving either
number from the other, and this note rules that out.

## What is stored

Version 1 is the object the app writes today, the six fields bare:

```json
{
  "digits": 8,
  "rounding": "halfAwayFromZero",
  "mode": "exact",
  "maxDigits": 1000,
  "maxBits": 65536,
  "fractions": false
}
```

It has no `version` field, and that is how it is recognized: a stored
object without one is version 1 by definition.

From version 2 on, the settings sit inside an envelope:

```json
{
  "version": 2,
  "savedBy": "6c0d0946da31e92eb7d2737a1aebfdf61c1ebf86",
  "settings": {
    "digits": 8,
    "rounding": "halfAwayFromZero",
    "mode": "exact",
    "maxDigits": 1000,
    "maxBits": 65536,
    "fractions": false
  }
}
```

- `version` is the format version, an integer.
- `savedBy` is the build that last wrote the object: the whole build
  string of build-id.ts, a full commit hash with `-dirty` when the tree
  was, never the shortened form the footer shows, which could collide. It
  is diagnostic: when a user reports a strange setting, it says which
  build wrote it. Nothing reads it to make a decision.
- `settings` is the record the rest of the app uses, and its type stays
  the `Settings` of settings.ts with no version field mixed in.

The migration from 1 to 2 wraps the bare object in the envelope and
changes nothing else, which is the point: the first real migration runs
in every user's browser with no semantic change to go wrong.

Version 3 (S2 and S2b, docs/settings-modes.md and docs/working-digits.md)
is the first that changes meaning. The mode is a nested choice carrying
what belongs to it, in place of the mode name and the `fractions` flag:

```json
{
  "version": 3,
  "savedBy": "…",
  "settings": {
    "digits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": "ratio" },
    "maxDigits": 1000,
    "maxBits": 65536
  }
}
```

`mode` is `{ "kind": "exact", "notation": "digits" | "ratio" }` or
`{ "kind": "decimal", "working": { "kind": "digits" } | { "kind":
"extended", "digits": 12 } }`. The migration from 2 to 3 builds it from
the two stored fields (`decimal` with its working digits locked to
The display digits; `exact` with the notation `ratio` when the stored `fractions`
was `true` and `digits` otherwise), drops `fractions`, and carries the
rounding default's change in the same step: a stored `halfAwayFromZero`,
the old default echoed by every save, becomes `halfEven`. A mode that is
neither name passes through for the validation to default, as S1
requires; the validation of version 3 accepts a `mode` only when it is
an object of one of the two shapes, defaulting the whole field
otherwise, and the clamp brings an extended count of working digits
between the display digits and the precision limit.

Version 4 (S2c, docs/ratio-width.md) nests the notation inside an exact
mode, the ratio carrying its width:

```json
{
  "version": 4,
  "savedBy": "…",
  "settings": {
    "digits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": { "kind": "ratio", "width": 20 } },
    "maxDigits": 1000,
    "maxBits": 65536
  }
}
```

`notation` is `{ "kind": "digits" }` or `{ "kind": "ratio", "width": 20 }`,
the width an integer in `[1, 1000]`. The migration from 3 to 4 turns the
string `"digits"` into the first and `"ratio"` into the second at the
default width, twenty, since no earlier build stored one; a decimal mode
passes through untouched, and a notation that is neither string passes
through for the validation to default. The validation of version 4
accepts a notation only when it is an object of one of the two shapes
with a width in its range, defaulting the whole mode otherwise; the
width depends on no other setting, so the clamp does not touch it.

Version 5 (S3, docs/settings-limits.md) names the three numbers with
their units and adds the probe's budget:

```json
{
  "version": 5,
  "savedBy": "…",
  "settings": {
    "displayDigits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": { "kind": "digits" } },
    "precisionLimitDigits": 1000,
    "significandLimitBits": 65536,
    "budgetMs": 50
  }
}
```

`digits` becomes `displayDigits`, `maxDigits` `precisionLimitDigits` and
`maxBits` `significandLimitBits`, each carried over by the migration
from 4 to 5 as it is, malformed or not, for the validation to default,
and a missing one staying missing; `budgetMs`, which no earlier build
stored, is left for the validation to default, 50, and is accepted as
an integer in `[10, 10000]`, defaulting otherwise, since it depends on
nothing and nothing clamps it. The old keys are not read at version 5:
a version 5 object carrying `digits` loads the default display digits.

The storage key stays `settings`.

The stress catalogue (bench/stress/catalogue.json) keeps each case's
settings in the same envelope, `savedBy` the commit the case was
measured at, and reads them through the same migrations
(`settingsFromStored`), so a change here carries the catalogue with it;
a test over the committed file checks that every case still reads as
one the suite can run and that the file stores each case's settings as
the current version does, so a change here rewrites the catalogue
(`pnpm stress:rewrite`) in the same change.

## One version for the whole record

The version is the record's, not each field's. The settings interact:
The display digits are clamped to the precision limit and that to what the significand limit
holds, and the steps ahead change the interactions themselves, S2
perhaps merging the mode and the fractions flag into one choice and S3
perhaps splitting the display digits or renaming the limits. A migration must be able
to read several fields to write one, or write several from one, and a
per-field version cannot express that. The record is six fields, so the
whole-record version costs nothing and buys the only thing that matters.

## Migrations

A migration is a function from the stored settings at version `n` to the
stored settings at version `n + 1`: the whole record to the whole record,
never one field to one field, so that a change in how the settings
interact is one function with one test. Each migration is total: it
never fails and never throws. Where it cannot carry a value over, it
writes that field's default at the new version, which is the fallback
policy of docs/settings-plan.md applied at the granularity of a field
rather than the whole record. Each is pure, takes the record as data (an
`unknown` it validates, not a typed object it trusts, since it is reading
what an older build wrote), and is tested against a fixture of a real
stored object of its source version.

The migrations are a list indexed by source version, so that adding a
version is appending one function and one fixture. Loading is a pipeline:

1. Read the text under the key and parse it as JSON. Text that is
   missing or does not parse gives the defaults, as today.
2. Read the version: a missing `version` is 1; an integer is itself;
   anything else is treated as a newer version (below).
3. Apply each migration from that version up to the current one, in
   order.
4. Validate each field on its own and clamp the dependent ones, exactly
   as `loadSettings` does today: a missing or malformed field falls back
   to its default, and the dependents are brought within range in the
   order of their dependence.

Step 4 stays the first line of defense, so that the version only has to
carry renames and changes of meaning, not corruption. As the settings
gain interactions, a field's default may no longer be the right fallback
on its own (a default mode with a non-default fractions flag, say); that
is handled case by case in the migration or the validation of the step
that adds the interaction, not by a general policy here.

Saving writes the envelope at the current version, with the build that
saved it, every time a setting changes, as today.

## A version from the future

A stored version above the one the build knows can occur after a deploy
is rolled back, or when a page served from an old cache runs after a
newer build has written storage. In principle it cannot happen, since
the stack is one party's and evolves forward only; in practice it is
rare and should be harmless. The policy is the simple and robust one: a
newer version is treated like text that failed to parse. The defaults
are used in memory, and the next save overwrites the stored object at
the current version. Reading fields out of a newer object is tempting
and is not done, since a renamed field can mean something else.

A later step could do better: keep the newer object as an opaque
snapshot beside the current one, and when the app is later upgraded to a
build that knows that version, offer to restore it. That is noted here
as possible and left undone, because it is messy in a way no general
policy or migration function resolves: by the time the matching build
arrives, the user may have changed the current settings in the interim,
and reconciling the snapshot with those changes has no coherent answer
in general. If it is ever wanted, it is its own design.

## Reset

Two operations, both pure functions over the record, with the buttons
that run them left to S5:

- **Reset all:** the defaults, written at the current version.
- **Reset one field:** the field at its default, and then the dependent
  fields clamped as after any change, since resetting the significand limit to its
  default can lower the precision limit and the display digits. Where a later step
  makes two fields one choice, resetting one may have to mean resetting
  both; that is decided when the interaction is added.

Beside them, a predicate for whether a field is at its default, which
the panel will use to show what has been changed.

## Where the build string comes from

settings.ts takes its storage as an argument and has no DOM dependency,
so that its parsing is tested under Node with a fake storage. The build
string is baked in by Vite (`__BUILD_ID__`), so settings.ts does not
import build-id.ts; `saveSettings` takes the build string as an
argument, and the shell passes `BUILD_ID`. The tests pass a string of
their own.

## Done when

- A stored version 1 object loads into the same settings as today, and
  is written back as version 2 on the next save.
- A version 2 object loads into the settings it holds, with the
  field-wise fallbacks and clamps of today.
- A missing version is 1; a newer version, or a version that is not an
  integer, gives the defaults in memory and is overwritten on the next
  save.
- Each migration has a fixture of its source version and a test that it
  is total: every field of every fixture, and a fixture with each field
  missing or malformed, migrates without throwing.
- `resetSettings` and `resetSetting(key)` exist and are tested, with the
  clamp after a single reset; `isDefault(settings, key)` exists.
- `savedBy` holds the whole build string.
- README's "Settings" says that the settings carry a version and are
  migrated, in one sentence; ARCHITECTURE.md's file table says the same
  of settings.ts.
- No field is renamed, and the panel is unchanged.
