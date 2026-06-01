import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

/**
 * Axios client for the WorkerFlow backend (the luke-task-engine Spring app),
 * which is served under `/api` — distinct from the Camunda `engine-rest` client
 * in `shared/api/client.ts`. Used by the runtime feature (runtime monitor, logs,
 * metrics, health) and any future worker-platform features ported from the
 * standalone WorkerFlow UI.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export const workerflowApi = axios.create({ baseURL });

workerflowApi.interceptors.request.use((config) => {
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
