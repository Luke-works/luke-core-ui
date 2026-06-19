import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/engine-rest`
  : '/engine-rest';

const api = axios.create({
  baseURL,
  // CIBSeven engine-rest emits ETags, so conditional GETs (e.g. the /engine
  // login probe) can come back 304 Not Modified. A 304 means the request was
  // authorized and the cached body is still valid — treat it as success instead
  // of letting axios' default (200–299 only) throw and fail login.
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

// Engine-rest endpoints that are global by design (engine probe, tenant +
// identity management) and must NOT be tenant-scoped. Matched by exact path or
// as a path *segment* (prefix + '/') — never as a loose string prefix, so
// '/user' no longer silently swallows '/user-operation' and friends.
const TENANT_GLOBAL_PREFIXES = ['/engine', '/tenant', '/user', '/group', '/identity'];

// Exported for unit testing.
export function shouldExcludeTenant(url: string | undefined): boolean {
  // Unknown URL → tenant-SCOPE it (fail-closed). We only opt a path out of
  // scoping when it is a recognized global endpoint, never by default.
  if (!url) return false;
  const path = (url.startsWith('/') ? url : `/${url}`).split('?')[0];
  return TENANT_GLOBAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Inject HTTP Basic auth from the auth store. The single place credentials are
 *  encoded (#31) so feature clients don't each re-encode them. */
export function injectBasicAuth(config: { headers: { set: (k: string, v: string) => void } }): void {
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    config.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }
}

/** Shared 401 handler: sign out, clear tenant, redirect to /login, then rethrow —
 *  so every axios instance treats an expired session identically (#31). */
export function handleAuthError(error: unknown): never {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) {
    useAuthStore.getState().logout();
    useTenantStore.getState().clear();
    window.location.href = '/login';
  }
  throw error;
}

api.interceptors.request.use((config) => {
  injectBasicAuth(config);

  // Inject tenant as header on all requests + query param on GETs.
  // STRICT tenant scoping (#48): tenantIdIn matches only the active tenant, so
  // shared / no-tenant (tenantId=null) artifacts are intentionally NOT shown while a
  // tenant is selected. (Decision: each tenant sees only its own artifacts; we do not
  // add withoutTenantId.) NOTE: endpoints without a tenantIdIn filter (e.g.
  // /process-definition/statistics) must be scoped at the call site instead — the
  // param is silently ignored there (see processes/api filterStatisticsByTenant).
  const tenantId = useTenantStore.getState().activeTenantId;
  if (tenantId && !shouldExcludeTenant(config.url)) {
    config.headers.set('X-Tenant-Id', tenantId);
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        tenantIdIn: tenantId,
      };
    }
  }

  // Cache-busting is scoped to the login/engine probe ONLY (#26). A blanket _dc on
  // every GET defeated all ETag/304 revalidation — on a polling ops console that
  // forced full-body responses on every poll and navigation. The probe needs a
  // guaranteed-fresh 200 (a bodyless 304 there breaks the auth check); everywhere
  // else conditional GETs now let the engine return a cheap 304 and the browser
  // serves the cached body transparently (callers still see 200 + body).
  if (config.method === 'get' && config.url?.split('?')[0].startsWith('/engine')) {
    config.params = { ...config.params, _dc: Date.now() };
  }

  return config;
});

api.interceptors.response.use((response) => response, handleAuthError);

export { api };
