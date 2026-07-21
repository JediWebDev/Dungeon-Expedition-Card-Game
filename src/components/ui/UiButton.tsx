/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import buttonArt from '../../assets/ui/button.png';

type UiButtonVariant = 'primary' | 'ghost' | 'danger';
type UiButtonSize = 'md' | 'sm';

interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: UiButtonVariant;
  size?: UiButtonSize;
  /** Stretch to full width of the parent. */
  fullWidth?: boolean;
}

const VARIANT_TEXT: Record<UiButtonVariant, string> = {
  primary: 'text-[#E8D7B8]',
  ghost: 'text-[#C9B896]',
  danger: 'text-[#E8B4A8]',
};

const SIZE_STYLES: Record<UiButtonSize, React.CSSProperties> = {
  md: {
    minHeight: '3.75rem',
    minWidth: '10.5rem',
    fontSize: '0.75rem',
    padding: '1rem 2.5rem',
  },
  sm: {
    minHeight: '2.75rem',
    minWidth: '0',
    fontSize: '0.65rem',
    padding: '0.65rem 1.1rem',
  },
};

/**
 * Fantasy framed action button. Uses the `button` UI asset as the chrome;
 * label color shifts slightly by variant while the frame art stays the same.
 */
export const UiButton: React.FC<UiButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  style,
  ...rest
}) => {
  const sizeStyle = SIZE_STYLES[size];

  return (
    <button
      type={type}
      disabled={disabled}
      className={`relative inline-flex max-w-full items-center justify-center gap-1.5 bg-center bg-no-repeat font-sans font-bold uppercase tracking-widest transition-[filter,transform,opacity] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale hover:brightness-110 active:scale-[0.98] ${VARIANT_TEXT[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        backgroundImage: `url(${buttonArt})`,
        backgroundSize: '100% 100%',
        lineHeight: 1.1,
        border: 'none',
        boxShadow: 'none',
        ...sizeStyle,
        ...(fullWidth ? { minWidth: 0 } : null),
        ...style,
      }}
      {...rest}
    >
      <span className="relative z-[1] flex max-w-full items-center justify-center gap-1.5 truncate">
        {children}
      </span>
    </button>
  );
};
