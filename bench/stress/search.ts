// The cost search (devdocs/benchmarks.md, "The search"), run by
// hand:
//
//   pnpm stress:search [--seed <hex>] [--minutes <n> | --forever]
//                      [--list <n>] [--jobs <n>]
//
// It draws a stream of cases from a seed (cases.ts), measures them with
// the harness, and adds each hit to bench/stress/catalogue.json
// (catalogue.ts) and its tables in devdocs/cost.md as soon as it is found. A
// hit is a case whose warm cost reaches a second (`FLOOR_MS`), or a hang:
// a case past its two-minute deadline (`DEADLINE_MS`), or whose worker
// failed. The floor and the deadline are fixed, so that every run records
// hits by the same measure, and any run, however short, is one to commit. Each run is a sample: it runs for
// `--minutes` (ten by default), or until stopped with `--forever`, and
// adds what it finds; runs build the catalogue up over time. Running it
// again, with the same seed or a fresh one, is always safe: a hit only
// fills an empty slot or replaces a cheaper case of its family, so a
// repeated case at most refreshes its own timing.
//
// What is drawn depends on the seed alone. A run given `--seed` uses it;
// one without draws a fresh seed from the cryptographic source first and
// prints it, and the catalogue logs it with the run. `--list n` prints the
// first `n` cases a seed draws without evaluating any. Wall-clock time
// decides only what is kept and when a run ends, never what is drawn.
//
// Lanes, one per core (`--jobs`), each take the next case of the stream as
// they come free (pool.ts). A hit is written at once (`update` of
// tooling.ts): it takes its family's slot if the slot is empty or holds a
// case it costs `MARGIN` times; then the lane types it out, a keystroke at
// a time, and records that too. Timings under that load stay within a few
// percent of timings taken alone. When the time is up, or on Ctrl-C, no
// case starts, the writes under way finish, the run's record is written,
// and the process ends, abandoning the cases it was measuring: whatever it
// had found is in the files, formatted and whole, ready to commit. Several
// runs may share one working tree at once: each change to the files is
// made under a lock, from the files as they are.
//
// Commands run as tooling.ts runs them, as security rules require
// (devdocs/security.md).

import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import { chooseSeed, describeCase, drawCase, type Drawn } from "./cases.ts";
import {
  DEADLINE_MS,
  FLOOR_MS,
  summarizeTyping,
  withHit,
  withRun,
  withTyping,
  type Change,
  type Entry,
  type Hang,
  type RunRecord,
} from "./catalogue.ts";
import { estimateMs, machine, typeOut, type Measurement } from "./harness.ts";
import { runPool } from "./pool.ts";
import { currentCommit, measureCase, update, type Outcome } from "./tooling.ts";

/** How often the run's record is brought up to date between hits. */
const RECORD_EVERY_MS = 60_000;

/** Prints the usage, and exits with `code`. */
function usage(code = 2): never {
  console.log(
    "usage: pnpm stress:search [--seed <hex>] [--minutes <n> | --forever]\n" +
      "                          [--list <n>] [--jobs <n>]",
  );
  process.exit(code);
}

/** Prints `message` and exits as a usage error does. */
function refuse(message: string): never {
  console.error(message);
  process.exit(2);
}

/** A positive number from the command line, or `fallback` when absent. */
function positive(
  text: string | undefined,
  fallback: number,
  what: string,
): number {
  if (text === undefined) return fallback;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    refuse(`${what} must be a positive number: ${text}`);
  }
  return value;
}

/** The hit a measured case makes, if it makes one. */
function hitOf(
  drawn: Drawn,
  outcome: Outcome,
  base: Pick<Entry, "source" | "commit" | "date">,
): { readonly entry: Entry } | { readonly hang: Hang } | undefined {
  const c = drawn.case;
  const common = {
    family: drawn.family,
    have: c.have,
    want: c.want,
    settings: c.settings,
    ...base,
  };
  if ("failed" in outcome) {
    return {
      hang: {
        ...common,
        machine: machine(),
        reason: { kind: "failed", message: outcome.failed },
      },
    };
  }
  const m: Measurement = outcome.measured;
  if (m.status === "deadline") {
    return {
      hang: {
        ...common,
        machine: m.machine,
        reason: {
          kind: "deadline",
          deadlineMs: m.deadlineMs,
          running: m.running ?? null,
          progress: m.progress,
          estimateMs: Math.round(estimateMs(m)),
        },
      },
    };
  }
  if (m.warm.ms < FLOOR_MS) return undefined;
  return {
    entry: {
      ...common,
      calls: drawn.calls,
      machine: m.machine,
      cold: m.cold,
      warm: m.warm,
    },
  };
}

/** A measured case as one line of progress. */
function progressLine(index: number, drawn: Drawn, outcome: Outcome): string {
  const what = `${drawn.family.profile}  ${drawn.case.have}`;
  if ("failed" in outcome) {
    return `[${index}] FAILED: ${outcome.failed}  ${what}`;
  }
  const m = outcome.measured;
  if (m.status === "deadline") {
    const at =
      m.running === undefined
        ? "before its first pass"
        : `in the ${m.running.run} run's pass ${m.running.pass + 1} of ${m.progress.schedule.length}`;
    return `[${index}] past the deadline ${at}, ≈ ${Math.round(estimateMs(m) / 1000)} s warm  ${what}`;
  }
  const per = m.warm.ms / drawn.calls;
  return `[${index}] warm ${Math.round(m.warm.ms)} ms (${Math.round(per)} ms a call, ${m.warm.passes.length} passes), cold ${Math.round(m.cold.ms)} ms  ${what}`;
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        seed: { type: "string" },
        minutes: { type: "string" },
        forever: { type: "boolean", default: false },
        list: { type: "string" },
        jobs: { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    usage();
  }
  const options = parsed.values;
  if (options.help) usage(0);
  if (options.forever && options.minutes !== undefined) {
    refuse("--forever runs until stopped: it takes no --minutes");
  }
  const seed = chooseSeed(options.seed);
  console.log(`seed ${seed.text}${seed.fresh ? " (fresh)" : ""}`);
  if (options.list !== undefined) {
    const count = Math.floor(positive(options.list, 20, "--list"));
    for (let index = 0; index < count; index++) {
      console.log(describeCase(index, drawCase(seed.key, index)));
    }
    return;
  }
  const minutes = options.forever
    ? undefined
    : positive(options.minutes, 10, "--minutes");
  const jobs = Math.floor(
    positive(options.jobs, availableParallelism(), "--jobs"),
  );

  const commit = currentCommit();
  const started = new Date().toISOString();
  let measured = 0;
  let hits = 0;
  const record = (): RunRecord => ({
    source: { seed: seed.text },
    cases: measured,
    hits,
    commit,
    date: started,
    machine: machine(),
  });
  // Every change to the files is made through one queue, so that the
  // process ends only once the writes under way are done.
  let writes: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(write: () => Promise<T>): Promise<T> => {
    const done = writes.then(write);
    writes = done.catch((e: unknown) => {
      console.error(`a write failed: ${e instanceof Error ? e.message : e}`);
    });
    return done;
  };
  await enqueue(() => update((catalogue) => withRun(catalogue, record())));
  console.log(
    `${jobs} lanes, each case under ${DEADLINE_MS / 1000} s, ${minutes === undefined ? "until stopped" : `for ${minutes} minutes`}; hits are written to the catalogue as they are found`,
  );

  let stopping = false;
  const finish = async (why: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`\n${why}: no case starts; writing what was found`);
    await writes;
    await update((catalogue) => withRun(catalogue, record()));
    console.log(
      `${measured} cases measured, ${hits} hits; seed ${seed.text}. The catalogue and devdocs/cost.md are ready to commit.`,
    );
    process.exit(0);
  };
  let interrupts = 0;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      // A second interrupt ends the process at once: the files are whole
      // at every moment, so nothing is lost but the writes under way.
      if (++interrupts > 1) process.exit(130);
      void finish("stopped");
    });
  }
  if (minutes !== undefined) {
    setTimeout(() => void finish("time is up"), minutes * 60_000).unref();
  }
  const recorder = setInterval(() => {
    void enqueue(() => update((catalogue) => withRun(catalogue, record())));
  }, RECORD_EVERY_MS);
  recorder.unref();

  let next = 0;
  await runPool<number>({
    jobs,
    next: () => (stopping ? undefined : next++),
    run: async (index) => {
      const drawn = drawCase(seed.key, index);
      const outcome = await measureCase(drawn.case, DEADLINE_MS);
      if (stopping) return;
      measured++;
      const date = new Date().toISOString();
      const hit = hitOf(drawn, outcome, {
        source: { seed: seed.text, index },
        commit,
        date,
      });
      let change: Change | undefined;
      if (hit !== undefined) {
        hits++;
        await enqueue(() =>
          update((catalogue) => {
            const result = withHit(catalogue, hit);
            change = result.change;
            return withRun(result.catalogue, record());
          }),
        );
      }
      console.log(
        `${progressLine(index, drawn, outcome)}${change === undefined ? "" : `  -> ${change}`}`,
      );
      if (hit === undefined || !("entry" in hit) || change === "kept") return;
      // A hit that joined is typed out, as the interface meets it.
      try {
        const typing = await typeOut(drawn.case, 2 * DEADLINE_MS);
        if (stopping) return;
        await enqueue(() =>
          update((catalogue) =>
            withTyping(catalogue, drawn.case, summarizeTyping(typing)),
          ),
        );
        const slowest = Math.max(0, ...typing.keystrokes.map((k) => k.ms));
        console.log(
          `  typed: slowest keystroke ${Math.round(slowest)} ms of ${typing.keystrokes.length}  ${drawn.case.have}`,
        );
      } catch (e) {
        console.log(
          `  typing FAILED: ${e instanceof Error ? e.message : String(e)}  ${drawn.case.have}`,
        );
      }
    },
  });
}

await main();
