# Benchmarks

_This page gathers what README.md ("Benchmarks", "Stress tests") and
ARCHITECTURE.md ("Benchmarks") used to say, as they were; the two accounts
overlap and are to be merged._

## Running the benchmarks

`pnpm bench` runs the performance benchmarks in `bench/`. They take a few
seconds and need nothing beyond Node.js. Each prints the timings it measured
as diagnostics, for comparison with an earlier run on the same machine:

```
ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)
```

A benchmark fails when a cost no longer scales with the size of its input
as it should, not when a timing is slow, so a failure is a regression
whatever the machine. `pnpm test:all` runs them, so every commit leaves
them green; run them on their own after any change to the core's data
structures or algorithms, and add one when a change introduces a cost
that a later change could quietly undo. A benchmark that fails before its
assertion (its input no longer builds, its expression is now refused) is
a failure like any other, to be fixed in the commit that causes it, not
noise: such a benchmark guards nothing until it is fixed. "How the benchmarks are built" below
describes how they are built and what each one asserts.

## Stress tests

`pnpm stress:search` samples for the costliest inputs. It draws a stream
of random inputs from a seed (a fresh one unless `--seed`, printed and
logged with the run), measures them one per core, and writes each hit
into `bench/stress/catalogue.json` and the tables of `devdocs/cost.md` as
soon as it is found: an input whose warm cost reaches a second, or that
runs past the two-minute deadline. A hit takes its family's place when
the place is empty or holds an input it costs at least 10% more than. A
run lasts ten minutes (`--minutes <n>` to choose), or until Ctrl-C with
`--forever`; either way the files are formatted and whole at every
moment, so whenever it ends, or is stopped, what it found is ready to
review and commit. It is safe to run repeatedly and incrementally:
each run only adds to the catalogue or replaces an entry by a costlier
case of its family, so a short run now and then builds the list up over
time, and running the same seed again only logs the run and keeps any
timing that came out at least 10% higher. Several runs can share one
working tree at once: each change to the files is made under a lock.
The second and the deadline are fixed, not options, so every run, a
long one or a minute's to try the tool, records hits by the same
measure, and any run is one to commit.
`--list <n>` prints the first inputs a seed draws without evaluating
them. The command never touches git.

`pnpm stress <function> ...` measures again the catalogued inputs that
call the functions named (`pnpm stress incbeta erf`), cold and warm, one
per core, cheapest first, printing each result as it comes; with no
names it measures them all. Run it before and after a change aimed at
those functions: one function's inputs take one to four minutes on four
cores; a full run, every input and every hang, takes the better part
of an hour, since the catalogue is the costliest inputs known, so run it
in full after a change to a kernel or to the pipeline, and before a
release. `--profile <name>` keeps one settings
profile, `--skip-hangs` leaves out the inputs that hang, and `--sample
<n>` keeps `n` inputs chosen the same way on every machine and no hang:
a spot check of the values in minutes (`pnpm stress --sample 24`),
between the full runs. It fails only on what it is for, the cost of
long-running inputs and whether they hang or crash: an input that
passes its deadline, a worker that crashes, or an input that gives
another kind of outcome than catalogued (a refusal where it computed,
a value where it was refused). How an outcome is written, the value's
digits, its note, the message, is never compared: the display, the
printer and the messages have their own tests. The line is kept in the
catalogue as a record of what was computed and reported when it reads
otherwise, as information; the timings, each input's cost as a
multiple of a reference, inputs that have become much cheaper and how
far each hang gets are reported too. After a change that makes them
cheaper, `--record` writes the new timings and lines into the
catalogue (a hang that now finishes becomes an entry); inputs that
have become cheap stay, as guards against the cost coming back, and a
costlier input of their family found later replaces them. `pnpm
test:all` runs neither.

## How the benchmarks are built

The core has costs that a later change could quietly undo: the ambiguity
check is indexed so that it does not grow with the number of prefixes, and
the walker memoizes so that a definition is evaluated once however many
others refer to it. The benchmarks in `bench/` exist to catch such
regressions; "Running the benchmarks" above says how and when to run them:
`pnpm test:all` runs them before every commit, and a benchmark that
fails before reaching its assertion counts as failing.

They are `*.bench.ts` files, run by `pnpm bench` through Node's test runner
and nothing else: no benchmark library, in keeping with the rule against
third-party dependencies. The suffix keeps them out of `pnpm test`, whose
default discovery never matches it, so the two are separate without a second
runner. `tsconfig.node.json` includes `bench/`, so they type-check with the
tests. The rest of the directory is what they share:

- `src/testing/random.ts` is the one seeded random source that the tests
  and the benchmarks share, purely applicative in the manner of JAX: a
  key is two 32-bit words, `split` and `foldIn` derive keys from a key,
  and every draw (`uniform`, `between`, `randomBigInt`, `randomRational`,
  `randomBall`) is a function of its key alone, the bits behind them
  threefry2x32 blocks under the key. So every run measures the same data,
  every property test draws its inputs the same way, the `i`-th input of a
  loop is the same whether drawn alone or in order, and no test carries a
  generator of its own. `bench/harness.ts` holds what only
  the benchmarks need: `word`, which draws a name from it, and `bestOf`,
  which times a function several times after one untimed run and takes
  the shortest, the estimate least disturbed by whatever else the machine
  is doing.
- `bench/stress/harness.ts` is stage 8's cost harness
  (devdocs/history/calculator-plan.md, 8.1): it measures one case, the two texts and
  the panel's settings, as the converter runs it, `outcomeOf` in wall
  time. Each case runs in a worker of its own, so that it starts with
  empty memos; the worker builds the system table at the case's ceiling,
  untimed, then evaluates the case cold and again warm, timing each pass
  through the pipeline's optional `PassObserver`, which changes nothing
  it observes. A deadline that starts once the table is built ends a
  case that runs too long, recorded with the pass that was running, how
  long it had run, the passes of that evaluation that finished and the
  schedule, since no timer can interrupt a synchronous evaluation. Its
  tests are
  ordinary ones, run by `pnpm test`.
- `bench/stress/search.ts` is the cost search (8.2), run by hand with
  `pnpm stress:search`. Its cases come from `cases.ts`, a pure function
  of a seed: the `i`-th is drawn from `foldIn(seed, i)` alone, with fixed
  weights over the patterns that never certify (a call less itself, an
  identity between different functions from a table, a zero at a
  built-in's edge, a zero below a condition's bound), the functions and
  their argument classes, a costly call composed into an argument, the
  settings profile and the want. A run without `--seed` draws a fresh
  seed from the cryptographic source and prints it, and the catalogue
  logs it with the run; `--list` prints the cases without evaluating
  them. No timing decides what is drawn. A run samples the stream for
  `--minutes` (ten by default), or until stopped with `--forever`: lanes,
  one per core, take the next case as they come free (`pool.ts`), so a
  long case holds one lane and the rest carry on, and timings under that
  load stay within a few percent of timings alone. A hit, a case whose
  warm cost reaches the floor (a second) or a hang (past its deadline,
  or its worker failed), is written at once: `withHit` of `catalogue.ts`
  puts it in its family's slot if the slot is empty or holds a case it
  costs `MARGIN` (1.1) times, entries compared by their warm cost per
  costly call and hangs by `estimateMs` of the harness, which extends
  the passes a hang finished along their growth in precision to the end
  of its schedule. A hit that joins is then typed out (`typeOut` of the
  harness: `outcomeOf` on every prefix of its text in order, in one
  worker so that the memos carry over as in a session), and that is
  written too. Every change goes through `update` of `tooling.ts`, under
  a lock file (`bench/stress/catalogue.lock`, ignored by git, taken over
  from a process that is gone): the catalogue is read as it is, changed,
  formatted with the tables of `devdocs/cost.md` by Prettier on its stdin,
  and each file written whole through a file renamed over it. So runs
  can share a working tree, and a copy of the files, or a commit, taken
  at any moment holds them formatted and complete. When the time is up,
  or on Ctrl-C, no case starts, the writes under way finish, the run's
  record (seed, cases measured, hits) is written, and the process ends,
  abandoning the cases it was measuring. Runs are safe to repeat and to
  accumulate: a hit can only fill an empty slot or replace a cheaper
  case of its family, so a repeated case at most refreshes its own
  timing, and the catalogue grows run by run. The floor and the deadline
  are constants (`FLOOR_MS`, `DEADLINE_MS` in `catalogue.ts`), not
  options, so that every run records hits by the same measure and any
  run, however short or for whatever purpose, can be committed. A
  case's settings are stored in the catalogue as the app stores its own,
  in the envelope of devdocs/design/settings-storage.md with its format version,
  and read back through the settings migrations
  (`settingsFromStored`), so that a step that reshapes the settings
  leaves every catalogued case readable. The tests of `cases.ts`,
  `catalogue.ts` and `pool.ts` are ordinary ones, since they evaluate
  nothing; one of `catalogue.ts` reads the committed catalogue and checks
  that every case is one the suite can run (its settings ones the panel
  could hold, its profile one that exists, its texts parsing) and that
  its settings are stored in the file as the current version stores
  them, the smoke test for data no type checks: a change to the
  settings' stored shape fails it until `pnpm stress:rewrite`
  (`rewrite.ts`, `update` with no change) has rewritten the file.
- `bench/stress/verify.ts` is the stress suite (8.3), run by
  `pnpm stress` and discovered by neither `pnpm test` nor `pnpm bench`.
  It measures again the catalogued cases that call the functions named
  on its command line (all of them when none is named, those of one
  profile with `--profile`, `n` of them chosen by a fixed hash of the
  case with `--sample <n>`, `sample`, the spot check), each in a worker
  of its own, cold and warm, in the search's lanes, cheapest first by
  its catalogued time, then the hangs (`--skip-hangs` leaves them out,
  as a sample does), printing each result as it comes. An entry's
  deadline is four times its catalogued time and two minutes at least.
  It fails on what holds on any machine and on what it is for, the cost
  of long-running expressions and whether they hang or crash: an
  entry's outcome's kind as catalogued (a value, a refusal, nothing), a
  worker that fails, and no entry past its deadline. The line, the
  value as the display writes it or the message, is recorded as what
  was computed and reported when it differs, as information, never
  compared: the display, the printer and the messages have their own
  tests. It reports the timings beside
  the catalogue's, each entry's cost as a multiple of a reference case
  (`exp(1) - exp(1)`), entries much cheaper than catalogued, and for
  each hang how far it got and its estimate, or that it now finishes.
  With `--record` it writes back, through `update`, what it measured of
  the cases that passed: an entry's new timings and typing
  (`withEntryAgain`, no margin, the case's own cost), a hang's new
  progress and estimate (`withHangAgain`), and a hang that now finishes
  as its family's entry. Entries that become cheap are kept: they guard
  the cost, their value is still checked, and a costlier case of their
  family replaces them; the line recorded is the run's. The suite is
  run in full after a change to a kernel or the pipeline and before a
  release; a sample between.
- `bench/synthetic.ts` builds tables of a chosen size. Prefix names are
  drawn from the letters `n` to `z` and unit names from `a` to `m`, so
  that no name is ambiguous and the ambiguity check scans everything: its
  cost when it finds nothing is its cost on a table that builds. The names
  are short, like real ones, so prefixes extend one another more often than
  real prefixes do, which makes the tables the hard case for the check. A
  drawn unit named like a built-in (`lcm`), or that would make one read as
  a prefix followed by it, is renamed, since the build would reject it. A
  synthetic definitions file has two primitives, the prefixes, and units
  that are each a small expression over one earlier unit, so that building
  it walks reference chains of the depth random references make and every
  body goes through the evaluator. A synthetic file of functions has
  functions of a length, each calling one earlier function, each with an
  inverse line and every other one with a result annotation, so that
  parsing goes through function heads and building walks the calls and
  checks every inverse.

A timing in milliseconds depends on the machine, so a benchmark reports its
timings as diagnostics, for a person to compare between runs, and asserts
only how a cost scales between two sizes measured in the same run, which
holds anywhere. `names.bench.ts` asserts that the ambiguity check with 1076
prefixes costs at most five times the check with 76 (it costs about the
same; before the index it cost fifty times as much and failed), and with
12000 units at most eight times that with 3000 (the sort makes it a little
more than linear). `build.bench.ts` asserts that parsing and building 6000
units each cost at most eight times parsing and building 1500, since each
definition is parsed once and evaluated once; a walk that re-evaluated its
dependencies would cost more. The thresholds are twice the expected ratios,
so that noise never fails a benchmark that a regression would not fail by a
wide margin. It also reports, without asserting, the cost of a file the size
of the GNU units database, as a reference for the startup cost, and asserts
the same bound for 2000 functions with their inverses against 500.
`kernel.bench.ts` times `pi` by Chudnovsky's series at 1,000, 10,000 and
100,000 digits and asserts that the last costs at most fifty times the
middle: binary splitting grows as V8's bigint multiplication does,
Karatsuba at these sizes, about 38 times per decade of digits at most,
where a series summed term by term would be quadratic and show a hundred;
the upper decade is asserted because its timings are well above the
timer's noise. It also times every routine of the kernel (the roots, `exp`,
the series of `e`, and each elementary function as it lands) at the
default ceiling of the retry schedule, the costliest pass an expression
that never certifies runs, and at a quarter of it, asserting that the
ceiling costs at most 64 times the quarter, twice what a series of linear
length over Karatsuba multiplication gives; the report is what the probe
of `limits.ts` chose its composite from, and it notes that the series of
`exp`, summed term by term, is the remaining candidate for the
rectangular splitting the logarithm, the sine and the arctangent use.
`rational.bench.ts` times the probe's range operation, a product of two
fractions and its reduction, at 8,192 to 65,536 bits, one gcd on its own
at 16,384 to 65,536 bits, and the quotients of issue #52, at twice the
default significand limit since the second passes the default and H.14 refuses
it there (issue #135), and asserts
that doubling the size costs at most eight times, twice what the
quadratic gcd gives; Lehmer's gcd is about forty times cheaper than
Euclid's at the default significand limit and still quadratic, and the
benchmark is what would show a half-gcd's gain should the limit grow.
