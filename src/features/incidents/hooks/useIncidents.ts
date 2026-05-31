import { useQuery } from '@tanstack/react-query';
import { getIncidents } from '@/features/incidents/api/endpoints';

export function useIncidents(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: () => getIncidents(params),
  });
}
