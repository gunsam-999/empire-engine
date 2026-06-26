// ============================================================================
// TabButton — a single bottom-nav tab. Emoji glyph over a tiny label.
// Active tab lights up in the dynamic accent (text + soft glow + dot).
// Optional `pulse` adds the accent ping ring to nudge the player (e.g. when
// a prestige is newly worthwhile or story beats are queued).
// ============================================================================

import type { ReactNode } from 'react';

export interface TabButtonProps {
  /** Emoji icon for the tab. */
  icon: ReactNode;
  /** Short label rendered under the icon. */
  label: string;
  /** Whether this tab is the current screen. */
  active: boolean;
  onClick: () => void;
  /** Pulse the accent ring to draw attention. */
  pulse?: boolean;
  /** Optional small badge (e.g. queued count) shown on the icon. */
  badge?: number;
  className?: string;
}

export default function TabButton({
  icon,
  label,
  active,
  onClick,
  pulse = false,
  badge,
  className = '',
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2
        rounded-xl transition-transform active:scale-95 select-none ${className}`}
      style={
        active
          ? { color: 'var(--accent)' }
          : undefined
      }
    >
      <span className="relative inline-flex">
        {/* pulsing attention ring */}
        {pulse && (
          <span
            className="absolute inset-0 -m-1 rounded-full animate-pulse-accent pointer-events-none"
            aria-hidden
          />
        )}
        <span
          className={`text-xl leading-none transition-transform duration-200 ${
            active ? 'scale-110' : 'scale-100 opacity-70'
          }`}
        >
          {icon}
        </span>
        {/* numeric badge */}
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -right-2 -top-1.5 min-w-[16px] h-4 px-1 rounded-full
              text-[10px] font-bold leading-4 text-center text-[#070b12]"
            style={{ background: 'var(--accent)' }}
            aria-hidden
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors ${
          active ? '' : 'text-muted'
        }`}
      >
        {label}
      </span>

      {/* active underline dot */}
      <span
        className={`absolute bottom-0.5 h-1 w-1 rounded-full transition-opacity ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'var(--accent)' }}
        aria-hidden
      />
    </button>
  );
}
