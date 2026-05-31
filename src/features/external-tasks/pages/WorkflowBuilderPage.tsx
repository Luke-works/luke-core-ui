import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  Globe,
  GitBranch,
  Layers,
  Clock,
  Code,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import yaml from 'js-yaml';

import Button from '@/shared/ui/Button';
import Tabs from '@/shared/ui/Tabs';

/* ── Types ────────────────────────────────────────────────── */

type StepData = {
  label: string;
  stepType: 'http' | 'script' | 'parallel' | 'condition' | 'delay';
  config: Record<string, any>;
  output?: Record<string, string>;
  condition?: string;
  retry?: { count: number; delay: number; backoff: string };
};

/* ── Input style ─────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.375rem 0.5rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
};

/* ── Step palette items ──────────────────────────────────── */

const STEP_PALETTE = [
  { type: 'http', label: 'HTTP Request', icon: Globe, color: '#3b7bf4' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: '#ca8a04' },
  { type: 'parallel', label: 'Parallel', icon: Layers, color: '#9333ea' },
  { type: 'delay', label: 'Delay', icon: Clock, color: '#f97316' },
  { type: 'script', label: 'Script', icon: Code, color: '#22c55e' },
] as const;

/* ── Custom node component ───────────────────────────────── */

function StepNode({ data, selected }: { data: StepData; selected: boolean }) {
  const palette = STEP_PALETTE.find((p) => p.type === data.stepType);
  const Icon = palette?.icon ?? Globe;
  const color = palette?.color ?? '#3b7bf4';

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `2px solid ${selected ? color : 'var(--border)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        boxShadow: selected ? `0 0 0 2px ${color}30` : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--text-muted)' }} />
      <div className="flex items-center gap-2">
        <div style={{ backgroundColor: `${color}20`, borderRadius: 6, padding: 4 }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{data.label}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.stepType.toUpperCase()}</div>
        </div>
      </div>
      {data.stepType === 'http' && data.config?.method && (
        <div className="mt-1.5 text-[10px] font-mono-id truncate" style={{ color: 'var(--text-secondary)', maxWidth: 180 }}>
          {data.config.method} {data.config.url?.slice(0, 30)}
        </div>
      )}
      {data.condition && (
        <div className="mt-1 text-[10px] font-mono-id" style={{ color: 'var(--accent-yellow)' }}>
          if: {data.condition.slice(0, 30)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  step: StepNode as any,
};

/* ── Step config panel ───────────────────────────────────── */

function StepConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: {
  node: Node<StepData>;
  onUpdate: (id: string, data: Partial<StepData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const data = node.data;
  const [tab, setTab] = useState('config');

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, { config: { ...data.config, [key]: value } });
  };

  const tabs = [
    { id: 'config', label: 'Config' },
    { id: 'output', label: 'Output' },
    { id: 'retry', label: 'Retry' },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        width: 320,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <input
            type="text"
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="text-sm font-semibold bg-transparent border-none outline-none p-0"
            style={{ color: 'var(--text-primary)', width: '100%' }}
          />
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.stepType.toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onDelete(node.id)} className="p-1 rounded cursor-pointer bg-transparent border-none hover:bg-elevated" style={{ color: 'var(--accent-red)' }}><Trash2 size={14} /></button>
          <button onClick={onClose} className="p-1 rounded cursor-pointer bg-transparent border-none hover:bg-elevated" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
        </div>
      </div>

      {/* Condition (all types) */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Condition (optional)</label>
        <input type="text" value={data.condition ?? ''} onChange={(e) => onUpdate(node.id, { condition: e.target.value || undefined })}
          placeholder='e.g. {{isValid}} == true' style={{ ...inputStyle, fontSize: '0.75rem', marginTop: 4 }} />
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab}>
        <div className="p-3 overflow-auto flex-1">
          {tab === 'config' && (
            <div className="space-y-3">
              {data.stepType === 'http' && (
                <>
                  <Field label="Method">
                    <select value={data.config.method ?? 'GET'} onChange={(e) => updateConfig('method', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="URL">
                    <input type="text" value={data.config.url ?? ''} onChange={(e) => updateConfig('url', e.target.value)}
                      placeholder="https://api.example.com/endpoint" style={inputStyle} />
                  </Field>
                  <Field label="Headers (JSON)">
                    <textarea value={typeof data.config.headers === 'string' ? data.config.headers : JSON.stringify(data.config.headers ?? {}, null, 2)}
                      onChange={(e) => { try { updateConfig('headers', JSON.parse(e.target.value)); } catch { updateConfig('headers', e.target.value); } }}
                      rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}
                      placeholder='{"Authorization": "Bearer {{env.KEY}}"}' />
                  </Field>
                  <Field label="Body (JSON)">
                    <textarea value={typeof data.config.body === 'string' ? data.config.body : JSON.stringify(data.config.body ?? {}, null, 2)}
                      onChange={(e) => { try { updateConfig('body', JSON.parse(e.target.value)); } catch { updateConfig('body', e.target.value); } }}
                      rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}
                      placeholder='{"orderId": "{{task.variables.orderId}}"}' />
                  </Field>
                </>
              )}
              {data.stepType === 'delay' && (
                <Field label="Delay (ms)">
                  <input type="number" value={data.config.delayMs ?? 1000} onChange={(e) => updateConfig('delayMs', Number(e.target.value))}
                    style={inputStyle} />
                </Field>
              )}
              {data.stepType === 'script' && (
                <>
                  <Field label="Language">
                    <select value={data.config.language ?? 'groovy'} onChange={(e) => updateConfig('language', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="groovy">Groovy</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </Field>
                  <Field label="Script">
                    <textarea value={data.config.script ?? ''} onChange={(e) => updateConfig('script', e.target.value)}
                      rows={8} style={{ ...inputStyle, resize: 'vertical', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}
                      placeholder="// Your code here" />
                  </Field>
                </>
              )}
              {data.stepType === 'parallel' && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Connect multiple outgoing edges from this node. All connected steps will execute in parallel.
                </div>
              )}
              {data.stepType === 'condition' && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Set the condition above. Connect two outgoing edges — the step following this node only executes if the condition is true.
                </div>
              )}
            </div>
          )}

          {tab === 'output' && (
            <div className="space-y-3">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Map response fields to workflow variables using JSONPath.</div>
              <OutputMappingEditor output={data.output ?? {}} onChange={(o) => onUpdate(node.id, { output: o })} />
            </div>
          )}

          {tab === 'retry' && (
            <div className="space-y-3">
              <Field label="Retry Count">
                <input type="number" value={data.retry?.count ?? 0} onChange={(e) => onUpdate(node.id, { retry: { ...(data.retry ?? { count: 0, delay: 5000, backoff: 'FIXED' }), count: Number(e.target.value) } })}
                  min={0} style={inputStyle} />
              </Field>
              <Field label="Retry Delay (ms)">
                <input type="number" value={data.retry?.delay ?? 5000} onChange={(e) => onUpdate(node.id, { retry: { ...(data.retry ?? { count: 3, delay: 5000, backoff: 'FIXED' }), delay: Number(e.target.value) } })}
                  style={inputStyle} />
              </Field>
              <Field label="Backoff">
                <select value={data.retry?.backoff ?? 'FIXED'} onChange={(e) => onUpdate(node.id, { retry: { ...(data.retry ?? { count: 3, delay: 5000, backoff: 'FIXED' }), backoff: e.target.value } })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="FIXED">Fixed</option>
                  <option value="LINEAR">Linear</option>
                  <option value="EXPONENTIAL">Exponential</option>
                </select>
              </Field>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function OutputMappingEditor({ output, onChange }: { output: Record<string, string>; onChange: (o: Record<string, string>) => void }) {
  const entries = Object.entries(output);
  const addRow = () => onChange({ ...output, ['var' + (entries.length + 1)]: '$.data' });
  const removeRow = (key: string) => { const o = { ...output }; delete o[key]; onChange(o); };
  const updateKey = (oldKey: string, newKey: string) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(output)) { o[k === oldKey ? newKey : k] = v; }
    onChange(o);
  };
  const updateValue = (key: string, val: string) => onChange({ ...output, [key]: val });

  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-1 items-center">
          <input type="text" value={key} onChange={(e) => updateKey(key, e.target.value)} placeholder="varName" style={{ ...inputStyle, flex: 1, fontSize: '0.7rem' }} />
          <span style={{ color: 'var(--text-muted)' }}>=</span>
          <input type="text" value={val} onChange={(e) => updateValue(key, e.target.value)} placeholder="$.path" style={{ ...inputStyle, flex: 1, fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace' }} />
          <button onClick={() => removeRow(key)} className="p-0.5 bg-transparent border-none cursor-pointer" style={{ color: 'var(--accent-red)' }}><X size={12} /></button>
        </div>
      ))}
      <button onClick={addRow} className="text-xs bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }}>+ Add mapping</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ── YAML generation from nodes/edges ────────────────────── */

function generateYaml(nodes: any[], edges: Edge[], workflowName: string, triggerTopic: string): string {
  const ordered = topologicalSort(nodes, edges);

  const steps = ordered.map((node: any) => {
    const d = node.data as StepData;
    const step: Record<string, any> = { id: node.id, type: d.stepType };
    if (d.condition) step.condition = d.condition;

    if (d.stepType === 'http') {
      step.config = {
        method: d.config.method ?? 'GET',
        url: d.config.url ?? '',
      };
      if (d.config.headers && Object.keys(d.config.headers).length > 0) step.config.headers = d.config.headers;
      if (d.config.body) step.config.body = d.config.body;
    } else if (d.stepType === 'delay') {
      step.delayMs = d.config.delayMs ?? 1000;
    } else if (d.stepType === 'script') {
      step.script = d.config.script ?? '';
      step.scriptLanguage = d.config.language ?? 'groovy';
    }

    if (d.output && Object.keys(d.output).length > 0) step.output = d.output;
    if (d.retry && d.retry.count > 0) step.retry = d.retry;

    return step;
  });

  const wf: Record<string, any> = {
    name: workflowName || 'my-workflow',
    trigger: { topic: triggerTopic || 'my-topic' },
    steps,
    onError: 'FAIL',
  };

  return yaml.dump(wf, { lineWidth: 120, noRefs: true });
}

function topologicalSort(nodes: any[], edges: Edge[]): any[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) { adj.set(n.id, []); inDeg.set(n.id, 0); }
  for (const e of edges) { adj.get(e.source)?.push(e.target); inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1); }

  const queue = nodes.filter((n: any) => (inDeg.get(n.id) ?? 0) === 0).map((n: any) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      inDeg.set(next, (inDeg.get(next) ?? 0) - 1);
      if (inDeg.get(next) === 0) queue.push(next);
    }
  }

  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
  return order.map((id) => nodeMap.get(id)!).filter(Boolean);
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function WorkflowBuilderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const idCounter = useRef(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'yaml'>('visual');
  const [workflowName, setWorkflowName] = useState('');
  const [triggerTopic, setTriggerTopic] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState([] as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' }, style: { stroke: 'var(--text-muted)', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const addStep = useCallback((type: StepData['stepType']) => {
    const id = `step_${idCounter.current++}`;
    const palette = STEP_PALETTE.find((p) => p.type === type);
    const newNode: any = {
      id,
      type: 'step',
      position: { x: 250, y: nodes.length * 120 + 50 },
      data: {
        label: palette?.label ?? type,
        stepType: type,
        config: type === 'http' ? { method: 'GET', url: '' } : type === 'delay' ? { delayMs: 1000 } : type === 'script' ? { language: 'groovy', script: '' } : {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(id);
  }, [nodes, setNodes]);

  const updateNodeData = useCallback((id: string, data: Partial<StepData>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const selectedNodeObj = useMemo(() => nodes.find((n) => n.id === selectedNode), [nodes, selectedNode]);

  const yamlOutput = useMemo(() => generateYaml(nodes, edges, workflowName, triggerTopic), [nodes, edges, workflowName, triggerTopic]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseURL = import.meta.env.VITE_TASK_ENGINE_URL || 'http://localhost:8090';
      const { username, password } = (await import('@/features/auth/stores/authStore')).useAuthStore.getState();
      const tenantId = (await import('@/shared/stores/tenantStore')).useTenantStore.getState().activeTenantId;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (username && password) headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`${baseURL}/api/v1/workflows`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: workflowName,
          triggerTopic,
          yamlDefinition: yamlOutput,
          flowJson: JSON.stringify({ nodes, edges }),
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Save failed'); }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Workflow saved');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/external-tasks/topics')} className="p-1 rounded cursor-pointer bg-transparent border-none hover:bg-elevated" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <input type="text" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow name" className="text-sm font-semibold bg-transparent border-none outline-none" style={{ color: 'var(--text-primary)', width: 200 }} />
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <input type="text" value={triggerTopic} onChange={(e) => setTriggerTopic(e.target.value)}
              placeholder="Trigger topic" className="text-sm font-mono-id bg-transparent border-none outline-none" style={{ color: 'var(--accent-blue)', width: 160 }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => setViewMode('visual')}
              className="px-3 py-1 text-xs font-medium cursor-pointer border-none"
              style={{ backgroundColor: viewMode === 'visual' ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: viewMode === 'visual' ? '#fff' : 'var(--text-secondary)' }}>
              Visual
            </button>
            <button onClick={() => setViewMode('yaml')}
              className="px-3 py-1 text-xs font-medium cursor-pointer border-none"
              style={{ backgroundColor: viewMode === 'yaml' ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: viewMode === 'yaml' ? '#fff' : 'var(--text-secondary)' }}>
              YAML
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={() => saveMutation.mutate()} disabled={!workflowName || !triggerTopic || saveMutation.isPending}>
            <Save size={14} className="mr-1" />{saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'visual' ? (
          <>
            {/* Step palette */}
            <div className="shrink-0 p-3 space-y-2" style={{ width: 170, borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Add Step</div>
              {STEP_PALETTE.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.type} onClick={() => addStep(item.type)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors border-none"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = item.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <Icon size={14} style={{ color: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Canvas */}
            <div className="flex-1">
              <ReactFlow
                nodes={nodes as any}
                edges={edges}
                onNodesChange={onNodesChange as any}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_: any, node: any) => setSelectedNode(node.id)}
                onPaneClick={() => setSelectedNode(null)}
                nodeTypes={nodeTypes}
                fitView
                defaultEdgeOptions={{ style: { stroke: 'var(--text-muted)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' } }}
              >
                <Background color="var(--border)" gap={20} size={1} />
                <Controls position="bottom-right" />
                <MiniMap
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  nodeColor={() => 'var(--accent-blue)'}
                  maskColor="rgba(0,0,0,0.1)"
                />
              </ReactFlow>
            </div>

            {/* Config panel */}
            {selectedNodeObj && (
              <StepConfigPanel
                node={selectedNodeObj as any}
                onUpdate={updateNodeData}
                onDelete={deleteNode}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </>
        ) : (
          /* YAML view */
          <div className="flex-1 flex flex-col">
            <pre
              className="flex-1 p-4 overflow-auto font-mono-id text-xs"
              style={{
                backgroundColor: '#1e1e2e',
                color: '#cdd6f4',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {yamlOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
