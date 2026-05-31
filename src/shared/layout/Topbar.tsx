import { useState, useRef, useEffect } from 'react';
import { RefreshCw, ChevronDown, LogOut, User, Sun, Moon, Building2, Menu } from 'lucide-react';
import { useUiStore } from '@/shared/stores/uiStore';
import { useTenantStore, useActiveTenant } from '@/shared/stores/tenantStore';
import { useAuthStore } from '@/features/auth/stores/authStore';

export default function Topbar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const theme = useUiStore((s) => s.theme);
  const tenants = useTenantStore((s) => s.tenants);
  const activeTenant = useActiveTenant();
  const setActiveTenant = useTenantStore((s) => s.setActiveTenant);
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

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  const handleLogout = () => {
    logout();
    clearTenants();
    setUserMenuOpen(false);
  };

  return (
    <header
      className="fixed top-0 right-0 h-12 flex items-center justify-between px-4 z-20 border-b"
      style={{
        left: sidebarWidth,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        transition: 'left 200ms ease-in-out',
      }}
    >
      {/* Left: hamburger + tenant selector */}
      <div className="flex items-center gap-3">
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-150"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border-strong)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border)')
              }
            >
              <Building2 size={14} style={{ color: activeTenant ? 'var(--accent-blue)' : 'var(--accent-amber, #f59e0b)' }} />
              <span className="truncate max-w-[180px]">
                {activeTenant?.name ?? activeTenant?.id ?? 'Select tenant'}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {tenantDropdownOpen && tenants.length > 0 && (
              <div
                className="absolute top-full left-0 mt-1 w-56 rounded-md py-1 shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Tenants
                </div>
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      setActiveTenant(tenant.id);
                      setTenantDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors duration-150"
                    style={{
                      color:
                        tenant.id === activeTenant?.id
                          ? 'var(--accent-blue)'
                          : 'var(--text-primary)',
                      backgroundColor: 'transparent',
                      border: 'none',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--bg-muted)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          tenant.id === activeTenant?.id
                            ? 'var(--accent-green)'
                            : 'var(--text-muted)',
                      }}
                    />
                    <span className="truncate">{tenant.name || tenant.id}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md"
            style={{
              color: 'var(--accent-amber, #f59e0b)',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Building2 size={14} />
            <span>No tenant selected</span>
          </div>
        )}
      </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => useUiStore.getState().toggleTheme()}
          className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-150"
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
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Refresh indicator */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <RefreshCw size={13} />
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-150"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                'var(--bg-elevated)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <User size={16} />
            <span className="text-sm">{username ?? 'Guest'}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute top-full right-0 mt-1 w-44 rounded-md py-1 shadow-lg"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors duration-150"
                style={{
                  color: 'var(--accent-red)',
                  backgroundColor: 'transparent',
                  border: 'none',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'var(--bg-muted)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
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
