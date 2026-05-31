import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Filter } from 'lucide-react';

import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import Tabs from '@/shared/ui/Tabs';
import Tooltip from '@/shared/ui/Tooltip';
import EmptyState from '@/shared/ui/EmptyState';
import PageHeader from '@/shared/layout/PageHeader';

import { getTasks, getTaskCount } from '@/features/tasks/api/endpoints';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { relativeTime, absoluteTime } from '@/shared/utils/date';
import { priorityLabel } from '@/shared/utils/camunda';

import type { Task } from '@/features/tasks/api/types';

import TaskDetailDrawer from './TaskDetailPage';

/* ── Constants ────────────────────────────────────────────── */

const PAGE_SIZE = 20;

const ASSIGNMENT_TABS = [
  { id: 'mine', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'all', label: 'All' },
] as const;

const PRIORITY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Low (0-25)', value: '0-25' },
  { label: 'Medium (26-50)', value: '26-50' },
  { label: 'High (51-75)', value: '51-75' },
  { label: 'Critical (76+)', value: '76-100' },
] as const;

/* ── Priority badge variant ───────────────────────────────── */

function priorityBadgeVariant(
  priority: number,
): 'danger' | 'warning' | 'info' | 'muted' {
  if (priority >= 76) return 'danger';
  if (priority >= 51) return 'warning';
  if (priority >= 26) return 'info';
  return 'muted';
}

/* ── Shared input style ───────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

/* ── Component ────────────────────────────────────────────── */

export default function TaskListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const username = useAuthStore((s) => s.username);

  /* ── URL-driven state ─────────────────────────────────── */

  const activeTab =
    (searchParams.get('tab') as 'mine' | 'unassigned' | 'all') ?? 'mine';
  const page = parseInt(searchParams.get('page') ?? '0', 10);

  /* ── Local filter form state (not yet applied) ────────── */

  const [processKey, setProcessKey] = useState(
    searchParams.get('processDefinitionKey') ?? '',
  );
  const [priorityRange, setPriorityRange] = useState(
    searchParams.get('priority') ?? '',
  );
  const [dueBefore, setDueBefore] = useState(
    searchParams.get('dueBefore') ?? '',
  );
  const [dueAfter, setDueAfter] = useState(
    searchParams.get('dueAfter') ?? '',
  );

  /* ── Selected task for drawer ─────────────────────────── */

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    searchParams.get('taskId'),
  );

  /* ── Build query params ───────────────────────────────── */

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      maxResults: PAGE_SIZE,
      firstResult: page * PAGE_SIZE,
      sortBy: 'created',
      sortOrder: 'desc',
    };

    // Assignment filter
    if (activeTab === 'mine' && username) {
      params.assignee = username;
    } else if (activeTab === 'unassigned') {
      params.unassigned = true;
    }

    // Process definition key
    const pKey = searchParams.get('processDefinitionKey');
    if (pKey) {
      params.processDefinitionKeyLike = `%${pKey}%`;
    }

    // Priority
    const pRange = searchParams.get('priority');
    if (pRange) {
      const [min, max] = pRange.split('-').map(Number);
      if (!isNaN(min)) params.minPriority = min;
      if (!isNaN(max)) params.maxPriority = max;
    }

    // Due dates
    const db = searchParams.get('dueBefore');
    if (db) {
      params.dueBefore = new Date(db).toISOString();
    }
    const da = searchParams.get('dueAfter');
    if (da) {
      params.dueAfter = new Date(da).toISOString();
    }

    return params;
  }, [activeTab, username, page, searchParams]);

  /* ── Count params (same filters, no pagination) ───────── */

  const countParams = useMemo(() => {
    const { maxResults, firstResult, sortBy, sortOrder, ...rest } =
      queryParams;
    return rest;
  }, [queryParams]);

  /* ── Queries ──────────────────────────────────────────── */

  const tasksQuery = useQuery({
    queryKey: ['tasks', queryParams],
    queryFn: () => getTasks(queryParams),
  });

  const countQuery = useQuery({
    queryKey: ['tasks', 'count', countParams],
    queryFn: () => getTaskCount(countParams),
  });

  /* ── Tab change handler ───────────────────────────────── */

  function handleTabChange(tabId: string) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    next.set('page', '0');
    setSearchParams(next);
  }

  /* ── Apply / clear filters ───────────────────────────── */

  function applyFilters() {
    const next = new URLSearchParams(searchParams);
    next.set('page', '0');

    if (processKey.trim()) {
      next.set('processDefinitionKey', processKey.trim());
    } else {
      next.delete('processDefinitionKey');
    }

    if (priorityRange) {
      next.set('priority', priorityRange);
    } else {
      next.delete('priority');
    }

    if (dueBefore) {
      next.set('dueBefore', dueBefore);
    } else {
      next.delete('dueBefore');
    }

    if (dueAfter) {
      next.set('dueAfter', dueAfter);
    } else {
      next.delete('dueAfter');
    }

    setSearchParams(next);
  }

  function clearFilters() {
    setProcessKey('');
    setPriorityRange('');
    setDueBefore('');
    setDueAfter('');

    const next = new URLSearchParams();
    next.set('tab', activeTab);
    next.set('page', '0');
    setSearchParams(next);
  }

  /* ── Page change ──────────────────────────────────────── */

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  /* ── Table columns ────────────────────────────────────── */

  const columns: ColumnDef<Task, any>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => (
          <span style={{ color: 'var(--text-primary)' }}>
            {getValue() ?? 'Untitled'}
          </span>
        ),
      },
      {
        accessorKey: 'processDefinitionId',
        header: 'Process',
        cell: ({ getValue }) => {
          const val = getValue() as string;
          const truncated =
            val.length > 28 ? val.slice(0, 28) + '...' : val;
          return (
            <Tooltip content={val}>
              <span
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {truncated}
              </span>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Assignee',
        cell: ({ getValue }) => {
          const assignee = getValue() as string | null;
          return assignee ? (
            <span style={{ color: 'var(--text-primary)' }}>
              {assignee}
            </span>
          ) : (
            <span
              className="italic"
              style={{ color: 'var(--text-muted)' }}
            >
              Unassigned
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => {
          const priority = getValue() as number;
          return (
            <Badge variant={priorityBadgeVariant(priority)}>
              {priorityLabel(priority)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created',
        header: 'Created',
        cell: ({ getValue }) => {
          const val = getValue() as string;
          return (
            <Tooltip content={absoluteTime(val)}>
              <span
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {relativeTime(val)}
              </span>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'due',
        header: 'Due',
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          if (!val) {
            return (
              <span
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                -
              </span>
            );
          }
          const isOverdue = new Date(val) < new Date();
          return (
            <Tooltip content={absoluteTime(val)}>
              <span
                className="text-sm"
                style={{
                  color: isOverdue
                    ? 'var(--accent-red)'
                    : 'var(--text-secondary)',
                }}
              >
                {relativeTime(val)}
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(row.original.id);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [],
  );

  /* ── Render ──────────────────────────────────────────── */

  const hasFilters =
    searchParams.has('processDefinitionKey') ||
    searchParams.has('priority') ||
    searchParams.has('dueBefore') ||
    searchParams.has('dueAfter');

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Manage and complete user tasks"
      />

      <div className="flex gap-0" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {/* ── Left sidebar ───────────────────────────────── */}
        <div
          className="shrink-0"
          style={{
            width: 240,
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Assignment tabs */}
          <Tabs
            tabs={[...ASSIGNMENT_TABS]}
            activeTab={activeTab}
            onChange={handleTabChange}
          >
            <div className="p-4 space-y-4">
              {/* Filter header */}
              <div className="flex items-center gap-2">
                <Filter
                  size={14}
                  style={{ color: 'var(--text-muted)' }}
                />
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Filters
                </span>
              </div>

              {/* Process definition key */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Process Definition Key
                </label>
                <input
                  type="text"
                  value={processKey}
                  onChange={(e) => setProcessKey(e.target.value)}
                  placeholder="e.g. invoice-process"
                  className="w-full h-8 px-2 text-sm rounded-md outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Priority */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Priority
                </label>
                <select
                  value={priorityRange}
                  onChange={(e) => setPriorityRange(e.target.value)}
                  className="w-full h-8 px-2 text-sm rounded-md outline-none"
                  style={inputStyle}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date: after */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Due After
                </label>
                <input
                  type="date"
                  value={dueAfter}
                  onChange={(e) => setDueAfter(e.target.value)}
                  className="w-full h-8 px-2 text-sm rounded-md outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Due date: before */}
              <div>
                <label
                  className="block text-xs mb-1.5 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Due Before
                </label>
                <input
                  type="date"
                  value={dueBefore}
                  onChange={(e) => setDueBefore(e.target.value)}
                  className="w-full h-8 px-2 text-sm rounded-md outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearFilters}
                  disabled={!hasFilters && !processKey && !priorityRange && !dueBefore && !dueAfter}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Tabs>
        </div>

        {/* ── Main area ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!tasksQuery.isLoading &&
          !tasksQuery.isError &&
          tasksQuery.data?.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={40} />}
              title="No tasks found"
              description={
                hasFilters
                  ? 'No tasks match the current filters. Try adjusting your criteria.'
                  : activeTab === 'mine'
                    ? 'You have no tasks assigned to you.'
                    : activeTab === 'unassigned'
                      ? 'There are no unassigned tasks.'
                      : 'There are no tasks in the system.'
              }
              action={
                hasFilters
                  ? { label: 'Clear Filters', onClick: clearFilters }
                  : undefined
              }
            />
          ) : (
            <DataTable<Task>
              data={tasksQuery.data ?? []}
              columns={columns}
              isLoading={tasksQuery.isLoading}
              onRowClick={(row) => setSelectedTaskId(row.id)}
              pageSize={PAGE_SIZE}
              pageIndex={page}
              total={countQuery.data?.count}
              onPageChange={handlePageChange}
              emptyMessage="No tasks found."
            />
          )}
        </div>
      </div>

      {/* ── Task detail drawer ───────────────────────────── */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
