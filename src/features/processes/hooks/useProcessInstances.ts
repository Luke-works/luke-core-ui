import { useQuery } from '@tanstack/react-query';
import { getProcessInstances } from '@/features/processes/api/endpoints';

export function useProcessInstances(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['processInstances', params],
    queryFn: () => getProcessInstances(params),
  });
}
