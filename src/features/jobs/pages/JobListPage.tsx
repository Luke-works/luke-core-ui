import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollWithBackoff } from '@/shared/hooks/pollingBackoff';
import { useAuthz } from '@/features/auth/hooks/useAuthz';
import { RefreshCw, Eye, Play, Pause, FileCode } from 'lucide-react';
import { toast } from 'sonner';

import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import StatusBadge from '@/shared/ui/StatusBadge';
import CopyId from '@/shared/ui/CopyId';
import Tooltip from '@/shared/ui/Tooltip';
import Tabs from '@/shared/ui/Tabs';
import StackTraceModal from '@/shared/ui/StackTraceModal';
import EmptyState from '@/shared/ui/EmptyState';
import PageHeader from '@/shared/layout/PageHeader';

import {
  getJobs,
  retryJob,
  suspendJob,
  getJobDefinitions,
  suspendJobDefinition,
} from '@/features/jobs/api/endpoints';
import { relativeTime } from '@/shared/utils/date';
import { truncateId } from '@/shared/utils/camunda';

import type { Job, JobDefinition } from '@/features/jobs/api/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'failed', label: 'Failed Jobs' },
  { id: 'all', label: 'All Jobs' },
  { id: 'definitions', label: 'Job Definitions' },
];

function truncateMessage(msg: string | null, max = 60): string {
  if (!msg) return '-';
  return msg.length > max ? `${msg.slice(0, max)}...` : msg;
}

// ---------------------------------------------------------------------------
// Failed Jobs Tab
// ---------------------------------------------------------------------------

function FailedJobsTab({
  onOpenStacktrace,
}: {
  onOpenStacktrace: (jobId: string) => void;
}) {
  const queryClient = useQueryClient();

  const failedJobsQuery = useQuery({
    queryKey: ['jobs', 'failed'],
    queryFn: () =>
      getJobs({
        withException: true,
        maxResults: 50,
        sortBy: 'jobId',
        sortOrder: 'desc',
      }),
    refetchInterval: pollWithBackoff(30000),
  });

  const { can } = useAuthz();
  const canOperate = can('operate');

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retryJob(jobId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job retry triggered');
    },
    onError: () => {
      toast.error('Failed to retry job');
    },
  });

  const columns = useMemo<ColumnDef<Job, any>[]>(
    () => [
      {
        id: 'jobId',
        header: 'Job ID',
        cell: ({ row }) => <CopyId id={row.original.id} />,
      },
      {
        id: 'process',
        header: 'Process',
        cell: ({ row }) => {
          const key = row.original.processDefinitionKey || row.original.processDefinitionId;
          return (
            <span className="text-sm font-mono-id" title={key}>
              {truncateId(key)}
            </span>
          );
        },
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {relativeTime(getValue<string | null>())}
          </span>
        ),
      },
      {
        accessorKey: 'exceptionMessage',
        header: 'Exception',
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
        accessorKey: 'retries',
        header: 'Retries',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono-id">{getValue<number>()}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="flex items-center gap-1">
              {canOperate && (
                <Tooltip content="Retry job">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryMutation.mutate(job.id);
                    }}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw size={14} />
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="View stack trace">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStacktrace(job.id);
                  }}
                >
                  <FileCode size={14} />
                </Button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [retryMutation, onOpenStacktrace, canOperate],
  );

  const data = failedJobsQuery.data ?? [];

  if (!failedJobsQuery.isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={<RefreshCw size={40} />}
        title="No failed jobs"
        description="There are no failed jobs at this time."
      />
    );
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={failedJobsQuery.isLoading}
    />
  );
}

// ---------------------------------------------------------------------------
// All Jobs Tab
// ---------------------------------------------------------------------------

function AllJobsTab() {
  const queryClient = useQueryClient();

  const allJobsQuery = useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: () => getJobs({ maxResults: 50 }),
    refetchInterval: pollWithBackoff(30000),
  });

  const { can } = useAuthz();
  const canOperate = can('operate');

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      suspendJob(id, suspended),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(variables.suspended ? 'Job suspended' : 'Job activated');
    },
    onError: () => {
      toast.error('Failed to update job suspension state');
    },
  });

  const columns = useMemo<ColumnDef<Job, any>[]>(
    () => [
      {
        id: 'jobId',
        header: 'Job ID',
        cell: ({ row }) => <CopyId id={row.original.id} />,
      },
      {
        id: 'process',
        header: 'Process',
        cell: ({ row }) => {
          const key = row.original.processDefinitionKey || row.original.processDefinitionId;
          return (
            <span className="text-sm font-mono-id" title={key}>
              {truncateId(key)}
            </span>
          );
        },
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {relativeTime(getValue<string | null>())}
          </span>
        ),
      },
      {
        accessorKey: 'retries',
        header: 'Retries',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono-id">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'suspended',
        header: 'Suspended',
        cell: ({ getValue }) => (
          <StatusBadge status={getValue<boolean>() ? 'suspended' : 'active'} />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          if (!canOperate) return null;
          return (
            <Tooltip content={job.suspended ? 'Activate job' : 'Suspend job'}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  suspendMutation.mutate({
                    id: job.id,
                    suspended: !job.suspended,
                  });
                }}
                disabled={suspendMutation.isPending}
              >
                {job.suspended ? <Play size={14} /> : <Pause size={14} />}
              </Button>
            </Tooltip>
          );
        },
      },
    ],
    [suspendMutation, canOperate],
  );

  const data = allJobsQuery.data ?? [];

  if (!allJobsQuery.isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={<Eye size={40} />}
        title="No jobs"
        description="There are no jobs at this time."
      />
    );
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={allJobsQuery.isLoading}
    />
  );
}

// ---------------------------------------------------------------------------
// Job Definitions Tab
// ---------------------------------------------------------------------------

function JobDefinitionsTab() {
  const queryClient = useQueryClient();

  const definitionsQuery = useQuery({
    queryKey: ['jobDefinitions'],
    queryFn: () => getJobDefinitions({ maxResults: 50 }),
    refetchInterval: pollWithBackoff(30000),
  });

  const { can } = useAuthz();
  const canOperate = can('operate');

  const suspendDefMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      suspendJobDefinition(id, suspended),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(
        variables.suspended
          ? 'Job definition suspended'
          : 'Job definition activated',
      );
    },
    onError: () => {
      toast.error('Failed to update job definition');
    },
  });

  const columns = useMemo<ColumnDef<JobDefinition, any>[]>(
    () => [
      {
        id: 'definitionId',
        header: 'Definition ID',
        cell: ({ row }) => <CopyId id={row.original.id} />,
      },
      {
        accessorKey: 'processDefinitionKey',
        header: 'Process Key',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono-id">{getValue<string>()}</span>
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
        accessorKey: 'jobType',
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge variant="info">{getValue<string>()}</Badge>
        ),
      },
      {
        accessorKey: 'jobConfiguration',
        header: 'Configuration',
        cell: ({ getValue }) => (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'suspended',
        header: 'Suspended',
        cell: ({ getValue }) => (
          <StatusBadge status={getValue<boolean>() ? 'suspended' : 'active'} />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const def = row.original;
          if (!canOperate) return null;
          return (
            <Tooltip
              content={def.suspended ? 'Activate definition' : 'Suspend definition'}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  suspendDefMutation.mutate({
                    id: def.id,
                    suspended: !def.suspended,
                  });
                }}
                disabled={suspendDefMutation.isPending}
              >
                {def.suspended ? <Play size={14} /> : <Pause size={14} />}
              </Button>
            </Tooltip>
          );
        },
      },
    ],
    [suspendDefMutation, canOperate],
  );

  const data = definitionsQuery.data ?? [];

  if (!definitionsQuery.isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={<Eye size={40} />}
        title="No job definitions"
        description="There are no job definitions at this time."
      />
    );
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={definitionsQuery.isLoading}
    />
  );
}

// ---------------------------------------------------------------------------
// Job List Page
// ---------------------------------------------------------------------------

export default function JobListPage() {
  const [activeTab, setActiveTab] = useState('failed');
  const [stacktraceJobId, setStacktraceJobId] = useState<string | null>(null);

  const openStacktrace = useCallback((jobId: string) => {
    setStacktraceJobId(jobId);
  }, []);

  // ---- Render --------------------------------------------------------------

  return (
    <div>
      <PageHeader title="Jobs" subtitle="Job management" />

      <Card>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
          <div className="pt-4">
            {activeTab === 'failed' && (
              <FailedJobsTab onOpenStacktrace={openStacktrace} />
            )}
            {activeTab === 'all' && <AllJobsTab />}
            {activeTab === 'definitions' && <JobDefinitionsTab />}
          </div>
        </Tabs>
      </Card>

      {/* Stack Trace Modal */}
      <StackTraceModal
        jobId={stacktraceJobId}
        onClose={() => setStacktraceJobId(null)}
      />
    </div>
  );
}
