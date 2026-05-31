import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Power, PowerOff, X, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Tabs from '@/shared/ui/Tabs';
import {
  getRegisteredTopics,
  createRegisteredTopic,
  updateRegisteredTopic,
  deleteRegisteredTopic,
  type RegisteredTopic,
} from '@/features/external-tasks/api/topicRegistry';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { absoluteTime } from '@/shared/utils/date';

/* ── Constants ───────────────────────────────────────────────── */

const WORKER_TYPES = ['JAVA', 'PYTHON', 'JAVASCRIPT', 'GROOVY'] as const;
const POLL_TYPES = ['LONG_POLLING', 'INTERVAL', 'PUSH'] as const;
const BACKOFF_TYPES = ['FIXED', 'LINEAR', 'EXPONENTIAL'] as const;
const RESOLUTION_OPTIONS = ['RETRY', 'EXTEND_LOCK', 'CANCEL', 'SKIP', 'MANUAL'] as const;

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
};

/* ================================================================== */
/*  Register / Edit Topic Modal                                        */
/* ================================================================== */

function TopicFormModal({ initial, onSave, onClose }: {
  initial?: RegisteredTopic;
  onSave: (data: Partial<RegisteredTopic>) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [activeTab, setActiveTab] = useState('identity');

  const [form, setForm] = useState({
    topicName: initial?.topicName ?? '',
    description: initial?.description ?? '',
    workerType: initial?.workerType ?? 'JAVA',
    workerClass: initial?.workerClass ?? '',
    workerName: initial?.workerName ?? '',
    pollType: initial?.pollType ?? 'LONG_POLLING',
    pollIntervalMs: initial?.pollIntervalMs ?? '',
    lockDurationMs: initial?.lockDurationMs ?? 300000,
    autoExtendLock: initial?.autoExtendLock ?? false,
    maxTasksPerPoll: initial?.maxTasksPerPoll ?? 1,
    retries: initial?.retries ?? 3,
    retryDelayMs: initial?.retryDelayMs ?? '',
    retryBackoff: initial?.retryBackoff ?? 'FIXED',
    resolutionPaths: initial?.resolutionPaths?.split(',') ?? ['RETRY', 'EXTEND_LOCK', 'MANUAL'],
    autoRetryOnFailure: initial?.autoRetryOnFailure ?? true,
    staleLockTimeoutMs: initial?.staleLockTimeoutMs ?? '',
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topicName.trim()) return;
    onSave({
      topicName: form.topicName.trim(),
      description: form.description || undefined,
      workerType: form.workerType,
      workerClass: form.workerClass || undefined,
      workerName: form.workerName || undefined,
      pollType: form.pollType,
      pollIntervalMs: form.pollIntervalMs ? Number(form.pollIntervalMs) : undefined,
      lockDurationMs: Number(form.lockDurationMs),
      autoExtendLock: form.autoExtendLock,
      maxTasksPerPoll: Number(form.maxTasksPerPoll),
      retries: Number(form.retries),
      retryDelayMs: form.retryDelayMs ? Number(form.retryDelayMs) : undefined,
      retryBackoff: form.retryBackoff,
      resolutionPaths: form.resolutionPaths.join(','),
      autoRetryOnFailure: form.autoRetryOnFailure,
      staleLockTimeoutMs: form.staleLockTimeoutMs ? Number(form.staleLockTimeoutMs) : undefined,
    } as any);
  };

  const tabs = [
    { id: 'identity', label: 'Identity' },
    { id: 'worker', label: 'Worker' },
    { id: 'polling', label: 'Polling & Locks' },
    { id: 'retry', label: 'Retry & Resolution' },
  ];

  const toggleResolution = (opt: string) => {
    set('resolutionPaths', form.resolutionPaths.includes(opt)
      ? form.resolutionPaths.filter((r) => r !== opt)
      : [...form.resolutionPaths, opt]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative rounded-lg border shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Topic Configuration' : 'Register External Task Topic'}
          </h2>
          <button className="rounded p-1 hover:bg-white/10 cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-secondary)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div className="p-5 overflow-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>

              {/* ── Identity Tab ──────────────────────────────── */}
              {activeTab === 'identity' && (
                <div className="space-y-4">
                  <Field label="Topic Name *" hint="Must match the camunda:topic in your BPMN">
                    <input type="text" value={form.topicName} onChange={(e) => set('topicName', e.target.value)}
                      placeholder="e.g. send-email" style={inputStyle} disabled={isEdit} autoFocus={!isEdit} />
                  </Field>
                  <Field label="Description" hint="What does this external task do?">
                    <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                      placeholder="Sends transactional email notifications via SMTP" rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  </Field>
                </div>
              )}

              {/* ── Worker Tab ────────────────────────────────── */}
              {activeTab === 'worker' && (
                <div className="space-y-4">
                  <Field label="Worker Type" hint="Language/runtime of the external task worker">
                    <div className="flex gap-2">
                      {WORKER_TYPES.map((wt) => (
                        <button key={wt} type="button" onClick={() => set('workerType', wt)}
                          className="px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors"
                          style={{
                            backgroundColor: form.workerType === wt ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                            color: form.workerType === wt ? '#fff' : 'var(--text-secondary)',
                            border: `1px solid ${form.workerType === wt ? 'var(--accent-blue)' : 'var(--border)'}`,
                          }}>
                          {wt}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Worker Class / Module" hint={
                    form.workerType === 'JAVA' ? 'e.g. com.example.workers.SendEmailWorker' :
                    form.workerType === 'PYTHON' ? 'e.g. workers.send_email.handler' :
                    form.workerType === 'JAVASCRIPT' ? 'e.g. ./workers/sendEmail.js' :
                    'e.g. scripts/sendEmail.groovy'
                  }>
                    <input type="text" value={form.workerClass} onChange={(e) => set('workerClass', e.target.value)}
                      placeholder="Fully qualified class or module path" style={inputStyle} />
                  </Field>
                  <Field label="Worker Name / Service ID" hint="Identifier of the worker application">
                    <input type="text" value={form.workerName} onChange={(e) => set('workerName', e.target.value)}
                      placeholder="e.g. email-worker-service" style={inputStyle} />
                  </Field>
                </div>
              )}

              {/* ── Polling & Locks Tab ───────────────────────── */}
              {activeTab === 'polling' && (
                <div className="space-y-4">
                  <Field label="Poll Type" hint="How the worker fetches tasks">
                    <select value={form.pollType} onChange={(e) => set('pollType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {POLL_TYPES.map((pt) => <option key={pt} value={pt}>{pt.replace('_', ' ')}</option>)}
                    </select>
                  </Field>
                  {form.pollType === 'INTERVAL' && (
                    <Field label="Poll Interval (ms)" hint="How often the worker polls for new tasks">
                      <input type="number" value={form.pollIntervalMs} onChange={(e) => set('pollIntervalMs', e.target.value)}
                        placeholder="5000" style={inputStyle} />
                    </Field>
                  )}
                  <Field label="Lock Duration (ms)" hint="How long the worker holds the task lock">
                    <input type="number" value={form.lockDurationMs} onChange={(e) => set('lockDurationMs', e.target.value)}
                      placeholder="300000" style={inputStyle} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      = {Math.round(Number(form.lockDurationMs || 0) / 60000)} minutes
                    </span>
                  </Field>
                  <Field label="Max Tasks Per Poll" hint="Number of tasks fetched in a single poll">
                    <input type="number" value={form.maxTasksPerPoll} onChange={(e) => set('maxTasksPerPoll', e.target.value)}
                      placeholder="1" min={1} style={inputStyle} />
                  </Field>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={form.autoExtendLock} onChange={(e) => set('autoExtendLock', e.target.checked)}
                      id="autoExtendLock" className="accent-[var(--accent-blue)]" />
                    <label htmlFor="autoExtendLock" className="text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                      Auto-extend lock before expiration
                    </label>
                  </div>
                  <Field label="Stale Lock Timeout (ms)" hint="After this time, unreleased locks are considered stale and can be reclaimed">
                    <input type="number" value={form.staleLockTimeoutMs} onChange={(e) => set('staleLockTimeoutMs', e.target.value)}
                      placeholder="600000" style={inputStyle} />
                  </Field>
                </div>
              )}

              {/* ── Retry & Resolution Tab ────────────────────── */}
              {activeTab === 'retry' && (
                <div className="space-y-4">
                  <Field label="Retries" hint="Number of retry attempts before creating an incident">
                    <input type="number" value={form.retries} onChange={(e) => set('retries', e.target.value)}
                      placeholder="3" min={0} style={inputStyle} />
                  </Field>
                  <Field label="Retry Delay (ms)" hint="Wait time between retry attempts">
                    <input type="number" value={form.retryDelayMs} onChange={(e) => set('retryDelayMs', e.target.value)}
                      placeholder="10000" style={inputStyle} />
                  </Field>
                  <Field label="Backoff Strategy" hint="How retry delay increases between attempts">
                    <select value={form.retryBackoff} onChange={(e) => set('retryBackoff', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {BACKOFF_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </Field>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={form.autoRetryOnFailure} onChange={(e) => set('autoRetryOnFailure', e.target.checked)}
                      id="autoRetry" className="accent-[var(--accent-blue)]" />
                    <label htmlFor="autoRetry" className="text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                      Auto-retry on failure (vs manual intervention)
                    </label>
                  </div>
                  <Field label="Resolution Paths" hint="Available actions when a task fails">
                    <div className="flex flex-wrap gap-2">
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <button key={opt} type="button" onClick={() => toggleResolution(opt)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
                          style={{
                            backgroundColor: form.resolutionPaths.includes(opt) ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                            color: form.resolutionPaths.includes(opt) ? '#fff' : 'var(--text-secondary)',
                            border: `1px solid ${form.resolutionPaths.includes(opt) ? 'var(--accent-blue)' : 'var(--border)'}`,
                          }}>
                          {opt.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </Tabs>

          <div className="flex items-center gap-2 px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
            <Button type="submit" variant="primary" disabled={!form.topicName.trim()}>
              {isEdit ? 'Save Changes' : 'Register Topic'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

/* ================================================================== */
/*  Topic Detail Modal                                                 */
/* ================================================================== */

function TopicDetailModal({ topic, onClose }: { topic: RegisteredTopic; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative rounded-lg border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{topic.topicName}</h2>
          <button className="rounded p-1 hover:bg-white/10 cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-secondary)' }} onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <DetailRow label="Status" value={topic.active ? 'Active' : 'Inactive'} color={topic.active ? 'var(--accent-green)' : 'var(--text-muted)'} />
          <DetailRow label="Description" value={topic.description ?? '—'} />
          <DetailRow label="Worker Type" value={topic.workerType} />
          <DetailRow label="Worker Class" value={topic.workerClass ?? '—'} mono />
          <DetailRow label="Worker Name" value={topic.workerName ?? '—'} />
          <DetailRow label="Poll Type" value={(topic.pollType ?? 'LONG_POLLING').replace('_', ' ')} />
          {topic.pollIntervalMs && <DetailRow label="Poll Interval" value={`${topic.pollIntervalMs}ms`} />}
          <DetailRow label="Lock Duration" value={`${topic.lockDurationMs}ms (${Math.round(topic.lockDurationMs / 60000)} min)`} />
          <DetailRow label="Auto-Extend Lock" value={topic.autoExtendLock ? 'Yes' : 'No'} />
          <DetailRow label="Max Tasks/Poll" value={String(topic.maxTasksPerPoll)} />
          <DetailRow label="Retries" value={String(topic.retries)} />
          {topic.retryDelayMs && <DetailRow label="Retry Delay" value={`${topic.retryDelayMs}ms`} />}
          <DetailRow label="Backoff Strategy" value={topic.retryBackoff} />
          <DetailRow label="Auto-Retry" value={topic.autoRetryOnFailure ? 'Yes' : 'No'} />
          <DetailRow label="Resolution Paths" value={topic.resolutionPaths.split(',').join(', ')} />
          {topic.staleLockTimeoutMs && <DetailRow label="Stale Lock Timeout" value={`${topic.staleLockTimeoutMs}ms`} />}
          <DetailRow label="Created" value={absoluteTime(topic.createdAt)} />
          <DetailRow label="Created By" value={topic.createdBy ?? '—'} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono-id' : ''}`} style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function TopicRegistryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);
  const [showForm, setShowForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<RegisteredTopic | null>(null);
  const [viewingTopic, setViewingTopic] = useState<RegisteredTopic | null>(null);

  const { data: topics, isLoading } = useQuery({
    queryKey: ['registeredTopics'],
    queryFn: getRegisteredTopics,
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<RegisteredTopic>) => createRegisteredTopic({ ...body, createdBy: username ?? undefined }),
    onSuccess: () => { toast.success('Topic registered'); queryClient.invalidateQueries({ queryKey: ['registeredTopics'] }); setShowForm(false); },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to register'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RegisteredTopic> }) => updateRegisteredTopic(id, body),
    onSuccess: () => { toast.success('Topic updated'); queryClient.invalidateQueries({ queryKey: ['registeredTopics'] }); setEditingTopic(null); },
    onError: () => toast.error('Failed to update'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateRegisteredTopic(id, { active } as any),
    onSuccess: (_, v) => { toast.success(v.active ? 'Activated' : 'Deactivated'); queryClient.invalidateQueries({ queryKey: ['registeredTopics'] }); },
    onError: () => toast.error('Failed to toggle'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRegisteredTopic(id),
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['registeredTopics'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const columns: ColumnDef<RegisteredTopic, any>[] = useMemo(() => [
    { id: 'status', header: 'Status', size: 90, cell: ({ row }) => row.original.active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge> },
    { accessorKey: 'topicName', header: 'Topic', cell: ({ row }) => <span className="text-sm font-medium font-mono-id" style={{ color: 'var(--text-primary)' }}>{row.original.topicName}</span> },
    { accessorKey: 'workerType', header: 'Worker', size: 100, cell: ({ row }) => <Badge>{row.original.workerType ?? 'JAVA'}</Badge> },
    { accessorKey: 'workerClass', header: 'Class / Module', cell: ({ row }) => <span className="text-xs font-mono-id" style={{ color: 'var(--text-secondary)' }}>{row.original.workerClass ?? '—'}</span> },
    { accessorKey: 'pollType', header: 'Poll', size: 110, cell: ({ row }) => <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{(row.original.pollType ?? 'LONG_POLLING').replace('_', ' ')}</span> },
    { accessorKey: 'retries', header: 'Retries', size: 70, cell: ({ row }) => <span style={{ color: 'var(--text-primary)' }}>{row.original.retries}</span> },
    { accessorKey: 'retryBackoff', header: 'Backoff', size: 100, cell: ({ row }) => <Badge variant="muted">{row.original.retryBackoff ?? 'FIXED'}</Badge> },
    { id: 'actions', header: '', size: 160, enableSorting: false, cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" title="View details" onClick={(e) => { e.stopPropagation(); setViewingTopic(row.original); }}><Eye size={13} /></Button>
        <Button variant="ghost" size="sm" title="Edit" onClick={(e) => { e.stopPropagation(); setEditingTopic(row.original); }}><Pencil size={13} /></Button>
        <Button variant="secondary" size="sm" title={row.original.active ? 'Deactivate' : 'Activate'}
          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: row.original.id, active: !row.original.active }); }}>
          {row.original.active ? <PowerOff size={13} /> : <Power size={13} />}
        </Button>
        <Button variant="ghost" size="sm" title="Delete" onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete "${row.original.topicName}"?`)) deleteMutation.mutate(row.original.id);
        }}><Trash2 size={13} style={{ color: 'var(--accent-red)' }} /></Button>
      </div>
    )},
  ], [toggleMutation, deleteMutation]);

  const activeCount = (topics ?? []).filter((t) => t.active).length;

  return (
    <div>
      <PageHeader title="Topic Registry" subtitle="Register and configure external task topics — unregistered topics block deployment"
        actions={<Button variant="primary" size="sm" onClick={() => navigate('/external-tasks/topics/register')}><Plus size={14} className="mr-1.5" />Register Topic</Button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><div className="text-2xl font-heading" style={{ color: 'var(--text-primary)' }}>{(topics ?? []).length}</div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Topics</p></Card>
        <Card><div className="text-2xl font-heading" style={{ color: 'var(--accent-green)' }}>{activeCount}</div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</p></Card>
        <Card><div className="text-2xl font-heading" style={{ color: 'var(--text-muted)' }}>{(topics ?? []).length - activeCount}</div><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Inactive</p></Card>
      </div>

      <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(59,123,244,0.08)', border: '1px solid rgba(59,123,244,0.2)' }}>
        <span style={{ color: 'var(--accent-blue)', marginTop: 2 }}>i</span>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          When a BPMN with <code className="font-mono-id text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>camunda:type="external"</code> is deployed,
          the engine checks each <code className="font-mono-id text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>camunda:topic</code> against this registry.
          Unregistered or inactive topics will <strong>fail the deployment</strong>.
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <DataTable data={topics ?? []} columns={columns} isLoading={isLoading} emptyMessage="No topics registered. Click 'Register Topic' to get started." />
      </div>

      {showForm && <TopicFormModal onSave={(data) => createMutation.mutate(data)} onClose={() => setShowForm(false)} />}
      {editingTopic && <TopicFormModal initial={editingTopic} onSave={(data) => updateMutation.mutate({ id: editingTopic.id, body: data })} onClose={() => setEditingTopic(null)} />}
      {viewingTopic && <TopicDetailModal topic={viewingTopic} onClose={() => setViewingTopic(null)} />}
    </div>
  );
}