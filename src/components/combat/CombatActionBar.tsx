/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Swords, Zap, Sparkles, Heart, ShieldCheck } from 'lucide-react';
import { CombatActionType, CombatState, Hero, Monster } from '../../types';

const ACTION_DEFS: Array<[CombatActionType, string, React.ElementType]> = [
  ['attack', 'Attack', Swords],
  ['skill', 'Skill', Zap],
  ['spell', 'Spell', Sparkles],
  ['item', 'Item', Heart],
  ['defend', 'Defend', ShieldCheck],
];

/** Does this action require an enemy to be selected before it can fire? */
function actionNeedsEnemy(action: CombatActionType, heroClass: Hero['heroClass']): boolean {
  if (action === 'attack' || action === 'skill') return true;
  if (action === 'spell') return heroClass !== 'Cleric' && heroClass !== 'Mage';
  return false;
}

/** Does this action require an ally to be selected (defaults to weakest ally if none picked)? */
function actionNeedsAlly(action: CombatActionType, heroClass: Hero['heroClass']): boolean {
  return action === 'spell' && heroClass === 'Cleric';
}

function pickDefaultAllyId(party: Hero[], excludeId: string): string | null {
  const allies = party.filter((h) => h.hp > 0 && h.id !== excludeId);
  if (allies.length === 0) return null;
  return [...allies].sort((a, b) => a.hp - b.hp)[0]?.id ?? null;
}

interface CombatActionBarProps {
  activeHero: Hero;
  party: Hero[];
  monsters: Monster[];
  combat: CombatState;
  selectedTargetId: string | null;
  actionPending: boolean;
  onSubmit: (action: CombatActionType, targetId?: string) => void;
}

export const CombatActionBar: React.FC<CombatActionBarProps> = ({
  activeHero,
  party,
  monsters,
  combat,
  selectedTargetId,
  actionPending,
  onSubmit,
}) => {
  const enemySelected = Boolean(selectedTargetId && monsters.some((m) => m.id === selectedTargetId && m.hp > 0));
  const allySelected = Boolean(selectedTargetId && party.some((h) => h.id === selectedTargetId && h.hp > 0));
  const targetName =
    monsters.find((m) => m.id === selectedTargetId)?.name ??
    party.find((h) => h.id === selectedTargetId)?.name ??
    null;

  return (
    <div className="mt-3 pt-3 border-t border-stone-800 space-y-2 font-sans">
      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">
        Command {activeHero.name}
        {targetName ? ` → ${targetName}` : ' (select a foe for Attack / Skill)'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ACTION_DEFS.map(([action, label, Icon]) => {
          const needsEnemy = actionNeedsEnemy(action, activeHero.heroClass);
          const needsAlly = actionNeedsAlly(action, activeHero.heroClass);
          const hasDefaultAlly = needsAlly && Boolean(pickDefaultAllyId(party, activeHero.id));
          const disabled =
            actionPending ||
            (needsEnemy && !enemySelected) ||
            (needsAlly && !allySelected && !hasDefaultAlly) ||
            (action === 'item' && (combat.itemUsesRemaining[activeHero.id] ?? 0) <= 0);

          return (
            <button
              key={action}
              type="button"
              disabled={disabled}
              onClick={() => {
                let targetId: string | undefined;
                if (needsEnemy) {
                  targetId = selectedTargetId ?? undefined;
                } else if (needsAlly) {
                  targetId = allySelected ? selectedTargetId! : pickDefaultAllyId(party, activeHero.id) ?? undefined;
                }
                onSubmit(action, targetId);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider border transition ${
                disabled
                  ? 'bg-stone-950 text-stone-600 border-stone-850 cursor-not-allowed'
                  : 'bg-stone-900 text-stone-200 border-stone-700 hover:border-amber-600 hover:text-amber-400 cursor-pointer'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
