import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

/**
 * Client for core-engine's operator-only onboarding endpoint (served under
 * /api, not /engine-rest), which atomically creates a user, joins them to a
 * tenant, and assigns a role group.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const adminApi = axios.create({ baseURL });

adminApi.interceptors.request.use((config) => {
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

export type OnboardUserBody = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  tenantId: string;
  role: string;
  accessLevel: 'READ_WRITE' | 'READ_ONLY';
};

export async function onboardUser(body: OnboardUserBody): Promise<void> {
  await adminApi.post('/admin/onboard-user', body);
}
