/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { startingGuildHqUrl } from '../../lib/locations';

interface GuildHqBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-bleed Starting Guild HQ art with a dark overlay so UI text stays readable.
 * Falls back to solid stone when the R2 public URL is not configured.
 */
export const GuildHqBackground: React.FC<GuildHqBackgroundProps> = ({
  children,
  className = '',
}) => {
  const hqUrl = startingGuildHqUrl();

  return (
    <div className={`relative min-h-screen text-stone-200 ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={
          hqUrl
            ? { backgroundImage: `url(${hqUrl})` }
            : { backgroundColor: '#0c0a09' }
        }
        aria-hidden
      />
      {/* Readability overlay — keeps panels/text legible over the HQ painting */}
      <div
        className="pointer-events-none absolute inset-0 bg-stone-950/75"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 30%, rgba(28,25,23,0.55) 0%, rgba(12,10,9,0.88) 70%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
};
