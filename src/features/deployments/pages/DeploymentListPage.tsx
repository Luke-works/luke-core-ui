import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Trash2, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Button from '@/shared/ui/Button';
import IdLink from '@/shared/ui/IdLink';
import Tooltip from '@/shared/ui/Tooltip';
import EmptyState from '@/shared/ui/EmptyState';
import {
  getDeployments,
  getDeploymentResources,
  deleteDeployment,
  type Deployment,
  type DeploymentResource,
} from '@/features/deployments/api/endpoints';
import { relativeTime, absoluteTime } from '@/shared/utils/date';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DeploymentListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [expandedDeploymentId, setExpandedDeploymentId] = useState<string | null>(null);

  /* ── Data fetching ─────────────────────────────────────────── */

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments', { firstResult: page * PAGE_SIZE, maxResults: PAGE_SIZE }],
    queryFn: () =>
      getDeployments({
        sortBy: 'deploymentTime',
        sortOrder: 'desc',
        firstResult: page * PAGE_SIZE,
        maxResults: PAGE_SIZE,
      }),
  });

  /* ── Expanded row resources ────────────────────────────────── */

  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['deploymentResources', expandedDeploymentId],
    queryFn: () => getDeploymentResources(expandedDeploymentId!),
    enabled: !!expandedDeploymentId,
  });

  /* ── Delete mutation ───────────────────────────────────────── */

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeployment(id, true),
    onSuccess: () => {
      toast.success('Deployment deleted');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setExpandedDeploymentId(null);
    },
    onError: () => {
      toast.error('Failed to delete deployment');
    },
  });

  function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this deployment? This will cascade-delete all related resources.',
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  }

  /* ── Columns ───────────────────────────────────────────────── */

  const columns: ColumnDef<Deployment, any>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <IdLink id={row.original.id} to={`/deployments/${row.original.id}`} />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: 'deploymentTime',
        header: 'Deploy Time',
        cell: ({ row }) => (
          <Tooltip content={absoluteTime(row.original.deploymentTime)}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {relativeTime(row.original.deploymentTime)}
            </span>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) =>
          row.original.source ? (
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {row.original.source}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              -
            </span>
          ),
      },
      {
        id: 'resources',
        header: 'Resources',
        enableSorting: false,
        cell: ({ row }) => {
          const isExpanded = expandedDeploymentId === row.original.id;
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm cursor-pointer bg-transparent border-none p-0 transition-colors hover:underline"
              style={{ color: 'var(--accent-blue)' }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDeploymentId(isExpanded ? null : row.original.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>View</span>
            </button>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              title="Delete deployment"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id);
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
            </Button>
          </div>
        ),
      },
    ],
    [expandedDeploymentId, deleteMutation.isPending],
  );

  /* ── Render ────────────────────────────────────────────────── */

  const rows = deployments ?? [];

  return (
    <div>
      <PageHeader title="Deployments" subtitle="Deployment management" />

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title="No deployments"
          description="No deployments found in the engine."
        />
      ) : (
        <TableCard>
          {/* Custom table rendering with expandable rows */}
          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            pageSize={PAGE_SIZE}
            pageIndex={page}
            total={rows.length < PAGE_SIZE && page === 0 ? rows.length : undefined}
            onPageChange={setPage}
            emptyMessage="No deployments found."
          />

          {/* Expanded resource sub-rows */}
          {expandedDeploymentId && (
            <ExpandedResources
              deploymentId={expandedDeploymentId}
              resources={resources ?? []}
              isLoading={resourcesLoading}
            />
          )}
        </TableCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expanded Resources                                                 */
/* ------------------------------------------------------------------ */

function ExpandedResources({
  resources,
  isLoading,
}: {
  deploymentId: string;
  resources: DeploymentResource[];
  isLoading: boolean;
}) {
  return (
    <div
      className="px-6 py-3"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        Resources
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded-md animate-pulse"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No resources found.
        </p>
      ) : (
        <div className="space-y-1">
          {resources.map((res) => (
            <div
              key={res.id}
              className="flex items-center gap-2 py-1.5 px-3 rounded-md"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <FileCode size={14} style={{ color: 'var(--text-muted)' }} />
              <span
                className="text-sm font-mono-id"
                style={{ color: 'var(--text-primary)' }}
              >
                {res.name}
              </span>
            </div>
          ))}
        </div>
      )}
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
