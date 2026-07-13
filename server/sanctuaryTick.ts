/**
 * Background Sanctuary processor — free auto-revives for fallen heroes.
 * Runs on an interval inside the API process (Vite middleware / prod server).
 */
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../db/index';
import { hero } from '../db/schema/game';
import { resolveSanctuary } from './game/engine';
import { loadGameState, saveGameState } from './repository';

const TICK_MS = 30_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Scan every guild that currently has Dead roster heroes and apply due revives. */
export async function processAllSanctuaryRevives(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const db = getDb();
  const deadRows = await db
    .select({ guildId: hero.guildId })
    .from(hero)
    .where(eq(hero.status, 'Dead'));

  const guildIds = Array.from(new Set(deadRows.map((r) => r.guildId)));
  let saved = 0;

  for (const guildId of guildIds) {
    try {
      const loaded = await loadGameState(guildId);
      if (!loaded.guild) continue;
      const before = { guild: loaded.guild, expedition: loaded.expedition };
      const after = resolveSanctuary(before);
      const beforeDead = before.guild.roster.filter((h) => h.status === 'Dead').length;
      const afterDead = after.guild.roster.filter((h) => h.status === 'Dead').length;
      if (afterDead < beforeDead) {
        await saveGameState(guildId, after);
        saved += 1;
      }
    } catch (err) {
      console.warn('[sanctuary] tick failed for guild', guildId, err);
    }
  }

  return saved;
}

/** Start the repeating Sanctuary timer (idempotent). */
export function startSanctuaryTicker(): void {
  if (timer || !isDatabaseConfigured()) return;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    void processAllSanctuaryRevives()
      .catch((err) => console.warn('[sanctuary] tick error:', err))
      .finally(() => {
        running = false;
      });
  }, TICK_MS);
  // Avoid keeping the process alive solely for this timer in some runtimes.
  if (typeof timer === 'object' && timer && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref?.();
  }
}
