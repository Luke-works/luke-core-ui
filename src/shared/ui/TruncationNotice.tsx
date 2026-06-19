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
      className="mb-2 rounded-md px-3 py-2 text-xs"
      style={{
        backgroundColor: 'rgba(234,179,8,0.08)',
        border: '1px solid rgba(234,179,8,0.25)',
        color: 'var(--text-secondary)',
      }}
    >
      Showing the first {cap} {noun} — more may exist. Refine your search to narrow the list.
    </div>
  );
}
