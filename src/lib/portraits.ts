/**
 * Portrait asset keys + public URLs for Cloudflare R2.
 *
 * Bucket layout (upload assets to match):
 *   portraits/heroes/{warrior|rogue|mage|cleric}/default.webp
 *   portraits/heroes/{class}/{portraitSeed}.webp   // per-hero variants (optional)
 *   portraits/monsters/{avatarSeed}.webp
 *
 * Until `VITE_R2_PUBLIC_URL` is set (or an object 404s), the UI keeps the
 * procedural SVG portraits.
 */
import type { HeroClass } from '../types';

const CLASS_SLUG: Record<HeroClass, string> = {
  Warrior: 'warrior',
  Rogue: 'rogue',
  Mage: 'mage',
  Cleric: 'cleric',
};

/** Public CDN base from Vite env (no trailing slash). Empty when unset. */
export function getPortraitCdnBase(): string {
  const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? '';
  return base.replace(/\/$/, '');
}

export function isPortraitCdnConfigured(): boolean {
  return getPortraitCdnBase().length > 0;
}

/** Object key for a class default portrait. */
export function heroClassDefaultKey(heroClass: HeroClass): string {
  return `portraits/heroes/${CLASS_SLUG[heroClass]}/default.webp`;
}

/** Object key for a specific hero variant (falls back to class default in the UI). */
export function heroPortraitKey(heroClass: HeroClass, portraitSeed: string): string {
  const seed = sanitizeSeed(portraitSeed);
  if (!seed || seed === 'default') return heroClassDefaultKey(heroClass);
  return `portraits/heroes/${CLASS_SLUG[heroClass]}/${seed}.webp`;
}

/** Object key for a monster portrait. */
export function monsterPortraitKey(avatarSeed: string): string {
  return `portraits/monsters/${sanitizeSeed(avatarSeed) || 'unknown'}.webp`;
}

/** Absolute public URL for a key, or null if the CDN base is not configured. */
export function portraitPublicUrl(key: string): string | null {
  const base = getPortraitCdnBase();
  if (!base) return null;
  return `${base}/${key.replace(/^\//, '')}`;
}

function sanitizeSeed(seed: string): string {
  return seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
