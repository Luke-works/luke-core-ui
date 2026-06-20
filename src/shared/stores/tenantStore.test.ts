import { describe, it, expect, beforeEach } from 'vitest';
import { useTenantStore } from './tenantStore';

const T = (id: string) => ({ id, name: id });

describe('tenantStore.setTenants — active-tenant validity (#28)', () => {
  beforeEach(() => useTenantStore.getState().clear());

  it('keeps the active tenant when it is still present', () => {
    const s = useTenantStore.getState();
    s.setTenants([T('a'), T('b')]);
    s.setActiveTenant('b');
    s.setTenants([T('a'), T('b'), T('c')]);
    expect(useTenantStore.getState().activeTenantId).toBe('b');
  });

  it('falls back to the first tenant when the active one disappears', () => {
    const s = useTenantStore.getState();
    s.setTenants([T('a'), T('b')]);
    s.setActiveTenant('b');
    s.setTenants([T('a'), T('c')]); // 'b' gone
    expect(useTenantStore.getState().activeTenantId).toBe('a');
  });

  it('clears the active tenant when the list becomes empty', () => {
    const s = useTenantStore.getState();
    s.setTenants([T('a')]);
    s.setTenants([]);
    expect(useTenantStore.getState().activeTenantId).toBeNull();
  });
});
