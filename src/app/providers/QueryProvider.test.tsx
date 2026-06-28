import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { render } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import QueryProvider from './QueryProvider';
import { useTenantStore } from '@/shared/stores/tenantStore';

describe('QueryProvider tenant cache reset', () => {
  beforeEach(() => {
    useTenantStore.setState({ activeTenantId: 'tenant-a' });
  });

  it('resets queries (cancel + drop + refetch mounted) when the active tenant changes', () => {
    const resetSpy = vi.spyOn(QueryClient.prototype, 'resetQueries').mockResolvedValue();
    render(
      <QueryProvider>
        <div>app</div>
      </QueryProvider>,
    );
    resetSpy.mockClear(); // ignore anything during initial mount

    act(() => {
      useTenantStore.setState({ activeTenantId: 'tenant-b' });
    });
    // resetQueries cancels in-flight requests AND refetches mounted queries with the
    // new tenant header, so the active page updates without a full page reload.
    expect(resetSpy).toHaveBeenCalled();
  });

  it('does NOT reset queries when the tenant is unchanged', () => {
    const resetSpy = vi.spyOn(QueryClient.prototype, 'resetQueries').mockResolvedValue();
    render(
      <QueryProvider>
        <div>app</div>
      </QueryProvider>,
    );
    resetSpy.mockClear();

    act(() => {
      useTenantStore.setState({ activeTenantId: 'tenant-a' }); // same value
    });
    expect(resetSpy).not.toHaveBeenCalled();
  });
});
