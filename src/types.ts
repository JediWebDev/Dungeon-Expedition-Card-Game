/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeroClass = 'Warrior' | 'Rogue' | 'Mage' | 'Cleric';

/** Paperdoll slots — matches CharacterCard equipment boxes. */
export type EquipSlot =
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'wrists'
  | 'hands'
  | 'waist'
  | 'legs'
  | 'feet'
  | 'trinket'
  | 'ring'
  | 'mainHand'
  | 'offHand';

export const EQUIP_SLOTS: EquipSlot[] = [
  'head',
  'neck',
  'shoulders',
  'chest',
  'back',
  'wrists',
  'hands',
  'waist',
  'legs',
  'feet',
  'trinket',
  'ring',
  'mainHand',
  'offHand',
];

export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  head: 'Head',
  neck: 'Amulet',
  shoulders: 'Shoulders',
  chest: 'Chest',
  back: 'Cloak',
  wrists: 'Bracers',
  hands: 'Gloves',
  waist: 'Belt',
  legs: 'Legs',
  feet: 'Boots',
  trinket: 'Trinket',
  ring: 'Ring',
  mainHand: 'Weapon',
  offHand: 'Off-hand',
};

export interface EquipmentModifiers {
  maxHp?: number;
  attack?: number;
  magic?: number;
  defense?: number;
  resist?: number;
  speed?: number;
  luck?: number;
}

export interface Equipment {
  id: string;
  name: string;
  /** Slot this item equips into (1:1 with the paperdoll). */
  type: EquipSlot;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  modifiers: EquipmentModifiers;
  price: number;
  description: string;
}

export type HeroEquipment = Record<EquipSlot, Equipment | null>;

export function emptyHeroEquipment(): HeroEquipment {
  return {
    head: null,
    neck: null,
    shoulders: null,
    chest: null,
    back: null,
    wrists: null,
    hands: null,
    waist: null,
    legs: null,
    feet: null,
    trinket: null,
    ring: null,
    mainHand: null,
    offHand: null,
  };
}

/** Map legacy 3-slot names from older saves onto the paperdoll. */
export function normalizeEquipSlot(slot: string): EquipSlot {
  if (slot === 'weapon') return 'mainHand';
  if (slot === 'armor') return 'chest';
  if (slot === 'accessory') return 'ring';
  if ((EQUIP_SLOTS as string[]).includes(slot)) return slot as EquipSlot;
  return 'trinket';
}

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClass;
  level: number;
  experience: number;
  expNeeded: number;
  maxHp: number;
  hp: number;
  attack: number;
  magic: number;
  defense: number;
  resist: number;
  speed: number;
  luck: number;
  morale: number; // 0 to 100
  status: 'Idle' | 'Expedition' | 'Dead';
  /** Epoch ms when the hero fell; used by Sanctuary auto-revive. Null when not dead. */
  diedAt: number | null;
  equipment: HeroEquipment;
  portraitSeed: string; // R2 file stem under hero-portraits/ (e.g. Sigurd_Warrior); SVG fallback if missing
  flavorText: string;
  traits: string[]; // e.g. ["Brave", "Clumsy", "Lucky"]
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  modifierType: 'gold_bonus' | 'exp_bonus' | 'defense_bonus' | 'morale_bonus' | 'heal_bonus';
  modifierValue: number; // e.g. 0.15 for +15%
}

export type RoomType =
  | 'Monster'
  | 'Elite Monster'
  | 'Treasure'
  | 'Campfire'
  | 'Merchant'
  | 'Trap'
  | 'Mystery Event'
  | 'Gambler'
  | 'Imprisoned Recruit'
  | 'Boss';

/** Key picked up during an expedition (unlocks matching corridors). */
export interface ExpeditionKey {
  id: string;
  name: string;
}

export interface Monster {
  /** Stable id for turn targeting (required for turn-based combat). */
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  avatarSeed: string;
}

export type CombatMode = 'manual' | 'auto';

export type CombatActionType = 'attack' | 'skill' | 'spell' | 'item' | 'defend';

export interface CombatTurnEntry {
  side: 'hero' | 'monster';
  id: string;
}

export interface CombatState {
  mode: CombatMode;
  /** Waiting for player command on a hero turn. */
  awaitingInput: boolean;
  round: number;
  /** Speed-ordered initiative for the current round. */
  turnQueue: CombatTurnEntry[];
  /** Index into turnQueue for the active combatant. */
  turnIndex: number;
  /** Combatant ids currently defending (cleared when their next turn starts). */
  defendingIds: string[];
  /** Per-hero item uses remaining this fight. */
  itemUsesRemaining: Record<string, number>;
}

export interface EventOutcome {
  text: string;
  probability: number; // 0 to 1
  effects: {
    gold?: number;
    hpDamagePercent?: number; // Applied to all active expedition heroes
    moraleEffect?: number; // Applied to all active expedition heroes
    experienceBonus?: number; // Applied to all active expedition heroes
    itemDrop?: boolean;
    relicDrop?: boolean;
  };
}

export interface EventChoice {
  text: string;
  description: string;
  requirements?: {
    class?: HeroClass;
    gold?: number;
    minLevel?: number;
  };
  outcomes: EventOutcome[];
}

export interface MysteryEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface DungeonRoom {
  id: string;
  index: number;
  type: RoomType;
  name: string;
  description: string;
  status: 'upcoming' | 'active' | 'cleared';
  monsterGroup?: Monster[];
  mysteryEvent?: MysteryEvent;
  treasureLoot?: {
    gold: number;
    equipment?: Equipment;
    relic?: Relic;
  };
  /** Grants a dungeon key when the room is resolved (Phase 4). */
  keyGrant?: ExpeditionKey;
  /** Hero waiting to be freed (Imprisoned Recruit rooms). */
  imprisonedHero?: Hero;
}

/** Fog-of-war visibility for a map node (Phase 2+ UI). Phase 1 keeps this in sync with room status. */
export type MapNodeVisibility = 'hidden' | 'revealed' | 'visited';

/** A modular room placement on the dungeon graph. */
export interface DungeonMapNode {
  id: string;
  /** Links to `Dungeon.rooms[].id`. */
  roomId: string;
  /** Layout coords for future map rendering (grid units). */
  x: number;
  y: number;
  visibility: MapNodeVisibility;
}

/** A corridor / connection between two nodes. */
export interface DungeonMapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** Phase 4 — locked doors / keys. */
  locked?: boolean;
  requiredKeyId?: string | null;
}

/**
 * Graph representation of a dungeon. Phase 1 generates a single path
 * (start → … → boss). Later phases add branching, locks, and fog UI.
 */
export interface DungeonMap {
  nodes: DungeonMapNode[];
  edges: DungeonMapEdge[];
  startNodeId: string;
  bossNodeId: string;
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  dangerRating: number; // 1 to 5 stars
  totalRooms: number;
  rooms?: DungeonRoom[];
  /** Graph layout; absent on legacy saves until migrated. */
  map?: DungeonMap;
  rewardsPreview: string;
}

export interface CombatLog {
  id: string;
  text: string;
  type: 'info' | 'attack' | 'heal' | 'damage' | 'death' | 'victory' | 'defeat' | 'defend' | 'skill' | 'spell' | 'item';
  timestamp: number;
}

export interface ExpeditionState {
  dungeon: Dungeon;
  party: Hero[];
  /**
   * Linear index into `dungeon.rooms` — kept for display/compat.
   * Prefer `currentNodeId` for navigation; they stay in sync on the map graph.
   */
  currentRoomIndex: number;
  /** Active map node id. Migrated from `currentRoomIndex` for older saves. */
  currentNodeId?: string;
  /** Remaining corridor moves this expedition (Phase 3). */
  movementPoints?: number;
  /** Starting / cap for movement points (campfire restores up toward this). */
  maxMovementPoints?: number;
  /** Keys collected this run — unlock gated corridors on the map. */
  keysHeld?: ExpeditionKey[];
  status: 'planning' | 'running' | 'room_active' | 'victory' | 'defeat' | 'retreat';
  logs: CombatLog[];
  goldEarned: number;
  lootEarned: {
    equipment: Equipment[];
    relics: Relic[];
  };
  speed: 1 | 2 | 3;
  /** Display alias of combat.round when in a fight. */
  combatRound: number;
  activeTurn?: 'hero' | 'monster';
  activeRoomChoiceMade?: boolean;
  selectedEventOutcomeText?: string;
  merchantItemsStock?: Equipment[];
  /** Turn-based battle state; null outside combat rooms. */
  combat: CombatState | null;
}

export interface GuildState {
  name: string;
  level: number;
  gold: number;
  roster: Hero[];
  inventory: Equipment[];
  relics: Relic[];
  recruitStock: Hero[];
  shopStock: Equipment[];
  upgrades: {
    maxRoster: number; // current max roster size
    recruitQuality: number; // starts at 1, goes up
    shopQuality: number; // starts at 1, goes up
    healerStation: number; // starts at 0, goes up
  };
}
