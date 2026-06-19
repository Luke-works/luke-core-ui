import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { Tenant } from '@/features/admin/api/tenant';

/**
 * Cross-tenant metrics for the operator dashboard.
 *
 * Previously this fanned out six `engine-rest /count` calls per tenant — O(N)
 * requests on every load/refetch, with a hardcoded 200-tenant cap that silently
 * dropped tenant 201+. It now makes ONE call to the core-engine aggregate
 * (`/api/tenancy/metrics`, #39), which lists every tenant and counts server-side:
 * no thundering herd against the engine, no tenant cap.
 *
 * The endpoint is operator-only (parent-cluster member or `camunda-admin`); a
 * tenant-scoped user gets 403. The shared api client injects the *active* tenant's
 * X-Tenant-Id on every request, which would wrongly scope a cross-tenant read, so
 * this uses a dedicated axios instance that attaches only Basic auth.
 */

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

const metricsApi = axios.create({
  baseURL,
  // Match the shared client: a 304 (ETag revalidation) is a successful, authorized
  // response, not an error.
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

metricsApi.interceptors.request.use((config) => {
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    config.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }
  return config;
});

export interface TenantMetrics {
  tenant: Tenant;
  users: number;
  definitions: number;
  runningInstances: number;
  incidents: number;
  deployments: number;
  openTasks: number;
}

export interface TenancyMetrics {
  tenants: TenantMetrics[];
  totals: {
    tenants: number;
    users: number;
    definitions: number;
    runningInstances: number;
    incidents: number;
    deployments: number;
    openTasks: number;
  };
}

export async function getTenancyMetrics(): Promise<TenancyMetrics> {
  const { data } = await metricsApi.get<TenancyMetrics>('/api/tenancy/metrics');
  return data;
}
