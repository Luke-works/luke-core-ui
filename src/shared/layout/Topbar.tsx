import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown, LogOut, Building2, Menu, Sun, Moon, RefreshCw, Search, Settings,
  Gauge, Workflow, ListTodo, Siren, BoltIcon, Scale, Cpu, BookCheck, GitBranch,
  Activity, ScrollText, BarChart3, HeartPulse, History, Rocket, CalendarDays,
  ShieldCheck, SlidersHorizontal,
} from 'lucide-react';
import { useUiStore } from '@/shared/stores/uiStore';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { useTenantStore, useActiveTenant } from '@/shared/stores/tenantStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { loadTenants } from '@/features/auth/loadTenants';
import { useAuthz, type ViewArea } from '@/features/auth/hooks/useAuthz';

/* ── Command palette catalog ──────────────────────────────────── */

interface Command {
  label: string;
  to: string;
  section: string;
  icon: React.ElementType;
}

const COMMANDS: Command[] = [
  { label: 'Dashboard', to: '/dashboard', section: 'Operations', icon: Gauge },
  { label: 'Processes', to: '/processes', section: 'Operations', icon: Workflow },
  { label: 'Tasks', to: '/tasks', section: 'Operations', icon: ListTodo },
  { label: 'Incidents', to: '/incidents', section: 'Operations', icon: Siren },
  { label: 'Jobs', to: '/jobs', section: 'Operations', icon: BoltIcon },
  { label: 'Decisions', to: '/decisions', section: 'Operations', icon: Scale },
  { label: 'External Tasks', to: '/external-tasks', section: 'External Tasks', icon: Cpu },
  { label: 'Topic Registry', to: '/external-tasks/topics', section: 'External Tasks', icon: BookCheck },
  { label: 'Workflows', to: '/external-tasks/workflows/builder', section: 'External Tasks', icon: GitBranch },
  { label: 'Runtime Monitor', to: '/runtime', section: 'Runtime', icon: Activity },
  { label: 'Logs', to: '/runtime/logs', section: 'Runtime', icon: ScrollText },
  { label: 'Metrics', to: '/runtime/metrics', section: 'Runtime', icon: BarChart3 },
  { label: 'Health', to: '/runtime/health', section: 'Runtime', icon: HeartPulse },
  { label: 'History', to: '/history', section: 'History', icon: History },
  { label: 'Deployments', to: '/deployments', section: 'History', icon: Rocket },
  { label: 'Calendars', to: '/calendars', section: 'Calendar & SLA', icon: CalendarDays },
  { label: 'Users', to: '/admin/users', section: 'Admin', icon: ShieldCheck },
  { label: 'Tenancy', to: '/admin/tenancy', section: 'Admin', icon: Building2 },
  { label: 'Settings', to: '/settings', section: 'Admin', icon: SlidersHorizontal },
];

// Nav paths that require a role's read access to a given area (mirrors Sidebar).
const AREA_BY_PATH: Record<string, ViewArea> = {
  '/tasks': 'tasks',
  '/deployments': 'deployments',
  '/decisions': 'decisions',
  '/history': 'history',
};

/** Initials for the avatar — first letters of the first two tokens, else first two chars. */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.trim().slice(0, 2) || '?').toUpperCase();
}

export default function Topbar() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
  const { isOperator, canView } = useAuthz();

  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Command palette state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const tenantRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Commands the user is allowed to reach (mirrors the Sidebar's visibility rules).
  const visibleCommands = useMemo(
    () =>
      COMMANDS.filter((c) => {
        if (c.to.startsWith('/admin')) return isOperator;
        const area = AREA_BY_PATH[c.to];
        return area ? canView(area) : true;
      }),
    [isOperator, canView],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleCommands;
    return visibleCommands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q),
    );
  }, [query, visibleCommands]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (tenantRef.current && !tenantRef.current.contains(t)) setTenantDropdownOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ⌘K / Ctrl-K focuses the command palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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

  const runCommand = (to: string) => {
    navigate(to);
    setSearchOpen(false);
    setQuery('');
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) runCommand(target.to);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const iconBtn =
    'flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white transition-colors cursor-pointer';

  return (
    <header
      className="fixed top-0 right-0 h-12 flex items-center justify-between gap-3 px-4 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      style={{
        left: sidebarWidth,
        transition: 'left 200ms ease-in-out',
      }}
    >
      {/* Left: hamburger + tenant selector */}
      <div className="flex items-center gap-3 shrink-0">
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
                <span className="truncate max-w-[90px] sm:max-w-[160px]">
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer max-w-[60vw] sm:max-w-none text-error-600 bg-error-50 border border-error-200 hover:bg-error-100 dark:text-error-400 dark:bg-error-500/10 dark:border-error-500/25 transition-colors"
            >
              <Building2 size={14} className="shrink-0" />
              <span className="truncate">{retryingTenants ? 'Retrying…' : tenantLoadError}</span>
              {!retryingTenants && <RefreshCw size={13} className="shrink-0" />}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-warning-600 bg-warning-50 border border-warning-200 dark:text-warning-400 dark:bg-warning-500/10 dark:border-warning-500/25">
              <Building2 size={14} />
              <span className="whitespace-nowrap">No tenant</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: command palette search */}
      <div ref={searchRef} className="relative hidden md:block flex-1 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          placeholder="Search or type command…"
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setSearchOpen(true);
          }}
          onKeyDown={onSearchKeyDown}
          className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 transition-colors"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
          ⌘K
        </kbd>

        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            {results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                No matches for “{query}”
              </div>
            ) : (
              results.map((cmd, i) => {
                const Icon = cmd.icon;
                const active = i === activeIndex;
                const isCurrent = pathname === cmd.to;
                return (
                  <button
                    key={cmd.to}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => runCommand(cmd.to)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                      active ? 'bg-gray-50 dark:bg-white/[0.03]' : ''
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        isCurrent
                          ? 'text-brand-500 dark:text-brand-400 shrink-0'
                          : 'text-gray-400 dark:text-gray-500 shrink-0'
                      }
                    />
                    <span
                      className={`flex-1 truncate ${
                        isCurrent
                          ? 'text-brand-500 dark:text-brand-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {cmd.label}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                      {cmd.section}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Right: theme toggle + user menu */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => useUiStore.getState().toggleTheme()}
          className={iconBtn}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {initialsFrom(username ?? '?')}
            </span>
            <span className="hidden sm:inline truncate max-w-[120px] font-medium text-gray-700 dark:text-gray-300">
              {username ?? 'Guest'}
            </span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
              <div className="px-2 pb-2 mb-1 border-b border-gray-200 dark:border-gray-800">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {username ?? 'Guest'}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  {activeTenant?.name ?? activeTenant?.id ?? 'No tenant'}
                </div>
              </div>
              <button
                onClick={() => {
                  navigate('/settings');
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full text-left px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <Settings size={16} className="text-gray-400 dark:text-gray-500" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-2 py-2 rounded-lg text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
