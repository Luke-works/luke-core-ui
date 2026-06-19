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

api.interceptors.request.use((config) => {
  // Inject Basic auth
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    const encoded = btoa(`${username}:${password}`);
    config.headers.set('Authorization', `Basic ${encoded}`);
  }

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

  // Cache-bust GETs so CIBSeven's ETag revalidation can't return a bodyless
  // 304 Not Modified. Without this, a 304 hands callers an empty body and any
  // code that treats the result as an array (.some/.map) throws. With a unique
  // param the browser never sends If-None-Match, so the engine always returns
  // 200 + full body. (This supersedes the 304-tolerant validateStatus above.)
  if (config.method === 'get') {
    config.params = { ...config.params, _dc: Date.now() };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      useTenantStore.getState().clear();
      window.location.href = '/login';
    }
    throw error;
  },
);

export { api };
