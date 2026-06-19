import { describe, it, expect } from 'vitest';
import { isForeignTenant } from './tenantGuard';

describe('isForeignTenant (#47)', () => {
  it('flags a resource from a different tenant', () => {
    expect(isForeignTenant('tenant-b', 'tenant-a')).toBe(true);
  });

  it('allows the active tenant’s own resource', () => {
    expect(isForeignTenant('tenant-a', 'tenant-a')).toBe(false);
  });

  it('does not flag shared / null-tenant resources', () => {
    expect(isForeignTenant(null, 'tenant-a')).toBe(false);
    expect(isForeignTenant(undefined, 'tenant-a')).toBe(false);
  });

  it('does not flag anything when no tenant is active (operator/global view)', () => {
    expect(isForeignTenant('tenant-b', null)).toBe(false);
  });
});
