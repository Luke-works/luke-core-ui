import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

export type RegisteredTopic = {
  id: string;
  topicName: string;
  description: string | null;
  active: boolean;
  workerType: string;
  workerClass: string | null;
  workerName: string | null;
  pollType: string;
  pollIntervalMs: number | null;
  lockDurationMs: number;
  autoExtendLock: boolean;
  maxTasksPerPoll: number;
  retries: number;
  retryDelayMs: number | null;
  retryBackoff: string;
  resolutionPaths: string;
  autoRetryOnFailure: boolean;
  staleLockTimeoutMs: number | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
};

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/topics`
  : '/api/topics';

const topicApi = axios.create({ baseURL });

topicApi.interceptors.request.use((config) => {
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    config.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }
  const tenantId = useTenantStore.getState().activeTenantId;
  if (tenantId) {
    config.headers.set('X-Tenant-Id', tenantId);
  }
  return config;
});

export async function getRegisteredTopics(): Promise<RegisteredTopic[]> {
  const { data } = await topicApi.get('/');
  return data;
}

export async function createRegisteredTopic(body: Partial<RegisteredTopic>): Promise<RegisteredTopic> {
  const { data } = await topicApi.post('/', body);
  return data;
}

export async function updateRegisteredTopic(id: string, body: Partial<RegisteredTopic>): Promise<RegisteredTopic> {
  const { data } = await topicApi.put(`/${id}`, body);
  return data;
}

export async function deleteRegisteredTopic(id: string): Promise<void> {
  await topicApi.delete(`/${id}`);
}
