/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { startingGuildHqUrl } from '../../lib/locations';

interface GuildHqBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-bleed Starting Guild HQ art with a light darkening overlay so UI stays
 * readable while the painting remains visible.
 */
export const GuildHqBackground: React.FC<GuildHqBackgroundProps> = ({
  children,
  className = '',
}) => {
  const hqUrl = startingGuildHqUrl();
  const [failed, setFailed] = useState(false);
  const showArt = Boolean(hqUrl) && !failed;

  return (
    <div className={`relative min-h-screen overflow-hidden text-stone-200 ${className}`}>
      {showArt ? (
        <img
          src={hqUrl!}
          alt=""
          aria-hidden
          onError={() => setFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-stone-950" aria-hidden />
      )}
      {/* Soft veil — keep the HQ visible, just darken enough for contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,10,9,0.45) 0%, rgba(12,10,9,0.55) 45%, rgba(12,10,9,0.72) 100%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
};
