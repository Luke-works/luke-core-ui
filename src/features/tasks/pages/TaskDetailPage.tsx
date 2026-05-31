import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/shared/ui/Button';
import {
  getTaskById,
  getTaskVariables,
  completeTask,
} from '@/features/tasks/api/endpoints';
import type { VariablesMap } from '@/shared/api/types';

/* ── Variable type for the form ───────────────────────────── */

interface OutputVariable {
  name: string;
  type: string;
  value: string;
}

const VARIABLE_TYPES = ['String', 'Boolean', 'Integer', 'Long', 'Double', 'Date', 'Json'];

/* ── Component ─────────────────────────────────────────────── */

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, open, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'variables' | 'complete'>('details');

  // Form state for completing a task
  const [outputVariables, setOutputVariables] = useState<OutputVariable[]>([]);
  // Nested "are you sure?" confirm when completing with no output data
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId!),
    enabled: !!taskId && open,
  });

  const { data: variables } = useQuery({
    queryKey: ['taskVariables', taskId],
    queryFn: () => getTaskVariables(taskId!),
    enabled: !!taskId && open && activeTab === 'variables',
  });
  const variablesMap: VariablesMap = variables ?? {};

  /* ── Mutation ────────────────────────────────────────────── */

  const completeMutation = useMutation({
    mutationFn: () => {
      const varsPayload: Record<string, { value: any; type: string }> = {};
      for (const v of outputVariables) {
        if (!v.name) continue;
        let parsedValue: any = v.value;
        if (v.type === 'Boolean') parsedValue = v.value === 'true';
        else if (v.type === 'Integer' || v.type === 'Long') parsedValue = parseInt(v.value, 10);
        else if (v.type === 'Double') parsedValue = parseFloat(v.value);
        else if (v.type === 'Json') {
          try { parsedValue = JSON.parse(v.value); } catch { /* keep as string */ }
        }
        varsPayload[v.name] = { value: parsedValue, type: v.type };
      }
      return completeTask(taskId!, varsPayload);
    },
    onSuccess: () => {
      toast.success('Task completed');
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to complete task');
      setConfirmOpen(false);
    },
  });

  /* ── Reset form when task changes ────────────────────────── */

  useEffect(() => {
    setOutputVariables([]);
    setActiveTab('details');
    setConfirmOpen(false);
  }, [taskId]);

  /* ── Variable form helpers ───────────────────────────────── */

  function addVariable() {
    setOutputVariables((prev) => [...prev, { name: '', type: 'String', value: '' }]);
  }

  function updateVariable(index: number, field: keyof OutputVariable, value: string) {
    setOutputVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  function removeVariable(index: number) {
    setOutputVariables((prev) => prev.filter((_, i) => i !== index));
  }

  /* ── Complete handler — confirm if no output data ────────── */

  function handleComplete() {
    const hasData = outputVariables.some((v) => v.name.trim() !== '');
    if (!hasData) {
      setConfirmOpen(true);
      return;
    }
    completeMutation.mutate();
  }

  /* ── Render ──────────────────────────────────────────────── */

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
        onClick={() => { if (!completeMutation.isPending) onClose(); }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border bg-white shadow-theme-xl dark:bg-gray-900"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Task Details
            </h2>
            {task && (
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }} title={task.name}>
                {task.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {taskLoading ? (
            <div className="space-y-4">
              <div className="h-8 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              <div className="h-32 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            </div>
          ) : !task ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Task not found
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Tab navigation */}
              <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
                {(['details', 'variables', 'complete'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3 py-2 text-sm font-medium capitalize transition-colors"
                    style={{
                      color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      borderBottom: activeTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'details' && <DetailsTab task={task} />}
              {activeTab === 'variables' && <VariablesTab variables={variablesMap} />}
              {activeTab === 'complete' && (
                <CompleteTab
                  outputVariables={outputVariables}
                  onAdd={addVariable}
                  onUpdate={updateVariable}
                  onRemove={removeVariable}
                  onComplete={handleComplete}
                  isCompleting={completeMutation.isPending}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested confirm modal — complete without output data */}
      {confirmOpen && (
        <ConfirmComplete
          isCompleting={completeMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => completeMutation.mutate()}
        />
      )}
    </div>
  );
}

/* ── Confirm Complete (nested modal) ─────────────────────── */

function ConfirmComplete({
  isCompleting,
  onCancel,
  onConfirm,
}: {
  isCompleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60" onClick={() => { if (!isCompleting) onCancel(); }} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border bg-white shadow-theme-xl dark:bg-gray-900"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ color: 'var(--accent-amber, #f59e0b)' }} />
            <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Complete task?
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to complete this task without adding any output data?
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isCompleting}>
            No
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={isCompleting}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              {isCompleting ? 'Completing...' : 'Yes, complete'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Details Tab ─────────────────────────────────────────── */

function DetailsTab({ task }: { task: any }) {
  const details = [
    { label: 'Task ID', value: task.id },
    { label: 'Name', value: task.name },
    { label: 'Assignee', value: task.assignee ?? 'Unassigned' },
    { label: 'Created', value: task.created ? new Date(task.created).toLocaleString() : '-' },
    { label: 'Due', value: task.due ? new Date(task.due).toLocaleString() : '-' },
    { label: 'Priority', value: String(task.priority ?? 0) },
    { label: 'Process Instance', value: task.processInstanceId ?? '-' },
    { label: 'Task Definition Key', value: task.taskDefinitionKey ?? '-' },
  ];

  return (
    <div className="space-y-3">
      {details.map((d) => (
        <div key={d.label} className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {d.label}
          </span>
          <span className="text-sm font-mono-id" style={{ color: 'var(--text-primary)' }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Variables Tab ───────────────────────────────────────── */

function VariablesTab({ variables }: { variables: VariablesMap }) {
  const entries = Object.entries(variables);
  if (entries.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No variables for this task.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(([name, v]) => (
        <div
          key={name}
          className="flex items-center justify-between p-2 rounded"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {name}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {v.type}
            </span>
          </div>
          <span className="text-sm font-mono-id" style={{ color: 'var(--text-secondary)' }}>
            {typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Complete Tab ────────────────────────────────────────── */

function CompleteTab({
  outputVariables,
  onAdd,
  onUpdate,
  onRemove,
  onComplete,
  isCompleting,
}: {
  outputVariables: OutputVariable[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof OutputVariable, value: string) => void;
  onRemove: (index: number) => void;
  onComplete: () => void;
  isCompleting: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Output Variables
        </span>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      {outputVariables.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No output variables. The task will be completed without setting variables.
        </p>
      ) : (
        <div className="space-y-3">
          {outputVariables.map((variable, index) => (
            <div
              key={index}
              className="flex gap-2 items-start p-2 rounded"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Variable name"
                  value={variable.name}
                  onChange={(e) => onUpdate(index, 'name', e.target.value)}
                  className="w-full px-2 py-1 text-sm rounded"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <div className="flex gap-2">
                  <select
                    value={variable.type}
                    onChange={(e) => onUpdate(index, 'type', e.target.value)}
                    className="px-2 py-1 text-sm rounded"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {VARIABLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={variable.value}
                    onChange={(e) => onUpdate(index, 'value', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <button
                onClick={() => onRemove(index)}
                className="p-1"
                style={{ color: 'var(--accent-red)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        onClick={onComplete}
        disabled={isCompleting}
        className="w-full"
      >
        <CheckCircle2 size={16} className="mr-2" />
        {isCompleting ? 'Completing...' : 'Complete Task'}
      </Button>
    </div>
  );
}
