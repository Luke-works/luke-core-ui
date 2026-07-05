import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollWithBackoff } from '@/shared/hooks/pollingBackoff';
import { AlertTriangle, RefreshCw, Trash2, FileCode } from 'lucide-react';
import { toast } from 'sonner';

import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import ConfirmButton from '@/shared/ui/ConfirmButton';
import Badge from '@/shared/ui/Badge';
import CopyId from '@/shared/ui/CopyId';
import Tooltip from '@/shared/ui/Tooltip';
import StackTraceModal from '@/shared/ui/StackTraceModal';
import EmptyState from '@/shared/ui/EmptyState';
import PageHeader from '@/shared/layout/PageHeader';

import { getIncidents, getIncidentCount, deleteIncident } from '@/features/incidents/api/endpoints';
import { retryJob } from '@/features/jobs/api/endpoints';
import { useAuthz } from '@/features/auth/hooks/useAuthz';
import { relativeTime } from '@/shared/utils/date';


import type { Incident } from '@/features/incidents/api/types';

// ---------------------------------------------------------------------------
// Group-by options
// ---------------------------------------------------------------------------

type GroupBy = 'process' | 'type' | 'activity';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'process', label: 'by Process' },
  { value: 'type', label: 'by Type' },
  { value: 'activity', label: 'by Activity' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateMessage(msg: string | null, max = 60): string {
  if (!msg) return '-';
  return msg.length > max ? `${msg.slice(0, max)}...` : msg;
}

// ---------------------------------------------------------------------------
// Incident List Page
// ---------------------------------------------------------------------------

export default function IncidentListPage() {
  const queryClient = useQueryClient();

  // ---- Local state ---------------------------------------------------------

  const [groupBy, setGroupBy] = useState<GroupBy>('process');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stacktraceJobId, setStacktraceJobId] = useState<string | null>(null);

  const pageSize = 20;

  // ---- Queries -------------------------------------------------------------

  const incidentsQuery = useQuery({
    queryKey: ['incidents', page, groupBy],
    queryFn: () =>
      getIncidents({
        sortBy: 'incidentTimestamp',
        sortOrder: 'desc',
        maxResults: pageSize,
        firstResult: page * pageSize,
      }),
    refetchInterval: pollWithBackoff(30000),
  });

  const countQuery = useQuery({
    queryKey: ['incidents', 'count'],
    queryFn: () => getIncidentCount(),
    refetchInterval: pollWithBackoff(30000),
  });

  // ---- Mutations -----------------------------------------------------------

  const { can } = useAuthz();
  const canOperate = can('operate');

  // Resolving/retrying an incident changes both the current page AND the total,
  // so invalidate the whole ['incidents'] subtree (list pages keyed by page/group
  // + the count) — narrow enough to not touch unrelated features (#42).
  const invalidateIncidents = () =>
    queryClient.invalidateQueries({ queryKey: ['incidents'] });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retryJob(jobId, 1),
    onSuccess: () => {
      invalidateIncidents();
      toast.success('Job retry triggered');
    },
    onError: () => {
      toast.error('Failed to retry job');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (incidentId: string) => deleteIncident(incidentId),
    onSuccess: () => {
      invalidateIncidents();
      toast.success('Incident resolved');
    },
    onError: () => {
      toast.error('Failed to resolve incident');
    },
  });

  // ---- Bulk retry ----------------------------------------------------------

  const handleBulkRetry = useCallback(() => {
    // Bulk actions must re-check the same capability the single-item action does
    // (#34) — the toolbar is already gated, but guard the handler too so it can't
    // fire on a stale-token race.
    if (!canOperate) {
      toast.error('You do not have permission to retry incidents');
      return;
    }
    const incidents = incidentsQuery.data ?? [];
    const selected = incidents.filter((inc) => selectedIds.has(inc.id));
    const retryable = selected.filter((inc) => inc.jobDefinitionId);

    if (retryable.length === 0) {
      toast.error('No retryable incidents selected');
      return;
    }

    retryable.forEach((inc) => retryMutation.mutate(inc.configuration));
    setSelectedIds(new Set());
  }, [incidentsQuery.data, selectedIds, retryMutation, canOperate]);

  // ---- Selection helpers ---------------------------------------------------

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const data = incidentsQuery.data ?? [];
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((inc) => inc.id)));
    }
  }, [incidentsQuery.data, selectedIds.size]);

  // ---- Stack trace modal ---------------------------------------------------

  const openStacktrace = useCallback((jobId: string) => {
    setStacktraceJobId(jobId);
  }, []);

  // ---- Columns -------------------------------------------------------------

  const columns = useMemo<ColumnDef<Incident, any>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={
              (incidentsQuery.data?.length ?? 0) > 0 &&
              selectedIds.size === (incidentsQuery.data?.length ?? 0)
            }
            onChange={toggleAll}
            className="cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelection(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'incidentType',
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge variant="danger">{getValue<string>()}</Badge>
        ),
      },
      {
        accessorKey: 'incidentMessage',
        header: 'Message',
        cell: ({ getValue }) => {
          const message = getValue<string | null>();
          const truncated = truncateMessage(message);
          if (!message || message.length <= 60) {
            return <span className="text-sm">{truncated}</span>;
          }
          return (
            <Tooltip content={message}>
              <span className="text-sm cursor-default">{truncated}</span>
            </Tooltip>
          );
        },
      },
      {
        id: 'process',
        header: 'Process',
        cell: ({ row }) => (
          <CopyId id={row.original.processDefinitionId || row.original.processInstanceId} />
        ),
      },
      {
        accessorKey: 'activityId',
        header: 'Activity',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono-id">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'incidentTimestamp',
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {relativeTime(getValue<string>())}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const incident = row.original;
          return (
            <div className="flex items-center gap-1">
              {canOperate && incident.jobDefinitionId && (
                <Tooltip content="Retry job">
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    aria-label="Retry incident job"
                    disabled={retryMutation.isPending}
                    confirmVariant="primary"
                    confirmTitle="Retry job"
                    confirmMessage="Retry the job behind this incident?"
                    confirmLabel="Retry"
                    onConfirm={() => retryMutation.mutate(incident.configuration)}
                  >
                    <RefreshCw size={14} />
                  </ConfirmButton>
                </Tooltip>
              )}
              {canOperate && (
                <Tooltip content="Resolve incident">
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    aria-label="Resolve incident"
                    disabled={deleteMutation.isPending}
                    confirmTitle="Resolve incident"
                    confirmMessage="Resolve this incident? This deletes it and cannot be undone."
                    confirmLabel="Resolve"
                    onConfirm={() => deleteMutation.mutate(incident.id)}
                  >
                    <Trash2 size={14} />
                  </ConfirmButton>
                </Tooltip>
              )}
              {incident.configuration && (
                <Tooltip content="View stack trace">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="View stack trace"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStacktrace(incident.configuration);
                    }}
                  >
                    <FileCode size={14} />
                  </Button>
                </Tooltip>
              )}
            </div>
          );
        },
      },
    ],
    [
      incidentsQuery.data,
      selectedIds,
      toggleAll,
      toggleSelection,
      retryMutation,
      deleteMutation,
      openStacktrace,
      canOperate,
    ],
  );

  // ---- Render --------------------------------------------------------------

  const incidents = incidentsQuery.data ?? [];
  const total = countQuery.data?.count ?? 0;

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="Active incidents across all processes"
        actions={
          <div className="flex items-center gap-1">
            {GROUP_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={groupBy === opt.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setGroupBy(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <Card>
        {/* Bulk actions bar */}
        {canOperate && selectedIds.size > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2 mb-3 rounded-md"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedIds.size} selected
            </span>
            <ConfirmButton
              variant="primary"
              size="sm"
              confirmVariant="primary"
              confirmTitle="Retry selected incidents"
              confirmMessage={`Retry the jobs behind the ${selectedIds.size} selected incident(s)?`}
              confirmLabel="Retry all"
              onConfirm={handleBulkRetry}
            >
              <RefreshCw size={14} className="mr-1.5" />
              Retry All
            </ConfirmButton>
          </div>
        )}

        {!incidentsQuery.isLoading && incidents.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={40} />}
            title="No incidents"
            description="There are no active incidents at this time."
          />
        ) : (
          <DataTable
            data={incidents}
            columns={columns}
            isLoading={incidentsQuery.isLoading}
            pageSize={pageSize}
            pageIndex={page}
            total={total}
            onPageChange={setPage}
          />
        )}
      </Card>

      {/* Stack Trace Modal */}
      <StackTraceModal
        jobId={stacktraceJobId}
        onClose={() => setStacktraceJobId(null)}
      />
    </div>
  );
}
