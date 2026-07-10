/**
 * Shows an explicit "showing first N" banner when a list was fetched with a hard
 * cap and the result fills it — so a capped list no longer SILENTLY hides data
 * (#33). Renders nothing when the result is under the cap.
 */
export default function TruncationNotice({
  shown,
  cap,
  noun = 'results',
}: {
  shown: number;
  cap: number;
  noun?: string;
}) {
  if (shown < cap) return null;
  return (
    <div
      role="status"
      className="mb-2 rounded-lg px-3 py-2 text-xs text-warning-700 bg-warning-50 border border-warning-200 dark:text-warning-400 dark:bg-warning-500/10 dark:border-warning-500/25"
    >
      Showing the first {cap} {noun} — more may exist. Refine your search to narrow the list.
    </div>
  );
}
