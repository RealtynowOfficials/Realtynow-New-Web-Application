import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  server: {
    host: true, // Listen on all network addresses (0.0.0.0 and [::]) for reliable HMR on Windows
    port: 5173,
    strictPort: false,
    headers: {
      // Prevent browser caching of unbundled ESM modules in local development
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
    hmr: {
      overlay: true, // Show compile/runtime errors directly in browser overlay
    },
    watch: {
      ignored: [
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Enforce deterministic content hashing for immutable production caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});

