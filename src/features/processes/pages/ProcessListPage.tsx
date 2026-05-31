import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Play, Eye } from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import SearchInput from '@/shared/ui/SearchInput';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import StatusBadge from '@/shared/ui/StatusBadge';
import Tooltip from '@/shared/ui/Tooltip';
import EmptyState from '@/shared/ui/EmptyState';
import StartInstanceModal from '@/features/processes/components/StartInstanceModal';
import {
  getProcessDefinitions,
  getProcessDefinitionStatistics,
  startProcessInstance,
} from '@/features/processes/api/endpoints';
import type {
  ProcessDefinition,
  ProcessDefinitionStatistics,
  StartProcessBody,
} from '@/features/processes/api/types';

/* ------------------------------------------------------------------ */
/*  Row type combining definition + statistics                         */
/* ------------------------------------------------------------------ */

type ProcessRow = ProcessDefinition & {
  instanceCount: number;
  incidentCount: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProcessListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '0');

  // Which definition the Start Instance modal is open for (null = closed).
  const [startTarget, setStartTarget] = useState<{ id: string; name: string } | null>(null);

  /* ── Data fetching ─────────────────────────────────────────── */

  const {
    data: definitions,
    isLoading: defsLoading,
  } = useQuery({
    queryKey: ['processDefinitions', { firstResult: page * PAGE_SIZE, maxResults: PAGE_SIZE }],
    queryFn: () =>
      getProcessDefinitions({
        firstResult: page * PAGE_SIZE,
        maxResults: PAGE_SIZE,
        sortBy: 'name',
        sortOrder: 'asc',
        latestVersion: true,
      }),
  });

  const { data: statistics } = useQuery({
    queryKey: ['processDefinitionStatistics'],
    queryFn: getProcessDefinitionStatistics,
  });

  /* ── Start instance mutation ───────────────────────────────── */

  const startMutation = useMutation({
    mutationFn: ({ defId, body }: { defId: string; body: StartProcessBody }) =>
      startProcessInstance(defId, body),
    onSuccess: () => {
      toast.success('Process instance started');
      setStartTarget(null);
      queryClient.invalidateQueries({ queryKey: ['processDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['processDefinitionStatistics'] });
    },
    onError: () => {
      toast.error('Failed to start process instance');
    },
  });

  /* ── Build stats lookup ────────────────────────────────────── */

  const statsMap = useMemo(() => {
    const map = new Map<string, ProcessDefinitionStatistics>();
    statistics?.forEach((s) => map.set(s.id, s));
    return map;
  }, [statistics]);

  // Total running instances per process KEY (summed across every version), so
  // the latest-version row reflects instances on older versions too.
  const instancesByKey = useMemo(() => {
    const map = new Map<string, number>();
    statistics?.forEach((s) => {
      const key = s.definition.key;
      map.set(key, (map.get(key) ?? 0) + s.instances);
    });
    return map;
  }, [statistics]);

  /* ── Merge definitions with stats + filter ─────────────────── */

  const rows: ProcessRow[] = useMemo(() => {
    if (!definitions) return [];
    const lowerSearch = search.toLowerCase();
    return definitions
      .map((def) => {
        const stat = statsMap.get(def.id);
        const incidentCount =
          stat?.incidents?.reduce((sum, i) => sum + i.incidentCount, 0) ?? 0;
        return {
          ...def,
          instanceCount: instancesByKey.get(def.key) ?? stat?.instances ?? 0,
          incidentCount,
        };
      })
      .filter((row) => {
        if (!lowerSearch) return true;
        return (
          (row.name ?? '').toLowerCase().includes(lowerSearch) ||
          row.key.toLowerCase().includes(lowerSearch)
        );
      });
  }, [definitions, statsMap, instancesByKey, search]);

  /* ── Columns ───────────────────────────────────────────────── */

  const columns: ColumnDef<ProcessRow, any>[] = useMemo(
    () => [
      {
        accessorKey: 'key',
        header: 'Key',
        cell: ({ row }) => (
          <span
            className="font-mono-id text-xs cursor-pointer hover:underline"
            style={{ color: 'var(--accent-blue)' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/processes/${row.original.id}`);
            }}
          >
            {row.original.key}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) =>
          row.original.name ? (
            <span style={{ color: 'var(--text-primary)' }}>{row.original.name}</span>
          ) : (
            <span className="italic" style={{ color: 'var(--text-muted)' }}>
              Unnamed
            </span>
          ),
      },
      {
        accessorKey: 'version',
        header: () => (
          <Tooltip content="Latest Version Deployed to Engine">
            <span className="cursor-default">Latest Version</span>
          </Tooltip>
        ),
        cell: ({ row }) => <Badge>v{row.original.version}</Badge>,
      },
      {
        accessorKey: 'instanceCount',
        header: () => (
          <Tooltip content="Total ProcessInstances across Versions">
            <span className="cursor-default">Total Instances</span>
          </Tooltip>
        ),
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.original.instanceCount}
          </span>
        ),
      },
      {
        accessorKey: 'suspended',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.suspended ? 'suspended' : 'active'} />
        ),
      },
      {
        id: 'incidents',
        header: 'Incidents',
        cell: ({ row }) =>
          row.original.incidentCount > 0 ? (
            <Badge variant="danger">{row.original.incidentCount}</Badge>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              0
            </span>
          ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              title="View"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/processes/${row.original.id}`);
              }}
            >
              <Eye size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Start instance"
              onClick={(e) => {
                e.stopPropagation();
                setStartTarget({
                  id: row.original.id,
                  name: row.original.name ?? row.original.key,
                });
              }}
            >
              <Play size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  function handleSearchChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('search', value);
    } else {
      next.delete('search');
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

  return (
    <div>
      <PageHeader title="Processes" subtitle="Process definitions" />

      <div className="mb-4" style={{ maxWidth: 400 }}>
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Filter by name or key..."
        />
      </div>

      {!defsLoading && rows.length === 0 && search ? (
        <EmptyState
          icon={<GitBranch size={40} />}
          title="No processes found"
          description={`No process definitions match "${search}".`}
        />
      ) : (
        <Card>
          <DataTable
            data={rows}
            columns={columns}
            isLoading={defsLoading}
            onRowClick={(row) => navigate(`/processes/${row.id}`)}
            pageSize={PAGE_SIZE}
            pageIndex={page}
            total={rows.length < PAGE_SIZE && page === 0 ? rows.length : undefined}
            onPageChange={handlePageChange}
            emptyMessage="No process definitions deployed."
          />
        </Card>
      )}

      <StartInstanceModal
        open={startTarget !== null}
        processName={startTarget?.name ?? ''}
        isSubmitting={startMutation.isPending}
        onClose={() => setStartTarget(null)}
        onSubmit={(body) => {
          if (startTarget) startMutation.mutate({ defId: startTarget.id, body });
        }}
      />
    </div>
  );
}

/* ── Inline Card wrapper (uses Card from ui) ─────────────────── */

function Card({ children }: { children: React.ReactNode }) {
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
