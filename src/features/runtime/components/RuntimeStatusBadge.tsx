import Badge from '@/shared/ui/Badge';

type Variant = 'success' | 'muted' | 'info' | 'default';

const STATUS_MAP: Record<string, { variant: Variant; label: string }> = {
  RUNNING: { variant: 'success', label: 'Running' },
  STOPPED: { variant: 'muted', label: 'Stopped' },
  FETCHING: { variant: 'info', label: 'Fetching' },
  IDLE: { variant: 'muted', label: 'Idle' },
};

/** Worker runtime status pill (RUNNING / STOPPED / FETCHING / IDLE). */
export default function RuntimeStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { variant: 'default' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
