import { api } from '@/shared/api/client';
import type { CountResult, VariablesMap } from '@/shared/api/types';
import type { Task } from '@/features/tasks/api/types';

export async function getTasks(
  params?: Record<string, any>,
): Promise<Task[]> {
  const { data } = await api.get('/task', { params });
  return data;
}

export async function getTaskById(id: string): Promise<Task> {
  const { data } = await api.get(`/task/${id}`);
  return data;
}

export async function getTaskVariables(id: string): Promise<VariablesMap> {
  const { data } = await api.get(`/task/${id}/variables`);
  return data;
}

export async function getTaskFormVariables(id: string): Promise<VariablesMap> {
  const { data } = await api.get(`/task/${id}/form-variables`);
  return data;
}

export async function claimTask(id: string, userId: string): Promise<void> {
  const { data } = await api.post(`/task/${id}/claim`, { userId });
  return data;
}

export async function unclaimTask(id: string): Promise<void> {
  const { data } = await api.post(`/task/${id}/unclaim`, {});
  return data;
}

export async function completeTask(
  id: string,
  variables?: Record<string, any>,
): Promise<void> {
  const { data } = await api.post(`/task/${id}/complete`, { variables });
  return data;
}

export async function delegateTask(
  id: string,
  userId: string,
): Promise<void> {
  const { data } = await api.post(`/task/${id}/delegate`, { userId });
  return data;
}

export async function updateTask(
  id: string,
  body: Record<string, any>,
): Promise<void> {
  const { data } = await api.put(`/task/${id}`, body);
  return data;
}

export async function getTaskCount(
  params?: Record<string, any>,
): Promise<CountResult> {
  const { data } = await api.get('/task/count', { params });
  return data;
}
