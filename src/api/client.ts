/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin fetch client for the game persistence API (served from the same origin
 * by the Vite dev server / standalone Express server — see server/api.ts).
 *
 * All calls fail soft: if the backend, auth session, or database is unavailable
 * the game keeps running from in-memory state and we simply skip persistence.
 */
import type { ExpeditionState, GuildState } from '../types';

export interface LoadedGameState {
  guildId: string;
  guild: GuildState | null;
  expedition: ExpeditionState | null;
}

export interface SavePayload {
  guildId: string | null;
  guild: GuildState;
  expedition: ExpeditionState | null;
}

/**
 * Requests can hang forever if a stale/other process is bound to the port we
 * fetch from. A short timeout guarantees hydration can always proceed. All
 * requests use same-origin RELATIVE paths (`/api/state`) so they hit whatever
 * port Vite is actually serving (3000, 3001, 3002, …), never a hardcoded port.
 */
const REQUEST_TIMEOUT_MS = 8000;

/** Fetch with an abort-based timeout so a hung socket can never block startup. */
async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      // Send session cookies so /api/state can resolve the Better Auth user.
      credentials: 'include',
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Load the persisted game state. Returns null if persistence is unavailable. */
export async function fetchGameState(): Promise<LoadedGameState | null> {
  try {
    const res = await fetchWithTimeout('/api/state', {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) {
      // Not signed in — expected until the player creates an account.
      return null;
    }
    if (!res.ok) {
      console.warn(`[persistence] load skipped (HTTP ${res.status}).`);
      return null;
    }
    // Guard against a wrong process (e.g. a stale server on another port)
    // answering with HTML instead of our JSON payload.
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      console.warn('[persistence] load skipped (non-JSON response).');
      return null;
    }
    return (await res.json()) as LoadedGameState;
  } catch (err) {
    console.warn('[persistence] load failed; playing without saves.', err);
    return null;
  }
}

/** Persist the game state. Returns the guildId on success, or null on failure. */
export async function saveGameState(payload: SavePayload): Promise<string | null> {
  try {
    const res = await fetchWithTimeout('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      // Guest play — skip quietly.
      return null;
    }
    if (!res.ok) {
      console.warn(`[persistence] save skipped (HTTP ${res.status}).`);
      return null;
    }
    const data = (await res.json()) as { ok: boolean; guildId: string };
    return data.guildId ?? null;
  } catch (err) {
    console.warn('[persistence] save failed.', err);
    return null;
  }
}
