import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Disable Fast Refresh temporarily to test if it's causing issues
      fastRefresh: true,
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }), 
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // CRITICAL: Aggressive HMR settings to prevent refresh loops
    hmr: {
      clientPort: 5173,
      host: 'localhost',
      // Disable overlay completely
      overlay: false,
      // Reduce protocol chattiness
      protocol: 'ws',
      timeout: 30000,
    },
    cors: true,
    // CRITICAL: Prevent excessive file watching that can trigger reloads
    watch: {
      // Disable polling completely
      usePolling: false,
      // Ignore common directories that shouldn't trigger reloads
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.DS_Store',
        '**/service-worker.js',
        '**/manifest.json',
        '**/*.md',
        '**/*.txt',
        '**/*.sh'
      ],
      // Increase delay before file changes trigger rebuild
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    },
    // Prevent middleware from interfering
    middlewareMode: false,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket-vendor': ['socket.io-client'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    dynamicImportVarsOptions: {
      warnOnError: true,
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'socket.io-client',
      'axios',
      'zustand',
      'emoji-picker-react',
      'lucide-react',
      'react-hot-toast'
    ],
    force: false,
    // Exclude any PWA-related packages from pre-bundling
    exclude: ['service-worker.js'],
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext',
    platform: 'browser',
  },
  // CRITICAL: Prevent any automatic page reloads
  appType: 'spa',
  clearScreen: false,
});
