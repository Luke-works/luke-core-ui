import { useState } from 'react';
import { Sun, Moon, Server, Cpu, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Badge from '@/shared/ui/Badge';
import Tabs from '@/shared/ui/Tabs';
import PageHeader from '@/shared/layout/PageHeader';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore, useActiveTenant } from '@/shared/stores/tenantStore';
import { api } from '@/shared/api/client';

/* ── Health check helper ─────────────────────────────────── */

async function checkHealth(url: string): Promise<{ ok: boolean; info: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, info: `${res.status} ${res.statusText}` };
  } catch (e: any) {
    return { ok: false, info: e.message ?? 'Unreachable' };
  }
}

/* ── Setting Row ─────────────────────────────────────────── */

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: ok ? 'var(--accent-green)' : 'var(--accent-red)' }} />;
}

/* ================================================================== */
/*  Main Settings Page                                                 */
/* ================================================================== */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const activeTenant = useActiveTenant();
  const tenants = useTenantStore((s) => s.tenants);
  const clearTenants = useTenantStore((s) => s.clear);

  const engineUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const taskEngineUrl = import.meta.env.VITE_TASK_ENGINE_URL || 'http://localhost:8090';

  /* ── Health checks ─────────────────────────────────────── */

  const engineHealth = useQuery({
    queryKey: ['health', 'engine'],
    queryFn: () => checkHealth(`${engineUrl}/actuator/health`),
    refetchInterval: 30000,
  });

  const taskEngineHealth = useQuery({
    queryKey: ['health', 'taskEngine'],
    queryFn: () => checkHealth(`${taskEngineUrl}/actuator/health`),
    refetchInterval: 30000,
  });

  const engineInfo = useQuery({
    queryKey: ['engineInfo'],
    queryFn: async () => {
      const { data } = await api.get('/engine');
      return data;
    },
  });

  /* ── Tabs ──────────────────────────────────────────────── */

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'connections', label: 'Connections' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'about', label: 'About' },
  ];

  const handleLogout = () => {
    logout();
    clearTenants();
    window.location.href = '/login';
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration and preferences" />

      <div className="mt-4 max-w-3xl">
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div className="p-5">

              {/* ── General ────────────────────────────────── */}
              {activeTab === 'general' && (
                <div>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account & Session</h3>

                  <SettingRow label="Signed in as" description="Current authenticated user">
                    <Badge variant="info">{username ?? 'Guest'}</Badge>
                  </SettingRow>

                  <SettingRow label="Active Tenant" description="Data is filtered to this tenant">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{activeTenant?.name || activeTenant?.id || 'None'}</span>
                  </SettingRow>

                  <SettingRow label="Available Tenants" description="Tenants you have access to">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{tenants.length}</span>
                  </SettingRow>

                  <SettingRow label="Topic Validation" description="Block deployments with unregistered external task topics">
                    <Badge variant="success">Enabled</Badge>
                  </SettingRow>

                  <div className="pt-4">
                    <Button variant="danger" size="sm" onClick={handleLogout}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Connections ─────────────────────────────── */}
              {activeTab === 'connections' && (
                <div>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Service Connections</h3>

                  {/* Core Engine */}
                  <Card className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server size={16} style={{ color: 'var(--accent-blue)' }} />
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Core Engine (CIB7)</h4>
                      </div>
                      {engineHealth.data && (
                        <span className="flex items-center text-xs">
                          <StatusDot ok={engineHealth.data.ok} />
                          <span style={{ color: engineHealth.data.ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {engineHealth.data.ok ? 'Connected' : 'Disconnected'}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>URL</span>
                        <span className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{engineUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>REST API</span>
                        <span className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{engineUrl}/engine-rest</span>
                      </div>
                      {Array.isArray(engineInfo.data) && engineInfo.data.length > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-secondary)' }}>Engine Name</span>
                          <span style={{ color: 'var(--text-primary)' }}>{engineInfo.data[0].name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                        <span style={{ color: 'var(--text-primary)' }}>{engineHealth.data?.info ?? 'Checking...'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Task Engine */}
                  <Card className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Cpu size={16} style={{ color: 'var(--accent-orange)' }} />
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task Engine</h4>
                      </div>
                      {taskEngineHealth.data && (
                        <span className="flex items-center text-xs">
                          <StatusDot ok={taskEngineHealth.data.ok} />
                          <span style={{ color: taskEngineHealth.data.ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {taskEngineHealth.data.ok ? 'Connected' : 'Disconnected'}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>URL</span>
                        <span className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{taskEngineUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>API</span>
                        <span className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{taskEngineUrl}/api/v1</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                        <span style={{ color: 'var(--text-primary)' }}>{taskEngineHealth.data?.info ?? 'Checking...'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Environment Variables */}
                  <Card>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Environment Configuration</h4>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      Set these environment variables or create a <code className="font-mono-id px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>.env</code> file to configure connections.
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { key: 'VITE_API_BASE_URL', value: engineUrl, desc: 'Core engine URL' },
                        { key: 'VITE_TASK_ENGINE_URL', value: taskEngineUrl, desc: 'Task engine URL' },
                      ].map((env) => (
                        <div key={env.key} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          <span className="font-mono-id font-medium" style={{ color: 'var(--accent-blue)' }}>{env.key}</span>
                          <span style={{ color: 'var(--text-muted)' }}>=</span>
                          <span className="font-mono-id" style={{ color: 'var(--text-primary)' }}>{env.value}</span>
                          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{env.desc}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* ── Appearance ──────────────────────────────── */}
              {activeTab === 'appearance' && (
                <div>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Appearance</h3>

                  <SettingRow label="Theme" description={theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}>
                    <Button variant="secondary" size="sm" onClick={toggleTheme}>
                      <span className="inline-flex items-center gap-1.5">
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </span>
                    </Button>
                  </SettingRow>

                  <SettingRow label="Sidebar" description="Sidebar is auto-collapsed on detail pages">
                    <Badge variant="muted">Auto-managed</Badge>
                  </SettingRow>

                  <SettingRow label="Font" description="UI uses Anek Telugu for body text and JetBrains Mono for code">
                    <div className="text-right">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Anek Telugu</div>
                      <div className="text-xs font-mono-id" style={{ color: 'var(--text-muted)' }}>JetBrains Mono</div>
                    </div>
                  </SettingRow>
                </div>
              )}

              {/* ── About ──────────────────────────────────── */}
              {activeTab === 'about' && (
                <div>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>About Luke Platform</h3>

                  <div className="space-y-4">
                    <Card>
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-heading" style={{ color: 'var(--accent-blue)' }}>LUKE CORE</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Process & Workflow Management Platform</p>
                        <Badge variant="info" className="mt-2">v1.0.0</Badge>
                      </div>
                    </Card>

                    <Card>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Components</h4>
                      <div className="space-y-2 text-sm">
                        {[
                          { name: 'luke-core-ui', desc: 'React dashboard (Vite + TypeScript + Tailwind)', version: '1.0.0' },
                          { name: 'luke-core-engine', desc: 'CIBSeven / Camunda 7 BPMN engine (Spring Boot)', version: '1.0.0' },
                          { name: 'luke-task-engine', desc: 'Distributed task orchestration engine', version: '1.0.0' },
                        ].map((c) => (
                          <div key={c.name} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div>
                              <span className="font-mono-id font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
                            </div>
                            <Badge>{c.version}</Badge>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Features</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          'BPMN Process Management',
                          'Process Instance Monitoring',
                          'Task Management (User + External)',
                          'Incident & Job Management',
                          'Decision Table (DMN) Viewer',
                          'Deployment Management',
                          'Process History & Audit Log',
                          'BPMN Diagram with Live Tokens',
                          'Heatmap Visualization',
                          'Route Visualization (Green Path)',
                          'External Task Lifecycle Dashboard',
                          'Topic Registry with Deploy Validation',
                          'Workflow Builder (Visual + YAML)',
                          'Multi-Tenant Support',
                          'Dark / Light Theme',
                          'Keyboard Shortcuts',
                        ].map((f) => (
                          <div key={f} className="flex items-center gap-1.5 py-1" style={{ color: 'var(--text-secondary)' }}>
                            <CheckCircle size={12} style={{ color: 'var(--accent-green)' }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
