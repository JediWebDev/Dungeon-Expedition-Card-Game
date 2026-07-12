/**
 * Minimal Express API for game persistence.
 *
 * The whole guild + expedition is stored/loaded as a single "save document",
 * which matches how the React client holds all state in one context. This is a
 * load-state / save-state pair rather than per-entity CRUD.
 *
 *   GET  /api/state  -> { guildId, guild: GuildState | null, expedition: ExpeditionState | null }
 *   PUT  /api/state  -> body { guildId?, guild, expedition } => { ok: true }
 *   GET  /api/health -> { ok, database: boolean }
 *
 * The same app is mounted into the Vite dev server (see vite.config.ts) and into
 * the standalone production server (server/index.ts).
 */
import express, { type Express, type Request, type Response } from 'express';
import { isDatabaseConfigured } from '../db/index';
import {
  getOrCreateDefaultGuild,
  loadGameState,
  saveGameState,
} from './repository';

function dbUnavailable(res: Response) {
  res.status(503).json({
    error:
      'Database not configured. Set DATABASE_URL in .env (see .env.example) to enable persistence.',
  });
}

/** Build the API router with JSON body parsing already applied. */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, database: isDatabaseConfigured() });
  });

  app.get('/api/state', async (_req: Request, res: Response) => {
    if (!isDatabaseConfigured()) return dbUnavailable(res);
    try {
      const guildId = await getOrCreateDefaultGuild();
      const state = await loadGameState(guildId);
      res.json({ guildId, ...state });
    } catch (err) {
      console.error('[api] GET /api/state failed:', err);
      res.status(500).json({ error: 'Failed to load game state.' });
    }
  });

  app.put('/api/state', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) return dbUnavailable(res);
    try {
      const { guild, expedition } = req.body ?? {};
      if (!guild) {
        return res.status(400).json({ error: 'Missing "guild" in request body.' });
      }
      const guildId: string = req.body.guildId || (await getOrCreateDefaultGuild());
      await saveGameState(guildId, { guild, expedition: expedition ?? null });
      res.json({ ok: true, guildId });
    } catch (err) {
      console.error('[api] PUT /api/state failed:', err);
      res.status(500).json({ error: 'Failed to save game state.' });
    }
  });

  return app;
}
