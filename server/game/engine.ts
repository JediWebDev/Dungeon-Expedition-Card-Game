/**
 * Server-authoritative game engine for Guilds of Ardessia.
 *
 * Pure reducer: `applyGameAction(state, action)` takes the current
 * `{ guild, expedition }` snapshot plus a client-submitted intent and returns
 * a brand-new snapshot. Nothing here mutates its inputs — every branch clones
 * whatever it changes — and all randomness (loot rolls, combat rolls, dungeon
 * generation) happens here on the server rather than trusting the client.
 *
 * Illegal moves (insufficient gold, wrong entity status, missing entity,
 * resolving a room twice, etc.) throw `GameActionError` instead of silently
 * no-op'ing like the old client-side reducer did.
 */
import type { GameAction } from './actions';
import type {
  CombatLog,
  Dungeon,
  DungeonRoom,
  Equipment,
  EventOutcome,
  ExpeditionState,
  GuildState,
  Hero,
  Monster
} from '../../src/types';
import { EQUIP_SLOTS } from '../../src/types';
import {
  generateId,
  generateRandomEquipment,
  generateRandomHero,
  getModifiedStats
} from '../../src/utils';
import {
  advanceAlongPath,
  ensureDungeonMap,
  generateDungeonLayout,
  getNextNodeId,
  resolveActiveRoom,
  resolveActiveRoomIndex,
  resolveCurrentNodeId,
} from '../../src/dungeonMap';
import { DUNGEON_TEMPLATES, RELICS_POOL } from '../../src/data';
import {
  applyDueAutoRevives,
  getHealCost,
  getInstantReviveCost,
} from '../../src/sanctuary';
import {
  bindCombatSettlers,
  handleAdvanceCombat,
  handleSetCombatMode,
  handleSubmitCombatAction,
  prepareRoomCombat,
} from './combat';
import { GameActionError, type GameSnapshot } from './types';

export type { GameSnapshot } from './types';
export { GameActionError } from './types';

/** Narrows `GameAction` to the variant matching a given `type` literal. */
type ActionOf<T extends GameAction['type']> = Extract<GameAction, { type: T }>;

const TERMINAL_EXPEDITION_STATUSES: ExpeditionState['status'][] = ['victory', 'defeat', 'retreat'];
const COMBAT_ROOM_TYPES: DungeonRoom['type'][] = ['Monster', 'Elite Monster', 'Boss'];
const CHOICE_ROOM_TYPES: DungeonRoom['type'][] = ['Campfire', 'Trap', 'Mystery Event'];

/** Stamp a hero as fallen for Sanctuary auto-revive tracking. */
function markHeroDead(hero: Hero, extras: Partial<Hero> = {}, now = Date.now()): Hero {
  return {
    ...hero,
    ...extras,
    status: 'Dead',
    hp: 0,
    diedAt: extras.diedAt ?? now,
  };
}

/**
 * Apply any due free Sanctuary auto-revives. Call before serving state / applying actions.
 * Returns the same snapshot reference when nothing changed.
 */
export function resolveSanctuary(snapshot: GameSnapshot, now = Date.now()): GameSnapshot {
  const { roster, revivedIds } = applyDueAutoRevives(
    snapshot.guild.roster,
    snapshot.guild.upgrades.healerStation,
    now
  );
  if (revivedIds.length === 0) return snapshot;
  return {
    ...snapshot,
    guild: { ...snapshot.guild, roster },
  };
}

// ---------------------------------------------------------------------------
// Starter guild + stock refresh
// ---------------------------------------------------------------------------

/** Builds the same starter guild the client used to generate locally. */
export function createStarterGuild(): GuildState {
  const baseWarrior = generateRandomHero(1);
  baseWarrior.heroClass = 'Warrior';
  baseWarrior.name = 'Sigurd Ironfist';
  baseWarrior.traits = ['Brave (+15% Attack in combat)'];
  baseWarrior.portraitSeed = 'Sigurd_Warrior';

  const baseRogue = generateRandomHero(1);
  baseRogue.heroClass = 'Rogue';
  baseRogue.name = 'Lyra Shadowstep';
  baseRogue.traits = ['Agile (+20% Speed)'];
  baseRogue.portraitSeed = 'Lyra_Rogue';

  const baseMage = generateRandomHero(1);
  baseMage.heroClass = 'Mage';
  baseMage.name = 'Kaeleen Sunstrider';
  baseMage.traits = ['Reckless (+30% Attack, -20% Defense)'];
  baseMage.portraitSeed = 'Kaeleen_Mage';

  const baseCleric = generateRandomHero(1);
  baseCleric.heroClass = 'Cleric';
  baseCleric.name = 'Sariel Lightbringer';
  baseCleric.traits = ['Sturdy (+15% Defense in combat)'];
  baseCleric.portraitSeed = 'Sariel_Cleric';

  const starterSword: Equipment = {
    id: generateId(),
    name: 'Iron Broadsword',
    type: 'mainHand',
    rarity: 'common',
    modifiers: { attack: 5 },
    price: 80,
    description: 'Solid forged steel. Heavy and dependable.'
  };

  const starterVest: Equipment = {
    id: generateId(),
    name: 'Worn Leather Vest',
    type: 'chest',
    rarity: 'common',
    modifiers: { defense: 2, speed: 1 },
    price: 40,
    description: 'Smells of wet dog and old sweat, but protects against light scrapes.'
  };

  return {
    name: 'Gilded Crest Guild',
    level: 1,
    gold: 400,
    roster: [baseWarrior, baseRogue, baseMage, baseCleric],
    inventory: [starterSword, starterVest],
    relics: [],
    recruitStock: [generateRandomHero(1), generateRandomHero(1), generateRandomHero(2)],
    shopStock: [generateRandomEquipment(1), generateRandomEquipment(1), generateRandomEquipment(2)],
    upgrades: {
      maxRoster: 6,
      recruitQuality: 1,
      shopQuality: 1,
      healerStation: 1
    }
  };
}

/** Re-rolls the recruiter and marketplace stock, scaled to the guild's level. */
export function refreshStocks(guild: GuildState): GuildState {
  const guildLevel = guild.level;
  return {
    ...guild,
    recruitStock: [
      generateRandomHero(Math.max(1, Math.round(guildLevel * 0.7 + Math.random()))),
      generateRandomHero(Math.max(1, Math.round(guildLevel * 0.7 + Math.random()))),
      generateRandomHero(Math.max(1, Math.round(guildLevel * 0.8 + Math.random())))
    ],
    shopStock: [
      generateRandomEquipment(guildLevel),
      generateRandomEquipment(guildLevel),
      generateRandomEquipment(guildLevel + 1)
    ]
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function applyGameAction(state: GameSnapshot, action: GameAction): GameSnapshot {
  // Resolve free Sanctuary revives before any player intent so costs/status are current.
  const resolved = resolveSanctuary(state);
  const { guild, expedition } = resolved;

  switch (action.type) {
    case 'renameGuild':
      return handleRenameGuild(guild, expedition, action);
    case 'recruitHero':
      return handleRecruitHero(guild, expedition, action);
    case 'dismissHero':
      return handleDismissHero(guild, expedition, action);
    case 'buyEquipment':
      return handleBuyEquipment(guild, expedition, action);
    case 'sellEquipment':
      return handleSellEquipment(guild, expedition, action);
    case 'equipItem':
      return handleEquipItem(guild, expedition, action);
    case 'unequipItem':
      return handleUnequipItem(guild, expedition, action);
    case 'upgradeBuilding':
      return handleUpgradeBuilding(guild, expedition, action);
    case 'healHero':
      return handleHealHero(guild, expedition, action);
    case 'reviveHero':
      return handleReviveHero(guild, expedition, action);
    case 'startExpedition':
      return handleStartExpedition(guild, expedition, action);
    case 'retreatExpedition':
      return handleRetreatExpedition(guild, expedition);
    case 'setExpeditionSpeed':
      return handleSetExpeditionSpeed(guild, expedition, action);
    case 'proceedToNextRoom':
    case 'claimTreasureAndProceed':
      return handleProceedToNextRoom(guild, expedition);
    case 'advanceCombat':
      return handleAdvanceCombat(guild, expedition);
    case 'submitCombatAction':
      return handleSubmitCombatAction(guild, expedition, action.action, action.targetId);
    case 'setCombatMode':
      return handleSetCombatMode(guild, expedition, action.mode);
    case 'makeEventChoice':
      return handleMakeEventChoice(guild, expedition, action);
    case 'handleCampfireChoice':
      return handleCampfireChoiceAction(guild, expedition, action);
    case 'handleTrapChoice':
      return handleTrapChoiceAction(guild, expedition, action);
    case 'buyMerchantItem':
      return handleBuyMerchantItem(guild, expedition, action);
    default: {
      const exhaustiveCheck: never = action;
      throw new GameActionError(`Unknown action type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Guild management
// ---------------------------------------------------------------------------

function handleRenameGuild(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'renameGuild'>): GameSnapshot {
  const name = action.name.trim();
  if (!name) throw new GameActionError('Guild name cannot be empty.');
  return { guild: { ...guild, name }, expedition };
}

function handleRecruitHero(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'recruitHero'>): GameSnapshot {
  const candidate = guild.recruitStock.find((h) => h.id === action.heroId);
  if (!candidate) throw new GameActionError('Recruit not found.', 404);

  const cost = candidate.level * 100;
  if (guild.gold < cost) throw new GameActionError('Not enough gold to recruit this hero.');
  if (guild.roster.length >= guild.upgrades.maxRoster) {
    throw new GameActionError('Your roster is full. Upgrade Max Roster to recruit more heroes.');
  }

  return {
    guild: {
      ...guild,
      gold: guild.gold - cost,
      roster: [...guild.roster, { ...candidate, status: 'Idle' }],
      recruitStock: guild.recruitStock.filter((h) => h.id !== action.heroId)
    },
    expedition
  };
}

function handleDismissHero(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'dismissHero'>): GameSnapshot {
  const hero = guild.roster.find((h) => h.id === action.heroId);
  if (!hero) throw new GameActionError('Hero not found.', 404);
  if (hero.status === 'Expedition') throw new GameActionError('Cannot dismiss a hero currently on an expedition.');

  const itemsToReturn: Equipment[] = EQUIP_SLOTS.map((slot) => hero.equipment[slot]).filter(
    (item): item is Equipment => Boolean(item)
  );

  return {
    guild: {
      ...guild,
      roster: guild.roster.filter((h) => h.id !== action.heroId),
      inventory: [...guild.inventory, ...itemsToReturn]
    },
    expedition
  };
}

function handleBuyEquipment(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'buyEquipment'>): GameSnapshot {
  const item = guild.shopStock.find((i) => i.id === action.itemId);
  if (!item) throw new GameActionError('Item not found in the shop.', 404);
  if (guild.gold < item.price) throw new GameActionError('Not enough gold to buy this item.');

  return {
    guild: {
      ...guild,
      gold: guild.gold - item.price,
      inventory: [...guild.inventory, item],
      shopStock: guild.shopStock.filter((i) => i.id !== action.itemId)
    },
    expedition
  };
}

function handleSellEquipment(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'sellEquipment'>): GameSnapshot {
  const item = guild.inventory.find((i) => i.id === action.itemId);
  if (!item) throw new GameActionError('Item not found in your inventory.', 404);

  const sellValue = Math.round(item.price * 0.4);

  return {
    guild: {
      ...guild,
      gold: guild.gold + sellValue,
      inventory: guild.inventory.filter((i) => i.id !== action.itemId)
    },
    expedition
  };
}

function handleEquipItem(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'equipItem'>): GameSnapshot {
  const hIndex = guild.roster.findIndex((h) => h.id === action.heroId);
  if (hIndex === -1) throw new GameActionError('Hero not found.', 404);

  const hero = guild.roster[hIndex];
  if (hero.status === 'Expedition') throw new GameActionError('Cannot change equipment while this hero is on an expedition.');

  const itemIndex = guild.inventory.findIndex((i) => i.id === action.itemId);
  if (itemIndex === -1) throw new GameActionError('Item not found in your inventory.', 404);

  const item = guild.inventory[itemIndex];
  if (item.type !== action.slot) {
    throw new GameActionError(`"${item.name}" cannot be equipped in the ${action.slot} slot.`);
  }

  const returnedItems: Equipment[] = [];
  const currentItem = hero.equipment[action.slot];
  if (currentItem) returnedItems.push(currentItem);

  const updatedHero: Hero = { ...hero, equipment: { ...hero.equipment, [action.slot]: item } };
  const roster = [...guild.roster];
  roster[hIndex] = updatedHero;

  const updatedInventory = guild.inventory.filter((_, idx) => idx !== itemIndex);

  return {
    guild: { ...guild, roster, inventory: [...updatedInventory, ...returnedItems] },
    expedition
  };
}

function handleUnequipItem(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'unequipItem'>): GameSnapshot {
  const hIndex = guild.roster.findIndex((h) => h.id === action.heroId);
  if (hIndex === -1) throw new GameActionError('Hero not found.', 404);

  const hero = guild.roster[hIndex];
  if (hero.status === 'Expedition') throw new GameActionError('Cannot change equipment while this hero is on an expedition.');

  const item = hero.equipment[action.slot];
  if (!item) throw new GameActionError(`No item is equipped in the ${action.slot} slot.`);

  const updatedHero: Hero = { ...hero, equipment: { ...hero.equipment, [action.slot]: null } };
  const roster = [...guild.roster];
  roster[hIndex] = updatedHero;

  return {
    guild: { ...guild, roster, inventory: [...guild.inventory, item] },
    expedition
  };
}

const UPGRADE_COST_TABLE: Record<keyof GuildState['upgrades'], number[]> = {
  maxRoster: [150, 300, 500, 800, 1200], // 6 -> 8 -> 10 -> 12 -> 14
  recruitQuality: [200, 450, 800, 1500], // 1 -> 2 -> 3 -> 4 -> 5
  shopQuality: [250, 500, 900, 1600], // 1 -> 2 -> 3 -> 4 -> 5
  healerStation: [100, 250, 600, 1100] // 1 -> 2 -> 3 -> 4 -> 5
};

function handleUpgradeBuilding(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'upgradeBuilding'>
): GameSnapshot {
  const currentValue = guild.upgrades[action.key];
  const tierIndex = action.key === 'maxRoster' ? Math.round((currentValue - 6) / 2) : currentValue - 1;
  const cost = UPGRADE_COST_TABLE[action.key][tierIndex];

  if (!cost) throw new GameActionError('This upgrade is already at its maximum tier.');
  if (guild.gold < cost) throw new GameActionError('Not enough gold for this upgrade.');

  const nextUpgrades = { ...guild.upgrades };
  if (action.key === 'maxRoster') {
    nextUpgrades.maxRoster += 2;
  } else {
    nextUpgrades[action.key] += 1;
  }

  const upgradeSum = nextUpgrades.recruitQuality + nextUpgrades.shopQuality + nextUpgrades.healerStation;
  const nextGuildLevel = Math.max(guild.level, Math.floor(upgradeSum / 2) + 1);

  return {
    guild: { ...guild, level: nextGuildLevel, gold: guild.gold - cost, upgrades: nextUpgrades },
    expedition
  };
}

function handleHealHero(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'healHero'>): GameSnapshot {
  const hero = guild.roster.find((h) => h.id === action.heroId);
  if (!hero) throw new GameActionError('Hero not found.', 404);
  if (hero.status === 'Expedition') throw new GameActionError('Cannot heal a hero currently on an expedition.');
  if (hero.status === 'Dead') throw new GameActionError('Fallen heroes must be revived, not healed.');

  const cost = getHealCost(hero, guild.upgrades.healerStation);
  if (guild.gold < cost) throw new GameActionError('Not enough gold to heal this hero.');

  const roster = guild.roster.map((h) =>
    h.id === action.heroId ? { ...h, hp: h.maxHp, morale: 100, diedAt: null } : h
  );

  return { guild: { ...guild, gold: guild.gold - cost, roster }, expedition };
}

function handleReviveHero(guild: GuildState, expedition: ExpeditionState | null, action: ActionOf<'reviveHero'>): GameSnapshot {
  const hero = guild.roster.find((h) => h.id === action.heroId);
  if (!hero) throw new GameActionError('Hero not found.', 404);
  if (hero.status !== 'Dead') throw new GameActionError('This hero is not dead.');

  const reviveCost = getInstantReviveCost(hero, guild.upgrades.healerStation);
  if (guild.gold < reviveCost) throw new GameActionError('Not enough gold to revive this hero.');

  const roster = guild.roster.map((h) =>
    h.id === action.heroId
      ? { ...h, status: 'Idle' as const, hp: Math.round(h.maxHp * 0.4), morale: 40, diedAt: null }
      : h
  );

  return { guild: { ...guild, gold: guild.gold - reviveCost, roster }, expedition };
}

// ---------------------------------------------------------------------------
// Expedition lifecycle
// ---------------------------------------------------------------------------

function getActiveRoom(expedition: ExpeditionState): DungeonRoom {
  try {
    return resolveActiveRoom(expedition);
  } catch {
    throw new GameActionError('Active room data is missing for this expedition.', 500);
  }
}

function handleStartExpedition(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'startExpedition'>
): GameSnapshot {
  if (expedition && !TERMINAL_EXPEDITION_STATUSES.includes(expedition.status)) {
    throw new GameActionError('An expedition is already in progress.');
  }

  // Never trust client-supplied dungeon stats — always resolve from the server catalog.
  const template = DUNGEON_TEMPLATES.find((d) => d.id === action.dungeonId);
  if (!template) throw new GameActionError('Unknown dungeon.', 404);

  if (!action.partyHeroIds || action.partyHeroIds.length === 0) {
    throw new GameActionError('Select at least one hero for the expedition.');
  }

  const party = guild.roster.filter((h) => action.partyHeroIds.includes(h.id));
  if (party.length !== action.partyHeroIds.length) {
    throw new GameActionError('One or more selected heroes were not found in your roster.', 404);
  }

  const unavailableHero = party.find((h) => h.status !== 'Idle');
  if (unavailableHero) {
    throw new GameActionError(`${unavailableHero.name} is not available for an expedition right now.`);
  }

  const expeditionParty = party.map((h) => ({ ...h, status: 'Expedition' as const }));
  const { rooms, map } = generateDungeonLayout(template.totalRooms, template.dangerRating);
  const configuredDungeon: Dungeon = { ...template, rooms, map };

  const firstLog: CombatLog = {
    id: generateId(),
    text: `🏰 The Guild starts an expedition into "${template.name}" with a party of ${expeditionParty.length} heroes!`,
    type: 'info',
    timestamp: Date.now()
  };

  const merchantItemsStock = [
    generateRandomEquipment(template.dangerRating),
    generateRandomEquipment(template.dangerRating + 1),
    generateRandomEquipment(template.dangerRating + 2)
  ];

  const newExpedition: ExpeditionState = {
    dungeon: configuredDungeon,
    party: expeditionParty,
    currentRoomIndex: 0,
    currentNodeId: map.startNodeId,
    status: 'room_active',
    logs: [firstLog],
    goldEarned: 0,
    lootEarned: { equipment: [], relics: [] },
    speed: 1,
    combatRound: 1,
    activeTurn: 'hero',
    activeRoomChoiceMade: false,
    merchantItemsStock,
    combat: null,
  };

  const roster = guild.roster.map((h) =>
    action.partyHeroIds.includes(h.id) ? { ...h, status: 'Expedition' as const } : h
  );

  const guildWithRoster = { ...guild, roster };
  return {
    guild: guildWithRoster,
    expedition: prepareRoomCombat(guildWithRoster, newExpedition),
  };
}

function handleRetreatExpedition(guild: GuildState, expedition: ExpeditionState | null): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  if (TERMINAL_EXPEDITION_STATUSES.includes(expedition.status)) {
    throw new GameActionError('This expedition has already ended.');
  }

  const now = Date.now();
  const survivors = expedition.party.map((h) => {
    const isDead = h.hp <= 0;
    if (isDead) {
      return markHeroDead(h, { morale: Math.max(10, Math.round(h.morale * 0.5)) }, now);
    }
    return {
      ...h,
      status: 'Idle' as const,
      morale: Math.max(10, Math.round(h.morale * 0.5)),
      diedAt: null,
    };
  });

  const roster = guild.roster.map((h) => survivors.find((s) => s.id === h.id) ?? h);
  const splitGold = Math.round(expedition.goldEarned * 0.5);

  const nextGuild: GuildState = {
    ...guild,
    gold: guild.gold + splitGold,
    roster,
    inventory: [...guild.inventory, ...expedition.lootEarned.equipment]
  };

  return { guild: nextGuild, expedition: { ...expedition, status: 'retreat' } };
}

function handleSetExpeditionSpeed(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'setExpeditionSpeed'>
): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  return { guild, expedition: { ...expedition, speed: action.speed } };
}

/** Claims an unclaimed Treasure room's loot into the expedition's ledger. */
function claimTreasureIfAny(expedition: ExpeditionState, roomIndex: number): ExpeditionState {
  const rooms = expedition.dungeon.rooms ?? [];
  const room = rooms[roomIndex];
  if (!room || room.type !== 'Treasure' || !room.treasureLoot) return expedition;

  const loot = room.treasureLoot;
  const claimLog: CombatLog = {
    id: generateId(),
    text: `💰 Looted the vault: +${loot.gold} Gold${loot.equipment ? `, and [${loot.equipment.name}]` : ''}${
      loot.relic ? `, and relic [${loot.relic.name}]` : ''
    }!`,
    type: 'victory',
    timestamp: Date.now()
  };

  const nextRooms = rooms.map((r, i) => (i === roomIndex ? { ...r, treasureLoot: undefined } : r));

  return {
    ...expedition,
    dungeon: ensureDungeonMap({ ...expedition.dungeon, rooms: nextRooms }),
    goldEarned: expedition.goldEarned + loot.gold,
    lootEarned: {
      equipment: loot.equipment ? [...expedition.lootEarned.equipment, loot.equipment] : expedition.lootEarned.equipment,
      relics: loot.relic ? [...expedition.lootEarned.relics, loot.relic] : expedition.lootEarned.relics
    },
    logs: [...expedition.logs, claimLog]
  };
}

function handleProceedToNextRoom(guild: GuildState, expedition: ExpeditionState | null): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  if (expedition.status !== 'room_active') throw new GameActionError('Cannot proceed to the next room right now.');

  const activeRoom = getActiveRoom(expedition);
  const needsChoiceFirst = COMBAT_ROOM_TYPES.includes(activeRoom.type) || CHOICE_ROOM_TYPES.includes(activeRoom.type);
  if (needsChoiceFirst && !expedition.activeRoomChoiceMade) {
    throw new GameActionError('You must resolve this room before proceeding.');
  }

  const activeIndex = resolveActiveRoomIndex(expedition);
  // Treasure rooms auto-claim their loot on proceed (Merchant/other room types have nothing to claim).
  const workingExpedition = claimTreasureIfAny(expedition, activeIndex);

  const dungeon = ensureDungeonMap(workingExpedition.dungeon);
  const map = dungeon.map;
  const currentNodeId = resolveCurrentNodeId({ ...workingExpedition, dungeon });

  if (map && currentNodeId) {
    const nextNodeId = getNextNodeId(map, currentNodeId);
    if (!nextNodeId) {
      return settleExpeditionVictory(guild, workingExpedition, activeIndex + 1);
    }
    return advanceToNode(guild, { ...workingExpedition, dungeon }, nextNodeId);
  }

  // Legacy fallback: pure index walk
  const nextIndex = workingExpedition.currentRoomIndex + 1;
  const roomCount = workingExpedition.dungeon.rooms?.length ?? 0;
  const isFinished = nextIndex >= roomCount;

  return isFinished
    ? settleExpeditionVictory(guild, workingExpedition, nextIndex)
    : advanceToRoom(guild, workingExpedition, nextIndex);
}

function settleExpeditionVictory(guild: GuildState, expedition: ExpeditionState, nextIndex: number): GameSnapshot {
  const now = Date.now();
  const finishedParty = expedition.party.map((h) => {
    if (h.hp <= 0) return markHeroDead(h, {}, now);

    const guildExpBonus = guild.relics.find((r) => r.modifierType === 'exp_bonus')?.modifierValue || 0;
    const totalExpEarned = Math.round(75 * expedition.dungeon.dangerRating * (1 + guildExpBonus));
    let nextExp = h.experience + totalExpEarned;
    let nextLevel = h.level;
    let nextExpNeeded = h.expNeeded;

    if (nextExp >= h.expNeeded) {
      nextLevel += 1;
      nextExp -= h.expNeeded;
      nextExpNeeded = nextLevel * 100;
    }

    return {
      ...h,
      status: 'Idle' as const,
      level: nextLevel,
      experience: nextExp,
      expNeeded: nextExpNeeded,
      morale: Math.min(100, h.morale + 15),
      diedAt: null,
    };
  });

  const potentialRelic = RELICS_POOL[expedition.dungeon.dangerRating - 1];
  const hasRelicAlready = potentialRelic ? guild.relics.some((r) => r.id === potentialRelic.id) : true;
  const nextRelics = [...guild.relics];
  if (potentialRelic && !hasRelicAlready) nextRelics.push(potentialRelic);

  const roster = guild.roster.map((h) => finishedParty.find((f) => f.id === h.id) ?? h);

  const relicGoldBonus = guild.relics.find((r) => r.modifierType === 'gold_bonus')?.modifierValue || 0;
  const finalGold = Math.round(expedition.goldEarned * (1 + relicGoldBonus));

  const settledGuild = refreshStocks({
    ...guild,
    gold: guild.gold + finalGold,
    roster,
    relics: nextRelics,
    inventory: [...guild.inventory, ...expedition.lootEarned.equipment]
  });

  const settledExpedition: ExpeditionState = {
    ...expedition,
    status: 'victory',
    currentRoomIndex: nextIndex,
    logs: [
      ...expedition.logs,
      {
        id: generateId(),
        text: `🏆 Expedition Victory! The guild conquered "${expedition.dungeon.name}"! Survivors returned with items and level ups.`,
        type: 'victory',
        timestamp: Date.now()
      }
    ]
  };

  return { guild: settledGuild, expedition: settledExpedition };
}

function advanceToNode(guild: GuildState, expedition: ExpeditionState, nextNodeId: string): GameSnapshot {
  let progressed: ReturnType<typeof advanceAlongPath>;
  try {
    progressed = advanceAlongPath(expedition, nextNodeId);
  } catch {
    throw new GameActionError('Unable to advance to the next room.', 500);
  }

  const nextRoomObj = (progressed.dungeon.rooms ?? [])[progressed.currentRoomIndex];
  if (!nextRoomObj) throw new GameActionError('Unable to advance to the next room.', 500);

  const transitionLog: CombatLog = {
    id: generateId(),
    text: `🚶 Party enters "${nextRoomObj.name}": ${nextRoomObj.description}`,
    type: 'info',
    timestamp: Date.now()
  };

  const merchantStock = [
    generateRandomEquipment(expedition.dungeon.dangerRating),
    generateRandomEquipment(expedition.dungeon.dangerRating + 1),
    generateRandomEquipment(expedition.dungeon.dangerRating + 2)
  ];

  const nextExpedition: ExpeditionState = {
    ...expedition,
    ...progressed,
    status: 'room_active',
    logs: [...expedition.logs, transitionLog],
    combatRound: 1,
    activeRoomChoiceMade: false,
    selectedEventOutcomeText: undefined,
    merchantItemsStock: merchantStock,
    combat: null,
  };

  return { guild, expedition: prepareRoomCombat(guild, nextExpedition) };
}

function advanceToRoom(guild: GuildState, expedition: ExpeditionState, nextIndex: number): GameSnapshot {
  const dungeon = ensureDungeonMap(expedition.dungeon);
  const map = dungeon.map;
  const nextNode = map?.nodes.find((n) => {
    const room = (dungeon.rooms ?? [])[nextIndex];
    return room && n.roomId === room.id;
  });
  if (nextNode) {
    return advanceToNode(guild, { ...expedition, dungeon }, nextNode.id);
  }

  const currentRooms = dungeon.rooms ?? [];
  const nextRooms = currentRooms.map((r, i) => {
    if (i === expedition.currentRoomIndex) return { ...r, status: 'cleared' as const };
    if (i === nextIndex) return { ...r, status: 'active' as const };
    return r;
  });

  const nextRoomObj = nextRooms[nextIndex];
  if (!nextRoomObj) throw new GameActionError('Unable to advance to the next room.', 500);

  const transitionLog: CombatLog = {
    id: generateId(),
    text: `🚶 Party enters "${nextRoomObj.name}": ${nextRoomObj.description}`,
    type: 'info',
    timestamp: Date.now()
  };

  const merchantStock = [
    generateRandomEquipment(expedition.dungeon.dangerRating),
    generateRandomEquipment(expedition.dungeon.dangerRating + 1),
    generateRandomEquipment(expedition.dungeon.dangerRating + 2)
  ];

  const nextExpedition: ExpeditionState = {
    ...expedition,
    dungeon: { ...dungeon, rooms: nextRooms },
    currentRoomIndex: nextIndex,
    currentNodeId: undefined,
    status: 'room_active',
    logs: [...expedition.logs, transitionLog],
    combatRound: 1,
    activeRoomChoiceMade: false,
    selectedEventOutcomeText: undefined,
    merchantItemsStock: merchantStock,
    combat: null,
  };

  return { guild, expedition: prepareRoomCombat(guild, nextExpedition) };
}

// ---------------------------------------------------------------------------
// Combat settlements (used by turn-based combat module)
// ---------------------------------------------------------------------------

function settleExpeditionDefeat(guild: GuildState, expedition: ExpeditionState): GameSnapshot {
  const now = Date.now();
  const faintedHeroes = expedition.party.map((h) => markHeroDead(h, { morale: 20 }, now));
  const roster = guild.roster.map((h) => faintedHeroes.find((f) => f.id === h.id) ?? h);
  const settledGuild = refreshStocks({ ...guild, roster });

  const settledExpedition: ExpeditionState = {
    ...expedition,
    status: 'defeat',
    combat: null,
    logs: [
      ...expedition.logs,
      {
        id: generateId(),
        text: '💀 TACTICAL WIPE! All active heroes fell. The caravan dragged them back unconscious to the Guild Sanctuary.',
        type: 'defeat',
        timestamp: Date.now()
      }
    ]
  };

  return { guild: settledGuild, expedition: settledExpedition };
}

function settleRoomCleared(guild: GuildState, expedition: ExpeditionState, currentRoom: DungeonRoom): GameSnapshot {
  const isBoss = currentRoom.type === 'Boss';

  let roomGold = Math.round((40 + Math.random() * 50) * expedition.dungeon.dangerRating);
  if (currentRoom.type === 'Elite Monster') roomGold = Math.round(roomGold * 2);
  if (isBoss) roomGold = Math.round(roomGold * 3.5);

  const itemsEarned: Equipment[] = [];
  const dropRoll = Math.random();
  if (isBoss) {
    itemsEarned.push(generateRandomEquipment(Math.max(3, expedition.dungeon.dangerRating + 1)));
  } else if (currentRoom.type === 'Elite Monster' || dropRoll > 0.65) {
    itemsEarned.push(generateRandomEquipment(expedition.dungeon.dangerRating));
  }

  const tiredParty = expedition.party.map((h) => {
    if (h.hp <= 0) return h;
    const fatigueReduction = guild.relics.find((r) => r.modifierType === 'morale_bonus') ? 2 : 4;
    return { ...h, morale: Math.max(10, h.morale - fatigueReduction) };
  });

  const clearedLog: CombatLog = {
    id: generateId(),
    text: `⚔️ Victory! Gained ${roomGold} Gold${itemsEarned.length > 0 ? `, and item: [${itemsEarned[0].name}]` : ''}!`,
    type: 'victory',
    timestamp: Date.now()
  };

  const nextExpedition: ExpeditionState = {
    ...expedition,
    status: 'room_active',
    party: tiredParty,
    goldEarned: expedition.goldEarned + roomGold,
    lootEarned: {
      ...expedition.lootEarned,
      equipment: [...expedition.lootEarned.equipment, ...itemsEarned]
    },
    activeRoomChoiceMade: true,
    combat: null,
    logs: [...expedition.logs, clearedLog]
  };

  return { guild, expedition: nextExpedition };
}

bindCombatSettlers({
  settleDefeat: settleExpeditionDefeat,
  settleClear: (g, e) => {
    try {
      const room = resolveActiveRoom(e);
      return settleRoomCleared(g, e, room);
    } catch {
      return { guild: g, expedition: { ...e, combat: null } };
    }
  },
});

// ---------------------------------------------------------------------------
// Non-combat room resolutions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Non-combat room resolutions
// ---------------------------------------------------------------------------

function handleMakeEventChoice(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'makeEventChoice'>
): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  if (expedition.status !== 'room_active') throw new GameActionError('Cannot resolve this event right now.');
  if (expedition.activeRoomChoiceMade) throw new GameActionError('This event has already been resolved.');

  const activeRoom = getActiveRoom(expedition);
  if (activeRoom.type !== 'Mystery Event' || !activeRoom.mysteryEvent) {
    throw new GameActionError('There is no mystery event to resolve in this room.');
  }

  const choice = activeRoom.mysteryEvent.choices[action.choiceIndex];
  if (!choice) throw new GameActionError('Invalid event choice.', 404);

  if (choice.requirements?.gold && guild.gold < choice.requirements.gold) {
    throw new GameActionError('You do not meet the gold requirement for this choice.');
  }
  if (choice.requirements?.minLevel && !expedition.party.some((h) => h.level >= choice.requirements!.minLevel!)) {
    throw new GameActionError('No hero in your party meets the level requirement for this choice.');
  }

  const roll = Math.random();
  let accumulatedProb = 0;
  let selectedOutcome: EventOutcome = choice.outcomes[0];

  for (const outcome of choice.outcomes) {
    accumulatedProb += outcome.probability;
    if (roll <= accumulatedProb) {
      selectedOutcome = outcome;
      break;
    }
  }

  const logs: CombatLog[] = [
    { id: generateId(), text: `📜 Decided: "${choice.text}"`, type: 'info', timestamp: Date.now() },
    { id: generateId(), text: `Outcome: ${selectedOutcome.text}`, type: 'info', timestamp: Date.now() }
  ];

  const extraGold = selectedOutcome.effects.gold || 0;
  const itemDrops: Equipment[] = [];

  if (selectedOutcome.effects.itemDrop) {
    const drop = generateRandomEquipment(expedition.dungeon.dangerRating);
    itemDrops.push(drop);
    logs.push({ id: generateId(), text: `💎 Found item: [${drop.name}]!`, type: 'victory', timestamp: Date.now() });
  }

  const updatedParty = expedition.party.map((h) => {
    if (h.hp <= 0) return h;

    const modStats = getModifiedStats(h, guild.relics);
    let hp = h.hp;
    if (selectedOutcome.effects.hpDamagePercent) {
      const damage = Math.round(modStats.maxHp * selectedOutcome.effects.hpDamagePercent);
      hp = Math.max(0, h.hp - damage);
      if (hp <= 0) {
        logs.push({
          id: generateId(),
          text: `🥀 ${h.name} suffered lethal injuries from the choice events!`,
          type: 'death',
          timestamp: Date.now()
        });
      }
    }

    let morale = h.morale;
    if (selectedOutcome.effects.moraleEffect) {
      morale = Math.max(10, Math.min(100, h.morale + selectedOutcome.effects.moraleEffect));
    }

    let exp = h.experience;
    let lvl = h.level;
    let expNeeded = h.expNeeded;
    if (selectedOutcome.effects.experienceBonus && hp > 0) {
      exp += selectedOutcome.effects.experienceBonus;
      if (exp >= expNeeded) {
        lvl += 1;
        exp -= expNeeded;
        expNeeded = lvl * 100;
        logs.push({ id: generateId(), text: `⭐ LEVEL UP! ${h.name} leveled up to Lvl ${lvl}!`, type: 'victory', timestamp: Date.now() });
      }
    }

    return { ...h, hp, morale, level: lvl, experience: exp, expNeeded };
  });

  const activeSurvivors = updatedParty.filter((h) => h.hp > 0);
  const hasWiped = activeSurvivors.length === 0;

  const nextExpedition: ExpeditionState = {
    ...expedition,
    party: updatedParty,
    goldEarned: expedition.goldEarned + extraGold,
    lootEarned: { ...expedition.lootEarned, equipment: [...expedition.lootEarned.equipment, ...itemDrops] },
    activeRoomChoiceMade: !hasWiped,
    selectedEventOutcomeText: selectedOutcome.text,
    logs: [...expedition.logs, ...logs],
    status: hasWiped ? 'defeat' : expedition.status
  };

  const nextGuild = hasWiped ? markPartyDead(guild, updatedParty) : guild;

  return { guild: nextGuild, expedition: nextExpedition };
}

function handleCampfireChoiceAction(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'handleCampfireChoice'>
): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  if (expedition.status !== 'room_active') throw new GameActionError('Cannot rest right now.');
  if (expedition.activeRoomChoiceMade) throw new GameActionError('This campfire has already been used.');

  const activeRoom = getActiveRoom(expedition);
  if (activeRoom.type !== 'Campfire') throw new GameActionError('There is no campfire in this room.');

  const logs: CombatLog[] = [];
  const cauldronBonus = guild.relics.some((r) => r.modifierType === 'heal_bonus') ? 1.5 : 1.0;

  const updatedParty = expedition.party.map((h) => {
    if (h.hp <= 0) return h;

    const modStats = getModifiedStats(h, guild.relics);

    if (action.option === 'heal') {
      const healAmt = Math.round(modStats.maxHp * 0.4 * cauldronBonus);
      return { ...h, hp: Math.min(modStats.maxHp, h.hp + healAmt) };
    }
    if (action.option === 'morale') {
      return { ...h, morale: Math.min(100, h.morale + 30) };
    }

    let nextExp = h.experience + 45;
    let nextLvl = h.level;
    let nextExpNeeded = h.expNeeded;
    if (nextExp >= h.expNeeded) {
      nextLvl += 1;
      nextExp -= h.expNeeded;
      nextExpNeeded = nextLvl * 100;
      logs.push({
        id: generateId(),
        text: `⭐ LEVEL UP! Training paid off! ${h.name} leveled up to Lvl ${nextLvl}!`,
        type: 'victory',
        timestamp: Date.now()
      });
    }
    return { ...h, experience: nextExp, level: nextLvl, expNeeded: nextExpNeeded };
  });

  let textMsg: string;
  if (action.option === 'heal') {
    textMsg = '🔥 Campfire: Party bandaged their wounds and restfully slept, restoring massive health.';
  } else if (action.option === 'morale') {
    textMsg = '🔥 Campfire: Plotted paths, polished iron gear, and shared epic tavern jokes. Party Morale restored!';
  } else {
    textMsg = '🔥 Campfire: Heroes held intense sparring sessions, gaining tactical training experience.';
  }

  logs.unshift({ id: generateId(), text: textMsg, type: 'heal', timestamp: Date.now() });

  const nextExpedition: ExpeditionState = {
    ...expedition,
    party: updatedParty,
    activeRoomChoiceMade: true,
    logs: [...expedition.logs, ...logs]
  };

  return { guild, expedition: nextExpedition };
}

function handleTrapChoiceAction(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'handleTrapChoice'>
): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  if (expedition.status !== 'room_active') throw new GameActionError('Cannot resolve this trap right now.');
  if (expedition.activeRoomChoiceMade) throw new GameActionError('This trap has already been resolved.');

  const activeRoom = getActiveRoom(expedition);
  if (activeRoom.type !== 'Trap') throw new GameActionError('There is no trap in this room.');

  const chosenHero = expedition.party.find((h) => h.id === action.heroId);
  if (!chosenHero) throw new GameActionError('Hero not found in the expedition party.', 404);
  if (chosenHero.hp <= 0) throw new GameActionError('This hero has fainted and cannot act.');

  const modStats = getModifiedStats(chosenHero, guild.relics);
  let successChance: number;

  if (action.method === 'speed') {
    successChance = Math.min(0.95, 0.35 + modStats.speed * 0.04);
  } else if (action.method === 'defense') {
    successChance = Math.min(0.9, 0.3 + modStats.defense * 0.04);
  } else {
    successChance = Math.min(0.95, 0.25 + modStats.luck * 0.05);
  }

  const isSuccess = Math.random() < successChance;
  const logs: CombatLog[] = [];
  let updatedParty = [...expedition.party];

  if (isSuccess) {
    logs.push({
      id: generateId(),
      text: `👍 DISARMED! ${chosenHero.name} successfully disarmed the traps safely using ${action.method.toUpperCase()} (Chance: ${Math.round(
        successChance * 100
      )}%)! Party gained +15 EXP.`,
      type: 'victory',
      timestamp: Date.now()
    });

    updatedParty = updatedParty.map((h) => {
      if (h.hp <= 0) return h;
      let exp = h.experience + 15;
      let lvl = h.level;
      let expNeeded = h.expNeeded;
      if (exp >= expNeeded) {
        lvl += 1;
        exp -= expNeeded;
        expNeeded = lvl * 100;
      }
      return { ...h, experience: exp, level: lvl, expNeeded };
    });
  } else {
    logs.push({
      id: generateId(),
      text: `💥 TRAP TRIGGERED! ${chosenHero.name} failed the ${action.method.toUpperCase()} trap bypass check (Chance: ${Math.round(
        successChance * 100
      )}%). Poison darts fired! Party took heavy damage.`,
      type: 'damage',
      timestamp: Date.now()
    });

    updatedParty = updatedParty.map((h) => {
      if (h.hp <= 0) return h;
      const modStatsH = getModifiedStats(h, guild.relics);
      const trapMult = h.heroClass === 'Warrior' ? 0.08 : 0.16;
      const damage = Math.round(modStatsH.maxHp * trapMult);
      const nextHp = Math.max(0, h.hp - damage);

      if (nextHp <= 0) {
        logs.push({ id: generateId(), text: `🥀 Trap was fatal! ${h.name} collapsed unconscious.`, type: 'death', timestamp: Date.now() });
      }

      return { ...h, hp: nextHp, morale: Math.max(10, h.morale - 12) };
    });
  }

  const aliveSurvivors = updatedParty.filter((h) => h.hp > 0);
  const hasWiped = aliveSurvivors.length === 0;

  const nextExpedition: ExpeditionState = {
    ...expedition,
    party: updatedParty,
    activeRoomChoiceMade: !hasWiped,
    logs: [...expedition.logs, ...logs],
    status: hasWiped ? 'defeat' : expedition.status
  };

  const nextGuild = hasWiped ? markPartyDead(guild, updatedParty) : guild;

  return { guild: nextGuild, expedition: nextExpedition };
}

function handleBuyMerchantItem(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: ActionOf<'buyMerchantItem'>
): GameSnapshot {
  if (!expedition) throw new GameActionError('No active expedition.');

  const activeRoom = getActiveRoom(expedition);
  if (activeRoom.type !== 'Merchant') throw new GameActionError('There is no merchant in this room.');

  const item = expedition.merchantItemsStock?.find((i) => i.id === action.itemId);
  if (!item) throw new GameActionError('Item not found in merchant stock.', 404);
  if (guild.gold < item.price) throw new GameActionError('Not enough gold to buy this item.');

  const nextGuild: GuildState = { ...guild, gold: guild.gold - item.price };
  const nextExpedition: ExpeditionState = {
    ...expedition,
    lootEarned: { ...expedition.lootEarned, equipment: [...expedition.lootEarned.equipment, item] },
    merchantItemsStock: expedition.merchantItemsStock?.filter((i) => i.id !== item.id),
    logs: [
      ...expedition.logs,
      { id: generateId(), text: `🛒 Purchased item [${item.name}] from merchant!`, type: 'info', timestamp: Date.now() }
    ]
  };

  return { guild: nextGuild, expedition: nextExpedition };
}

/** Marks every party member as `Dead` in the guild roster after a full wipe. */
function markPartyDead(guild: GuildState, party: Hero[]): GuildState {
  const now = Date.now();
  const roster = guild.roster.map((h) => {
    const finished = party.find((f) => f.id === h.id);
    return finished ? markHeroDead(finished, {}, now) : h;
  });
  return { ...guild, roster };
}
