import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { loadTenants } from '@/features/auth/loadTenants';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const [ready, setReady] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !username) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function ensureTenant() {
      // Check store after persist rehydration — a cached active tenant means we're set.
      const store = useTenantStore.getState();
      if (store.tenants.length > 0 && store.activeTenantId) {
        setReady(true);
        return;
      }

      // Fetch the tenants the user is a member of. No cross-tenant fallback (listing all
      // tenants would leak other customers' org names). A failure is recorded on the
      // store (loadError) and surfaced in the Topbar with a Retry — never swallowed —
      // so a fresh session isn't stuck at a silent "No tenant selected".
      try {
        await loadTenants(username!);
      } catch {
        // loadTenants already recorded loadError; render on so the Topbar can show it.
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return <>{children}</>;
}
