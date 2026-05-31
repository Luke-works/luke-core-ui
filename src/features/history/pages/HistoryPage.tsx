import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';

import PageHeader from '@/shared/layout/PageHeader';
import SearchInput from '@/shared/ui/SearchInput';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Badge from '@/shared/ui/Badge';
import StatusBadge from '@/shared/ui/StatusBadge';
import CopyId from '@/shared/ui/CopyId';
import Drawer from '@/shared/ui/Drawer';
import Tabs from '@/shared/ui/Tabs';
import Tooltip from '@/shared/ui/Tooltip';
import EmptyState from '@/shared/ui/EmptyState';
import VariableRenderer from '@/shared/ui/VariableRenderer';
import {
  getHistoricProcessInstances,
  getHistoricActivityInstances,
  getHistoricVariableInstances,
} from '@/features/history/api/endpoints';
import type {
  HistoricProcessInstance,
  HistoricActivityInstance,
  HistoricVariableInstance,
} from '@/features/history/api/types';
import { relativeTime, absoluteTime, formatDuration } from '@/shared/utils/date';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;

const DRAWER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activities', label: 'Activity Timeline' },
  { id: 'variables', label: 'Variables' },
];

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mapStateToStatus(state: string): 'running' | 'completed' | 'suspended' | 'incident' | 'active' | 'failed' {
  switch (state) {
    case 'ACTIVE':
      return 'running';
    case 'COMPLETED':
      return 'completed';
    case 'SUSPENDED':
      return 'suspended';
    case 'EXTERNALLY_TERMINATED':
    case 'INTERNALLY_TERMINATED':
      return 'incident';
    default:
      return 'active';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const processKey = searchParams.get('processKey') ?? '';
  const startedAfter = searchParams.get('startedAfter') ?? '';
  const startedBefore = searchParams.get('startedBefore') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const businessKey = searchParams.get('businessKey') ?? '';
  const page = Number(searchParams.get('page') ?? '0');

  const [selectedInstance, setSelectedInstance] = useState<HistoricProcessInstance | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');

  /* ── Build query params ────────────────────────────────────── */

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      sortBy: 'startTime',
      sortOrder: 'desc',
      firstResult: page * PAGE_SIZE,
      maxResults: PAGE_SIZE,
    };
    if (processKey) params.processDefinitionKey = processKey;
    if (startedAfter) params.startedAfter = `${startedAfter}T00:00:00.000+0000`;
    if (startedBefore) params.startedBefore = `${startedBefore}T23:59:59.999+0000`;
    if (statusFilter === 'finished') params.finished = true;
    if (statusFilter === 'unfinished') params.unfinished = true;
    if (businessKey) params.processInstanceBusinessKey = businessKey;
    return params;
  }, [processKey, startedAfter, startedBefore, statusFilter, businessKey, page]);

  /* ── Data fetching ─────────────────────────────────────────── */

  const { data: instances, isLoading } = useQuery({
    queryKey: ['historicProcessInstances', queryParams],
    queryFn: () => getHistoricProcessInstances(queryParams),
  });

  /* ── Drawer: activities ────────────────────────────────────── */

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['historicActivities', selectedInstance?.id],
    queryFn: () =>
      getHistoricActivityInstances({
        processInstanceId: selectedInstance!.id,
        sortBy: 'startTime',
        sortOrder: 'asc',
      }),
    enabled: !!selectedInstance && drawerTab === 'activities',
  });

  /* ── Drawer: variables ─────────────────────────────────────── */

  const { data: variables, isLoading: variablesLoading } = useQuery({
    queryKey: ['historicVariables', selectedInstance?.id],
    queryFn: () =>
      getHistoricVariableInstances({
        processInstanceId: selectedInstance!.id,
      }),
    enabled: !!selectedInstance && drawerTab === 'variables',
  });

  /* ── Columns ───────────────────────────────────────────────── */

  const columns: ColumnDef<HistoricProcessInstance, any>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Instance ID',
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <CopyId id={row.original.id} />
          </span>
        ),
      },
      {
        accessorKey: 'processDefinitionKey',
        header: 'Process',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.original.processDefinitionName ?? row.original.processDefinitionKey}
          </span>
        ),
      },
      {
        accessorKey: 'businessKey',
        header: 'Business Key',
        cell: ({ row }) =>
          row.original.businessKey ? (
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {row.original.businessKey}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              -
            </span>
          ),
      },
      {
        accessorKey: 'startTime',
        header: 'Start Time',
        cell: ({ row }) => (
          <Tooltip content={absoluteTime(row.original.startTime)}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {relativeTime(row.original.startTime)}
            </span>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'endTime',
        header: 'End Time',
        cell: ({ row }) =>
          row.original.endTime ? (
            <Tooltip content={absoluteTime(row.original.endTime)}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {relativeTime(row.original.endTime)}
              </span>
            </Tooltip>
          ) : (
            <Badge variant="info">Running</Badge>
          ),
      },
      {
        accessorKey: 'durationInMillis',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatDuration(row.original.durationInMillis)}
          </span>
        ),
      },
      {
        accessorKey: 'state',
        header: 'State',
        cell: ({ row }) => (
          <StatusBadge status={mapStateToStatus(row.original.state)} />
        ),
      },
    ],
    [],
  );

  /* ── URL param helpers ─────────────────────────────────────── */

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '0');
    setSearchParams(next, { replace: true });
  }

  function handlePageChange(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next, { replace: true });
  }

  /* ── Render ────────────────────────────────────────────────── */

  const rows = instances ?? [];

  return (
    <div>
      <PageHeader title="History" subtitle="Historic process instances" />

      {/* Filter bar */}
      <div className="flex flex-row flex-wrap gap-3 mb-4">
        <div style={{ width: 200 }}>
          <SearchInput
            value={processKey}
            onChange={(v) => setParam('processKey', v)}
            placeholder="Process key..."
          />
        </div>
        <input
          type="date"
          value={startedAfter}
          onChange={(e) => setParam('startedAfter', e.target.value)}
          className="rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1"
          style={INPUT_STYLE}
          placeholder="Started after"
        />
        <input
          type="date"
          value={startedBefore}
          onChange={(e) => setParam('startedBefore', e.target.value)}
          className="rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1"
          style={INPUT_STYLE}
          placeholder="Started before"
        />
        <select
          value={statusFilter}
          onChange={(e) => setParam('status', e.target.value)}
          className="rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1"
          style={INPUT_STYLE}
        >
          <option value="">All</option>
          <option value="finished">Finished</option>
          <option value="unfinished">Unfinished</option>
        </select>
        <input
          type="text"
          value={businessKey}
          onChange={(e) => setParam('businessKey', e.target.value)}
          placeholder="Business key..."
          className="rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1"
          style={INPUT_STYLE}
        />
      </div>

      {/* Table */}
      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={<Clock size={40} />}
          title="No historic instances"
          description="No historic process instances match the current filters."
        />
      ) : (
        <TableCard>
          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(row) => {
              setSelectedInstance(row);
              setDrawerTab('overview');
            }}
            pageSize={PAGE_SIZE}
            pageIndex={page}
            total={rows.length < PAGE_SIZE && page === 0 ? rows.length : undefined}
            onPageChange={handlePageChange}
            emptyMessage="No historic process instances."
          />
        </TableCard>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedInstance}
        onClose={() => setSelectedInstance(null)}
        title="Process Instance"
        width={560}
      >
        {selectedInstance && (
          <Tabs tabs={DRAWER_TABS} activeTab={drawerTab} onChange={setDrawerTab}>
            <div className="pt-4">
              {drawerTab === 'overview' && (
                <OverviewTab instance={selectedInstance} />
              )}
              {drawerTab === 'activities' && (
                <ActivitiesTab
                  activities={activities ?? []}
                  isLoading={activitiesLoading}
                />
              )}
              {drawerTab === 'variables' && (
                <VariablesTab
                  variables={variables ?? []}
                  isLoading={variablesLoading}
                />
              )}
            </div>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ instance }: { instance: HistoricProcessInstance }) {
  const fields = [
    { label: 'Instance ID', value: instance.id },
    { label: 'Process Definition', value: instance.processDefinitionName ?? instance.processDefinitionKey },
    { label: 'Business Key', value: instance.businessKey ?? '-' },
    { label: 'Start Time', value: absoluteTime(instance.startTime) },
    { label: 'End Time', value: instance.endTime ? absoluteTime(instance.endTime) : 'Running' },
    { label: 'Duration', value: formatDuration(instance.durationInMillis) },
    { label: 'State', value: instance.state },
    { label: 'Start User', value: instance.startUserId ?? '-' },
  ];

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.label}>
          <dt
            className="text-xs font-medium mb-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {f.label}
          </dt>
          <dd
            className="text-sm font-mono-id"
            style={{ color: 'var(--text-primary)' }}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Timeline Tab                                              */
/* ------------------------------------------------------------------ */

function ActivitiesTab({
  activities,
  isLoading,
}: {
  activities: HistoricActivityInstance[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-md animate-pulse"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No activity instances found.
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div
        className="absolute left-2 top-0 bottom-0 w-px"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {activities.map((act) => (
        <div key={act.id} className="relative pb-5 last:pb-0">
          {/* Dot */}
          <div
            className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2"
            style={{
              borderColor: act.endTime ? 'var(--text-muted)' : 'var(--accent-green)',
              backgroundColor: act.endTime ? 'var(--bg-surface)' : 'var(--accent-green)',
            }}
          />

          {/* Content */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {act.activityName ?? act.activityId}
              </span>
              <Badge variant="muted">{act.activityType}</Badge>
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>{absoluteTime(act.startTime)}</span>
              <span>-</span>
              <span>{act.endTime ? absoluteTime(act.endTime) : 'In progress'}</span>
              {act.durationInMillis != null && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>{formatDuration(act.durationInMillis)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Variables Tab                                                       */
/* ------------------------------------------------------------------ */

function VariablesTab({
  variables,
  isLoading,
}: {
  variables: HistoricVariableInstance[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-md animate-pulse"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          />
        ))}
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No variables found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {variables.map((v) => (
        <div
          key={v.id}
          className="flex items-start justify-between gap-4 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-sm font-medium font-mono-id"
              style={{ color: 'var(--text-primary)' }}
            >
              {v.name}
            </span>
            <Badge variant="muted">{v.type}</Badge>
          </div>
          <div className="text-right">
            <VariableRenderer variable={{ value: v.value, type: v.type }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table Card wrapper                                                 */
/* ------------------------------------------------------------------ */

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
