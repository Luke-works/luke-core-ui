import { api } from '@/shared/api/client';
import type { CountResult } from '@/shared/api/types';
import type { Job, JobDefinition } from '@/features/jobs/api/types';

export async function getJobs(
  params?: Record<string, any>,
): Promise<Job[]> {
  const { data } = await api.get('/job', { params });
  return data;
}

export async function getJobById(id: string): Promise<Job> {
  const { data } = await api.get(`/job/${id}`);
  return data;
}

export async function getJobStacktrace(id: string): Promise<string> {
  const { data } = await api.get(`/job/${id}/stacktrace`, {
    responseType: 'text',
  });
  return data;
}

export async function retryJob(
  id: string,
  retries?: number,
): Promise<void> {
  const { data } = await api.post(`/job/${id}/retries`, {
    retries: retries ?? 1,
  });
  return data;
}

export async function suspendJob(
  id: string,
  suspended: boolean,
): Promise<void> {
  const { data } = await api.put(`/job/${id}/suspended`, { suspended });
  return data;
}

export async function setJobDueDate(
  id: string,
  duedate: string | null,
): Promise<void> {
  await api.put(`/job/${id}/duedate`, { duedate });
}

export async function getJobDefinitions(
  params?: Record<string, any>,
): Promise<JobDefinition[]> {
  const { data } = await api.get('/job-definition', { params });
  return data;
}

export async function suspendJobDefinition(
  id: string,
  suspended: boolean,
): Promise<void> {
  const { data } = await api.put(`/job-definition/${id}/suspended`, {
    suspended,
    includeJobs: true,
  });
  return data;
}

export async function getJobCount(
  params?: Record<string, any>,
): Promise<CountResult> {
  const { data } = await api.get('/job/count', { params });
  return data;
}
