// Card — the standard glass surface panel used across the app.
//
// Every surface feels like frosted glass sitting above a dark premium base:
//   • Semi-transparent background with backdrop-blur
//   • Thin bright border on upper + left edge (light catching the glass edge)
//   • Very slight accent-tinted inner glow on active state
//   • Industry accent bleeds into the glass background at low opacity

import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  /** Accent-glowing border + glass-active treatment. */
  active?: boolean;
  /** Dims + disables interaction (e.g. unaffordable). */
  muted?: boolean;
  /** Padding scale. Defaults to 'md'. */
  pad?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const PAD: Record<NonNullable<CardProps['pad']>, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
};

export default function Card({
  children,
  onClick,
  active  = false,
  muted   = false,
  pad     = 'md',
  className = '',
  style,
}: CardProps) {
  const clickable = !!onClick && !muted;

  const base = [
    'relative rounded-2xl transition-all duration-200 overflow-hidden',
    // Glass surface foundation
    'backdrop-blur-sm',
  ].join(' ');

  const surface = active
    ? 'glass-active'
    : 'glass';

  const hoverCls = clickable
    ? [
        'cursor-pointer',
        'active:scale-[0.984]',
        // On hover, the accent-tint in the glass deepens slightly
        active
          ? 'hover:brightness-110'
          : 'hover:brightness-105',
      ].join(' ')
    : '';

  const mutedCls = muted ? 'opacity-45 pointer-events-none' : '';

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`${base} ${surface} ${hoverCls} ${mutedCls} ${PAD[pad]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
