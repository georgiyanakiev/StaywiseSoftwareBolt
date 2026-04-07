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
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler')
          ) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (
            id.includes('recharts') ||
            id.includes('d3-') ||
            id.includes('d3/') ||
            id.includes('victory-vendor')
          ) return 'vendor-charts';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor';
        },
      },
    },
  },
});
