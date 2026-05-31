export type Incident = {
  id: string;
  processDefinitionId: string;
  processInstanceId: string;
  executionId: string;
  incidentTimestamp: string;
  incidentType: string;
  activityId: string;
  causeIncidentId: string;
  rootCauseIncidentId: string;
  configuration: string;
  tenantId: string | null;
  jobDefinitionId: string | null;
  incidentMessage: string | null;
  annotation: string | null;
};
