/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeroClass = 'Warrior' | 'Rogue' | 'Mage' | 'Cleric';

export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  modifiers: {
    maxHp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    luck?: number;
  };
  price: number;
  description: string;
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
  defense: number;
  speed: number;
  luck: number;
  morale: number; // 0 to 100
  status: 'Idle' | 'Expedition' | 'Dead';
  equipment: {
    weapon: Equipment | null;
    armor: Equipment | null;
    accessory: Equipment | null;
  };
  portraitSeed: string; // Used to generate unique procedurally drawn SVG portraits
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
  | 'Boss';

export interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  avatarSeed: string;
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
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  dangerRating: number; // 1 to 5 stars
  totalRooms: number;
  rooms: DungeonRoom[];
  rewardsPreview: string;
}

export interface CombatLog {
  id: string;
  text: string;
  type: 'info' | 'attack' | 'heal' | 'damage' | 'death' | 'victory' | 'defeat';
  timestamp: number;
}

export interface ExpeditionState {
  dungeon: Dungeon;
  party: Hero[];
  currentRoomIndex: number;
  status: 'planning' | 'running' | 'room_active' | 'victory' | 'defeat' | 'retreat';
  logs: CombatLog[];
  goldEarned: number;
  lootEarned: {
    equipment: Equipment[];
    relics: Relic[];
  };
  speed: 1 | 2 | 3;
  combatRound: number;
  activeTurn?: 'hero' | 'monster';
  activeRoomChoiceMade?: boolean;
  selectedEventOutcomeText?: string;
  merchantItemsStock?: Equipment[];
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
