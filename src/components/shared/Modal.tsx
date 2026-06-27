// Modal — glass-surface overlay primitive.
// Frosted glass panel, cinematic slide-up entrance, scrim with subtle blur.
// Mobile-first: anchors to bottom. Centered on sm+ screens.

import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  title?: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  hideClose?: boolean;
  dismissOnBackdrop?: boolean;
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
      {/* Scrim — deeper than before, with backdrop blur */}
      <div
        className="absolute inset-0 bg-black/72 backdrop-blur-sm animate-fade-in"
        onClick={dismissOnBackdrop ? onClose : undefined}
      />

      {/* Glass panel */}
      <div
        className={[
          'relative w-full mx-auto max-h-[90vh] flex flex-col',
          'rounded-t-3xl sm:rounded-2xl',
          'animate-slide-up',
          'overflow-hidden',
          // Glass surface
          'glass-panel',
          // Cinematic shadow
          'shadow-cinematic',
          SIZE[size],
        ].join(' ')}
      >
        {/* Subtle shimmer line across the top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.10) 60%, transparent 100%)',
          }}
          aria-hidden
        />

        {/* Header */}
        {(title || !hideClose) && (
          <div
            className="flex items-start gap-3 px-4 pt-4 pb-3"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {icon && (
              <span className="text-2xl leading-none mt-0.5" aria-hidden>
                {icon}
              </span>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-[#e7ecf5] leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-[#8a94a8] mt-0.5">{subtitle}</p>
              )}
            </div>
            {!hideClose && onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className={[
                  'shrink-0 -mt-1 -mr-1 h-8 w-8 grid place-items-center rounded-xl',
                  'text-[#8a94a8] hover:text-[#e7ecf5]',
                  'glass hover:glass-active',
                  'active:scale-90 transition-transform duration-150',
                ].join(' ')}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-4 py-3 glass-panel backdrop-blur"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
