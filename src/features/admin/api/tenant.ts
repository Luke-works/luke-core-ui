import { api } from '@/shared/api/client';

export type Tenant = {
  id: string;
  name: string;
};

export async function getTenants(
  params?: Record<string, any>,
): Promise<Tenant[]> {
  const { data } = await api.get('/tenant', { params });
  return data;
}

export async function getUserTenants(userId: string): Promise<Tenant[]> {
  const { data } = await api.get('/tenant', {
    params: { userMember: userId },
  });
  return data;
}
