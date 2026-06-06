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

// Paths that should NOT get tenant filtering (auth, tenant listing, identity)
const TENANT_EXCLUDE_PATHS = ['/engine', '/tenant', '/user', '/group', '/identity'];

function shouldExcludeTenant(url: string | undefined): boolean {
  if (!url) return true;
  return TENANT_EXCLUDE_PATHS.some((p) => url.startsWith(p));
}

api.interceptors.request.use((config) => {
  // Inject Basic auth
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    const encoded = btoa(`${username}:${password}`);
    config.headers.set('Authorization', `Basic ${encoded}`);
  }

  // Inject tenant as header on all requests + query param on GETs
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
