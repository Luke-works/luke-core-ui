import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useUiStore } from '@/shared/stores/uiStore';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation (press G then...)',
    items: [
      { keys: 'G D', description: 'Go to Dashboard' },
      { keys: 'G P', description: 'Go to Processes' },
      { keys: 'G T', description: 'Go to Tasks' },
      { keys: 'G I', description: 'Go to Incidents' },
      { keys: 'G J', description: 'Go to Jobs' },
      { keys: 'G H', description: 'Go to History' },
      { keys: 'G E', description: 'Go to Deployments' },
      { keys: 'G S', description: 'Go to Settings' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: '?', description: 'Show keyboard shortcuts' },
      { keys: 'Esc', description: 'Close modal / Cancel' },
    ],
  },
];

export default function AppShell() {
  const isMobile = useIsMobile();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  // On mobile the sidebar floats over the content as a drawer, so the main
  // column takes the full width; on desktop it sits beside the pinned sidebar.
  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 64 : 240;
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Topbar />

      {/* Backdrop behind the mobile drawer */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <main
        className="px-4 pt-3 pb-1 sm:px-5"
        style={{
          marginLeft: sidebarWidth,
          marginTop: 48,
          transition: 'margin-left 200ms ease-in-out',
        }}
      >
        <Outlet />
      </main>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal */}
          <div
            className="relative rounded-2xl border border-gray-200 bg-white shadow-theme-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
                Keyboard Shortcuts
              </h2>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-medium uppercase tracking-wider mb-3 text-gray-400 dark:text-gray-500">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.keys}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.description}
                        </span>
                        <div className="flex gap-1">
                          {item.keys.split(' ').map((key, i) => (
                            <kbd
                              key={i}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono rounded-md border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 text-xs text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
              Press{' '}
              <kbd className="font-mono px-1 py-0.5 rounded-md border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-white/[0.05] dark:text-gray-300">
                ?
              </kbd>{' '}
              or{' '}
              <kbd className="font-mono px-1 py-0.5 rounded-md border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-white/[0.05] dark:text-gray-300">
                Esc
              </kbd>{' '}
              to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
