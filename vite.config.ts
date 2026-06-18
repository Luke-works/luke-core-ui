/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const camundaBaseUrl = env.VITE_CAMUNDA_BASE_URL || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: 'named',
          namedExport: 'ReactComponent',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@app': path.resolve(__dirname, './src/app'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@features': path.resolve(__dirname, './src/features'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/engine-rest': { target: camundaBaseUrl, changeOrigin: true },
        '/api': { target: camundaBaseUrl, changeOrigin: true },
      },
    },
    preview: {
      port: 5174,
      proxy: {
        '/engine-rest': { target: camundaBaseUrl, changeOrigin: true },
        '/api': { target: camundaBaseUrl, changeOrigin: true },
      },
    },
    test: {
      // jsdom lets component tests mount; pure-util suites run fine here too.
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
