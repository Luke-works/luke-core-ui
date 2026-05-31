import { api } from '@/shared/api/client';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
};

export type Group = {
  id: string;
  name: string;
  type: string;
};

export async function getUsers(
  params?: Record<string, any>,
): Promise<User[]> {
  const { data } = await api.get('/user', { params });
  return data;
}

export async function createUser(body: {
  profile: { id: string; firstName: string; lastName: string; email: string };
  credentials: { password: string };
}): Promise<void> {
  const { data } = await api.post('/user/create', body);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  const { data } = await api.delete(`/user/${id}`);
  return data;
}

export async function getGroups(
  params?: Record<string, any>,
): Promise<Group[]> {
  const { data } = await api.get('/group', { params });
  return data;
}

export async function createGroup(body: {
  id: string;
  name: string;
  type: string;
}): Promise<void> {
  const { data } = await api.post('/group/create', body);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  const { data } = await api.delete(`/group/${id}`);
  return data;
}

export async function addGroupMember(
  groupId: string,
  userId: string,
): Promise<void> {
  const { data } = await api.put(`/group/${groupId}/members/${userId}`);
  return data;
}

export async function removeGroupMember(
  groupId: string,
  userId: string,
): Promise<void> {
  const { data } = await api.delete(`/group/${groupId}/members/${userId}`);
  return data;
}
