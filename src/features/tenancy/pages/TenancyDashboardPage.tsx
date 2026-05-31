import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Building2, Users, FileStack, Activity, AlertTriangle, Rocket } from 'lucide-react';

import Card from '@/shared/ui/Card';
import Skeleton from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import CopyId from '@/shared/ui/CopyId';
import PageHeader from '@/shared/layout/PageHeader';

import { getTenancyMetrics, type TenantMetrics } from '@/features/tenancy/api/endpoints';

/* ── KPI card ─────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  isLoading,
  color,
  icon,
}: {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div
        className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-white/[0.05]"
        style={{ color }}
      >
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
        {isLoading ? (
          <div className="mt-2">
            <Skeleton width={64} height={28} />
          </div>
        ) : (
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {value?.toLocaleString() ?? 0}
          </h4>
        )}
      </div>
    </div>
  );
}

/* ── Chart tooltip ────────────────────────────────────────── */

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

const PIE_COLORS = [
  'var(--accent-blue)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-red)',
  '#a855f7',
  '#14b8a6',
  '#eab308',
  '#ec4899',
];

/* ── Page ─────────────────────────────────────────────────── */

export default function TenancyDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenancy-metrics'],
    queryFn: getTenancyMetrics,
    refetchInterval: 60000,
  });

  const tenantName = (m: TenantMetrics) => m.tenant.name || m.tenant.id;

  const instanceData = useMemo(
    () =>
      (data?.tenants ?? [])
        .map((m) => ({ name: tenantName(m), instances: m.runningInstances }))
        .sort((a, b) => b.instances - a.instances),
    [data],
  );

  const usersData = useMemo(
    () =>
      (data?.tenants ?? [])
        .filter((m) => m.users > 0)
        .map((m) => ({ name: tenantName(m), value: m.users })),
    [data],
  );

  const columns = useMemo<ColumnDef<TenantMetrics, any>[]>(
    () => [
      {
        id: 'tenant',
        header: 'Tenant',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {row.original.tenant.name || row.original.tenant.id}
            </span>
            <CopyId id={row.original.tenant.id} />
          </div>
        ),
      },
      { accessorKey: 'users', header: 'Users' },
      { accessorKey: 'definitions', header: 'Definitions' },
      { accessorKey: 'deployments', header: 'Deployments' },
      { accessorKey: 'runningInstances', header: 'Running' },
      { accessorKey: 'openTasks', header: 'Open Tasks' },
      {
        accessorKey: 'incidents',
        header: 'Incidents',
        cell: ({ row }) => (
          <span
            style={{
              color: row.original.incidents > 0 ? 'var(--accent-red)' : 'var(--text-secondary)',
            }}
          >
            {row.original.incidents}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader title="Tenancy Metrics" subtitle="Cross-tenant usage across the cluster" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Tenants" value={data?.totals.tenants} isLoading={isLoading} color="var(--accent-blue)" icon={<Building2 size={20} />} />
        <KpiCard label="Users" value={data?.totals.users} isLoading={isLoading} color="#a855f7" icon={<Users size={20} />} />
        <KpiCard label="Definitions" value={data?.totals.definitions} isLoading={isLoading} color="#14b8a6" icon={<FileStack size={20} />} />
        <KpiCard label="Deployments" value={data?.totals.deployments} isLoading={isLoading} color="var(--accent-green)" icon={<Rocket size={20} />} />
        <KpiCard label="Running" value={data?.totals.runningInstances} isLoading={isLoading} color="var(--accent-orange)" icon={<Activity size={20} />} />
        <KpiCard label="Incidents" value={data?.totals.incidents} isLoading={isLoading} color="var(--accent-red)" icon={<AlertTriangle size={20} />} />
      </div>

      {isError ? (
        <Card>
          <div className="flex items-center justify-center text-sm" style={{ height: 200, color: 'var(--text-muted)' }}>
            Failed to load tenancy metrics.
          </div>
        </Card>
      ) : !isLoading && (data?.tenants.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={40} />}
            title="No Tenants"
            description="Create tenants in Users & Groups to see per-tenant metrics here."
          />
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card title="Running Instances by Tenant">
              {isLoading ? (
                <Skeleton height={260} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={instanceData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="instances" name="Running" fill="var(--accent-orange)" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Users by Tenant">
              {isLoading ? (
                <Skeleton height={260} />
              ) : usersData.length === 0 ? (
                <div className="flex items-center justify-center text-sm" style={{ height: 260, color: 'var(--text-muted)' }}>
                  No tenant memberships yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={usersData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                      {usersData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Per-tenant table */}
          <Card title="Per-Tenant Breakdown">
            <DataTable
              data={data?.tenants ?? []}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No tenants found."
            />
          </Card>
        </>
      )}
    </div>
  );
}
