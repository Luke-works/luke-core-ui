import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { pollWithBackoff } from '@/shared/hooks/pollingBackoff';

import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import StatusBadge from '@/shared/ui/StatusBadge';
import CopyId from '@/shared/ui/CopyId';
import { absoluteTime, relativeTime, formatDuration } from '@/shared/utils/date';

import { getRuntimeLogs } from '@/features/runtime/api/endpoints';
import type {
  ExecutionLogEntry,
  RuntimeLogFilters,
} from '@/features/runtime/api/types';

const EMPTY_FILTERS: RuntimeLogFilters = {
  workerName: '',
  topicName: '',
  status: '',
  processInstanceId: '',
  externalTaskId: '',
  search: '',
};

function FilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-theme-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
      />
    </label>
  );
}

export default function LogsPage() {
  const [filters, setFilters] = useState<RuntimeLogFilters>(EMPTY_FILTERS);

  const logsQuery = useQuery({
    queryKey: ['runtime', 'logs', filters],
    queryFn: () => getRuntimeLogs(filters),
    refetchInterval: pollWithBackoff(5000),
  });

  const setField = (key: keyof RuntimeLogFilters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const columns = useMemo<ColumnDef<ExecutionLogEntry, any>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ getValue }) => {
          const ts = getValue<string>();
          return (
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
              title={absoluteTime(ts)}
            >
              {relativeTime(ts)}
            </span>
          );
        },
      },
      {
        id: 'tenant',
        header: 'Tenant / Env',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {row.original.tenantId} / {row.original.environment}
          </span>
        ),
      },
      {
        accessorKey: 'workerName',
        header: 'Worker',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'topicName',
        header: 'Topic',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono-id">{getValue<string>()}</span>
        ),
      },
      {
        id: 'task',
        header: 'Task',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.externalTaskId ? (
            <CopyId id={row.original.externalTaskId} />
          ) : (
            <span className="text-sm text-gray-400">-</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatDuration(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Message',
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {getValue<string | undefined>() ?? '-'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Logs"
        subtitle="Worker execution logs"
        actions={
          <Button
            variant="secondary"
            size="sm"
            startIcon={<RefreshCw size={14} />}
            onClick={() => logsQuery.refetch()}
          >
            Refresh
          </Button>
        }
      />

      <div className="mb-4">
        <Card>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <FilterField label="Worker" value={filters.workerName ?? ''} onChange={setField('workerName')} />
            <FilterField label="Topic" value={filters.topicName ?? ''} onChange={setField('topicName')} />
            <FilterField label="Status" value={filters.status ?? ''} onChange={setField('status')} />
            <FilterField label="Process" value={filters.processInstanceId ?? ''} onChange={setField('processInstanceId')} />
            <FilterField label="Task" value={filters.externalTaskId ?? ''} onChange={setField('externalTaskId')} />
            <FilterField label="Search" value={filters.search ?? ''} onChange={setField('search')} />
          </div>
        </Card>
      </div>

      <DataTable
        data={logsQuery.data ?? []}
        columns={columns}
        isLoading={logsQuery.isLoading}
        emptyMessage="No matching logs."
      />
    </div>
  );
}
