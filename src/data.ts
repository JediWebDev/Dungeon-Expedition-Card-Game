/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Equipment, Hero, Relic, HeroClass, MysteryEvent } from './types';

// Random datasets for generating unique adventurers
export const HERO_NAMES_FIRST = [
  'Alden', 'Lyra', 'Kaelen', 'Sariel', 'Garrick', 'Valerie', 'Darius', 'Elysia',
  'Brokk', 'Freya', 'Cassian', 'Morgath', 'Talon', 'Bryn', 'Zane', 'Talia',
  'Orin', 'Sonia', 'Gideon', 'Aria', 'Kael', 'Myra', 'Thorne', 'Selene'
];

export const HERO_NAMES_LAST = [
  'Stormweaver', 'Ironclad', 'Shadowstep', 'Sunstrider', 'Oakheart', 'Dreadward',
  'Swiftblade', 'Lightbringer', 'Stonegrinder', 'Whisperwind', 'Frostspire', 'Emberforge',
  'Goldfinder', 'Runehammer', 'Nightshade', 'Silverhand', 'Doombringer', 'Wyrmslayer'
];

export const TRAITS_POOL = [
  'Brave (+15% Attack in combat)',
  'Sturdy (+15% Defense in combat)',
  'Agile (+20% Speed)',
  'Fortunate (+25% Luck)',
  'Cynic (-10% Morale decay)',
  'Leader (+10% Morale to entire party)',
  'Lucky Finder (+10% Gold reward)',
  'Healthy (+15% Max HP)',
  'Reckless (+30% Attack, -20% Defense)',
  'Cautious (+15% Defense, -10% Speed)'
];

export const FLAVOR_TEXTS: Record<HeroClass, string[]> = {
  Warrior: [
    'A battle-hardened veteran of the border wars, looking for gold and glory.',
    'Swore an oath to defend the weak, but guild management pays better.',
    'Ex-royal guard who left the palace because there was too much talking.',
    'Values cold iron and heavy plate armor above all fancy magic.'
  ],
  Rogue: [
    'A quick-fingered thief who realized dungeon loot is safer than pickpocketing guards.',
    'Shadowy assassin who prefers strike-and-run combat. Charges double for traps.',
    'Known in three different cities under six different aliases.',
    'Equipped with poisoned throwing daggers, lockpicks, and a charming smirk.'
  ],
  Mage: [
    'Expelled from the Arcane University for "dangerously creative fire research".',
    'Seeks ancient scripts to unlock cosmic secrets, or just buy a bigger tower.',
    'Controls elements of ice and fire, but complains when hiking up dungeon stairs.',
    'Claims to hear the whispers of the universe, but mostly hears tinnitus.'
  ],
  Cleric: [
    'Devoted priest of the Dawnbringer, spreading light into dark underground vaults.',
    'An army chaplain who decided the dungeon guild is a better missionary field.',
    'Offers healing and holy shields, with a stern sermon on wastefulness.',
    'Fights undead with a massive mace, because their holy order forbids spilling blood with edged weapons.'
  ]
};

// Base stats for Level 1 heroes of each class
export const CLASS_BASE_STATS: Record<HeroClass, {
  maxHp: number;
  attack: number;
  magic: number;
  defense: number;
  resist: number;
  speed: number;
  luck: number;
}> = {
  Warrior: { maxHp: 120, attack: 14, magic: 4, defense: 10, resist: 6, speed: 6, luck: 4 },
  Rogue: { maxHp: 90, attack: 18, magic: 5, defense: 5, resist: 4, speed: 12, luck: 10 },
  Mage: { maxHp: 80, attack: 10, magic: 20, defense: 3, resist: 10, speed: 8, luck: 6 },
  Cleric: { maxHp: 105, attack: 12, magic: 14, defense: 8, resist: 12, speed: 7, luck: 7 }
};

// Equipment Catalog — one item type per paperdoll slot
export const EQUIPMENT_CATALOG: Omit<Equipment, 'id'>[] = [
  // --- Main hand ---
  {
    name: 'Rusty Training Sword',
    type: 'mainHand',
    rarity: 'common',
    modifiers: { attack: 2 },
    price: 30,
    description: 'Barely better than a wooden stick, but it gets the job done.'
  },
  {
    name: 'Iron Broadsword',
    type: 'mainHand',
    rarity: 'common',
    modifiers: { attack: 5, speed: -1 },
    price: 80,
    description: 'Solid forged steel. Heavy and dependable.'
  },
  {
    name: 'Assassin Dagger',
    type: 'mainHand',
    rarity: 'rare',
    modifiers: { attack: 8, speed: 2, luck: 3 },
    price: 250,
    description: 'Lightweight dagger with a serrated edge, perfect for vital strikes.'
  },
  {
    name: 'Wizard Elm Staff',
    type: 'mainHand',
    rarity: 'common',
    modifiers: { magic: 6, luck: 1 },
    price: 75,
    description: 'Channeled wood that resonates with ambient magical fields.'
  },
  {
    name: 'Spire Spellbook',
    type: 'mainHand',
    rarity: 'rare',
    modifiers: { magic: 12, maxHp: 10 },
    price: 280,
    description: 'Contains glowing runes that incinerate targets at a safe distance.'
  },
  {
    name: 'Dawnbringer Mace',
    type: 'mainHand',
    rarity: 'rare',
    modifiers: { attack: 7, magic: 4, defense: 2 },
    price: 240,
    description: 'An elegant mace consecrated in high temples. Glows in the dark.'
  },
  {
    name: 'Excalibur Replica',
    type: 'mainHand',
    rarity: 'epic',
    modifiers: { attack: 14, defense: 4, speed: 1 },
    price: 600,
    description: 'A masterpiece sword glowing with inner power and guild prestige.'
  },
  {
    name: 'Death Weaver Bow',
    type: 'mainHand',
    rarity: 'epic',
    modifiers: { attack: 16, speed: 4 },
    price: 620,
    description: 'Rumored to have been stolen from an elven archer-lord.'
  },
  {
    name: 'Ragnarok Greatsword',
    type: 'mainHand',
    rarity: 'legendary',
    modifiers: { attack: 28, defense: -4, speed: -2, luck: 5 },
    price: 1200,
    description: "An ancient colossal blade said to have severed a giant's mountain fortress."
  },

  // --- Off-hand ---
  {
    name: 'Buckler of Oak',
    type: 'offHand',
    rarity: 'common',
    modifiers: { defense: 3 },
    price: 45,
    description: 'A round wooden shield. Better than nothing when blades whistle past.'
  },
  {
    name: 'Iron Kite Shield',
    type: 'offHand',
    rarity: 'rare',
    modifiers: { defense: 7, resist: 2 },
    price: 220,
    description: 'Tall steel faceplate that shrugs off arrows and glancing blows.'
  },
  {
    name: 'Spellward Focus',
    type: 'offHand',
    rarity: 'epic',
    modifiers: { magic: 8, resist: 6 },
    price: 580,
    description: 'A crystalline orb that steadies the caster and turns aside hostile magic.'
  },
  {
    name: 'Aegis of Dawn',
    type: 'offHand',
    rarity: 'legendary',
    modifiers: { defense: 14, resist: 10, maxHp: 20 },
    price: 1100,
    description: 'Sacred tower shield that radiates a soft protective light.'
  },

  // --- Head ---
  {
    name: 'Leather Cap',
    type: 'head',
    rarity: 'common',
    modifiers: { defense: 1 },
    price: 35,
    description: 'Simple hide cap. Keeps rain and light cuts off your scalp.'
  },
  {
    name: 'Iron Sallet',
    type: 'head',
    rarity: 'rare',
    modifiers: { defense: 5, resist: 1 },
    price: 200,
    description: 'Visored steel helm favored by borderland militia.'
  },
  {
    name: 'Circlet of Clarity',
    type: 'head',
    rarity: 'epic',
    modifiers: { magic: 8, luck: 2 },
    price: 540,
    description: 'Silver band etched with focusing runes that sharpen the mind.'
  },

  // --- Neck ---
  {
    name: 'Copper Charm',
    type: 'neck',
    rarity: 'common',
    modifiers: { luck: 1 },
    price: 40,
    description: 'A cheap charm sold at roadside shrines.'
  },
  {
    name: 'Ruby Amulet',
    type: 'neck',
    rarity: 'rare',
    modifiers: { maxHp: 25, attack: 2 },
    price: 220,
    description: "A deep crimson crystal that pulsates to the wearer's heartbeat."
  },
  {
    name: 'Vampire Fang Pendant',
    type: 'neck',
    rarity: 'epic',
    modifiers: { attack: 6, speed: 2, maxHp: -10 },
    price: 550,
    description: 'Steals life energy from surroundings. Increases damage but shortens health limits.'
  },

  // --- Shoulders ---
  {
    name: 'Padded Spaulders',
    type: 'shoulders',
    rarity: 'common',
    modifiers: { defense: 2 },
    price: 50,
    description: 'Quilted cloth pads for the shoulders. Light and warm.'
  },
  {
    name: 'Pauldrons of the Watch',
    type: 'shoulders',
    rarity: 'rare',
    modifiers: { defense: 5, resist: 2 },
    price: 260,
    description: 'Polished plates stamped with the guild watch sigil.'
  },

  // --- Chest ---
  {
    name: 'Worn Leather Vest',
    type: 'chest',
    rarity: 'common',
    modifiers: { defense: 2, speed: 1 },
    price: 40,
    description: 'Smells of wet dog and old sweat, but protects against light scrapes.'
  },
  {
    name: 'Reinforced Mail Shirt',
    type: 'chest',
    rarity: 'common',
    modifiers: { defense: 5 },
    price: 110,
    description: 'Interlinked steel rings. Very noisy, but shields against blades.'
  },
  {
    name: 'Guild Knight Plate',
    type: 'chest',
    rarity: 'rare',
    modifiers: { defense: 9, speed: -2, maxHp: 20 },
    price: 320,
    description: 'Thick polished plate armor bearing the insignia of legendary protectors.'
  },
  {
    name: 'Satin Mage Robes',
    type: 'chest',
    rarity: 'common',
    modifiers: { defense: 1, magic: 4, speed: 2 },
    price: 85,
    description: 'Silky blue cloth. Zero physical defense, but highly comfortable.'
  },
  {
    name: 'Aegis Sentinel Carapace',
    type: 'chest',
    rarity: 'epic',
    modifiers: { defense: 15, maxHp: 40, speed: -3 },
    price: 650,
    description: 'Crafted from the armored plates of a subterranean terror. Unyielding.'
  },
  {
    name: 'Dragon Scale Hauberk',
    type: 'chest',
    rarity: 'legendary',
    modifiers: { defense: 22, resist: 8, maxHp: 60, speed: 1, luck: 5 },
    price: 1350,
    description: 'Imbued with the lifeblood of a red dragon. Highly fireproof and indestructible.'
  },

  // --- Back ---
  {
    name: 'Travel Cloak',
    type: 'back',
    rarity: 'common',
    modifiers: { resist: 1, speed: 1 },
    price: 40,
    description: 'Wool cloak that keeps wind and light hexes at bay.'
  },
  {
    name: 'Astral Cloak',
    type: 'back',
    rarity: 'rare',
    modifiers: { defense: 2, resist: 5, speed: 3, luck: 2 },
    price: 310,
    description: 'Woven with dark matter. Partially displaces the wearer into the spirit realm.'
  },

  // --- Wrists ---
  {
    name: 'Leather Bracers',
    type: 'wrists',
    rarity: 'common',
    modifiers: { defense: 1 },
    price: 30,
    description: 'Stiff leather wraps that protect the forearms.'
  },
  {
    name: 'Runed Bracers',
    type: 'wrists',
    rarity: 'rare',
    modifiers: { magic: 4, resist: 3 },
    price: 210,
    description: 'Iron cuffs etched with warding sigils.'
  },

  // --- Hands ---
  {
    name: 'Work Gloves',
    type: 'hands',
    rarity: 'common',
    modifiers: { attack: 1 },
    price: 25,
    description: 'Thick gloves for gripping steel without blisters.'
  },
  {
    name: 'Gauntlets of Grip',
    type: 'hands',
    rarity: 'rare',
    modifiers: { attack: 4, defense: 2 },
    price: 230,
    description: 'Fingered plate gloves that never slip on a hilt.'
  },

  // --- Waist ---
  {
    name: 'Utility Belt',
    type: 'waist',
    rarity: 'common',
    modifiers: { luck: 1, speed: 1 },
    price: 35,
    description: 'Plenty of pouches for potions, chalk, and dungeon dust.'
  },
  {
    name: 'Girdle of Fortitude',
    type: 'waist',
    rarity: 'epic',
    modifiers: { maxHp: 30, defense: 4 },
    price: 520,
    description: 'Broad belt that steadies the core and hardens the gut.'
  },

  // --- Legs ---
  {
    name: 'Canvas Trousers',
    type: 'legs',
    rarity: 'common',
    modifiers: { defense: 1, speed: 1 },
    price: 35,
    description: 'Practical dungeon pants with reinforced knees.'
  },
  {
    name: 'Plate Greaves',
    type: 'legs',
    rarity: 'rare',
    modifiers: { defense: 6, speed: -1 },
    price: 240,
    description: 'Articulated steel plates covering thighs and shins.'
  },

  // --- Feet ---
  {
    name: 'Speedy Running Boots',
    type: 'feet',
    rarity: 'common',
    modifiers: { speed: 3 },
    price: 60,
    description: 'Fitted with soft rabbit leather on the soles. Quiet and swift.'
  },
  {
    name: 'Iron Sabatons',
    type: 'feet',
    rarity: 'rare',
    modifiers: { defense: 4, resist: 1 },
    price: 200,
    description: 'Heavy metal boots that plant you firmly against charges.'
  },

  // --- Trinket ---
  {
    name: 'Jade Clover Pin',
    type: 'trinket',
    rarity: 'rare',
    modifiers: { luck: 6, speed: 1 },
    price: 240,
    description: 'Four-leaf clover preserved in high-purity crystalline jade.'
  },
  {
    name: 'Gilded Sphinx Eye',
    type: 'trinket',
    rarity: 'legendary',
    modifiers: { maxHp: 50, attack: 6, magic: 6, defense: 6, resist: 6, speed: 4, luck: 8 },
    price: 1500,
    description: 'A cosmic focal relic that elevates every attribute of the host.'
  },

  // --- Ring ---
  {
    name: 'Copper Ring of Luck',
    type: 'ring',
    rarity: 'common',
    modifiers: { luck: 2 },
    price: 45,
    description: 'Turns your finger green, but gives you a warmer fuzzy feeling inside.'
  },
  {
    name: 'Band of Warding',
    type: 'ring',
    rarity: 'rare',
    modifiers: { resist: 5, defense: 2 },
    price: 210,
    description: 'A simple silver band that softens incoming hexes.'
  },
  {
    name: 'Archmage Signet',
    type: 'ring',
    rarity: 'epic',
    modifiers: { magic: 10, luck: 2 },
    price: 560,
    description: 'Signet of a fallen tower master, still faintly warm with power.'
  }
];

// Relics List
export const RELICS_POOL: Relic[] = [
  {
    id: 'relic_compass',
    name: 'Ancient Compass',
    description: 'Expeditions reward +15% Gold.',
    modifierType: 'gold_bonus',
    modifierValue: 0.15
  },
  {
    id: 'relic_chronicle',
    name: 'Guild Chronicle',
    description: 'All survivors receive +20% Experience.',
    modifierType: 'exp_bonus',
    modifierValue: 0.20
  },
  {
    id: 'relic_banner',
    name: 'Banner of Valor',
    description: 'Morale loss in dungeons reduced by 25%.',
    modifierType: 'morale_bonus',
    modifierValue: 0.25
  },
  {
    id: 'relic_shied_stone',
    name: 'Heartstone Shield',
    description: 'All heroes receive passive +4 Defense in combat.',
    modifierType: 'defense_bonus',
    modifierValue: 4
  },
  {
    id: 'relic_cauldron',
    name: 'Alchemist Cauldron',
    description: 'Rest camp healing increased by 50%.',
    modifierType: 'heal_bonus',
    modifierValue: 0.50
  }
];

// Mystery Events
export const MYSTERY_EVENTS_CATALOG: MysteryEvent[] = [
  {
    id: 'event_shrine',
    title: 'The Ancient Shrine',
    description: 'The adventurers stumble upon an overgrown, moss-covered stone altar radiating a warm golden aura. Whispery voices promise salvation for the faithful or ruin for the greedy.',
    choices: [
      {
        text: 'Pray at the altar',
        description: 'Spend some quiet moments seeking a divine blessing.',
        outcomes: [
          {
            text: 'The heavens open! The party receives full restoration and a burst of morale!',
            probability: 0.7,
            effects: { moraleEffect: 30, experienceBonus: 25 }
          },
          {
            text: 'Your prayer is met with silence, but a peaceful breeze boosts morale slightly.',
            probability: 0.3,
            effects: { moraleEffect: 10 }
          }
        ]
      },
      {
        text: 'Loot the offering chest',
        description: 'Crack open the rusted collection box sitting at the base of the altar.',
        outcomes: [
          {
            text: 'Success! You plunder old treasures safely!',
            probability: 0.5,
            effects: { gold: 150, itemDrop: true, moraleEffect: -10 }
          },
          {
            text: 'A divine lightning bolt strikes! The party takes structural burns!',
            probability: 0.5,
            effects: { hpDamagePercent: 0.25, moraleEffect: -25 }
          }
        ]
      },
      {
        text: 'Leave respectfully',
        description: 'Nod and keep walking.',
        outcomes: [
          {
            text: 'The party safely proceeds with clear consciences.',
            probability: 1.0,
            effects: { moraleEffect: 5 }
          }
        ]
      }
    ]
  },
  {
    id: 'event_goblins',
    title: 'The Goblin Gamblers',
    description: 'A band of small, green-skinned creatures is clustered around a wooden barrel playing dice. They look up, terrified, but then one of them eagerly rattles a copper cup and gestures for a game of chance.',
    choices: [
      {
        text: 'Wager 50 Gold on dice',
        description: 'Play their crooked game with a high luck check.',
        requirements: { gold: 50 },
        outcomes: [
          {
            text: 'You outsmart the goblins! They cry in frustration and hand over their gold stash!',
            probability: 0.6,
            effects: { gold: 150, moraleEffect: 15 }
          },
          {
            text: 'They swindle you with weighted dice and run off laughing into the dark vents!',
            probability: 0.4,
            effects: { gold: -50, moraleEffect: -15 }
          }
        ]
      },
      {
        text: 'Ambush and scare them',
        description: 'Draw weapons and demand their valuables.',
        outcomes: [
          {
            text: 'They squeal in fear, drop an expensive accessory, and flee!',
            probability: 0.7,
            effects: { itemDrop: true, gold: 30 }
          },
          {
            text: 'They fight back with hidden pocket-knives before escaping, wounding your frontline!',
            probability: 0.3,
            effects: { hpDamagePercent: 0.15, moraleEffect: -5 }
          }
        ]
      },
      {
        text: 'Walk past them',
        description: 'Avoid the distraction.',
        outcomes: [
          {
            text: 'They make rude gestures but leave you alone.',
            probability: 1.0,
            effects: {}
          }
        ]
      }
    ]
  },
  {
    id: 'event_fountain',
    title: 'Glowing Wellspring',
    description: 'A subterranean fountain bubbles with incandescent liquid. It smells like ozone and lilac.',
    choices: [
      {
        text: 'Drink from the water',
        description: 'Take deep gulps of the mysterious glowing fluid.',
        outcomes: [
          {
            text: 'Incredible energy fills the party! Everyone gains significant experience!',
            probability: 0.5,
            effects: { experienceBonus: 60, moraleEffect: 15 }
          },
          {
            text: 'The water is highly acidic! The adventurers gag, coughing up sparks and losing health.',
            probability: 0.5,
            effects: { hpDamagePercent: 0.20, moraleEffect: -20 }
          }
        ]
      },
      {
        text: 'Scoop water into empty vials',
        description: 'Carefully bottle it for later use.',
        outcomes: [
          {
            text: 'You bottled it! You discover some glowing residue that sells well.',
            probability: 0.8,
            effects: { gold: 100 }
          },
          {
            text: 'The bottles explode! Shattered glass cuts the party.',
            probability: 0.2,
            effects: { hpDamagePercent: 0.1, moraleEffect: -5 }
          }
        ]
      }
    ]
  },
  {
    id: 'event_merchant_caravan',
    title: 'The Lost Cart',
    description: 'A luxury merchant cart has broken an axle in the deep cave corridors. The driver has vanished, leaving the goods vulnerable.',
    choices: [
      {
        text: 'Carefully scavenge the contents',
        description: 'Search for high-value gear while avoiding alarm traps.',
        outcomes: [
          {
            text: 'Jackpot! You discover high-quality equipment and coins inside!',
            probability: 0.6,
            effects: { gold: 120, itemDrop: true, experienceBonus: 10 }
          },
          {
            text: 'You trigger a needle-trap! A poison dart strikes, causing heavy sickness and morale drop.',
            probability: 0.4,
            effects: { hpDamagePercent: 0.22, moraleEffect: -15 }
          }
        ]
      },
      {
        text: 'Burn the cart for warmth',
        description: 'A solid campfire will restore morale.',
        outcomes: [
          {
            text: 'A comforting blaze warm-up! Morale rises immensely.',
            probability: 1.0,
            effects: { moraleEffect: 25 }
          }
        ]
      }
    ]
  }
];

// Subterranean Monsters Group
export const MONSTERS_POOL = {
  common: [
    { name: 'Cavern Bat', hp: 35, attack: 6, defense: 2, speed: 9, avatarSeed: 'bat' },
    { name: 'Scurrying Goblin', hp: 45, attack: 8, defense: 3, speed: 10, avatarSeed: 'goblin' },
    { name: 'Spitting Spider', hp: 40, attack: 7, defense: 4, speed: 7, avatarSeed: 'spider' },
    { name: 'Rusted Skeleton', hp: 55, attack: 9, defense: 6, speed: 4, avatarSeed: 'skeleton' },
    { name: 'Feral Slime', hp: 60, attack: 5, defense: 8, speed: 5, avatarSeed: 'slime' }
  ],
  elite: [
    { name: 'Cave Troll', hp: 120, attack: 18, defense: 10, speed: 5, avatarSeed: 'troll' },
    { name: 'Shadow Stalker', hp: 90, attack: 24, defense: 4, speed: 14, avatarSeed: 'stalker' },
    { name: 'Grave Lich', hp: 100, attack: 20, defense: 8, speed: 8, avatarSeed: 'lich' },
    { name: 'Gargoyle Sentinel', hp: 130, attack: 15, defense: 14, speed: 6, avatarSeed: 'gargoyle' }
  ],
  boss: [
    { name: 'Shadow Dragon Lord', hp: 350, attack: 35, defense: 20, speed: 10, avatarSeed: 'dragon' },
    { name: 'Abyssal Beholder', hp: 300, attack: 40, defense: 15, speed: 12, avatarSeed: 'beholder' },
    { name: 'Arch-Demon Malphas', hp: 380, attack: 38, defense: 18, speed: 9, avatarSeed: 'demon' }
  ]
};

// Preconfigured Dungeons Map
export const DUNGEON_TEMPLATES = [
  {
    id: 'dungeon_1',
    name: 'Crypt of Shadows',
    description: 'An old ruined burial vault filled with restless skeletons, bats, and ancient chests. Perfect for greenhorn adventurers.',
    dangerRating: 1,
    totalRooms: 6,
    rewardsPreview: 'Common Gear, low Gold, Relic: Compass'
  },
  {
    id: 'dungeon_2',
    name: 'Fungal Lost Grotto',
    description: 'A damp, glowing subterranean cavern overrun by monstrous cave bugs, poisonous slimes, and rogue goblins.',
    dangerRating: 2,
    totalRooms: 8,
    rewardsPreview: 'Rare Accessories, medium Gold, Relic: Chronicle'
  },
  {
    id: 'dungeon_3',
    name: 'Volcanic Brimstone Forge',
    description: 'An abandoned dwarven fortress built directly over active magma vents. High heat, toxic traps, and dangerous elite trollers.',
    dangerRating: 4,
    totalRooms: 10,
    rewardsPreview: 'Epic Weapons, high Gold, Relic: Alchemist Cauldron'
  },
  {
    id: 'dungeon_4',
    name: 'Arch-Demon Castle Void',
    description: 'The ultimate dark rift fortress where the Shadow Dragon and high demons plot the ruin of the upper surface kingdom.',
    dangerRating: 5,
    totalRooms: 12,
    rewardsPreview: 'Legendary Items, massive Gold, Relic: Heartstone Shield'
  }
];
