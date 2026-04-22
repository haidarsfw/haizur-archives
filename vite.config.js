import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'iOS >= 12', 'Safari >= 12'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      modernPolyfills: true,
    }),
  ],
  build: {
    // Target Safari 12+ for broad iOS compatibility
    target: 'es2015',
    cssTarget: 'safari12',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'vendor-motion';
          // Bundle recharts / d3 together with React itself so the charts
          // chunk cannot evaluate before React is ready (Vite splits can
          // otherwise trigger a TDZ read of `React.forwardRef` at module
          // top-level in recharts, crashing the page).
          if (
            id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor') ||
            id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')
          ) return 'vendor-react';
        },
      },
    },
  },
})
