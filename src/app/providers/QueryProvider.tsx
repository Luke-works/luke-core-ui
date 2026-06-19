import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTenantStore } from '@/shared/stores/tenantStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
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
