/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import buttonArt from '../../assets/ui/button.png';

type UiButtonVariant = 'primary' | 'ghost' | 'danger';

interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: UiButtonVariant;
  /** Stretch to full width of the parent. */
  fullWidth?: boolean;
}

const VARIANT_TEXT: Record<UiButtonVariant, string> = {
  primary: 'text-[#E8D7B8]',
  ghost: 'text-[#C9B896]',
  danger: 'text-[#E8B4A8]',
};

/**
 * Fantasy framed action button. Uses the `button` UI asset as the chrome;
 * label color shifts slightly by variant while the frame art stays the same.
 */
export const UiButton: React.FC<UiButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 bg-center bg-no-repeat px-12 py-4 font-sans font-bold uppercase tracking-widest transition-[filter,transform,opacity] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale hover:brightness-110 active:scale-[0.98] ${VARIANT_TEXT[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        backgroundImage: `url(${buttonArt})`,
        backgroundSize: '100% 100%',
        minHeight: '3.5rem',
        minWidth: '9.5rem',
        fontSize: '0.7rem',
        lineHeight: 1.1,
        border: 'none',
        boxShadow: 'none',
      }}
      {...rest}
    >
      <span className="relative z-[1] flex items-center justify-center gap-1.5 whitespace-nowrap">
        {children}
      </span>
    </button>
  );
};
