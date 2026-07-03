import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import 'flatpickr/dist/flatpickr.css';
import App from './app/App';
import QueryProvider from './app/providers/QueryProvider';
import { useUiStore } from '@/shared/stores/uiStore';
import { initObservability } from '@/shared/utils/observability';

initObservability(); // Sentry, only when VITE_SENTRY_DSN is set (no-op otherwise)

// Apply persisted theme as early as possible (before first paint) so .dark / data-theme are correct.
const persistedTheme = useUiStore.getState().theme;
document.documentElement.setAttribute('data-theme', persistedTheme);
document.documentElement.classList.toggle('dark', persistedTheme === 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster theme={persistedTheme} position="bottom-right" richColors />
    </QueryProvider>
  </StrictMode>,
);
