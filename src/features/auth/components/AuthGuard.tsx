import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { getUserTenants } from '@/features/admin/api/tenant';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const setTenants = useTenantStore((s) => s.setTenants);
  const setActiveTenant = useTenantStore((s) => s.setActiveTenant);
  const [ready, setReady] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !username) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function ensureTenant() {
      // Check store after persist rehydration
      const store = useTenantStore.getState();
      if (store.tenants.length > 0 && store.activeTenantId) {
        setReady(true);
        return;
      }

      // Fetch tenants the user is a member of. No cross-tenant fallback —
      // listing all tenants would leak other customers' org names once
      // consumer-ui exists. If the user has zero memberships, this app is
      // not for them (they belong in consumer-ui), so leave activeTenantId
      // null and let downstream pages show empty/error states.
      try {
        const fetched = await getUserTenants(username!);
        if (fetched.length > 0) {
          setTenants(fetched);
          setActiveTenant(fetched[0].id);
        }
      } catch {
        // continue without tenant
      }
      setReady(true);
    }

    ensureTenant();
  }, [isAuthenticated, username]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}
