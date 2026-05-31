import { api } from '@/shared/api/client';

export type DecisionDefinition = {
  id: string;
  key: string;
  name: string | null;
  version: number;
  resource: string;
  deploymentId: string;
  tenantId: string | null;
  decisionRequirementsDefinitionId: string | null;
  decisionRequirementsDefinitionKey: string | null;
  historyTimeToLive: number | null;
  versionTag: string | null;
};

export async function getDecisionDefinitions(
  params?: Record<string, any>,
): Promise<DecisionDefinition[]> {
  const { data } = await api.get('/decision-definition', { params });
  return data;
}

export async function getDecisionDefinitionXml(
  id: string,
): Promise<{ id: string; dmnXml: string }> {
  const { data } = await api.get(`/decision-definition/${id}/xml`);
  return data;
}

export async function getDecisionDefinitionById(
  id: string,
): Promise<DecisionDefinition> {
  const { data } = await api.get(`/decision-definition/${id}`);
  return data;
}

/* ── Historic Decision Instances ─────────────────────────── */

export type HistoricDecisionInstance = {
  id: string;
  decisionDefinitionId: string;
  decisionDefinitionKey: string;
  decisionDefinitionName: string | null;
  evaluationTime: string;
  processDefinitionId: string | null;
  processDefinitionKey: string | null;
  processInstanceId: string | null;
  activityId: string | null;
  activityInstanceId: string | null;
  tenantId: string | null;
  userId: string | null;
  inputs: DecisionInstanceInput[];
  outputs: DecisionInstanceOutput[];
  collectResultValue: number | null;
  rootDecisionInstanceId: string | null;
  rootProcessInstanceId: string | null;
};

export type DecisionInstanceInput = {
  id: string;
  clauseId: string;
  clauseName: string | null;
  type: string;
  value: any;
};

export type DecisionInstanceOutput = {
  id: string;
  clauseId: string;
  clauseName: string | null;
  ruleId: string;
  ruleOrder: number;
  variableName: string;
  type: string;
  value: any;
};

export async function getHistoricDecisionInstances(
  params?: Record<string, any>,
): Promise<HistoricDecisionInstance[]> {
  const { data } = await api.get('/history/decision-instance', {
    params: { ...params, includeInputs: true, includeOutputs: true },
  });
  return data;
}

export async function getHistoricDecisionInstanceById(
  id: string,
): Promise<HistoricDecisionInstance> {
  const { data } = await api.get(`/history/decision-instance/${id}`, {
    params: { includeInputs: true, includeOutputs: true },
  });
  return data;
}
