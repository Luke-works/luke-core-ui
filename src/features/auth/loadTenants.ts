import { getUserTenants } from '@/features/admin/api/tenant';
import { useTenantStore } from '@/shared/stores/tenantStore';

/**
 * Fetch the tenants the current user is a member of and populate the store. Shared by
 * AuthGuard (on session start) and the Topbar's retry, so a transient failure isn't a
 * silent dead-end. On failure it records a human-readable message in the store
 * (`loadError`) — surfaced in the Topbar — instead of swallowing it.
 *
 * NOTE: an empty result is NOT an error — it means the user has zero memberships (they
 * belong in consumer-ui), so we leave the tenant unselected without a loadError.
 */
export async function loadTenants(username: string): Promise<void> {
  const store = useTenantStore.getState();
  store.setLoadError(null);
  try {
    const fetched = await getUserTenants(username);
    if (fetched.length > 0) {
      store.setTenants(fetched);
      if (!useTenantStore.getState().activeTenantId) {
        store.setActiveTenant(fetched[0].id);
      }
    }
  } catch (e) {
    const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const status = err?.response?.status;
    const detail = err?.response?.data?.message || err?.message || 'request failed';
    const msg = status ? `Couldn't load tenants (HTTP ${status})` : `Couldn't load tenants — ${detail}`;
    // Surface it (store + console) instead of swallowing — this is what turned "No
    // tenant selected" into an undiagnosable dead-end on a fresh session.
    console.error('[tenants] load failed:', status, detail, e);
    store.setLoadError(msg);
    throw e;
  }
}
