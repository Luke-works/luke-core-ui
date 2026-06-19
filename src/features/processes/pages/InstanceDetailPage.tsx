import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Trash2, RotateCcw, X, RefreshCw, AlertTriangle, Route, Pencil, Workflow, Hash, Key, GitBranch, FileText, Type, Building2, GitMerge, CircleDot, ChevronDown, ChevronRight, Braces, ClipboardList, BoltIcon, Settings2, ScrollText, FileCode } from 'lucide-react';
import { toast } from 'sonner';

import { useSidebarLock } from '@/shared/hooks/useSidebarLock';
import BpmnViewer, { type ActivityState } from '@/shared/bpmn/BpmnViewer';
import Tabs from '@/shared/ui/Tabs';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import StackTraceModal from '@/shared/ui/StackTraceModal';


import CopyId from '@/shared/ui/CopyId';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { isForeignTenant } from '@/shared/utils/tenantGuard';
import Skeleton from '@/shared/ui/Skeleton';
import VariableRenderer from '@/shared/ui/VariableRenderer';
import {
  getProcessInstanceById,
  getProcessDefinitionById,
  getProcessDefinitionXml,
  getProcessInstanceVariables,
  updateProcessVariable,
  deleteProcessVariable,
  deleteProcessInstance,
  suspendProcessInstance,
  modifyProcessInstance,
} from '@/features/processes/api/endpoints';
import { getHistoricActivityInstances, getHistoricProcessInstanceById, getHistoricVariableInstances } from '@/features/history/api/endpoints';
import { getIncidents, deleteIncident } from '@/features/incidents/api/endpoints';
import { getTasks } from '@/features/tasks/api/endpoints';
import { getJobs, retryJob, setJobDueDate } from '@/features/jobs/api/endpoints';
import type { Incident } from '@/features/incidents/api/types';
import type { Job } from '@/features/jobs/api/types';
import type { Task } from '@/features/tasks/api/types';
import type { HistoricActivityInstance } from '@/features/history/api/types';
import type { CamundaVariable } from '@/shared/api/types';
import { relativeTime, absoluteTime, formatDuration } from '@/shared/utils/date';

/* ── Helpers ─────────────────────────────────────────────────── */

const VARIABLE_TYPES = [
  'String', 'Integer', 'Long', 'Double', 'Boolean',
  'Json', 'Object', 'Date', 'Short', 'Bytes', 'Null',
  'File', 'Xml',
] as const;

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function InstanceDetailPage() {
  const { id: instanceId } = useParams<{ id: string }>();
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('variables');
  const [showAddVarModal, setShowAddVarModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [panelHeight, setPanelHeight] = useState(320);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stacktraceJobId, setStacktraceJobId] = useState<string | null>(null);

  // Search & pagination state for each tab
  const [varSearch, setVarSearch] = useState('');
  const [varPage, setVarPage] = useState(0);
  const [incSearch, setIncSearch] = useState('');
  const [incPage, setIncPage] = useState(0);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(0);
  const [jobSearch, setJobSearch] = useState('');
  const [jobPage, setJobPage] = useState(0);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const panelHeightRef = useRef(320);
  const isDragging = useRef(false);
  const lastY = useRef(0);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastY.current = e.clientY;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - lastY.current;
      lastY.current = ev.clientY;
      panelHeightRef.current = Math.max(100, Math.min(600, panelHeightRef.current - delta));
      setPanelHeight(panelHeightRef.current);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);
  useSidebarLock();

  /* ── Instance (historic — works for both running and completed) */

  const { data: historicInstance, isLoading: instanceLoading } = useQuery({
    queryKey: ['historicProcessInstance', instanceId],
    queryFn: () => getHistoricProcessInstanceById(instanceId!),
    enabled: !!instanceId,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Runtime instance — only for running instances (suspend/terminate ops)
  const { data: runtimeInstance } = useQuery({
    queryKey: ['processInstance', instanceId],
    queryFn: () => getProcessInstanceById(instanceId!),
    enabled: !!instanceId && !!historicInstance && !historicInstance.endTime,
    retry: false,
  });

  // Merged instance view
  const instance = historicInstance ? {
    id: historicInstance.id,
    definitionId: historicInstance.processDefinitionId,
    businessKey: historicInstance.businessKey,
    tenantId: historicInstance.tenantId,
    ended: !!historicInstance.endTime,
    suspended: runtimeInstance?.suspended ?? historicInstance.state === 'SUSPENDED',
    state: historicInstance.state,
    startTime: historicInstance.startTime,
    endTime: historicInstance.endTime,
    durationInMillis: historicInstance.durationInMillis,
  } : null;

  /* ── Definition ────────────────────────────────────────────── */

  const { data: definition } = useQuery({
    queryKey: ['processDefinition', instance?.definitionId],
    queryFn: () => getProcessDefinitionById(instance!.definitionId),
    enabled: !!instance?.definitionId,
  });

  /* ── BPMN XML ──────────────────────────────────────────────── */

  const { data: xmlData } = useQuery({
    queryKey: ['processDefinitionXml', instance?.definitionId],
    queryFn: () => getProcessDefinitionXml(instance!.definitionId),
    enabled: !!instance?.definitionId,
  });

  /* ── Variables (runtime for running, historic for completed) ─ */

  const isRunning = !!instance && !instance.ended;

  const { data: runtimeVars, isLoading: runtimeVarsLoading } = useQuery({
    queryKey: ['processInstanceVariables', instanceId],
    queryFn: () => getProcessInstanceVariables(instanceId!),
    enabled: !!instanceId && isRunning,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: historicVars, isLoading: historicVarsLoading } = useQuery({
    queryKey: ['historicVariableInstances', instanceId],
    queryFn: async () => {
      const list = await getHistoricVariableInstances({ processInstanceId: instanceId });
      const map: Record<string, { value: any; type: string; valueInfo: Record<string, any> }> = {};
      for (const v of list) {
        map[v.name] = { value: v.value, type: v.type, valueInfo: {} };
      }
      return map;
    },
    enabled: !!instanceId && !isRunning,
  });

  const variables = isRunning ? runtimeVars : historicVars;
  const varsLoading = isRunning ? runtimeVarsLoading : historicVarsLoading;

  /* ── Incidents ─────────────────────────────────────────────── */

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', { processInstanceId: instanceId }],
    queryFn: () => getIncidents({ processInstanceId: instanceId, sortBy: 'incidentTimestamp', sortOrder: 'desc' }),
    enabled: !!instanceId,
  });

  const incidentOverlays = useMemo(() => {
    if (!incidents || incidents.length === 0) return undefined;
    const map: Record<string, { id: string; incidentType: string; incidentMessage?: string | null }[]> = {};
    for (const inc of incidents) {
      if (!map[inc.activityId]) map[inc.activityId] = [];
      map[inc.activityId].push({ id: inc.id, incidentType: inc.incidentType, incidentMessage: inc.incidentMessage });
    }
    return map;
  }, [incidents]);

  /* ── User Tasks ────────────────────────────────────────────── */

  const { data: userTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', { processInstanceId: instanceId }],
    queryFn: () => getTasks({ processInstanceId: instanceId }),
    enabled: !!instanceId,
  });

  /* ── Jobs ───────────────────────────────────────────────────── */

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', { processInstanceId: instanceId }],
    queryFn: () => getJobs({ processInstanceId: instanceId }),
    enabled: !!instanceId,
  });

  /* ── Audit Log ─────────────────────────────────────────────── */

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['historicActivityInstances', instanceId],
    queryFn: () => getHistoricActivityInstances({ processInstanceId: instanceId, sortBy: 'startTime', sortOrder: 'asc' }),
    enabled: !!instanceId,
  });

  /* ── Activity states (green=completed, orange=in-progress) ── */

  const activityStates = useMemo(() => {
    if (!activities || activities.length === 0) return undefined;
    const map: Record<string, ActivityState> = {};
    for (const a of activities) {
      // Skip process-level pseudo-activities
      if (a.activityType === 'processDefinition' || a.activityType === 'multiInstanceBody') continue;
      if (a.endTime) {
        // Only mark completed if not already marked in-progress by another instance
        if (map[a.activityId] !== 'in-progress') {
          map[a.activityId] = 'completed';
        }
      } else {
        // Still running — always wins over completed
        map[a.activityId] = 'in-progress';
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [activities]);

  /* ── Execution counts per activity (from audit log) ────────── */

  const executionCounts = useMemo(() => {
    if (!activities || activities.length === 0) return undefined;
    const counts: Record<string, number> = {};
    for (const a of activities) {
      if (a.activityType === 'processDefinition' || a.activityType === 'multiInstanceBody') continue;
      // Only count completed executions (tasks that actually ran)
      if (a.endTime) {
        counts[a.activityId] = (counts[a.activityId] || 0) + 1;
      }
    }
    return Object.keys(counts).length > 0 ? counts : undefined;
  }, [activities]);

  /* ── Mutations ─────────────────────────────────────────────── */

  const terminateMutation = useMutation({
    mutationFn: () => deleteProcessInstance(instanceId!),
    onSuccess: () => { toast.success('Process instance terminated'); navigate('/processes'); },
    onError: () => toast.error('Failed to terminate instance'),
  });

  const suspendMutation = useMutation({
    mutationFn: (suspended: boolean) => suspendProcessInstance(instanceId!, suspended),
    onSuccess: (_, suspended) => {
      toast.success(suspended ? 'Instance suspended' : 'Instance activated');
      queryClient.invalidateQueries({ queryKey: ['processInstance', instanceId] });
    },
    onError: () => toast.error('Failed to update instance suspension'),
  });

  const updateVarMutation = useMutation({
    mutationFn: ({ name, value, type }: { name: string; value: any; type: string }) =>
      updateProcessVariable(instanceId!, name, { value, type }),
    onSuccess: () => { toast.success('Variable updated'); queryClient.invalidateQueries({ queryKey: ['processInstanceVariables', instanceId] }); },
    onError: () => toast.error('Failed to update variable'),
  });

  const deleteVarMutation = useMutation({
    mutationFn: (name: string) => deleteProcessVariable(instanceId!, name),
    onSuccess: () => { toast.success('Variable deleted'); queryClient.invalidateQueries({ queryKey: ['processInstanceVariables', instanceId] }); },
    onError: () => toast.error('Failed to delete variable'),
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onSuccess: () => { toast.success('Job retry triggered'); queryClient.invalidateQueries({ queryKey: ['incidents'] }); },
    onError: () => toast.error('Failed to retry job'),
  });

  const updateJobDueDateMutation = useMutation({
    mutationFn: ({ jobId, duedate }: { jobId: string; duedate: string | null }) => setJobDueDate(jobId, duedate),
    onSuccess: () => { toast.success('Job due date updated'); queryClient.invalidateQueries({ queryKey: ['jobs'] }); },
    onError: () => toast.error('Failed to update job due date'),
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: (incidentId: string) => deleteIncident(incidentId),
    onSuccess: () => { toast.success('Incident resolved'); queryClient.invalidateQueries({ queryKey: ['incidents'] }); },
    onError: () => toast.error('Failed to resolve incident'),
  });

  const retryAllJobsMutation = useMutation({
    mutationFn: async () => {
      const failedJobs = (jobs ?? []).filter((j) => j.exceptionMessage);
      await Promise.all(failedJobs.map((j) => retryJob(j.id)));
    },
    onSuccess: () => {
      toast.success('All failed jobs retried');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: () => toast.error('Failed to retry jobs'),
  });

  const retryAllIncidentsMutation = useMutation({
    mutationFn: async () => {
      const incidentList = incidents ?? [];
      await Promise.all(
        incidentList
          .filter((inc) => inc.configuration)
          .map((inc) => retryJob(inc.configuration)),
      );
    },
    onSuccess: () => {
      toast.success('All incident jobs retried');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error('Failed to retry incident jobs'),
  });

  const modifyMutation = useMutation({
    mutationFn: (body: { instructions: Array<{ type: 'startBeforeActivity' | 'cancel'; activityId?: string; activityInstanceId?: string }>; annotation?: string }) =>
      modifyProcessInstance(instanceId!, body),
    onSuccess: () => {
      toast.success('Process instance modified');
      queryClient.invalidateQueries({ queryKey: ['processInstance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['processInstanceVariables', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['historicActivityInstances', instanceId] });
    },
    onError: () => toast.error('Failed to modify process instance'),
  });

  const handleTerminate = useCallback(() => {
    if (window.confirm('Are you sure you want to terminate this process instance? This action cannot be undone.')) {
      terminateMutation.mutate();
    }
  }, [terminateMutation]);

  /* ── Tab config ────────────────────────────────────────────── */

  const tabs = useMemo(
    () => [
      { id: 'variables', label: 'Variables', icon: Braces },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { id: 'userTasks', label: 'User Tasks', icon: ClipboardList },
      { id: 'jobs', label: 'Jobs', icon: BoltIcon },
      { id: 'modify', label: 'Modify', icon: Settings2 },
      { id: 'auditLog', label: 'Audit Log', icon: ScrollText },
    ],
    [],
  );

  /* ── Loading ───────────────────────────────────────────────── */

  if (instanceLoading || !instance) {
    return (
      <div>
        <Skeleton width="60%" height="1.5rem" />
        <Skeleton height="44px" className="mt-2" />
        <Skeleton height="420px" className="mt-2" />
      </div>
    );
  }

  // #47: a by-id read can return an instance from another tenant (admin auth sees
  // all). Refuse to display it under the wrong active tenant.
  if (isForeignTenant(instance.tenantId, activeTenantId)) {
    return (
      <div className="p-10 text-center" style={{ color: 'var(--text-secondary)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Not in this tenant
        </h2>
        <p className="mt-2 text-sm">
          This process instance belongs to a different tenant. Switch tenants to view it.
        </p>
      </div>
    );
  }

  const defName = definition?.name ?? definition?.key ?? instance.definitionId;
  const stateLabel = instance.ended ? 'COMPLETED' : instance.suspended ? 'SUSPENDED' : 'ACTIVE';
  const hasFailedJobs = (jobs ?? []).some((j) => j.exceptionMessage);
  const failedJobCount = (jobs ?? []).filter((j) => j.exceptionMessage).length;
  const hasIncidents = (incidents ?? []).length > 0;

  /* ── Render ────────────────────────────────────────────────── */

  const shortId = instance.id.length > 12 ? `${instance.id.slice(0, 8)}...` : instance.id;

  const detailItems: { label: string; value: string; icon: typeof Hash; muted?: boolean; accent?: string; onClick?: () => void }[] = [
    { label: 'Instance ID', value: instance.id, icon: Hash },
    { label: 'Business Key', value: instance.businessKey ?? 'null', icon: Key, muted: !instance.businessKey },
    { label: 'Definition Version', value: String(definition?.version ?? ''), icon: GitBranch },
    { label: 'Definition ID', value: instance.definitionId, icon: FileText },
    { label: 'Definition Key', value: definition?.key ?? '', icon: Key, onClick: () => navigate(`/processes/${instance.definitionId}`) },
    { label: 'Definition Name', value: definition?.name ?? definition?.key ?? '', icon: Type },
    { label: 'Tenant ID', value: instance.tenantId ?? 'null', icon: Building2, muted: !instance.tenantId },
    { label: 'Super Process Instance ID', value: historicInstance?.superProcessInstanceId ?? 'null', icon: GitMerge, muted: !historicInstance?.superProcessInstanceId },
    { label: 'State', value: stateLabel, icon: CircleDot, accent: stateLabel === 'ACTIVE' ? 'green' : stateLabel === 'SUSPENDED' ? 'amber' : undefined },
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between shrink-0 px-2 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/processes')}>
            Processes
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate(`/processes/${instance.definitionId}`)}>
            {defName}
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="font-mono-id" style={{ color: 'var(--text-primary)' }} title={instance.id}>{shortId}</span>
        </div>

        {/* Center: diagram controls */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowRoutes((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: showRoutes ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-elevated)',
              color: showRoutes ? 'var(--accent-green)' : 'var(--text-secondary)',
              border: `1px solid ${showRoutes ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
            }}>
            <Route size={13} />
            Routes {showRoutes ? 'ON' : 'OFF'}
          </button>
          <button type="button" onClick={() => setAutoRefresh((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: autoRefresh ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-elevated)',
              color: autoRefresh ? 'var(--accent-green)' : 'var(--text-secondary)',
              border: `1px solid ${autoRefresh ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
            }}>
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} style={autoRefresh ? { animationDuration: '2s' } : undefined} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"
            onClick={() => suspendMutation.mutate(!instance.suspended)}
            disabled={suspendMutation.isPending || instance.ended}>
            {instance.suspended
              ? <span className="inline-flex items-center gap-1"><Play size={13} /> Activate</span>
              : <span className="inline-flex items-center gap-1"><Pause size={13} /> Suspend</span>}
          </Button>
          <Button variant="danger" size="sm"
            onClick={handleTerminate}
            disabled={terminateMutation.isPending || instance.ended}>
            <span className="inline-flex items-center gap-1"><Trash2 size={13} /> Cancel Instance</span>
          </Button>
          {hasFailedJobs && (
            <Button variant="secondary" size="sm"
              onClick={() => retryAllJobsMutation.mutate()}
              disabled={retryAllJobsMutation.isPending}>
              <span className="inline-flex items-center gap-1"><RotateCcw size={13} /> Retry Jobs ({failedJobCount})</span>
            </Button>
          )}
          {hasIncidents && (
            <Button variant="secondary" size="sm"
              onClick={() => retryAllIncidentsMutation.mutate()}
              disabled={retryAllIncidentsMutation.isPending}>
              <span className="inline-flex items-center gap-1"><RotateCcw size={13} /> Retry Incidents ({(incidents ?? []).length})</span>
            </Button>
          )}
          {isRunning && (
            <Button variant="secondary" size="sm" onClick={() => setShowAddVarModal(true)}>
              + Add Variable
            </Button>
          )}
        </div>
      </div>

      {/* ── Diagram area with floating widget ───────────────────── */}
      <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>
        {/* BPMN Diagram — fills entire area */}
        {xmlData?.bpmn20Xml ? (
          <BpmnViewer xml={xmlData.bpmn20Xml} height="100%"
            tokens={executionCounts}
            incidents={incidentOverlays} activityStates={activityStates}
            showRoutes={showRoutes}
            onAddVariable={() => setShowAddVarModal(true)}
            onElementClick={async (_elId, type, bo) => {
              if (type === 'bpmn:CallActivity' && bo?.calledElement && instanceId) {
                try {
                  const { api } = await import('@/shared/api/client');
                  // Find child process instances spawned by this call activity
                  const { data: children } = await api.get('/process-instance', {
                    params: { superProcessInstance: instanceId, maxResults: 10 },
                  });
                  if (children.length === 1) {
                    navigate(`/processes/instance/${children[0].id}`);
                  } else if (children.length > 1) {
                    // Multiple — find the one matching this activity
                    const match = children.find((c: any) => c.processDefinitionKey === bo.calledElement);
                    if (match) navigate(`/processes/instance/${match.id}`);
                    else navigate(`/processes/instance/${children[0].id}`);
                  } else {
                    // No running child — try historic
                    const { data: historic } = await api.get('/history/process-instance', {
                      params: { superProcessInstanceId: instanceId, maxResults: 10 },
                    });
                    if (historic.length > 0) {
                      const match = historic.find((h: any) => h.processDefinitionKey === bo.calledElement);
                      navigate(`/processes/instance/${(match ?? historic[0]).id}`);
                    } else {
                      // Fallback: go to the definition
                      const { data: defs } = await api.get('/process-definition', {
                        params: { key: bo.calledElement, latestVersion: true, maxResults: 1 },
                      });
                      if (defs.length > 0) navigate(`/processes/${defs[0].id}`);
                    }
                  }
                } catch { /* ignore */ }
              }
            }} />
        ) : (
          <Skeleton height="100%" />
        )}

        {/* Floating metadata widget */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: detailsOpen ? 300 : 'auto',
            zIndex: 20,
            backgroundColor: 'var(--bg-surface)',
            opacity: 0.97,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxHeight: 'calc(100% - 24px)',
            overflowY: 'auto',
          }}
        >
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none cursor-pointer text-left"
            style={{ color: 'var(--text-primary)' }}
          >
            {detailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Workflow size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold">Instance Details</span>
            {!detailsOpen && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="font-mono-id text-xs" style={{ color: 'var(--text-muted)' }} title={instance.id}>{shortId}</span>
                <Badge variant={stateLabel === 'ACTIVE' ? 'success' : stateLabel === 'SUSPENDED' ? 'warning' : 'muted'}>{stateLabel}</Badge>
              </span>
            )}
          </button>

          {/* Expanded detail items */}
          {detailsOpen && (
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              {detailItems.map((item) => {
                const Icon = item.icon;
                const isMuted = item.muted;
                const accentColor = item.accent === 'green' ? 'var(--accent-green)' : item.accent === 'amber' ? 'var(--accent-orange)' : undefined;
                return (
                  <div key={item.label} className="flex items-start gap-2 pt-2">
                    <Icon size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className="bg-transparent border-none p-0 cursor-pointer text-xs font-mono-id break-all text-left"
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          {item.value}
                        </button>
                      ) : (
                        <span
                          className="text-xs font-mono-id break-all"
                          style={{ color: accentColor ?? (isMuted ? 'var(--text-muted)' : 'var(--text-primary)'), fontStyle: isMuted ? 'italic' : undefined }}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab panel ───────────────────────────────────────────── */}
      <div
        className="shrink-0"
        style={{
          height: panelHeight,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Drag handle */}
        <div onMouseDown={startDrag} style={{ height: 8, backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }} title="Drag to resize">
          <div style={{width:40,height:4,borderRadius:2,backgroundColor:'var(--text-muted)',opacity:0.3}}></div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
          <div className="p-4 flex-1 overflow-y-auto">
            {activeTab === 'variables' && (
              <VariablesPanel
                variables={variables}
                isLoading={varsLoading}
                onUpdate={(name, value, type) => updateVarMutation.mutate({ name, value, type })}
                onDelete={(name) => deleteVarMutation.mutate(name)}
                search={varSearch} setSearch={setVarSearch}
                page={varPage} setPage={setVarPage}
              />
            )}

            {activeTab === 'incidents' && (
              <IncidentsPanel
                incidents={incidents}
                isLoading={incidentsLoading}
                onRetry={(inc) => { if (inc.configuration) retryJobMutation.mutate(inc.configuration); }}
                onResolve={(inc) => resolveIncidentMutation.mutate(inc.id)}
                onViewStacktrace={(inc) => { if (inc.configuration) setStacktraceJobId(inc.configuration); }}
                search={incSearch} setSearch={setIncSearch}
                page={incPage} setPage={setIncPage}
              />
            )}

            {activeTab === 'userTasks' && (
              <UserTasksPanel tasks={userTasks} isLoading={tasksLoading} onTaskClick={(taskId) => navigate(`/tasks?taskId=${taskId}`)}
                search={taskSearch} setSearch={setTaskSearch}
                page={taskPage} setPage={setTaskPage}
              />
            )}

            {activeTab === 'jobs' && (
              <JobsPanel jobs={jobs} isLoading={jobsLoading}
                onRetry={(jobId) => retryJobMutation.mutate(jobId)}
                onUpdateDueDate={(jobId, duedate) => updateJobDueDateMutation.mutate({ jobId, duedate })}
                search={jobSearch} setSearch={setJobSearch}
                page={jobPage} setPage={setJobPage}
              />
            )}

            {activeTab === 'modify' && (
              <ModifyPanel
                onModify={(instructions, annotation) => modifyMutation.mutate({ instructions, annotation })}
                isPending={modifyMutation.isPending}
                isEnded={!!instance.ended}
              />
            )}

            {activeTab === 'auditLog' && (
              <AuditLogPanel activities={activities} isLoading={activitiesLoading}
                search={auditSearch} setSearch={setAuditSearch}
                page={auditPage} setPage={setAuditPage}
              />
            )}
          </div>
        </Tabs>
      </div>

      {/* Add Variable Modal */}
      {showAddVarModal && (
        <AddVariableModal
          onSave={(name, value, type) => {
            updateVarMutation.mutate({ name, value, type });
            setShowAddVarModal(false);
          }}
          onClose={() => setShowAddVarModal(false)}
        />
      )}

      <StackTraceModal
        jobId={stacktraceJobId}
        onClose={() => setStacktraceJobId(null)}
      />
    </div>
  );
}

/* ================================================================== */
/*  Add Variable Modal                                                 */
/* ================================================================== */

function AddVariableModal({
  onSave,
  onClose,
}: {
  onSave: (name: string, value: any, type: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('String');
  const [rawValue, setRawValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let parsed: any = rawValue;
    switch (type) {
      case 'Boolean': parsed = rawValue === 'true'; break;
      case 'Integer': case 'Long': parsed = parseInt(rawValue, 10); break;
      case 'Double': parsed = parseFloat(rawValue); break;
      case 'Json': try { parsed = JSON.parse(rawValue); } catch { /* keep string */ } break;
    }
    onSave(name.trim(), parsed, type);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    width: '100%',
    outline: 'none',
    fontSize: '0.875rem',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative rounded-lg border shadow-xl w-full max-w-md mx-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add Variable</h2>
          <button
            className="rounded p-1 hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="variableName" style={inputStyle} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {VARIABLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Value</label>
            {type === 'Boolean' ? (
              <select value={rawValue || 'false'} onChange={(e) => setRawValue(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : type === 'Json' ? (
              <textarea value={rawValue} onChange={(e) => setRawValue(e.target.value)} rows={4} placeholder='{"key": "value"}' className="font-mono-id" style={{ ...inputStyle, resize: 'vertical' }} />
            ) : (
              <input type={type === 'Integer' || type === 'Long' || type === 'Double' ? 'number' : 'text'} value={rawValue} onChange={(e) => setRawValue(e.target.value)} placeholder="Enter value" style={inputStyle} />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={!name.trim()}>Create Variable</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ================================================================== */
/*  Audit Log Panel                                                    */
/* ================================================================== */

function AuditLogPanel({ activities, isLoading, search, setSearch, page, setPage }: {
  activities: HistoricActivityInstance[] | undefined; isLoading: boolean;
  search: string; setSearch: (s: string) => void; page: number; setPage: (fn: number | ((p: number) => number)) => void;
}) {
  const PAGE_SIZE = 10;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}</div>;
  if (!activities || activities.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No activity history available.</p>;

  const filtered = activities.filter(a => matchesSearch(a, search, ['activityId', 'activityName', 'activityType', 'startTime', 'endTime']));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['Activity ID', 'Activity Name', 'Type', 'Start Time', 'End Time', 'Duration'].map(h => (
              <th key={h} className="text-left text-xs font-bold py-2 px-3 whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((a) => {
            const isRunning = !a.endTime;
            const isCanceled = a.canceled;
            const rowColor = isRunning
              ? 'var(--accent-orange)'
              : isCanceled
                ? 'var(--accent-red)'
                : undefined;

            return (
              <tr key={a.id} className="hover:bg-elevated transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 px-3 font-mono-id text-xs" style={{ color: 'var(--text-secondary)' }}>{a.activityId}</td>
                <td className="py-2 px-3">
                  <span style={{ color: rowColor ?? 'var(--text-primary)' }}>{a.activityName || '—'}</span>
                </td>
                <td className="py-2 px-3">
                  <Badge variant={isRunning ? 'warning' : isCanceled ? 'danger' : 'muted'}>
                    {a.activityType.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}
                  </Badge>
                </td>
                <td className="py-2 px-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{absoluteTime(a.startTime)}</td>
                <td className="py-2 px-3 whitespace-nowrap" style={{ color: isRunning ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                  {a.endTime ? absoluteTime(a.endTime) : <span className="italic">Running</span>}
                </td>
                <td className="py-2 px-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {a.durationInMillis != null ? formatDuration(a.durationInMillis) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} results</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Variables Panel — table with Name, Type, Value, Scope, Created     */
/* ================================================================== */

function VariablesPanel({
  variables, isLoading, onUpdate, onDelete, search, setSearch, page, setPage,
}: {
  variables: Record<string, CamundaVariable> | undefined; isLoading: boolean;
  onUpdate: (name: string, value: any, type: string) => void; onDelete: (name: string) => void;
  search: string; setSearch: (s: string) => void; page: number; setPage: (fn: number | ((p: number) => number)) => void;
}) {
  const PAGE_SIZE = 10;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}</div>;
  const allEntries = variables ? Object.entries(variables) : [];
  if (allEntries.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No variables on this instance.</p>;

  const filtered = allEntries.filter(([name, variable]) =>
    matchesSearch({ name, type: variable.type, value: String(variable.value ?? '') }, search, ['name', 'type', 'value'])
  );
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['Name', 'Type', 'Value'].map(h => (
              <th key={h} className="text-left text-xs font-bold py-2 px-3" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
            ))}
            <th className="py-2 px-3" style={{ borderBottom: '2px solid var(--border)', width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {paginated.map(([name, variable]) => (
            <VariableRow key={name} name={name} variable={variable} onSave={(v, t) => onUpdate(name, v, t)} onDelete={() => onDelete(name)} />
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} results</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function VariableRow({ name, variable, onSave, onDelete }: { name: string; variable: CamundaVariable; onSave: (value: any, type: string) => void; onDelete: () => void }) {
  const { id: instanceId } = useParams<{ id: string }>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editType, setEditType] = useState(variable.type || 'String');
  const [editValue, setEditValue] = useState(() => serializeValue(variable.value, variable.type));
  const [viewTab, setViewTab] = useState<'serialized' | 'deserialized'>('deserialized');
  const isComplexType = ['Object', 'Json', 'Xml'].includes(editType);

  const handleOpenEdit = () => {
    setEditType(variable.type || 'String');
    setEditValue(serializeValue(variable.value, variable.type));
    setShowEditModal(true);
  };
  const handleSave = () => { onSave(parseValue(editValue, editType), editType); setShowEditModal(false); };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    width: '100%',
    outline: 'none',
  };

  return (
    <>
      <tr className="group hover:bg-elevated transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
        <td className="py-2.5 px-3"><span className="font-mono-id text-[13px]" style={{ color: 'var(--text-primary)' }}>{name}</span></td>
        <td className="py-2.5 px-3"><Badge variant="muted">{variable.type || 'Unknown'}</Badge></td>
        <td className="py-2.5 px-3">
          <div className="min-h-[1.25rem]">
            <VariableRenderer variable={variable} name={name} instanceId={instanceId} />
          </div>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 rounded cursor-pointer bg-transparent border-none transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Edit variable"
              onClick={handleOpenEdit}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Pencil size={13} />
            </button>
            <button className="p-1 rounded cursor-pointer bg-transparent border-none transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Delete variable"
              onClick={() => setShowDeleteModal(true)}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Edit Variable Modal ── */}
      {showEditModal && (
        <tr><td colSpan={4} className="p-0">
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEditModal(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Variable</h3>
                  <span className="text-xs font-mono-id" style={{ color: 'var(--text-muted)' }}>{name}</span>
                </div>
                <button className="p-1 rounded cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-muted)' }}
                  onClick={() => setShowEditModal(false)}><X size={18} /></button>
              </div>
              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select value={editType} onChange={e => setEditType(e.target.value)}
                    className="text-sm px-3 py-2 rounded-md outline-none cursor-pointer" style={inputStyle}>
                    {VARIABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Value</label>
                    {isComplexType && (
                      <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => setViewTab('deserialized')}
                          className="px-2.5 py-1 text-[10px] font-medium cursor-pointer border-none"
                          style={{
                            backgroundColor: viewTab === 'deserialized' ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                            color: viewTab === 'deserialized' ? '#fff' : 'var(--text-secondary)',
                          }}>Deserialized</button>
                        <button type="button" onClick={() => setViewTab('serialized')}
                          className="px-2.5 py-1 text-[10px] font-medium cursor-pointer border-none"
                          style={{
                            backgroundColor: viewTab === 'serialized' ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                            color: viewTab === 'serialized' ? '#fff' : 'var(--text-secondary)',
                          }}>Serialized</button>
                      </div>
                    )}
                  </div>
                  {editType === 'Boolean' ? (
                    <select value={editValue} onChange={e => setEditValue(e.target.value)}
                      className="text-sm px-3 py-2 rounded-md outline-none cursor-pointer" style={inputStyle}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : editType === 'Null' ? (
                    <div className="text-sm px-3 py-2 rounded-md" style={{ ...inputStyle, color: 'var(--text-muted)' }}>null</div>
                  ) : isComplexType ? (
                    <>
                      {viewTab === 'deserialized' ? (
                        <textarea value={(() => { const d = deserializeForDisplay(editValue, editType); return d ?? editValue; })()}
                          onChange={e => setEditValue(e.target.value)}
                          rows={8} className="w-full text-xs font-mono-id px-3 py-2 rounded-md outline-none resize-y" style={inputStyle}
                          onKeyDown={e => { if (e.key === 'Escape') setShowEditModal(false); }} />
                      ) : (
                        <textarea value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          rows={8} className="w-full text-xs font-mono-id px-3 py-2 rounded-md outline-none resize-y" style={inputStyle}
                          onKeyDown={e => { if (e.key === 'Escape') setShowEditModal(false); }} />
                      )}
                      {variable.valueInfo && Object.keys(variable.valueInfo).length > 0 && (
                        <div className="mt-2 px-3 py-2 rounded-md text-[11px]" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Value Info:</span>
                          <pre className="mt-1 font-mono-id whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {JSON.stringify(variable.valueInfo, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <input type={['Integer', 'Long', 'Short', 'Double'].includes(editType) ? 'number' : 'text'}
                      value={editValue} onChange={e => setEditValue(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-md outline-none" style={inputStyle} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowEditModal(false); }} />
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                <Button variant="secondary" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          </div>
        </td></tr>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <tr><td colSpan={4} className="p-0">
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDeleteModal(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm mx-4 rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Variable</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Are you sure you want to delete <strong className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{name}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => { setShowDeleteModal(false); onDelete(); }}>
                  <Trash2 size={13} className="mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

function serializeValue(value: any, type: string): string {
  if (value === null || value === undefined) return '';
  const t = (type || '').toLowerCase();
  if (t === 'boolean') return String(value);
  if (t === 'null') return 'null';
  if (t === 'json' || t === 'object' || t === 'xml') {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
  return String(value);
}

/** Try to pretty-print an object value (deserialized view) */
function deserializeForDisplay(value: any, type: string): string | null {
  const t = (type || '').toLowerCase();
  if (t !== 'object' && t !== 'json' && t !== 'xml') return null;
  if (value === null || value === undefined) return null;
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(obj, null, 2);
  } catch {
    return null;
  }
}

function parseValue(raw: string, type: string): any {
  switch (type) {
    case 'Boolean': return raw === 'true';
    case 'Integer': case 'Short': return parseInt(raw, 10);
    case 'Long': return parseInt(raw, 10);
    case 'Double': return parseFloat(raw);
    case 'Json': case 'Object': try { return JSON.parse(raw); } catch { return raw; }
    case 'Null': return null;
    case 'Date': return raw;
    default: return raw;
  }
}

/* ================================================================== */
/*  Incidents Panel                                                    */
/* ================================================================== */

function IncidentsPanel({ incidents, isLoading, onRetry, onResolve, onViewStacktrace, search, setSearch, page, setPage }: {
  incidents: Incident[] | undefined; isLoading: boolean; onRetry: (i: Incident) => void; onResolve: (i: Incident) => void;
  onViewStacktrace: (i: Incident) => void;
  search: string; setSearch: (s: string) => void; page: number; setPage: (fn: number | ((p: number) => number)) => void;
}) {
  const PAGE_SIZE = 10;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="4rem" />)}</div>;
  if (!incidents || incidents.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No incidents on this instance.</p>;

  const filtered = incidents.filter(inc => matchesSearch(inc, search, ['incidentType', 'incidentMessage', 'activityId']));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div className="space-y-3">
        {paginated.map((incident) => (
          <div key={incident.id} className="p-3 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="danger">{incident.incidentType}</Badge>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }} title={absoluteTime(incident.incidentTimestamp)}>{relativeTime(incident.incidentTimestamp)}</span>
                </div>
                {incident.incidentMessage && <p className="text-sm mt-1 break-words" style={{ color: 'var(--text-primary)' }}>{incident.incidentMessage}</p>}
                <p className="text-xs mt-1 font-mono-id" style={{ color: 'var(--text-muted)' }}>Activity: {incident.activityId}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {incident.configuration && (
                  <Button variant="secondary" size="sm" title="View stack trace" onClick={() => onViewStacktrace(incident)}>
                    <FileCode size={13} className="mr-1" />View
                  </Button>
                )}
                {incident.configuration && (
                  <Button variant="secondary" size="sm" title="Retry job" onClick={() => onRetry(incident)}>
                    <RotateCcw size={13} className="mr-1" />Retry
                  </Button>
                )}
                <Button variant="ghost" size="sm" title="Resolve incident" onClick={() => { if (window.confirm('Resolve this incident?')) onResolve(incident); }}>
                  <X size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} results</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  User Tasks Panel                                                   */
/* ================================================================== */

function UserTasksPanel({ tasks, isLoading, onTaskClick, search, setSearch, page, setPage }: {
  tasks: Task[] | undefined; isLoading: boolean; onTaskClick: (taskId: string) => void;
  search: string; setSearch: (s: string) => void; page: number; setPage: (fn: number | ((p: number) => number)) => void;
}) {
  const PAGE_SIZE = 10;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="3rem" />)}</div>;
  if (!tasks || tasks.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No active user tasks.</p>;

  const filtered = tasks.filter(t => matchesSearch(t, search, ['name', 'assignee', 'created', 'due']));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['Task Name', 'Assignee', 'Created', 'Due'].map(h => (
              <th key={h} className="text-left text-xs font-bold py-2 px-3" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((task) => (
            <tr key={task.id} className="hover:bg-elevated transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--border)' }} onClick={() => onTaskClick(task.id)}>
              <td className="py-2 px-3">
                <div>
                  <span className="font-medium" style={{ color: 'var(--accent-blue)' }}>{task.name}</span>
                  <div className="mt-0.5"><CopyId id={task.id} /></div>
                </div>
              </td>
              <td className="py-2 px-3">
                <span style={{ color: task.assignee ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: task.assignee ? 'normal' : 'italic' }}>
                  {task.assignee ?? 'Unassigned'}
                </span>
              </td>
              <td className="py-2 px-3">
                <span style={{ color: 'var(--text-secondary)' }} title={absoluteTime(task.created)}>{absoluteTime(task.created)}</span>
              </td>
              <td className="py-2 px-3">
                {task.due ? (
                  <span style={{ color: new Date(task.due) < new Date() ? 'var(--accent-red)' : 'var(--text-secondary)' }} title={absoluteTime(task.due)}>{absoluteTime(task.due)}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} results</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Jobs Panel                                                         */
/* ================================================================== */

function JobsPanel({ jobs, isLoading, onRetry, onUpdateDueDate, search, setSearch, page, setPage }: {
  jobs: Job[] | undefined;
  isLoading: boolean;
  onRetry: (jobId: string) => void;
  onUpdateDueDate: (jobId: string, duedate: string | null) => void;
  search: string; setSearch: (s: string) => void; page: number; setPage: (fn: number | ((p: number) => number)) => void;
}) {
  const PAGE_SIZE = 10;
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}</div>;
  if (!jobs || jobs.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No jobs for this instance.</p>;

  const filtered = jobs.filter(j => matchesSearch(j, search, ['activityId', 'jobDefinitionId', 'exceptionMessage', 'dueDate']));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['Job ID', 'Activity', 'Due Date', 'Retries', 'State', ''].map(h => (
              <th key={h} className="text-left text-xs font-bold py-2 px-3 whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((job) => (
            <tr key={job.id} className="hover:bg-elevated transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="py-2 px-3"><CopyId id={job.id} /></td>
              <td className="py-2 px-3 font-mono-id text-xs" style={{ color: 'var(--text-secondary)' }}>{job.failedActivityId ?? '—'}</td>
              <td className="py-2 px-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--text-secondary)' }}>{job.dueDate ? absoluteTime(job.dueDate) : '—'}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingJob(job); }}
                    className="p-0.5 rounded cursor-pointer bg-transparent border-none transition-colors hover:bg-elevated"
                    style={{ color: 'var(--text-muted)' }}
                    title="Edit due date"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </td>
              <td className="py-2 px-3">
                <span style={{ color: job.retries === 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{job.retries}</span>
              </td>
              <td className="py-2 px-3">
                {job.suspended ? (
                  <Badge variant="warning">Suspended</Badge>
                ) : job.exceptionMessage ? (
                  <span title={job.exceptionMessage}><Badge variant="danger">Failed</Badge></span>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </td>
              <td className="py-2 px-3">
                {job.exceptionMessage && (
                  <Button variant="secondary" size="sm" onClick={() => onRetry(job.id)} title="Retry job">
                    <RotateCcw size={13} className="mr-1" />Retry
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} results</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}
              className="px-2 py-1 text-xs rounded border cursor-pointer disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}

      {editingJob && (
        <EditDueDateModal
          job={editingJob}
          onSave={(duedate) => { onUpdateDueDate(editingJob.id, duedate); setEditingJob(null); }}
          onClose={() => setEditingJob(null)}
        />
      )}
    </>
  );
}

/* ── Edit Due Date Modal ─────────────────────────────────────── */

function EditDueDateModal({ job, onSave, onClose }: {
  job: Job;
  onSave: (duedate: string | null) => void;
  onClose: () => void;
}) {
  // Convert ISO date to datetime-local format for the input
  const toLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [value, setValue] = useState(toLocal(job.dueDate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Camunda 7 expects yyyy-MM-dd'T'HH:mm:ss.SSS+0000 format
    if (value) {
      const d = new Date(value);
      const pad = (n: number, len = 2) => String(n).padStart(len, '0');
      const offset = -d.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const absOff = Math.abs(offset);
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000${sign}${pad(Math.floor(absOff / 60))}${pad(absOff % 60)}`;
      onSave(formatted);
    } else {
      onSave(null);
    }
  };

  const modalInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    width: '100%',
    outline: 'none',
    fontSize: '0.875rem',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative rounded-lg border shadow-xl w-full max-w-sm mx-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Update Due Date</h2>
          <button className="rounded p-1 hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-secondary)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Job ID</label>
            <div className="text-sm font-mono-id" style={{ color: 'var(--text-muted)' }}><CopyId id={job.id} /></div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
            <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} style={modalInputStyle} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={!value}>Save</Button>
            <Button type="button" variant="secondary" onClick={() => setValue(toLocal(new Date().toISOString()))}>Now</Button>
            <Button type="button" variant="secondary" onClick={() => {
              const future = new Date();
              future.setHours(future.getHours() + 1);
              setValue(toLocal(future.toISOString()));
            }}>+1 Hour</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Modify Panel — move tokens between activities                      */
/* ================================================================== */

function ModifyPanel({
  onModify,
  isPending,
  isEnded,
}: {
  onModify: (instructions: Array<{ type: 'startBeforeActivity' | 'cancel'; activityId?: string; activityInstanceId?: string }>, annotation?: string) => void;
  isPending: boolean;
  isEnded: boolean;
}) {
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [annotation, setAnnotation] = useState('');

  const modInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    width: '100%',
    outline: 'none',
    fontSize: '0.875rem',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveFrom.trim() || !moveTo.trim()) return;
    const instructions: Array<{ type: 'startBeforeActivity' | 'cancel'; activityId?: string; activityInstanceId?: string }> = [
      { type: 'cancel', activityId: moveFrom.trim() },
      { type: 'startBeforeActivity', activityId: moveTo.trim() },
    ];
    onModify(instructions, annotation.trim() || undefined);
    setMoveFrom('');
    setMoveTo('');
    setAnnotation('');
  };

  if (isEnded) {
    return <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Cannot modify a completed process instance.</p>;
  }

  return (
    <div>
      {/* Warning */}
      <div className="flex items-start gap-2 p-3 rounded-md mb-4" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
        <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
          <strong>Use with extreme care.</strong> This form could be used to terminate a process inadvertently.
          Moving a token cancels the current activity and starts the target activity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Cancel Activity (move from)
          </label>
          <input type="text" value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)}
            placeholder="Activity ID to cancel (e.g. UserTask_1)" style={modInputStyle} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Start Before Activity (move to)
          </label>
          <input type="text" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}
            placeholder="Activity ID to start (e.g. ServiceTask_2)" style={modInputStyle} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Annotation (optional)
          </label>
          <input type="text" value={annotation} onChange={(e) => setAnnotation(e.target.value)}
            placeholder="Reason for modification" style={modInputStyle} />
        </div>

        <Button type="submit" variant="danger" disabled={isPending || !moveFrom.trim() || !moveTo.trim()}>
          {isPending ? 'Modifying...' : 'Execute Modification'}
        </Button>
      </form>
    </div>
  );
}

/* ================================================================== */
/*  Search helper                                                      */
/* ================================================================== */

function matchesSearch(item: any, search: string, keys: string[]): boolean {
  if (!search.trim()) return true;
  const lower = search.toLowerCase();
  return keys.some(key => {
    const val = item[key];
    if (val == null) return false;
    return String(val).toLowerCase().includes(lower);
  });
}

