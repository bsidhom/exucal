// Rewrites the catalogue (bench/stress/catalogue.json) and the tables of
// docs/cost.md as the current build writes them, changing no case: run
// by `pnpm stress:rewrite` after a change to the settings' stored shape
// (docs/settings-storage.md), so that every case's settings are stored
// as the current version stores them rather than read through a
// migration. The test of catalogue.ts over the committed file fails
// until this has run.

import { update } from "./tooling.ts";

const catalogue = await update((c) => c);
console.log(
  `rewrote ${catalogue.entries.length} entries and ${catalogue.hangs.length} hangs`,
);
