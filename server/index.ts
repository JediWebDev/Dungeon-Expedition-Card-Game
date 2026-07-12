/**
 * Standalone production server: serves the built client (dist/) and the game
 * persistence API from a single Node process.
 *
 * Usage (after `npm run build`):
 *   npm run serve            # tsx server/index.ts
 *
 * In development you do NOT need this file: `npm run dev` mounts the same API
 * into the Vite dev server via a plugin (see vite.config.ts).
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApiApp } from './api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT ?? 3000);

const app = express();

// Mount the persistence API (already includes JSON body parsing).
app.use(createApiApp());

// Serve the built SPA and fall back to index.html for client-side routing.
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Guilds of Ardessia server listening on http://localhost:${port}`);
});
