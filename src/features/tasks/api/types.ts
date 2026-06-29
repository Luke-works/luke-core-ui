/**
 * A Camunda task attachment (ACT_HI_ATTACHMENT, URL_ mode). Luke mirrors documents here with the
 * classification baked into `type`: `luke-task-attachment` (bound to this task) vs
 * `luke-process-attachment` (case-level). `url` points at the engine's authZ'd content stream
 * (/api/documents/{docId}/content) — bytes are never stored in Camunda.
 */
export type Attachment = {
  id: string;
  name: string | null;
  type: string | null;
  description: string | null;
  taskId: string | null;
  processInstanceId?: string | null;
  createTime?: string | null;
  removable?: boolean;
  url: string | null;
};

export type Task = {
  id: string;
  name: string;
  assignee: string | null;
  created: string;
  due: string | null;
  followUp: string | null;
  delegationState: string | null;
  description: string | null;
  executionId: string;
  parentTaskId: string | null;
  priority: number;
  processDefinitionId: string;
  processInstanceId: string;
  taskDefinitionKey: string;
  caseExecutionId: string | null;
  caseInstanceId: string | null;
  caseDefinitionId: string | null;
  suspended: boolean;
  tenantId: string | null;
  formKey: string | null;
  camundaFormRef: object | null;
};
