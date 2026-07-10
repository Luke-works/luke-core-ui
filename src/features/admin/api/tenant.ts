import { api } from '@/shared/api/client';
import type { CountResult } from '@/shared/api/types';

export type Tenant = {
  id: string;
  name: string;
};

export async function getTenants(
  params?: Record<string, unknown>,
): Promise<Tenant[]> {
  const { data } = await api.get('/tenant', { params });
  // Guard against a non-array body (e.g. a 304 with an empty payload, which the
  // client treats as success) so callers never crash on `.length`.
  return Array.isArray(data) ? data : [];
}

/** Server-side total for the tenants table (#33). Camunda REST: GET /tenant/count. */
export async function getTenantCount(
  params?: Record<string, unknown>,
): Promise<CountResult> {
  const { data } = await api.get('/tenant/count', { params });
  return data;
}

export async function getUserTenants(userId: string): Promise<Tenant[]> {
  const { data } = await api.get('/tenant', {
    params: { userMember: userId },
  });
  return Array.isArray(data) ? data : [];
}

export async function createTenant(body: {
  id: string;
  name: string;
}): Promise<void> {
  const { data } = await api.post('/tenant/create', body);
  return data;
}

export async function deleteTenant(id: string): Promise<void> {
  const { data } = await api.delete(`/tenant/${id}`);
  return data;
}

export async function addTenantMember(
  tenantId: string,
  userId: string,
): Promise<void> {
  const { data } = await api.put(`/tenant/${tenantId}/user-members/${userId}`);
  return data;
}

export async function removeTenantMember(
  tenantId: string,
  userId: string,
): Promise<void> {
  const { data } = await api.delete(`/tenant/${tenantId}/user-members/${userId}`);
  return data;
}
