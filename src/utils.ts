/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hero, Equipment, Relic, HeroClass, Dungeon, DungeonRoom, Monster, RoomType, MysteryEvent, EQUIP_SLOTS, emptyHeroEquipment, EquipmentModifiers } from './types';
import {
  HERO_NAMES_FIRST,
  HERO_NAMES_LAST,
  TRAITS_POOL,
  FLAVOR_TEXTS,
  CLASS_BASE_STATS,
  EQUIPMENT_CATALOG,
  MONSTERS_POOL,
  MYSTERY_EVENTS_CATALOG,
  RELICS_POOL
} from './data';

// Helper to generate a unique random ID.
// Returns a real UUID so entity ids map directly onto the Postgres `uuid`
// columns and relationships (equipped items, expedition party) persist cleanly.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older/non-secure environments (RFC 4122 v4 shape).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Calculate fully-modified stats of a hero including equipment, traits, and passive relics
export function getModifiedStats(
  hero: Hero,
  activeRelics: Relic[] = []
): {
  maxHp: number;
  attack: number;
  magic: number;
  defense: number;
  resist: number;
  speed: number;
  luck: number;
} {
  // 1. Start with base stats scaling with level (roughly +10% per level)
  const baseScale = 1 + (hero.level - 1) * 0.12;
  const baseStats = CLASS_BASE_STATS[hero.heroClass];

  let maxHp = Math.round(baseStats.maxHp * baseScale);
  let attack = Math.round(baseStats.attack * baseScale);
  let magic = Math.round(baseStats.magic * baseScale);
  let defense = Math.round(baseStats.defense * baseScale);
  let resist = Math.round(baseStats.resist * baseScale);
  let speed = Math.round(baseStats.speed * baseScale);
  let luck = Math.round(baseStats.luck * baseScale);

  // 2. Add flat equipment modifiers from every paperdoll slot
  for (const slot of EQUIP_SLOTS) {
    const item = hero.equipment?.[slot];
    if (!item) continue;
    const m = item.modifiers;
    if (m.maxHp) maxHp += m.maxHp;
    if (m.attack) attack += m.attack;
    if (m.magic) magic += m.magic;
    if (m.defense) defense += m.defense;
    if (m.resist) resist += m.resist;
    if (m.speed) speed += m.speed;
    if (m.luck) luck += m.luck;
  }

  // 3. Apply Guild Relic passive bonuses
  for (const relic of activeRelics) {
    if (relic.modifierType === 'defense_bonus') {
      defense += relic.modifierValue;
    }
  }

  // 4. Apply Traits (multipliers and adjustments)
  for (const trait of hero.traits) {
    if (trait.includes('Brave')) {
      attack = Math.round(attack * 1.15);
    } else if (trait.includes('Sturdy')) {
      defense = Math.round(defense * 1.15);
    } else if (trait.includes('Agile')) {
      speed = Math.round(speed * 1.20);
    } else if (trait.includes('Fortunate')) {
      luck = Math.round(luck * 1.25);
    } else if (trait.includes('Healthy')) {
      maxHp = Math.round(maxHp * 1.15);
    } else if (trait.includes('Reckless')) {
      attack = Math.round(attack * 1.30);
      defense = Math.round(defense * 0.80);
    } else if (trait.includes('Cautious')) {
      defense = Math.round(defense * 1.15);
      speed = Math.round(speed * 0.90);
    }
  }

  // Guarantee minimum values
  return {
    maxHp: Math.max(10, maxHp),
    attack: Math.max(1, attack),
    magic: Math.max(0, magic),
    defense: Math.max(0, defense),
    resist: Math.max(0, resist),
    speed: Math.max(1, speed),
    luck: Math.max(0, luck)
  };
}

// Create a randomized new hero candidate
export function generateRandomHero(level: number = 1): Hero {
  const heroClass = ['Warrior', 'Rogue', 'Mage', 'Cleric'][Math.floor(Math.random() * 4)] as HeroClass;
  const firstName = HERO_NAMES_FIRST[Math.floor(Math.random() * HERO_NAMES_FIRST.length)];
  const lastName = HERO_NAMES_LAST[Math.floor(Math.random() * HERO_NAMES_LAST.length)];
  const name = `${firstName} ${lastName}`;

  // Pick 1-2 random traits
  const traits: string[] = [];
  const trait1 = TRAITS_POOL[Math.floor(Math.random() * TRAITS_POOL.length)];
  traits.push(trait1);
  if (Math.random() > 0.6) {
    let trait2 = TRAITS_POOL[Math.floor(Math.random() * TRAITS_POOL.length)];
    while (trait2 === trait1) {
      trait2 = TRAITS_POOL[Math.floor(Math.random() * TRAITS_POOL.length)];
    }
    traits.push(trait2);
  }

  const flavors = FLAVOR_TEXTS[heroClass];
  const flavorText = flavors[Math.floor(Math.random() * flavors.length)];

  // Scale experience levels
  const expNeeded = level * 100;

  // Render starter equipment (Warriors start with training swords, etc.)
  const baseStats = CLASS_BASE_STATS[heroClass];

  return {
    id: generateId(),
    name,
    heroClass,
    level,
    experience: 0,
    expNeeded,
    maxHp: baseStats.maxHp,
    hp: baseStats.maxHp,
    attack: baseStats.attack,
    magic: baseStats.magic,
    defense: baseStats.defense,
    resist: baseStats.resist,
    speed: baseStats.speed,
    luck: baseStats.luck,
    morale: 100,
    status: 'Idle',
    diedAt: null,
    equipment: emptyHeroEquipment(),
    portraitSeed: 'default',
    flavorText,
    traits
  };
}

// Generate a random item with rarity weighting based on guild level
export function generateRandomEquipment(guildLevel: number): Equipment {
  // Determine rarity weight
  const roll = Math.random();
  let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';

  if (guildLevel >= 4 && roll > 0.95) {
    rarity = 'legendary';
  } else if (guildLevel >= 3 && roll > 0.85) {
    rarity = 'epic';
  } else if (guildLevel >= 2 && roll > 0.60) {
    rarity = 'rare';
  }

  // Filter catalog items of this rarity, or default down if none available
  let pool = EQUIPMENT_CATALOG.filter((item) => item.rarity === rarity);
  if (pool.length === 0) {
    pool = EQUIPMENT_CATALOG.filter((item) => item.rarity === 'common');
  }

  const baseItem = pool[Math.floor(Math.random() * pool.length)];

  // Apply some level scaling to the item statistics so higher levels get cooler drops
  const scaleMultiplier = 1 + (guildLevel - 1) * 0.15;
  const scaledModifiers: EquipmentModifiers = {};

  Object.entries(baseItem.modifiers).forEach(([stat, val]) => {
    scaledModifiers[stat as keyof EquipmentModifiers] = Math.round((val as number) * scaleMultiplier);
  });

  return {
    ...baseItem,
    id: generateId(),
    modifiers: scaledModifiers,
    price: Math.round(baseItem.price * scaleMultiplier)
  };
}

// Generate a random monster based on difficulty tier
export function generateMonster(tier: 'common' | 'elite' | 'boss'): Monster {
  const monsterTemplates = MONSTERS_POOL[tier];
  const template = monsterTemplates[Math.floor(Math.random() * monsterTemplates.length)];

  // Add slight statistical variance (+/- 15%)
  const variance = 0.85 + Math.random() * 0.3;
  return {
    id: generateId(),
    name: template.name,
    maxHp: Math.round(template.hp * variance),
    hp: Math.round(template.hp * variance),
    attack: Math.round(template.attack * variance),
    defense: Math.round(template.defense * variance),
    speed: Math.round(template.speed * variance),
    avatarSeed: template.avatarSeed + '_' + Math.random().toString().substring(2, 6)
  };
}

// Build standard procedural rooms map for a selected dungeon layout
export function generateDungeonRooms(
  totalRooms: number,
  dangerRating: number
): DungeonRoom[] {
  const rooms: DungeonRoom[] = [];

  // Determine possible room types
  const regularTypes: RoomType[] = [
    'Monster', 'Monster', 'Treasure', 'Campfire', 'Trap', 'Mystery Event', 'Merchant'
  ];

  for (let i = 0; i < totalRooms; i++) {
    let type: RoomType = 'Monster';
    let name = `Room ${i + 1}`;
    let description = 'A dusty narrow hallway.';

    if (i === 0) {
      // First room is always a lightweight warmup fight or simple treasure
      type = Math.random() > 0.5 ? 'Treasure' : 'Monster';
    } else if (i === totalRooms - 1) {
      // Final room is ALWAYS the Boss
      type = 'Boss';
    } else if (i === Math.floor(totalRooms / 2)) {
      // Middle room is a Campfire for healing
      type = 'Campfire';
    } else {
      // Procedurally select based on danger and random dice
      const roll = Math.random();
      if (roll > 0.85) {
        type = 'Elite Monster';
      } else if (roll > 0.70) {
        type = 'Mystery Event';
      } else if (roll > 0.55) {
        type = 'Trap';
      } else if (roll > 0.40) {
        type = 'Treasure';
      } else if (roll > 0.30) {
        type = 'Campfire';
      } else if (roll > 0.20) {
        type = 'Merchant';
      } else {
        type = 'Monster';
      }
    }

    // Custom names and descriptions based on types
    let monsterGroup: Monster[] = [];
    let mysteryEvent: MysteryEvent | undefined;
    let treasureLoot: DungeonRoom['treasureLoot'];

    if (type === 'Monster') {
      name = `Shadow Corridor ${i + 1}`;
      description = 'You hear growling echoes and scurrying footsteps in the darkness ahead.';
      // 1-2 common monsters based on danger rating
      const count = dangerRating >= 3 && Math.random() > 0.4 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        monsterGroup.push(generateMonster('common'));
      }
    } else if (type === 'Elite Monster') {
      name = `Ominous Chamber ${i + 1}`;
      description = 'A massive demonic silhouette guards a heavy iron gates door.';
      monsterGroup.push(generateMonster('elite'));
      // Sometimes an extra companion
      if (dangerRating >= 4 && Math.random() > 0.5) {
        monsterGroup.push(generateMonster('common'));
      }
    } else if (type === 'Boss') {
      name = 'The Abyssal Sanctum';
      description = 'The air thickens with smoke and heavy magical energy. The master of this vault awaits your arrival.';
      monsterGroup.push(generateMonster('boss'));
    } else if (type === 'Treasure') {
      name = 'Hidden Vault Altar';
      description = 'A dusty golden chest lies on a stone pedestal, waiting to be looted.';
      // Gold reward scales with dungeon rating
      const gold = Math.round((70 + Math.random() * 80) * dangerRating);
      // Chance of random gear
      let equipment: Equipment | undefined;
      if (Math.random() > 0.40) {
        equipment = generateRandomEquipment(dangerRating);
      }
      treasureLoot = { gold, equipment };
    } else if (type === 'Campfire') {
      name = 'Sacred Safe Campfire';
      description = 'A warm draft ventilates this dry cave chamber. A perfect spot to pitch a tent and mend wounds.';
    } else if (type === 'Merchant') {
      name = 'Wandering Cart Merchant';
      description = 'A shady hooded figure sits atop a packed carriage. "Greetings, managers! Got some gold?"';
    } else if (type === 'Trap') {
      name = 'Riddle Trap corridor';
      description = 'Hidden pressure plates or toxic swinging blades line the narrow brick tunnel.';
    } else if (type === 'Mystery Event') {
      name = 'Echoes of the Past';
      description = 'An unpredictable narrative event challenges your party\'s resolve.';
      // Pull random mystery event from catalog
      const randomEvent = MYSTERY_EVENTS_CATALOG[Math.floor(Math.random() * MYSTERY_EVENTS_CATALOG.length)];
      // Clone it to avoid state pollution
      mysteryEvent = JSON.parse(JSON.stringify(randomEvent));
    }

    rooms.push({
      id: generateId(),
      index: i,
      type,
      name,
      description,
      status: i === 0 ? 'active' : 'upcoming',
      monsterGroup,
      mysteryEvent,
      treasureLoot
    });
  }

  return rooms;
}
