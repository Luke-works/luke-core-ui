import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, hashKey } from '@tanstack/react-query';
import { useTenantStore } from '@/shared/stores/tenantStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Namespace EVERY cache entry by the active tenant: the same queryKey under a
      // different tenant hashes to a different entry, so React Query can never serve
      // one tenant's data to another — tenant isolation that doesn't depend on the
      // clear-on-switch below (defense-in-depth, #46). Switching tenant routes reads
      // to a fresh entry → automatic refetch with the new tenant header.
      queryKeyHashFn: (key) => `${useTenantStore.getState().activeTenantId ?? 'none'}::${hashKey(key)}`,
    },
  },
});

/**
 * Resets all cached query data whenever the active tenant changes. Query keys
 * don't include the tenant — the tenant is carried on the X-Tenant-Id header —
 * so without this, switching org would serve the previous tenant's cached
 * processes/tasks/etc. until staleTime expired (cross-tenant data leak).
 */
function TenantCacheReset() {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const previous = useRef(activeTenantId);
  useEffect(() => {
    if (previous.current !== activeTenantId) {
      previous.current = activeTenantId;
      // resetQueries (rather than clear) cancels every in-flight request, drops the
      // cached data, AND immediately refetches any query that is currently mounted —
      // with the new tenant's X-Tenant-Id header. clear() wiped the cache but left
      // the page observing a removed entry, so the active page kept showing the old
      // tenant's rows/counts until a full page reload remounted it. Cancelling first
      // also closes the race where a previous-tenant response resolves after the reset
      // and repopulates the (tenant-agnostic) cache.
      void queryClient.resetQueries();
    }
  }, [activeTenantId]);
  return null;
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantCacheReset />
      {children}
    </QueryClientProvider>
  );
}
