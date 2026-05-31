import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  RotateCcw,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Tabs from '@/shared/ui/Tabs';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import CopyId from '@/shared/ui/CopyId';
import Skeleton from '@/shared/ui/Skeleton';
import {
  getExternalTasks,
  getExternalTaskTopics,
  setExternalTaskRetries,
  unlockExternalTask,
  type ExternalTask,
  type ExternalTaskTopic,
} from '@/features/external-tasks/api/endpoints';
import { relativeTime } from '@/shared/utils/date';

/* ── Lifecycle KPI Card ──────────────────────────────────────── */

function LifecycleCard({ label, value, icon, color, isLoading, onClick }: {
  label: string; value: number; icon: React.ReactNode; color: string; isLoading: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            {isLoading ? <Skeleton width={60} height={32} /> : <span className="text-2xl font-heading" style={{ color }}>{value}</span>}
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        </div>
      </Card>
    </div>
  );
}

/* ── Lifecycle Flow Diagram ──────────────────────────────────── */

function LifecycleFlow({ available, locked, failed }: { available: number; locked: number; failed: number }) {
  const stages = [
    { label: 'Created', desc: 'Task published to topic', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
    { label: 'Available', desc: 'Waiting for worker', color: 'var(--accent-blue)', bg: 'rgba(59,123,244,0.1)', count: available },
    { label: 'Locked', desc: 'Worker processing', color: 'var(--accent-orange)', bg: 'rgba(249,115,22,0.1)', count: locked },
    { label: 'Completed / Failed', desc: 'Execution finished', color: failed > 0 ? 'var(--accent-red)' : 'var(--accent-green)', bg: failed > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', count: failed },
  ];

  return (
    <Card title="External Task Lifecycle">
      <div className="flex items-center gap-2">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 flex-1">
            <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: s.bg, border: `1px solid ${s.color}30` }}>
              {s.count !== undefined && <div className="text-xl font-heading" style={{ color: s.color }}>{s.count}</div>}
              <div className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
            {i < stages.length - 1 && <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Error Detail Modal ──────────────────────────────────────── */

function ErrorDetailModal({ task, onClose }: { task: ExternalTask; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative rounded-lg border shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Error Details</h2>
          <button className="rounded p-1 hover:bg-white/10 cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-secondary)' }} onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 overflow-auto space-y-3">
          <div><span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Task ID:</span><div className="mt-0.5"><CopyId id={task.id} /></div></div>
          <div><span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Topic:</span><div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{task.topicName}</div></div>
          <div><span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Worker:</span><div className="text-sm mt-0.5 font-mono-id" style={{ color: 'var(--text-secondary)' }}>{task.workerId ?? '—'}</div></div>
          <div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Error Message:</span>
            <pre className="mt-1 text-xs font-mono-id p-3 rounded whitespace-pre-wrap break-all"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--accent-red)' }}>
              {task.errorMessage ?? 'No error message'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function ExternalTaskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [filterTopic, setFilterTopic] = useState('');
  const [errorTask, setErrorTask] = useState<ExternalTask | null>(null);

  const { data: allTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['externalTasks'],
    queryFn: () => getExternalTasks({ maxResults: 500 }),
    refetchInterval: 10000,
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['externalTaskTopics'],
    queryFn: getExternalTaskTopics,
    refetchInterval: 10000,
  });

  const counts = useMemo(() => {
    const tasks = allTasks ?? [];
    const now = new Date();
    let available = 0, locked = 0, failed = 0;
    for (const t of tasks) {
      if (t.errorMessage) failed++;
      else if (t.lockExpirationTime && new Date(t.lockExpirationTime) > now) locked++;
      else available++;
    }
    return { total: tasks.length, available, locked, failed };
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    let tasks = allTasks ?? [];
    const now = new Date();
    if (filterTopic) tasks = tasks.filter((t) => t.topicName === filterTopic);
    switch (activeTab) {
      case 'available': return tasks.filter((t) => !t.errorMessage && (!t.lockExpirationTime || new Date(t.lockExpirationTime) <= now));
      case 'locked': return tasks.filter((t) => !t.errorMessage && t.lockExpirationTime && new Date(t.lockExpirationTime) > now);
      case 'failed': return tasks.filter((t) => !!t.errorMessage);
      default: return tasks;
    }
  }, [allTasks, activeTab, filterTopic]);

  const retryMutation = useMutation({
    mutationFn: (id: string) => setExternalTaskRetries(id, 3),
    onSuccess: () => { toast.success('Retries set'); queryClient.invalidateQueries({ queryKey: ['externalTasks'] }); queryClient.invalidateQueries({ queryKey: ['externalTaskTopics'] }); },
    onError: () => toast.error('Failed to set retries'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => unlockExternalTask(id),
    onSuccess: () => { toast.success('Task unlocked'); queryClient.invalidateQueries({ queryKey: ['externalTasks'] }); queryClient.invalidateQueries({ queryKey: ['externalTaskTopics'] }); },
    onError: () => toast.error('Failed to unlock task'),
  });

  const retryAllMutation = useMutation({
    mutationFn: async () => { await Promise.all((allTasks ?? []).filter((t) => t.errorMessage).map((t) => setExternalTaskRetries(t.id, 3))); },
    onSuccess: () => { toast.success('All failed tasks retried'); queryClient.invalidateQueries({ queryKey: ['externalTasks'] }); queryClient.invalidateQueries({ queryKey: ['externalTaskTopics'] }); },
    onError: () => toast.error('Failed to retry tasks'),
  });

  const tabs = useMemo(() => [
    { id: 'all', label: `All (${counts.total})` },
    { id: 'available', label: `Available (${counts.available})` },
    { id: 'locked', label: `Locked (${counts.locked})` },
    { id: 'failed', label: `Failed (${counts.failed})` },
  ], [counts]);

  const columns: ColumnDef<ExternalTask, any>[] = useMemo(() => [
    { id: 'state', header: 'State', size: 100, cell: ({ row }) => {
      const t = row.original; const now = new Date();
      if (t.errorMessage) return <Badge variant="danger">Failed</Badge>;
      if (t.lockExpirationTime && new Date(t.lockExpirationTime) > now) return <Badge variant="warning">Locked</Badge>;
      return <Badge variant="info">Available</Badge>;
    }},
    { accessorKey: 'id', header: 'Task ID', cell: ({ row }) => <CopyId id={row.original.id} /> },
    { accessorKey: 'topicName', header: 'Topic', cell: ({ row }) => (
      <button className="text-sm bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}
        onClick={(e) => { e.stopPropagation(); setFilterTopic(row.original.topicName); }}>{row.original.topicName}</button>
    )},
    { accessorKey: 'workerId', header: 'Worker', cell: ({ row }) => (
      <span className="text-sm font-mono-id" style={{ color: row.original.workerId ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.original.workerId ?? '—'}</span>
    )},
    { accessorKey: 'processDefinitionKey', header: 'Process', cell: ({ row }) => <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.original.processDefinitionKey}</span> },
    { accessorKey: 'activityId', header: 'Activity', cell: ({ row }) => <span className="text-sm font-mono-id" style={{ color: 'var(--text-secondary)' }}>{row.original.activityId}</span> },
    { accessorKey: 'lockExpirationTime', header: 'Lock Expires', size: 140, cell: ({ row }) => {
      if (!row.original.lockExpirationTime) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      const expired = new Date(row.original.lockExpirationTime) <= new Date();
      return <span className="text-sm whitespace-nowrap" style={{ color: expired ? 'var(--text-muted)' : 'var(--accent-orange)' }}>{relativeTime(row.original.lockExpirationTime)}</span>;
    }},
    { accessorKey: 'retries', header: 'Retries', size: 70, cell: ({ row }) => (
      <span style={{ color: row.original.retries === 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{row.original.retries ?? '—'}</span>
    )},
    { id: 'actions', header: '', size: 120, enableSorting: false, cell: ({ row }) => {
      const t = row.original; const isLocked = t.lockExpirationTime && new Date(t.lockExpirationTime) > new Date();
      return (
        <div className="flex items-center gap-1">
          {t.errorMessage && (<>
            <Button variant="ghost" size="sm" title="View error" onClick={(e) => { e.stopPropagation(); setErrorTask(t); }}><Eye size={13} /></Button>
            <Button variant="secondary" size="sm" title="Retry" onClick={(e) => { e.stopPropagation(); retryMutation.mutate(t.id); }}><RotateCcw size={13} /></Button>
          </>)}
          {isLocked && <Button variant="secondary" size="sm" title="Unlock" onClick={(e) => { e.stopPropagation(); unlockMutation.mutate(t.id); }}><Unlock size={13} /></Button>}
        </div>
      );
    }},
  ], [retryMutation, unlockMutation]);

  const topicColumns: ColumnDef<ExternalTaskTopic, any>[] = useMemo(() => [
    { accessorKey: 'topicName', header: 'Topic', cell: ({ row }) => (
      <button className="text-sm font-medium bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}
        onClick={() => { setFilterTopic(row.original.topicName); setActiveTab('all'); }}>{row.original.topicName}</button>
    )},
    { accessorKey: 'count', header: 'Total', size: 80, cell: ({ row }) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.original.count}</span> },
    { accessorKey: 'available', header: 'Available', size: 90, cell: ({ row }) => <span style={{ color: row.original.available > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{row.original.available}</span> },
    { accessorKey: 'locked', header: 'Locked', size: 80, cell: ({ row }) => <span style={{ color: row.original.locked > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>{row.original.locked}</span> },
    { accessorKey: 'failed', header: 'Failed', size: 80, cell: ({ row }) => <span style={{ color: row.original.failed > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{row.original.failed}</span> },
  ], []);

  return (
    <div>
      <PageHeader title="External Task Management" subtitle="Monitor and manage external task lifecycle"
        actions={counts.failed > 0 ? (
          <Button variant="danger" size="sm" onClick={() => retryAllMutation.mutate()} disabled={retryAllMutation.isPending}>
            <RotateCcw size={14} className="mr-1.5" />{retryAllMutation.isPending ? 'Retrying...' : `Retry All Failed (${counts.failed})`}
          </Button>
        ) : undefined} />

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <LifecycleCard label="Total Tasks" value={counts.total} icon={<Cpu size={20} />} color="var(--text-primary)" isLoading={tasksLoading} onClick={() => setActiveTab('all')} />
        <LifecycleCard label="Available" value={counts.available} icon={<Clock size={20} />} color="var(--accent-blue)" isLoading={tasksLoading} onClick={() => setActiveTab('available')} />
        <LifecycleCard label="Locked (Processing)" value={counts.locked} icon={<Lock size={20} />} color="var(--accent-orange)" isLoading={tasksLoading} onClick={() => setActiveTab('locked')} />
        <LifecycleCard label="Failed" value={counts.failed} icon={<AlertTriangle size={20} />} color="var(--accent-red)" isLoading={tasksLoading} onClick={() => setActiveTab('failed')} />
      </div>

      {/* Lifecycle Flow */}
      <div className="mb-6">
        <LifecycleFlow available={counts.available} locked={counts.locked} failed={counts.failed} />
      </div>

      {/* Topics Overview */}
      {topics && topics.length > 0 && (
        <div className="mb-6">
          <Card title="Topics Overview">
            <DataTable data={topics} columns={topicColumns} isLoading={topicsLoading} emptyMessage="No topics found." />
          </Card>
        </div>
      )}

      {/* Filter indicator */}
      {filterTopic && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Filtered by topic:</span>
          <Badge variant="info">{filterTopic}</Badge>
          <button className="text-xs bg-transparent border-none cursor-pointer p-0 underline" style={{ color: 'var(--accent-blue)' }} onClick={() => setFilterTopic('')}>Clear filter</button>
        </div>
      )}

      {/* Task List */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
          <DataTable data={filteredTasks} columns={columns} isLoading={tasksLoading}
            onRowClick={(row) => navigate(`/processes/instance/${row.processInstanceId}`)}
            emptyMessage={activeTab === 'failed' ? 'No failed external tasks.' : activeTab === 'locked' ? 'No locked external tasks.' : activeTab === 'available' ? 'No available external tasks.' : 'No external tasks found.'} />
        </Tabs>
      </div>

      {errorTask && <ErrorDetailModal task={errorTask} onClose={() => setErrorTask(null)} />}
    </div>
  );
}