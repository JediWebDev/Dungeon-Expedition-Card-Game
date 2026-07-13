import type { ExpeditionState, GuildState } from '../../src/types';

export interface GameSnapshot {
  guild: GuildState;
  expedition: ExpeditionState | null;
}

export class GameActionError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'GameActionError';
  }
}
