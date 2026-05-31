import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Clock, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import Drawer from '@/shared/ui/Drawer';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import CopyId from '@/shared/ui/CopyId';
import Skeleton from '@/shared/ui/Skeleton';
import VariableRenderer from '@/shared/ui/VariableRenderer';
import Tooltip from '@/shared/ui/Tooltip';

import {
  getTaskById,
  getTaskFormVariables,
  claimTask,
  unclaimTask,
  completeTask,
} from '@/features/tasks/api/endpoints';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { relativeTime, absoluteTime } from '@/shared/utils/date';
import { priorityLabel } from '@/shared/utils/camunda';

import type { VariablesMap } from '@/shared/api/types';

/* ── Variable types supported by Camunda 7 ────────────────── */

const VARIABLE_TYPES = [
  'String',
  'Boolean',
  'Integer',
  'Long',
  'Double',
  'Json',
] as const;

type OutputVariable = {
  key: string;
  value: string;
  type: (typeof VARIABLE_TYPES)[number];
};

/* ── Priority badge variant mapping ───────────────────────── */

function priorityBadgeVariant(
  priority: number,
): 'danger' | 'warning' | 'info' | 'muted' {
  if (priority >= 76) return 'danger';
  if (priority >= 51) return 'warning';
  if (priority >= 26) return 'info';
  return 'muted';
}

/* ── Props ────────────────────────────────────────────────── */

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

/* ── Component ────────────────────────────────────────────── */

export default function TaskDetailDrawer({
  taskId,
  onClose,
}: TaskDetailDrawerProps) {
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);

  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [outputVars, setOutputVars] = useState<OutputVariable[]>([]);

  /* ── Queries ──────────────────────────────────────────── */

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId!),
    enabled: !!taskId,
  });

  const variablesQuery = useQuery({
    queryKey: ['task', taskId, 'formVariables'],
    queryFn: () => getTaskFormVariables(taskId!),
    enabled: !!taskId,
  });

  const task = taskQuery.data;
  const variables: VariablesMap = variablesQuery.data ?? {};

  /* ── Mutations ───────────────────────────────────────── */

  const claimMutation = useMutation({
    mutationFn: () => claimTask(taskId!, username!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task claimed successfully');
    },
    onError: () => toast.error('Failed to claim task'),
  });

  const unclaimMutation = useMutation({
    mutationFn: () => unclaimTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task unclaimed successfully');
    },
    onError: () => toast.error('Failed to unclaim task'),
  });

  const completeMutation = useMutation({
    mutationFn: (vars: Record<string, any>) =>
      completeTask(taskId!, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task completed successfully');
      setShowCompleteForm(false);
      setOutputVars([]);
      onClose();
    },
    onError: () => toast.error('Failed to complete task'),
  });

  /* ── Output variable helpers ─────────────────────────── */

  function addOutputVar() {
    setOutputVars((prev) => [
      ...prev,
      { key: '', value: '', type: 'String' },
    ]);
  }

  function removeOutputVar(index: number) {
    setOutputVars((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOutputVar(
    index: number,
    field: keyof OutputVariable,
    val: string,
  ) {
    setOutputVars((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)),
    );
  }

  function parseVariableValue(raw: string, type: string): any {
    switch (type) {
      case 'Boolean':
        return raw.toLowerCase() === 'true';
      case 'Integer':
      case 'Long':
        return parseInt(raw, 10);
      case 'Double':
        return parseFloat(raw);
      case 'Json':
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      default:
        return raw;
    }
  }

  function handleComplete() {
    const vars: Record<string, any> = {};
    for (const v of outputVars) {
      if (v.key.trim()) {
        vars[v.key.trim()] = {
          value: parseVariableValue(v.value, v.type),
          type: v.type,
        };
      }
    }
    completeMutation.mutate(vars);
  }

  /* ── Render ──────────────────────────────────────────── */

  const isAssignedToMe = task?.assignee === username;
  const isUnassigned = !task?.assignee;
  const isOverdue = task?.due ? new Date(task.due) < new Date() : false;

  return (
    <Drawer
      open={!!taskId}
      onClose={() => {
        setShowCompleteForm(false);
        setOutputVars([]);
        onClose();
      }}
      title={task?.name ?? 'Task Details'}
      width={480}
    >
      {/* Loading state */}
      {taskQuery.isLoading && (
        <div className="space-y-4">
          <Skeleton height={20} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      )}

      {/* Error state */}
      {taskQuery.isError && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-4">
            <AlertCircle
              size={32}
              style={{ color: 'var(--accent-red)' }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Failed to load task details.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => taskQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Task loaded */}
      {task && (
        <div className="space-y-5">
          {/* Header info */}
          <div>
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {task.name}
            </h3>
            <p
              className="text-sm mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {task.processDefinitionId}
            </p>
            <CopyId id={task.id} />
          </div>

          {/* Metadata cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <User
                  size={14}
                  style={{ color: 'var(--text-muted)' }}
                />
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Assignee
                </span>
              </div>
              <p
                className="text-sm"
                style={{
                  color: task.assignee
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                  fontStyle: task.assignee ? 'normal' : 'italic',
                }}
              >
                {task.assignee ?? 'Unassigned'}
              </p>
            </Card>

            {/* Priority */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Priority
                </span>
              </div>
              <Badge variant={priorityBadgeVariant(task.priority)}>
                {priorityLabel(task.priority)} ({task.priority})
              </Badge>
            </Card>

            {/* Due date */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Clock
                  size={14}
                  style={{ color: 'var(--text-muted)' }}
                />
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Due Date
                </span>
              </div>
              {task.due ? (
                <Tooltip content={absoluteTime(task.due)}>
                  <span
                    className="text-sm"
                    style={{
                      color: isOverdue
                        ? 'var(--accent-red)'
                        : 'var(--text-primary)',
                    }}
                  >
                    {relativeTime(task.due)}
                  </span>
                </Tooltip>
              ) : (
                <span
                  className="text-sm italic"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No due date
                </span>
              )}
            </Card>

            {/* Created date */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Created
                </span>
              </div>
              <Tooltip content={absoluteTime(task.created)}>
                <span
                  className="text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {relativeTime(task.created)}
                </span>
              </Tooltip>
            </Card>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isUnassigned && (
              <Button
                variant="primary"
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
              >
                {claimMutation.isPending ? 'Claiming...' : 'Claim'}
              </Button>
            )}
            {isAssignedToMe && (
              <Button
                variant="secondary"
                onClick={() => unclaimMutation.mutate()}
                disabled={unclaimMutation.isPending}
              >
                {unclaimMutation.isPending ? 'Unclaiming...' : 'Unclaim'}
              </Button>
            )}
            {!isUnassigned && !isAssignedToMe && (
              <Button variant="secondary" disabled>
                Assigned to {task.assignee}
              </Button>
            )}
          </div>

          {/* Variables section */}
          <Card title="Form Variables">
            {variablesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height={20} />
                ))}
              </div>
            ) : variablesQuery.isError ? (
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Failed to load variables.
              </p>
            ) : Object.keys(variables).length === 0 ? (
              <p
                className="text-sm italic"
                style={{ color: 'var(--text-muted)' }}
              >
                No form variables.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(variables).map(([key, variable]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-3 pb-2"
                    style={{
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="text-sm font-mono-id shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {key}
                    </span>
                    <div className="text-right">
                      <VariableRenderer variable={variable} name={key} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Complete task section — only when assigned to current user */}
          {isAssignedToMe && !showCompleteForm && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setShowCompleteForm(true)}
            >
              Complete Task
            </Button>
          )}
          {isAssignedToMe && showCompleteForm && (
            <Card title="Complete Task">
              {/* Output variables editor */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs uppercase tracking-wider font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Output Variables
                  </span>
                  <button
                    type="button"
                    onClick={addOutputVar}
                    className="inline-flex items-center gap-1 text-xs cursor-pointer bg-transparent border-none"
                    style={{ color: 'var(--accent-blue)' }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {outputVars.length === 0 && (
                  <p
                    className="text-sm italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No output variables. Click Add to include variables.
                  </p>
                )}

                {outputVars.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 pb-3"
                    style={{
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Variable name"
                        value={v.key}
                        onChange={(e) =>
                          updateOutputVar(idx, 'key', e.target.value)
                        }
                        className="w-full h-8 px-2 text-sm rounded-md outline-none"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex gap-2">
                        <select
                          value={v.type}
                          onChange={(e) =>
                            updateOutputVar(
                              idx,
                              'type',
                              e.target.value,
                            )
                          }
                          className="h-8 px-2 text-sm rounded-md outline-none"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {VARIABLE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Value"
                          value={v.value}
                          onChange={(e) =>
                            updateOutputVar(
                              idx,
                              'value',
                              e.target.value,
                            )
                          }
                          className="flex-1 h-8 px-2 text-sm rounded-md outline-none"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOutputVar(idx)}
                      className="p-1.5 mt-1 rounded-md cursor-pointer bg-transparent border-none hover:bg-elevated"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending
                    ? 'Completing...'
                    : 'Submit'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCompleteForm(false);
                    setOutputVars([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </Drawer>
  );
}
