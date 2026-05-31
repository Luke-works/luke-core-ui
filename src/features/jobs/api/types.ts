export type Job = {
  id: string;
  jobDefinitionId: string;
  processInstanceId: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  executionId: string;
  exceptionMessage: string | null;
  failedActivityId: string | null;
  retries: number;
  dueDate: string | null;
  suspended: boolean;
  priority: number;
  tenantId: string | null;
};

export type JobDefinition = {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  activityId: string;
  jobType: string;
  jobConfiguration: string;
  suspended: boolean;
  tenantId: string | null;
};
