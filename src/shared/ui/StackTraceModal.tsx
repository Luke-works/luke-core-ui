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
      <div className="relative z-10 w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              Stack Trace
            </h2>
            {subtitle && (
              <p className="text-xs truncate text-gray-400 dark:text-gray-500" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Loading stack trace...
            </p>
          ) : isError ? (
            <p className="text-sm text-error-500 dark:text-error-400">
              Failed to load stack trace.
            </p>
          ) : (
            <pre
              className="text-xs font-mono-id overflow-auto p-4 rounded-lg h-full text-gray-800 bg-gray-50 border border-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700"
              style={{ whiteSpace: 'pre' }}
            >
              <code>{data || 'No stack trace available.'}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
