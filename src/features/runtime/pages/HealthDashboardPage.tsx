import { useQuery } from '@tanstack/react-query';
import { Activity, FileWarning, HeartPulse, PlugZap } from 'lucide-react';

import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Skeleton from '@/shared/ui/Skeleton';
import { relativeTime } from '@/shared/utils/date';

import {
  getRuntimeStatus,
  getSystemSummary,
} from '@/features/runtime/api/endpoints';
import RuntimeStatusBadge from '@/features/runtime/components/RuntimeStatusBadge';

function StatCard({
  label,
  value,
  icon,
  color,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? (
            <Skeleton width={60} height={32} />
          ) : (
            <span className="text-2xl font-heading" style={{ color }}>
              {value}
            </span>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      </div>
    </Card>
  );
}

export default function HealthDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['runtime', 'summary'],
    queryFn: getSystemSummary,
    refetchInterval: 10000,
  });
  const runtimeQuery = useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: getRuntimeStatus,
    refetchInterval: 5000,
  });

  const summary = summaryQuery.data;
  const workers = runtimeQuery.data?.workers ?? [];

  return (
    <div>
      <PageHeader title="Health" subtitle="Runtime health at a glance" />

      <div className="grid gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Runtime"
          value={summary?.runtimeHealth ?? 'UP'}
          icon={<HeartPulse size={20} />}
          color="var(--accent-green)"
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          label="Running Workers"
          value={summary?.runningWorkers ?? 0}
          icon={<Activity size={20} />}
          color="var(--accent-blue)"
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          label="Failures"
          value={summary?.failedExecutions ?? 0}
          icon={<FileWarning size={20} />}
          color="var(--accent-red)"
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          label="Camunda Connections"
          value={summary?.camundaConnections ?? 0}
          icon={<PlugZap size={20} />}
          color="var(--accent-orange)"
          isLoading={summaryQuery.isLoading}
        />
      </div>

      <Card title="Workers" divided={false}>
        {workers.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No runtime workers.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {workers.map((worker) => (
              <div
                key={`${worker.tenantId}-${worker.environment}-${worker.workerName}`}
                className="grid gap-4 py-3 text-sm md:grid-cols-5"
              >
                <div className="font-medium text-gray-800 dark:text-white/90">
                  {worker.workerName}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {worker.tenantId} / {worker.environment}
                </div>
                <div>
                  <RuntimeStatusBadge status={worker.status} />
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {worker.lastMessage ?? 'Idle'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {relativeTime(worker.lastPollAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
