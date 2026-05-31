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

  useEffect(() => {
    if (!containerRef.current || !xml) return;

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
        console.error('[DmnViewer] Failed to import DMN XML:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [xml]);

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
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 8,
        overflow: 'auto',
      }}
    />
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
      <div className="flex items-center gap-1.5 mb-0 text-sm shrink-0" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/dashboard')}>Dashboard</button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/decisions')}>Decisions</button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <span style={{ color: 'var(--text-primary)' }}>{displayName}</span>
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
      <div className="flex-1 min-h-0" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '0.5rem' }}>
        {xmlData?.dmnXml ? (
          <DmnViewer xml={xmlData.dmnXml} height="100%" />
        ) : (
          <Skeleton height="100%" />
        )}
      </div>

      {/* Decision Instances — fixed bottom section */}
      <div className="shrink-0" style={{ maxHeight: 220, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
        <div className="px-4 py-2 shrink-0" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Decision Instances ({instances?.length ?? 0})
          </span>
        </div>

        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {instancesLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2rem" />)}
            </div>
          ) : !instances || instances.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No decision evaluations found.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['ID', 'Evaluation Time', 'Process Instance', 'Activity'].map(h => (
                    <th key={h} className="text-left text-xs font-bold py-2 px-3" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr
                    key={inst.id}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: selectedInstance?.id === inst.id ? 'var(--bg-elevated)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (selectedInstance?.id !== inst.id) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { if (selectedInstance?.id !== inst.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    onClick={() => { setSelectedInstance(inst); setActiveTab('inputs'); }}
                  >
                    <td className="py-2 px-3"><CopyId id={inst.id} /></td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{absoluteTime(inst.evaluationTime)}</td>
                    <td className="py-2 px-3">
                      {inst.processInstanceId ? (
                        <button className="bg-transparent border-none cursor-pointer p-0 text-xs"
                          style={{ color: 'var(--accent-blue)' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/processes/instance/${inst.processInstanceId}`); }}>
                          {inst.processInstanceId}
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)' }}>--</span>}
                    </td>
                    <td className="py-2 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{inst.activityId ?? '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Selected instance detail */}
      {selectedInstance && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginTop: '0.75rem', backgroundColor: 'var(--bg-surface)' }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
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
                        <th key={h} className="text-left text-xs font-bold py-2 px-3" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstance.inputs.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>No inputs</td></tr>
                    ) : selectedInstance.inputs.map((input) => (
                      <tr key={input.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{input.clauseName ?? input.clauseId}</td>
                        <td className="py-2 px-3"><Badge variant="muted">{input.type}</Badge></td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{formatValue(input.value)}</td>
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
                        <th key={h} className="text-left text-xs font-bold py-2 px-3" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstance.outputs.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>No outputs</td></tr>
                    ) : selectedInstance.outputs.map((output) => (
                      <tr key={output.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-2 px-3"><Badge variant="muted">{output.ruleId} (#{output.ruleOrder + 1})</Badge></td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{output.variableName}</td>
                        <td className="py-2 px-3"><Badge variant="muted">{output.type}</Badge></td>
                        <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{formatValue(output.value)}</td>
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
