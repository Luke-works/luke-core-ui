import { Paperclip, FileText, ExternalLink } from 'lucide-react';
import Badge from '@/shared/ui/Badge';
import EmptyState from '@/shared/ui/EmptyState';
import Skeleton from '@/shared/ui/Skeleton';
import { useTaskAttachments } from '@/features/tasks/hooks/useTaskAttachments';
import type { Attachment } from '@/features/tasks/api/types';
import { relativeTime } from '@/shared/utils/date';

// Luke encodes the TASK/PROCESS classification in the Camunda attachment `type` (see the engine's
// DocumentProcessLink mirror); fall back gracefully for any non-Luke attachment.
const TYPE_TASK = 'luke-task-attachment';
const TYPE_PROCESS = 'luke-process-attachment';

function classify(type: string | null): { label: string; variant: 'info' | 'muted' } {
  if (type === TYPE_TASK) return { label: 'Task', variant: 'info' };
  if (type === TYPE_PROCESS) return { label: 'Process', variant: 'muted' };
  return { label: type || 'Attachment', variant: 'muted' };
}

export default function AttachmentsTab({ taskId }: { taskId: string }) {
  const { data, isLoading, isError } = useTaskAttachments(taskId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<Paperclip size={28} />}
        title="Couldn't load attachments"
        description="The task's attachments could not be loaded. Try again shortly."
      />
    );
  }

  const attachments = data ?? [];
  if (attachments.length === 0) {
    return (
      <EmptyState
        icon={<Paperclip size={28} />}
        title="No attachments"
        description="This task has no attachments."
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
      {attachments.map((a) => (
        <AttachmentRow key={a.id} attachment={a} />
      ))}
    </ul>
  );
}

function AttachmentRow({ attachment: a }: { attachment: Attachment }) {
  const { label, variant } = classify(a.type);
  const name = a.name || 'attachment';
  return (
    <li className="flex items-center gap-3 py-3">
      <FileText size={20} className="shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90" title={name}>
            {name}
          </span>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <span className="block text-theme-xs text-gray-400">
          {a.description ? `${a.description} · ` : ''}
          {a.createTime ? `added ${relativeTime(a.createTime)}` : ''}
        </span>
      </div>
      {a.url && (
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-theme-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <ExternalLink size={14} /> Open
        </a>
      )}
    </li>
  );
}
