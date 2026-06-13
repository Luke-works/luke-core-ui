import { api } from '@/shared/api/client';
import type { CountResult, VariablesMap } from '@/shared/api/types';
import type {
  ProcessDefinition,
  ProcessDefinitionStatistics,
  ProcessInstance,
  StartProcessBody,
  ActivityStatistics,
} from '@/features/processes/api/types';

/* ── Process Definitions ─────────────────────────────────── */

export async function getProcessDefinitions(
  params?: Record<string, any>,
): Promise<ProcessDefinition[]> {
  const { data } = await api.get('/process-definition', { params });
  return data;
}

export async function getProcessDefinitionById(
  id: string,
): Promise<ProcessDefinition> {
  const { data } = await api.get(`/process-definition/${id}`);
  return data;
}

export async function getProcessDefinitionXml(
  id: string,
): Promise<{ id: string; bpmn20Xml: string }> {
  const { data } = await api.get(`/process-definition/${id}/xml`);
  return data;
}

export async function getProcessDefinitionStatistics(): Promise<
  ProcessDefinitionStatistics[]
> {
  const { data } = await api.get('/process-definition/statistics', {
    params: { incidents: true, failedJobs: true },
  });
  return data;
}

/**
 * Get per-activity statistics for a single process definition.
 * Returns instance counts and incidents per BPMN element.
 * Camunda 7 REST: GET /process-definition/{id}/statistics
 */
export async function getActivityStatistics(
  definitionId: string,
): Promise<ActivityStatistics[]> {
  const { data } = await api.get(
    `/process-definition/${definitionId}/statistics`,
    { params: { incidents: true, failedJobs: true } },
  );
  return data;
}

/**
 * Get all versions of a process definition by key.
 * Camunda 7 REST: GET /process-definition?key={key}&sortBy=version&sortOrder=desc
 */
export async function getProcessDefinitionVersions(
  key: string,
): Promise<ProcessDefinition[]> {
  const { data } = await api.get('/process-definition', {
    params: { key, sortBy: 'version', sortOrder: 'desc' },
  });
  return data;
}

/* ── Process Instances ───────────────────────────────────── */

export async function startProcessInstance(
  id: string,
  body: StartProcessBody,
): Promise<ProcessInstance> {
  const { data } = await api.post(`/process-definition/${id}/start`, body);
  return data;
}

export async function getProcessInstances(
  params?: Record<string, any>,
): Promise<ProcessInstance[]> {
  const { data } = await api.get('/process-instance', { params });
  return data;
}

export async function getProcessInstanceById(
  id: string,
): Promise<ProcessInstance> {
  const { data } = await api.get(`/process-instance/${id}`);
  return data;
}

export async function getProcessInstanceVariables(
  id: string,
): Promise<VariablesMap> {
  // deserializeValues=false → JSON/Spin variables come back as their serialized
  // JSON string (e.g. {"name":"…"}), not the engine's deserialized SpinJsonNode
  // object ({"array":false,"nodeType":"OBJECT",…}). The inspect modal then shows
  // the real JSON in both the Serialized and Deserialized tabs.
  const { data } = await api.get(`/process-instance/${id}/variables`, {
    params: { deserializeValues: false },
  });
  return data;
}

/** Fetch a single variable with the engine DESERIALIZING it (for the Object
 *  "Deserialized" view — Java-serialized objects can't be parsed client-side). */
export async function getProcessVariableDeserialized(
  instanceId: string,
  varName: string,
): Promise<{ type: string; value: unknown; valueInfo?: Record<string, any> }> {
  const { data } = await api.get(
    `/process-instance/${instanceId}/variables/${varName}`,
    { params: { deserializeValues: true } },
  );
  return data;
}

export async function updateProcessVariable(
  instanceId: string,
  varName: string,
  body: { value: any; type: string },
): Promise<void> {
  const { data } = await api.put(
    `/process-instance/${instanceId}/variables/${varName}`,
    body,
  );
  return data;
}

export async function deleteProcessVariable(
  instanceId: string,
  varName: string,
): Promise<void> {
  const { data } = await api.delete(
    `/process-instance/${instanceId}/variables/${varName}`,
  );
  return data;
}

export async function suspendProcessInstance(
  id: string,
  suspended: boolean,
): Promise<void> {
  const { data } = await api.put(`/process-instance/${id}/suspended`, {
    suspended,
  });
  return data;
}

export async function deleteProcessInstance(id: string): Promise<void> {
  const { data } = await api.delete(`/process-instance/${id}`);
  return data;
}

export async function getProcessInstanceCount(
  params?: Record<string, any>,
): Promise<CountResult> {
  const { data } = await api.get('/process-instance/count', { params });
  return data;
}

/**
 * Get the activity instance tree for a running process instance.
 * Used for token overlays on the BPMN diagram.
 * Camunda 7 REST: GET /process-instance/{id}/activity-instances
 */
export async function getActivityInstances(
  instanceId: string,
): Promise<any> {
  const { data } = await api.get(
    `/process-instance/${instanceId}/activity-instances`,
  );
  return data;
}

/**
 * Modify a process instance by moving tokens between activities.
 * Camunda 7 REST: POST /process-instance/{id}/modification
 */
export async function modifyProcessInstance(
  instanceId: string,
  body: {
    instructions: Array<{
      type: 'startBeforeActivity' | 'startAfterActivity' | 'startTransition' | 'cancel';
      activityId?: string;
      activityInstanceId?: string;
      transitionId?: string;
    }>;
    annotation?: string;
  },
): Promise<void> {
  await api.post(`/process-instance/${instanceId}/modification`, body);
}
