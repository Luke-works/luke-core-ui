import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getMe } from '@/features/auth/api/me';

/**
 * Role-based access for the UI, derived from the current user's role groups
 * (RBAC, type=ROLE) returned by /api/me. The engine remains the real enforcer;
 * this just gates nav/routes/buttons for a clean experience.
 *
 * Access tiers: a role membership ending in `-readonly` grants no write caps;
 * the base (`<role>`) membership grants its write caps. Operators
 * (camunda-admin / parent_cluster) can do everything.
 */
export type Capability =
  | 'deploy'
  | 'startProcess'
  | 'workTasks'
  | 'operate'
  | 'manageDecisions';

const ALL_CAPS: Capability[] = ['deploy', 'startProcess', 'workTasks', 'operate', 'manageDecisions'];

const ROLE_WRITE_CAPS: Record<string, Capability[]> = {
  'tenant-admin': ['deploy', 'startProcess', 'workTasks', 'operate', 'manageDecisions'],
  'tenant-user': ['startProcess', 'workTasks', 'operate'],
  'task-worker': ['startProcess', 'workTasks'],
  'process-operator': ['operate'],
  'deployer': ['deploy', 'startProcess'],
};

/** Nav areas a role can read (used to hide irrelevant nav items). */
export type ViewArea = 'tasks' | 'deployments' | 'decisions' | 'history';

const ROLE_VIEW_AREAS: Record<string, ViewArea[]> = {
  'tenant-admin': ['tasks', 'deployments', 'decisions', 'history'],
  'tenant-user': ['tasks', 'deployments', 'decisions', 'history'],
  'task-worker': ['tasks'],
  'process-operator': ['tasks', 'history'],
  'deployer': ['deployments', 'decisions', 'history'],
};

type MeGroup = { id: string; type: string };
type MeData = { groups?: MeGroup[]; operator?: boolean } | undefined;

/**
 * Pure capability/view derivation from the /api/me payload — extracted from the hook
 * so the security-critical RBAC logic is unit-testable without React (#28). The engine
 * remains the real enforcer; this gates UI affordances only.
 */
export function deriveAuthz(data: MeData) {
  const groups = data?.groups ?? [];
  const isOperator = data?.operator ?? false;
  const roleGroups = groups.filter((g) => g.type === 'ROLE');
  const roles = Array.from(new Set(roleGroups.map((g) => g.id.replace(/-readonly$/, ''))));
  const isReadOnly =
    !isOperator && roleGroups.length > 0 && roleGroups.every((g) => g.id.endsWith('-readonly'));

  const writeCaps = new Set<Capability>();
  if (isOperator) {
    ALL_CAPS.forEach((c) => writeCaps.add(c));
  }
  roleGroups.forEach((g) => {
    if (!g.id.endsWith('-readonly')) {
      (ROLE_WRITE_CAPS[g.id] ?? []).forEach((c) => writeCaps.add(c));
    }
  });

  // View areas are tier-independent (read-only roles can still view).
  const viewAreas = new Set<ViewArea>();
  roles.forEach((r) => (ROLE_VIEW_AREAS[r] ?? []).forEach((a) => viewAreas.add(a)));

  return {
    isOperator,
    isReadOnly,
    roles,
    /** True if the user can perform a write capability. */
    can: (cap: Capability) => writeCaps.has(cap),
    /** True if the user can view a nav area (operators see all). */
    canView: (area: ViewArea) => isOperator || viewAreas.has(area),
    /** Operator-only (identity/admin management). */
    canAdmin: isOperator,
  };
}

export function useAuthz() {
  const username = useAuthStore((s) => s.username);

  const { data, isLoading } = useQuery({
    queryKey: ['me', username],
    queryFn: getMe,
    enabled: !!username,
    staleTime: 60_000,
    retry: 1,
  });

  return { isLoading, ...deriveAuthz(data) };
}
