import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/features/jobs/api/endpoints';

export function useJobs(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => getJobs(params),
  });
}
