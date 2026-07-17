/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipment, Hero, HeroClass, Relic } from '../../types';
import { getModifiedStats } from '../../utils';

/**
 * Paperdoll slot keys, matching the equipment boxes baked into
 * `character_hud_container.png` (6 left, 6 right, 2 bottom-center).
 */
export type EquipmentSlotKey =
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

export type EquipmentRarity = Equipment['rarity'];

export interface EquipmentSlotData {
  name: string;
  rarity: EquipmentRarity;
}

export interface CharacterStatBlock {
  attack: number;
  magic: number;
  speed: number;
  defense: number;
  resist: number;
  luck: number;
}

/**
 * Everything the CharacterCard needs to render, decoupled from the game's
 * `Hero` model so the card can be reused for previews, NPCs, or future systems.
 */
export interface CharacterCardData {
  name: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  /** Mana. Omit (or leave undefined) to hide the MP line. */
  mp?: number;
  maxMp?: number;
  /** 0–100. */
  morale: number;
  exp: number;
  expNeeded: number;
  stats: CharacterStatBlock;
  /** Additive gear/relic bonuses, shown as `+(n)` beside the base value. */
  bonuses?: Partial<CharacterStatBlock>;
  equipment: Partial<Record<EquipmentSlotKey, EquipmentSlotData | null>>;
  portrait: {
    heroClass?: HeroClass;
    portraitSeed?: string;
    isDead?: boolean;
  };
}

function toSlot(item: Equipment | null | undefined): EquipmentSlotData | null {
  return item ? { name: item.name, rarity: item.rarity } : null;
}

/**
 * Adapt an in-game {@link Hero} into {@link CharacterCardData}. The current game
 * model only has weapon/armor/accessory and no mana/magic/resist, so those slots
 * and stats default to empty/zero while keeping the full mockup layout intact.
 */
export function heroToCharacterCardData(hero: Hero, relics: Relic[] = []): CharacterCardData {
  const mod = getModifiedStats(hero, relics);
  const isDead = hero.status === 'Dead';

  return {
    name: hero.name,
    className: hero.heroClass,
    level: hero.level,
    hp: isDead ? 0 : hero.hp,
    maxHp: mod.maxHp,
    morale: hero.morale,
    exp: hero.experience,
    expNeeded: hero.expNeeded,
    stats: {
      attack: mod.attack,
      magic: 0,
      speed: mod.speed,
      defense: mod.defense,
      resist: 0,
      luck: mod.luck,
    },
    bonuses: {
      attack: mod.attack - hero.attack,
      speed: mod.speed - hero.speed,
      defense: mod.defense - hero.defense,
      luck: mod.luck - hero.luck,
    },
    equipment: {
      mainHand: toSlot(hero.equipment.weapon),
      chest: toSlot(hero.equipment.armor),
      ring: toSlot(hero.equipment.accessory),
    },
    portrait: {
      heroClass: hero.heroClass,
      portraitSeed: hero.portraitSeed,
      isDead,
    },
  };
}
