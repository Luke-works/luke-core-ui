import { Outlet } from 'react-router-dom';
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
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
            className="relative rounded-lg border shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface, #1e1e2e)',
              borderColor: 'var(--border-default, #313244)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-default, #313244)' }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary, #cdd6f4)' }}
              >
                Keyboard Shortcuts
              </h2>
              <button
                className="rounded p-1 hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary, #a6adc8)' }}
                onClick={() => setShowShortcuts(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-6">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-secondary, #a6adc8)' }}
                  >
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.keys}
                        className="flex items-center justify-between py-1"
                      >
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-primary, #cdd6f4)' }}
                        >
                          {item.description}
                        </span>
                        <div className="flex gap-1">
                          {item.keys.split(' ').map((key, i) => (
                            <kbd
                              key={i}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono rounded border"
                              style={{
                                backgroundColor: 'var(--bg-elevated, #313244)',
                                borderColor: 'var(--border-default, #45475a)',
                                color: 'var(--text-primary, #cdd6f4)',
                              }}
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

            <div
              className="px-5 py-3 border-t text-xs text-center"
              style={{
                borderColor: 'var(--border-default, #313244)',
                color: 'var(--text-secondary, #a6adc8)',
              }}
            >
              Press <kbd className="font-mono px-1 py-0.5 rounded border" style={{
                backgroundColor: 'var(--bg-elevated, #313244)',
                borderColor: 'var(--border-default, #45475a)',
              }}>?</kbd> or <kbd className="font-mono px-1 py-0.5 rounded border" style={{
                backgroundColor: 'var(--bg-elevated, #313244)',
                borderColor: 'var(--border-default, #45475a)',
              }}>Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
