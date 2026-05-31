import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

const baseURL = import.meta.env.VITE_CAMUNDA_BASE_URL
  ? `${import.meta.env.VITE_CAMUNDA_BASE_URL}/engine-rest`
  : '/engine-rest';

const api = axios.create({ baseURL });

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
