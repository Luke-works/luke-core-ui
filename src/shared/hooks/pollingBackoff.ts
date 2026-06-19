/**
 * A TanStack `refetchInterval` that backs off exponentially while a query is failing,
 * so a slow/erroring engine isn't hammered at the full poll rate (#38). Returns the
 * base interval when healthy; doubles per consecutive failure up to `maxMs`.
 *
 * Tab-hidden pausing is already TanStack's default (refetchIntervalInBackground is
 * left false), so polling only runs on the focused tab.
 *
 * The param is typed structurally (just the field we read) so the returned function
 * is assignable to any query's `refetchInterval` regardless of its data type.
 */
export function pollWithBackoff(baseMs: number, maxMs = 5 * 60_000) {
  return (query: { state: { fetchFailureCount: number } }): number => {
    const failures = query.state.fetchFailureCount;
    return failures > 0 ? Math.min(baseMs * 2 ** Math.min(failures, 5), maxMs) : baseMs;
  };
}
