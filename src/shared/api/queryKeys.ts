/**
 * Centralized React Query key factories (#42).
 *
 * Querying and invalidation MUST use the same key shape or an invalidation
 * silently misses (or an over-broad one refetches unrelated data). Deriving keys
 * from one place makes that impossible to get wrong: a page keys a query with
 * `qk.tasks.list(params)` and a mutation invalidates the matching subtree with
 * `qk.tasks.all` (broad) or `qk.tasks.detail(id)` (narrow).
 *
 * React Query matches keys by prefix, so invalidating `['tasks']` also
 * invalidates `['tasks', { … }]`. The factories return the *narrowest* key for
 * each read and expose an `all` prefix for the intentional broad invalidations.
 */

export const qk = {
  tasks: {
    all: ['tasks'] as const,
    list: (params?: unknown) => ['tasks', params] as const,
    detail: (taskId: string | undefined) => ['task', taskId] as const,
    formVariables: (taskId: string | undefined) =>
      ['taskFormVariables', taskId] as const,
  },

  incidents: {
    all: ['incidents'] as const,
    list: (params?: unknown) => ['incidents', params] as const,
    count: (params?: unknown) => ['incidents', 'count', params] as const,
  },

  jobs: {
    all: ['jobs'] as const,
    list: (params?: unknown) => ['jobs', params] as const,
  },

  processInstances: {
    all: ['processInstances'] as const,
    detail: (id: string | undefined) => ['processInstance', id] as const,
    variables: (id: string | undefined) =>
      ['processInstanceVariables', id] as const,
  },

  processDefinitions: {
    all: ['processDefinitions'] as const,
    statistics: ['processDefinitionStatistics'] as const,
  },

  users: {
    all: ['users'] as const,
    list: (params?: unknown) => ['users', params] as const,
    count: (params?: unknown) => ['users', 'count', params] as const,
    groupMembers: (groupId: string) => ['group-members', groupId] as const,
    tenantMembers: (tenantId: string) => ['tenant-members', tenantId] as const,
  },

  groups: {
    all: ['groups'] as const,
    list: (params?: unknown) => ['groups', params] as const,
    count: (params?: unknown) => ['groups', 'count', params] as const,
  },

  tenants: {
    all: ['tenants'] as const,
    list: (params?: unknown) => ['tenants', params] as const,
    count: (params?: unknown) => ['tenants', 'count', params] as const,
  },

  externalTasks: {
    all: ['externalTasks'] as const,
    topics: ['externalTaskTopics'] as const,
  },
};
