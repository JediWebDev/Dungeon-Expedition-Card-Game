/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Portrait } from './Portrait';
import { CombatPanel } from './combat/CombatPanel';
import { getModifiedStats } from '../utils';
import {
  Heart,
  Sparkles,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { UiButton } from './ui/UiButton';
import { UiTextHeader, uiSectionFrame } from './ui/UiTextHeader';
import { DungeonMapPanel } from './dungeon/DungeonMapPanel';
import {
  countVisitedNodes,
  ensureDungeonMap,
  resolveActiveRoom,
  resolveCurrentNodeId,
} from '../dungeonMap';

export const DungeonRunner: React.FC = () => {
  const {
    expedition,
    guild,
    proceedToNextRoom,
    advanceCombat,
    submitCombatAction,
    setCombatMode,
    makeEventChoice,
    handleCampfireChoice,
    handleTrapChoice,
    buyMerchantItem,
    retreatExpedition,
    setActiveScreen,
    setExpeditionSpeed,
    actionPending,
  } = useGame();

  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Derived values used by hooks — must stay above any early returns so hook
  // count/order never changes when status becomes victory/defeat/retreat.
  const dungeon = expedition?.dungeon;
  const party = expedition?.party ?? [];
  const currentRoomIndex = expedition?.currentRoomIndex ?? 0;
  const status = expedition?.status;
  const logs = expedition?.logs ?? [];
  const goldEarned = expedition?.goldEarned ?? 0;
  const lootEarned = expedition?.lootEarned ?? { equipment: [], relics: [] };
  const speed = expedition?.speed ?? 1;
  let activeRoom = dungeon?.rooms?.[currentRoomIndex];
  if (expedition) {
    try {
      activeRoom = resolveActiveRoom(expedition);
    } catch {
      /* keep index fallback */
    }
  }
  const currentNodeId = expedition ? resolveCurrentNodeId(expedition) : undefined;
  const mapDungeon = dungeon ? ensureDungeonMap(dungeon) : undefined;
  const visitedCount = mapDungeon?.map ? countVisitedNodes(mapDungeon.map) : currentRoomIndex + 1;
  const totalChambers = mapDungeon?.map?.nodes.length ?? dungeon?.rooms?.length ?? 0;
  const activeRoomType = activeRoom?.type;
  const activeRoomChoiceMade = expedition?.activeRoomChoiceMade ?? false;
  const combat = expedition?.combat ?? null;
  const combatMode = combat?.mode ?? 'manual';

  // Auto-scrolling battle logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  // Auto-battle: advance one action at a slower, readable pace.
  useEffect(() => {
    if (combatMode !== 'auto') return;
    if (status !== 'room_active') return;
    if (!activeRoomType) return;

    const isCombatRoom =
      activeRoomType === 'Monster' ||
      activeRoomType === 'Elite Monster' ||
      activeRoomType === 'Boss';

    if (!isCombatRoom || activeRoomChoiceMade) return;
    if (actionPending) return;

    const msInterval = 1600 / speed;
    const intervalId = setInterval(() => {
      advanceCombat();
    }, msInterval);

    return () => clearInterval(intervalId);
  }, [
    combatMode,
    activeRoomType,
    activeRoomChoiceMade,
    status,
    speed,
    advanceCombat,
    actionPending,
  ]);

  // Active room pointers
  if (!expedition) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <AlertTriangle className="text-amber-500 mb-3 animate-bounce" size={44} />
        <h3 className="text-lg font-bold text-stone-100 uppercase tracking-wide">No Active Expedition</h3>
        <p className="text-xs text-stone-400 mt-1 max-w-sm text-center font-sans">
          Go back to the Guild roster board and assemble a campaign party to launch a run.
        </p>
        <UiButton className="mt-6" onClick={() => setActiveScreen('guild')}>
          Return to Guild Hall
        </UiButton>
      </div>
    );
  }

  // If the expedition is in a terminal state (victory/defeat/retreat), render those screens directly
  // This prevents crashes when activeRoom would be undefined (index out of bounds after last room)
  if (status === 'victory') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <div className="my-auto py-8 text-center max-w-md mx-auto animate-fade-in flex flex-col items-center">
          <span className="text-5xl block mb-3">🏆</span>
          <UiTextHeader>Expedition Victorious!</UiTextHeader>
          <p className="text-xs text-stone-400 mt-1.5 leading-relaxed font-sans">
            Your team successfully defeated the dungeon boss and mapped out the sectors! They returned safely with relics and full loot payouts.
          </p>
          <UiButton className="mt-6" onClick={() => setActiveScreen('guild')}>
            Return to Guild HQ
          </UiButton>
        </div>
      </div>
    );
  }

  if (status === 'retreat') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <div className="my-auto py-8 text-center max-w-md mx-auto animate-fade-in flex flex-col items-center">
          <span className="text-5xl block mb-3">🏳️</span>
          <UiTextHeader>Expedition Retreated</UiTextHeader>
          <p className="text-xs text-stone-400 mt-1.5 leading-relaxed font-sans">
            The guild master authorized an emergency caravan pullout. Survivors returned fainted or exhausted, but they carried back half of the plundered gold!
          </p>
          <UiButton className="mt-6" variant="ghost" onClick={() => setActiveScreen('guild')}>
            Return to Guild HQ
          </UiButton>
        </div>
      </div>
    );
  }

  if (status === 'defeat') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <div className="my-auto py-8 text-center max-w-md mx-auto animate-fade-in flex flex-col items-center">
          <span className="text-5xl block mb-3">💀</span>
          <UiTextHeader>Party Wiped Out</UiTextHeader>
          <p className="text-xs text-stone-400 mt-1.5 leading-relaxed font-sans">
            Tragedy strikes. The dungeon monsters completely overwhelmed your frontline. A recovery squad pulled them back unconscious. Spend gold in sanctuary to heal them.
          </p>
          <UiButton className="mt-6" onClick={() => setActiveScreen('guild')}>
            Return to Guild HQ
          </UiButton>
        </div>
      </div>
    );
  }

  if (!dungeon?.rooms?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <AlertTriangle className="text-amber-500 mb-3 animate-bounce" size={44} />
        <h3 className="text-lg font-bold text-stone-100 uppercase tracking-wide">Dungeon Data Unavailable</h3>
        <p className="text-xs text-stone-400 mt-1 max-w-sm text-center font-sans">
          The current expedition is missing dungeon room data. Please restart the expedition from the Guild Hall.
        </p>
        <UiButton className="mt-6" onClick={() => setActiveScreen('guild')}>
          Return to Guild Hall
        </UiButton>
      </div>
    );
  }

  // Color-coded logging text
  const getLogColorClass = (type: string) => {
    switch (type) {
      case 'damage':
        return 'text-rose-400 font-bold';
      case 'heal':
        return 'text-emerald-400 font-bold';
      case 'victory':
        return 'text-amber-400 font-black tracking-wide uppercase';
      case 'defeat':
        return 'text-red-500 font-black tracking-wide uppercase';
      case 'death':
        return 'text-red-400 border-l-2 border-red-500 pl-2 bg-red-950/20 py-1 rounded-sm font-semibold';
      case 'attack':
        return 'text-stone-300';
      case 'skill':
        return 'text-orange-300 font-semibold';
      case 'spell':
        return 'text-violet-300 font-semibold';
      case 'item':
        return 'text-cyan-300 font-semibold';
      case 'defend':
        return 'text-sky-400 font-semibold';
      case 'info':
        return 'text-stone-400 italic';
      default:
        return 'text-stone-400';
    }
  };

  // Check if expedition is active
  if (status === 'room_active' && !activeRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 p-8">
        <AlertTriangle className="text-amber-500 mb-3 animate-bounce" size={44} />
        <h3 className="text-lg font-bold text-stone-100 uppercase tracking-wide">Room Data Unavailable</h3>
        <p className="text-xs text-stone-400 mt-1 max-w-sm text-center font-sans">
          The current room data is missing. Please return to the guild and restart the expedition.
        </p>
        <UiButton className="mt-6" onClick={() => setActiveScreen('guild')}>
          Return to Guild Hall
        </UiButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-stone-950 animate-fade-in">
      {/* 1. Dungeon Top Navigation */}
      <div className={`bg-stone-900/20 ${uiSectionFrame} p-4 mb-4 flex flex-col md:flex-row justify-between items-center gap-4`}>
        <div className="text-center md:text-left">
          <h2 className="text-lg font-extrabold text-stone-100 flex items-center gap-2 justify-center md:justify-start uppercase tracking-wide">
            🏰 Expedition: <span className="text-amber-500">{dungeon.name}</span>
          </h2>
          <div className="text-xs text-stone-400 mt-1 font-sans font-semibold">
            Chambers explored{' '}
            <span className="text-stone-200 font-bold">{visitedCount}</span>
            {' / '}
            <span className="text-stone-200 font-bold">{totalChambers}</span>
            {activeRoom ? (
              <>
                {' · '}
                <span className="text-[#D7BF92]">{activeRoom.name}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Speed / Retreat controls */}
        <div className="flex items-center gap-3 font-sans">
          {/* Speed multiplier bounds */}
          <div className="flex bg-stone-950 border border-stone-850 p-0.5 rounded-sm text-[10px]">
            <button
              onClick={() => setExpeditionSpeed(1)}
              className={`py-1 px-2.5 rounded-sm font-bold tracking-wider transition cursor-pointer ${
                speed === 1 ? 'bg-amber-900/30 text-amber-500 border border-amber-900/40' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              1X
            </button>
            <button
              onClick={() => setExpeditionSpeed(2)}
              className={`py-1 px-2.5 rounded-sm font-bold tracking-wider transition cursor-pointer ${
                speed === 2 ? 'bg-amber-900/30 text-amber-500 border border-amber-900/40' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              2X
            </button>
            <button
              onClick={() => setExpeditionSpeed(3)}
              className={`py-1 px-2.5 rounded-sm font-bold tracking-wider transition cursor-pointer ${
                speed === 3 ? 'bg-amber-900/30 text-amber-500 border border-amber-900/40' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              3X
            </button>
          </div>

          <UiButton
            variant="danger"
            onClick={() => {
              if (confirm('Do you want to retreat? Your fainted heroes will return, but you forfeit 50% of the gathered gold!')) {
                retreatExpedition();
              }
            }}
          >
            Retreat
          </UiButton>
        </div>
      </div>

      {/* 1b. Fog-of-war dungeon map */}
      {mapDungeon && (
        <DungeonMapPanel
          dungeon={mapDungeon}
          currentNodeId={currentNodeId}
          className="mb-4 shrink-0"
        />
      )}

      {/* 2. Main Expedition Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Party Frame & Statistics (xl:col-span-4) */}
        <div className={`xl:col-span-4 flex flex-col bg-stone-900/20 ${uiSectionFrame} p-4`}>
          <UiTextHeader className="mb-3 !min-w-0">Expedition Party Roster</UiTextHeader>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {party.map((hero) => {
              const stats = getModifiedStats(hero, guild.relics);
              const isDead = hero.hp <= 0;
              const hpPct = isDead ? 0 : (hero.hp / stats.maxHp) * 100;

              return (
                <div
                  key={hero.id}
                  className={`p-3 rounded-sm border flex gap-3 transition-all ${
                    isDead ? 'bg-red-950/5 border-red-950/20 opacity-40' : 'bg-stone-900/30 border-stone-850'
                  }`}
                >
                  <Portrait
                    heroClass={hero.heroClass}
                    portraitSeed={hero.portraitSeed}
                    isDead={isDead}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-stone-200 truncate pr-2 uppercase">{hero.name}</h4>
                      <span className="text-[10px] text-amber-500 font-bold">
                        Lvl {hero.level}
                      </span>
                    </div>

                    {/* Mini stats display */}
                    <div className="text-[10px] text-stone-400 mt-1 font-semibold">
                      ⚔️ {stats.attack} Atk • 🛡️ {stats.defense} Def • ⚡ {stats.speed} Spd
                    </div>

                    {/* HP Bar */}
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-0.5">
                        <span>HP</span>
                        <span>
                          {isDead ? 0 : hero.hp} / {stats.maxHp}
                        </span>
                      </div>
                      <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            hpPct > 50 ? 'bg-emerald-500' : hpPct > 20 ? 'bg-amber-500' : 'bg-red-600'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Treasure gathered tally bag */}
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between font-sans">
            <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Expedition Booty:</span>
            <div className="flex items-center gap-3.5 text-xs font-bold">
              <span className="text-amber-400 flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> {goldEarned}g
              </span>
              <span className="text-cyan-400 uppercase tracking-wide">
                🎒 {lootEarned.equipment.length} Items
              </span>
            </div>
          </div>
        </div>

        {/* Center Column: Active Room Scene Board (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col min-h-0 gap-5">
          {/* Active Chamber Sandbox */}
          <div className={`flex-1 flex flex-col justify-between bg-stone-900/20 ${uiSectionFrame} p-5 relative overflow-y-auto`}>
            {/* Header info */}
            <div className="mb-4">
              <span className="text-[9px] uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded-sm font-bold border border-amber-500/20">
                {activeRoom!.type} Node
              </span>
              <h3 className="text-lg font-bold text-stone-100 mt-2.5 uppercase tracking-wide">{activeRoom!.name}</h3>
              <p className="text-xs text-stone-400 mt-1 font-serif italic">{activeRoom!.description}</p>
            </div>

            {/* SCENARIO CHANNELS */}

            {/* --- STATE: EXPEDITION RUNNING & ACTIVE ROOM --- */}
            {status === 'room_active' && (
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {/* 1. ROOM TYPE: COMBAT (MONSTER / ELITE / BOSS) */}
                {(activeRoom!.type === 'Monster' ||
                  activeRoom!.type === 'Elite Monster' ||
                  activeRoom!.type === 'Boss') && (
                  <CombatPanel expedition={expedition} guild={guild} activeRoom={activeRoom!} />
                )}


                {/* 2. ROOM TYPE: TREASURE */}
                {activeRoom!.type === 'Treasure' && (
                  <div className="my-auto py-6 text-center max-w-sm mx-auto flex flex-col items-center">
                    <span className="text-6xl block animate-bounce mb-4">🎁</span>
                    <UiTextHeader>Plundered Guild Vault Chest</UiTextHeader>
                    <p className="text-xs text-stone-400 mt-2.5 leading-relaxed font-sans">
                      A beautiful chest lay dusty in the stone slot alcove. Click to open and claim gold coin payouts and armory equipment.
                    </p>

                    {!expedition.activeRoomChoiceMade ? (
                      <UiButton className="mt-6" onClick={proceedToNextRoom}>
                        Loot Chest & Proceed
                      </UiButton>
                    ) : (
                      <UiButton className="mt-6" variant="ghost" onClick={proceedToNextRoom}>
                        Proceed Ahead
                      </UiButton>
                    )}
                  </div>
                )}

                {/* 3. ROOM TYPE: CAMPFIRE */}
                {activeRoom!.type === 'Campfire' && (
                  <div className="my-auto py-6 text-center max-w-md mx-auto">
                    <span className="text-5xl block mb-3 animate-pulse">🔥</span>
                    <UiTextHeader>The Sanctuary Campfire</UiTextHeader>
                    <p className="text-xs text-stone-400 mt-2.5 leading-relaxed font-serif italic">
                      Pitch your canvas tents, boil dried herbs, and dress battle wounds. Select a restful strategy before moving ahead:
                    </p>

                    {!expedition.activeRoomChoiceMade ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 font-sans">
                        <button
                          onClick={() => handleCampfireChoice('heal')}
                          className="bg-stone-950 border border-stone-850 hover:border-orange-600 p-3 rounded-sm transition-all hover:bg-stone-900/40 flex flex-col items-center gap-1.5 cursor-pointer"
                        >
                          <Heart size={16} className="text-red-400 fill-red-400/10" />
                          <span className="text-xs font-bold text-stone-200">Dress Wounds</span>
                          <span className="text-[10px] text-stone-500 font-bold font-mono">+40% Party HP</span>
                        </button>

                        <button
                          onClick={() => handleCampfireChoice('morale')}
                          className="bg-stone-950 border border-stone-850 hover:border-orange-600 p-3 rounded-sm transition-all hover:bg-stone-900/40 flex flex-col items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles size={16} className="text-emerald-400" />
                          <span className="text-xs font-bold text-stone-200">Share Songs</span>
                          <span className="text-[10px] text-stone-500 font-bold font-mono">+30 Morale</span>
                        </button>

                        <button
                          onClick={() => handleCampfireChoice('train')}
                          className="bg-stone-950 border border-stone-850 hover:border-orange-600 p-3 rounded-sm transition-all hover:bg-stone-900/40 flex flex-col items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen size={16} className="text-cyan-400" />
                          <span className="text-xs font-bold text-stone-200">Tactical Drill</span>
                          <span className="text-[10px] text-stone-500 font-bold font-mono">+45 Combat EXP</span>
                        </button>
                      </div>
                    ) : (
                      <UiButton className="mt-6" onClick={proceedToNextRoom}>
                        Extinguish Fire & Proceed
                      </UiButton>
                    )}
                  </div>
                )}

                {/* 4. ROOM TYPE: MERCHANT */}
                {activeRoom!.type === 'Merchant' && (
                  <div className="my-auto py-4 flex flex-col justify-between">
                    <p className="text-xs text-stone-400 text-center max-w-sm mx-auto leading-relaxed font-serif italic mb-2">
                      &ldquo;Greetings guild managers! Stock up on rare magic trinkets directly using your guild bank gold gold.&rdquo;
                    </p>

                    {expedition.merchantItemsStock && expedition.merchantItemsStock.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                        {expedition.merchantItemsStock.map((item) => {
                          const canAfford = guild.gold >= item.price;
                          return (
                            <div
                              key={item.id}
                              className="bg-stone-950 border border-stone-850 p-3.5 rounded-sm flex flex-col justify-between hover:border-stone-700 transition"
                            >
                              <div className="text-left font-sans">
                                <span className="text-[9px] text-stone-500 uppercase font-bold block">
                                  {item.type}
                                </span>
                                <h5 className="text-xs font-bold text-stone-200 mt-1 truncate">
                                  {item.name}
                                </h5>
                                <div className="text-[10px] text-emerald-400 font-bold mt-2">
                                  {Object.entries(item.modifiers).map(([st, vl]) => `+${vl} ${st.toUpperCase()}`)}
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-stone-850 flex items-center justify-between font-sans">
                                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                  <div className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.5)]"></div> {item.price}g
                                </span>
                                <UiButton
                                  disabled={!canAfford}
                                  onClick={() => buyMerchantItem(item.id)}
                                  className="!min-w-0 !px-4"
                                >
                                  Buy
                                </UiButton>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-stone-500 italic font-sans font-bold">
                        SOLD OUT!
                      </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-stone-800 font-sans">
                      <UiButton onClick={proceedToNextRoom}>
                        Leave Shop & Proceed
                      </UiButton>
                    </div>
                  </div>
                )}

                {/* 5. ROOM TYPE: TRAP */}
                {activeRoom!.type === 'Trap' && (
                  <div className="my-auto py-4 text-center max-w-xl mx-auto animate-fade-in">
                    <span className="text-5xl block mb-3">🕸️</span>
                    <h4 className="text-base font-bold text-stone-200 uppercase tracking-wide">Hidden Spikes & Dart Trap</h4>
                    <p className="text-xs text-stone-400 mt-2 leading-relaxed font-sans">
                      Riddle pressure mechanisms blocks the main vault gateway. Draft a specialist to bypass the plates:
                    </p>

                    {!expedition.activeRoomChoiceMade ? (
                      <div className="space-y-2 mt-6 max-h-[180px] overflow-y-auto pr-1">
                        {party
                          .filter((h) => h.hp > 0)
                          .map((hero) => {
                            const modStats = getModifiedStats(hero, guild.relics);
                            const spdChance = Math.round(Math.min(0.95, 0.35 + modStats.speed * 0.04) * 100);
                            const defChance = Math.round(Math.min(0.90, 0.30 + modStats.defense * 0.04) * 100);
                            const lckChance = Math.round(Math.min(0.95, 0.25 + modStats.luck * 0.05) * 100);

                            return (
                              <div
                                key={hero.id}
                                className="bg-stone-900/50 border border-stone-850 p-2.5 rounded-sm flex flex-col sm:flex-row justify-between items-center gap-3 text-left font-sans"
                              >
                                <div className="flex items-center gap-2">
                                  <Portrait
                                    heroClass={hero.heroClass}
                                    portraitSeed={hero.portraitSeed}
                                    size="sm"
                                  />
                                  <div>
                                    <h5 className="text-xs font-bold text-stone-200 uppercase">{hero.name}</h5>
                                    <span className="text-[10px] text-stone-400 font-semibold">
                                      Lvl {hero.level} {hero.heroClass}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => handleTrapChoice(hero.id, 'speed')}
                                    className="bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-stone-750 text-[9px] text-stone-300 font-bold uppercase tracking-wider py-1 px-2.5 rounded-sm transition-all cursor-pointer"
                                  >
                                    Sneak ({spdChance}%)
                                  </button>
                                  <button
                                    onClick={() => handleTrapChoice(hero.id, 'defense')}
                                    className="bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-stone-750 text-[9px] text-stone-300 font-bold uppercase tracking-wider py-1 px-2.5 rounded-sm transition-all cursor-pointer"
                                  >
                                    Block ({defChance}%)
                                  </button>
                                  <button
                                    onClick={() => handleTrapChoice(hero.id, 'luck')}
                                    className="bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-stone-750 text-[9px] text-stone-300 font-bold uppercase tracking-wider py-1 px-2.5 rounded-sm transition-all cursor-pointer"
                                  >
                                    Lucky ({lckChance}%)
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <UiButton className="mt-6" onClick={proceedToNextRoom}>
                        Bypass Trap & Proceed
                      </UiButton>
                    )}
                  </div>
                )}

                {/* 6. ROOM TYPE: MYSTERY EVENT */}
                {activeRoom!.type === 'Mystery Event' && (
                  <div className="my-auto py-4 text-center max-w-xl mx-auto animate-fade-in">
                    {activeRoom!.mysteryEvent ? (
                      <div>
                        <span className="text-5xl block mb-3 animate-pulse">📜</span>
                        <h4 className="text-base font-bold text-purple-400 uppercase tracking-wide">
                          {activeRoom!.mysteryEvent.title}
                        </h4>
                        <p className="text-xs text-stone-300 italic mt-2 leading-relaxed bg-stone-950/60 p-3 rounded-sm border border-stone-850/60 font-serif">
                          &ldquo;{activeRoom!.mysteryEvent.description}&rdquo;
                        </p>

                        {!expedition.activeRoomChoiceMade ? (
                          <div className="space-y-2 mt-6 font-sans">
                            {activeRoom!.mysteryEvent.choices.map((choice, i) => {
                              // Verify if any gold or level requirement exists
                              const meetsGoldReq = choice.requirements?.gold
                                ? guild.gold >= choice.requirements.gold
                                : true;
                              const meetsLevelReq = choice.requirements?.minLevel
                                ? party.some((h) => h.level >= (choice.requirements?.minLevel || 0))
                                : true;
                              const allowed = meetsGoldReq && meetsLevelReq;

                              return (
                                <button
                                  key={i}
                                  disabled={!allowed}
                                  onClick={() => makeEventChoice(i)}
                                  className={`w-full text-left p-3.5 rounded-sm border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                                    allowed
                                      ? 'bg-stone-900/60 border-stone-850 hover:border-purple-600 hover:bg-stone-900'
                                      : 'bg-stone-950/20 border-stone-900/40 opacity-40 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="font-bold text-stone-200 uppercase tracking-wide">{choice.text}</div>
                                  <div className="text-[10px] text-stone-400 mt-1 leading-normal">
                                    {choice.description}
                                  </div>
                                  {choice.requirements && (
                                    <div className="text-[9px] text-rose-400 mt-1.5 font-mono font-bold uppercase tracking-wider">
                                      Req:{' '}
                                      {choice.requirements.gold && `${choice.requirements.gold} Gold `}
                                      {choice.requirements.minLevel &&
                                        `Min Lvl ${choice.requirements.minLevel} hero`}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-6 flex flex-col items-center">
                            <div className="text-xs bg-purple-950/30 text-purple-300 py-3.5 px-4 border border-purple-500/20 rounded-sm max-w-sm mb-6 leading-relaxed font-sans font-semibold uppercase tracking-wide">
                              {expedition.selectedEventOutcomeText}
                            </div>
                            <UiButton onClick={proceedToNextRoom}>
                              Collect Outcome & Proceed
                            </UiButton>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-500 text-xs italic font-sans">Event completed.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrolling Expedition Logger Board */}
          <div className={`bg-stone-900/20 ${uiSectionFrame} p-4 flex flex-col min-h-[160px] max-h-[220px]`}>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mb-2 border-b border-stone-850/60 pb-1 flex justify-between items-center font-sans">
              <span>Expedition Battle Log Console</span>
              {combatMode === 'auto' && !expedition?.activeRoomChoiceMade && (
                <span className="text-cyan-400 animate-pulse text-[9px] normal-case tracking-normal">
                  • Auto-battle
                </span>
              )}
            </h4>

            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed pr-1 space-y-1.5 scrollbar-thin">
              {logs.map((log) => (
                <div key={log.id} className={getLogColorClass(log.type)}>
                  {log.text}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
