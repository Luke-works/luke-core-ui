import { useEffect } from 'react';
import { useUiStore } from '@/shared/stores/uiStore';

// Auto-collapses the sidebar once on mount for space-hungry detail pages.
// The user can still expand it, and the choice is sticky across navigation.
export function useSidebarLock() {
  useEffect(() => {
    useUiStore.setState({ sidebarCollapsed: true });
  }, []);
}
