import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getJobStacktrace } from '@/features/jobs/api/endpoints';

interface StackTraceModalProps {
  /** Job id whose stack trace to fetch. When null, the modal is closed. */
  jobId: string | null;
  onClose: () => void;
  /** Optional subtitle (e.g. the activity or incident message). */
  subtitle?: string;
}

/**
 * Large centered modal that fetches and displays a job's exception stack trace.
 * Shared by the Jobs page, Incidents page, and the instance-detail incidents tab.
 */
export default function StackTraceModal({ jobId, onClose, subtitle }: StackTraceModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stacktrace', jobId],
    queryFn: () => getJobStacktrace(jobId!),
    enabled: !!jobId,
  });

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal — large */}
      <div
        className="relative z-10 w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl border bg-white shadow-theme-xl dark:bg-gray-900"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Stack Trace
            </h2>
            {subtitle && (
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }} title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading stack trace...
            </p>
          ) : isError ? (
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
              Failed to load stack trace.
            </p>
          ) : (
            <pre
              className="text-xs font-mono-id overflow-auto p-4 rounded-md h-full"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                whiteSpace: 'pre',
              }}
            >
              <code>{data || 'No stack trace available.'}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
