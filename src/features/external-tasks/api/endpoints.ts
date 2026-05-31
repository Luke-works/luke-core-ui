import { api } from '@/shared/api/client';
import type { CountResult } from '@/shared/api/types';

export type ExternalTask = {
  id: string;
  topicName: string;
  workerId: string | null;
  lockExpirationTime: string | null;
  retries: number | null;
  errorMessage: string | null;
  errorDetails: string | null;
  processInstanceId: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  activityId: string;
  activityInstanceId: string;
  executionId: string;
  tenantId: string | null;
  priority: number;
  suspended: boolean;
  businessKey: string | null;
};

export type ExternalTaskTopic = {
  topicName: string;
  count: number;
  locked: number;
  failed: number;
  available: number;
};

export async function getExternalTasks(
  params?: Record<string, any>,
): Promise<ExternalTask[]> {
  const { data } = await api.get('/external-task', { params });
  return data;
}

export async function getExternalTaskCount(
  params?: Record<string, any>,
): Promise<CountResult> {
  const { data } = await api.get('/external-task/count', { params });
  return data;
}

export async function getExternalTaskById(id: string): Promise<ExternalTask> {
  const { data } = await api.get(`/external-task/${id}`);
  return data;
}

export async function getExternalTaskErrorDetails(id: string): Promise<string> {
  const { data } = await api.get(`/external-task/${id}/errorDetails`, {
    responseType: 'text',
  });
  return data;
}

export async function setExternalTaskRetries(
  id: string,
  retries: number,
): Promise<void> {
  await api.put(`/external-task/${id}/retries`, { retries });
}

export async function unlockExternalTask(id: string): Promise<void> {
  await api.post(`/external-task/${id}/unlock`, {});
}

export async function setExternalTaskPriority(
  id: string,
  priority: number,
): Promise<void> {
  await api.put(`/external-task/${id}/priority`, { priority });
}

/**
 * Aggregate external tasks into topic-level summaries.
 */
export async function getExternalTaskTopics(): Promise<ExternalTaskTopic[]> {
  const tasks = await getExternalTasks({ maxResults: 1000 });
  const topicMap: Record<string, ExternalTaskTopic> = {};

  for (const task of tasks) {
    if (!topicMap[task.topicName]) {
      topicMap[task.topicName] = {
        topicName: task.topicName,
        count: 0,
        locked: 0,
        failed: 0,
        available: 0,
      };
    }
    const topic = topicMap[task.topicName];
    topic.count++;
    if (task.errorMessage) {
      topic.failed++;
    } else if (task.lockExpirationTime && new Date(task.lockExpirationTime) > new Date()) {
      topic.locked++;
    } else {
      topic.available++;
    }
  }

  return Object.values(topicMap).sort((a, b) => b.count - a.count);
}
