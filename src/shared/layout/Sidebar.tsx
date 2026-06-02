import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Gauge,
  Workflow,
  ListTodo,
  Siren,
  BoltIcon,
  History,
  Rocket,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Hexagon,
  Cpu,
  BookCheck,
  GitBranch,
  CalendarDays,
  Building2,
  Activity,
  ScrollText,
  BarChart3,
  HeartPulse,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { useUiStore } from '@/shared/stores/uiStore';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { useAuthz, type ViewArea } from '@/features/auth/hooks/useAuthz';

/* ── Subscription types & fetcher ─────────────────────────── */

interface CapabilitySubscription {
  code: string;
  name: string;
  icon: string;
  route: string;
  status: string;
  tier: string;
}

const subscriptionBaseUrl = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

async function fetchMySubscriptions(): Promise<CapabilitySubscription[]> {
  const { username, password } = useAuthStore.getState();
  const tenantId = useTenantStore.getState().activeTenantId;
  const headers: Record<string, string> = {};
  if (username && password) {
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  }
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  const { data } = await axios.get<CapabilitySubscription[]>(
    `${subscriptionBaseUrl}/my-subscriptions`,
    { headers },
  );
  return data;
}

/* ── Nav types & static sections ──────────────────────────── */

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const staticSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: Gauge },
      { label: 'Processes', to: '/processes', icon: Workflow },
      { label: 'Tasks', to: '/tasks', icon: ListTodo },
      { label: 'Incidents', to: '/incidents', icon: Siren },
      { label: 'Jobs', to: '/jobs', icon: BoltIcon },
      { label: 'Decisions', to: '/decisions', icon: Scale },
    ],
  },
  {
    title: 'External Tasks',
    items: [
      { label: 'Ext. Tasks', to: '/external-tasks', icon: Cpu },
      { label: 'Topic Registry', to: '/external-tasks/topics', icon: BookCheck },
      { label: 'Workflows', to: '/external-tasks/workflows/builder', icon: GitBranch },
    ],
  },
  {
    title: 'Runtime',
    items: [
      { label: 'Runtime Monitor', to: '/runtime', icon: Activity },
      { label: 'Logs', to: '/runtime/logs', icon: ScrollText },
      { label: 'Metrics', to: '/runtime/metrics', icon: BarChart3 },
      { label: 'Health', to: '/runtime/health', icon: HeartPulse },
    ],
  },
  {
    title: 'History',
    items: [
      { label: 'History', to: '/history', icon: History },
      { label: 'Deployments', to: '/deployments', icon: Rocket },
    ],
  },
];

const calendarSection: NavSection = {
  title: 'Calendar & SLA',
  items: [
    { label: 'Calendars', to: '/calendars', icon: CalendarDays },
  ],
};

const trailingSections: NavSection[] = [
  {
    title: 'Admin',
    items: [
      { label: 'Users', to: '/admin/users', icon: ShieldCheck },
      { label: 'Tenancy', to: '/admin/tenancy', icon: Building2 },
      { label: 'Settings', to: '/settings', icon: SlidersHorizontal },
    ],
  },
];

// Nav paths that require a role's read access to a given area.
const AREA_BY_PATH: Record<string, ViewArea> = {
  '/tasks': 'tasks',
  '/deployments': 'deployments',
  '/decisions': 'decisions',
  '/history': 'history',
};

export default function Sidebar() {
  const isMobile = useIsMobile();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { pathname } = useLocation();

  // On mobile the sidebar is a full-width off-canvas drawer; the desktop
  // "collapsed" (icon-only) state only applies at lg and above.
  const collapsedRaw = useUiStore((s) => s.sidebarCollapsed);

  // On desktop, hovering a collapsed sidebar temporarily expands it (floating
  // over the content) without changing the persisted collapsed state.
  const [hovered, setHovered] = useState(false);
  const isCollapsedPersisted = !isMobile && collapsedRaw;
  const sidebarCollapsed = isCollapsedPersisted && !hovered;
  const isHoverExpanded = isCollapsedPersisted && hovered;

  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const { isOperator, canView } = useAuthz();

  const { data: subscriptions } = useQuery({
    queryKey: ['my-subscriptions', activeTenantId],
    queryFn: fetchMySubscriptions,
    enabled: !!activeTenantId,
    staleTime: 60_000, // cache for 60s
    retry: 1,
  });

  const hasActiveCalendar = useMemo(() => {
    if (!subscriptions) return false;
    return subscriptions.some(
      (s) => s.code === 'CALENDAR' && s.status === 'ACTIVE',
    );
  }, [subscriptions]);

  const navSections = useMemo(() => {
    // Hide nav items the user can't use:
    //  - /admin/* → operators only
    //  - area-mapped items (tasks, deployments, decisions, history) → roles with read access
    const itemVisible = (to: string) => {
      if (to.startsWith('/admin')) return isOperator;
      const area = AREA_BY_PATH[to];
      return area ? canView(area) : true;
    };

    const sections = [...staticSections];
    if (hasActiveCalendar) {
      sections.push(calendarSection);
    }
    sections.push(...trailingSections);

    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => itemVisible(i.to)) }))
      .filter((s) => s.items.length > 0);
  }, [hasActiveCalendar, isOperator, canView]);

  const allPaths = useMemo(
    () => navSections.flatMap((s) => s.items.map((i) => i.to)),
    [navSections],
  );

  // An item is active if its `to` is the longest path that matches the current
  // URL — either exactly, or as a parent (e.g. /external-tasks/topics matches
  // /external-tasks/topics/register, but /external-tasks does not, since a more
  // specific sibling exists).
  function isItemActive(itemTo: string): boolean {
    const matches = (p: string) => pathname === p || pathname.startsWith(p + '/');
    if (!matches(itemTo)) return false;
    return !allPaths.some(
      (other) => other !== itemTo && other.length > itemTo.length && matches(other),
    );
  }

  return (
    <aside
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed left-0 top-0 h-screen flex flex-col border-r"
      style={{
        width: sidebarCollapsed ? 64 : 240,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        zIndex: isMobile ? 50 : 30,
        transform: isMobile && !mobileSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        boxShadow: isHoverExpanded ? 'var(--shadow-theme-lg)' : undefined,
        transition: 'width 200ms ease-in-out, transform 200ms ease-in-out',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-12 px-4 gap-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Hexagon size={22} style={{ color: 'var(--accent-blue)' }} className="shrink-0" />
        {!sidebarCollapsed && (
          <span
            className="font-heading text-base tracking-wider whitespace-nowrap overflow-hidden"
            style={{ color: 'var(--accent-blue)' }}
          >
            LUKE CORE
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!sidebarCollapsed && (
              <div
                className="px-4 mb-1 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.title}
              </div>
            )}

            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.to);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => isMobile && setMobileSidebarOpen(false)}
                      className={[
                          'flex items-center gap-3 rounded-md text-sm font-medium',
                          'transition-colors duration-150',
                          sidebarCollapsed
                            ? 'justify-center px-2 py-2'
                            : 'px-3 py-2',
                        ].join(' ')
                      }
                      style={{
                        backgroundColor: isActive
                          ? 'var(--bg-elevated)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--accent-blue)'
                          : 'var(--text-secondary)',
                      }}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="whitespace-nowrap overflow-hidden">
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle — desktop only; on mobile the drawer is full-width */}
      {!isMobile && (
      <div
        className="shrink-0 px-2 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 w-full rounded-md text-sm font-medium px-3 py-2 cursor-pointer transition-colors duration-150"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
          title={isCollapsedPersisted ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={18} className="shrink-0 mx-auto" />
          ) : (
            <>
              {isCollapsedPersisted ? (
                <PanelLeftOpen size={18} className="shrink-0" />
              ) : (
                <PanelLeftClose size={18} className="shrink-0" />
              )}
              <span className="whitespace-nowrap overflow-hidden">
                {isCollapsedPersisted ? 'Expand' : 'Collapse'}
              </span>
            </>
          )}
        </button>
      </div>
      )}
    </aside>
  );
}
