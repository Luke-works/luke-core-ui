import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pollWithBackoff } from '@/shared/hooks/pollingBackoff';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, subHours, parseISO } from 'date-fns';
import { Activity, CheckSquare, AlertTriangle, Cog, TrendingUp } from 'lucide-react';

import Card from '@/shared/ui/Card';
import Skeleton from '@/shared/ui/Skeleton';
import StatusBadge from '@/shared/ui/StatusBadge';
import PageHeader from '@/shared/layout/PageHeader';
import CopyId from '@/shared/ui/CopyId';

import { getProcessInstanceCount, getProcessDefinitionStatistics } from '@/features/processes/api/endpoints';
import { getTaskCount } from '@/features/tasks/api/endpoints';
import { getIncidentCount, getIncidents } from '@/features/incidents/api/endpoints';
import { getJobCount } from '@/features/jobs/api/endpoints';
import { getHistoricProcessInstances } from '@/features/history/api/endpoints';
import { relativeTime, toCamundaDate } from '@/shared/utils/date';

import type { HistoricProcessInstance } from '@/features/history/api/types';
import type { ProcessDefinitionStatistics } from '@/features/processes/api/types';
import type { Incident } from '@/features/incidents/api/types';

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  isError: boolean;
  color: string;
  icon: React.ReactNode;
  href?: string;
}

function KpiCard({ label, value, isLoading, isError, color, icon, href }: KpiCardProps) {
  const navigate = useNavigate();

  return (
    <div
      role={href ? 'button' : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={href ? () => navigate(href) : undefined}
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition ${
        href ? 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-800' : ''
      }`}
    >
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-white/[0.05]" style={{ color }}>
        {icon}
      </div>

      <div className="flex items-end justify-between mt-5">
        <div className="min-w-0">
          <span className="text-theme-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          {isLoading ? (
            <div className="mt-2"><Skeleton width={72} height={28} /></div>
          ) : isError ? (
            <h4 className="mt-2 font-bold text-gray-400 text-title-sm dark:text-white/40">
              --
            </h4>
          ) : (
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {value?.toLocaleString() ?? 0}
            </h4>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart tooltip (dark themed)
// ---------------------------------------------------------------------------

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded px-3 py-2 text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByHour(instances: HistoricProcessInstance[]) {
  const buckets: Record<string, number> = {};

  // Pre-fill 24 hour buckets so the chart has a continuous x-axis
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = subHours(now, i);
    const key = format(hour, 'HH:00');
    buckets[key] = 0;
  }

  for (const inst of instances) {
    const key = format(parseISO(inst.startTime), 'HH:00');
    if (key in buckets) {
      buckets[key]++;
    }
  }

  return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
}

function topProcesses(stats: ProcessDefinitionStatistics[], limit = 5) {
  return [...stats]
    .sort((a, b) => b.instances - a.instances)
    .slice(0, limit)
    .map((s) => ({
      name: s.definition.name ?? s.definition.key,
      instances: s.instances,
    }));
}

// ---------------------------------------------------------------------------
// Incident type to StatusBadge mapping
// ---------------------------------------------------------------------------

function incidentStatusType(type: string): 'incident' | 'failed' {
  if (type === 'failedJob') return 'failed';
  return 'incident';
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  // ---- KPI queries --------------------------------------------------------

  const runningInstances = useQuery({
    queryKey: ['dashboard', 'processInstanceCount'],
    queryFn: () => getProcessInstanceCount({ suspended: false }),
  });

  const openTasks = useQuery({
    queryKey: ['dashboard', 'taskCount'],
    queryFn: () => getTaskCount(),
  });

  const activeIncidents = useQuery({
    queryKey: ['dashboard', 'incidentCount'],
    queryFn: () => getIncidentCount(),
  });

  const failedJobs = useQuery({
    queryKey: ['dashboard', 'failedJobCount'],
    queryFn: () => getJobCount({ withException: true }),
  });

  // ---- Area chart query ---------------------------------------------------

  const startedAfter = useMemo(() => toCamundaDate(subHours(new Date(), 24)), []);

  const historicInstances = useQuery({
    queryKey: ['dashboard', 'historicInstances', startedAfter],
    queryFn: () =>
      getHistoricProcessInstances({
        startedAfter,
        maxResults: 200,
        sortBy: 'startTime',
        sortOrder: 'asc',
      }),
  });

  const activityData = useMemo(
    () => groupByHour(historicInstances.data ?? []),
    [historicInstances.data],
  );

  // ---- Process definition statistics --------------------------------------

  const processStats = useQuery({
    queryKey: ['dashboard', 'processDefinitionStatistics'],
    queryFn: () => getProcessDefinitionStatistics(),
  });

  const topProcessData = useMemo(
    () => topProcesses(processStats.data ?? []),
    [processStats.data],
  );

  // ---- Recent incidents ---------------------------------------------------

  const recentIncidents = useQuery({
    queryKey: ['dashboard', 'recentIncidents'],
    queryFn: () =>
      getIncidents({
        maxResults: 10,
        sortBy: 'incidentTimestamp',
        sortOrder: 'desc',
      }),
    refetchInterval: pollWithBackoff(30000),
  });

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Running Instances"
          value={runningInstances.data?.count}
          isLoading={runningInstances.isLoading}
          isError={runningInstances.isError}
          color="var(--accent-green)"
          icon={<Activity size={20} />}
          href="/processes"
        />
        <KpiCard
          label="Open Tasks"
          value={openTasks.data?.count}
          isLoading={openTasks.isLoading}
          isError={openTasks.isError}
          color="var(--accent-blue)"
          icon={<CheckSquare size={20} />}
          href="/tasks"
        />
        <KpiCard
          label="Active Incidents"
          value={activeIncidents.data?.count}
          isLoading={activeIncidents.isLoading}
          isError={activeIncidents.isError}
          color="var(--accent-red)"
          icon={<AlertTriangle size={20} />}
          href="/incidents"
        />
        <KpiCard
          label="Failed Jobs"
          value={failedJobs.data?.count}
          isLoading={failedJobs.isLoading}
          isError={failedJobs.isError}
          color="var(--accent-orange)"
          icon={<Cog size={20} />}
          href="/jobs"
        />
      </div>

      {/* Instance Activity Area Chart */}
      <div className="mb-6">
        <Card
          title="Instance Activity (24h)"
          action={
            <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
          }
        >
          {historicInstances.isLoading ? (
            <Skeleton height={250} />
          ) : historicInstances.isError ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: 250, color: 'var(--text-muted)' }}
            >
              Failed to load activity data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Instances"
                  stroke="var(--accent-blue)"
                  fill="url(#areaFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Bottom Row: Top Processes + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Processes */}
        <Card title="Top Processes">
          {processStats.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={20} />
              ))}
            </div>
          ) : processStats.isError ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: 200, color: 'var(--text-muted)' }}
            >
              Failed to load process statistics
            </div>
          ) : topProcessData.length === 0 ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: 200, color: 'var(--text-muted)' }}
            >
              No process data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProcessData} layout="vertical">
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="instances"
                  name="Instances"
                  fill="var(--accent-blue)"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Recent Incidents */}
        <Card title="Recent Incidents">
          {recentIncidents.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={20} />
              ))}
            </div>
          ) : recentIncidents.isError ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: 200, color: 'var(--text-muted)' }}
            >
              Failed to load incidents
            </div>
          ) : !recentIncidents.data?.length ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: 200, color: 'var(--text-muted)' }}
            >
              No recent incidents
            </div>
          ) : (
            <ul className="space-y-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {recentIncidents.data.map((incident: Incident) => (
                <li
                  key={incident.id}
                  className="flex items-start gap-3 pb-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="shrink-0 mt-0.5">
                    <StatusBadge status={incidentStatusType(incident.incidentType)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm truncate"
                      style={{ color: 'var(--text-primary)' }}
                      title={incident.incidentMessage ?? undefined}
                    >
                      {incident.incidentMessage ?? 'No message'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <CopyId id={incident.processInstanceId} />
                      <span
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {relativeTime(incident.incidentTimestamp)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
