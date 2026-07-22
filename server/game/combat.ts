/**
 * Turn-based combat engine.
 *
 * One action per combatant per round. Initiative = descending agility (speed).
 * Manual mode waits for `submitCombatAction` on hero turns; auto mode picks
 * sensible defaults. Monsters use archetype AI from name/avatarSeed.
 */
import type {
  CombatActionType,
  CombatLog,
  CombatMode,
  CombatState,
  CombatTurnEntry,
  ExpeditionState,
  GuildState,
  Hero,
  Monster,
  Relic,
} from '../../src/types';
import { generateId, getModifiedStats } from '../../src/utils';
import { resolveActiveRoom, updateActiveRoom } from '../../src/dungeonMap';
import { GameActionError, type GameSnapshot } from './types';

const COMBAT_ROOM_TYPES = new Set(['Monster', 'Elite Monster', 'Boss']);

type Snapshot = GameSnapshot;

function log(
  type: CombatLog['type'],
  text: string
): CombatLog {
  return { id: generateId(), text, type, timestamp: Date.now() };
}

/** Infer enemy archetype for AI / flavor. */
export function monsterArchetype(monster: Monster): string {
  const seed = monster.avatarSeed.toLowerCase();
  const name = monster.name.toLowerCase();
  const hay = `${seed} ${name}`;
  const kinds = [
    'spider',
    'wolf',
    'slime',
    'goblin',
    'ogre',
    'troll',
    'skeleton',
    'bat',
    'dragon',
    'lich',
    'demon',
    'beholder',
    'gargoyle',
    'stalker',
  ];
  for (const k of kinds) {
    if (hay.includes(k)) return k;
  }
  if (hay.includes('orge')) return 'ogre';
  return 'beast';
}

function ensureMonsterIds(monsters: Monster[]): Monster[] {
  return monsters.map((m) => (m.id ? m : { ...m, id: generateId() }));
}

function isDefending(combat: CombatState, id: string): boolean {
  return combat.defendingIds.includes(id);
}

function clearDefend(combat: CombatState, id: string): CombatState {
  return {
    ...combat,
    defendingIds: combat.defendingIds.filter((x) => x !== id),
  };
}

function addDefend(combat: CombatState, id: string): CombatState {
  if (combat.defendingIds.includes(id)) return combat;
  return { ...combat, defendingIds: [...combat.defendingIds, id] };
}

function livingHeroes(party: Hero[]): Hero[] {
  return party.filter((h) => h.hp > 0);
}

function livingMonsters(monsters: Monster[]): Monster[] {
  return monsters.filter((m) => m.hp > 0);
}

function buildTurnQueue(party: Hero[], monsters: Monster[], relics: Relic[]): CombatTurnEntry[] {
  const entries: Array<CombatTurnEntry & { speed: number }> = [];
  for (const h of livingHeroes(party)) {
    entries.push({ side: 'hero', id: h.id, speed: getModifiedStats(h, relics).speed });
  }
  for (const m of livingMonsters(monsters)) {
    entries.push({ side: 'monster', id: m.id, speed: m.speed });
  }
  entries.sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
  return entries.map(({ side, id }) => ({ side, id }));
}

export function createCombatState(
  party: Hero[],
  monsters: Monster[],
  relics: Relic[],
  mode: CombatMode = 'manual'
): CombatState {
  const withIds = ensureMonsterIds(monsters);
  const itemUsesRemaining: Record<string, number> = {};
  for (const h of party) itemUsesRemaining[h.id] = 1;

  const turnQueue = buildTurnQueue(party, withIds, relics);
  return {
    mode,
    awaitingInput: turnQueue[0]?.side === 'hero' && mode === 'manual',
    round: 1,
    turnQueue,
    turnIndex: 0,
    defendingIds: [],
    itemUsesRemaining,
  };
}

function getActiveRoomMonsters(expedition: ExpeditionState): Monster[] {
  try {
    const room = resolveActiveRoom(expedition);
    return ensureMonsterIds(room.monsterGroup ?? []);
  } catch {
    return [];
  }
}

function writeMonsters(expedition: ExpeditionState, monsters: Monster[]): ExpeditionState {
  return updateActiveRoom(expedition, { monsterGroup: monsters });
}

function activeEntry(combat: CombatState): CombatTurnEntry | null {
  return combat.turnQueue[combat.turnIndex] ?? null;
}

function advanceTurnIndex(
  combat: CombatState,
  party: Hero[],
  monsters: Monster[],
  relics: Relic[]
): CombatState {
  let idx = combat.turnIndex + 1;
  let round = combat.round;
  let queue = combat.turnQueue;

  const skipDead = (entry: CombatTurnEntry) => {
    if (entry.side === 'hero') {
      return (party.find((h) => h.id === entry.id)?.hp ?? 0) <= 0;
    }
    return (monsters.find((m) => m.id === entry.id)?.hp ?? 0) <= 0;
  };

  // Move to next living combatant; rebuild queue when the round ends.
  while (true) {
    if (idx >= queue.length) {
      round += 1;
      queue = buildTurnQueue(party, monsters, relics);
      idx = 0;
      if (queue.length === 0) break;
      continue;
    }
    if (skipDead(queue[idx])) {
      idx += 1;
      continue;
    }
    break;
  }

  const next = queue[idx];
  return {
    ...combat,
    round,
    turnQueue: queue,
    turnIndex: idx,
    awaitingInput: Boolean(next && next.side === 'hero' && combat.mode === 'manual'),
  };
}

function defenseOf(hero: Hero, relics: Relic[], combat: CombatState): number {
  const base = getModifiedStats(hero, relics).defense;
  return isDefending(combat, hero.id) ? Math.round(base * 1.5) : base;
}

function monsterDefense(monster: Monster, combat: CombatState): number {
  return isDefending(combat, monster.id) ? Math.round(monster.defense * 1.5) : monster.defense;
}

function pickWeakestMonster(monsters: Monster[]): Monster | null {
  const living = livingMonsters(monsters);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => a.hp - b.hp)[0];
}

function pickWeakestHero(party: Hero[]): Hero | null {
  const living = livingHeroes(party);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => a.hp - b.hp)[0];
}

function applyHeroAttack(
  attacker: Hero,
  target: Monster,
  relics: Relic[],
  combat: CombatState,
  mult = 1,
  style: 'attack' | 'skill' | 'spell' = 'attack'
): { monster: Monster; logs: CombatLog[] } {
  const stats = getModifiedStats(attacker, relics);
  const crit = Math.random() * 100 < stats.luck;
  const variance = 0.85 + Math.random() * 0.3;
  const power = style === 'spell' ? Math.max(stats.magic, 1) : stats.attack;
  const raw = Math.round(power * variance * mult * (crit ? 1.75 : 1));
  const dmg = Math.max(2, raw - monsterDefense(target, combat));
  const nextHp = Math.max(0, target.hp - dmg);
  const verb =
    style === 'spell' ? 'casts at' : style === 'skill' ? 'unleashes a skill on' : 'strikes';
  const logs: CombatLog[] = [
    log(
      style === 'spell' ? 'spell' : style === 'skill' ? 'skill' : crit ? 'damage' : 'attack',
      `${crit ? '💥 CRITICAL! ' : ''}${attacker.name} ${verb} ${target.name} for ${dmg} damage.`
    ),
  ];
  if (nextHp <= 0) {
    logs.push(log('death', `☠️ ${target.name} is slain!`));
  }
  return { monster: { ...target, hp: nextHp }, logs };
}

function applyMonsterAttack(
  attacker: Monster,
  target: Hero,
  relics: Relic[],
  combat: CombatState,
  mult = 1,
  flavor: string
): { hero: Hero; logs: CombatLog[] } {
  // Rogue passive dodge
  if (target.heroClass === 'Rogue' && Math.random() > 0.8) {
    return {
      hero: target,
      logs: [log('info', `💨 ${target.name} dodges ${attacker.name}'s ${flavor}!`)],
    };
  }
  const variance = 0.85 + Math.random() * 0.3;
  const raw = Math.round(attacker.attack * variance * mult);
  const dmg = Math.max(2, raw - defenseOf(target, relics, combat));
  const nextHp = Math.max(0, target.hp - dmg);
  const logs: CombatLog[] = [
    log('damage', `👺 ${attacker.name} ${flavor} ${target.name} for ${dmg} damage.`),
  ];
  if (nextHp <= 0) {
    logs.push(log('death', `🥀 ${target.name} collapses!`));
  }
  return { hero: { ...target, hp: nextHp }, logs };
}

function resolveHeroAction(
  guild: GuildState,
  expedition: ExpeditionState,
  combat: CombatState,
  heroId: string,
  action: CombatActionType,
  targetId?: string
): Snapshot {
  let party = [...expedition.party];
  let monsters = getActiveRoomMonsters(expedition);
  let nextCombat = clearDefend(combat, heroId);
  const logs: CombatLog[] = [];
  const hero = party.find((h) => h.id === heroId);
  if (!hero || hero.hp <= 0) {
    throw new GameActionError('That hero cannot act.');
  }

  const relics = guild.relics;

  if (action === 'defend') {
    nextCombat = addDefend(nextCombat, heroId);
    logs.push(log('defend', `🛡️ ${hero.name} braces for impact (Defend).`));
  } else if (action === 'item') {
    const uses = nextCombat.itemUsesRemaining[heroId] ?? 0;
    if (uses <= 0) throw new GameActionError('No field dressings left for this hero.');
    const stats = getModifiedStats(hero, relics);
    const heal = Math.round(stats.maxHp * 0.25);
    party = party.map((h) =>
      h.id === heroId ? { ...h, hp: Math.min(stats.maxHp, h.hp + heal) } : h
    );
    nextCombat = {
      ...nextCombat,
      itemUsesRemaining: { ...nextCombat.itemUsesRemaining, [heroId]: uses - 1 },
    };
    logs.push(log('item', `🧪 ${hero.name} uses a field dressing and recovers ${heal} HP.`));
  } else if (action === 'spell') {
    if (hero.heroClass === 'Cleric') {
      const allyId = targetId && party.some((h) => h.id === targetId && h.hp > 0)
        ? targetId
        : pickWeakestHero(party)?.id;
      if (!allyId) throw new GameActionError('No ally to heal.');
      const ally = party.find((h) => h.id === allyId)!;
      const stats = getModifiedStats(hero, relics);
      const allyStats = getModifiedStats(ally, relics);
      const heal = Math.round(stats.magic * 1.1 + 12);
      party = party.map((h) =>
        h.id === allyId ? { ...h, hp: Math.min(allyStats.maxHp, h.hp + heal) } : h
      );
      logs.push(log('spell', `✨ ${hero.name} casts Holy Light on ${ally.name} (+${heal} HP).`));
    } else if (hero.heroClass === 'Mage') {
      const living = livingMonsters(monsters);
      if (living.length === 0) throw new GameActionError('No enemies left.');
      const targets = living.slice(0, Math.min(2, living.length));
      for (const t of targets) {
        const { monster, logs: l } = applyHeroAttack(hero, t, relics, nextCombat, 0.7, 'spell');
        monsters = monsters.map((m) => (m.id === monster.id ? monster : m));
        logs.push(...l);
      }
      logs.unshift(log('spell', `🔥 ${hero.name} unleashes a Fireball!`));
    } else {
      // Martial classes: weaker focused bolt / battle cry strike
      const target =
        (targetId && monsters.find((m) => m.id === targetId && m.hp > 0)) ||
        pickWeakestMonster(monsters);
      if (!target) throw new GameActionError('Select a living enemy.');
      const { monster, logs: l } = applyHeroAttack(hero, target, relics, nextCombat, 1.15, 'spell');
      monsters = monsters.map((m) => (m.id === monster.id ? monster : m));
      logs.push(log('spell', `⚡ ${hero.name} channels a battle rite.`), ...l);
    }
  } else if (action === 'skill') {
    const target =
      (targetId && monsters.find((m) => m.id === targetId && m.hp > 0)) ||
      pickWeakestMonster(monsters);
    if (!target) throw new GameActionError('Select a living enemy.');
    let mult = 1.35;
    let label = 'Skill';
    if (hero.heroClass === 'Warrior') {
      mult = 1.55;
      label = 'Power Strike';
    } else if (hero.heroClass === 'Rogue') {
      mult = 1.4;
      label = 'Backstab';
    } else if (hero.heroClass === 'Mage') {
      mult = 1.25;
      label = 'Arcane Pulse';
    } else if (hero.heroClass === 'Cleric') {
      mult = 1.2;
      label = 'Smite';
    }
    logs.push(log('skill', `⚔️ ${hero.name} uses ${label}!`));
    const { monster, logs: l } = applyHeroAttack(hero, target, relics, nextCombat, mult, 'skill');
    monsters = monsters.map((m) => (m.id === monster.id ? monster : m));
    logs.push(...l);
  } else {
    // attack
    const target =
      (targetId && monsters.find((m) => m.id === targetId && m.hp > 0)) ||
      pickWeakestMonster(monsters);
    if (!target) throw new GameActionError('Select a living enemy.');
    const { monster, logs: l } = applyHeroAttack(hero, target, relics, nextCombat, 1, 'attack');
    monsters = monsters.map((m) => (m.id === monster.id ? monster : m));
    logs.push(...l);
  }

  return afterAction(guild, expedition, party, monsters, nextCombat, logs);
}

function resolveMonsterAction(
  guild: GuildState,
  expedition: ExpeditionState,
  combat: CombatState,
  monsterId: string
): Snapshot {
  let party = [...expedition.party];
  let monsters = getActiveRoomMonsters(expedition);
  let nextCombat = clearDefend(combat, monsterId);
  const logs: CombatLog[] = [];
  const monster = monsters.find((m) => m.id === monsterId);
  if (!monster || monster.hp <= 0) {
    return afterAction(guild, expedition, party, monsters, nextCombat, [
      log('info', 'The foe is already defeated — turn passes.'),
    ]);
  }

  const arch = monsterArchetype(monster);
  const living = livingHeroes(party);
  if (living.length === 0) {
    return afterAction(guild, expedition, party, monsters, nextCombat, logs);
  }

  // Low-HP goblins sometimes skulk (skip)
  if (arch === 'goblin' && monster.hp / monster.maxHp < 0.25 && Math.random() < 0.35) {
    logs.push(log('info', `🥷 ${monster.name} skulks behind cover, skipping a turn.`));
    return afterAction(guild, expedition, party, monsters, nextCombat, logs);
  }

  // Slimes sometimes regenerate instead of attacking
  if (arch === 'slime' && Math.random() < 0.3) {
    const heal = Math.round(monster.maxHp * 0.15);
    monsters = monsters.map((m) =>
      m.id === monsterId ? { ...m, hp: Math.min(m.maxHp, m.hp + heal) } : m
    );
    logs.push(log('heal', `🟢 ${monster.name} reforms its mass (+${heal} HP).`));
    return afterAction(guild, expedition, party, monsters, nextCombat, logs);
  }

  // Skeletons / spiders / wolves / ogres / default: pick action flavor
  let mult = 1;
  let flavor = 'claws';
  if (arch === 'spider') {
    mult = Math.random() < 0.4 ? 1.25 : 1;
    flavor = mult > 1 ? 'spits venom at' : 'bites';
  } else if (arch === 'wolf') {
    mult = Math.random() < 0.35 ? 1.4 : 1;
    flavor = mult > 1 ? 'mauls' : 'snaps at';
  } else if (arch === 'skeleton') {
    mult = Math.random() < 0.4 ? 1.15 : 1;
    flavor = mult > 1 ? 'hurls bone shards at' : 'slashes';
  } else if (arch === 'ogre' || arch === 'troll') {
    mult = Math.random() < 0.45 ? 1.5 : 1.1;
    flavor = 'smashes';
  } else if (arch === 'bat') {
    flavor = 'swoops at';
  } else if (arch === 'dragon') {
    mult = Math.random() < 0.4 ? 1.6 : 1.2;
    flavor = mult > 1.3 ? 'breathes fire on' : 'rakes';
  } else if (arch === 'demon' || arch === 'lich') {
    mult = 1.3;
    flavor = 'blasts';
  } else if (arch === 'goblin') {
    flavor = Math.random() < 0.5 ? 'stabs' : 'flings a rock at';
  }

  // Prefer injured heroes; ogres smash tanks
  let target =
    arch === 'ogre' || arch === 'troll'
      ? [...living].sort((a, b) => b.maxHp - a.maxHp)[0]
      : pickWeakestHero(party)!;

  if (arch === 'spider' || arch === 'wolf') {
    target = pickWeakestHero(party)!;
  }

  const { hero, logs: atkLogs } = applyMonsterAttack(
    monster,
    target,
    guild.relics,
    nextCombat,
    mult,
    flavor
  );
  party = party.map((h) => (h.id === hero.id ? hero : h));
  logs.push(...atkLogs);

  // Occasional defend for gargoyle / skeletal
  if ((arch === 'gargoyle' || arch === 'skeleton') && Math.random() < 0.2 && hero.hp > 0) {
    // already attacked; skip extra defend this turn
  }

  return afterAction(guild, expedition, party, monsters, nextCombat, logs);
}

function afterAction(
  guild: GuildState,
  expedition: ExpeditionState,
  party: Hero[],
  monsters: Monster[],
  combat: CombatState,
  newLogs: CombatLog[]
): Snapshot {
  let nextExpedition = writeMonsters(
    { ...expedition, party, logs: [...expedition.logs, ...newLogs] },
    monsters
  );

  // Wipe?
  if (livingHeroes(party).length === 0) {
    return settleDefeat(guild, { ...nextExpedition, combat: null });
  }
  if (livingMonsters(monsters).length === 0) {
    return settleClear(guild, { ...nextExpedition, combat: null });
  }

  const advanced = advanceTurnIndex(combat, party, monsters, guild.relics);
  nextExpedition = {
    ...nextExpedition,
    combat: advanced,
    combatRound: advanced.round,
    activeTurn: activeEntry(advanced)?.side,
  };

  return { guild, expedition: nextExpedition };
}

// Settlements are injected from engine to avoid circular imports for markHeroDead —
// we duplicate minimal defeat/clear hooks via callbacks passed at bind time.
let settleDefeatFn: (guild: GuildState, expedition: ExpeditionState) => Snapshot = (g, e) => ({
  guild: g,
  expedition: e,
});
let settleClearFn: (guild: GuildState, expedition: ExpeditionState) => Snapshot = (g, e) => ({
  guild: g,
  expedition: e,
});

export function bindCombatSettlers(handlers: {
  settleDefeat: (guild: GuildState, expedition: ExpeditionState) => Snapshot;
  settleClear: (guild: GuildState, expedition: ExpeditionState) => Snapshot;
}): void {
  settleDefeatFn = handlers.settleDefeat;
  settleClearFn = handlers.settleClear;
}

function settleDefeat(guild: GuildState, expedition: ExpeditionState): Snapshot {
  return settleDefeatFn(guild, expedition);
}
function settleClear(guild: GuildState, expedition: ExpeditionState): Snapshot {
  return settleClearFn(guild, expedition);
}

function ensureCombat(guild: GuildState, expedition: ExpeditionState): ExpeditionState {
  let room;
  try {
    room = resolveActiveRoom(expedition);
  } catch {
    throw new GameActionError('This room has no combat.');
  }
  if (!COMBAT_ROOM_TYPES.has(room.type)) {
    throw new GameActionError('This room has no combat.');
  }
  if (expedition.activeRoomChoiceMade) {
    throw new GameActionError('Combat already resolved — proceed to the next room.');
  }
  let monsters = ensureMonsterIds(room.monsterGroup ?? []);
  if (monsters.length === 0) throw new GameActionError('No monsters in this room.');

  let exp = writeMonsters(expedition, monsters);
  if (!exp.combat) {
    const combat = createCombatState(exp.party, monsters, guild.relics, 'manual');
    exp = {
      ...exp,
      combat,
      combatRound: 1,
      logs: [
        ...exp.logs,
        log(
          'info',
          `⚔️ Battle joined! Initiative set. First up: ${describeTurn(combat, exp.party, monsters)}.`
        ),
      ],
    };
  }
  return exp;
}

function describeTurn(combat: CombatState, party: Hero[], monsters: Monster[]): string {
  const entry = activeEntry(combat);
  if (!entry) return 'nobody';
  if (entry.side === 'hero') return party.find((h) => h.id === entry.id)?.name ?? 'a hero';
  return monsters.find((m) => m.id === entry.id)?.name ?? 'a foe';
}

function autoPickHeroAction(
  hero: Hero,
  monsters: Monster[],
  party: Hero[]
): { action: CombatActionType; targetId?: string } {
  const wounded = livingHeroes(party).filter((h) => {
    const max = h.maxHp;
    return h.hp < max * 0.55;
  });
  if (hero.heroClass === 'Cleric' && wounded.length > 0 && Math.random() < 0.55) {
    return { action: 'spell', targetId: pickWeakestHero(party)?.id };
  }
  if (hero.heroClass === 'Mage' && livingMonsters(monsters).length >= 2 && Math.random() < 0.45) {
    return { action: 'spell' };
  }
  if (hero.hp < hero.maxHp * 0.35 && Math.random() < 0.35) {
    return { action: 'defend' };
  }
  if (Math.random() < 0.3) {
    return { action: 'skill', targetId: pickWeakestMonster(monsters)?.id };
  }
  return { action: 'attack', targetId: pickWeakestMonster(monsters)?.id };
}

/**
 * Process combat until we need player input, room ends, or `maxSteps` actions resolve.
 * Used by auto-battle ticks and after a player submits an action (to run following monster turns).
 */
export function continueCombat(
  guild: GuildState,
  expedition: ExpeditionState,
  maxSteps = 12
): Snapshot {
  let state: Snapshot = { guild, expedition: ensureCombat(guild, expedition) };
  let steps = 0;

  while (steps < maxSteps) {
    const exp = state.expedition!;
    if (!exp.combat || exp.activeRoomChoiceMade || exp.status !== 'room_active') break;
    if (livingHeroes(exp.party).length === 0 || livingMonsters(getActiveRoomMonsters(exp)).length === 0) {
      break;
    }

    const combat = exp.combat;
    const entry = activeEntry(combat);
    if (!entry) break;

    if (entry.side === 'hero') {
      if (combat.mode === 'manual' && combat.awaitingInput) {
        break; // wait for player
      }
      const hero = exp.party.find((h) => h.id === entry.id);
      if (!hero || hero.hp <= 0) {
        state = {
          guild: state.guild,
          expedition: {
            ...exp,
            combat: advanceTurnIndex(
              combat,
              exp.party,
              getActiveRoomMonsters(exp),
              state.guild.relics
            ),
          },
        };
        steps += 1;
        continue;
      }
      const pick = autoPickHeroAction(hero, getActiveRoomMonsters(exp), exp.party);
      state = resolveHeroAction(
        state.guild,
        exp,
        { ...combat, awaitingInput: false },
        entry.id,
        pick.action,
        pick.targetId
      );
    } else {
      state = resolveMonsterAction(state.guild, exp, combat, entry.id);
    }
    steps += 1;
  }

  return state;
}

export function handleSetCombatMode(
  guild: GuildState,
  expedition: ExpeditionState | null,
  mode: CombatMode
): Snapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  let exp = ensureCombat(guild, expedition);
  const combat = exp.combat!;
  const entry = activeEntry(combat);
  const nextCombat: CombatState = {
    ...combat,
    mode,
    awaitingInput: mode === 'manual' && entry?.side === 'hero',
  };
  exp = {
    ...exp,
    combat: nextCombat,
    logs: [
      ...exp.logs,
      log('info', mode === 'auto' ? '⚙️ Auto-battle enabled.' : '🕹️ Manual command mode enabled.'),
    ],
  };
  // Auto ticks one action at a time from the client so the battle log stays readable.
  return { guild, expedition: exp };
}

/** Start turn-based combat when entering a combat room (or no-op for other rooms). */
export function prepareRoomCombat(guild: GuildState, expedition: ExpeditionState): ExpeditionState {
  let room;
  try {
    room = resolveActiveRoom(expedition);
  } catch {
    return { ...expedition, combat: null };
  }
  if (!COMBAT_ROOM_TYPES.has(room.type)) {
    return { ...expedition, combat: null };
  }
  if (expedition.combat) return expedition;
  try {
    return ensureCombat(guild, expedition);
  } catch {
    return { ...expedition, combat: null };
  }
}

export function handleSubmitCombatAction(
  guild: GuildState,
  expedition: ExpeditionState | null,
  action: CombatActionType,
  targetId?: string
): Snapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  let exp = ensureCombat(guild, expedition);
  const combat = exp.combat!;
  if (combat.mode !== 'manual') {
    throw new GameActionError('Switch to Manual mode to issue commands.');
  }
  if (!combat.awaitingInput) {
    throw new GameActionError('It is not your turn to issue a command.');
  }
  const entry = activeEntry(combat);
  if (!entry || entry.side !== 'hero') {
    throw new GameActionError('A hero is not currently acting.');
  }

  let state = resolveHeroAction(guild, exp, { ...combat, awaitingInput: false }, entry.id, action, targetId);
  // After the player acts, resolve following monster turns until next hero input.
  if (state.expedition?.combat && !state.expedition.activeRoomChoiceMade) {
    state = continueCombat(state.guild, state.expedition, 10);
  }
  return state;
}

export function handleAdvanceCombat(
  guild: GuildState,
  expedition: ExpeditionState | null
): Snapshot {
  if (!expedition) throw new GameActionError('No active expedition.');
  const exp = ensureCombat(guild, expedition);
  if (exp.combat?.mode === 'manual' && exp.combat.awaitingInput) {
    throw new GameActionError('Issue a command for the active hero, or enable Auto-battle.');
  }
  return continueCombat(guild, exp, 1);
}

export function isCombatRoomType(type: string): boolean {
  return COMBAT_ROOM_TYPES.has(type);
}
