// The result type every fallible function in the core returns. Failures are
// values, never exceptions, so that a caller can pattern-match on `ok` and
// carry the error up to the UI without a try/catch at each module boundary.

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Wraps a successful value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wraps a failure. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
