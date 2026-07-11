import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Scale, Hash, Key, Type, GitBranch, Tag, Clock, Building2, Rocket, Link2, Activity,
} from 'lucide-react';

import { useSidebarLock } from '@/shared/hooks/useSidebarLock';
import DetailPanel from '@/shared/ui/DetailPanel';
import Tabs from '@/shared/ui/Tabs';
import Badge from '@/shared/ui/Badge';
import CopyId from '@/shared/ui/CopyId';
import Skeleton from '@/shared/ui/Skeleton';
import {
  getDecisionDefinitionById,
  getDecisionDefinitionXml,
  getHistoricDecisionInstances,
  type HistoricDecisionInstance,
} from '@/features/decisions/api/endpoints';
import { absoluteTime } from '@/shared/utils/date';

/* ── DMN Viewer ─────────────────────────────────────────────── */

import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';

function DmnViewer({ xml, height = 340 }: { xml: string; height?: number | string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !xml) return;

    setImportError(null);
    let cancelled = false;

    (async () => {
      const DmnJS = (await import('dmn-js/lib/Viewer')).default;

      if (cancelled) return;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }

      const viewer = new DmnJS({ container: containerRef.current! });
      viewerRef.current = viewer;

      try {
        await viewer.importXML(xml);
        if (cancelled) return;

        // Navigate to decision table view instead of DRD
        const views = viewer.getViews?.() ?? [];
        const decisionTableView = views.find((v: any) => v.type === 'decisionTable');
        if (decisionTableView) {
          viewer.open(decisionTableView);
        } else {
          // Fallback: try to fit DRD viewport
          const activeViewer = viewer.getActiveViewer?.();
          if (activeViewer) {
            const canvas = activeViewer.get?.('canvas');
            if (canvas?.zoom) canvas.zoom('fit-viewport', 'auto');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[DmnViewer] Failed to import DMN XML:', err);
          setImportError(err instanceof Error ? err.message : 'The decision table could not be rendered.');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [xml, reloadKey]);

  // Auto-fit on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const activeViewer = viewerRef.current?.getActiveViewer?.();
      if (activeViewer) {
        const canvas = activeViewer.get?.('canvas');
        if (canvas?.zoom) try { canvas.zoom('fit-viewport', 'auto'); } catch {}
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          overflow: 'auto',
        }}
        className="bg-white dark:bg-gray-900"
      />
      {importError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 24,
            textAlign: 'center',
            borderRadius: 8,
          }}
          className="bg-white dark:bg-gray-900"
        >
          <p className="text-gray-800 dark:text-white/90" style={{ fontSize: 14, fontWeight: 600 }}>
            Couldn't render this decision
          </p>
          <p className="text-gray-600 dark:text-gray-300" style={{ fontSize: 13, maxWidth: 360 }}>{importError}</p>
          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setReloadKey((k) => k + 1);
            }}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-brand-500 shadow-theme-xs hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedInstance, setSelectedInstance] = useState<HistoricDecisionInstance | null>(null);
  const [activeTab, setActiveTab] = useState('inputs');
  useSidebarLock();

  const { data: definition, isLoading: defLoading } = useQuery({
    queryKey: ['decisionDefinition', id],
    queryFn: () => getDecisionDefinitionById(id!),
    enabled: !!id,
  });

  const { data: xmlData } = useQuery({
    queryKey: ['decisionDefinitionXml', id],
    queryFn: () => getDecisionDefinitionXml(id!),
    enabled: !!id,
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['historicDecisionInstances', { decisionDefinitionId: id }],
    queryFn: () =>
      getHistoricDecisionInstances({
        decisionDefinitionId: id,
        sortBy: 'evaluationTime',
        sortOrder: 'desc',
        maxResults: 50,
      }),
    enabled: !!id,
  });

  const tabs = useMemo(() => [
    { id: 'inputs', label: 'Inputs' },
    { id: 'outputs', label: 'Outputs' },
  ], []);

  if (defLoading || !definition) {
    return (
      <div>
        <Skeleton width="40%" height="1.5rem" />
        <Skeleton height="340px" className="mt-4" />
      </div>
    );
  }

  const displayName = definition.name ?? definition.key;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-0 text-sm shrink-0 pb-2 border-b border-gray-200 dark:border-gray-800">
        <button className="bg-transparent border-none cursor-pointer p-0 text-brand-500 hover:underline dark:text-brand-400" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <span className="text-gray-400 dark:text-gray-500">&raquo;</span>
        <button className="bg-transparent border-none cursor-pointer p-0 text-brand-500 hover:underline dark:text-brand-400" onClick={() => navigate('/decisions')}>Decisions</button>
        <span className="text-gray-400 dark:text-gray-500">&raquo;</span>
        <span className="text-gray-800 dark:text-white/90">{displayName}</span>
      </div>

      {/* Collapsible definition details */}
      <DetailPanel
        title="Decision Definition Details"
        icon={Scale}
        defaultOpen={false}
        items={[
          { label: 'Definition Version', value: String(definition.version), icon: GitBranch },
          { label: 'Version Tag', value: definition.versionTag ?? 'null', icon: Tag, muted: !definition.versionTag },
          { label: 'Definition ID', value: definition.id, icon: Hash },
          { label: 'Definition Key', value: definition.key, icon: Key },
          { label: 'Definition Name', value: displayName, icon: Type },
          { label: 'History TTL', value: definition.historyTimeToLive != null ? `${definition.historyTimeToLive}` : 'null', icon: Clock, muted: definition.historyTimeToLive == null },
          { label: 'Tenant ID', value: definition.tenantId ?? 'null', icon: Building2, muted: !definition.tenantId },
          { label: 'Deployment ID', value: definition.deploymentId, icon: Rocket, accent: 'blue', onClick: () => navigate(`/deployments/${definition.deploymentId}`) },
          { label: 'DRD Key', value: definition.decisionRequirementsDefinitionKey ?? 'null', icon: Link2, muted: !definition.decisionRequirementsDefinitionKey },
          { label: 'Evaluations', value: String(instances?.length ?? 0), icon: Activity, accent: 'blue' },
        ]}
      />

      {/* DMN Diagram — fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800" style={{ marginBottom: '0.5rem' }}>
        {xmlData?.dmnXml ? (
          <DmnViewer xml={xmlData.dmnXml} height="100%" />
        ) : (
          <Skeleton height="100%" />
        )}
      </div>

      {/* Decision Instances — fixed bottom section */}
      <div className="shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white flex flex-col dark:border-gray-800 dark:bg-white/[0.03]" style={{ maxHeight: 220 }}>
        <div className="px-4 py-2 shrink-0 bg-gray-50 border-b border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white/90">
            Decision Instances ({instances?.length ?? 0})
          </span>
        </div>

        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {instancesLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2rem" />)}
            </div>
          ) : !instances || instances.length === 0 ? (
            <p className="text-sm py-8 text-center text-gray-400 dark:text-gray-500">No decision evaluations found.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['ID', 'Evaluation Time', 'Process Instance', 'Activity'].map(h => (
                    <th key={h} className="text-left text-xs font-bold py-2 px-3 text-gray-800 border-b-2 border-gray-200 sticky top-0 bg-white dark:text-white/90 dark:border-gray-800 dark:bg-gray-900">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr
                    key={inst.id}
                    className={`cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-800 ${
                      selectedInstance?.id === inst.id
                        ? 'bg-gray-50 dark:bg-white/[0.03]'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                    onClick={() => { setSelectedInstance(inst); setActiveTab('inputs'); }}
                  >
                    <td className="py-2 px-3"><CopyId id={inst.id} /></td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{absoluteTime(inst.evaluationTime)}</td>
                    <td className="py-2 px-3">
                      {inst.processInstanceId ? (
                        <button className="bg-transparent border-none cursor-pointer p-0 text-xs text-brand-500 hover:underline dark:text-brand-400"
                          onClick={(e) => { e.stopPropagation(); navigate(`/processes/instance/${inst.processInstanceId}`); }}>
                          {inst.processInstanceId}
                        </button>
                      ) : <span className="text-gray-400 dark:text-gray-500">--</span>}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-300">{inst.activityId ?? '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Selected instance detail */}
      {selectedInstance && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" style={{ marginTop: '0.75rem' }}>
          <div className="px-4 py-2 flex items-center gap-2 bg-gray-50 border-b border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white/90">
              Instance:
            </span>
            <CopyId id={selectedInstance.id} />
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div className="p-4">
              {activeTab === 'inputs' && (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {['Name', 'Type', 'Value'].map(h => (
                        <th key={h} className="text-left text-xs font-bold py-2 px-3 text-gray-800 border-b-2 border-gray-200 dark:text-white/90 dark:border-gray-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstance.inputs.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-gray-400 dark:text-gray-500">No inputs</td></tr>
                    ) : selectedInstance.inputs.map((input) => (
                      <tr key={input.id} className="border-b border-gray-200 dark:border-gray-800">
                        <td className="py-2 px-3 text-gray-800 dark:text-white/90">{input.clauseName ?? input.clauseId}</td>
                        <td className="py-2 px-3"><Badge variant="muted">{input.type}</Badge></td>
                        <td className="py-2 px-3 text-gray-800 dark:text-white/90">{formatValue(input.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'outputs' && (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {['Rule', 'Variable', 'Type', 'Value'].map(h => (
                        <th key={h} className="text-left text-xs font-bold py-2 px-3 text-gray-800 border-b-2 border-gray-200 dark:text-white/90 dark:border-gray-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstance.outputs.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-center text-gray-400 dark:text-gray-500">No outputs</td></tr>
                    ) : selectedInstance.outputs.map((output) => (
                      <tr key={output.id} className="border-b border-gray-200 dark:border-gray-800">
                        <td className="py-2 px-3"><Badge variant="muted">{output.ruleId} (#{output.ruleOrder + 1})</Badge></td>
                        <td className="py-2 px-3 text-gray-800 dark:text-white/90">{output.variableName}</td>
                        <td className="py-2 px-3"><Badge variant="muted">{output.type}</Badge></td>
                        <td className="py-2 px-3 text-gray-800 dark:text-white/90">{formatValue(output.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
