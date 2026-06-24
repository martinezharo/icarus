import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// Tauri injects this when targeting a physical device on the LAN; otherwise undefined.
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss()],

  // Tauri expects a fixed port and owns the terminal output, so don't let Vite
  // clear the screen or hop ports.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    // The Rust side has its own watcher; ignore it to avoid noisy reloads.
    watch: { ignored: ['**/src-tauri/**'] },
  },

  // Produce a clean, debuggable build without leaking source paths in prod.
  build: {
    target: 'esnext',
    sourcemap: !!process.env.TAURI_DEBUG,
    minify: process.env.TAURI_DEBUG ? false : 'esbuild',
  },
});
