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

  it('cancels in-flight queries and clears the cache when the active tenant changes', () => {
    const clearSpy = vi.spyOn(QueryClient.prototype, 'clear');
    const cancelSpy = vi.spyOn(QueryClient.prototype, 'cancelQueries').mockResolvedValue();
    render(
      <QueryProvider>
        <div>app</div>
      </QueryProvider>,
    );
    clearSpy.mockClear();
    cancelSpy.mockClear(); // ignore anything during initial mount

    act(() => {
      useTenantStore.setState({ activeTenantId: 'tenant-b' });
    });
    // Cancel must run so a previous-tenant response can't repopulate the cache.
    expect(cancelSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('does NOT clear the cache when the tenant is unchanged', () => {
    const clearSpy = vi.spyOn(QueryClient.prototype, 'clear');
    render(
      <QueryProvider>
        <div>app</div>
      </QueryProvider>,
    );
    clearSpy.mockClear();

    act(() => {
      useTenantStore.setState({ activeTenantId: 'tenant-a' }); // same value
    });
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
