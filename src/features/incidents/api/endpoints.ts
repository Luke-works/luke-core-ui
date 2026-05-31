import { api } from '@/shared/api/client';
import type { CountResult } from '@/shared/api/types';
import type { Incident } from '@/features/incidents/api/types';

export async function getIncidents(
  params?: Record<string, any>,
): Promise<Incident[]> {
  const { data } = await api.get('/incident', { params });
  return data;
}

export async function getIncidentCount(
  params?: Record<string, any>,
): Promise<CountResult> {
  const { data } = await api.get('/incident/count', { params });
  return data;
}

export async function deleteIncident(id: string): Promise<void> {
  const { data } = await api.delete(`/incident/${id}`);
  return data;
}
