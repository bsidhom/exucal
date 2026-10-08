# Benchmarks and the stress tools

The core has costs that a later change could quietly undo: the
ambiguity check is indexed so that it does not grow with the number of
prefixes, the walker memoizes so that a definition is evaluated once
however many others refer to it, and the kernel's series are summed by
binary or rectangular splitting. The benchmarks in `bench/` exist to
catch such regressions. The stress tools under `bench/stress/` measure
what an input costs the converter as a whole, search for the costliest
inputs and keep them in a catalogue ([cost.md](cost.md)).

## Running the benchmarks

`pnpm bench` runs the performance benchmarks in `bench/`. They take a
few seconds and need nothing beyond Node.js. Each prints the timings it
measured as diagnostics, for comparison with an earlier run on the same
machine:

```
ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)
```

A benchmark fails when a cost no longer scales with the size of its
input as it should, not when a timing is slow, so a failure is a
regression whatever the machine. `pnpm test:all` runs them, so every
commit leaves them green; run them on their own after any change to the
core's data structures or algorithms, and add one when a change
introduces a cost that a later change could quietly undo. A benchmark
that fails before its assertion (its input no longer builds, its
expression is now refused) is a failure like any other, to be fixed in
the commit that causes it, not noise: such a benchmark guards nothing
until it is fixed.

## What each benchmark asserts

A timing in milliseconds depends on the machine, so a benchmark reports
its timings as diagnostics, for a person to compare between runs, and
asserts only how a cost scales between two sizes measured in the same
run, which holds anywhere. The thresholds are twice the expected
ratios, so that noise never fails a benchmark that a regression would
not fail by a wide margin.

- `names.bench.ts` asserts that the ambiguity check with 1076 prefixes
  costs at most five times the check with 76 (it costs about the same;
  before the index it cost fifty times as much), and with 12000 units
  at most eight times that with 3000 (the sort makes it a little more
  than linear).
- `build.bench.ts` asserts that parsing and building 6000 units each
  cost at most eight times parsing and building 1500, since each
  definition is parsed once and evaluated once; a walk that
  re-evaluated its dependencies would cost more. It asserts the same
  bound for 2000 functions with their inverses against 500, and
  reports, without asserting, the cost of a file the size of the GNU
  units database, as a reference for the startup cost.
- `kernel.bench.ts` times `pi` by Chudnovsky's series at 1,000, 10,000
  and 100,000 digits and asserts that the last costs at most fifty
  times the middle: binary splitting grows as V8's bigint
  multiplication does, Karatsuba at these sizes, about 38 times per
  decade of digits at most, where a series summed term by term would be
  quadratic and show a hundred; the upper decade is asserted because
  its timings are well above the timer's noise. It also times every
  routine of the kernel (the roots, `exp`, the series of `e`, and each
  elementary function) at the default ceiling of the retry schedule,
  the costliest pass an expression that never certifies runs, and at a
  quarter of it, asserting that the ceiling costs at most 64 times the
  quarter, twice what a series of linear length over Karatsuba
  multiplication gives. Its report is what the probe of `limits.ts`
  chose its composite from, and it notes that the series of `exp`,
  summed term by term, is the remaining candidate for the rectangular
  splitting the logarithm, the sine and the arctangent use.
- `rational.bench.ts` times the probe's range operation, a product of
  two fractions and its reduction, at 8,192 to 65,536 bits, one gcd on
  its own at 16,384 to 65,536 bits, and two long quotients, at twice
  the default significand limit since the second is refused at the
  default, and asserts that doubling the size costs at most eight
  times, twice what the quadratic gcd gives. Lehmer's gcd is about
  forty times cheaper than Euclid's at the default significand limit
  and still quadratic, and the benchmark is what would show a
  half-gcd's gain should the limit grow.

## How the benchmarks are built

They are `*.bench.ts` files, run by `pnpm bench` through Node's test
runner and nothing else: no benchmark library, in keeping with the rule
against third-party dependencies. The suffix keeps them out of
`pnpm test`, whose default discovery never matches it, so the two are
separate without a second runner. `tsconfig.node.json` includes
`bench/`, so they type-check with the tests. The rest of the directory
is what they share:

- `src/testing/random.ts` is the seeded random source the tests and the
  benchmarks share ([testing.md](testing.md), "The random source"), so
  every run measures the same data. `bench/harness.ts` holds what only
  the benchmarks need: `word`, which draws a name from it, and
  `bestOf`, which times a function several times after one untimed run
  and takes the shortest, the estimate least disturbed by whatever else
  the machine is doing.
- `bench/synthetic.ts` builds tables of a chosen size. Prefix names are
  drawn from the letters `n` to `z` and unit names from `a` to `m`, so
  that no name is ambiguous and the ambiguity check scans everything:
  its cost when it finds nothing is its cost on a table that builds.
  The names are short, like real ones, so prefixes extend one another
  more often than real prefixes do, which makes the tables the hard
  case for the check. A drawn unit named like a built-in (`lcm`), or
  that would make one read as a prefix followed by it, is renamed,
  since the build would reject it. A synthetic definitions file has
  two primitives, the prefixes, and units that are each a small
  expression over one earlier unit, so that building it walks
  reference chains of the depth random references make and every body
  goes through the evaluator. A synthetic file of functions has
  functions of a length, each calling one earlier function, each with
  an inverse line and every other one with a result annotation, so
  that parsing goes through function heads and building walks the
  calls and checks every inverse.

## The stress tools

The stress tools run for minutes and are run by hand; `pnpm test:all`
runs none of them. Their tests (`cases.test.ts`, `catalogue.test.ts`,
`harness.test.ts`, `pool.test.ts`) are ordinary ones, run by
`pnpm test`, since they evaluate nothing costly. Either command prints
its options with `--help`.

### The harness

`bench/stress/harness.ts` measures one case, the two texts and the
panel's settings, as the converter runs it: `outcomeOf` in wall time.
Each case runs in a worker of its own, so that it starts with empty
memos; the worker builds the system table at the case's ceiling,
untimed, then evaluates the case cold and again warm, timing each pass
through the pipeline's optional `PassObserver`, which changes nothing it
observes. A deadline that starts once the table is built ends a case
that runs too long, recorded with the pass that was running, how long
it had run, the passes of that evaluation that finished and the
schedule, since no timer can interrupt a synchronous evaluation;
`estimateMs` extends the passes a hang finished along their growth in
precision to the end of its schedule, the estimate the catalogue ranks
hangs by. `typeOut` runs `outcomeOf` on every prefix of a case's text
in order, in one worker so that the memos carry over as in a session.
[cost.md](cost.md) ("How a case is measured") says what cold, warm, the
passes and the typing mean.

### The search

`pnpm stress:search` samples for the costliest inputs. Its cases come
from `cases.ts`, a pure function of a seed: the `i`-th is drawn from
`foldIn(seed, i)` alone, with fixed weights over the patterns that
never certify (a call less itself, an identity between different
functions from a table, a zero at a built-in's edge, a zero below a
condition's bound), the functions and their argument classes, a costly
call composed into an argument, the settings profile and the want. A
run without `--seed` draws a fresh seed from the cryptographic source
and prints it, and the catalogue logs it with the run; `--list <n>`
prints the first cases a seed draws without evaluating them. No timing
decides what is drawn.

A run samples the stream for `--minutes` (ten by default), or until
Ctrl-C with `--forever`: lanes, one per core, take the next case as
they come free (`pool.ts`), so a long case holds one lane and the rest
carry on, and timings under that load stay within a few percent of
timings alone. A hit, a case whose warm cost reaches the floor (a
second) or a hang (past its deadline of two minutes, or its worker
failed), is written at once: `withHit` of `catalogue.ts` puts it in its
family's slot if the slot is empty or holds a case it costs `MARGIN`
(1.1) times, entries compared by their warm cost per costly call and
hangs by `estimateMs`. A hit that joins is then typed out, and that is
written too. The floor and the deadline are constants (`FLOOR_MS`,
`DEADLINE_MS` in `catalogue.ts`), not options, so that every run
records hits by the same measure and any run, however short or for
whatever purpose, can be committed.

Every change goes through `update` of `tooling.ts`, under a lock file
(`bench/stress/catalogue.lock`, ignored by git, taken over from a
process that is gone): the catalogue is read as it is, changed,
formatted with the tables of `devdocs/cost.md` by Prettier on its
stdin, and each file written whole through a file renamed over it. So
runs can share a working tree, and a copy of the files, or a commit,
taken at any moment holds them formatted and complete. When the time is
up, or on Ctrl-C, no case starts, the writes under way finish, the
run's record (seed, cases measured, hits) is written, and the process
ends, abandoning the cases it was measuring. Runs are safe to repeat
and to accumulate: a hit can only fill an empty slot or replace a
cheaper case of its family, so a repeated case at most refreshes its
own timing (kept only when it came out at least 10% higher), and the
catalogue grows run by run. The command never touches git.

A case's settings are stored in the catalogue as the app stores its
own, in the storage envelope with its format version
([settings.md](settings.md), "Storage"), and read back through the
settings migrations (`settingsFromStored`), so that a change that
reshapes the settings leaves every catalogued case readable. One test
of `catalogue.ts` reads the committed catalogue and checks that every
case is one the suite can run (its settings ones the panel could hold,
its profile one that exists, its texts parsing) and that its settings
are stored in the file as the current version stores them, the smoke
test for data no type checks: a change to the settings' stored shape
fails it until `pnpm stress:rewrite` (`rewrite.ts`, `update` with no
change) has rewritten the file.

### The stress suite

`pnpm stress <function> ...` measures again the catalogued cases that
call the functions named (`pnpm stress incbeta erf`), cold and warm, in
the search's lanes, cheapest first by catalogued time, then the hangs,
printing each result as it comes; with no names it measures them all.
`--profile <name>` keeps one settings profile, `--skip-hangs` leaves out
the hangs, and `--sample <n>` keeps `n` cases chosen by a fixed hash of
the case, the same on every machine, and no hang: a spot check in
minutes (`pnpm stress --sample 24`) between the full runs. One
function's cases take one to four minutes on four cores; a full run,
every case and every hang, takes the better part of an hour, since the
catalogue is the costliest inputs known. Run one function's cases
before and after a change aimed at that function, the full suite after
a change to a kernel or to the pipeline and before a release, and a
sample between.

An entry's deadline is four times its catalogued time and two minutes
at least. The suite fails only on what holds on any machine and on
what it is for, the cost of long-running inputs and whether they hang
or crash: an entry whose outcome is of another kind than catalogued (a
refusal where it computed, a value where it was refused), a worker
that fails, and an entry past its deadline. How an outcome is written,
the value's digits, its note, the message, is never compared: the
display, the printer and the messages have their own tests. The line
is recorded in the catalogue as what was computed and reported when it
reads otherwise, as information. The suite reports the timings beside
the catalogue's, each entry's cost as a multiple of a reference case
(`exp(1) - exp(1)`), entries much cheaper than catalogued, and for each
hang how far it got and its estimate, or that it now finishes.

With `--record` it writes back, through `update`, what it measured of
the cases that passed: an entry's new timings and typing
(`withEntryAgain`, no margin, the case's own cost), a hang's new
progress and estimate (`withHangAgain`), and a hang that now finishes
as its family's entry. Entries that become cheap are kept: they guard
the cost, their value is still checked, and a costlier case of their
family replaces them; the line recorded is the run's.
