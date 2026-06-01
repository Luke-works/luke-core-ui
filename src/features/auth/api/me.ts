import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

/**
 * Current-user identity context from core-engine (/api/me) — the caller's own
 * groups/roles, computed server-side so no broad Group-read authorization is
 * needed. Drives role-based UI gating.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const coreApi = axios.create({ baseURL });

coreApi.interceptors.request.use((config) => {
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

export type MeGroup = { id: string; type: string };

export type Me = {
  userId: string;
  operator: boolean;
  groups: MeGroup[];
  tenants: string[];
};

export async function getMe(): Promise<Me> {
  const { data } = await coreApi.get('/me');
  return data;
}
