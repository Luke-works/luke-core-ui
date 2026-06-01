/**
 * Types mirroring the WorkerFlow backend runtime models
 * (com.workerflow.model.*). Ported from the standalone WorkerFlow UI.
 */

export interface ExecutionStats {
  fetched: number;
  completed: number;
  failed: number;
  bpmnErrors: number;
}

export interface WorkerRuntimeStatus {
  tenantId: string;
  environment: string;
  workerName: string;
  topicName: string;
  status: 'RUNNING' | 'STOPPED' | string;
  enabled: boolean;
  currentFetchActivity: boolean;
  startedAt?: string;
  stoppedAt?: string;
  lastPollAt?: string;
  lastMessage?: string;
  stats: ExecutionStats;
}

export interface RuntimeStatus {
  timestamp: string;
  health: string;
  totalWorkers: number;
  runningWorkers: number;
  stoppedWorkers: number;
  failedExecutions: number;
  workers: WorkerRuntimeStatus[];
}

export interface ExecutionLogEntry {
  timestamp: string;
  tenantId: string;
  environment: string;
  workerName: string;
  topicName: string;
  processInstanceId?: string;
  businessKey?: string;
  externalTaskId?: string;
  status: string;
  duration: number;
  message?: string;
}

export interface SystemSummary {
  timestamp: string;
  productName: string;
  configRoot: string;
  totalTenants: number;
  totalWorkers: number;
  runningWorkers: number;
  stoppedWorkers: number;
  failedExecutions: number;
  camundaConnections: number;
  runtimeHealth: string;
}

export interface RuntimeLogFilters {
  tenantId?: string;
  workerName?: string;
  topicName?: string;
  status?: string;
  processInstanceId?: string;
  externalTaskId?: string;
  search?: string;
}
