import { useQuery } from '@tanstack/react-query';
import { getTaskAttachments } from '@/features/tasks/api/endpoints';

/** A task's Camunda attachments (Luke documents are mirrored here, classified by `type`). */
export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['taskAttachments', taskId],
    queryFn: () => getTaskAttachments(taskId!),
    enabled: !!taskId,
  });
}
