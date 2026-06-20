import { describe, it, expect } from 'vitest';
import { deriveAuthz } from './useAuthz';

const role = (id: string) => ({ id, type: 'ROLE' });

describe('deriveAuthz — RBAC derivation (#28)', () => {
  it('operators get every capability + view area', () => {
    const a = deriveAuthz({ operator: true, groups: [] });
    expect(a.isOperator).toBe(true);
    expect(a.can('deploy')).toBe(true);
    expect(a.can('operate')).toBe(true);
    expect(a.canView('decisions')).toBe(true);
    expect(a.canAdmin).toBe(true);
    expect(a.isReadOnly).toBe(false);
  });

  it('a base role grants its write caps', () => {
    const a = deriveAuthz({ operator: false, groups: [role('process-operator')] });
    expect(a.can('operate')).toBe(true);
    expect(a.can('deploy')).toBe(false);
    expect(a.isReadOnly).toBe(false);
    expect(a.canView('tasks')).toBe(true);
    expect(a.canView('deployments')).toBe(false);
  });

  it('a -readonly role grants NO write caps but still views its areas', () => {
    const a = deriveAuthz({ operator: false, groups: [role('tenant-admin-readonly')] });
    expect(a.can('deploy')).toBe(false);
    expect(a.can('operate')).toBe(false);
    expect(a.isReadOnly).toBe(true);
    // readonly suffix is stripped for view-area mapping
    expect(a.roles).toContain('tenant-admin');
    expect(a.canView('deployments')).toBe(true);
  });

  it('mixed roles union their write caps and are not read-only', () => {
    const a = deriveAuthz({ operator: false, groups: [role('deployer'), role('task-worker')] });
    expect(a.can('deploy')).toBe(true); // from deployer
    expect(a.can('workTasks')).toBe(true); // from task-worker
    expect(a.can('manageDecisions')).toBe(false);
    expect(a.isReadOnly).toBe(false);
  });

  it('non-ROLE groups are ignored; no roles → no caps, not read-only', () => {
    const a = deriveAuthz({ operator: false, groups: [{ id: 'some-team', type: 'WORKFLOW' }] });
    expect(a.roles).toEqual([]);
    expect(a.can('operate')).toBe(false);
    expect(a.isReadOnly).toBe(false); // no role groups at all ≠ read-only
  });
});
