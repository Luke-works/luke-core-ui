import { workerflowApi } from '@/shared/api/workerflowClient';
import type {
  ExecutionLogEntry,
  RuntimeLogFilters,
  RuntimeStatus,
  SystemSummary,
  WorkerRuntimeStatus,
} from '@/features/runtime/api/types';

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  const { data } = await workerflowApi.get('/runtime/status');
  return data;
}

export async function getRuntimeLogs(
  filters?: RuntimeLogFilters,
): Promise<ExecutionLogEntry[]> {
  const params = filters
    ? Object.fromEntries(
        Object.entries(filters).filter(([, value]) => Boolean(value)),
      )
    : undefined;
  const { data } = await workerflowApi.get('/runtime/logs', { params });
  return data;
}

export async function getSystemSummary(): Promise<SystemSummary> {
  const { data } = await workerflowApi.get('/system/summary');
  return data;
}

export async function startWorker(
  tenant: string,
  env: string,
  workerName: string,
): Promise<WorkerRuntimeStatus> {
  const { data } = await workerflowApi.post(
    `/${tenant}/${env}/runtime/${workerName}/start`,
  );
  return data;
}

export async function stopWorker(
  tenant: string,
  env: string,
  workerName: string,
): Promise<WorkerRuntimeStatus> {
  const { data } = await workerflowApi.post(
    `/${tenant}/${env}/runtime/${workerName}/stop`,
  );
  return data;
}
