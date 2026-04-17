import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/use-sync-external-store')
          ) return 'vendor-react';
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3') ||
            id.includes('node_modules/victory-vendor') ||
            id.includes('node_modules/@reduxjs') ||
            id.includes('node_modules/immer') ||
            id.includes('node_modules/reselect') ||
            id.includes('node_modules/es-toolkit') ||
            id.includes('node_modules/eventemitter3') ||
            id.includes('node_modules/tiny-invariant') ||
            id.includes('node_modules/decimal.js')
          ) return 'vendor-charts';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/jspdf')) return 'vendor-pdf';
          if (id.includes('node_modules/date-fns')) return 'vendor-date';
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run')
          ) return 'vendor-router';
          return 'vendor';
        },
      },
    },
  },
});
