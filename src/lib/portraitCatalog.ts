/**
 * Shared hero portrait catalog (safe for browser + Node).
 * Filenames must match R2 keys under `hero-portraits/` exactly (case-sensitive).
 */
import type { HeroClass } from '../types';

export const HERO_PORTRAIT_PREFIX = 'hero-portraits';

/**
 * Uploaded hero portrait stems (without `.png`), keyed by class.
 * Add new uploads here when you drop more files into `hero-portraits/`.
 */
export const HERO_PORTRAITS_BY_CLASS: Record<HeroClass, readonly string[]> = {
  Warrior: ['Sigurd_Warrior'],
  Rogue: ['Lyra_Rogue'],
  Mage: ['Kaeleen_Mage'],
  Cleric: ['Sariel_Cleric'],
};

export function heroPortraitObjectKey(stem: string): string {
  const clean = stem.trim().replace(/\.png$/i, '');
  return `${HERO_PORTRAIT_PREFIX}/${clean}.png`;
}

export function heroClassDefaultStem(heroClass: HeroClass): string {
  return HERO_PORTRAITS_BY_CLASS[heroClass][0];
}

/** Pick a catalog portrait stem for a class (used when generating heroes). */
export function pickHeroPortraitSeed(heroClass: HeroClass): string {
  const pool = HERO_PORTRAITS_BY_CLASS[heroClass];
  return pool[Math.floor(Math.random() * pool.length)];
}
