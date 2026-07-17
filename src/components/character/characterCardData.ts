/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Equipment,
  EquipSlot,
  EQUIP_SLOTS,
  EQUIP_SLOT_LABELS,
  emptyHeroEquipment,
  Hero,
  HeroClass,
  Relic,
  normalizeEquipSlot,
} from '../../types';
import { getModifiedStats } from '../../utils';

/** Re-export paperdoll keys for UI consumers. */
export type EquipmentSlotKey = EquipSlot;
export { EQUIP_SLOT_LABELS };

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

/** Ensure a hero equipment bag has every paperdoll slot (migrates legacy saves). */
export function normalizeHeroEquipment(raw: unknown): Hero['equipment'] {
  const bag = emptyHeroEquipment();
  if (!raw || typeof raw !== 'object') return bag;
  const src = raw as Record<string, Equipment | null | undefined>;

  // Legacy 3-slot bag
  if ('weapon' in src || 'armor' in src || 'accessory' in src) {
    if (src.weapon) bag.mainHand = { ...src.weapon, type: 'mainHand' };
    if (src.armor) bag.chest = { ...src.armor, type: 'chest' };
    if (src.accessory) bag.ring = { ...src.accessory, type: 'ring' };
  }

  for (const slot of EQUIP_SLOTS) {
    const item = src[slot];
    if (item) bag[slot] = { ...item, type: normalizeEquipSlot(item.type ?? slot) };
  }
  return bag;
}

/**
 * Adapt an in-game {@link Hero} into {@link CharacterCardData}.
 */
export function heroToCharacterCardData(hero: Hero, relics: Relic[] = []): CharacterCardData {
  const equipment = normalizeHeroEquipment(hero.equipment);
  const normalized: Hero = { ...hero, equipment };
  const mod = getModifiedStats(normalized, relics);
  const isDead = hero.status === 'Dead';

  const equipmentView: CharacterCardData['equipment'] = {};
  for (const slot of EQUIP_SLOTS) {
    equipmentView[slot] = toSlot(equipment[slot]);
  }

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
      magic: mod.magic,
      speed: mod.speed,
      defense: mod.defense,
      resist: mod.resist,
      luck: mod.luck,
    },
    bonuses: {
      attack: mod.attack - hero.attack,
      magic: mod.magic - (hero.magic ?? 0),
      speed: mod.speed - hero.speed,
      defense: mod.defense - hero.defense,
      resist: mod.resist - (hero.resist ?? 0),
      luck: mod.luck - hero.luck,
    },
    equipment: equipmentView,
    portrait: {
      heroClass: hero.heroClass,
      portraitSeed: hero.portraitSeed,
      isDead,
    },
  };
}
