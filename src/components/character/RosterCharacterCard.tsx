/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Equipment, Hero, Relic } from '../../types';
import {
  formatDurationMs,
  getAutoReviveRemainingMs,
  getHealCost,
  getInstantReviveCost,
} from '../../sanctuary';
import { Trash2 } from 'lucide-react';
import { CharacterCard } from './CharacterCard';
import { heroToCharacterCardData, EquipmentSlotKey } from './characterCardData';

type GameSlot = 'weapon' | 'armor' | 'accessory';

/** Maps the paperdoll slot keys the game actually uses to gear slot types. */
const SLOT_TO_GAME: Partial<Record<EquipmentSlotKey, GameSlot>> = {
  mainHand: 'weapon',
  chest: 'armor',
  ring: 'accessory',
};

const INTERACTIVE_SLOTS: EquipmentSlotKey[] = ['mainHand', 'chest', 'ring'];

interface RosterCharacterCardProps {
  hero: Hero;
  healerStation?: number;
  isSelected?: boolean;
  activeRelics?: Relic[];
  guildInventory?: Equipment[];
  onSelect?: () => void;
  onEquip?: (itemId: string, slot: GameSlot) => void;
  onUnequip?: (slot: GameSlot) => void;
  onHeal?: () => void;
  onRevive?: () => void;
  onDismiss?: () => void;
  /** Disable gear/roster mutations while an expedition is active. */
  isExpeditionMode?: boolean;
}

/**
 * Roster entry built on the pixel-perfect {@link CharacterCard}. The art card is
 * the visual; management actions (equip/unequip, heal, revive, dismiss) live in a
 * compact control strip beneath it. Clicking an equipped weapon/armor/accessory
 * slot unequips it; empty slots are filled via the pickers.
 */
export const RosterCharacterCard: React.FC<RosterCharacterCardProps> = ({
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
  isExpeditionMode = false,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (hero.status !== 'Dead') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hero.status, hero.id]);

  const data = heroToCharacterCardData(hero, activeRelics);
  const canManage = !isExpeditionMode && hero.status !== 'Expedition';

  const availableGearForSlot = (type: GameSlot) =>
    guildInventory.filter((item) => item.type === type);

  const handleSlotClick = (slot: EquipmentSlotKey) => {
    const gameSlot = SLOT_TO_GAME[slot];
    if (!gameSlot || !canManage) return;
    const equipped = hero.equipment[gameSlot];
    if (equipped) onUnequip?.(gameSlot);
  };

  const healCost = getHealCost(hero, healerStation);
  const reviveCost = getInstantReviveCost(hero, healerStation);
  const autoRemaining = getAutoReviveRemainingMs(hero, healerStation, now);

  const statusBadge = (() => {
    if (hero.status === 'Dead') {
      return { text: 'Fallen', cls: 'bg-red-500/10 text-red-400 border-red-500/30' };
    }
    if (hero.status === 'Expedition') {
      return { text: 'On Expedition', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' };
    }
    if (hero.hp < hero.maxHp * 0.4) {
      return { text: 'Injured', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
    }
    return { text: 'Ready', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  })();

  const slotPickers: Array<{ slot: GameSlot; label: string }> = [
    { slot: 'weapon', label: 'Weapon' },
    { slot: 'armor', label: 'Armor' },
    { slot: 'accessory', label: 'Trinket' },
  ];

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col rounded-md border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.2)] scale-[1.01]'
          : 'border-stone-850 hover:border-stone-700'
      }`}
    >
      {/* Status badge overlay */}
      <span
        className={`absolute top-2 right-2 z-20 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border font-sans ${statusBadge.cls}`}
      >
        {statusBadge.text}
      </span>

      {/* The art card */}
      <CharacterCard
        data={data}
        onSlotClick={canManage ? handleSlotClick : undefined}
        interactiveSlots={INTERACTIVE_SLOTS}
        className="w-full"
      />

      {/* Control strip */}
      {canManage && (
        <div className="mt-2 flex flex-col gap-2 font-sans" onClick={(e) => e.stopPropagation()}>
          {/* Equip pickers for empty functional slots */}
          <div className="flex flex-wrap gap-1.5">
            {slotPickers.map(({ slot, label }) => {
              const equipped = hero.equipment[slot];
              const options = availableGearForSlot(slot);
              if (equipped) {
                return (
                  <button
                    key={slot}
                    onClick={() => onUnequip?.(slot)}
                    className="inline-flex items-center gap-1 bg-stone-900 border border-stone-800 hover:border-rose-700 text-stone-300 hover:text-rose-400 text-[10px] py-1 px-2 rounded-sm uppercase tracking-wider font-bold transition cursor-pointer"
                    title={`Unequip ${equipped.name}`}
                  >
                    <Trash2 size={11} /> {label}
                  </button>
                );
              }
              if (options.length === 0) {
                return (
                  <span
                    key={slot}
                    className="inline-flex items-center bg-stone-950 border border-stone-850 text-stone-600 text-[10px] py-1 px-2 rounded-sm uppercase tracking-wider font-bold"
                  >
                    {label}: —
                  </span>
                );
              }
              return (
                <select
                  key={slot}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) onEquip?.(e.target.value, slot);
                  }}
                  className="bg-stone-900 border border-stone-800 text-[10px] text-stone-300 py-1 px-1.5 rounded-sm cursor-pointer max-w-[110px]"
                >
                  <option value="">Equip {label}</option>
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              );
            })}
          </div>

          {/* Heal / Revive / Dismiss */}
          <div className="flex items-center gap-2">
            {hero.status === 'Dead' ? (
              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={() => onRevive?.()}
                  className="w-full bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 hover:border-red-600 font-bold py-1.5 px-3 rounded-sm text-[11px] uppercase tracking-widest transition shadow-md cursor-pointer"
                >
                  Instant Revive ({reviveCost}g)
                </button>
                <p className="text-[9px] text-stone-500 font-semibold uppercase tracking-wider text-center">
                  {autoRemaining == null
                    ? 'Sanctuary resting…'
                    : autoRemaining <= 0
                      ? 'Ready — refresh to wake'
                      : `Free revive in ${formatDurationMs(autoRemaining)}`}
                </p>
              </div>
            ) : hero.hp < hero.maxHp || hero.morale < 100 ? (
              <button
                onClick={() => onHeal?.()}
                className="flex-1 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-900/30 hover:border-emerald-600 font-bold py-1.5 px-3 rounded-sm text-[11px] uppercase tracking-widest transition shadow-md cursor-pointer"
              >
                Mend ({healCost}g)
              </button>
            ) : (
              <div className="flex-1 text-stone-500 text-[10px] italic font-semibold uppercase tracking-wider">
                Fully Rested
              </div>
            )}

            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to dismiss ${hero.name}? Any equipped gear will return to your inventory.`
                  )
                ) {
                  onDismiss?.();
                }
              }}
              className="px-2.5 py-1.5 bg-stone-900 hover:bg-red-950/40 border border-stone-850 hover:border-red-900/30 text-stone-400 hover:text-red-400 rounded-sm text-[11px] uppercase font-bold tracking-wider transition cursor-pointer"
              title="Dismiss Adventurer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
