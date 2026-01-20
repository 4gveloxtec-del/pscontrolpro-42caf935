import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Otimizações de build para produção
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    // Code splitting mais granular
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks separados
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-popover'],
          'query-vendor': ['@tanstack/react-query'],
          'date-vendor': ['date-fns'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    // Aumenta o limite de aviso para chunks
    chunkSizeWarningLimit: 1000,
  },
  // Otimizações de dependências
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
}));
