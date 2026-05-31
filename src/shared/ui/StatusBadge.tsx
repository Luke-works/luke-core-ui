import { statusLabel } from '@/shared/utils/camunda';

type Status =
  | 'running'
  | 'suspended'
  | 'incident'
  | 'completed'
  | 'active'
  | 'failed'
  | string;

interface StatusBadgeProps {
  status: Status;
}

/** Map Camunda status → TailAdmin Badge color variant + dot color. */
function classesFor(status: string): { wrap: string; dot: string } {
  switch (status) {
    case 'ACTIVE':
    case 'active':
    case 'running':
      return {
        wrap: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
        dot: 'bg-success-500',
      };
    case 'SUSPENDED':
    case 'suspended':
      return {
        wrap: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
        dot: 'bg-warning-500',
      };
    case 'INCIDENT':
    case 'incident':
    case 'failed':
      return {
        wrap: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
        dot: 'bg-error-500',
      };
    case 'COMPLETED':
    case 'completed':
    case 'INTERNALLY_TERMINATED':
      return {
        wrap: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
        dot: 'bg-gray-400',
      };
    default:
      return {
        wrap: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
        dot: 'bg-brand-500',
      };
  }
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { wrap, dot } = classesFor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${wrap}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {statusLabel(status)}
    </span>
  );
}
