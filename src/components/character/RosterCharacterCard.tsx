/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Hero, Relic } from '../../types';
import {
  formatDurationMs,
  getAutoReviveRemainingMs,
  getHealCost,
  getInstantReviveCost,
} from '../../sanctuary';
import { CharacterCard } from './CharacterCard';
import { heroToCharacterCardData } from './characterCardData';
import { UiButton } from '../ui/UiButton';

interface RosterCharacterCardProps {
  hero: Hero;
  healerStation?: number;
  isSelected?: boolean;
  activeRelics?: Relic[];
  onSelect?: () => void;
  onOpenEquipment?: () => void;
  onHeal?: () => void;
  onRevive?: () => void;
  onDismiss?: () => void;
  /** Disable roster mutations while an expedition is active. */
  isExpeditionMode?: boolean;
}

/**
 * Roster entry. Click the card (or Manage Gear) to open the character equipment screen.
 */
export const RosterCharacterCard: React.FC<RosterCharacterCardProps> = ({
  hero,
  healerStation = 1,
  isSelected = false,
  activeRelics = [],
  onSelect,
  onOpenEquipment,
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

  const openGear = () => {
    onSelect?.();
    onOpenEquipment?.();
  };

  return (
    <div
      onClick={openGear}
      className={`group relative flex min-w-0 w-full flex-col overflow-hidden rounded-md border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.2)] scale-[1.01]'
          : 'border-stone-850 hover:border-stone-700'
      }`}
    >
      <span
        className={`absolute top-2 right-2 z-20 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border font-sans ${statusBadge.cls}`}
      >
        {statusBadge.text}
      </span>

      <CharacterCard data={data} className="w-full" />

      <div className="mt-2 flex w-full min-w-0 flex-col gap-2 font-sans" onClick={(e) => e.stopPropagation()}>
        {canManage && (
          <UiButton fullWidth size="sm" onClick={openGear}>
            Manage Gear
          </UiButton>
        )}

        <div className="flex w-full min-w-0 flex-col gap-2">
          {hero.status === 'Dead' ? (
            <div className="flex w-full min-w-0 flex-col gap-1">
              <UiButton fullWidth size="sm" variant="danger" onClick={() => onRevive?.()}>
                Instant Revive ({reviveCost}g)
              </UiButton>
              <p className="text-[9px] text-stone-500 font-semibold uppercase tracking-wider text-center">
                {autoRemaining == null
                  ? 'Sanctuary resting…'
                  : autoRemaining <= 0
                    ? 'Ready — refresh to wake'
                    : `Free revive in ${formatDurationMs(autoRemaining)}`}
              </p>
            </div>
          ) : hero.hp < hero.maxHp || hero.morale < 100 ? (
            <UiButton fullWidth size="sm" onClick={() => onHeal?.()}>
              Mend ({healCost}g)
            </UiButton>
          ) : (
            <div className="w-full text-center text-stone-500 text-[10px] italic font-semibold uppercase tracking-wider py-1">
              Fully Rested
            </div>
          )}

          <UiButton
            fullWidth
            size="sm"
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  `Are you sure you want to dismiss ${hero.name}? Any equipped gear will return to your inventory.`
                )
              ) {
                onDismiss?.();
              }
            }}
            title="Dismiss Adventurer"
          >
            Dismiss
          </UiButton>
        </div>
      </div>
    </div>
  );
};
