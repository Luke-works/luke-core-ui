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
 * Drops all cached query data whenever the active tenant changes. Query keys
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
      // Cancel in-flight fetches FIRST: a request issued for the previous tenant can
      // otherwise resolve AFTER the clear and repopulate the (tenant-agnostic) cache,
      // rendering the old tenant's rows under the new tenant. React Query discards a
      // cancelled query's result, so cancel-then-clear closes that race.
      void queryClient.cancelQueries();
      queryClient.clear();
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
