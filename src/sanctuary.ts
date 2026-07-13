/**
 * Sanctuary Altar & Baths (healerStation) formulas — shared client + server.
 *
 * Levels 1–5. Higher rank:
 *  - cheaper instant heal / revive (gold)
 *  - faster free auto-revive (backend timer via hero.diedAt)
 */
import type { Hero } from './types';

/** Clamp station rank into the supported 1–5 range. */
export function clampHealerStation(level: number): number {
  return Math.max(1, Math.min(5, Math.floor(level) || 1));
}

/**
 * Multiplier applied to gold costs. Station 1 = 1.0, station 5 ≈ 0.40.
 * Each rank above 1 cuts ~15% of remaining cost.
 */
export function sanctuaryGoldMultiplier(healerStation: number): number {
  const rank = clampHealerStation(healerStation);
  return Math.max(0.4, 1 - (rank - 1) * 0.15);
}

/** Instant mend cost (injured but living heroes). */
export function getHealCost(hero: Pick<Hero, 'maxHp' | 'hp' | 'morale'>, healerStation: number): number {
  const dmg = Math.max(0, hero.maxHp - hero.hp);
  const base = Math.max(15, Math.round(dmg * 0.35 + (100 - hero.morale) * 0.2));
  return Math.max(5, Math.round(base * sanctuaryGoldMultiplier(healerStation)));
}

/** Instant revive cost (fallen heroes). */
export function getInstantReviveCost(hero: Pick<Hero, 'level'>, healerStation: number): number {
  const base = hero.level * 80 + 50;
  return Math.max(10, Math.round(base * sanctuaryGoldMultiplier(healerStation)));
}

/**
 * Free auto-revive duration in ms.
 * Station 1, level 1 ≈ 10 minutes; higher station shortens, higher hero level lengthens.
 */
export function getAutoReviveDurationMs(heroLevel: number, healerStation: number): number {
  const rank = clampHealerStation(healerStation);
  const level = Math.max(1, heroLevel);
  const baseMs = 10 * 60 * 1000; // 10 minutes
  // Station 5 → ~2.5 minutes for a level-1 hero; level scales linearly.
  return Math.round((baseMs * level) / rank);
}

/** Timestamp when a fallen hero will finish resting (ms), or null if not dead / no diedAt. */
export function getAutoReviveReadyAt(
  hero: Pick<Hero, 'status' | 'level' | 'diedAt'>,
  healerStation: number,
): number | null {
  if (hero.status !== 'Dead' || !hero.diedAt) return null;
  return hero.diedAt + getAutoReviveDurationMs(hero.level, healerStation);
}

/** Remaining ms until free revive (0 if ready). */
export function getAutoReviveRemainingMs(
  hero: Pick<Hero, 'status' | 'level' | 'diedAt'>,
  healerStation: number,
  now = Date.now(),
): number | null {
  const readyAt = getAutoReviveReadyAt(hero, healerStation);
  if (readyAt == null) return null;
  return Math.max(0, readyAt - now);
}

/** Apply free auto-revives that are due. Returns a new roster array (may be same reference if unchanged). */
export function applyDueAutoRevives<T extends Hero>(
  roster: T[],
  healerStation: number,
  now = Date.now(),
): { roster: T[]; revivedIds: string[] } {
  const revivedIds: string[] = [];
  let changed = false;

  const next = roster.map((h) => {
    if (h.status !== 'Dead') return h;
    // Legacy saves without diedAt become immediately eligible for free revive.
    const remaining = h.diedAt == null ? 0 : getAutoReviveRemainingMs(h, healerStation, now);
    if (remaining == null || remaining > 0) return h;
    revivedIds.push(h.id);
    changed = true;
    return {
      ...h,
      status: 'Idle' as const,
      hp: Math.round(h.maxHp * 0.4),
      morale: 40,
      diedAt: null,
    };
  });

  return { roster: changed ? next : roster, revivedIds };
}

/** Format remaining duration for UI, e.g. "4m 12s". */
export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
