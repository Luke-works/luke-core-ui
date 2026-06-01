import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import { getRuntimeStatus } from '@/features/runtime/api/endpoints';

export default function MetricsPage() {
  const runtimeQuery = useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: getRuntimeStatus,
    refetchInterval: 5000,
  });

  const totals = (runtimeQuery.data?.workers ?? []).reduce(
    (acc, worker) => ({
      fetched: acc.fetched + worker.stats.fetched,
      completed: acc.completed + worker.stats.completed,
      failed: acc.failed + worker.stats.failed,
      bpmnErrors: acc.bpmnErrors + worker.stats.bpmnErrors,
    }),
    { fetched: 0, completed: 0, failed: 0, bpmnErrors: 0 },
  );

  const rows: Array<[string, number]> = [
    ['workerflow_tasks_fetched_total', totals.fetched],
    ['workerflow_tasks_completed_total', totals.completed],
    ['workerflow_tasks_failed_total', totals.failed],
    ['workerflow_bpmn_errors_total', totals.bpmnErrors],
  ];

  return (
    <div>
      <PageHeader title="Metrics" subtitle="Prometheus-style worker metrics" />

      <Card>
        <pre className="overflow-auto text-theme-sm leading-7 text-gray-800 dark:text-gray-100">
          {rows.map(([name, value]) => `${name} ${value}`).join('\n')}
        </pre>
      </Card>
    </div>
  );
}
