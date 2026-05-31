import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, ChevronRight } from 'lucide-react';

import PageHeader from '@/shared/layout/PageHeader';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Badge from '@/shared/ui/Badge';
import EmptyState from '@/shared/ui/EmptyState';
import {
  getDecisionDefinitions,
  type DecisionDefinition,
} from '@/features/decisions/api/endpoints';

const PAGE_SIZE = 20;

export default function DecisionListPage() {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const { data: decisions, isLoading } = useQuery({
    queryKey: ['decisionDefinitions', { firstResult: page * PAGE_SIZE, maxResults: PAGE_SIZE }],
    queryFn: () =>
      getDecisionDefinitions({
        sortBy: 'key',
        sortOrder: 'asc',
        latestVersion: true,
        firstResult: page * PAGE_SIZE,
        maxResults: PAGE_SIZE,
      }),
  });

  const columns: ColumnDef<DecisionDefinition, any>[] = useMemo(
    () => [
      {
        accessorKey: 'key',
        header: 'Key',
        cell: ({ row }) => (
          <span className="font-mono-id text-xs" style={{ color: 'var(--text-primary)' }}>
            {row.original.key}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) =>
          row.original.name ? (
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {row.original.name}
            </span>
          ) : (
            <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
              Unnamed
            </span>
          ),
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => <Badge>v{row.original.version}</Badge>,
      },
      {
        accessorKey: 'tenantId',
        header: 'Tenant ID',
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: row.original.tenantId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {row.original.tenantId ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 40,
        cell: () => (
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        ),
      },
    ],
    [],
  );

  const rows = decisions ?? [];

  return (
    <div>
      <PageHeader title="Decisions" subtitle="Decision definitions (DMN)" />

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          icon={<GitPullRequest size={40} />}
          title="No decisions"
          description="No decision definitions found in the engine."
        />
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/decisions/${row.id}`)}
            pageSize={PAGE_SIZE}
            pageIndex={page}
            total={rows.length < PAGE_SIZE && page === 0 ? rows.length : undefined}
            onPageChange={setPage}
            emptyMessage="No decision definitions deployed."
          />
        </div>
      )}
    </div>
  );
}
