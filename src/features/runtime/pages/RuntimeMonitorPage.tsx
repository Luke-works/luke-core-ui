import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Button from '@/shared/ui/Button';
import Tooltip from '@/shared/ui/Tooltip';
import { relativeTime } from '@/shared/utils/date';

import {
  getRuntimeStatus,
  startWorker,
  stopWorker,
} from '@/features/runtime/api/endpoints';
import RuntimeStatusBadge from '@/features/runtime/components/RuntimeStatusBadge';
import type { WorkerRuntimeStatus } from '@/features/runtime/api/types';

export default function RuntimeMonitorPage() {
  const queryClient = useQueryClient();

  const runtimeQuery = useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: getRuntimeStatus,
    refetchInterval: 5000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['runtime'] });

  const startMutation = useMutation({
    mutationFn: (w: WorkerRuntimeStatus) =>
      startWorker(w.tenantId, w.environment, w.workerName),
    onSuccess: () => {
      invalidate();
      toast.success('Worker started');
    },
    onError: () => toast.error('Failed to start worker'),
  });

  const stopMutation = useMutation({
    mutationFn: (w: WorkerRuntimeStatus) =>
      stopWorker(w.tenantId, w.environment, w.workerName),
    onSuccess: () => {
      invalidate();
      toast.success('Worker stopped');
    },
    onError: () => toast.error('Failed to stop worker'),
  });

  const columns = useMemo<ColumnDef<WorkerRuntimeStatus, any>[]>(
    () => [
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
        id: 'tenant',
        header: 'Tenant / Env',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {row.original.tenantId} / {row.original.environment}
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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <RuntimeStatusBadge status={getValue<string>()} />,
      },
      {
        id: 'fetch',
        header: 'Fetch',
        enableSorting: false,
        cell: ({ row }) => (
          <RuntimeStatusBadge
            status={row.original.currentFetchActivity ? 'FETCHING' : 'IDLE'}
          />
        ),
      },
      {
        id: 'fetched',
        header: 'Fetched',
        cell: ({ row }) => (
          <span className="text-sm font-mono-id">{row.original.stats.fetched}</span>
        ),
      },
      {
        id: 'completed',
        header: 'Completed',
        cell: ({ row }) => (
          <span className="text-sm font-mono-id">
            {row.original.stats.completed}
          </span>
        ),
      },
      {
        id: 'failed',
        header: 'Failures',
        cell: ({ row }) => (
          <span className="text-sm font-mono-id">{row.original.stats.failed}</span>
        ),
      },
      {
        id: 'bpmn',
        header: 'BPMN',
        cell: ({ row }) => (
          <span className="text-sm font-mono-id">
            {row.original.stats.bpmnErrors}
          </span>
        ),
      },
      {
        accessorKey: 'lastPollAt',
        header: 'Last Poll',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {relativeTime(getValue<string | undefined>())}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Controls',
        enableSorting: false,
        cell: ({ row }) => {
          const worker = row.original;
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="Start worker">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!worker.enabled || startMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    startMutation.mutate(worker);
                  }}
                >
                  <Play size={14} />
                </Button>
              </Tooltip>
              <Tooltip content="Stop worker">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={stopMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    stopMutation.mutate(worker);
                  }}
                >
                  <Square size={14} />
                </Button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [startMutation, stopMutation],
  );

  return (
    <div>
      <PageHeader
        title="Runtime Monitor"
        subtitle="Worker runtime status and controls"
        actions={
          <Button
            variant="secondary"
            size="sm"
            startIcon={<RefreshCw size={14} />}
            onClick={() => runtimeQuery.refetch()}
          >
            Refresh
          </Button>
        }
      />

      <DataTable
        data={runtimeQuery.data?.workers ?? []}
        columns={columns}
        isLoading={runtimeQuery.isLoading}
        emptyMessage="No runtime workers."
      />
    </div>
  );
}
