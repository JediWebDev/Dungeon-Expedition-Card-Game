/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Location / environment art on Cloudflare R2 (`locations/…`).
 * Reuses the same public CDN base as hero portraits (`VITE_R2_PUBLIC_URL`).
 */
import { getPortraitCdnBase } from './portraits';

export const STARTING_GUILD_HQ_FILE = 'Starting Guild HQ.png';

/** Absolute public URL for a file under `locations/`, or null if CDN is unset. */
export function locationPublicUrl(filename: string): string | null {
  const base = getPortraitCdnBase();
  if (!base) return null;
  const safe = filename
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${base}/locations/${safe}`;
}

export function startingGuildHqUrl(): string | null {
  return locationPublicUrl(STARTING_GUILD_HQ_FILE);
}
