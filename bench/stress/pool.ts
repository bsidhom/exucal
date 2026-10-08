// The work pool of the stress tools (devdocs/benchmarks.md, "The search"):
// lanes, one per core by default, that each take the next case as they
// come free, so that the work is shared at the grain of a case however
// unequal the cases' costs, and a long case holds one lane while the
// others carry on. Nothing here knows what a unit of work is.

/** What `runPool` needs: the lanes, the next unit, and how to run one. */
export type PoolOptions<T> = {
  readonly jobs: number;
  /** The next unit, taking it, or `undefined` when there are no more. */
  readonly next: () => T | undefined;
  readonly run: (unit: T) => Promise<void>;
};

/**
 * Runs the units `next` gives, `jobs` at a time, until it gives no more
 * and the running units have finished. Gives how many units started. A
 * unit that throws stops the pool: no unit starts after it, the running
 * units finish, and the first error is thrown.
 */
export async function runPool<T>(options: PoolOptions<T>): Promise<number> {
  const { jobs, next, run } = options;
  let started = 0;
  let failed = false;
  let failure: unknown;
  const lane = async (): Promise<void> => {
    for (;;) {
      if (failed) return;
      const unit = next();
      if (unit === undefined) return;
      started++;
      try {
        await run(unit);
      } catch (e) {
        if (!failed) {
          failed = true;
          failure = e;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, lane));
  if (failed) throw failure;
  return started;
}
