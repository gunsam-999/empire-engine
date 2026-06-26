// Card — the standard premium panel used across the app.
// Dark card surface, rounded-2xl, accent-aware hover/active states.

import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  /** Adds hover lift + pointer cursor and forwards onClick. */
  onClick?: () => void;
  /** Glow + accent border, e.g. for a selected/affordable card. */
  active?: boolean;
  /** Dims + disables interaction (e.g. unaffordable). */
  muted?: boolean;
  /** Padding scale. Defaults to 'md' (p-4). */
  pad?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const PAD: Record<NonNullable<CardProps['pad']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export default function Card({
  children,
  onClick,
  active = false,
  muted = false,
  pad = 'md',
  className = '',
  style,
}: CardProps) {
  const clickable = !!onClick && !muted;

  const base =
    'rounded-2xl border bg-[#151c2b] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)] transition-all duration-200';
  const borderCls = active ? 'border-[var(--accent)]' : 'border-[#232c3e]';
  const hoverCls = clickable ? 'hover:bg-[#1b2334] active:scale-[0.985] cursor-pointer' : '';
  const mutedCls = muted ? 'opacity-50' : '';

  const glow: CSSProperties = active
    ? {
        boxShadow:
          '0 0 0 1px var(--accent), 0 6px 22px -8px color-mix(in srgb, var(--accent) 55%, transparent)',
      }
    : {};

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
      className={`${base} ${borderCls} ${hoverCls} ${mutedCls} ${PAD[pad]} ${className}`}
      style={{ ...glow, ...style }}
    >
      {children}
    </div>
  );
}
