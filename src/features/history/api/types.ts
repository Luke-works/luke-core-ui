export type HistoricProcessInstance = {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionName: string | null;
  businessKey: string | null;
  startTime: string;
  endTime: string | null;
  durationInMillis: number | null;
  startUserId: string | null;
  state: string;
  tenantId: string | null;
  superProcessInstanceId: string | null;
};

export type HistoricActivityInstance = {
  id: string;
  parentActivityInstanceId: string | null;
  activityId: string;
  activityName: string | null;
  activityType: string;
  processDefinitionId: string;
  processInstanceId: string;
  executionId: string;
  startTime: string;
  endTime: string | null;
  durationInMillis: number | null;
  canceled: boolean;
  taskId: string | null;
  assignee: string | null;
};

export type HistoricVariableInstance = {
  id: string;
  name: string;
  type: string;
  value: any;
  processDefinitionId: string;
  processInstanceId: string;
  activityInstanceId: string | null;
  tenantId: string | null;
};
