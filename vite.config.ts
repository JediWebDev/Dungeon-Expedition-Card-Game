// Load .env into process.env so the server-side API middleware can read DATABASE_URL.
import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type PluginOption} from 'vite';
import {createApiApp} from './server/api';

/**
 * Mounts the Express persistence API (`/api/*`) into the Vite dev and preview
 * servers so the browser can talk to PostgreSQL via Drizzle (which must run in
 * Node, never in the browser). This keeps `npm run dev` a single command.
 */
function gameApiPlugin(): PluginOption {
  return {
    name: 'game-persistence-api',
    configureServer(server) {
      server.middlewares.use(createApiApp());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiApp());
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), gameApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
