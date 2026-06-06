import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getTenants, type Tenant } from '@/features/admin/api/tenant';

/**
 * Cross-tenant metrics for the operator dashboard.
 *
 * The shared api client (src/shared/api/client.ts) injects the *active* tenant's
 * X-Tenant-Id / tenantIdIn on every request, which makes it impossible to query
 * other tenants. This module uses a dedicated axios instance that only attaches
 * Basic auth, then scopes each call explicitly with `tenantIdIn`, so an operator
 * (admin / camunda-admin, who holds cross-tenant grants) can aggregate per-tenant
 * counts. A tenant-scoped user without those grants will only see their own data.
 */

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/engine-rest`
  : '/engine-rest';

const metricsApi = axios.create({
  baseURL,
  // Match the shared client: a 304 (ETag revalidation) is a successful,
  // authorized response, not an error.
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

metricsApi.interceptors.request.use((config) => {
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    config.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }
  return config;
});

async function countFor(path: string, params: Record<string, unknown>): Promise<number> {
  try {
    const { data } = await metricsApi.get<{ count: number }>(path, { params });
    return data?.count ?? 0;
  } catch {
    // A tenant the caller can't see (or a transient error) contributes 0 rather
    // than failing the whole dashboard.
    return 0;
  }
}

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

async function metricsForTenant(tenant: Tenant): Promise<TenantMetrics> {
  const id = tenant.id;
  const [users, definitions, runningInstances, incidents, deployments, openTasks] =
    await Promise.all([
      countFor('/user/count', { memberOfTenant: id }),
      countFor('/process-definition/count', { tenantIdIn: id }),
      countFor('/process-instance/count', { tenantIdIn: id }),
      countFor('/incident/count', { tenantIdIn: id }),
      countFor('/deployment/count', { tenantIdIn: id }),
      countFor('/task/count', { tenantIdIn: id }),
    ]);
  return { tenant, users, definitions, runningInstances, incidents, deployments, openTasks };
}

export async function getTenancyMetrics(): Promise<TenancyMetrics> {
  const tenants = await getTenants({ maxResults: 200 });
  const perTenant = await Promise.all(tenants.map(metricsForTenant));

  const totals = perTenant.reduce(
    (acc, m) => ({
      tenants: acc.tenants + 1,
      users: acc.users + m.users,
      definitions: acc.definitions + m.definitions,
      runningInstances: acc.runningInstances + m.runningInstances,
      incidents: acc.incidents + m.incidents,
      deployments: acc.deployments + m.deployments,
      openTasks: acc.openTasks + m.openTasks,
    }),
    { tenants: 0, users: 0, definitions: 0, runningInstances: 0, incidents: 0, deployments: 0, openTasks: 0 },
  );

  return { tenants: perTenant, totals };
}
