// Records again the outcome line of every catalogued entry as the
// current build writes it, changing no timing and no case: run by `pnpm
// stress:reline` after a change to how a line is written rather than to
// what it computes (the printer's spacing, the display's wording of a
// zero), which fails `pnpm stress` on every entry whose line it touched.
// Each entry is evaluated once, in a worker lane (harness.ts, `lineOf`),
// under the suite's own deadline for it; an entry past its deadline is
// left as it is and reported. Every line changed is printed, old and
// new, so that the change is reviewed in the diff of the catalogue: the
// tool cannot tell a line reworded from a value changed, and `verify.ts`
// never records a changed value for that reason, so a run of this tool
// is a statement, made in the change that runs it, that the values are
// the same and only their writing differs. The hangs have no line.

import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import {
  DEADLINE_MS,
  lineChanged,
  withOutcome,
  type Catalogue,
  type Entry,
} from "./catalogue.ts";
import { lineOf, type OutcomeSummary } from "./harness.ts";
import { runPool } from "./pool.ts";
import { CATALOGUE, update } from "./tooling.ts";
import { readCatalogue } from "./catalogue.ts";

/** The deadline of an entry: four times its catalogued time and two minutes at least, as `verify.ts` has it. */
function deadlineOf(entry: Entry): number {
  return Math.max(DEADLINE_MS, 4 * (entry.cold.ms + entry.warm.ms));
}

function nameOf(entry: Entry): string {
  return `${entry.family.profile}: ${entry.have}${entry.want === "" ? "" : ` into ${entry.want}`}`;
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        jobs: { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
  if (parsed.values.help) {
    console.log("usage: pnpm stress:reline [--jobs <n>]");
    return;
  }
  const jobs =
    parsed.values.jobs === undefined
      ? availableParallelism()
      : Number(parsed.values.jobs);
  if (!Number.isInteger(jobs) || jobs < 1) {
    console.error("--jobs takes a positive integer");
    process.exit(2);
  }
  const catalogue = readCatalogue(CATALOGUE);
  const entries = [...catalogue.entries];
  const outcomes = new Map<Entry, OutcomeSummary>();
  const late: Entry[] = [];
  let done = 0;
  console.log(`${entries.length} entries, ${jobs} lanes`);
  await runPool<Entry>({
    jobs,
    next: () => entries.shift(),
    run: async (entry) => {
      const outcome = await lineOf(entry, deadlineOf(entry));
      done++;
      const name = `[${done}/${catalogue.entries.length}] ${nameOf(entry)}`;
      if (outcome === undefined) {
        late.push(entry);
        console.log(`${name}: past its deadline, left as it is`);
      } else if (lineChanged(entry, outcome)) {
        outcomes.set(entry, outcome);
        console.log(
          `${name}:\n    was ${JSON.stringify(entry.warm.outcome)}\n    now ${JSON.stringify(outcome)}`,
        );
      }
    },
  });
  const relined = await update((current: Catalogue): Catalogue => ({
    ...current,
    entries: current.entries.map((entry) => {
      const match = [...outcomes.entries()].find(
        ([e]) =>
          e.have === entry.have &&
          e.want === entry.want &&
          e.family.profile === entry.family.profile,
      );
      return match === undefined ? entry : withOutcome(entry, match[1]);
    }),
  }));
  console.log(
    `relined ${outcomes.size} of ${relined.entries.length} entries; ${late.length} past their deadline`,
  );
  if (late.length > 0) process.exit(1);
}

await main();
