/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import textBoxArt from '../../assets/ui/text_box.png';

type HeaderTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';

interface UiTextHeaderProps {
  children: React.ReactNode;
  as?: HeaderTag;
  className?: string;
  /** Optional leading icon (rendered inside the banner). */
  icon?: React.ReactNode;
}

/**
 * Ornate text banner for section titles. Uses the `Text box` UI asset as a
 * 9-slice-friendly background that stretches with the label.
 */
export const UiTextHeader: React.FC<UiTextHeaderProps> = ({
  children,
  as: Tag = 'h2',
  className = '',
  icon,
}) => {
  return (
    <Tag
      className={`relative inline-flex max-w-full items-center justify-center gap-2 bg-center bg-no-repeat px-16 py-5 text-center font-serif font-bold uppercase tracking-wide text-[#3A2A18] ${className}`}
      style={{
        backgroundImage: `url(${textBoxArt})`,
        backgroundSize: '100% 100%',
        minHeight: '3.75rem',
        minWidth: '15rem',
        fontSize: 'clamp(0.8rem, 1.6vw, 1.05rem)',
        lineHeight: 1.2,
      }}
    >
      {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
      <span className="relative z-[1] truncate">{children}</span>
    </Tag>
  );
};
