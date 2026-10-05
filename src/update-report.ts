// What the "Check for updates" button says, from the service worker's
// status: no DOM dependency, so update-report.test.ts checks it under Node.
// update-check.ts is the button itself.

import type { WorkerStatus } from "./service-worker-updates.ts";

/** Where the user's check for an update stands: under way, gone through, or failed. */
export type UpdateCheck = "checking" | "done" | "failed";

/**
 * Whether there is a worker to check: not in development, in a browser
 * without service workers, or when the registration failed.
 */
export function offersCheck(status: WorkerStatus): boolean {
  const { kind } = status;
  return kind !== "development" && kind !== "unsupported" && kind !== "failed";
}

/**
 * What the user's check found, once it has gone through, or nothing before
 * they ask or while it runs. It follows the worker's status rather than
 * the check's own result, so it agrees with the footer however late a
 * browser reports the new worker a check found, and keeps up with any
 * check made since: an update downloading, ready (the footer has the link
 * that applies it) or being applied, or else up to date. A failed check
 * says so unless an update has turned up all the same.
 */
export function checkReport(
  check: UpdateCheck | undefined,
  status: WorkerStatus,
): string | undefined {
  if (check === undefined || check === "checking") return undefined;
  switch (status.kind) {
    case "downloading":
      return "Downloading…";
    case "waiting":
      return "Update ready";
    case "applying":
      return "Updating…";
    default:
      return check === "failed" ? "Couldn't check (offline?)" : "Up to date";
  }
}
