import { useQuery } from '@tanstack/react-query';
import { getTasks } from '@/features/tasks/api/endpoints';

export function useTasks(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => getTasks(params),
  });
}
