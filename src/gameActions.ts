/**
 * Authoritative game action types (shared client + server).
 * Clients send these intents; the server applies rules and returns the new state.
 */

import type { EquipSlot } from './types';

export type { EquipSlot };
export type UpgradeKey = 'maxRoster' | 'recruitQuality' | 'shopQuality' | 'healerStation';

export type GameAction =
  | { type: 'renameGuild'; name: string }
  | { type: 'recruitHero'; heroId: string }
  | { type: 'dismissHero'; heroId: string }
  | { type: 'buyEquipment'; itemId: string }
  | { type: 'sellEquipment'; itemId: string }
  | { type: 'equipItem'; heroId: string; itemId: string; slot: EquipSlot }
  | { type: 'unequipItem'; heroId: string; slot: EquipSlot }
  | { type: 'upgradeBuilding'; key: UpgradeKey }
  | { type: 'healHero'; heroId: string }
  | { type: 'reviveHero'; heroId: string }
  | { type: 'startExpedition'; dungeonId: string; partyHeroIds: string[] }
  | { type: 'retreatExpedition' }
  | { type: 'proceedToNextRoom' }
  | { type: 'moveToNode'; nodeId: string }
  | { type: 'advanceCombat' }
  | {
      type: 'submitCombatAction';
      action: 'attack' | 'skill' | 'spell' | 'item' | 'defend';
      targetId?: string;
      itemId?: string;
    }
  | { type: 'setCombatMode'; mode: 'manual' | 'auto' }
  | { type: 'makeEventChoice'; choiceIndex: number }
  | { type: 'handleCampfireChoice'; option: 'heal' | 'morale' | 'train' }
  | { type: 'handleTrapChoice'; heroId: string; method: 'speed' | 'defense' | 'luck' }
  | { type: 'buyMerchantItem'; itemId: string }
  | { type: 'setExpeditionSpeed'; speed: 1 | 2 | 3 }
  | { type: 'claimTreasureAndProceed' };

const ACTION_TYPES = new Set<GameAction['type']>([
  'renameGuild',
  'recruitHero',
  'dismissHero',
  'buyEquipment',
  'sellEquipment',
  'equipItem',
  'unequipItem',
  'upgradeBuilding',
  'healHero',
  'reviveHero',
  'startExpedition',
  'retreatExpedition',
  'proceedToNextRoom',
  'moveToNode',
  'advanceCombat',
  'submitCombatAction',
  'setCombatMode',
  'makeEventChoice',
  'handleCampfireChoice',
  'handleTrapChoice',
  'buyMerchantItem',
  'setExpeditionSpeed',
  'claimTreasureAndProceed',
]);

/** Narrow runtime check for unknown JSON bodies. */
export function isGameAction(value: unknown): value is GameAction {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === 'string' && ACTION_TYPES.has(t as GameAction['type']);
}
