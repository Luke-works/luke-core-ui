import { api } from '@/shared/api/client';

export type Deployment = {
  id: string;
  name: string;
  source: string | null;
  tenantId: string | null;
  deploymentTime: string;
};

export type DeploymentResource = {
  id: string;
  name: string;
  deploymentId: string;
};

export async function getDeployments(
  params?: Record<string, any>,
): Promise<Deployment[]> {
  const { data } = await api.get('/deployment', { params });
  return data;
}

export async function getDeploymentResources(
  id: string,
): Promise<DeploymentResource[]> {
  const { data } = await api.get(`/deployment/${id}/resources`);
  return data;
}

export async function getDeploymentById(id: string): Promise<Deployment> {
  const { data } = await api.get(`/deployment/${id}`);
  return data;
}

export async function getDeploymentResourceData(
  deploymentId: string,
  resourceId: string,
): Promise<string> {
  const { data } = await api.get(
    `/deployment/${deploymentId}/resources/${resourceId}/data`,
    { responseType: 'text', transformResponse: [(d: any) => d] },
  );
  return data;
}

export async function deleteDeployment(
  id: string,
  cascade?: boolean,
): Promise<void> {
  const { data } = await api.delete(`/deployment/${id}`, {
    params: { cascade },
  });
  return data;
}
