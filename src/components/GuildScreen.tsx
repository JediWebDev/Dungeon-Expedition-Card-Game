/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { HeroCard } from './HeroCard';
import { Portrait } from './Portrait';
import { getModifiedStats } from '../utils';
import { DUNGEON_TEMPLATES } from '../data';
import {
  Users,
  Sparkles,
  ShoppingBag,
  ArrowUpCircle,
  Compass,
  ArrowRight,
  UserPlus,
  Play
} from 'lucide-react';

export const GuildScreen: React.FC = () => {
  const {
    guild,
    startExpedition,
    recruitHero,
    dismissHero,
    buyEquipment,
    sellEquipment,
    equipItem,
    unequipItem,
    upgradeBuilding,
    healHeroWithGold,
    reviveHero,
    activeTab,
    setActiveTab,
    selectedHeroId,
    setSelectedHeroId
  } = useGame();

  // Party selection states for embarking
  const [showEmbarkDrawer, setShowEmbarkDrawer] = useState(false);
  const [selectedPartyHeroIds, setSelectedPartyHeroIds] = useState<string[]>([]);
  const [selectedDungeonId, setSelectedDungeonId] = useState(DUNGEON_TEMPLATES[0].id);

  const selectedDungeon = DUNGEON_TEMPLATES.find((d) => d.id === selectedDungeonId) || DUNGEON_TEMPLATES[0];

  // Helper for tab styling
  const tabClass = (tab: 'roster' | 'recruit' | 'armory' | 'upgrades') => {
    return `flex items-center gap-2 py-3 px-4 rounded-sm text-xs font-sans font-bold uppercase tracking-widest transition-all border ${
      activeTab === tab
        ? 'bg-amber-900/20 border-amber-600/50 text-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.2)]'
        : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/70'
    }`;
  };

const idleHeroes = guild.roster.filter((h) => h.status === 'Idle');

  // Toggle party hero selection
  const handleTogglePartyHero = (heroId: string) => {
    setSelectedPartyHeroIds((prev) => {
      if (prev.includes(heroId)) {
        return prev.filter((id) => id !== heroId);
      }
      if (prev.length >= 4) {
        // limit party size to 4
        return prev;
      }
      return [...prev, heroId];
    });
  };

  // Launch the expedition party
  const handleEmbark = () => {
    if (selectedPartyHeroIds.length === 0) return;
    startExpedition(selectedDungeon.id, selectedPartyHeroIds);
    // Reset selection drawer
    setSelectedPartyHeroIds([]);
    setShowEmbarkDrawer(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-transparent relative z-10">
      {/* Tab Navigation Hub */}
      <div className="flex flex-wrap gap-2.5 mb-6 border-b border-stone-800 pb-4">
        <button onClick={() => setActiveTab('roster')} className={tabClass('roster')}>
          <Users size={16} /> Roster ({guild.roster.length}/{guild.upgrades.maxRoster})
        </button>
        <button onClick={() => setActiveTab('recruit')} className={tabClass('recruit')}>
          <UserPlus size={16} /> Recruiting Hall ({guild.recruitStock.length})
        </button>
        <button onClick={() => setActiveTab('armory')} className={tabClass('armory')}>
          <ShoppingBag size={16} /> Marketplace & Vault
        </button>
        <button onClick={() => setActiveTab('upgrades')} className={tabClass('upgrades')}>
          <ArrowUpCircle size={16} /> Guild Chamber Upgrades
        </button>
      </div>

      {/* Roster Tab */}
      {activeTab === 'roster' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Action Header bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-stone-900/40 p-5 rounded-sm border border-stone-800">
            <div>
              <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                🛡️ Hired Adventurers
              </h2>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                Manage your guild roster, equip gear, heal wounds, and prepare expedition campaigns.
              </p>
            </div>
            {idleHeroes.length > 0 && (
              <button
                onClick={() => setShowEmbarkDrawer(true)}
                className="bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 font-sans font-bold py-2.5 px-5 rounded-sm text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-amber-800/60 hover:border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.15)] active:scale-95 cursor-pointer"
              >
                <Play size={14} fill="currentColor" /> Form Expedition Party
              </button>
            )}
          </div>

          {/* Grid of Hired Heroes */}
          {guild.roster.length === 0 ? (
            <div className="text-center py-16 bg-stone-900/10 border border-dashed border-stone-800 rounded-sm">
              <Users className="mx-auto text-stone-600 mb-3" size={44} />
              <p className="text-stone-300 font-medium font-sans">Your guild is currently vacant!</p>
              <p className="text-xs text-stone-500 mt-1 mb-4 font-sans">
                Head to the Recruiting Hall tab to hire new mercenary fighters.
              </p>
              <button
                onClick={() => setActiveTab('recruit')}
                className="text-amber-400 border border-amber-500/30 hover:border-amber-500 text-xs py-1.5 px-4 rounded-lg transition"
              >
                Go Recruit Hall
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-1 flex-1 pb-8">
              {guild.roster.map((hero) => (
                <HeroCard
                  key={hero.id}
                  hero={hero}
                  healerStation={guild.upgrades.healerStation}
                  isSelected={selectedHeroId === hero.id}
                  guildInventory={guild.inventory}
                  onSelect={() => setSelectedHeroId(hero.id)}
                  onEquip={(itemId, slot) => equipItem(hero.id, itemId, slot)}
                  onUnequip={(slot) => unequipItem(hero.id, slot)}
                  onHeal={() => healHeroWithGold(hero.id)}
                  onRevive={() => reviveHero(hero.id)}
                  onDismiss={() => dismissHero(hero.id)}
                  activeRelics={guild.relics}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recruiting Hall Tab */}
      {activeTab === 'recruit' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mb-6 bg-stone-900/30 p-4 border border-stone-800 rounded-sm">
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
              🍻 The Recruiting Tavern
            </h2>
            <p className="text-xs text-stone-400 mt-1 font-sans">
              Hire specialized fighters, healers, and mages. Candidates auto-refresh after expeditions.
            </p>
          </div>

          {guild.recruitStock.length === 0 ? (
            <div className="text-center py-16 bg-stone-900/10 border border-dashed border-stone-800 rounded-sm flex-1 flex flex-col justify-center">
              <Sparkles className="mx-auto text-stone-600 mb-3" size={40} />
              <p className="text-stone-300 font-medium font-sans">Tavern is currently empty</p>
              <p className="text-xs text-stone-500 mt-1 font-sans">
                More mercenaries will arrive once you complete or return from active dungeon expeditions!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 overflow-y-auto pr-1 flex-1 pb-8">
              {guild.recruitStock.map((candidate) => {
                const price = candidate.level * 100;
                const canAfford = guild.gold >= price;
                const baseStats = getModifiedStats(candidate);
                const hasRosterSpace = guild.roster.length < guild.upgrades.maxRoster;

                return (
                  <div
                    key={candidate.id}
                    className="bg-stone-900/80 border border-stone-800 rounded-sm p-5 flex flex-col justify-between hover:border-amber-900/50 transition-all shadow-md"
                  >
                    <div>
                      <div className="flex gap-4 items-start mb-4">
                        <Portrait
                          heroClass={candidate.heroClass}
                          portraitSeed={candidate.portraitSeed}
                          size="md"
                        />
                        <div>
                          <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-amber-500 block">
                            Lvl {candidate.level} {candidate.heroClass}
                          </span>
                          <h4 className="text-base font-bold text-stone-100">{candidate.name}</h4>
                          <span className="text-xs text-stone-400 font-sans flex items-center gap-1 mt-1 font-semibold uppercase tracking-wider">
                            🩸 HP: {baseStats.maxHp} | ⚔️ ATK: {baseStats.attack}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1.5 font-sans">
                          Traits
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {candidate.traits.map((t, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-stone-950 text-stone-300 px-2 py-0.5 rounded border border-stone-800 font-sans font-semibold uppercase tracking-wider"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-stone-400 italic mb-5 leading-relaxed font-serif">
                        &ldquo;{candidate.flavorText}&rdquo;
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3 font-sans">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                        <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                        {price} GOLD
                      </div>

                      <button
                        disabled={!canAfford || !hasRosterSpace}
                        onClick={() => recruitHero(candidate.id)}
                        className={`font-bold py-2 px-4 rounded-sm text-[11px] uppercase tracking-widest transition flex items-center gap-1.5 border cursor-pointer ${
                          canAfford && hasRosterSpace
                            ? 'bg-amber-900/20 text-amber-500 border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.1)]'
                            : 'bg-stone-900 text-stone-600 border-stone-850 cursor-not-allowed'
                        }`}
                      >
                        {hasRosterSpace ? 'Hire Adventurer' : 'Roster Full'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Marketplace & Vault Tab */}
      {activeTab === 'armory' && (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-6 pb-8">
          {/* Marketplace Buying Station (Left/Top) */}
          <div className="flex-1 flex flex-col min-h-0 bg-stone-900/20 p-5 rounded-sm border border-stone-800">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                🛍️ Guild Merchant Bazaar
              </h2>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                Purchase enchanted armor and high-rarity accessories. Restocks automatically.
              </p>
            </div>

            {guild.shopStock.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-800 rounded-sm flex-1 flex flex-col justify-center">
                <p className="text-stone-500 text-xs italic font-sans">All items sold out!</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {guild.shopStock.map((item) => {
                  const canAfford = guild.gold >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="bg-stone-900/80 border border-stone-800 p-4 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-amber-900/30 transition shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-widest border px-1.5 py-0.5 rounded ${
                              item.rarity === 'legendary'
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : item.rarity === 'epic'
                                ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                                : item.rarity === 'rare'
                                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                : 'border-stone-700/30 bg-stone-700/10 text-stone-400'
                            }`}
                          >
                            {item.rarity}
                          </span>
                          <span className="text-[10px] text-stone-500 uppercase font-sans font-semibold">
                            {item.type}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-100 mt-1">{item.name}</h4>
                        <p className="text-xs text-stone-400 italic mt-0.5 font-serif">{item.description}</p>
                        {/* Stats Modifiers listed */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-emerald-400 font-sans font-bold">
                          {Object.entries(item.modifiers).map(([stat, val]) => (
                            <span key={stat}>
                              +{val} {stat === 'maxHp' ? 'HP' : stat.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-stone-800 font-sans">
                        <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> {item.price}g
                        </span>
                        <button
                          disabled={!canAfford}
                          onClick={() => buyEquipment(item.id)}
                          className={`w-full sm:w-auto font-bold py-1.5 px-3 rounded-sm text-[10px] uppercase tracking-wider transition border cursor-pointer ${
                            canAfford
                              ? 'bg-amber-900/20 text-amber-500 border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600'
                              : 'bg-stone-900 text-stone-600 border-stone-850 cursor-not-allowed'
                          }`}
                        >
                          Buy Item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vault Storage Sell (Right/Bottom) */}
          <div className="flex-1 flex flex-col min-h-0 bg-stone-900/20 p-5 rounded-sm border border-stone-800">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                🗄️ Vault Storage Box
              </h2>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                Resell surplus weapons or armor back to traveling traders for 40% value.
              </p>
            </div>

            {guild.inventory.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-800 rounded-sm flex-1 flex flex-col justify-center">
                <ShoppingBag className="mx-auto text-stone-700 mb-2" size={32} />
                <p className="text-stone-400 text-xs font-sans font-semibold uppercase tracking-wider">Guild Storage is Empty</p>
                <p className="text-[10px] text-stone-500 mt-1 max-w-[200px] mx-auto leading-normal font-sans">
                  Gather gear from successful dungeon drops or buy them from the Bazaar.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {guild.inventory.map((item) => {
                  const resellValue = Math.round(item.price * 0.4);
                  return (
                    <div
                      key={item.id}
                      className="bg-stone-950 border border-stone-800 p-3.5 rounded-sm flex justify-between items-center gap-4 hover:bg-stone-900/40 transition-all border"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={
                              item.rarity === 'legendary'
                                ? 'text-amber-400 font-bold'
                                : item.rarity === 'epic'
                                ? 'text-purple-400'
                                : item.rarity === 'rare'
                                ? 'text-cyan-400'
                                : 'text-stone-400'
                            }
                          >
                            {item.rarity}
                          </span>
                          <span className="text-stone-600">•</span>
                          <span className="text-stone-500 uppercase font-sans font-semibold">{item.type}</span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-200 truncate">{item.name}</h4>
                        {/* Stats list */}
                        <div className="flex flex-wrap gap-x-2.5 text-[10px] text-emerald-400 font-sans font-bold mt-1">
                          {Object.entries(item.modifiers).map(([stat, val]) => (
                            <span key={stat}>
                              +{val} {stat === 'maxHp' ? 'HP' : stat.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-stone-400 font-bold text-xs font-sans">
                          +{resellValue}g
                        </span>
                        <button
                          onClick={() => sellEquipment(item.id)}
                          className="text-rose-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-600 py-1 px-2.5 rounded-sm text-[10px] uppercase font-sans tracking-wider transition-all cursor-pointer"
                        >
                          Sell Item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upgrades Tab */}
      {activeTab === 'upgrades' && (
        <div className="flex flex-col flex-1 min-h-0 pb-8 animate-fade-in">
          <div className="mb-6 bg-stone-900/30 p-4 border border-stone-800 rounded-sm">
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
              🏰 Guildmaster Chamber Board
            </h2>
            <p className="text-xs text-stone-400 mt-1 font-sans">
              Spend gold earned from expeditions to expand facilities, unlock better recruits, and scale your operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1">
            {/* Upgrade 1: Roster Cap */}
            <div className="bg-stone-900/40 border border-stone-800 p-5 rounded-sm flex flex-col justify-between hover:border-amber-900/30 transition-all shadow-md">
              <div>
                <span className="text-xs text-amber-500 font-sans font-bold tracking-widest block uppercase mb-1">
                  Space Station Facility
                </span>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                  ⛺ Sleeping Quarters Annex
                </h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed font-sans">
                  Expand bunk beds and hire assistant clerks. Increases your maximum recruited adventurer capacity.
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm font-sans font-semibold">
                  <span className="text-stone-400">Current Cap:</span>
                  <span className="bg-stone-950 text-amber-400 font-bold px-2.5 py-0.5 rounded border border-stone-850">
                    {guild.upgrades.maxRoster} Heroes
                  </span>
                  <ArrowRight size={12} className="text-stone-600" />
                  <span className="text-emerald-400 font-bold">
                    {guild.upgrades.maxRoster + 2} Heroes
                  </span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-stone-800 flex items-center justify-between font-sans">
                {guild.upgrades.maxRoster >= 14 ? (
                  <span className="text-stone-500 text-xs italic">MAX QUARTERS LEVEL REACHED</span>
                ) : (
                  <>
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>{' '}
                      {[150, 300, 500, 800, 1200][Math.round((guild.upgrades.maxRoster - 6) / 2)]}g
                    </span>
                    <button
                      onClick={() => upgradeBuilding('maxRoster')}
                      disabled={
                        guild.gold <
                        [150, 300, 500, 800, 1200][Math.round((guild.upgrades.maxRoster - 6) / 2)]
                      }
                      className="bg-amber-900/20 text-amber-500 border border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 disabled:bg-stone-900 disabled:text-stone-600 disabled:border-stone-850 font-sans font-bold py-2 px-4 rounded-sm text-xs uppercase tracking-widest transition cursor-pointer"
                    >
                      Construct Expansion
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Upgrade 2: Recruit Quality */}
            <div className="bg-stone-900/40 border border-stone-800 p-5 rounded-sm flex flex-col justify-between hover:border-amber-900/30 transition-all shadow-md">
              <div>
                <span className="text-xs text-amber-500 font-sans font-bold tracking-widest block uppercase mb-1">
                  Human Resources Board
                </span>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                  📜 Tavern Hiring Agency
                </h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed font-sans">
                  Advertise higher payout bounds and sign with prestigious guilds. Attracts level-appropriate veterans with double traits pool.
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm font-sans font-semibold">
                  <span className="text-stone-400">Tavern Rank:</span>
                  <span className="bg-stone-950 text-amber-400 font-bold px-2.5 py-0.5 rounded border border-stone-850">
                    Tier {guild.upgrades.recruitQuality}
                  </span>
                  <ArrowRight size={12} className="text-stone-600" />
                  <span className="text-emerald-400 font-bold">
                    Tier {guild.upgrades.recruitQuality + 1}
                  </span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-stone-800 flex items-center justify-between font-sans">
                {guild.upgrades.recruitQuality >= 5 ? (
                  <span className="text-stone-500 text-xs italic">MAX HIRING TIER REACHED</span>
                ) : (
                  <>
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> {[200, 450, 800, 1500][guild.upgrades.recruitQuality - 1]}g
                    </span>
                    <button
                      onClick={() => upgradeBuilding('recruitQuality')}
                      disabled={guild.gold < [200, 450, 800, 1500][guild.upgrades.recruitQuality - 1]}
                      className="bg-amber-900/20 text-amber-500 border border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 disabled:bg-stone-900 disabled:text-stone-600 disabled:border-stone-850 font-sans font-bold py-2 px-4 rounded-sm text-xs uppercase tracking-widest transition cursor-pointer"
                    >
                      Sign Contracts
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Upgrade 3: Shop Quality */}
            <div className="bg-stone-900/40 border border-stone-800 p-5 rounded-sm flex flex-col justify-between hover:border-amber-900/30 transition-all shadow-md">
              <div>
                <span className="text-xs text-amber-500 font-sans font-bold tracking-widest block uppercase mb-1">
                  Supply Procurement Chamber
                </span>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                  ⚔️ Master Blacksmith Anvil
                </h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed font-sans">
                  Invite legendary weaponsmith suppliers to set up permanent shops in your hall. Stocks Epic and Legendary equipment.
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm font-sans font-semibold">
                  <span className="text-stone-400">Store Stock Rank:</span>
                  <span className="bg-stone-950 text-amber-400 font-bold px-2.5 py-0.5 rounded border border-stone-850">
                    Lvl {guild.upgrades.shopQuality}
                  </span>
                  <ArrowRight size={12} className="text-stone-600" />
                  <span className="text-emerald-400 font-bold">
                    Lvl {guild.upgrades.shopQuality + 1}
                  </span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-stone-800 flex items-center justify-between font-sans">
                {guild.upgrades.shopQuality >= 5 ? (
                  <span className="text-stone-500 text-xs italic">MAX BLACKSMITH LEVEL REACHED</span>
                ) : (
                  <>
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> {[250, 500, 900, 1600][guild.upgrades.shopQuality - 1]}g
                    </span>
                    <button
                      onClick={() => upgradeBuilding('shopQuality')}
                      disabled={guild.gold < [250, 500, 900, 1600][guild.upgrades.shopQuality - 1]}
                      className="bg-amber-900/20 text-amber-500 border border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 disabled:bg-stone-900 disabled:text-stone-600 disabled:border-stone-850 font-sans font-bold py-2 px-4 rounded-sm text-xs uppercase tracking-widest transition cursor-pointer"
                    >
                      Renovate Forge
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Upgrade 4: Healer Station */}
            <div className="bg-stone-900/40 border border-stone-800 p-5 rounded-sm flex flex-col justify-between hover:border-amber-900/30 transition-all shadow-md">
              <div>
                <span className="text-xs text-amber-500 font-sans font-bold tracking-widest block uppercase mb-1">
                  Mending & Morale Chamber
                </span>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                  ⛪ Sanctuary Altar & Baths
                </h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed font-sans">
                  Set up warm springs and blessed altars inside your guild. Higher ranks reduce
                  instant heal/revive gold and shorten free Sanctuary rest timers for fallen heroes.
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm font-sans font-semibold">
                  <span className="text-stone-400">Altar Blessed Rank:</span>
                  <span className="bg-stone-950 text-amber-400 font-bold px-2.5 py-0.5 rounded border border-stone-850">
                    Lvl {guild.upgrades.healerStation}
                  </span>
                  <ArrowRight size={12} className="text-stone-600" />
                  <span className="text-emerald-400 font-bold">
                    Lvl {guild.upgrades.healerStation + 1}
                  </span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-stone-800 flex items-center justify-between font-sans">
                {guild.upgrades.healerStation >= 5 ? (
                  <span className="text-stone-500 text-xs italic">MAX SANCTUARY LEVEL REACHED</span>
                ) : (
                  <>
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> {[100, 250, 600, 1100][guild.upgrades.healerStation - 1]}g
                    </span>
                    <button
                      onClick={() => upgradeBuilding('healerStation')}
                      disabled={guild.gold < [100, 250, 600, 1100][guild.upgrades.healerStation - 1]}
                      className="bg-amber-900/20 text-amber-500 border border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 disabled:bg-stone-900 disabled:text-stone-600 disabled:border-stone-850 font-sans font-bold py-2 px-4 rounded-sm text-xs uppercase tracking-widest transition cursor-pointer"
                    >
                      Bless Altar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMBARKATION PARTY SELECTION DRAWER MODAL */}
      {showEmbarkDrawer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-950 border border-stone-850 rounded-sm max-w-4xl w-full p-6 md:p-8 flex flex-col max-h-[90vh] shadow-2xl relative">
<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(60,40,30,0.1),transparent)] pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-100 flex items-center gap-2 uppercase tracking-wide">
                    🏰 Prepare Expedition Campaign
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 font-sans">
                    Draft up to 4 alive, idle guild characters and pick which subterranean gate sector to conquer.
                  </p>
                </div>
                <button
                  onClick={() => setShowEmbarkDrawer(false)}
                  className="text-stone-400 hover:text-stone-200 border border-stone-800 hover:border-stone-700 p-1 px-3 rounded-sm text-xs uppercase tracking-wider font-sans bg-stone-900/50 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1 mb-6">
                {/* Left Column: Pick Heroes (Checkboxes) */}
                <div className="flex flex-col min-h-0">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-3 flex justify-between font-sans">
                    <span>Available Heroes ({selectedPartyHeroIds.length}/4 selected)</span>
                    {selectedPartyHeroIds.length === 0 && (
                      <span className="text-red-400 lowercase font-normal">Select at least 1 hero!</span>
                    )}
                  </h4>

                  {idleHeroes.length === 0 ? (
                    <div className="bg-stone-900/20 border border-stone-850 rounded-sm p-6 text-center text-xs text-stone-500 font-sans">
                      No idle heroes available. Go heal wounded/fainted heroes or hire some.
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {idleHeroes.map((hero) => {
                        const isSelected = selectedPartyHeroIds.includes(hero.id);
                        const isDead = hero.status === 'Dead';
                        const stats = getModifiedStats(hero, guild.relics);
                        return (
                          <div
                            key={hero.id}
                            onClick={() => !isDead && handleTogglePartyHero(hero.id)}
                            className={`flex items-center justify-between p-3 rounded-sm border cursor-pointer transition-all ${
                              isDead
                                ? 'bg-stone-950/20 opacity-40 border-stone-900 cursor-not-allowed'
                                : isSelected
                                ? 'bg-amber-900/10 border-amber-600/60 shadow-[0_0_10px_rgba(217,119,6,0.1)]'
                                : 'bg-stone-900/40 border-stone-850 hover:border-stone-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Portrait
                                heroClass={hero.heroClass}
                                portraitSeed={hero.portraitSeed}
                                size="sm"
                              />
                              <div className="font-sans">
                                <h5 className="text-sm font-bold text-stone-200">{hero.name}</h5>
                                <span className="text-[10px] text-stone-400">
                                  Lvl {hero.level} {hero.heroClass} • ❤️ HP {hero.hp}/{stats.maxHp}
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              disabled={isDead}
                              checked={isSelected}
                              readOnly
                              className="accent-amber-500 pointer-events-none w-4 h-4 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Pick Dungeon sector */}
                <div className="flex flex-col min-h-0 bg-stone-900/30 p-4 rounded-sm border border-stone-800">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-3 font-sans">
                    Select Dungeon Destination
                  </h4>

                  <div className="space-y-2 flex-1 overflow-y-auto mb-4">
                    {DUNGEON_TEMPLATES.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDungeonId(d.id)}
                        className={`p-3 rounded-sm border cursor-pointer transition-all ${
                          selectedDungeonId === d.id
                            ? 'bg-amber-900/10 border-amber-600/60 shadow-[0_0_10px_rgba(217,119,6,0.15)]'
                            : 'bg-stone-900/60 border-stone-850 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-stone-200">{d.name}</span>
                          <span className="text-amber-500 font-sans text-[10px] font-bold">
                            {'💀'.repeat(d.dangerRating)}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate mt-1 font-serif">{d.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Selected Dungeon Detail Info box */}
                  <div className="bg-stone-950 border border-stone-850 p-4 rounded-sm text-xs space-y-1.5 mt-auto font-sans">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Total Rooms:</span>
                      <span className="font-bold text-stone-200">{selectedDungeon.totalRooms} Rooms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Threat Grade:</span>
                      <span className="font-bold text-stone-200">Tier {selectedDungeon.dangerRating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Relic Reward:</span>
                      <span className="font-bold text-amber-400 uppercase tracking-wider">
                        {selectedDungeon.rewardsPreview}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Embark / Cancel Action bars */}
              <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row gap-3 items-center justify-between font-sans">
                <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                  Current Guild Level:{' '}
                  <span className="font-bold text-amber-500">Tier {guild.level}</span>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowEmbarkDrawer(false)}
                    className="flex-1 sm:flex-initial bg-stone-900 hover:bg-stone-800 border border-stone-850 hover:border-stone-700 text-stone-300 font-bold py-2 px-5 rounded-sm text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmbark}
                    disabled={selectedPartyHeroIds.length === 0}
                    className={`flex-1 sm:flex-initial font-bold py-2 px-6 rounded-sm text-xs uppercase tracking-widest transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                      selectedPartyHeroIds.length > 0
                        ? 'bg-amber-900/20 text-amber-500 border-amber-900/60 hover:bg-amber-900/40 hover:border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.15)]'
                        : 'bg-stone-900 text-stone-600 border-stone-850 cursor-not-allowed'
                    }`}
                  >
                    Embark Expedition <Compass size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
