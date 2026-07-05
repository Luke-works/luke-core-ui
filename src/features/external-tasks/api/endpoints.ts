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

export interface ExternalTaskLifecycleCounts {
  total: number;
  available: number;
  locked: number;
  failed: number;
}

/**
 * Server-side lifecycle counts via `/external-task/count` filters — no capped
 * client fetch, so counts stay correct past 500/1000 tasks (#33):
 *  - failed    = withException
 *  - locked    = locked (a live lock)
 *  - available = notLocked minus the failed ones (a failed task is also notLocked)
 * `total` is the unfiltered count. All four are independent count requests, so
 * they're exact regardless of volume.
 */
export async function getExternalTaskLifecycleCounts(): Promise<ExternalTaskLifecycleCounts> {
  const [total, locked, failed, notLocked] = await Promise.all([
    getExternalTaskCount(),
    getExternalTaskCount({ locked: true }),
    getExternalTaskCount({ withException: true }),
    getExternalTaskCount({ notLocked: true }),
  ]);
  return {
    total: total.count,
    locked: locked.count,
    failed: failed.count,
    // notLocked includes failed tasks; "available" excludes them.
    available: Math.max(0, notLocked.count - failed.count),
  };
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

/** How many tasks the topic aggregation samples. See getExternalTaskTopics. */
export const TOPIC_SAMPLE_CAP = 1000;

/**
 * Aggregate external tasks into topic-level summaries.
 *
 * GAP (#33): the engine REST surface has no "distinct topic names" or
 * per-topic count endpoint, so the only way to enumerate topics is to list
 * tasks and group them client-side. That means this sample is capped at
 * TOPIC_SAMPLE_CAP; past that, per-topic counts undercount. The page-level
 * lifecycle KPIs (total/available/locked/failed) do NOT use this — they use
 * getExternalTaskLifecycleCounts (exact /external-task/count). This is
 * enumeration-only, and the UI shows a truncation banner when it fills the cap.
 */
export async function getExternalTaskTopics(): Promise<ExternalTaskTopic[]> {
  const tasks = await getExternalTasks({ maxResults: TOPIC_SAMPLE_CAP });
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
