/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Hero,
  Equipment,
  Relic,
  Dungeon,
  DungeonRoom,
  Monster,
  ExpeditionState,
  GuildState,
  CombatLog,
  HeroClass,
  EventChoice,
  EventOutcome
} from '../types';
import {
  generateId,
  generateRandomHero,
  generateRandomEquipment,
  generateDungeonRooms,
  getModifiedStats
} from '../utils';
import { DUNGEON_TEMPLATES, RELICS_POOL } from '../data';
import { fetchGameState, saveGameState } from '../api/client';

interface GameContextProps {
  guild: GuildState;
  expedition: ExpeditionState | null;
  activeScreen: 'guild' | 'expedition';
  activeTab: 'roster' | 'recruit' | 'armory' | 'upgrades';
  selectedHeroId: string | null;
  /** False until the initial load from the persistence API resolves. */
  hydrated: boolean;
  setGuild: React.Dispatch<React.SetStateAction<GuildState>>;
  setActiveScreen: (screen: 'guild' | 'expedition') => void;
  setActiveTab: (tab: 'roster' | 'recruit' | 'armory' | 'upgrades') => void;
  setSelectedHeroId: (id: string | null) => void;
  renameGuild: (newName: string) => void;
  recruitHero: (heroId: string) => void;
  dismissHero: (heroId: string) => void;
  buyEquipment: (itemId: string) => void;
  sellEquipment: (itemId: string) => void;
  equipItem: (heroId: string, itemId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  unequipItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  upgradeBuilding: (key: 'maxRoster' | 'recruitQuality' | 'shopQuality' | 'healerStation') => void;
  healHeroWithGold: (heroId: string) => void;
  reviveHero: (heroId: string) => void;
  startExpedition: (dungeon: Dungeon, partyHeroIds: string[]) => void;
  retreatExpedition: () => void;
  proceedToNextRoom: () => void;
  executeCombatRound: () => void;
  makeEventChoice: (choice: EventChoice) => void;
  handleCampfireChoice: (option: 'heal' | 'morale' | 'train') => void;
  handleTrapChoice: (heroId: string, method: 'speed' | 'defense' | 'luck') => void;
  buyMerchantItem: (item: Equipment) => void;
  setExpeditionSpeed: (speed: 1 | 2 | 3) => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- INITAL GUILD STATE ---
  const [guild, setGuild] = useState<GuildState>(() => {
    // Generate starter heroes: Warrior, Rogue, Mage, Cleric
    const baseWarrior = generateRandomHero(1);
    baseWarrior.heroClass = 'Warrior';
    baseWarrior.name = 'Alden Stormweaver';
    baseWarrior.traits = ['Brave (+15% Attack in combat)'];

    const baseRogue = generateRandomHero(1);
    baseRogue.heroClass = 'Rogue';
    baseRogue.name = 'Lyra Shadowstep';
    baseRogue.traits = ['Agile (+20% Speed)'];

    const baseMage = generateRandomHero(1);
    baseMage.heroClass = 'Mage';
    baseMage.name = 'Kaelen Sunstrider';
    baseMage.traits = ['Reckless (+30% Attack, -20% Defense)'];

    const baseCleric = generateRandomHero(1);
    baseCleric.heroClass = 'Cleric';
    baseCleric.name = 'Sariel Lightbringer';
    baseCleric.traits = ['Sturdy (+15% Defense in combat)'];

    const initialRoster = [baseWarrior, baseRogue, baseMage, baseCleric];

    // Starter inventory items
    const starterSword: Equipment = {
      id: generateId(),
      name: 'Iron Broadsword',
      type: 'weapon',
      rarity: 'common',
      modifiers: { attack: 5 },
      price: 80,
      description: 'Solid forged steel. Heavy and dependable.'
    };

    const starterVest: Equipment = {
      id: generateId(),
      name: 'Worn Leather Vest',
      type: 'armor',
      rarity: 'common',
      modifiers: { defense: 2, speed: 1 },
      price: 40,
      description: 'Smells of wet dog and old sweat, but protects against light scrapes.'
    };

    // Starter stock
    const recruits = [generateRandomHero(1), generateRandomHero(1), generateRandomHero(2)];
    const items = [generateRandomEquipment(1), generateRandomEquipment(1), generateRandomEquipment(2)];

    return {
      name: 'Gilded Crest Guild',
      level: 1,
      gold: 400,
      roster: initialRoster,
      inventory: [starterSword, starterVest],
      relics: [],
      recruitStock: recruits,
      shopStock: items,
      upgrades: {
        maxRoster: 6,
        recruitQuality: 1,
        shopQuality: 1,
        healerStation: 1
      }
    };
  });

  // --- EXPEDITION STATE ---
  const [expedition, setExpedition] = useState<ExpeditionState | null>(null);

  // --- ACTIVE SCREENS / TABS ---
  const [activeScreen, setActiveScreen] = useState<'guild' | 'expedition'>('guild');
  const [activeTab, setActiveTab] = useState<'roster' | 'recruit' | 'armory' | 'upgrades'>('roster');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  // --- PERSISTENCE (PostgreSQL via /api/state) ---
  // Until Better Auth exists we operate on a single default guild resolved by
  // the server; `guildId` is returned on load and echoed back on save.
  const [hydrated, setHydrated] = useState(false);
  const guildIdRef = useRef<string | null>(null);
  const didInitRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest state, kept in refs so the debounced saver reads current values.
  const guildRef = useRef(guild);
  const expeditionRef = useRef(expedition);
  guildRef.current = guild;
  expeditionRef.current = expedition;

  const flushSave = useCallback(() => {
    void saveGameState({
      guildId: guildIdRef.current,
      guild: guildRef.current,
      expedition: expeditionRef.current
    }).then((savedGuildId) => {
      if (savedGuildId) guildIdRef.current = savedGuildId;
    });
  }, []);

  // Load persisted state once on startup (or seed the DB with the generated
  // starter guild if this is a brand-new save).
  //
  // NOTE: we intentionally do NOT use a per-run `cancelled` flag here. In React
  // StrictMode the effect runs, is torn down, then runs again. Because
  // `didInitRef` (a persistent ref) already dedupes to a single execution, a
  // `cancelled` flag set by the first teardown would abort the only in-flight
  // load without ever re-issuing it — leaving `hydrated` false forever (the
  // infinite "Loading guild ledger…" screen). Instead the load runs exactly
  // once and ALWAYS resolves `hydrated` in `finally` so the app can never hang.
  useEffect(() => {
    if (didInitRef.current) return; // run once (also guards StrictMode double-invoke)
    didInitRef.current = true;

    (async () => {
      let seedFreshGuild = false;
      try {
        const loaded = await fetchGameState();

        if (loaded) {
          guildIdRef.current = loaded.guildId;
          if (loaded.guild) {
            // Existing save: hydrate from the database.
            setGuild(loaded.guild);
            setExpedition(loaded.expedition);
          } else {
            // New/unseeded guild: keep the generated starter state and persist
            // it once we've flipped `hydrated` on (see finally).
            seedFreshGuild = true;
          }
        }
        // `loaded === null` => persistence unavailable: keep the in-memory
        // starter state and carry on (fail soft).
      } catch (err) {
        // fetchGameState already fails soft, but guard against anything
        // unexpected so the loading gate can never hang.
        console.warn('[persistence] hydration failed; playing without saves.', err);
      } finally {
        // ALWAYS render the app, even if the API/DB is down or slow.
        setHydrated(true);
        if (seedFreshGuild) flushSave();
      }
    })();
  }, [flushSave]);

  // Debounced save on any meaningful state change (gold, roster, inventory,
  // relics, expedition progress). Debouncing coalesces rapid combat ticks.
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [guild, expedition, hydrated, flushSave]);

  // Best-effort flush when the tab is hidden or closed.
  useEffect(() => {
    if (!hydrated) return;
    const handler = () => flushSave();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hydrated, flushSave]);

  // Auto-refills recruiter and marketplace after expeditions or on custom triggers
  const refreshStocks = useCallback((guildLevel: number) => {
    setGuild((prev) => ({
      ...prev,
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
    }));
  }, []);

  // --- ACTIONS: GUILD MANAGEMENT ---
  const renameGuild = (newName: string) => {
    if (!newName.trim()) return;
    setGuild((prev) => ({ ...prev, name: newName.trim() }));
  };

  const recruitHero = (heroId: string) => {
    const candidate = guild.recruitStock.find((h) => h.id === heroId);
    if (!candidate) return;

    const cost = candidate.level * 100;
    if (guild.gold < cost) return;

    if (guild.roster.length >= guild.upgrades.maxRoster) return;

    setGuild((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      roster: [...prev.roster, { ...candidate, status: 'Idle' }],
      recruitStock: prev.recruitStock.filter((h) => h.id !== heroId)
    }));
  };

  const dismissHero = (heroId: string) => {
    setGuild((prev) => {
      const hero = prev.roster.find((h) => h.id === heroId);
      if (!hero || hero.status === 'Expedition') return prev;

      // Put equipped items back in inventory
      const itemsToReturn: Equipment[] = [];
      if (hero.equipment.weapon) itemsToReturn.push(hero.equipment.weapon);
      if (hero.equipment.armor) itemsToReturn.push(hero.equipment.armor);
      if (hero.equipment.accessory) itemsToReturn.push(hero.equipment.accessory);

      return {
        ...prev,
        roster: prev.roster.filter((h) => h.id !== heroId),
        inventory: [...prev.inventory, ...itemsToReturn]
      };
    });
  };

  const buyEquipment = (itemId: string) => {
    const item = guild.shopStock.find((i) => i.id === itemId);
    if (!item) return;

    if (guild.gold < item.price) return;

    setGuild((prev) => ({
      ...prev,
      gold: prev.gold - item.price,
      inventory: [...prev.inventory, item],
      shopStock: prev.shopStock.filter((i) => i.id !== itemId)
    }));
  };

  const sellEquipment = (itemId: string) => {
    const item = guild.inventory.find((i) => i.id === itemId);
    if (!item) return;

    const sellValue = Math.round(item.price * 0.4);

    setGuild((prev) => ({
      ...prev,
      gold: prev.gold + sellValue,
      inventory: prev.inventory.filter((i) => i.id !== itemId)
    }));
  };

  const equipItem = (heroId: string, itemId: string, slot: 'weapon' | 'armor' | 'accessory') => {
    setGuild((prev) => {
      const roster = [...prev.roster];
      const hIndex = roster.findIndex((h) => h.id === heroId);
      if (hIndex === -1 || roster[hIndex].status === 'Expedition') return prev;

      const itemIndex = prev.inventory.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) return prev;

      const item = prev.inventory[itemIndex];
      const hero = { ...roster[hIndex] };
      const equipment = { ...hero.equipment };

      // Unequip current item in that slot if it exists
      const returnedItems: Equipment[] = [];
      const currentItem = equipment[slot];
      if (currentItem) {
        returnedItems.push(currentItem);
      }

      // Set new item
      equipment[slot] = item;
      hero.equipment = equipment;
      roster[hIndex] = hero;

      // Filter the equipped item out of inventory, add the returned one back
      const updatedInventory = prev.inventory.filter((_, idx) => idx !== itemIndex);

      return {
        ...prev,
        roster,
        inventory: [...updatedInventory, ...returnedItems]
      };
    });
  };

  const unequipItem = (heroId: string, slot: 'weapon' | 'armor' | 'accessory') => {
    setGuild((prev) => {
      const roster = [...prev.roster];
      const hIndex = roster.findIndex((h) => h.id === heroId);
      if (hIndex === -1 || roster[hIndex].status === 'Expedition') return prev;

      const hero = { ...roster[hIndex] };
      const equipment = { ...hero.equipment };
      const item = equipment[slot];

      if (!item) return prev;

      equipment[slot] = null;
      hero.equipment = equipment;
      roster[hIndex] = hero;

      return {
        ...prev,
        roster,
        inventory: [...prev.inventory, item]
      };
    });
  };

  const upgradeBuilding = (key: 'maxRoster' | 'recruitQuality' | 'shopQuality' | 'healerStation') => {
    const costTable: Record<string, number[]> = {
      maxRoster: [150, 300, 500, 800, 1200], // upgrades 6 -> 8 -> 10 -> 12 -> 14
      recruitQuality: [200, 450, 800, 1500], // levels 1 -> 2 -> 3 -> 4 -> 5
      shopQuality: [250, 500, 900, 1600], // levels 1 -> 2 -> 3 -> 4 -> 5
      healerStation: [100, 250, 600, 1100] // levels 1 -> 2 -> 3 -> 4 -> 5
    };

    const currentValue = guild.upgrades[key];
    const tierIndex = key === 'maxRoster' ? Math.round((currentValue - 6) / 2) : currentValue - 1;
    const cost = costTable[key][tierIndex];

    if (!cost || guild.gold < cost) return;

    setGuild((prev) => {
      const nextUpgrades = { ...prev.upgrades };
      let nextGuildLevel = prev.level;

      if (key === 'maxRoster') {
        nextUpgrades.maxRoster += 2;
      } else {
        nextUpgrades[key] += 1;
      }

      // Automatically recalculate composite Guild Rank based on upgrades average
      const upgradeSum = nextUpgrades.recruitQuality + nextUpgrades.shopQuality + nextUpgrades.healerStation;
      nextGuildLevel = Math.max(prev.level, Math.floor(upgradeSum / 2) + 1);

      return {
        ...prev,
        level: nextGuildLevel,
        gold: prev.gold - cost,
        upgrades: nextUpgrades
      };
    });
  };

  const healHeroWithGold = (heroId: string) => {
    setGuild((prev) => {
      const roster = prev.roster.map((h) => {
        if (h.id === heroId && h.status !== 'Expedition') {
          return { ...h, hp: h.maxHp, morale: 100 };
        }
        return h;
      });

      // Cost to heal is proportional to damaged health points
      const hero = prev.roster.find((h) => h.id === heroId);
      if (!hero) return prev;
      const dmg = hero.maxHp - hero.hp;
      const cost = Math.max(15, Math.round(dmg * 0.35 + (100 - hero.morale) * 0.2));

      if (prev.gold < cost) return prev;

      return {
        ...prev,
        gold: prev.gold - cost,
        roster
      };
    });
  };

  const reviveHero = (heroId: string) => {
    setGuild((prev) => {
      const hero = prev.roster.find((h) => h.id === heroId);
      if (!hero || hero.status !== 'Dead') return prev;

      const reviveCost = Math.round(hero.level * 80 + 50);
      if (prev.gold < reviveCost) return prev;

      const roster = prev.roster.map((h) => {
        if (h.id === heroId) {
          return { ...h, status: 'Idle' as const, hp: Math.round(h.maxHp * 0.4), morale: 40 };
        }
        return h;
      });

      return {
        ...prev,
        gold: prev.gold - reviveCost,
        roster
      };
    });
  };

  // --- EXPEDITION ENGINE ACTION HANDLERS ---
  const startExpedition = (dungeon: Dungeon, partyHeroIds: string[]) => {
    // Collect full Hero data objects from roster, cloning them to avoid immediate state sync issues
    const expeditionParty = guild.roster
      .filter((h) => partyHeroIds.includes(h.id))
      .map((h) => ({ ...h, status: 'Expedition' as const }));

    if (expeditionParty.length === 0) return;

    // Generate fresh rooms map based on dungeon parameters
    const rooms = generateDungeonRooms(dungeon.totalRooms, dungeon.dangerRating);
    const configuredDungeon = { ...dungeon, rooms };

    const firstLog: CombatLog = {
      id: generateId(),
      text: `🏰 The Guild starts an expedition into "${dungeon.name}" with a party of ${expeditionParty.length} heroes!`,
      type: 'info',
      timestamp: Date.now()
    };

    // Set up merchant inventory in case there is a merchant room
    const merchantItemsStock = [
      generateRandomEquipment(dungeon.dangerRating),
      generateRandomEquipment(dungeon.dangerRating + 1),
      generateRandomEquipment(dungeon.dangerRating + 2)
    ];

    setExpedition({
      dungeon: configuredDungeon,
      party: expeditionParty,
      currentRoomIndex: 0,
      status: 'room_active',
      logs: [firstLog],
      goldEarned: 0,
      lootEarned: {
        equipment: [],
        relics: []
      },
      speed: 1,
      combatRound: 1,
      activeTurn: 'hero',
      activeRoomChoiceMade: false,
      merchantItemsStock
    });

    // Mark these heroes as 'Expedition' in the primary roster
    setGuild((prev) => ({
      ...prev,
      roster: prev.roster.map((h) =>
        partyHeroIds.includes(h.id) ? { ...h, status: 'Expedition' as const } : h
      )
    }));

    setActiveScreen('expedition');
  };

  // Retreat early from a dungeon run
  const retreatExpedition = () => {
    if (!expedition) return;

    // Return surviving heroes with fainted status to guild
    const survivors = expedition.party.map((h) => {
      const isDead = h.hp <= 0;
      return {
        ...h,
        status: isDead ? ('Dead' as const) : ('Idle' as const),
        hp: isDead ? 0 : h.hp,
        morale: Math.max(10, Math.round(h.morale * 0.5)) // hefty morale penalty for retreating
      };
    });

    setGuild((prev) => {
      // Merge survivors back into roster
      const roster = prev.roster.map((h) => {
        const matchingSurvivor = survivors.find((s) => s.id === h.id);
        return matchingSurvivor ? matchingSurvivor : h;
      });

      // Claim 50% of the gathered gold, throw items into storage
      const splitGold = Math.round(expedition.goldEarned * 0.5);

      return {
        ...prev,
        gold: prev.gold + splitGold,
        roster,
        inventory: [...prev.inventory, ...expedition.lootEarned.equipment]
      };
    });

    setExpedition((prev) => prev ? { ...prev, status: 'retreat' } : null);
  };

  const setExpeditionSpeed = (speed: 1 | 2 | 3) => {
    setExpedition((prev) => (prev ? { ...prev, speed } : null));
  };

  // Proceeds to the next room when active room is cleared
  const proceedToNextRoom = () => {
    if (!expedition) return;

    const nextIndex = expedition.currentRoomIndex + 1;
    const roomCount = expedition.dungeon.rooms?.length ?? 0;
    const isFinished = nextIndex >= roomCount;

    if (isFinished) {
      // expedition run is completed successfully!
      const finalExpendedParty = expedition.party.map((h) => {
        if (h.hp <= 0) {
          return { ...h, status: 'Dead' as const, hp: 0 };
        }

        // Add massive EXP bonus to survivors, level up if necessary
        const guildExpBonus = guild.relics.find((r) => r.modifierType === 'exp_bonus')?.modifierValue || 0;
        const totalExpEarned = Math.round((75 * expedition.dungeon.dangerRating) * (1 + guildExpBonus));
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
          morale: Math.min(100, h.morale + 15) // successful runs increase morale
        };
      });

      // See if a new Relic is earned (only if they cleared a high rating and don't already own it)
      const potentialRelic = RELICS_POOL[expedition.dungeon.dangerRating - 1];
      const hasRelicAlready = potentialRelic ? guild.relics.some((r) => r.id === potentialRelic.id) : true;
      const nextRelics = [...guild.relics];

      if (potentialRelic && !hasRelicAlready) {
        nextRelics.push(potentialRelic);
      }

      setGuild((prev) => {
        // Merge party stats
        const roster = prev.roster.map((h) => {
          const finishedHero = finalExpendedParty.find((f) => f.id === h.id);
          return finishedHero ? finishedHero : h;
        });

        // Add gold multipliers
        const relicGoldBonus = prev.relics.find((r) => r.modifierType === 'gold_bonus')?.modifierValue || 0;
        const finalGold = Math.round(expedition.goldEarned * (1 + relicGoldBonus));

        return {
          ...prev,
          gold: prev.gold + finalGold,
          roster,
          relics: nextRelics,
          inventory: [...prev.inventory, ...expedition.lootEarned.equipment]
        };
      });

      setExpedition((prev) =>
        prev
          ? {
              ...prev,
              status: 'victory',
              currentRoomIndex: nextIndex,
              logs: [
                ...prev.logs,
                {
                  id: generateId(),
                  text: `🏆 Expedition Victory! The guild conquered "${expedition.dungeon.name}"! Survivors returned with items and level ups.`,
                  type: 'victory',
                  timestamp: Date.now()
                }
              ]
            }
          : null
      );

      // Refresh recruiting and store inventories upon run completion
      refreshStocks(guild.level);
    } else {
      // Setup the next room
      setExpedition((prev) => {
        if (!prev) return null;

        const currentRooms = prev.dungeon.rooms ?? [];
        if (currentRooms.length === 0) return prev;

        const nextRooms = currentRooms.map((r, i) => {
          if (i === prev.currentRoomIndex) return { ...r, status: 'cleared' as const };
          if (i === nextIndex) return { ...r, status: 'active' as const };
          return r;
        });

        const nextRoomObj = nextRooms[nextIndex];
        if (!nextRoomObj) return prev;

        const transitionLog: CombatLog = {
          id: generateId(),
          text: `🚶 Party enters "${nextRoomObj.name}": ${nextRoomObj.description}`,
          type: 'info',
          timestamp: Date.now()
        };

        // Prepare merchant stock for this specific merchant room if active
        const merchantStock = [
          generateRandomEquipment(prev.dungeon.dangerRating),
          generateRandomEquipment(prev.dungeon.dangerRating + 1),
          generateRandomEquipment(prev.dungeon.dangerRating + 2)
        ];

        return {
          ...prev,
          dungeon: { ...prev.dungeon, rooms: nextRooms },
          currentRoomIndex: nextIndex,
          status: 'room_active',
          logs: [...prev.logs, transitionLog],
          combatRound: 1,
          activeRoomChoiceMade: false,
          selectedEventOutcomeText: undefined,
          merchantItemsStock: merchantStock
        };
      });
    }
  };

  // --- AUTOMATED COMBAT ENGINE ---
  const executeCombatRound = () => {
    if (!expedition) return;

    const rooms = expedition.dungeon.rooms ?? [];
    const activeRoom = rooms[expedition.currentRoomIndex];
    if (!activeRoom) return;

    if (
      activeRoom.type !== 'Monster' &&
      activeRoom.type !== 'Elite Monster' &&
      activeRoom.type !== 'Boss'
    )
      return;

    const monsters = activeRoom.monsterGroup;
    if (!monsters || monsters.length === 0) return;

    // Filter alive participants
    const aliveHeroes = expedition.party.filter((h) => h.hp > 0);
    const aliveMonsters = monsters.filter((m) => m.hp > 0);

    if (aliveHeroes.length === 0) {
      // Expedition Defeat
      const faintedHeroes = expedition.party.map((h) => ({
        ...h,
        status: 'Dead' as const, // fainted, requires guild rescue revive
        hp: 0,
        morale: 20
      }));

      setGuild((prev) => {
        const roster = prev.roster.map((h) => {
          const fainted = faintedHeroes.find((f) => f.id === h.id);
          return fainted ? fainted : h;
        });
        return { ...prev, roster };
      });

      setExpedition((prev) =>
        prev
          ? {
              ...prev,
              status: 'defeat',
              logs: [
                ...prev.logs,
                {
                  id: generateId(),
                  text: '💀 TACTICAL WIPE! All active heroes fell. The caravan dragged them back unconscious to the Guild Sanctuary.',
                  type: 'defeat',
                  timestamp: Date.now()
                }
              ]
            }
          : null
      );
      refreshStocks(guild.level);
      return;
    }

    if (aliveMonsters.length === 0) {
      // Room Cleared!
      const rooms = expedition.dungeon?.rooms;
      const currentRoom = rooms ? rooms[expedition.currentRoomIndex] : undefined;
      if (!currentRoom) return; // safety: no room data
      const isBoss = currentRoom.type === 'Boss';

      // Distribute rewards
      let roomGold = Math.round((40 + Math.random() * 50) * expedition.dungeon.dangerRating);
      if (currentRoom.type === 'Elite Monster') roomGold = Math.round(roomGold * 2);
      if (isBoss) roomGold = Math.round(roomGold * 3.5);

      const itemsEarned: Equipment[] = [];
      const dropRoll = Math.random();
      // Boss always drops Epic gear, Elites drop rare gear
      if (isBoss) {
        itemsEarned.push(generateRandomEquipment(Math.max(3, expedition.dungeon.dangerRating + 1)));
      } else if (currentRoom.type === 'Elite Monster' || dropRoll > 0.65) {
        itemsEarned.push(generateRandomEquipment(expedition.dungeon.dangerRating));
      }

      // Decrement survivors morale slightly from fatigue (-3 morale per combat)
      const tiredParty = expedition.party.map((h) => {
        if (h.hp <= 0) return h;
        const fatigueReduction = guild.relics.find((r) => r.modifierType === 'morale_bonus') ? 2 : 4;
        return { ...h, morale: Math.max(10, h.morale - fatigueReduction) };
      });

      const clearedLog: CombatLog = {
        id: generateId(),
        text: `⚔️ Victory! Gained ${roomGold} Gold${
          itemsEarned.length > 0 ? `, and item: [${itemsEarned[0].name}]` : ''
        }!`,
        type: 'victory',
        timestamp: Date.now()
      };

      setExpedition((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'room_active',
          party: tiredParty,
          goldEarned: prev.goldEarned + roomGold,
          lootEarned: {
            ...prev.lootEarned,
            equipment: [...prev.lootEarned.equipment, ...itemsEarned]
          },
          activeRoomChoiceMade: true, // lets the player proceed
          logs: [...prev.logs, clearedLog]
        };
      });
      return;
    }

    // Resolve active attacks!
    const combatLogs: CombatLog[] = [];
    const nextParty = [...expedition.party];
    const nextMonsters = [...monsters];

    // Combine and sort by speed
    interface SpeedTracker {
      type: 'hero' | 'monster';
      id: string;
      speed: number;
    }

    const participants: SpeedTracker[] = [];
    aliveHeroes.forEach((h) => {
      const stats = getModifiedStats(h, guild.relics);
      participants.push({ type: 'hero', id: h.id, speed: stats.speed });
    });
    aliveMonsters.forEach((m, idx) => {
      participants.push({ type: 'monster', id: idx.toString(), speed: m.speed });
    });

    participants.sort((a, b) => b.speed - a.speed);

    // Speed determines turn ordering. In one round, characters attack in turn sequence.
    participants.forEach((p) => {
      // Re-verify targets are still alive before resolving turn
      const livingH = nextParty.filter((h) => h.hp > 0);
      const livingM = nextMonsters.filter((m) => m.hp > 0);
      if (livingH.length === 0 || livingM.length === 0) return;

      if (p.type === 'hero') {
        const attacker = nextParty.find((h) => h.id === p.id);
        if (!attacker || attacker.hp <= 0) return;

        const modStats = getModifiedStats(attacker, guild.relics);

        // Cleric specialization: 40% chance to heal teammate instead of hitting monster
        if (attacker.heroClass === 'Cleric' && Math.random() > 0.6) {
          const weakestHero = [...nextParty]
            .filter((h) => h.hp > 0 && h.hp < getModifiedStats(h, guild.relics).maxHp)
            .sort((a, b) => a.hp - b.hp)[0];

          if (weakestHero) {
            const hIndex = nextParty.findIndex((h) => h.id === weakestHero.id);
            const healedHero = { ...nextParty[hIndex] };
            const hStats = getModifiedStats(healedHero, guild.relics);
            const healVal = Math.round(modStats.attack * 0.9 + 10);

            healedHero.hp = Math.min(hStats.maxHp, healedHero.hp + healVal);
            nextParty[hIndex] = healedHero;

            combatLogs.push({
              id: generateId(),
              text: `✨ Cleric ${attacker.name} channels Holy Light, healing ${healedHero.name} for +${healVal} HP!`,
              type: 'heal',
              timestamp: Date.now()
            });
            return;
          }
        }

        // Mage specialization: 35% chance to cast elemental AOE hitting multiple targets
        const targetIdx = Math.floor(Math.random() * livingM.length);
        const targetMonsterName = livingM[targetIdx].name;
        const realMonsterIdxInList = nextMonsters.findIndex(
          (m) => m.name === targetMonsterName && m.hp > 0
        );

        if (attacker.heroClass === 'Mage' && Math.random() > 0.65 && livingM.length > 1) {
          // Hits 2 random targets
          livingM.slice(0, 2).forEach((targetM) => {
            const index = nextMonsters.findIndex((nm) => nm.name === targetM.name && nm.hp > 0);
            if (index !== -1) {
              const baseDmg = Math.round(modStats.attack * 0.65);
              const mDefense = nextMonsters[index].defense;
              const finalDmg = Math.max(2, baseDmg - mDefense);

              nextMonsters[index].hp = Math.max(0, nextMonsters[index].hp - finalDmg);
              combatLogs.push({
                id: generateId(),
                text: `🔥 Mage ${attacker.name} casts Fireball! Splashes ${nextMonsters[index].name} for ${finalDmg} elemental dmg!`,
                type: 'attack',
                timestamp: Date.now()
              });
            }
          });
        } else {
          // Single attack
          const mDefense = nextMonsters[realMonsterIdxInList].defense;
          // Check for Critical Hit (based on Luck)
          const criticalRoll = Math.random() * 100;
          const isCrit = criticalRoll < modStats.luck;
          const dmgMult = isCrit ? 1.75 : 1.0;

          const baseDmg = Math.round(modStats.attack * (0.8 + Math.random() * 0.4) * dmgMult);
          const finalDmg = Math.max(2, baseDmg - mDefense);

          nextMonsters[realMonsterIdxInList].hp = Math.max(0, nextMonsters[realMonsterIdxInList].hp - finalDmg);

          combatLogs.push({
            id: generateId(),
            text: `${isCrit ? '💥 CRITICAL! ' : '⚔️ '}${attacker.name} strikes ${
              nextMonsters[realMonsterIdxInList].name
            } for ${finalDmg} dmg!`,
            type: isCrit ? 'damage' : 'attack',
            timestamp: Date.now()
          });
        }
      } else {
        // Monster attack
        const monsterIdx = parseInt(p.id);
        const attacker = nextMonsters[monsterIdx];
        if (!attacker || attacker.hp <= 0) return;

        // Choose random living hero
        const targetIdx = Math.floor(Math.random() * livingH.length);
        const targetHero = livingH[targetIdx];
        const hIndex = nextParty.findIndex((h) => h.id === targetHero.id);

        const hStats = getModifiedStats(targetHero, guild.relics);

        // Rogue evasion: 20% flat dodge chance
        if (targetHero.heroClass === 'Rogue' && Math.random() > 0.80) {
          combatLogs.push({
            id: generateId(),
            text: `💨 Rogue ${targetHero.name} smoothly dodges ${attacker.name}'s swing!`,
            type: 'info',
            timestamp: Date.now()
          });
          return;
        }

        const baseDmg = Math.round(attacker.attack * (0.85 + Math.random() * 0.3));
        const finalDmg = Math.max(3, baseDmg - hStats.defense);

        nextParty[hIndex].hp = Math.max(0, nextParty[hIndex].hp - finalDmg);

        combatLogs.push({
          id: generateId(),
          text: `👺 ${attacker.name} claws ${targetHero.name} dealing ${finalDmg} raw physical damage!`,
          type: 'damage',
          timestamp: Date.now()
        });

        if (nextParty[hIndex].hp <= 0) {
          combatLogs.push({
            id: generateId(),
            text: `🥀 Heavy blow! ${targetHero.name} has collapsed!`,
            type: 'death',
            timestamp: Date.now()
          });
        }
      }
    });

    setExpedition((prev) => {
      if (!prev) return null;
      if (!prev.dungeon?.rooms) return prev;

      // Update room monsters
      const updatedRooms = prev.dungeon.rooms.map((r, idx) => {
        if (idx === prev.currentRoomIndex) {
          return { ...r, monsterGroup: nextMonsters };
        }
        return r;
      });

      return {
        ...prev,
        party: nextParty,
        dungeon: { ...prev.dungeon, rooms: updatedRooms },
        combatRound: prev.combatRound + 1,
        logs: [...prev.logs, ...combatLogs]
      };
    });
  };

  // --- MYSTERY EVENT DECISION ---
  const makeEventChoice = (choice: EventChoice) => {
    if (!expedition) return;

    // Roll for random outcome based on probabilities
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

    const logs: CombatLog[] = [];
    logs.push({
      id: generateId(),
      text: `📜 Decided: "${choice.text}"`,
      type: 'info',
      timestamp: Date.now()
    });

    logs.push({
      id: generateId(),
      text: `Outcome: ${selectedOutcome.text}`,
      type: 'info',
      timestamp: Date.now()
    });

    let extraGold = selectedOutcome.effects.gold || 0;
    const itemDrops: Equipment[] = [];

    if (selectedOutcome.effects.itemDrop) {
      const drop = generateRandomEquipment(expedition.dungeon.dangerRating);
      itemDrops.push(drop);
      logs.push({
        id: generateId(),
        text: `💎 Found item: [${drop.name}]!`,
        type: 'victory',
        timestamp: Date.now()
      });
    }

    // Apply effects to party (damage, morale, experience)
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
          logs.push({
            id: generateId(),
            text: `⭐ LEVEL UP! ${h.name} leveled up to Lvl ${lvl}!`,
            type: 'victory',
            timestamp: Date.now()
          });
        }
      }

      return {
        ...h,
        hp,
        morale,
        level: lvl,
        experience: exp,
        expNeeded
      };
    });

    // Check if entire party fainted
    const activeSurvivors = updatedParty.filter((h) => h.hp > 0);
    const hasWiped = activeSurvivors.length === 0;

    setExpedition((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        party: updatedParty,
        goldEarned: prev.goldEarned + extraGold,
        lootEarned: {
          ...prev.lootEarned,
          equipment: [...prev.lootEarned.equipment, ...itemDrops]
        },
        activeRoomChoiceMade: !hasWiped, // can only proceed if someone survived
        selectedEventOutcomeText: selectedOutcome.text,
        logs: [...prev.logs, ...logs],
        status: hasWiped ? 'defeat' : prev.status
      };
    });

    if (hasWiped) {
      setGuild((prev) => {
        const roster = prev.roster.map((h) => {
          const finished = updatedParty.find((f) => f.id === h.id);
          return finished ? { ...finished, status: 'Dead' as const, hp: 0 } : h;
        });
        return { ...prev, roster };
      });
    }
  };

  // --- REST CAMPFIRE HANDLERS ---
  const handleCampfireChoice = (option: 'heal' | 'morale' | 'train') => {
    if (!expedition) return;

    const logs: CombatLog[] = [];
    const cauldronBonus = guild.relics.some((r) => r.modifierType === 'heal_bonus') ? 1.5 : 1.0;

    const updatedParty = expedition.party.map((h) => {
      if (h.hp <= 0) return h;

      const modStats = getModifiedStats(h, guild.relics);

      if (option === 'heal') {
        const healAmt = Math.round(modStats.maxHp * 0.40 * cauldronBonus);
        return { ...h, hp: Math.min(modStats.maxHp, h.hp + healAmt) };
      } else if (option === 'morale') {
        return { ...h, morale: Math.min(100, h.morale + 30) };
      } else {
        // Experience training
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
      }
    });

    let textMsg = '';
    if (option === 'heal') {
      textMsg = `🔥 Campfire: Party bandaged their wounds and restfully slept, restoring massive health.`;
    } else if (option === 'morale') {
      textMsg = `🔥 Campfire: Plotted paths, polished iron gear, and shared epic tavern jokes. Party Morale restored!`;
    } else {
      textMsg = `🔥 Campfire: Heroes held intense sparring sessions, gaining tactical training experience.`;
    }

    logs.unshift({
      id: generateId(),
      text: textMsg,
      type: 'heal',
      timestamp: Date.now()
    });

    setExpedition((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        party: updatedParty,
        activeRoomChoiceMade: true,
        logs: [...prev.logs, ...logs]
      };
    });
  };

  // --- TRAP DECISIONS ---
  const handleTrapChoice = (heroId: string, method: 'speed' | 'defense' | 'luck') => {
    if (!expedition) return;

    const chosenHero = expedition.party.find((h) => h.id === heroId);
    if (!chosenHero) return;

    const modStats = getModifiedStats(chosenHero, guild.relics);
    let successChance = 0.5; // base 50%

    if (method === 'speed') {
      successChance = Math.min(0.95, 0.35 + modStats.speed * 0.04);
    } else if (method === 'defense') {
      successChance = Math.min(0.90, 0.30 + modStats.defense * 0.04);
    } else {
      successChance = Math.min(0.95, 0.25 + modStats.luck * 0.05);
    }

    const isSuccess = Math.random() < successChance;
    const logs: CombatLog[] = [];

    let updatedParty = [...expedition.party];

    if (isSuccess) {
      logs.push({
        id: generateId(),
        text: `👍 DISARMED! ${chosenHero.name} successfully disarmed the traps safely using ${method.toUpperCase()} (Chance: ${Math.round(
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
      // Failure dealing damage
      logs.push({
        id: generateId(),
        text: `💥 TRAP TRIGGERED! ${chosenHero.name} failed the ${method.toUpperCase()} trap bypass check (Chance: ${Math.round(
          successChance * 100
        )}%). Poison darts fired! Party took heavy damage.`,
        type: 'damage',
        timestamp: Date.now()
      });

      updatedParty = updatedParty.map((h) => {
        if (h.hp <= 0) return h;
        const modStatsH = getModifiedStats(h, guild.relics);
        // Warrior takes less trap damage due to shielding
        const trapMult = h.heroClass === 'Warrior' ? 0.08 : 0.16;
        const damage = Math.round(modStatsH.maxHp * trapMult);
        const nextHp = Math.max(0, h.hp - damage);

        if (nextHp <= 0) {
          logs.push({
            id: generateId(),
            text: `🥀 Trap was fatal! ${h.name} collapsed unconscious.`,
            type: 'death',
            timestamp: Date.now()
          });
        }

        return {
          ...h,
          hp: nextHp,
          morale: Math.max(10, h.morale - 12)
        };
      });
    }

    const aliveSurvivors = updatedParty.filter((h) => h.hp > 0);
    const hasWiped = aliveSurvivors.length === 0;

    setExpedition((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        party: updatedParty,
        activeRoomChoiceMade: !hasWiped,
        logs: [...prev.logs, ...logs],
        status: hasWiped ? 'defeat' : prev.status
      };
    });

    if (hasWiped) {
      setGuild((prev) => {
        const roster = prev.roster.map((h) => {
          const finished = updatedParty.find((f) => f.id === h.id);
          return finished ? { ...finished, status: 'Dead' as const, hp: 0 } : h;
        });
        return { ...prev, roster };
      });
    }
  };

  // --- MERCHANT TRADES DURING RUN ---
  const buyMerchantItem = (item: Equipment) => {
    if (!expedition) return;

    if (guild.gold < item.price) return;

    // Deduct gold from guild bank, place item in expedition gathered loot bag
    setGuild((prev) => ({ ...prev, gold: prev.gold - item.price }));

    setExpedition((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        lootEarned: {
          ...prev.lootEarned,
          equipment: [...prev.lootEarned.equipment, item]
        },
        merchantItemsStock: prev.merchantItemsStock?.filter((i) => i.id !== item.id),
        logs: [
          ...prev.logs,
          {
            id: generateId(),
            text: `🛒 Purchased item [${item.name}] from merchant!`,
            type: 'info',
            timestamp: Date.now()
          }
        ]
      };
    });
  };

  return (
    <GameContext.Provider
      value={{
        guild,
        expedition,
        activeScreen,
        activeTab,
        selectedHeroId,
        hydrated,
        setGuild,
        setActiveScreen,
        setActiveTab,
        setSelectedHeroId,
        renameGuild,
        recruitHero,
        dismissHero,
        buyEquipment,
        sellEquipment,
        equipItem,
        unequipItem,
        upgradeBuilding,
        healHeroWithGold,
        reviveHero,
        startExpedition,
        retreatExpedition,
        proceedToNextRoom,
        executeCombatRound,
        makeEventChoice,
        handleCampfireChoice,
        handleTrapChoice,
        buyMerchantItem,
        setExpeditionSpeed
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
