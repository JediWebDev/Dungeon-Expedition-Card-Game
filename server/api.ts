/**
 * Express API: Better Auth + game persistence.
 *
 *   ALL  /api/auth/*  -> Better Auth handler (must be mounted BEFORE express.json)
 *   GET  /api/state   -> session-scoped guild load
 *   PUT  /api/state   -> session-scoped guild save
 *   GET  /api/health  -> { ok, database }
 *
 * Mounted into the Vite dev server (vite.config.ts) and the standalone
 * production server (server/index.ts).
 */
import express, { type Express, type Request, type Response } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { isDatabaseConfigured } from '../db/index';
import { getAuth } from './auth';
import {
  getOrCreateGuildForUser,
  loadGameState,
  saveGameState,
} from './repository';

function dbUnavailable(res: Response) {
  res.status(503).json({
    error:
      'Database not configured. Set DATABASE_URL in .env (see .env.example) to enable persistence.',
  });
}

/** Resolve the signed-in user id from the request cookies, or null. */
async function getSessionUserId(req: Request): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session?.user?.id ?? null;
  } catch (err) {
    console.error('[api] session lookup failed:', err);
    return null;
  }
}

/** Build the API router. Auth routes are registered before JSON body parsing. */
export function createApiApp(): Express {
  const app = express();

  // Better Auth must read the raw body — mount BEFORE express.json().
  app.all('/api/auth/*', (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({
        error:
          'Database not configured. Set DATABASE_URL and BETTER_AUTH_SECRET in .env.',
      });
      return;
    }
    try {
      return toNodeHandler(getAuth())(req, res);
    } catch (err) {
      console.error('[api] auth handler failed:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Auth is misconfigured. Check BETTER_AUTH_SECRET in .env.',
      });
    }
  });

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, database: isDatabaseConfigured() });
  });

  app.get('/api/state', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) return dbUnavailable(res);
    try {
      const userId = await getSessionUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in to load your guild save.' });
      }
      const guildId = await getOrCreateGuildForUser(userId);
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
      const userId = await getSessionUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in to save your guild.' });
      }
      const { guild, expedition } = req.body ?? {};
      if (!guild) {
        return res.status(400).json({ error: 'Missing "guild" in request body.' });
      }
      const guildId = await getOrCreateGuildForUser(userId);
      // Ignore client-supplied guildId — always resolve from the session user
      // so one account cannot overwrite another player's save.
      await saveGameState(guildId, { guild, expedition: expedition ?? null });
      res.json({ ok: true, guildId });
    } catch (err) {
      console.error('[api] PUT /api/state failed:', err);
      res.status(500).json({ error: 'Failed to save game state.' });
    }
  });

  return app;
}
