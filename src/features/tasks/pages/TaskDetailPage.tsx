import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Paperclip,
  GitBranch,
} from 'lucide-react';

import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import CopyId from '@/shared/ui/CopyId';
import EmptyState from '@/shared/ui/EmptyState';
import Skeleton from '@/shared/ui/Skeleton';
import BpmnViewer, { type ActivityState } from '@/shared/bpmn/BpmnViewer';

import {
  getTaskById,
  getTaskFormVariables,
  completeTask,
  claimTask,
  unclaimTask,
} from '@/features/tasks/api/endpoints';
import { getProcessDefinitionXml } from '@/features/processes/api/endpoints';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { relativeTime, absoluteTime } from '@/shared/utils/date';
import { priorityLabel } from '@/shared/utils/camunda';

/* ── Priority badge variant (mirrors TaskListPage) ───────────── */

function priorityBadgeVariant(
  priority: number,
): 'danger' | 'warning' | 'info' | 'muted' {
  if (priority >= 76) return 'danger';
  if (priority >= 51) return 'warning';
  if (priority >= 26) return 'info';
  return 'muted';
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);

  /* ── Task ────────────────────────────────────────────────── */

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId!),
    enabled: !!taskId,
  });

  /* ── Claim / unclaim ─────────────────────────────────────── */

  const claimMutation = useMutation({
    mutationFn: () => claimTask(taskId!, username!),
    onSuccess: () => {
      toast.success('Task claimed');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to claim task'),
  });

  const unclaimMutation = useMutation({
    mutationFn: () => unclaimTask(taskId!),
    onSuccess: () => {
      toast.success('Task unclaimed');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to unclaim task'),
  });

  /* ── Render ──────────────────────────────────────────────── */

  const isMine = !!task?.assignee && task.assignee === username;
  const isOverdue = !!task?.due && new Date(task.due) < new Date();

  return (
    <div>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
            title="Back to tasks"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-title-sm font-semibold truncate text-gray-800 dark:text-white/90">
              {task?.name ?? (taskLoading ? 'Loading…' : 'Task')}
            </h1>
            <p className="text-theme-xs mt-0.5 text-gray-500 dark:text-gray-400">
              Task details
            </p>
          </div>
        </div>

        {task && (
          <div className="flex items-center gap-2">
            {isMine ? (
              <Button
                variant="secondary"
                size="sm"
                startIcon={<UserMinus size={14} />}
                onClick={() => unclaimMutation.mutate()}
                disabled={unclaimMutation.isPending}
              >
                Unclaim
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                startIcon={<UserPlus size={14} />}
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !username}
              >
                Claim
              </Button>
            )}
          </div>
        )}
      </div>

      {taskLoading ? (
        <div className="space-y-4">
          <Skeleton height="5rem" />
          <Skeleton height="20rem" />
        </div>
      ) : !task ? (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Task not found. It may have been completed or reassigned.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* ── Metadata strip ──────────────────────────────── */}
          <Card>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              <Meta label="Assignee">
                {task.assignee ? (
                  <span className="text-gray-800 dark:text-white/90">{task.assignee}</span>
                ) : (
                  <span className="italic text-gray-400">Unassigned</span>
                )}
              </Meta>
              <Meta label="Priority">
                <Badge variant={priorityBadgeVariant(task.priority)}>
                  {priorityLabel(task.priority)}
                </Badge>
              </Meta>
              <Meta label="Created">
                <span className="text-gray-700 dark:text-gray-300" title={absoluteTime(task.created)}>
                  {relativeTime(task.created)}
                </span>
              </Meta>
              <Meta label="Due">
                {task.due ? (
                  <span
                    title={absoluteTime(task.due)}
                    style={{ color: isOverdue ? 'var(--accent-red)' : undefined }}
                    className={isOverdue ? '' : 'text-gray-700 dark:text-gray-300'}
                  >
                    {relativeTime(task.due)}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Meta>
              <Meta label="Task Definition Key">
                <span className="font-mono-id text-theme-xs text-gray-700 dark:text-gray-300">
                  {task.taskDefinitionKey ?? '—'}
                </span>
              </Meta>
              <Meta label="Process Instance">
                {task.processInstanceId ? (
                  <CopyId id={task.processInstanceId} />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Meta>
              <Meta label="Process Definition">
                {task.processDefinitionId ? (
                  <CopyId id={task.processDefinitionId} />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Meta>
              <Meta label="Task ID">
                <CopyId id={task.id} />
              </Meta>
            </div>
          </Card>

          {/* ── Two-column: Form + Attachments | Diagram ────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(0,1.1fr)] lg:items-start">
            {/* Left column */}
            <div className="space-y-5">
              <FormSection
                taskId={task.id}
                onCompleted={() => {
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                  navigate('/tasks');
                }}
              />

              <Card title="Attachments">
                <EmptyState
                  icon={<Paperclip size={28} />}
                  title="No attachments"
                  description="This task has no attachments. Uploading and managing attachments is coming soon."
                />
              </Card>
            </div>

            {/* Right column — diagram (sticky on large screens) */}
            <div className="lg:sticky lg:top-4">
              <DiagramSection
                processDefinitionId={task.processDefinitionId}
                taskDefinitionKey={task.taskDefinitionKey}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Metadata field ───────────────────────────────────────────── */

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-theme-sm truncate">{children}</span>
    </div>
  );
}

/* ── Form section — renders task form-variables as typed inputs ── */

const inputClass =
  'w-full h-9 px-3 text-theme-sm rounded-lg outline-none bg-white text-gray-800 ring-1 ring-inset ring-gray-300 focus:ring-brand-500 dark:bg-gray-800 dark:text-white/90 dark:ring-gray-700';

function FormSection({
  taskId,
  onCompleted,
}: {
  taskId: string;
  onCompleted: () => void;
}) {
  const { data: formVars, isLoading } = useQuery({
    queryKey: ['taskFormVariables', taskId],
    queryFn: () => getTaskFormVariables(taskId),
  });

  // Field order + types, derived from the engine's form-variables.
  const fields = useMemo(
    () =>
      Object.entries(formVars ?? {}).map(([name, v]) => ({
        name,
        type: v.type,
        initial: v.value,
      })),
    [formVars],
  );

  // Local edit state keyed by variable name. Initialised once fields arrive.
  const [values, setValues] = useState<Record<string, string>>({});
  const initialised = useMemo(() => {
    const seed: Record<string, string> = {};
    for (const f of fields) {
      seed[f.name] =
        f.initial === null || f.initial === undefined
          ? ''
          : typeof f.initial === 'object'
            ? JSON.stringify(f.initial, null, 2)
            : String(f.initial);
    }
    return seed;
  }, [fields]);

  // Merge seed with any user edits (user edits win).
  const merged = useMemo(() => ({ ...initialised, ...values }), [initialised, values]);

  function set(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  const completeMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, { value: unknown; type: string }> = {};
      for (const f of fields) {
        const raw = merged[f.name];
        payload[f.name] = { value: coerce(raw, f.type), type: f.type };
      }
      return completeTask(taskId, payload);
    },
    onSuccess: () => {
      toast.success('Task completed');
      onCompleted();
    },
    onError: () => toast.error('Failed to complete task'),
  });

  function handleComplete() {
    if (fields.length === 0) {
      const ok = window.confirm('Complete this task without any form data?');
      if (!ok) return;
    }
    completeMutation.mutate();
  }

  return (
    <Card
      title="Form"
      action={
        <Button
          variant="primary"
          size="sm"
          startIcon={<CheckCircle2 size={14} />}
          onClick={handleComplete}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? 'Completing…' : 'Complete'}
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton height="2.25rem" />
          <Skeleton height="2.25rem" />
        </div>
      ) : fields.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          This task has no form fields. Completing it will not set any variables.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((f) => (
            <FormField
              key={f.name}
              name={f.name}
              type={f.type}
              value={merged[f.name] ?? ''}
              onChange={(val) => set(f.name, val)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── A single typed form field ────────────────────────────────── */

function FormField({
  name,
  type,
  value,
  onChange,
}: {
  name: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = type.toLowerCase();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-theme-xs font-medium text-gray-600 dark:text-gray-300">
        {name}
        <span className="ml-2 font-normal text-gray-400">{type}</span>
      </label>

      {t === 'boolean' ? (
        <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : t === 'date' ? (
        <input
          type="datetime-local"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : t === 'integer' || t === 'long' || t === 'short' || t === 'double' || t === 'float' ? (
        <input
          type="number"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : t === 'json' || t === 'object' ? (
        <textarea
          rows={4}
          className={`${inputClass} h-auto py-2 font-mono-id`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/* ── Diagram section — BPMN with the current task highlighted ──── */

function DiagramSection({
  processDefinitionId,
  taskDefinitionKey,
}: {
  processDefinitionId: string;
  taskDefinitionKey: string;
}) {
  const { data: xmlData, isLoading } = useQuery({
    queryKey: ['processDefinitionXml', processDefinitionId],
    queryFn: () => getProcessDefinitionXml(processDefinitionId),
    enabled: !!processDefinitionId,
  });

  const activityStates = useMemo<Record<string, ActivityState>>(
    () => (taskDefinitionKey ? { [taskDefinitionKey]: 'in-progress' } : {}),
    [taskDefinitionKey],
  );

  return (
    <Card title="Diagram" desc="Current task highlighted" className="overflow-hidden">
      <div className="h-[480px] rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-500" />
          </div>
        ) : xmlData?.bpmn20Xml ? (
          <BpmnViewer
            xml={xmlData.bpmn20Xml}
            height="100%"
            activityStates={activityStates}
          />
        ) : (
          <EmptyState
            icon={<GitBranch size={28} />}
            title="No diagram"
            description="Could not load the BPMN diagram for this process definition."
          />
        )}
      </div>
    </Card>
  );
}

/* ── Variable value coercion (matches Camunda variable types) ──── */

function coerce(raw: string, type: string): unknown {
  const t = type.toLowerCase();
  if (t === 'boolean') return raw === 'true';
  if (t === 'integer' || t === 'long' || t === 'short') {
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }
  if (t === 'double' || t === 'float') {
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }
  if (t === 'json' || t === 'object') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
