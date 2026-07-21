/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Thin React façade over the server-authoritative game engine.
 * All mutations go through POST /api/game/action; local state only mirrors the server.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Equipment, EventChoice, ExpeditionState, GuildState } from '../types';
import type { EquipSlot, GameAction, UpgradeKey } from '../gameActions';
import { ActionRequestError, dispatchGameAction, fetchGameState } from '../api/client';

const EMPTY_GUILD: GuildState = {
  name: 'Guest Guild',
  level: 1,
  gold: 0,
  roster: [],
  inventory: [],
  relics: [],
  recruitStock: [],
  shopStock: [],
  upgrades: {
    maxRoster: 6,
    recruitQuality: 1,
    shopQuality: 1,
    healerStation: 1,
  },
};

interface GameContextProps {
  guild: GuildState;
  expedition: ExpeditionState | null;
  activeScreen: 'guild' | 'expedition' | 'account' | 'character';
  activeTab: 'roster' | 'recruit' | 'armory' | 'upgrades';
  selectedHeroId: string | null;
  hydrated: boolean;
  /** True while a game action is in flight. */
  actionPending: boolean;
  /** Last action error message (cleared on next successful action). */
  lastActionError: string | null;
  setActiveScreen: (screen: 'guild' | 'expedition' | 'account' | 'character') => void;
  setActiveTab: (tab: 'roster' | 'recruit' | 'armory' | 'upgrades') => void;
  setSelectedHeroId: (id: string | null) => void;
  reloadPersistedState: () => Promise<void>;
  renameGuild: (newName: string) => void;
  recruitHero: (heroId: string) => void;
  dismissHero: (heroId: string) => void;
  buyEquipment: (itemId: string) => void;
  sellEquipment: (itemId: string) => void;
  equipItem: (heroId: string, itemId: string, slot: EquipSlot) => void;
  unequipItem: (heroId: string, slot: EquipSlot) => void;
  upgradeBuilding: (key: UpgradeKey) => void;
  healHeroWithGold: (heroId: string) => void;
  reviveHero: (heroId: string) => void;
  startExpedition: (dungeonId: string, partyHeroIds: string[]) => void;
  retreatExpedition: () => void;
  proceedToNextRoom: () => void;
  advanceCombat: () => void;
  submitCombatAction: (
    action: 'attack' | 'skill' | 'spell' | 'item' | 'defend',
    targetId?: string
  ) => void;
  setCombatMode: (mode: 'manual' | 'auto') => void;
  makeEventChoice: (choiceIndex: number) => void;
  handleCampfireChoice: (option: 'heal' | 'morale' | 'train') => void;
  handleTrapChoice: (heroId: string, method: 'speed' | 'defense' | 'luck') => void;
  buyMerchantItem: (itemId: string) => void;
  setExpeditionSpeed: (speed: 1 | 2 | 3) => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guild, setGuild] = useState<GuildState>(EMPTY_GUILD);
  const [expedition, setExpedition] = useState<ExpeditionState | null>(null);
  const [activeScreen, setActiveScreen] = useState<'guild' | 'expedition' | 'account' | 'character'>('guild');
  const [activeTab, setActiveTab] = useState<'roster' | 'recruit' | 'armory' | 'upgrades'>('roster');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [lastActionError, setLastActionError] = useState<string | null>(null);

  const didInitRef = useRef(false);
  const actionQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applySnapshot = useCallback(
    (snapshot: { guild: GuildState; expedition: ExpeditionState | null }, opts?: { openExpedition?: boolean }) => {
      setGuild(snapshot.guild);
      setExpedition(snapshot.expedition);
      if (opts?.openExpedition && snapshot.expedition) {
        setActiveScreen('expedition');
      }
      if (
        snapshot.expedition &&
        (snapshot.expedition.status === 'victory' ||
          snapshot.expedition.status === 'defeat' ||
          snapshot.expedition.status === 'retreat')
      ) {
        // Keep expedition screen so end-state UI can show; user navigates back.
      }
    },
    []
  );

  const runAction = useCallback(
    (action: GameAction, opts?: { openExpedition?: boolean }) => {
      // Serialize actions so combat ticks / rapid clicks don't race.
      actionQueueRef.current = actionQueueRef.current.then(async () => {
        setActionPending(true);
        setLastActionError(null);
        try {
          const next = await dispatchGameAction(action);
          applySnapshot(next, opts);
        } catch (err) {
          const message =
            err instanceof ActionRequestError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Action failed.';
          setLastActionError(message);
          console.warn('[game] action rejected:', action.type, message);
          if (err instanceof ActionRequestError && err.status === 401) {
            // Signed out mid-session — clear to guest empty state.
            setGuild(EMPTY_GUILD);
            setExpedition(null);
          }
        } finally {
          setActionPending(false);
        }
      });
    },
    [applySnapshot]
  );

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      try {
        const loaded = await fetchGameState();
        if (loaded?.guild) {
          applySnapshot(loaded);
          if (loaded.expedition && loaded.expedition.status === 'room_active') {
            setActiveScreen('expedition');
          }
        }
      } catch (err) {
        console.warn('[persistence] hydration failed.', err);
      } finally {
        setHydrated(true);
      }
    })();
  }, [applySnapshot]);

  const reloadPersistedState = useCallback(async () => {
    try {
      const loaded = await fetchGameState();
      if (loaded?.guild) {
        applySnapshot(loaded);
      } else {
        setGuild(EMPTY_GUILD);
        setExpedition(null);
        setActiveScreen('guild');
      }
    } catch (err) {
      console.warn('[persistence] reload after auth change failed.', err);
    }
  }, [applySnapshot]);

  // Poll while heroes are resting in Sanctuary so free auto-revives appear without a manual refresh.
  useEffect(() => {
    if (!hydrated) return;
    const hasFallen = guild.roster.some((h) => h.status === 'Dead');
    if (!hasFallen) return;
    const id = window.setInterval(() => {
      void reloadPersistedState();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [guild.roster, hydrated, reloadPersistedState]);

  const value: GameContextProps = {
    guild,
    expedition,
    activeScreen,
    activeTab,
    selectedHeroId,
    hydrated,
    actionPending,
    lastActionError,
    setActiveScreen,
    setActiveTab,
    setSelectedHeroId,
    reloadPersistedState,
    renameGuild: (name) => runAction({ type: 'renameGuild', name }),
    recruitHero: (heroId) => runAction({ type: 'recruitHero', heroId }),
    dismissHero: (heroId) => runAction({ type: 'dismissHero', heroId }),
    buyEquipment: (itemId) => runAction({ type: 'buyEquipment', itemId }),
    sellEquipment: (itemId) => runAction({ type: 'sellEquipment', itemId }),
    equipItem: (heroId, itemId, slot) => runAction({ type: 'equipItem', heroId, itemId, slot }),
    unequipItem: (heroId, slot) => runAction({ type: 'unequipItem', heroId, slot }),
    upgradeBuilding: (key) => runAction({ type: 'upgradeBuilding', key }),
    healHeroWithGold: (heroId) => runAction({ type: 'healHero', heroId }),
    reviveHero: (heroId) => runAction({ type: 'reviveHero', heroId }),
    startExpedition: (dungeonId, partyHeroIds) =>
      runAction({ type: 'startExpedition', dungeonId, partyHeroIds }, { openExpedition: true }),
    retreatExpedition: () => runAction({ type: 'retreatExpedition' }),
    proceedToNextRoom: () => runAction({ type: 'proceedToNextRoom' }),
    advanceCombat: () => runAction({ type: 'advanceCombat' }),
    submitCombatAction: (action, targetId) =>
      runAction({ type: 'submitCombatAction', action, targetId }),
    setCombatMode: (mode) => runAction({ type: 'setCombatMode', mode }),
    makeEventChoice: (choiceIndex) => runAction({ type: 'makeEventChoice', choiceIndex }),
    handleCampfireChoice: (option) => runAction({ type: 'handleCampfireChoice', option }),
    handleTrapChoice: (heroId, method) => runAction({ type: 'handleTrapChoice', heroId, method }),
    buyMerchantItem: (itemId) => runAction({ type: 'buyMerchantItem', itemId }),
    setExpeditionSpeed: (speed) => runAction({ type: 'setExpeditionSpeed', speed }),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Silence unused type imports kept for call-site compatibility documentation.
export type { Equipment, EventChoice };
