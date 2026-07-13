/**
 * Express API: Better Auth + authoritative game actions + persistence.
 *
 *   ALL  /api/auth/*       -> Better Auth
 *   GET  /api/state        -> load (or seed) the signed-in user's guild
 *   POST /api/game/action  -> apply a GameAction on the server, save, return state
 *   GET  /api/health       -> { ok, database, r2 }
 *
 * PUT /api/state is intentionally removed — clients may not write raw snapshots.
 */
import express, { type Express, type Request, type Response } from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { isDatabaseConfigured } from '../db/index';
import { getAuth } from './auth';
import { isR2Configured, verifyR2Bucket } from './r2';
import {
  getOrCreateGuildForUser,
  loadGameState,
  saveGameState,
} from './repository';
import { isGameAction } from './game/actions';
import {
  applyGameAction,
  createStarterGuild,
  GameActionError,
  type GameSnapshot,
} from './game/engine';

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

/** Load guild+expedition, seeding a starter guild on first play. */
async function loadOrSeedSnapshot(guildId: string): Promise<GameSnapshot> {
  const loaded = await loadGameState(guildId);
  if (loaded.guild) {
    return { guild: loaded.guild, expedition: loaded.expedition };
  }
  const starter = createStarterGuild();
  await saveGameState(guildId, { guild: starter, expedition: null });
  return { guild: starter, expedition: null };
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

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    let r2: boolean | 'unconfigured' = 'unconfigured';
    if (isR2Configured()) {
      try {
        r2 = await verifyR2Bucket();
      } catch (err) {
        console.warn('[api] R2 health check failed:', err);
        r2 = false;
      }
    }
    res.json({ ok: true, database: isDatabaseConfigured(), r2 });
  });

  app.get('/api/state', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) return dbUnavailable(res);
    try {
      const userId = await getSessionUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in to load your guild save.' });
      }
      const guildId = await getOrCreateGuildForUser(userId);
      const snapshot = await loadOrSeedSnapshot(guildId);
      res.json({ guildId, ...snapshot });
    } catch (err) {
      console.error('[api] GET /api/state failed:', err);
      res.status(500).json({ error: 'Failed to load game state.' });
    }
  });

  /**
   * Authoritative game command.
   * Body: a GameAction. Server loads state, applies rules, saves, returns snapshot.
   */
  app.post('/api/game/action', async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) return dbUnavailable(res);
    try {
      const userId = await getSessionUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in to play. Guest clients cannot mutate game state.' });
      }
      if (!isGameAction(req.body)) {
        return res.status(400).json({ error: 'Invalid game action.' });
      }

      const guildId = await getOrCreateGuildForUser(userId);
      const current = await loadOrSeedSnapshot(guildId);
      const next = applyGameAction(current, req.body);
      await saveGameState(guildId, next);
      res.json({ guildId, ...next });
    } catch (err) {
      if (err instanceof GameActionError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[api] POST /api/game/action failed:', err);
      res.status(500).json({ error: 'Failed to apply game action.' });
    }
  });

  return app;
}
