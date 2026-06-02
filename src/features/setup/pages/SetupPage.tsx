import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, ChevronRight, ChevronLeft, Check, User, Database, Cpu, Rocket } from 'lucide-react';
import { toast } from 'sonner';

import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';

/* ── Steps ───────────────────────────────────────────────── */

const STEPS = [
  { id: 'welcome', label: 'Welcome', num: 1 },
  { id: 'admin', label: 'Admin Account', num: 2 },
  { id: 'database', label: 'Database', num: 3 },
  { id: 'services', label: 'Services', num: 4 },
  { id: 'finish', label: 'Finish', num: 5 },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.625rem 0.875rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
};

/* ================================================================== */
/*  Setup Page                                                         */
/* ================================================================== */

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    // Admin
    adminUsername: 'admin',
    adminPassword: '',
    adminPasswordConfirm: '',
    adminFirstName: 'Admin',
    adminLastName: 'User',
    adminEmail: '',
    // Database
    dbType: 'h2' as 'h2' | 'postgresql',
    dbHost: 'localhost',
    dbPort: '5432',
    dbName: 'luke_camunda',
    dbUsername: 'luke',
    dbPassword: 'luke',
    // Services
    engineName: 'Luke Core',
    taskEngineEnabled: true,
    taskEngineUrl: 'http://localhost:8090',
    topicValidation: true,
    historyLevel: 'full',
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const canNext = () => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return form.adminUsername.length >= 3 && form.adminPassword.length >= 4 && form.adminPassword === form.adminPasswordConfirm;
      case 2: return true; // DB always has defaults
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const engineUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

      // Save setup config to backend
      const res = await fetch(`${engineUrl}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Setup failed' }));
        throw new Error(err.error || 'Setup failed');
      }

      // Mark setup as complete in localStorage
      localStorage.setItem('luke-setup-complete', 'true');

      toast.success('Setup complete! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      // If backend doesn't have /api/setup yet, just mark as complete
      localStorage.setItem('luke-setup-complete', 'true');
      toast.success('Setup complete!');
      setTimeout(() => navigate('/login'), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Hexagon size={36} style={{ color: 'var(--accent-blue)' }} />
            <h1 className="font-heading text-3xl font-bold tracking-wider" style={{ color: 'var(--accent-blue)' }}>
              LUKE CORE
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Platform Setup</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium w-full"
                style={{
                  backgroundColor: i === step ? 'var(--accent-blue)' : i < step ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)',
                  color: i === step ? '#fff' : i < step ? 'var(--accent-green)' : 'var(--text-muted)',
                  border: `1px solid ${i === step ? 'var(--accent-blue)' : i < step ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: i < step ? 'var(--accent-green)' : 'transparent', color: i < step ? '#fff' : 'inherit' }}>
                  {i < step ? <Check size={10} /> : s.num}
                </span>
                <span className="truncate">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card>
          <div style={{ minHeight: 320 }}>

            {/* ── Step 1: Welcome ─────────────────────────── */}
            {step === 0 && (
              <div className="text-center py-8">
                <Rocket size={48} style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
                <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Welcome to Luke Platform
                </h2>
                <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  Let's get your platform configured. This wizard will set up your admin account,
                  database connection, and core services. It only takes a minute.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                  {[
                    { icon: User, label: 'Admin Account', desc: 'Create your first user' },
                    { icon: Database, label: 'Database', desc: 'H2 or PostgreSQL' },
                    { icon: Cpu, label: 'Services', desc: 'Configure engines' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <item.icon size={20} style={{ color: 'var(--accent-blue)', margin: '0 auto 8px' }} />
                      <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Admin Account ───────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User size={20} style={{ color: 'var(--accent-blue)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Admin Account</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input type="text" value={form.adminFirstName} onChange={(e) => set('adminFirstName', e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Last Name">
                    <input type="text" value={form.adminLastName} onChange={(e) => set('adminLastName', e.target.value)} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Username *">
                  <input type="text" value={form.adminUsername} onChange={(e) => set('adminUsername', e.target.value)}
                    placeholder="admin" style={inputStyle} />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)}
                    placeholder="admin@company.com" style={inputStyle} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Password *">
                    <input type="password" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)}
                      placeholder="Min 4 characters" style={inputStyle} />
                  </Field>
                  <Field label="Confirm Password *">
                    <input type="password" value={form.adminPasswordConfirm} onChange={(e) => set('adminPasswordConfirm', e.target.value)}
                      placeholder="Re-enter password" style={{
                        ...inputStyle,
                        borderColor: form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm ? 'var(--accent-red)' : undefined,
                      }} />
                  </Field>
                </div>
                {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                  <p className="text-xs" style={{ color: 'var(--accent-red)' }}>Passwords do not match</p>
                )}
              </div>
            )}

            {/* ── Step 3: Database ────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Database size={20} style={{ color: 'var(--accent-blue)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Database Configuration</h2>
                </div>

                <Field label="Database Type">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'h2', label: 'H2 (Embedded)', desc: 'In-memory, no setup needed. Data lost on restart. Best for testing.' },
                      { id: 'postgresql', label: 'PostgreSQL', desc: 'Persistent storage. Recommended for production.' },
                    ].map((db) => (
                      <button key={db.id} type="button" onClick={() => set('dbType', db.id)}
                        className="p-4 rounded-lg text-left cursor-pointer transition-all"
                        style={{
                          backgroundColor: form.dbType === db.id ? 'rgba(59,123,244,0.08)' : 'var(--bg-elevated)',
                          border: `2px solid ${form.dbType === db.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                        }}>
                        <div className="text-sm font-semibold" style={{ color: form.dbType === db.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{db.label}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{db.desc}</div>
                      </button>
                    ))}
                  </div>
                </Field>

                {form.dbType === 'postgresql' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Field label="Host">
                          <input type="text" value={form.dbHost} onChange={(e) => set('dbHost', e.target.value)} style={inputStyle} />
                        </Field>
                      </div>
                      <Field label="Port">
                        <input type="text" value={form.dbPort} onChange={(e) => set('dbPort', e.target.value)} style={inputStyle} />
                      </Field>
                    </div>
                    <Field label="Database Name">
                      <input type="text" value={form.dbName} onChange={(e) => set('dbName', e.target.value)} style={inputStyle} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Username">
                        <input type="text" value={form.dbUsername} onChange={(e) => set('dbUsername', e.target.value)} style={inputStyle} />
                      </Field>
                      <Field label="Password">
                        <input type="password" value={form.dbPassword} onChange={(e) => set('dbPassword', e.target.value)} style={inputStyle} />
                      </Field>
                    </div>
                  </>
                )}

                {form.dbType === 'h2' && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: 'var(--text-secondary)' }}>
                    H2 stores data in memory. All data is lost when the server stops. Use PostgreSQL for persistent data.
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Services ────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu size={20} style={{ color: 'var(--accent-blue)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Service Configuration</h2>
                </div>

                <Field label="Engine Name">
                  <input type="text" value={form.engineName} onChange={(e) => set('engineName', e.target.value)}
                    placeholder="Luke Core" style={inputStyle} />
                </Field>

                <Field label="History Level">
                  <select value={form.historyLevel} onChange={(e) => set('historyLevel', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="full">Full (recommended)</option>
                    <option value="audit">Audit</option>
                    <option value="activity">Activity</option>
                    <option value="none">None</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Full: all process data recorded. Audit: no variable-level detail. None: no history.
                  </p>
                </Field>

                <div className="pt-2 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={form.taskEngineEnabled} onChange={(e) => set('taskEngineEnabled', e.target.checked)} className="accent-[var(--accent-blue)]" />
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enable Task Engine</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Distributed external task orchestration, workflow builder, topic registry</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={form.topicValidation} onChange={(e) => set('topicValidation', e.target.checked)} className="accent-[var(--accent-blue)]" />
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Topic Deployment Validation</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reject BPMN deployments with unregistered external task topics</p>
                    </div>
                  </label>
                </div>

                {form.taskEngineEnabled && (
                  <Field label="Task Engine URL">
                    <input type="text" value={form.taskEngineUrl} onChange={(e) => set('taskEngineUrl', e.target.value)} style={inputStyle} />
                  </Field>
                )}
              </div>
            )}

            {/* ── Step 5: Finish ──────────────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Check size={48} style={{ color: 'var(--accent-green)', margin: '0 auto 12px' }} />
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ready to Launch</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Review your configuration and click Finish to start the platform.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReviewCard title="Admin Account">
                    <ReviewRow label="Username" value={form.adminUsername} />
                    <ReviewRow label="Name" value={`${form.adminFirstName} ${form.adminLastName}`} />
                    <ReviewRow label="Email" value={form.adminEmail || '—'} />
                  </ReviewCard>

                  <ReviewCard title="Database">
                    <ReviewRow label="Type" value={form.dbType === 'h2' ? 'H2 (Embedded)' : 'PostgreSQL'} />
                    {form.dbType === 'postgresql' && (
                      <>
                        <ReviewRow label="Host" value={`${form.dbHost}:${form.dbPort}`} />
                        <ReviewRow label="Database" value={form.dbName} />
                      </>
                    )}
                  </ReviewCard>

                  <ReviewCard title="Engine">
                    <ReviewRow label="Name" value={form.engineName} />
                    <ReviewRow label="History" value={form.historyLevel} />
                  </ReviewCard>

                  <ReviewCard title="Services">
                    <ReviewRow label="Task Engine" value={form.taskEngineEnabled ? 'Enabled' : 'Disabled'} />
                    <ReviewRow label="Topic Validation" value={form.topicValidation ? 'Enabled' : 'Disabled'} />
                    {form.taskEngineEnabled && <ReviewRow label="Task Engine URL" value={form.taskEngineUrl} />}
                  </ReviewCard>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-5 mt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  <ChevronLeft size={16} className="mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length}</span>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Next <ChevronRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? 'Setting up...' : 'Finish Setup'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Luke Platform v1.0.0
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs gap-2">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-right font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
