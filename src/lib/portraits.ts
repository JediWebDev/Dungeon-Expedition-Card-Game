/**
 * Portrait asset keys + public URLs for Cloudflare R2.
 *
 * Actual bucket layout (`guilds-of-ardessia`):
 *   hero-portraits/Sigurd_Warrior.png
 *   hero-portraits/Lyra_Rogue.png
 *   hero-portraits/Kaeleen_Mage.png
 *   hero-portraits/Sariel_Cleric.png
 *   equipment/…                  (wired later)
 *
 * Set `VITE_R2_PUBLIC_URL` to the bucket's public base (r2.dev or custom domain,
 * no trailing slash). Until that is set (or an object 404s), the UI keeps the
 * procedural SVG portraits.
 *
 * Keys are case-sensitive and must match the uploaded filenames exactly.
 */
import type { HeroClass } from '../types';
import {
  heroClassDefaultStem,
  heroPortraitObjectKey,
  pickHeroPortraitSeed,
} from './portraitCatalog';

export {
  HERO_PORTRAIT_PREFIX,
  HERO_PORTRAITS_BY_CLASS,
  heroPortraitObjectKey,
  pickHeroPortraitSeed,
} from './portraitCatalog';

/** Public CDN base from Vite env (no trailing slash). Empty when unset. */
export function getPortraitCdnBase(): string {
  const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? '';
  return base.replace(/\/$/, '');
}

export function isPortraitCdnConfigured(): boolean {
  return getPortraitCdnBase().length > 0;
}

/** Object key for a class default portrait (first catalog entry for that class). */
export function heroClassDefaultKey(heroClass: HeroClass): string {
  return heroPortraitObjectKey(heroClassDefaultStem(heroClass));
}

/**
 * Object key for a hero portrait.
 * `portraitSeed` should be the R2 file stem (e.g. `Sigurd_Warrior`) or `default`.
 */
export function heroPortraitKey(heroClass: HeroClass, portraitSeed: string): string {
  const stem = portraitSeed.trim().replace(/\.png$/i, '');
  if (!stem || stem === 'default') return heroClassDefaultKey(heroClass);
  return heroPortraitObjectKey(stem);
}

/** Object key for a monster portrait (future folder). */
export function monsterPortraitKey(avatarSeed: string): string {
  const stem = sanitizeLooseSeed(avatarSeed) || 'unknown';
  return `monster-portraits/${stem}.png`;
}

/** Absolute public URL for a key, or null if the CDN base is not configured. */
export function portraitPublicUrl(key: string): string | null {
  const base = getPortraitCdnBase();
  if (!base) return null;
  return `${base}/${key.replace(/^\//, '')}`;
}

/** Loose sanitizer for future monster keys (lowercase slug). */
function sanitizeLooseSeed(seed: string): string {
  return seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
