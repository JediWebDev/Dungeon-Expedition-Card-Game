/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Hero, Equipment } from '../types';
import { Portrait } from './Portrait';
import { getModifiedStats } from '../utils';
import {
  formatDurationMs,
  getAutoReviveRemainingMs,
  getHealCost,
  getInstantReviveCost,
} from '../sanctuary';
import { Shield, Swords, Zap, Heart, Compass, Trash2 } from 'lucide-react';

interface HeroCardProps {
  hero: Hero;
  /** Sanctuary Altar rank — drives heal/revive gold and auto-revive timer. */
  healerStation?: number;
  isSelected?: boolean;
  activeRelics?: any[];
  guildInventory?: Equipment[];
  onSelect?: () => void;
  onEquip?: (itemId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  onUnequip?: (slot: 'weapon' | 'armor' | 'accessory') => void;
  onHeal?: () => void;
  onRevive?: () => void;
  onDismiss?: () => void;
  isExpeditionMode?: boolean; // if we are in active expedition, disable item change buttons
}

export const HeroCard: React.FC<HeroCardProps> = ({
  hero,
  healerStation = 1,
  isSelected = false,
  activeRelics = [],
  guildInventory = [],
  onSelect,
  onEquip,
  onUnequip,
  onHeal,
  onRevive,
  onDismiss,
  isExpeditionMode = false
}) => {
  const modStats = getModifiedStats(hero, activeRelics);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (hero.status !== 'Dead') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hero.status, hero.id]);

  // Helper for item rarity text color
  const getRarityClass = (rarity: Equipment['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-400 font-semibold';
      case 'epic':
        return 'text-purple-400 font-semibold';
      case 'rare':
        return 'text-cyan-400 font-semibold';
      default:
        return 'text-neutral-300';
    }
  };

  // Helper to render modifier value indicators
  const renderStatDiff = (statName: 'maxHp' | 'attack' | 'defense' | 'speed' | 'luck', baseVal: number) => {
    const modVal = modStats[statName];
    const diff = modVal - baseVal;
    if (diff > 0) {
      return <span className="text-emerald-400 text-xs ml-1 font-semibold">(+{diff})</span>;
    } else if (diff < 0) {
      return <span className="text-rose-400 text-xs ml-1 font-semibold">({diff})</span>;
    }
    return null;
  };

  // Filter guild inventory items that match slot type
  const availableGearForSlot = (type: 'weapon' | 'armor' | 'accessory') => {
    return guildInventory.filter((item) => item.type === type);
  };

  const healCost = getHealCost(hero, healerStation);
  const reviveCost = getInstantReviveCost(hero, healerStation);
  const autoRemaining = getAutoReviveRemainingMs(hero, healerStation, now);

  return (
    <div
      onClick={onSelect}
      className={`rounded-sm p-5 border text-left transition-all duration-200 cursor-pointer relative flex flex-col h-full ${
        isSelected
          ? 'bg-stone-900/90 border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.15)] scale-[1.01]'
          : 'bg-stone-900/40 border-stone-850 hover:border-stone-700 hover:bg-stone-900/60'
      } shadow-lg`}
    >
      {/* Top Banner Status badges */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 font-sans">
        {hero.status === 'Dead' && (
          <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
            Fallen
          </span>
        )}
        {hero.status === 'Expedition' && (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider animate-pulse">
            On Expedition
          </span>
        )}
        {hero.status === 'Idle' && hero.hp < hero.maxHp * 0.4 && (
          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
            Injured
          </span>
        )}
        {hero.status === 'Idle' && hero.hp >= hero.maxHp * 0.4 && (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
            Ready
          </span>
        )}
      </div>

      {/* Main Avatar + Name Block */}
      <div className="flex gap-4 items-start mb-4">
        <Portrait
          heroClass={hero.heroClass}
          portraitSeed={hero.portraitSeed}
          isDead={hero.status === 'Dead'}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-0.5 font-sans">
            Level {hero.level} {hero.heroClass}
          </div>
          <h3 className="text-base font-bold text-stone-100 truncate tracking-wide uppercase">{hero.name}</h3>

          {/* Level Exp progress bar */}
          <div className="mt-1.5 flex items-center gap-2 font-sans">
            <div className="flex-1 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-full"
                style={{ width: `${(hero.experience / hero.expNeeded) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-stone-400 font-mono font-semibold">
              {hero.experience}/{hero.expNeeded} XP
            </span>
          </div>

          {/* Morale Level Gauge */}
          <div className="mt-2 text-[11px] flex items-center gap-1.5 font-sans">
            <span className="text-stone-400 font-semibold">Morale:</span>
            <span
              className={`font-mono font-bold ${
                hero.morale >= 70
                  ? 'text-emerald-400'
                  : hero.morale >= 40
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {hero.morale}%
            </span>
            <div className="flex-1 h-1 bg-stone-950 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  hero.morale >= 70
                    ? 'bg-emerald-500'
                    : hero.morale >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${hero.morale}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Traits Section */}
      <div className="mb-4 flex flex-wrap gap-1.5 font-sans">
        {hero.traits.map((trait, i) => (
          <span
            key={i}
            className="text-[10px] bg-stone-950 text-stone-300 px-2 py-0.5 rounded-sm border border-stone-850 font-semibold"
          >
            ⚔️ {trait}
          </span>
        ))}
      </div>

      {/* HP Bar */}
      <div className="mb-4 bg-stone-950/60 border border-stone-850 p-2.5 rounded-sm">
        <div className="flex justify-between text-[11px] text-stone-400 mb-1 font-sans">
          <span className="flex items-center gap-1 font-semibold">
            <Heart size={11} className="text-red-400 fill-red-400/20" /> HP:
          </span>
          <span className="font-bold text-stone-200">
            {hero.status === 'Dead' ? 0 : hero.hp} / {modStats.maxHp}
          </span>
        </div>
        <div className="h-1.5 bg-stone-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-rose-700 rounded-full transition-all duration-300"
            style={{ width: `${hero.status === 'Dead' ? 0 : (hero.hp / modStats.maxHp) * 100}%` }}
          />
        </div>
      </div>

      {/* Base Stats Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-5 border-b border-stone-850 pb-4 font-sans">
        <div className="flex justify-between items-center text-stone-400">
          <span className="flex items-center gap-1 font-semibold">
            <Swords size={12} className="text-amber-500/80" /> Attack:
          </span>
          <span className="font-bold text-stone-200">
            {modStats.attack}
            {renderStatDiff('attack', hero.attack)}
          </span>
        </div>
        <div className="flex justify-between items-center text-stone-400">
          <span className="flex items-center gap-1 font-semibold">
            <Shield size={12} className="text-blue-400/80" /> Defense:
          </span>
          <span className="font-bold text-stone-200">
            {modStats.defense}
            {renderStatDiff('defense', hero.defense)}
          </span>
        </div>
        <div className="flex justify-between items-center text-stone-400">
          <span className="flex items-center gap-1 font-semibold">
            <Zap size={12} className="text-cyan-400/80" /> Speed:
          </span>
          <span className="font-bold text-stone-200">
            {modStats.speed}
            {renderStatDiff('speed', hero.speed)}
          </span>
        </div>
        <div className="flex justify-between items-center text-stone-400">
          <span className="flex items-center gap-1 font-semibold">
            <Compass size={12} className="text-purple-400/80" /> Luck:
          </span>
          <span className="font-bold text-stone-200">
            {modStats.luck}
            {renderStatDiff('luck', hero.luck)}
          </span>
        </div>
      </div>

      {/* Equipment Slots Block */}
      <div className="flex-1 flex flex-col justify-end font-sans">
        <h4 className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-2">
          Equipment Slots
        </h4>
        <div className="space-y-2 mb-4">
          {/* WEAPON SLOT */}
          <div className="bg-stone-950 p-2 rounded-sm border border-stone-850 flex items-center justify-between text-xs min-h-[38px]">
            {hero.equipment.weapon ? (
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[9px] text-stone-500 uppercase font-semibold block">Weapon</span>
                <span className={`truncate block text-xs ${getRarityClass(hero.equipment.weapon.rarity)}`}>
                  {hero.equipment.weapon.name}
                </span>
              </div>
            ) : (
              <span className="text-stone-500 italic text-[11px]">Empty Weapon Slot</span>
            )}
            {!isExpeditionMode && hero.status !== 'Expedition' && (
              <div className="flex items-center gap-1 shrink-0">
                {hero.equipment.weapon ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnequip?.('weapon');
                    }}
                    className="p-1 hover:bg-stone-900 text-stone-400 hover:text-rose-400 rounded-sm transition cursor-pointer"
                    title="Unequip Weapon"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : (
                  availableGearForSlot('weapon').length > 0 && (
                    <select
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) onEquip?.(e.target.value, 'weapon');
                      }}
                      className="bg-stone-900 border border-stone-800 text-[10px] text-stone-300 py-0.5 px-1.5 rounded-sm cursor-pointer max-w-[80px]"
                    >
                      <option value="">Equip</option>
                      {availableGearForSlot('weapon').map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>
            )}
          </div>

          {/* ARMOR SLOT */}
          <div className="bg-stone-950 p-2 rounded-sm border border-stone-850 flex items-center justify-between text-xs min-h-[38px]">
            {hero.equipment.armor ? (
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[9px] text-stone-500 uppercase font-semibold block">Armor</span>
                <span className={`truncate block text-xs ${getRarityClass(hero.equipment.armor.rarity)}`}>
                  {hero.equipment.armor.name}
                </span>
              </div>
            ) : (
              <span className="text-stone-500 italic text-[11px]">Empty Armor Slot</span>
            )}
            {!isExpeditionMode && hero.status !== 'Expedition' && (
              <div className="flex items-center gap-1 shrink-0">
                {hero.equipment.armor ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnequip?.('armor');
                    }}
                    className="p-1 hover:bg-stone-900 text-stone-400 hover:text-rose-400 rounded-sm transition cursor-pointer"
                    title="Unequip Armor"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : (
                  availableGearForSlot('armor').length > 0 && (
                    <select
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) onEquip?.(e.target.value, 'armor');
                      }}
                      className="bg-stone-900 border border-stone-800 text-[10px] text-stone-300 py-0.5 px-1.5 rounded-sm cursor-pointer max-w-[80px]"
                    >
                      <option value="">Equip</option>
                      {availableGearForSlot('armor').map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>
            )}
          </div>

          {/* ACCESSORY SLOT */}
          <div className="bg-stone-950 p-2 rounded-sm border border-stone-850 flex items-center justify-between text-xs min-h-[38px]">
            {hero.equipment.accessory ? (
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[9px] text-stone-500 uppercase font-semibold block">Accessory</span>
                <span className={`truncate block text-xs ${getRarityClass(hero.equipment.accessory.rarity)}`}>
                  {hero.equipment.accessory.name}
                </span>
              </div>
            ) : (
              <span className="text-stone-500 italic text-[11px]">Empty Accessory Slot</span>
            )}
            {!isExpeditionMode && hero.status !== 'Expedition' && (
              <div className="flex items-center gap-1 shrink-0">
                {hero.equipment.accessory ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnequip?.('accessory');
                    }}
                    className="p-1 hover:bg-stone-900 text-stone-400 hover:text-rose-400 rounded-sm transition cursor-pointer"
                    title="Unequip Accessory"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : (
                  availableGearForSlot('accessory').length > 0 && (
                    <select
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) onEquip?.(e.target.value, 'accessory');
                      }}
                      className="bg-stone-900 border border-stone-800 text-[10px] text-stone-300 py-0.5 px-1.5 rounded-sm cursor-pointer max-w-[80px]"
                    >
                      <option value="">Equip</option>
                      {availableGearForSlot('accessory').map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Guild Panel (Heal, Revive, Dismiss) */}
        {!isExpeditionMode && hero.status !== 'Expedition' && (
          <div className="mt-3 pt-3 border-t border-stone-850 flex items-center justify-between gap-2">
            {hero.status === 'Dead' ? (
              <div className="flex-1 flex flex-col gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevive?.();
                  }}
                  className="w-full bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 hover:border-red-600 font-bold py-1.5 px-3 rounded-sm text-xs uppercase tracking-widest transition shadow-md cursor-pointer"
                >
                  Instant Revive ({reviveCost}g)
                </button>
                <p className="text-[10px] text-stone-500 font-sans font-semibold uppercase tracking-wider text-center">
                  {autoRemaining == null
                    ? 'Sanctuary resting…'
                    : autoRemaining <= 0
                      ? 'Ready — refresh to wake'
                      : `Free revive in ${formatDurationMs(autoRemaining)}`}
                </p>
              </div>
            ) : hero.hp < hero.maxHp || hero.morale < 100 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHeal?.();
                }}
                className="flex-1 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-900/30 hover:border-emerald-600 font-bold py-1.5 px-3 rounded-sm text-xs uppercase tracking-widest transition shadow-md cursor-pointer"
              >
                Mend ({healCost}g)
              </button>
            ) : (
              <div className="text-stone-500 text-[11px] italic pr-2 font-semibold uppercase tracking-wider">Fully Rested</div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to dismiss ${hero.name}? Any equipped gear will return to your inventory.`)) {
                  onDismiss?.();
                }
              }}
              className="px-2.5 py-1.5 bg-stone-900 hover:bg-red-950/40 border border-stone-850 hover:border-red-900/30 text-stone-400 hover:text-red-400 rounded-sm text-xs uppercase font-bold tracking-wider transition cursor-pointer"
              title="Dismiss Adventurer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
