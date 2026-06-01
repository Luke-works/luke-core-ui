import type { ReactNode } from 'react';
import { useAuthz } from '@/features/auth/hooks/useAuthz';
import NoAccess from '@/shared/ui/NoAccess';

/**
 * Route guard for operator-only pages (identity/admin management). Renders a
 * "No access" state for non-operators instead of a broken/empty page.
 */
export default function RequireOperator({ children }: { children: ReactNode }) {
  const { isLoading, isOperator } = useAuthz();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return isOperator ? <>{children}</> : <NoAccess />;
}
