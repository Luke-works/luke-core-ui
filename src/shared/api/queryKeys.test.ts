import { describe, it, expect } from 'vitest';
import { qk } from './queryKeys';

/**
 * The whole point of the factories (#42) is that query and invalidate share a key
 * shape, and that React Query's prefix-matching makes `.all` invalidate every
 * paginated/count variant. These tests pin that contract.
 */
describe('query-key factories (#42)', () => {
  it('list/count keys are prefixed by the feature `all` key', () => {
    // React Query invalidates by prefix, so qk.users.all must be a prefix of
    // every users key or a broad invalidation would miss the paginated list.
    expect(qk.users.list({ firstResult: 20 })[0]).toBe(qk.users.all[0]);
    expect(qk.users.count()[0]).toBe(qk.users.all[0]);
    expect(qk.groups.list()[0]).toBe(qk.groups.all[0]);
    expect(qk.tenants.count()[0]).toBe(qk.tenants.all[0]);
  });

  it('list keys carry their params so different pages are distinct cache entries', () => {
    const p1 = qk.users.list({ firstResult: 0 });
    const p2 = qk.users.list({ firstResult: 20 });
    expect(p1).not.toEqual(p2);
    expect(p1[1]).toEqual({ firstResult: 0 });
  });

  it('detail keys carry the id (narrow invalidation target)', () => {
    expect(qk.tasks.detail('t1')).toEqual(['task', 't1']);
    expect(qk.processInstances.variables('pi1')).toEqual([
      'processInstanceVariables',
      'pi1',
    ]);
  });

  it('member keys are scoped per group/tenant', () => {
    expect(qk.users.groupMembers('g1')).toEqual(['group-members', 'g1']);
    expect(qk.users.tenantMembers('acme')).toEqual(['tenant-members', 'acme']);
  });
});
