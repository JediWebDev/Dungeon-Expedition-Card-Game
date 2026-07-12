/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin fetch client for the game persistence API (served from the same origin
 * by the Vite dev server / standalone Express server — see server/api.ts).
 *
 * All calls fail soft: if the backend or database is unavailable the game keeps
 * running from in-memory state and we simply skip persistence.
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

/** Load the persisted game state. Returns null if persistence is unavailable. */
export async function fetchGameState(): Promise<LoadedGameState | null> {
  try {
    const res = await fetch('/api/state', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[persistence] load skipped (HTTP ${res.status}).`);
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
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
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
