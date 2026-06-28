/**
 * Tiny logging shim. The app swallows most errors on purpose (resilience), but
 * a fully silent `catch {}` makes a real persistence or parsing failure
 * impossible to diagnose. `devError` surfaces those in development only — it is
 * a no-op in production builds, so nothing leaks to end users.
 */

/** Log an unexpected, otherwise-swallowed error. DEV builds only. */
export function devError(context: string, err: unknown): void {
  if (import.meta.env?.DEV) console.error(`[icarus] ${context}`, err);
}
