import { describe, it, expect } from 'vitest';
import { filterStatisticsByTenant } from './endpoints';
import type { ProcessDefinitionStatistics } from './types';

const stat = (tenantId: string | null): ProcessDefinitionStatistics =>
  ({ id: `d-${tenantId}`, instances: 1, failedJobs: 0, incidents: [], definition: { tenantId } }) as unknown as ProcessDefinitionStatistics;

describe('filterStatisticsByTenant (#dashboard cross-tenant stats)', () => {
  const stats = [stat('tenant-a'), stat('tenant-b'), stat(null)];

  it('keeps only the active tenant’s definitions', () => {
    expect(filterStatisticsByTenant(stats, 'tenant-a').map((s) => s.definition.tenantId)).toEqual([
      'tenant-a',
    ]);
  });

  it('does not leak other tenants', () => {
    const out = filterStatisticsByTenant(stats, 'tenant-b');
    expect(out).toHaveLength(1);
    expect(out[0].definition.tenantId).toBe('tenant-b');
  });

  it('returns all when no tenant is active (operator/global view)', () => {
    expect(filterStatisticsByTenant(stats, null)).toHaveLength(3);
  });
});
