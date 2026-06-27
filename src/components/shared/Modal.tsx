// Modal  -  shared overlay primitive. Dark scrim, centered premium panel,
// slide-up entrance, optional dismiss-on-backdrop, esc-to-close, scroll lock.
// Mobile-first: sticks to the bottom of the screen on small viewports.

import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  /** Heading shown in the modal chrome. */
  title?: ReactNode;
  /** Emoji/icon rendered before the title. */
  icon?: ReactNode;
  /** Optional small line under the title. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Footer area (typically action buttons). Sticks to the bottom. */
  footer?: ReactNode;
  /** Called when the user dismisses (backdrop, esc, or the × button). */
  onClose?: () => void;
  /** Hide the × close button (e.g. forced decisions). Default false. */
  hideClose?: boolean;
  /** Allow closing by tapping the dark backdrop. Default true. */
  dismissOnBackdrop?: boolean;
  /** Max width preset. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[340px]',
  md: 'max-w-[420px]',
  lg: 'max-w-[460px]',
};

export default function Modal({
  title,
  icon,
  subtitle,
  children,
  footer,
  onClose,
  hideClose = false,
  dismissOnBackdrop = true,
  size = 'md',
}: ModalProps) {
  // Esc to close + body scroll lock while mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={dismissOnBackdrop ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className={`relative ${SIZE[size]} w-full mx-auto max-h-[90vh] flex flex-col
          rounded-t-2xl sm:rounded-2xl border border-[#232c3e] bg-[#0e1420]
          shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.8)] sm:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]
          animate-slide-up overflow-hidden`}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-[#232c3e]">
            {icon && <span className="text-2xl leading-none mt-0.5">{icon}</span>}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-[#e7ecf5] leading-tight">{title}</h2>
              )}
              {subtitle && <p className="text-xs text-[#8a94a8] mt-0.5">{subtitle}</p>}
            </div>
            {!hideClose && onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mt-1 -mr-1 h-8 w-8 grid place-items-center rounded-lg
                  text-[#8a94a8] hover:text-[#e7ecf5] hover:bg-[#1b2334] active:scale-95
                  transition-transform"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body (scrolls) */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-[#232c3e] bg-[#0e1420]/80 backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
