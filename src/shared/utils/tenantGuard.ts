/**
 * Defense-in-depth for by-id reads (#47). core-ui authenticates as a Basic-auth
 * admin, so the engine returns a resource by id regardless of the active tenant
 * (deep link / stale id). This flags when a loaded resource belongs to a DIFFERENT,
 * non-null tenant than the active one so the page can refuse to show it.
 *
 * A null/shared tenant is NOT treated as foreign — shared artifacts are handled by
 * list scoping (#48: hidden), not flagged here. The real enforcer for scoped users
 * is server-side (see luke-core-engine #41).
 */
export function isForeignTenant(
  resourceTenantId: string | null | undefined,
  activeTenantId: string | null,
): boolean {
  if (!activeTenantId) return false; // no active tenant → operator/global view
  if (resourceTenantId == null) return false; // shared/null → not foreign
  return resourceTenantId !== activeTenantId;
}
