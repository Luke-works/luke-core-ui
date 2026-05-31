import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant } from '@/features/admin/api/tenant';

interface TenantState {
  tenants: Tenant[];
  activeTenantId: string | null;
  setTenants: (tenants: Tenant[]) => void;
  setActiveTenant: (id: string) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      tenants: [],
      activeTenantId: null,

      setTenants: (tenants: Tenant[]) => {
        const current = get().activeTenantId;
        const stillValid = tenants.some((t) => t.id === current);
        set({
          tenants,
          activeTenantId: stillValid ? current : tenants[0]?.id ?? null,
        });
      },

      setActiveTenant: (id: string) => {
        set({ activeTenantId: id });
      },

      clear: () => {
        set({ tenants: [], activeTenantId: null });
      },
    }),
    {
      name: 'luke-core-tenant-storage',
      partialize: (state) => ({
        tenants: state.tenants,
        activeTenantId: state.activeTenantId,
      }),
    },
  ),
);

// Selector to get active tenant object (use this instead of store getter)
export function useActiveTenant(): Tenant | null {
  const tenants = useTenantStore((s) => s.tenants);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  return tenants.find((t) => t.id === activeTenantId) ?? null;
}
