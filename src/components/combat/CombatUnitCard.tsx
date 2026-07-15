/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeroClass } from '../../types';
import { Portrait } from '../Portrait';

interface CombatUnitCardProps {
  name: string;
  hp: number;
  maxHp: number;
  isDead: boolean;
  /** Whose turn it currently is (initiative highlight). */
  isActiveTurn: boolean;
  /** Currently chosen as the target of the pending action. */
  isSelected: boolean;
  /** Whether clicking this card should register as a target selection. */
  selectable: boolean;
  onSelect?: () => void;
  heroClass?: HeroClass;
  portraitSeed?: string;
  monsterType?: string;
  avatarSeed?: string;
  size?: 'sm' | 'md';
}

/**
 * A single targetable combatant. Cards live in a `flex-wrap` row (never
 * negative-space/overlapping) so every card always gets its own click area,
 * regardless of party size or viewport width.
 */
export const CombatUnitCard: React.FC<CombatUnitCardProps> = ({
  name,
  hp,
  maxHp,
  isDead,
  isActiveTurn,
  isSelected,
  selectable,
  onSelect,
  heroClass,
  portraitSeed,
  monsterType,
  avatarSeed,
  size = 'md',
}) => {
  const hpPct = isDead ? 0 : Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <button
      type="button"
      disabled={isDead || !selectable}
      onClick={onSelect}
      title={name}
      className={`relative flex flex-col items-center gap-1 rounded-sm border p-2 w-[86px] shrink-0 transition ${
        isDead
          ? 'opacity-30 border-stone-850 cursor-not-allowed'
          : isSelected
            ? 'border-amber-500 bg-stone-900/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            : isActiveTurn
              ? 'border-red-600 bg-stone-900/60'
              : selectable
                ? 'border-stone-850 bg-stone-900/40 hover:border-stone-600 cursor-pointer'
                : 'border-stone-850 bg-stone-900/40 cursor-default'
      }`}
    >
      <Portrait
        heroClass={heroClass}
        portraitSeed={portraitSeed}
        monsterType={monsterType}
        avatarSeed={avatarSeed}
        size={size}
        isDead={isDead}
      />
      <span className="text-[10px] font-bold text-stone-200 truncate max-w-full uppercase">
        {name}
      </span>
      <div className="w-full h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
        <div
          className="h-full bg-red-600 rounded-full transition-all duration-300"
          style={{ width: `${hpPct}%` }}
        />
      </div>
      <span className="text-[8px] text-stone-400 font-mono font-bold">
        {isDead ? 0 : hp}/{maxHp} HP
      </span>
    </button>
  );
};
