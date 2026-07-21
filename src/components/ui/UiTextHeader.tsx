/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/** Shared frame color for section / text outlines. */
export const UI_FRAME_COLOR = '#D7BF92';

/** Crisp 1px frame for panels that hold headers or body text. */
export const uiSectionFrame = 'border border-[#D7BF92] rounded-sm';

type HeaderTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';

interface UiTextHeaderProps {
  children: React.ReactNode;
  as?: HeaderTag;
  className?: string;
  id?: string;
  /** Optional leading icon (rendered beside the title). */
  icon?: React.ReactNode;
}

/**
 * Section title — clean responsive type with no bitmap chrome.
 * Pair with `uiSectionFrame` on the surrounding panel for the gold outline.
 */
export const UiTextHeader: React.FC<UiTextHeaderProps> = ({
  children,
  as: Tag = 'h2',
  className = '',
  id,
  icon,
}) => {
  return (
    <Tag
      id={id}
      className={`inline-flex max-w-full items-center gap-2 font-serif font-bold uppercase tracking-wide text-[#D7BF92] ${className}`}
      style={{
        fontSize: 'clamp(0.85rem, 1.5vw, 1.15rem)',
        lineHeight: 1.25,
      }}
    >
      {icon ? <span className="shrink-0 text-[#D7BF92]">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </Tag>
  );
};
