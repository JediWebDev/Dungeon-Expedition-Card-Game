/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { DungeonRoom, ExpeditionState, GuildState } from '../../types';
import { getModifiedStats } from '../../utils';
import { CombatUnitCard } from './CombatUnitCard';
import { CombatActionBar } from './CombatActionBar';

interface CombatPanelProps {
  expedition: ExpeditionState;
  guild: GuildState;
  activeRoom: DungeonRoom;
}

export const CombatPanel: React.FC<CombatPanelProps> = ({ expedition, guild, activeRoom }) => {
  const { submitCombatAction, setCombatMode, advanceCombat, proceedToNextRoom, actionPending } = useGame();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const party = expedition.party;
  const monsters = activeRoom.monsterGroup ?? [];
  const combat = expedition.combat;
  const combatMode = combat?.mode ?? 'manual';
  const awaitingInput = Boolean(combat?.awaitingInput);
  const activeTurnEntry = combat?.turnQueue[combat.turnIndex] ?? null;
  const activeHero =
    activeTurnEntry?.side === 'hero' ? party.find((h) => h.id === activeTurnEntry.id) ?? null : null;
  const roomResolved = Boolean(expedition.activeRoomChoiceMade);

  // Clear the selected target whenever the turn changes, so a stale target
  // from the last hero's turn can't leak into the next one.
  useEffect(() => {
    setSelectedTargetId(null);
  }, [combat?.turnIndex, combat?.round]);

  const canTargetAlly = (heroId: string) =>
    awaitingInput && activeHero?.heroClass === 'Cleric' && heroId !== activeHero.id;

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Battle field */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4 flex-1">
        {/* Heroes */}
        <div className="flex flex-wrap gap-2 justify-center">
          {party
            .filter((h) => h.hp > 0)
            .map((h) => (
              <CombatUnitCard
                key={h.id}
                name={h.name}
                hp={h.hp}
                maxHp={getModifiedStats(h, guild.relics).maxHp}
                isDead={false}
                isActiveTurn={activeTurnEntry?.side === 'hero' && activeTurnEntry.id === h.id}
                isSelected={selectedTargetId === h.id}
                selectable={canTargetAlly(h.id)}
                onSelect={() => setSelectedTargetId(h.id)}
                heroClass={h.heroClass}
                portraitSeed={h.portraitSeed}
              />
            ))}
        </div>

        {/* Round / mode / turn indicator */}
        <div className="text-center font-sans flex flex-col items-center gap-2 min-w-[200px]">
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 block">
            Round {combat?.round ?? expedition.combatRound}
          </span>
          <div className="text-xl font-black italic text-red-500 py-1.5 px-4 bg-stone-950 border border-stone-800 rounded-sm tracking-widest">
            VS
          </div>
          {activeHero && (
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              {activeHero.name}&apos;s turn
            </p>
          )}
          {activeTurnEntry?.side === 'monster' && combatMode === 'manual' && (
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Enemy acting…</p>
          )}

          {!roomResolved && (
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setCombatMode('manual')}
                className={`px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  combatMode === 'manual'
                    ? 'bg-amber-900/30 text-amber-400 border-amber-800'
                    : 'bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setCombatMode('auto')}
                className={`px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  combatMode === 'auto'
                    ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800'
                    : 'bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300'
                }`}
              >
                Auto
              </button>
            </div>
          )}
        </div>

        {/* Monsters */}
        <div className="flex flex-wrap gap-2 justify-center">
          {monsters.length > 0 ? (
            monsters.map((monster) => (
              <CombatUnitCard
                key={monster.id}
                name={monster.name}
                hp={monster.hp}
                maxHp={monster.maxHp}
                isDead={monster.hp <= 0}
                isActiveTurn={activeTurnEntry?.side === 'monster' && activeTurnEntry.id === monster.id}
                isSelected={selectedTargetId === monster.id}
                selectable={awaitingInput}
                onSelect={() => setSelectedTargetId(monster.id)}
                monsterType={monster.name}
                avatarSeed={monster.avatarSeed}
              />
            ))
          ) : (
            <span className="text-stone-500 text-xs italic font-sans">All clear!</span>
          )}
        </div>
      </div>

      {/* Manual command bar */}
      {!roomResolved && awaitingInput && activeHero && (
        <CombatActionBar
          activeHero={activeHero}
          party={party}
          monsters={monsters}
          combat={combat!}
          selectedTargetId={selectedTargetId}
          actionPending={actionPending}
          onSubmit={(action, targetId) => submitCombatAction(action, targetId)}
        />
      )}

      {!roomResolved && combatMode === 'manual' && !awaitingInput && !actionPending && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => advanceCombat()}
            className="text-[10px] uppercase tracking-wider font-bold text-stone-400 hover:text-amber-400 border border-stone-800 px-3 py-1.5 rounded-sm cursor-pointer"
          >
            Advance enemy turn
          </button>
        </div>
      )}

      {roomResolved && (
        <div className="pt-4 mt-4 border-t border-stone-800 flex justify-end font-sans">
          <button
            onClick={proceedToNextRoom}
            className="bg-emerald-900/20 text-emerald-500 border border-emerald-900/60 hover:bg-emerald-900/40 hover:border-emerald-600 font-bold py-2 px-6 rounded-sm text-xs uppercase tracking-widest transition flex items-center gap-2 active:scale-95 shadow-md cursor-pointer"
          >
            Chamber Secured: Proceed <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
