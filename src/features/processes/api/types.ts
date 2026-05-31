import type { VariablesMap } from '@/shared/api/types';

export type ProcessDefinition = {
  id: string;
  key: string;
  name: string | null;
  version: number;
  resource: string;
  deploymentId: string;
  tenantId: string | null;
  suspended: boolean;
  versionTag: string | null;
  historyTimeToLive: number | null;
  category: string | null;
  description: string | null;
};

export type ProcessDefinitionStatistics = {
  id: string;
  instances: number;
  failedJobs: number;
  incidents: Array<{ incidentType: string; incidentCount: number }>;
  definition: ProcessDefinition;
};

export type ProcessInstance = {
  id: string;
  definitionId: string;
  businessKey: string | null;
  caseInstanceId: string | null;
  ended: boolean;
  suspended: boolean;
  tenantId: string | null;
};

export type StartProcessBody = {
  variables?: VariablesMap;
  businessKey?: string;
};

/**
 * Per-activity statistics returned by GET /process-definition/{id}/statistics
 */
export type ActivityStatistics = {
  id: string;
  instances: number;
  failedJobs: number;
  incidents: Array<{ incidentType: string; incidentCount: number }>;
};

/**
 * Called process definition info
 */
export type CalledProcessDefinition = {
  id: string;
  key: string;
  name: string | null;
  version: number;
  calledFromActivityIds: string[];
};
