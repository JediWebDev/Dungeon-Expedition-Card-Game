/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/** Shared frame color for section / text outlines. */
export const UI_FRAME_COLOR = '#D7BF92';

/** Crisp 1px frame for panels that hold headers or body text. */
export const uiSectionFrame = 'border border-[#D7BF92] rounded-sm';

/** Semi-dark panel fill used over the HQ background. */
export const uiPanelBg = 'bg-stone-950/85';

/** Framed semi-dark panel (sections, cards, inventory panes). */
export const uiPanel = `${uiPanelBg} ${uiSectionFrame}`;

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
 * Section title inside a crisp outlined text box with a semi-dark fill.
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
      className={`inline-flex max-w-full items-center gap-2 border border-[#D7BF92] bg-stone-950/90 px-5 py-2.5 font-serif font-bold uppercase tracking-wide text-[#D7BF92] ${className}`}
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
