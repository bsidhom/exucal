// The cost harness of stage 8 (docs/calculator-plan.md, task 8.1): what one
// case costs the interface. A case is the two texts and the settings, the
// panel's own (`Settings` of settings.ts), and what is measured is what
// the converter runs on every keystroke, `outcomeOf` (outcome.ts), in wall
// time. The search (8.2) and the stress suite (8.3) are built on it.
//
// Each case runs in a `Worker` of its own, so that it starts cold: the
// constants' memos, the Bernoulli run and the table are module state, and a
// fresh worker has none of them. The worker builds the system table at the
// ceiling of the case's settings, as the app does at startup, untimed, and
// then evaluates the case twice: cold, the first evaluation, which pays for
// whatever is computed once (a memo filled at a new ceiling, the Bernoulli
// run), and warm, the same case again, which pays for every pass alone.
// Each evaluation reports the passes of the retry loop through the
// pipeline's `PassObserver`, which changes nothing it observes, so the
// passes timed are the passes the interface runs.
//
// A case runs under a deadline, which starts once the table is built, since
// node:test's `timeout`, like any timer, cannot interrupt the synchronous
// evaluation running in a worker (the sweeps' runner, src/testing/edges.ts,
// does the same for the same reason). The worker posts each pass as it
// starts, so when the deadline passes the main thread knows which pass was
// running, terminates the worker, and records the case as past its
// deadline with that pass.
//
// Time depends on the machine, so every measurement names the machine it
// was taken on, and only measurements taken in one run compare.

import { readFileSync } from "node:fs";
import { availableParallelism, cpus, platform } from "node:os";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import { buildTable } from "../../src/core/build.ts";
import { ceilingContext } from "../../src/core/context.ts";
import { parseDefinitions } from "../../src/core/definitions.ts";
import type { PassEvent } from "../../src/core/pipeline.ts";
import { outcomeOf, type Line, type Outcome } from "../../src/outcome.ts";
import {
  DEFAULT_SETTINGS,
  contextOf,
  isDigits,
  isMaxBits,
  isMaxDigits,
  isMode,
  type Settings,
} from "../../src/settings.ts";

// ---------------------------------------------------------------------------
// Types

/** A case: the two texts the user typed and the settings in force. */
export type Case = {
  readonly have: string;
  readonly want: string;
  readonly settings: Settings;
};

/** One pass of the retry loop: the precision it ran at, and its time. */
export type Pass = { readonly precision: number; readonly ms: number };

/**
 * What an outcome was, enough to tell whether a later evaluation gives the
 * same: its kind, its first line as the converter writes it (or the
 * error's message), and how many warnings it carried.
 */
export type OutcomeSummary = {
  readonly kind: Outcome["kind"];
  readonly line: string;
  readonly warnings: number;
};

/** One evaluation of a case: its total time, its passes, and its outcome. */
export type Run = {
  readonly ms: number;
  readonly passes: readonly Pass[];
  readonly outcome: OutcomeSummary;
};

/** The machine a measurement was taken on. */
export type Machine = {
  readonly node: string;
  readonly cpu: string;
  readonly cores: number;
  readonly platform: string;
};

/** Which evaluation of a case, and which pass of it, was running. */
export type Running = {
  readonly run: "cold" | "warm";
  readonly pass: number;
  readonly precision: number;
};

/**
 * What measuring a case gave: both evaluations, or, past the deadline, the
 * cold evaluation if it finished and what was running when the deadline
 * passed (nothing yet, if the worker had not started a pass).
 */
export type Measurement =
  | {
      readonly status: "done";
      readonly case: Case;
      readonly machine: Machine;
      readonly cold: Run;
      readonly warm: Run;
    }
  | {
      readonly status: "deadline";
      readonly case: Case;
      readonly machine: Machine;
      readonly deadlineMs: number;
      readonly cold: Run | undefined;
      readonly running: Running | undefined;
    };

/**
 * One keystroke of a case typed out: how much of the `have` was typed,
 * the time `outcomeOf` took on it, and the outcome's kind.
 */
export type Keystroke = {
  readonly length: number;
  readonly ms: number;
  readonly kind: Outcome["kind"];
};

/**
 * A case typed out, a keystroke at a time: every keystroke's cost, and
 * whether the typing finished within the deadline.
 */
export type Typing = {
  readonly keystrokes: readonly Keystroke[];
  readonly complete: boolean;
};

/** What the worker posts: the table is built, a pass starts, or a run is over. */
type Message =
  | { readonly kind: "ready" }
  | { readonly kind: "keystroke"; readonly keystroke: Keystroke }
  | { readonly kind: "typed" }
  | {
      readonly kind: "pass";
      readonly run: "cold" | "warm";
      readonly pass: number;
      readonly precision: number;
    }
  | {
      readonly kind: "run";
      readonly run: "cold" | "warm";
      readonly result: Run;
    };

/**
 * The data a worker is started with, tagged so that no other worker
 * mistakes it: a case to measure, or one to type out.
 */
type Job = { readonly stressCase: Case } | { readonly stressTyping: Case };

// ---------------------------------------------------------------------------
// Measuring

/** A case with the default settings, the panel's when nothing is changed. */
export function caseOf(
  have: string,
  want = "",
  settings: Partial<Settings> = {},
): Case {
  return { have, want, settings: { ...DEFAULT_SETTINGS, ...settings } };
}

/**
 * Throws `RangeError` unless `settings` are ones the panel could hold: the
 * range limit within its bounds, the cap within what it allows, the digits
 * within the cap, and a mode, as settings.ts validates a stored entry.
 */
export function checkSettings(settings: Settings): void {
  const { digits, maxDigits, maxBits, mode } = settings;
  if (!isMaxBits(maxBits)) throw new RangeError(`Most bits: ${maxBits}`);
  if (!isMaxDigits(maxDigits, maxBits)) {
    throw new RangeError(`Precision limit: ${maxDigits} at ${maxBits} bits`);
  }
  if (!isDigits(digits, maxDigits)) {
    throw new RangeError(`Digits: ${digits} under a cap of ${maxDigits}`);
  }
  if (!isMode(mode)) throw new RangeError(`Mode: ${String(mode)}`);
}

/** The machine this process runs on. */
export function machine(): Machine {
  return {
    node: process.version,
    cpu: cpus()[0]?.model.trim() ?? "unknown",
    cores: availableParallelism(),
    platform: platform(),
  };
}

/**
 * The cost of `c`, measured in a worker of its own: the cold and the warm
 * evaluation, each with its passes, or, if the evaluations have not ended
 * `deadlineMs` after the table is built, the case past its deadline with
 * the pass that was running.
 */
export async function measure(
  c: Case,
  deadlineMs: number,
): Promise<Measurement> {
  checkSettings(c.settings);
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { stressCase: c } satisfies Job,
  });
  const runs: Partial<Record<"cold" | "warm", Run>> = {};
  let running: Running | undefined;
  try {
    return await new Promise<Measurement>((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      const pastDeadline = () => {
        void worker.terminate();
        resolve({
          status: "deadline",
          case: c,
          machine: machine(),
          deadlineMs,
          cold: runs.cold,
          running,
        });
      };
      worker.on("message", (message: Message) => {
        switch (message.kind) {
          case "ready":
            timer = setTimeout(pastDeadline, deadlineMs);
            break;
          case "pass":
            running = message;
            break;
          case "run":
            runs[message.run] = message.result;
            if (runs.cold !== undefined && runs.warm !== undefined) {
              clearTimeout(timer);
              resolve({
                status: "done",
                case: c,
                machine: machine(),
                cold: runs.cold,
                warm: runs.warm,
              });
            }
            break;
        }
      });
      worker.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      worker.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`the worker exited with ${code} before it was done`));
      });
    });
  } finally {
    await worker.terminate();
  }
}

/**
 * `c` typed out in a worker of its own, as the converter sees it: the
 * table built once, untimed, then `outcomeOf` on every prefix of the
 * `have` in order, with the `want` as it is, so that the memos carry over
 * from keystroke to keystroke as they do in a session. A prefix can cost
 * more than the whole: `x - x + 1` certifies where `x - x` never does.
 * Past `deadlineMs` after the table is built, the keystrokes typed so far
 * are returned, marked incomplete.
 */
export async function typeOut(c: Case, deadlineMs: number): Promise<Typing> {
  checkSettings(c.settings);
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { stressTyping: c } satisfies Job,
  });
  const keystrokes: Keystroke[] = [];
  try {
    return await new Promise<Typing>((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      worker.on("message", (message: Message) => {
        switch (message.kind) {
          case "ready":
            timer = setTimeout(() => {
              void worker.terminate();
              resolve({ keystrokes, complete: false });
            }, deadlineMs);
            break;
          case "keystroke":
            keystrokes.push(message.keystroke);
            break;
          case "typed":
            clearTimeout(timer);
            resolve({ keystrokes, complete: true });
            break;
          default:
            break;
        }
      });
      worker.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      worker.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`the worker exited with ${code} before it was done`));
      });
    });
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// The worker

/** The system definitions, parsed: the file the app ships. */
function systemDefinitions() {
  const text = readFileSync(
    new URL("../../src/units.txt", import.meta.url),
    "utf8",
  );
  const parsed = parseDefinitions(text);
  if (!parsed.ok) throw new Error("The system definitions do not parse");
  return parsed.value;
}

/** The system table built at the ceiling of `settings`, as the app builds it. */
function systemTable(settings: Settings) {
  const context = contextOf(settings);
  const table = buildTable(systemDefinitions(), ceilingContext(context));
  if (!table.ok) throw new Error("The system definitions do not build");
  return { context, table: table.value };
}

/** Builds the table, then evaluates every prefix of the `have`, posting each. */
function typeJob(c: Case): void {
  const port = parentPort!;
  const { context, table } = systemTable(c.settings);
  port.postMessage({ kind: "ready" } satisfies Message);
  for (let length = 1; length <= c.have.length; length++) {
    const start = performance.now();
    const outcome = outcomeOf(
      table,
      c.have.slice(0, length),
      c.want,
      context,
      c.settings.fractions,
    );
    const ms = performance.now() - start;
    port.postMessage({
      kind: "keystroke",
      keystroke: { length, ms: Math.round(ms * 10) / 10, kind: outcome.kind },
    } satisfies Message);
  }
  port.postMessage({ kind: "typed" } satisfies Message);
}

/** Builds the table, then evaluates the case cold and warm, posting as it goes. */
function runJob(job: { readonly stressCase: Case }): void {
  const port = parentPort!;
  const { have, want, settings } = job.stressCase;
  const { context, table } = systemTable(settings);
  port.postMessage({ kind: "ready" } satisfies Message);
  for (const run of ["cold", "warm"] as const) {
    const passes: Pass[] = [];
    let passStart = 0;
    const observe = (event: PassEvent) => {
      const now = performance.now();
      if (event.phase === "start") {
        passStart = now;
        port.postMessage({
          kind: "pass",
          run,
          pass: event.index,
          precision: event.working.precision,
        } satisfies Message);
      } else {
        passes.push({
          precision: event.working.precision,
          ms: now - passStart,
        });
      }
    };
    const start = performance.now();
    const outcome = outcomeOf(
      table,
      have,
      want,
      context,
      settings.fractions,
      observe,
    );
    const ms = performance.now() - start;
    port.postMessage({
      kind: "run",
      run,
      result: { ms, passes, outcome: summarize(outcome) },
    } satisfies Message);
  }
}

/** `outcome` as a summary: its kind, its first line or message, its warnings. */
export function summarize(outcome: Outcome): OutcomeSummary {
  switch (outcome.kind) {
    case "empty":
      return { kind: "empty", line: "", warnings: 0 };
    case "error":
      return { kind: "error", line: outcome.message, warnings: 0 };
    case "result":
      return {
        kind: "result",
        line: written(outcome.lines[0]!),
        warnings: outcome.warnings?.length ?? 0,
      };
  }
}

/** A line as the converter writes it (unit-converter.ts), the note in parentheses. */
function written(line: Line): string {
  const terms = line.terms
    .map((term, i) => {
      const operator = i === 0 ? "" : term.negative ? " - " : " + ";
      const unit = term.unit === "" ? "" : ` ${term.unit}`;
      return `${operator}${term.text}${unit}`;
    })
    .join("");
  const sum = line.call === undefined ? terms : `${line.call}(${terms})`;
  const note = line.note === undefined ? "" : ` (${line.note})`;
  return `${line.have} ${line.relation} ${sum}${note}`;
}

if (!isMainThread) {
  const job = workerData as Partial<{
    stressCase: Case;
    stressTyping: Case;
  }> | null;
  if (job?.stressCase !== undefined) runJob({ stressCase: job.stressCase });
  else if (job?.stressTyping !== undefined) typeJob(job.stressTyping);
}
