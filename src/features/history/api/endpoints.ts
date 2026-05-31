import { api } from '@/shared/api/client';
import type {
  HistoricProcessInstance,
  HistoricActivityInstance,
  HistoricVariableInstance,
} from '@/features/history/api/types';

export async function getHistoricProcessInstances(
  params?: Record<string, any>,
): Promise<HistoricProcessInstance[]> {
  const { data } = await api.get('/history/process-instance', { params });
  return data;
}

export async function getHistoricActivityInstances(
  params?: Record<string, any>,
): Promise<HistoricActivityInstance[]> {
  const { data } = await api.get('/history/activity-instance', { params });
  return data;
}

export async function getHistoricVariableInstances(
  params?: Record<string, any>,
): Promise<HistoricVariableInstance[]> {
  const { data } = await api.get('/history/variable-instance', { params });
  return data;
}

export async function getHistoricProcessInstanceById(
  id: string,
): Promise<HistoricProcessInstance> {
  const { data } = await api.get(`/history/process-instance/${id}`);
  return data;
}

export async function getHistoricProcessInstanceCount(
  params?: Record<string, any>,
): Promise<{ count: number }> {
  const { data } = await api.get('/history/process-instance/count', { params });
  return data;
}
