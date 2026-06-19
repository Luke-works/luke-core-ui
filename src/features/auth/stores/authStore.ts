import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setObservabilityUser } from '@/shared/utils/observability';

// One-time cleanup: this store used to persist credentials to localStorage, where
// the operator's password survived a browser restart in plaintext. We now use
// sessionStorage (cleared when the tab/browser closes), so remove any lingering
// localStorage copy on load.
try {
  localStorage.removeItem('luke-core-auth-storage');
} catch {
  /* storage unavailable (private mode, etc.) — nothing to clean up */
}

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  password: string | null;
  login: (username: string, password: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      password: null,

      login: (username: string, password: string) => {
        set({ isAuthenticated: true, username, password });
        setObservabilityUser(username); // tag error reports with the operator (#25)
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, password: null });
        setObservabilityUser(null);
      },
    }),
    {
      name: 'luke-core-auth-storage',
      // sessionStorage, not localStorage: credentials are cleared when the
      // browser/tab closes and never persist to disk across restarts. They still
      // survive a same-tab refresh (so the operator stays logged in during a session).
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
