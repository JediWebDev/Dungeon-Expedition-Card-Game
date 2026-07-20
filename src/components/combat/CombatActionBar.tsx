/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CombatActionType, CombatState, Hero, Monster } from '../../types';
import { UiButton } from '../ui/UiButton';

const ACTION_DEFS: Array<[CombatActionType, string]> = [
  ['attack', 'Attack'],
  ['skill', 'Skill'],
  ['spell', 'Spell'],
  ['item', 'Item'],
  ['defend', 'Defend'],
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
        {ACTION_DEFS.map(([action, label]) => {
          const needsEnemy = actionNeedsEnemy(action, activeHero.heroClass);
          const needsAlly = actionNeedsAlly(action, activeHero.heroClass);
          const hasDefaultAlly = needsAlly && Boolean(pickDefaultAllyId(party, activeHero.id));
          const disabled =
            actionPending ||
            (needsEnemy && !enemySelected) ||
            (needsAlly && !allySelected && !hasDefaultAlly) ||
            (action === 'item' && (combat.itemUsesRemaining[activeHero.id] ?? 0) <= 0);

          return (
            <UiButton
              key={action}
              type="button"
              disabled={disabled}
              className="!min-w-0 !px-5"
              onClick={() => {
                let targetId: string | undefined;
                if (needsEnemy) {
                  targetId = selectedTargetId ?? undefined;
                } else if (needsAlly) {
                  targetId = allySelected ? selectedTargetId! : pickDefaultAllyId(party, activeHero.id) ?? undefined;
                }
                onSubmit(action, targetId);
              }}
            >
              {label}
            </UiButton>
          );
        })}
      </div>
    </div>
  );
};
