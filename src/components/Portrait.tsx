/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { HeroClass } from '../types';
import {
  heroClassDefaultKey,
  heroPortraitKey,
  isPortraitCdnConfigured,
  monsterPortraitKey,
  portraitPublicUrl,
} from '../lib/portraits';

interface PortraitProps {
  heroClass?: HeroClass;
  /** Per-hero variant seed → R2 key `portraits/heroes/{class}/{seed}.webp`. */
  portraitSeed?: string;
  monsterType?: string;
  /** Monster avatar seed → R2 key `portraits/monsters/{seed}.webp`. */
  avatarSeed?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fill';
  className?: string;
  isDead?: boolean;
}

export const Portrait: React.FC<PortraitProps> = ({
  heroClass,
  portraitSeed,
  monsterType,
  avatarSeed,
  size = 'md',
  className = '',
  isDead = false,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    /** Stretch to fill the parent box (used by CharacterCard behind equipment slots). */
    fill: 'w-full h-full',
  };

  const candidateUrls = useMemo(
    () => buildCandidateUrls({ heroClass, portraitSeed, monsterType, avatarSeed }),
    [heroClass, portraitSeed, monsterType, avatarSeed]
  );
  const [urlIndex, setUrlIndex] = useState(0);
  const [useSvg, setUseSvg] = useState(candidateUrls.length === 0);

  // Reset when the entity identity changes.
  useEffect(() => {
    setUrlIndex(0);
    setUseSvg(candidateUrls.length === 0);
  }, [candidateUrls]);

  const activeUrl = !useSvg ? candidateUrls[urlIndex] : null;

  const handleImageError = () => {
    const next = urlIndex + 1;
    if (next < candidateUrls.length) {
      setUrlIndex(next);
    } else {
      setUseSvg(true);
    }
  };

  // Thematic background gradients based on entity
  const getGradient = () => {
    if (isDead) {
      return 'from-neutral-700 to-neutral-900';
    }

    if (heroClass) {
      switch (heroClass) {
        case 'Warrior':
          return 'from-amber-600 via-orange-700 to-red-900';
        case 'Rogue':
          return 'from-slate-700 via-zinc-800 to-purple-950';
        case 'Mage':
          return 'from-cyan-600 via-indigo-800 to-violet-950';
        case 'Cleric':
          return 'from-yellow-400 via-amber-500 to-orange-600';
      }
    }

    if (monsterType) {
      const type = monsterType.toLowerCase();
      if (type.includes('dragon')) return 'from-rose-800 via-red-950 to-stone-950';
      if (type.includes('beholder') || type.includes('lich') || type.includes('demon'))
        return 'from-fuchsia-800 via-purple-950 to-zinc-950';
      if (type.includes('troll') || type.includes('goblin') || type.includes('slime'))
        return 'from-emerald-700 via-teal-900 to-stone-900';
      if (type.includes('skeleton')) return 'from-slate-600 via-neutral-800 to-neutral-900';
      return 'from-amber-900 via-stone-800 to-neutral-950';
    }

    return 'from-neutral-600 to-neutral-800';
  };

  // Path coordinates for stylized icons (SVG fallback)
  const getPaths = () => {
    if (heroClass) {
      switch (heroClass) {
        case 'Warrior':
          return (
            <g stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M50 20 C32 20 30 40 30 55 C30 70 38 75 50 75 C62 75 70 70 70 55 C70 40 68 20 50 20 Z"
                fill="rgba(255,255,255,0.15)"
              />
              <path d="M35 48 L65 48 M45 42 L55 42" strokeWidth="3" />
              <path d="M32 28 C20 20 18 35 30 38" />
              <path d="M68 28 C80 20 82 35 70 38" />
              <path d="M50 48 L50 62" strokeWidth="2.5" />
              <path d="M30 85 L70 85" strokeWidth="1.5" />
            </g>
          );
        case 'Rogue':
          return (
            <g stroke="#e9d5ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M50 15 C35 22 26 38 26 58 C26 78 30 82 50 82 C70 82 74 78 74 58 C74 38 65 22 50 15 Z"
                fill="rgba(0,0,0,0.4)"
              />
              <path
                d="M50 30 C38 30 36 50 36 58 C36 66 40 68 50 68 C60 68 64 66 64 58 C64 50 62 30 50 30 Z"
                fill="rgba(0,0,0,0.6)"
              />
              <path d="M41 48 L46 51" stroke="#fef08a" strokeWidth="3" />
              <path d="M59 48 L54 51" stroke="#fef08a" strokeWidth="3" />
              <path d="M28 75 L38 65 M72 75 L62 65" />
            </g>
          );
        case 'Mage':
          return (
            <g stroke="#a5f3fc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M20 52 C30 50 70 50 80 52 C84 53 84 56 80 57 C70 59 30 59 20 57 C16 56 16 53 20 52 Z"
                fill="rgba(255,255,255,0.1)"
              />
              <path d="M32 50 L42 16 Q50 8 52 16 L68 50" fill="rgba(6,182,212,0.1)" />
              <polygon
                points="50,11 52,14 55,14 53,16 54,19 50,17 46,19 47,16 45,14 48,14"
                fill="#a5f3fc"
              />
              <circle cx="50" cy="74" r="11" fill="rgba(165,243,252,0.25)" stroke="#67e8f9" strokeWidth="2.5" />
              <circle cx="50" cy="74" r="4" fill="#ffffff" />
            </g>
          );
        case 'Cleric':
          return (
            <g stroke="#fef08a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="50" cy="45" r="22" strokeDasharray="6,4" stroke="#fde047" strokeWidth="1.5" />
              <path
                d="M32 28 L68 28 L68 48 C68 62 50 78 50 78 C50 78 32 62 32 48 Z"
                fill="rgba(253,224,71,0.1)"
              />
              <path d="M50 34 L50 64 M38 44 L62 44" stroke="#ffffff" strokeWidth="3" />
              <circle cx="25" cy="22" r="1.5" fill="#ffffff" />
              <circle cx="75" cy="22" r="1.5" fill="#ffffff" />
              <circle cx="50" cy="85" r="1" fill="#ffffff" />
            </g>
          );
      }
    }

    if (monsterType) {
      const type = monsterType.toLowerCase();
      if (type.includes('dragon')) {
        return (
          <g stroke="#fca5a5" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 38 C35 30 65 30 70 38 L65 52 L75 58 L50 78 L35 58 L25 52 Z" fill="rgba(185,28,28,0.2)" />
            <path d="M30 38 L42 22 L50 32 L58 22 L70 38" />
            <circle cx="42" cy="45" r="3" fill="#ef4444" stroke="none" />
            <circle cx="58" cy="45" r="3" fill="#ef4444" stroke="none" />
            <path d="M45 62 L50 56 L55 62" strokeWidth="2.5" />
            <path d="M22 65 C12 55 12 75 22 80 M78 65 C88 55 88 75 78 80" />
          </g>
        );
      }
      if (type.includes('demon')) {
        return (
          <g stroke="#fca5a5" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M34 25 C24 15 14 30 30 45" />
            <path d="M66 25 C76 15 86 30 70 45" />
            <path
              d="M32 45 C32 35 68 35 68 45 L62 68 L54 68 L54 78 L46 78 L46 68 L38 68 Z"
              fill="rgba(0,0,0,0.3)"
            />
            <circle cx="43" cy="50" r="2.5" fill="#f87171" stroke="none" />
            <circle cx="57" cy="50" r="2.5" fill="#f87171" stroke="none" />
            <path d="M45 60 L50 63 L55 60" />
          </g>
        );
      }
      if (type.includes('beholder')) {
        return (
          <g stroke="#e9d5ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="52" r="22" fill="rgba(126,34,206,0.2)" strokeWidth="2.5" />
            <circle cx="50" cy="52" r="9" fill="rgba(0,0,0,0.5)" />
            <circle cx="50" cy="52" r="3.5" fill="#a855f7" />
            <path d="M35 32 Q30 18 25 22" />
            <circle cx="25" cy="22" r="2" fill="#d8b4fe" />
            <path d="M50 30 Q50 14 50 18" />
            <circle cx="50" cy="18" r="2" fill="#d8b4fe" />
            <path d="M65 32 Q70 18 75 22" />
            <circle cx="75" cy="22" r="2" fill="#d8b4fe" />
            <path d="M40 64 Q50 74 60 64" stroke="#f3e8ff" />
          </g>
        );
      }
      if (type.includes('skeleton')) {
        return (
          <g stroke="#e2e8f0" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M34 45 C34 32 66 32 66 45 C66 52 62 58 58 58 L58 68 L42 68 L42 58 C38 58 34 52 34 45 Z"
              fill="rgba(255,255,255,0.08)"
            />
            <polygon points="50,49 48,54 52,54" fill="#cbd5e1" stroke="none" />
            <circle cx="44" cy="42" r="4.5" fill="#020617" />
            <circle cx="56" cy="42" r="4.5" fill="#020617" />
            <circle cx="44" cy="42" r="1.5" fill="#38bdf8" stroke="none" />
            <circle cx="56" cy="42" r="1.5" fill="#38bdf8" stroke="none" />
            <path d="M45 62 L55 62 M45 60 L45 64 M48 60 L48 64 M51 60 L51 64 M54 60 L54 64" />
          </g>
        );
      }
      if (type.includes('goblin')) {
        return (
          <g stroke="#a7f3d0" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M35 48 C20 44 14 30 25 38" />
            <path d="M65 48 C80 44 86 30 75 38" />
            <path
              d="M33 45 C33 35 67 35 67 45 C67 56 62 65 50 65 C38 65 33 56 33 45 Z"
              fill="rgba(16,185,129,0.15)"
            />
            <circle cx="44" cy="43" r="4" fill="#fb923c" stroke="none" />
            <circle cx="56" cy="43" r="4" fill="#fb923c" stroke="none" />
            <circle cx="44" cy="43" r="1.5" fill="#000000" stroke="none" />
            <circle cx="56" cy="43" r="1.5" fill="#000000" stroke="none" />
            <path d="M50 42 C45 46 45 54 50 54 L52 50 Z" fill="rgba(16,185,129,0.2)" />
            <path d="M41 57 Q50 63 59 57" stroke="#ffffff" />
          </g>
        );
      }
      if (type.includes('slime')) {
        return (
          <g stroke="#86efac" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M25 65 C20 48 35 32 50 32 C65 32 80 48 75 65 C72 75 62 78 50 78 C38 78 28 75 25 65 Z"
              fill="rgba(34,197,94,0.3)"
            />
            <path d="M38 42 C44 38 48 38 44 44" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="44" cy="55" r="2.5" fill="#14532d" stroke="none" />
            <circle cx="56" cy="55" r="2.5" fill="#14532d" stroke="none" />
            <path d="M48 62 Q50 65 52 62" stroke="#14532d" strokeWidth="1.5" />
          </g>
        );
      }
      if (
        type.includes('lich') ||
        type.includes('gargoyle') ||
        type.includes('stalker') ||
        type.includes('troll')
      ) {
        return (
          <g stroke="#fbcfe8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M30 45 C25 25 40 30 50 20 C60 30 75 25 70 45 C70 65 62 75 50 75 C38 75 30 65 30 45 Z"
              fill="rgba(0,0,0,0.5)"
            />
            <path d="M41 45 L47 48" stroke="#ec4899" strokeWidth="3.5" />
            <path d="M59 45 L53 48" stroke="#ec4899" strokeWidth="3.5" />
            <path d="M40 60 L45 56 L50 60 L55 56 L60 60" />
          </g>
        );
      }
      return (
        <g stroke="#fdba74" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="rgba(249,115,22,0.15)" />
          <circle cx="50" cy="46" r="4.5" fill="#ea580c" />
          <path d="M35 50 H65" strokeWidth="1.5" />
        </g>
      );
    }

    return null;
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-neutral-700/60 shadow-lg bg-gradient-to-b ${getGradient()} ${
        sizeMap[size]
      } ${className}`}
    >
      {activeUrl ? (
        <img
          src={activeUrl}
          alt=""
          onError={handleImageError}
          className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
            isDead ? 'grayscale opacity-60' : ''
          }`}
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform transition-transform duration-300 hover:scale-105"
        >
          <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

          {!isDead && (
            <g fill="rgba(255,255,255,0.25)">
              <circle cx="20" cy="30" r="1" />
              <circle cx="80" cy="25" r="1.5" />
              <circle cx="15" cy="70" r="0.8" />
              <circle cx="78" cy="75" r="1.2" />
            </g>
          )}

          {getPaths()}

          {isDead && (
            <g stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
              <line x1="15" y1="15" x2="85" y2="85" />
              <line x1="85" y1="15" x2="15" y2="85" />
            </g>
          )}
        </svg>
      )}

      {isDead && activeUrl && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <g stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
              <line x1="15" y1="15" x2="85" y2="85" />
              <line x1="85" y1="15" x2="15" y2="85" />
            </g>
          </svg>
        </span>
      )}

      {!isDead && monsterType?.toLowerCase().includes('boss') && (
        <span className="absolute inset-0 rounded-xl border-2 border-red-500 animate-pulse pointer-events-none" />
      )}
      {!isDead && heroClass === 'Cleric' && (
        <span className="absolute inset-0 rounded-xl border-2 border-yellow-400/40 pointer-events-none" />
      )}
      {!isDead && heroClass === 'Mage' && (
        <span className="absolute inset-0 rounded-xl border-2 border-cyan-400/40 pointer-events-none" />
      )}
    </div>
  );
};

function buildCandidateUrls(opts: {
  heroClass?: HeroClass;
  portraitSeed?: string;
  monsterType?: string;
  avatarSeed?: string;
}): string[] {
  if (!isPortraitCdnConfigured()) return [];

  const urls: string[] = [];
  const pushKey = (key: string) => {
    const url = portraitPublicUrl(key);
    if (url && !urls.includes(url)) urls.push(url);
  };

  if (opts.heroClass) {
    if (opts.portraitSeed) {
      pushKey(heroPortraitKey(opts.heroClass, opts.portraitSeed));
    }
    pushKey(heroClassDefaultKey(opts.heroClass));
  } else if (opts.avatarSeed || opts.monsterType) {
    pushKey(monsterPortraitKey(opts.avatarSeed || opts.monsterType || 'unknown'));
  }

  return urls;
}
