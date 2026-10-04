// The work pool of the stress tools (docs/calculator-plan.md, task 8.3):
// lanes, one per core by default, that each pull the next unit of work as
// they come free, so that the work is shared at the grain of a unit
// however unequal the units' costs, and a long unit holds one lane while
// the others carry on. Each unit is the smallest piece of work that can be
// done alone and journaled: a case measured, a pair measured back to back,
// an entry typed out.
//
// What is ready can change as units finish: a family's last case measured
// makes its pair or its typing ready. So a lane that finds nothing ready
// while units still run waits for one of them to finish and asks again,
// and the pool ends only when nothing is ready and nothing runs. A `stop`
// condition, a budget of time, ends it early: no unit starts once it
// holds, and the units running finish. Nothing here knows what a unit is.

/** What `runPool` needs: the lanes, the next ready unit, how to run one, when to stop. */
export type PoolOptions<T> = {
  readonly jobs: number;
  /** The next unit ready to run, taking it, or `undefined` while none is ready. */
  readonly next: () => T | undefined;
  readonly run: (unit: T) => Promise<void>;
  /** Holds once no more units should start. */
  readonly stop?: () => boolean;
};

/**
 * Runs the units `next` gives, `jobs` at a time, until none is ready and
 * none runs, or until `stop` holds and the running units have finished.
 * Gives how many units started. A unit that throws stops the pool: the
 * running units finish, and the first error is thrown.
 */
export async function runPool<T>(options: PoolOptions<T>): Promise<number> {
  const { jobs, next, run, stop = () => false } = options;
  let active = 0;
  let started = 0;
  let failed = false;
  let failure: unknown;
  let waiting: (() => void)[] = [];
  const wake = () => {
    const woken = waiting;
    waiting = [];
    for (const resume of woken) resume();
  };
  const lane = async (): Promise<void> => {
    for (;;) {
      if (failed || stop()) return;
      const unit = next();
      if (unit === undefined) {
        if (active === 0) {
          wake();
          return;
        }
        await new Promise<void>((resume) => waiting.push(resume));
        continue;
      }
      active++;
      started++;
      try {
        await run(unit);
      } catch (e) {
        if (!failed) {
          failed = true;
          failure = e;
        }
      } finally {
        active--;
        wake();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, lane));
  if (failed) throw failure;
  return started;
}
