import { describe, it, expect, vi } from 'vitest';

// The client module pulls in zustand stores; stub them so importing the helper
// has no side effects. We only exercise the pure shouldExcludeTenant function.
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ username: '', password: '' }) },
}));
vi.mock('@/shared/stores/tenantStore', () => ({
  useTenantStore: { getState: () => ({ activeTenantId: null, clear: () => {} }) },
}));

import { shouldExcludeTenant } from './client';

describe('shouldExcludeTenant (#41)', () => {
  it('excludes the exact global endpoints', () => {
    for (const p of ['/engine', '/tenant', '/user', '/group', '/identity']) {
      expect(shouldExcludeTenant(p)).toBe(true);
    }
  });

  it('excludes subpaths of global endpoints (segment match)', () => {
    expect(shouldExcludeTenant('/user/123')).toBe(true);
    expect(shouldExcludeTenant('/identity/verify')).toBe(true);
    expect(shouldExcludeTenant('/tenant/acme')).toBe(true);
  });

  it('does NOT exclude lookalike paths that merely share a prefix', () => {
    // The old loose startsWith bug: '/user' swallowed '/user-operation'.
    expect(shouldExcludeTenant('/user-operation')).toBe(false);
    expect(shouldExcludeTenant('/groups-of-things')).toBe(false);
    expect(shouldExcludeTenant('/engineering')).toBe(false);
  });

  it('scopes normal tenant resources', () => {
    expect(shouldExcludeTenant('/task')).toBe(false);
    expect(shouldExcludeTenant('/process-instance')).toBe(false);
    expect(shouldExcludeTenant('/history/incident')).toBe(false);
  });

  it('fails closed (scopes) on unknown/undefined urls', () => {
    expect(shouldExcludeTenant(undefined)).toBe(false);
    expect(shouldExcludeTenant('')).toBe(false);
  });

  it('ignores query strings when matching', () => {
    expect(shouldExcludeTenant('/user?firstResult=0')).toBe(true);
    expect(shouldExcludeTenant('/task?active=true')).toBe(false);
  });
});
