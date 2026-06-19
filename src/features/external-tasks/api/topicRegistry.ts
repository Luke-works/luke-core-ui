import axios from 'axios';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { injectBasicAuth, handleAuthError } from '@/shared/api/client';

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
  injectBasicAuth(config); // shared credential encoding (#31)
  const tenantId = useTenantStore.getState().activeTenantId;
  if (tenantId) {
    config.headers.set('X-Tenant-Id', tenantId);
  }
  return config;
});

// Same auth-failure flow as the shared client: an expired session signs out +
// redirects instead of leaving the user half-authenticated on the registry pages (#31).
topicApi.interceptors.response.use((response) => response, handleAuthError);

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
