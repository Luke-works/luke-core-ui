import { useState, useRef, useEffect } from 'react';
import { RefreshCw, ChevronDown, LogOut, User, Sun, Moon, Building2, Menu } from 'lucide-react';
import { useUiStore } from '@/shared/stores/uiStore';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { useTenantStore, useActiveTenant } from '@/shared/stores/tenantStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { loadTenants } from '@/features/auth/loadTenants';

export default function Topbar() {
  const isMobile = useIsMobile();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);
  const theme = useUiStore((s) => s.theme);
  const tenants = useTenantStore((s) => s.tenants);
  const activeTenant = useActiveTenant();
  const setActiveTenant = useTenantStore((s) => s.setActiveTenant);
  const tenantLoadError = useTenantStore((s) => s.loadError);
  const [retryingTenants, setRetryingTenants] = useState(false);
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const clearTenants = useTenantStore((s) => s.clear);

  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tenantRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        tenantRef.current &&
        !tenantRef.current.contains(e.target as Node)
      ) {
        setTenantDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 64 : 240;

  const handleLogout = () => {
    logout();
    clearTenants();
    setUserMenuOpen(false);
  };

  const handleRetryTenants = async () => {
    if (!username) return;
    setRetryingTenants(true);
    try {
      await loadTenants(username);
    } catch {
      /* loadError is set on the store; the message stays visible */
    } finally {
      setRetryingTenants(false);
    }
  };

  // TailAdmin icon-button chrome — small, rounded, gray with a soft hover fill.
  const iconBtn =
    'flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white transition-colors cursor-pointer';

  return (
    <header
      className="fixed top-0 right-0 h-12 flex items-center justify-between px-4 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      style={{
        left: sidebarWidth,
        transition: 'left 200ms ease-in-out',
      }}
    >
      {/* Left: hamburger + tenant selector */}
      <div className="flex items-center gap-3">
      <button
        onClick={isMobile ? toggleMobileSidebar : toggleSidebar}
        className={iconBtn}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>
      <div ref={tenantRef} className="relative">
        {tenants.length > 0 ? (
          <>
            <button
              onClick={() => setTenantDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-white/[0.03] dark:hover:border-gray-700 transition-colors cursor-pointer"
            >
              <Building2
                size={14}
                className={activeTenant ? 'text-brand-500' : 'text-warning-500'}
              />
              <span className="truncate max-w-[110px] sm:max-w-[180px]">
                {activeTenant?.name ?? activeTenant?.id ?? 'Select tenant'}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {tenantDropdownOpen && tenants.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Tenants
                </div>
                {tenants.map((tenant) => {
                  const active = tenant.id === activeTenant?.id;
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => {
                        setActiveTenant(tenant.id);
                        setTenantDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                        active
                          ? 'text-brand-500 dark:text-brand-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          active ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      <span className="truncate">{tenant.name || tenant.id}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : tenantLoadError ? (
          // The fetch FAILED (vs. genuinely zero memberships) — show it + a Retry so the
          // operator isn't stuck at a silent dead-end (and can report the exact error).
          <button
            onClick={handleRetryTenants}
            disabled={retryingTenants}
            title={tenantLoadError}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer max-w-[70vw] sm:max-w-none text-error-600 bg-error-50 border border-error-200 hover:bg-error-100 dark:text-error-400 dark:bg-error-500/10 dark:border-error-500/25 transition-colors"
          >
            <Building2 size={14} className="shrink-0" />
            <span className="truncate">{retryingTenants ? 'Retrying…' : tenantLoadError}</span>
            {!retryingTenants && <RefreshCw size={13} className="shrink-0" />}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-warning-600 bg-warning-50 border border-warning-200 dark:text-warning-400 dark:bg-warning-500/10 dark:border-warning-500/25">
            <Building2 size={14} />
            <span>No tenant selected</span>
          </div>
        )}
      </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => useUiStore.getState().toggleTheme()}
          className={iconBtn}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Refresh indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-white/[0.03]">
          <RefreshCw size={13} />
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white transition-colors cursor-pointer"
          >
            <User size={16} />
            <span className="text-sm hidden sm:inline truncate max-w-[120px]">{username ?? 'Guest'}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
