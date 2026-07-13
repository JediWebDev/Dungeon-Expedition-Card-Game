/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Browser client for the authoritative game API.
 * Clients send intents only — never raw gold/inventory snapshots.
 */
import type { ExpeditionState, GuildState } from '../types';
import type { GameAction } from '../gameActions';

export interface LoadedGameState {
  guildId: string;
  guild: GuildState;
  expedition: ExpeditionState | null;
}

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Load the persisted game state. Returns null if unauthenticated / unavailable. */
export async function fetchGameState(): Promise<LoadedGameState | null> {
  try {
    const res = await fetchWithTimeout('/api/state', {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) return null;
    if (!res.ok) {
      console.warn(`[persistence] load skipped (HTTP ${res.status}).`);
      return null;
    }
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

export class ActionRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ActionRequestError';
  }
}

/**
 * Apply a game action on the server. Returns the authoritative snapshot.
 * Throws ActionRequestError on 4xx/5xx.
 */
export async function dispatchGameAction(action: GameAction): Promise<LoadedGameState> {
  const res = await fetchWithTimeout('/api/game/action', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action),
  });

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await res.json()) as { error?: string } & Partial<LoadedGameState>)
    : {};

  if (!res.ok) {
    throw new ActionRequestError(
      payload.error ?? `Action failed (HTTP ${res.status}).`,
      res.status
    );
  }

  if (!payload.guild || !payload.guildId) {
    throw new ActionRequestError('Malformed action response.', 500);
  }

  return {
    guildId: payload.guildId,
    guild: payload.guild,
    expedition: payload.expedition ?? null,
  };
}
