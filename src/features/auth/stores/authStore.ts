import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, password: null });
      },
    }),
    {
      name: 'luke-core-auth-storage',
    },
  ),
);
