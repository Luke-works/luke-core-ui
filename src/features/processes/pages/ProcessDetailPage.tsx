import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Pause, Flame, ChevronDown, ChevronRight, Workflow, BoltIcon,
  FileText, GitBranch, Tag, Hash, Key, Type, Clock, Building2, Rocket, Activity,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSidebarLock } from '@/shared/hooks/useSidebarLock';
import BpmnViewer from '@/shared/bpmn/BpmnViewer';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Tabs from '@/shared/ui/Tabs';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import StatusBadge from '@/shared/ui/StatusBadge';
import CopyId from '@/shared/ui/CopyId';
import Skeleton from '@/shared/ui/Skeleton';
import type { DetailItem } from '@/shared/ui/DetailPanel';
import {
  getProcessDefinitionById,
  getProcessDefinitionXml,
  getProcessDefinitionVersions,
  getProcessInstanceCount,
  startProcessInstance,
  getActivityStatistics,
} from '@/features/processes/api/endpoints';
import {
  getHistoricProcessInstances,
  getHistoricProcessInstanceCount,
} from '@/features/history/api/endpoints';
import { getIncidents } from '@/features/incidents/api/endpoints';
import {
  getJobDefinitions,
  suspendJobDefinition,
} from '@/features/jobs/api/endpoints';
import type { HistoricProcessInstance } from '@/features/history/api/types';
import type { Incident } from '@/features/incidents/api/types';
import type { JobDefinition } from '@/features/jobs/api/types';
import { absoluteTime, formatDuration } from '@/shared/utils/date';

/* ── Input style ─────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.375rem 0.5rem',
  outline: 'none',
  fontSize: '0.8125rem',
};

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('instances');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  /* ── Search & pagination state ────────────────────────────── */
  const [instanceSearch, setInstanceSearch] = useState('');
  const [instancePage, setInstancePage] = useState(0);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentPage, setIncidentPage] = useState(0);
  const [jobDefSearch, setJobDefSearch] = useState('');
  const [jobDefPage, setJobDefPage] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [panelHeight, setPanelHeight] = useState(320);
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

  /* ── Definition ────────────────────────────────────────────── */

  const { data: definition, isLoading: defLoading } = useQuery({
    queryKey: ['processDefinition', id],
    queryFn: () => getProcessDefinitionById(id!),
    enabled: !!id,
  });

  const { data: allVersions } = useQuery({
    queryKey: ['processDefinitionVersions', definition?.key],
    queryFn: () => getProcessDefinitionVersions(definition!.key),
    enabled: !!definition?.key,
  });

  /* ── BPMN XML ──────────────────────────────────────────────── */

  const { data: xmlData } = useQuery({
    queryKey: ['processDefinitionXml', id],
    queryFn: () => getProcessDefinitionXml(id!),
    enabled: !!id,
  });

  /* ── Activity Statistics ───────────────────────────────────── */

  const { data: activityStats } = useQuery({
    queryKey: ['activityStatistics', id],
    queryFn: () => getActivityStatistics(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const tokenCounts = useMemo(() => {
    if (!activityStats || activityStats.length === 0) return undefined;
    const map: Record<string, number> = {};
    for (const stat of activityStats) {
      if (stat.instances > 0) map[stat.id] = stat.instances;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [activityStats]);

  const incidentOverlays = useMemo(() => {
    if (!activityStats) return undefined;
    const map: Record<string, { id: string; incidentType: string; incidentMessage?: string | null }[]> = {};
    for (const stat of activityStats) {
      if (stat.incidents && stat.incidents.length > 0) {
        map[stat.id] = stat.incidents.map((inc, idx) => ({
          id: `${stat.id}-${idx}`,
          incidentType: inc.incidentType,
          incidentMessage: `${inc.incidentCount} ${inc.incidentType} incident(s)`,
        }));
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [activityStats]);

  const heatmapData = useMemo(() => {
    if (!heatmapEnabled || !activityStats || activityStats.length === 0) return undefined;
    const maxCount = Math.max(...activityStats.map((s) => s.instances), 1);
    const map: Record<string, number> = {};
    for (const stat of activityStats) {
      if (stat.instances > 0) map[stat.id] = stat.instances / maxCount;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [activityStats, heatmapEnabled]);

  /* ── Running instances ─────────────────────────────────────── */

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['historicProcessInstances', { processDefinitionId: id, unfinished: true }],
    queryFn: () =>
      getHistoricProcessInstances({
        processDefinitionId: id,
        unfinished: true,
        sortBy: 'startTime',
        sortOrder: 'desc',
        maxResults: 50,
      }),
    enabled: !!id,
  });

  const { data: instanceCount } = useQuery({
    queryKey: ['processInstanceCount', { processDefinitionId: id }],
    queryFn: () => getProcessInstanceCount({ processDefinitionId: id }),
    enabled: !!id,
  });

  /* ── Incidents ─────────────────────────────────────────────── */

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', { processDefinitionId: id }],
    queryFn: () => getIncidents({ processDefinitionId: id, sortBy: 'incidentTimestamp', sortOrder: 'desc' }),
    enabled: !!id,
  });

  /* ── Job Definitions ───────────────────────────────────────── */

  const { data: jobDefinitions, isLoading: jobDefsLoading } = useQuery({
    queryKey: ['jobDefinitions', { processDefinitionId: id }],
    queryFn: () => getJobDefinitions({ processDefinitionId: id }),
    enabled: !!id,
  });

  /* ── History filters ───────────────────────────────────────── */

  const [historyFilters, setHistoryFilters] = useState({
    startedAfter: '',
    startedBefore: '',
    finishedAfter: '',
    finishedBefore: '',
    businessKey: '',
    state: '' as '' | 'completed' | 'active' | 'suspended',
  });
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 20;

  const historyParams = useMemo(() => {
    const p: Record<string, any> = {
      processDefinitionId: id,
      sortBy: 'startTime',
      sortOrder: 'desc',
      firstResult: historyPage * HISTORY_PAGE_SIZE,
      maxResults: HISTORY_PAGE_SIZE,
    };
    if (historyFilters.startedAfter) p.startedAfter = new Date(historyFilters.startedAfter).toISOString();
    if (historyFilters.startedBefore) p.startedBefore = new Date(historyFilters.startedBefore).toISOString();
    if (historyFilters.finishedAfter) p.finishedAfter = new Date(historyFilters.finishedAfter).toISOString();
    if (historyFilters.finishedBefore) p.finishedBefore = new Date(historyFilters.finishedBefore).toISOString();
    if (historyFilters.businessKey) p.processInstanceBusinessKey = historyFilters.businessKey;
    if (historyFilters.state === 'completed') p.finished = true;
    if (historyFilters.state === 'active') p.unfinished = true;
    if (historyFilters.state === 'suspended') { p.unfinished = true; p.suspended = true; }
    return p;
  }, [id, historyFilters, historyPage]);

  const { data: historyInstances, isLoading: historyLoading } = useQuery({
    queryKey: ['historyInstances', historyParams],
    queryFn: () => getHistoricProcessInstances(historyParams),
    enabled: !!id && activeTab === 'history',
  });

  const { data: historyCount } = useQuery({
    queryKey: ['historyCount', historyParams],
    queryFn: () => {
      const { firstResult, maxResults, sortBy, sortOrder, ...countParams } = historyParams;
      return getHistoricProcessInstanceCount(countParams);
    },
    enabled: !!id && activeTab === 'history',
  });

  /* ── Mutations ─────────────────────────────────────────────── */

  const startMutation = useMutation({
    mutationFn: () => {
      const businessKey = window.prompt('Business key (optional):');
      return startProcessInstance(id!, { businessKey: businessKey || undefined });
    },
    onSuccess: () => {
      toast.success('Process instance started');
      queryClient.invalidateQueries({ queryKey: ['processInstances'] });
      queryClient.invalidateQueries({ queryKey: ['historicProcessInstances'] });
      queryClient.invalidateQueries({ queryKey: ['processInstanceCount'] });
      queryClient.invalidateQueries({ queryKey: ['activityStatistics'] });
    },
    onError: () => toast.error('Failed to start process instance'),
  });

  const suspendJobDefMutation = useMutation({
    mutationFn: ({ defId, suspended }: { defId: string; suspended: boolean }) =>
      suspendJobDefinition(defId, suspended),
    onSuccess: (_, { suspended }) => {
      toast.success(suspended ? 'Job definition suspended' : 'Job definition activated');
      queryClient.invalidateQueries({ queryKey: ['jobDefinitions'] });
    },
    onError: () => toast.error('Failed to update job definition'),
  });

  const handleVersionChange = (newDefId: string) => {
    navigate(`/processes/${newDefId}`, { replace: true });
  };

  /* ── Tab config ────────────────────────────────────────────── */

  const tabs = useMemo(
    () => [
      { id: 'instances', label: 'Process Instances', icon: Workflow },
      { id: 'incidents', label: 'Incidents', icon: Flame },
      { id: 'jobDefinitions', label: 'Job Definitions', icon: BoltIcon },
      { id: 'history', label: 'History', icon: Clock },
    ],
    [],
  );

  /* ── Table columns ─────────────────────────────────────────── */

  const instanceColumns: ColumnDef<HistoricProcessInstance, any>[] = useMemo(
    () => [
      {
        id: 'state',
        header: 'State',
        cell: ({ row }) => (
          <StatusBadge status={row.original.state === 'ACTIVE' ? 'running' : row.original.state === 'SUSPENDED' ? 'suspended' : 'completed'} />
        ),
        size: 100,
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/processes/instance/${row.original.id}`); }}>
            <span className="text-sm font-mono-id">{row.original.id}</span>
          </button>
        ),
      },
      {
        accessorKey: 'startTime',
        header: 'Start Time',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{absoluteTime(row.original.startTime)}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'businessKey',
        header: 'Business Key',
        cell: ({ row }) =>
          row.original.businessKey
            ? <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{row.original.businessKey}</span>
            : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>,
      },
    ],
    [navigate],
  );

  const historyColumns: ColumnDef<HistoricProcessInstance, any>[] = useMemo(
    () => [
      {
        id: 'state',
        header: 'State',
        cell: ({ row }) => (
          <StatusBadge status={row.original.state === 'ACTIVE' ? 'running' : row.original.state === 'SUSPENDED' ? 'suspended' : row.original.state === 'INTERNALLY_TERMINATED' ? 'incident' : 'completed'} />
        ),
        size: 100,
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/processes/instance/${row.original.id}`); }}>
            <span className="text-sm font-mono-id">{row.original.id}</span>
          </button>
        ),
      },
      {
        accessorKey: 'startTime',
        header: 'Start Time',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{absoluteTime(row.original.startTime)}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'endTime',
        header: 'End Time',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap" style={{ color: row.original.endTime ? 'var(--text-secondary)' : 'var(--accent-orange)' }}>
            {row.original.endTime ? absoluteTime(row.original.endTime) : 'Running'}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: 'durationInMillis',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatDuration(row.original.durationInMillis)}</span>
        ),
        size: 100,
      },
      {
        accessorKey: 'businessKey',
        header: 'Business Key',
        cell: ({ row }) =>
          row.original.businessKey
            ? <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{row.original.businessKey}</span>
            : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>,
      },
    ],
    [navigate],
  );

  const incidentColumns: ColumnDef<Incident, any>[] = useMemo(
    () => [
      { accessorKey: 'incidentType', header: 'Type', cell: ({ row }) => <Badge variant="danger">{row.original.incidentType}</Badge>, size: 140 },
      { accessorKey: 'incidentMessage', header: 'Message', cell: ({ row }) => {
        const msg = row.original.incidentMessage;
        if (!msg) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return <span className="text-sm" style={{ color: 'var(--text-primary)' }} title={msg}>{msg.length > 100 ? msg.slice(0, 100) + '...' : msg}</span>;
      }},
      { accessorKey: 'processInstanceId', header: 'Process Instance', cell: ({ row }) => (
        <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}
          onClick={(e) => { e.stopPropagation(); navigate(`/processes/instance/${row.original.processInstanceId}`); }}>
          <CopyId id={row.original.processInstanceId} />
        </button>
      )},
      { accessorKey: 'activityId', header: 'Activity', cell: ({ row }) => <span className="font-mono-id text-xs" style={{ color: 'var(--text-secondary)' }}>{row.original.activityId}</span> },
      { accessorKey: 'incidentTimestamp', header: 'Timestamp', cell: ({ row }) => <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{absoluteTime(row.original.incidentTimestamp)}</span>, size: 160 },
    ],
    [navigate],
  );

  const jobDefColumns: ColumnDef<JobDefinition, any>[] = useMemo(
    () => [
      { id: 'state', header: 'State', cell: ({ row }) => <StatusBadge status={row.original.suspended ? 'suspended' : 'active'} />, size: 100 },
      { accessorKey: 'activityId', header: 'Activity ID', cell: ({ row }) => <span className="font-mono-id text-sm" style={{ color: 'var(--text-primary)' }}>{row.original.activityId}</span> },
      { accessorKey: 'jobType', header: 'Type', cell: ({ row }) => <Badge>{row.original.jobType}</Badge> },
      { accessorKey: 'jobConfiguration', header: 'Configuration', cell: ({ row }) => <span className="text-sm font-mono-id" style={{ color: 'var(--text-secondary)' }}>{row.original.jobConfiguration}</span> },
      { id: 'actions', header: '', enableSorting: false, size: 120, cell: ({ row }) => (
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); suspendJobDefMutation.mutate({ defId: row.original.id, suspended: !row.original.suspended }); }} disabled={suspendJobDefMutation.isPending}>
          {row.original.suspended
            ? <span className="inline-flex items-center gap-1"><Play size={12} /> Activate</span>
            : <span className="inline-flex items-center gap-1"><Pause size={12} /> Suspend</span>}
        </Button>
      )},
    ],
    [suspendJobDefMutation],
  );

  /* ── Loading ───────────────────────────────────────────────── */

  if (defLoading || !definition) {
    return (
      <div>
        <Skeleton width="40%" height="1.5rem" />
        <div className="mt-3">
          <Skeleton height="48px" />
        </div>
        <div className="mt-2">
          <Skeleton height="420px" />
        </div>
      </div>
    );
  }

  const displayName = definition.name ?? definition.key;
  const hasMultipleVersions = allVersions && allVersions.length > 1;

  /* ── Detail items (same data as old DetailPanel) ───────────── */

  const accentColors: Record<string, string> = {
    blue: 'var(--accent-blue)',
    green: 'var(--accent-green)',
    red: 'var(--accent-red)',
    amber: 'var(--accent-amber, #f59e0b)',
  };

  const detailItems: DetailItem[] = [
    {
      label: 'Definition Version',
      icon: GitBranch,
      value: hasMultipleVersions ? (
        <select
          value={id}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="text-[13px] rounded px-1 py-0.5 outline-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--accent-blue)',
            fontWeight: 600,
          }}
        >
          {allVersions!.map((v) => (
            <option key={v.id} value={v.id}>{v.version}</option>
          ))}
        </select>
      ) : String(definition.version),
    },
    {
      label: 'Version Tag',
      icon: Tag,
      value: definition.versionTag ?? 'null',
      muted: !definition.versionTag,
    },
    {
      label: 'Definition ID',
      icon: Hash,
      value: definition.id,
    },
    {
      label: 'Definition Key',
      icon: Key,
      value: definition.key,
    },
    {
      label: 'Definition Name',
      icon: Type,
      value: displayName,
    },
    {
      label: 'History Time To Live',
      icon: Clock,
      value: definition.historyTimeToLive != null ? `${definition.historyTimeToLive}` : 'null',
      muted: definition.historyTimeToLive == null,
    },
    {
      label: 'Tenant ID',
      icon: Building2,
      value: definition.tenantId ?? 'null',
      muted: !definition.tenantId,
    },
    {
      label: 'Deployment ID',
      icon: Rocket,
      value: definition.deploymentId,
      accent: 'blue',
      onClick: () => navigate(`/deployments/${definition.deploymentId}`),
    },
    {
      label: 'Instances Running',
      icon: Activity,
      value: `current version: ${instanceCount?.count ?? 0}`,
      accent: 'green',
    },
  ];

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>

      {/* ── Toolbar: breadcrumb left + actions right ────────────── */}
      <div
        className="flex items-center justify-between shrink-0 px-2 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/processes')}>Processes</button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{displayName} : Runtime</span>
        </div>
        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            <Play size={13} className="mr-1.5" />Start Instance
          </Button>
          <button type="button" onClick={() => setHeatmapEnabled((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: heatmapEnabled ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
              color: heatmapEnabled ? 'var(--accent-red)' : 'var(--text-secondary)',
              border: `1px solid ${heatmapEnabled ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
            }}>
            <Flame size={13} />Heatmap {heatmapEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* ── Diagram area (relative container for floating widget) ── */}
      <div className="flex-1 min-h-0 relative" style={{ overflow: 'hidden' }}>

        {/* BPMN fills everything */}
        {xmlData?.bpmn20Xml ? (
          <BpmnViewer xml={xmlData.bpmn20Xml} height="100%"
            tokens={heatmapEnabled ? undefined : tokenCounts}
            incidents={heatmapEnabled ? undefined : incidentOverlays}
            heatmap={heatmapData}
            onElementClick={async (_id, type, bo) => {
              if (type === 'bpmn:CallActivity' && bo?.calledElement) {
                try {
                  const { api } = await import('@/shared/api/client');
                  const { data: defs } = await api.get('/process-definition', {
                    params: { key: bo.calledElement, latestVersion: true, maxResults: 1 },
                  });
                  if (defs.length > 0) navigate(`/processes/${defs[0].id}`);
                  else toast.error(`Process "${bo.calledElement}" not found`);
                } catch { toast.error('Failed to resolve call activity'); }
              }
            }} />
        ) : <Skeleton height="100%" />}

        {/* ── Floating metadata widget — top-left ─────────────────── */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: detailsOpen ? 300 : 'auto',
          zIndex: 20,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          backdropFilter: 'blur(8px)',
          transition: 'width 200ms ease',
          maxHeight: 'calc(100% - 24px)',
          overflow: 'auto',
        }}>
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex items-center w-full px-3 py-2.5 cursor-pointer border-none"
            style={{ backgroundColor: 'transparent' }}
          >
            <span style={{ color: 'var(--text-muted)', marginRight: 8, display: 'flex' }}>
              {detailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              <FileText size={12} style={{ color: 'var(--accent-blue)' }} />
            </span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Definition Details
            </span>
            {!detailsOpen && (
              <>
                <span className="ml-2">
                  <Badge variant="info">v{definition.version}</Badge>
                </span>
                <span className="ml-2 text-[12px] font-mono-id" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {definition.key}
                </span>
              </>
            )}
          </button>

          {/* Expanded content */}
          {detailsOpen && (
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              {detailItems.map((item, idx) => {
                const Icon = item.icon;
                const color = item.accent ? accentColors[item.accent] : item.muted ? 'var(--text-muted)' : 'var(--text-primary)';
                const isClickable = !!item.onClick;

                return (
                  <div key={idx} className="min-w-0 pt-2">
                    {/* Label row */}
                    <div className="flex items-center gap-1.5">
                      {Icon && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            backgroundColor: 'var(--bg-elevated)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={11} style={{ color: 'var(--text-muted)' }} />
                        </span>
                      )}
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)', lineHeight: 1 }}
                      >
                        {item.label}
                      </span>
                    </div>
                    {/* Value */}
                    {typeof item.value === 'string' ? (
                      isClickable ? (
                        <button
                          type="button"
                          className="block text-[13px] bg-transparent border-none cursor-pointer p-0 max-w-full text-left break-all hover:underline mt-0.5"
                          style={{ color: 'var(--accent-blue)', lineHeight: 1.4 }}
                          title={item.value}
                          onClick={item.onClick}
                        >
                          {item.value}
                        </button>
                      ) : (
                        <span
                          className="block text-[13px] break-all mt-0.5"
                          style={{ color, fontWeight: item.accent ? 600 : 400, lineHeight: 1.4 }}
                          title={item.value}
                        >
                          {item.value}
                        </span>
                      )
                    ) : (
                      <div className="text-[13px] mt-0.5" style={{ color, lineHeight: 1.4 }}>{item.value}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Resizable Tab Panel ─────────────────────────────────── */}
      <div className="shrink-0" style={{ height: panelHeight, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Drag handle */}
        <div
          onMouseDown={startDrag}
          style={{
            height: 8,
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
          title="Drag to resize"
        >
          <div style={{width:40,height:4,borderRadius:2,backgroundColor:'var(--text-muted)',opacity:0.3}}></div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {activeTab === 'instances' && (() => {
              const filtered = (instances ?? []).filter(item => matchesSearch(item, instanceSearch, ['id', 'state', 'businessKey', 'startTime']));
              const totalFiltered = filtered.length;
              const totalPages = Math.max(1, Math.ceil(totalFiltered / 10));
              const paginated = filtered.slice(instancePage * 10, (instancePage + 1) * 10);
              return (
                <>
                  <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={instanceSearch}
                      onChange={(e) => { setInstanceSearch(e.target.value); setInstancePage(0); }}
                      className="w-full text-sm px-3 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <DataTable data={paginated} columns={instanceColumns} isLoading={instancesLoading}
                      onRowClick={(row) => navigate(`/processes/instance/${row.id}`)}
                      emptyMessage="No running instances for this process definition." />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {totalFiltered} results
                    </span>
                    <div className="flex items-center gap-2">
                      <button disabled={instancePage === 0} onClick={() => setInstancePage(p => p - 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Prev
                      </button>
                      <span className="text-xs text-center" style={{ color: 'var(--text-secondary)', minWidth: 32 }}>
                        Page {instancePage + 1} of {totalPages}
                      </span>
                      <button disabled={instancePage >= totalPages - 1} onClick={() => setInstancePage(p => p + 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
            {activeTab === 'incidents' && (() => {
              const filtered = (incidents ?? []).filter(item => matchesSearch(item, incidentSearch, ['incidentType', 'incidentMessage', 'processInstanceId', 'activityId']));
              const totalFiltered = filtered.length;
              const totalPages = Math.max(1, Math.ceil(totalFiltered / 10));
              const paginated = filtered.slice(incidentPage * 10, (incidentPage + 1) * 10);
              return (
                <>
                  <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={incidentSearch}
                      onChange={(e) => { setIncidentSearch(e.target.value); setIncidentPage(0); }}
                      className="w-full text-sm px-3 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <DataTable data={paginated} columns={incidentColumns} isLoading={incidentsLoading}
                      emptyMessage="No incidents for this process definition." />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {totalFiltered} results
                    </span>
                    <div className="flex items-center gap-2">
                      <button disabled={incidentPage === 0} onClick={() => setIncidentPage(p => p - 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Prev
                      </button>
                      <span className="text-xs text-center" style={{ color: 'var(--text-secondary)', minWidth: 32 }}>
                        Page {incidentPage + 1} of {totalPages}
                      </span>
                      <button disabled={incidentPage >= totalPages - 1} onClick={() => setIncidentPage(p => p + 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
            {activeTab === 'jobDefinitions' && (() => {
              const filtered = (jobDefinitions ?? []).filter(item => matchesSearch(item, jobDefSearch, ['activityId', 'jobType', 'jobConfiguration']));
              const totalFiltered = filtered.length;
              const totalPages = Math.max(1, Math.ceil(totalFiltered / 10));
              const paginated = filtered.slice(jobDefPage * 10, (jobDefPage + 1) * 10);
              return (
                <>
                  <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={jobDefSearch}
                      onChange={(e) => { setJobDefSearch(e.target.value); setJobDefPage(0); }}
                      className="w-full text-sm px-3 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <DataTable data={paginated} columns={jobDefColumns} isLoading={jobDefsLoading}
                      emptyMessage="No job definitions for this process definition." />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {totalFiltered} results
                    </span>
                    <div className="flex items-center gap-2">
                      <button disabled={jobDefPage === 0} onClick={() => setJobDefPage(p => p - 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Prev
                      </button>
                      <span className="text-xs text-center" style={{ color: 'var(--text-secondary)', minWidth: 32 }}>
                        Page {jobDefPage + 1} of {totalPages}
                      </span>
                      <button disabled={jobDefPage >= totalPages - 1} onClick={() => setJobDefPage(p => p + 1)}
                        className="px-2 py-1 text-xs cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
            {activeTab === 'history' && (() => {
              const filtered = (historyInstances ?? []).filter(item => matchesSearch(item, historySearch, ['id', 'state', 'businessKey', 'startTime', 'endTime']));
              return (
                <div className="flex flex-col flex-1">
                  {/* History filter bar */}
                  <div className="px-4 py-3 flex flex-wrap items-end gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                    <FilterField label="Started After">
                      <input type="datetime-local" value={historyFilters.startedAfter} onChange={(e) => { setHistoryFilters(f => ({ ...f, startedAfter: e.target.value })); setHistoryPage(0); }} style={inputStyle} />
                    </FilterField>
                    <FilterField label="Started Before">
                      <input type="datetime-local" value={historyFilters.startedBefore} onChange={(e) => { setHistoryFilters(f => ({ ...f, startedBefore: e.target.value })); setHistoryPage(0); }} style={inputStyle} />
                    </FilterField>
                    <FilterField label="Finished After">
                      <input type="datetime-local" value={historyFilters.finishedAfter} onChange={(e) => { setHistoryFilters(f => ({ ...f, finishedAfter: e.target.value })); setHistoryPage(0); }} style={inputStyle} />
                    </FilterField>
                    <FilterField label="Finished Before">
                      <input type="datetime-local" value={historyFilters.finishedBefore} onChange={(e) => { setHistoryFilters(f => ({ ...f, finishedBefore: e.target.value })); setHistoryPage(0); }} style={inputStyle} />
                    </FilterField>
                    <FilterField label="Business Key">
                      <input type="text" placeholder="key" value={historyFilters.businessKey} onChange={(e) => { setHistoryFilters(f => ({ ...f, businessKey: e.target.value })); setHistoryPage(0); }} style={{ ...inputStyle, width: 120 }} />
                    </FilterField>
                    <FilterField label="State">
                      <select value={historyFilters.state} onChange={(e) => { setHistoryFilters(f => ({ ...f, state: e.target.value as any })); setHistoryPage(0); }} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">All</option>
                        <option value="completed">Completed</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </FilterField>
                    <Button variant="ghost" size="sm" onClick={() => { setHistoryFilters({ startedAfter: '', startedBefore: '', finishedAfter: '', finishedBefore: '', businessKey: '', state: '' }); setHistoryPage(0); }}>
                      Clear
                    </Button>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                      {historyCount?.count ?? '—'} results
                    </span>
                  </div>

                  <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); }}
                      className="w-full text-sm px-3 py-1.5 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <DataTable
                      data={filtered}
                      columns={historyColumns}
                      isLoading={historyLoading}
                      onRowClick={(row) => navigate(`/processes/instance/${row.id}`)}
                      pageSize={HISTORY_PAGE_SIZE}
                      pageIndex={historyPage}
                      total={historyCount?.count}
                      onPageChange={setHistoryPage}
                      emptyMessage="No historic instances found matching the filters."
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Filter Field                                                       */
/* ================================================================== */

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
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
