// ToastNotification  -  lightweight toast system with a module-level event bus.
//
//   import { toast, ToastHost } from './components/shared/ToastNotification';
//   // mount <ToastHost /> once near the app root, then anywhere:
//   toast('Research complete!', { kind: 'good', icon: '🔬' });
//
// No external libs. Toasts slide up, auto-dismiss, and stack newest-on-top.

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastKind = 'info' | 'good' | 'bad' | 'warn' | 'accent';

export interface ToastOptions {
  /** Color theme. Defaults to 'info'. */
  kind?: ToastKind;
  /** Emoji/icon shown on the left. */
  icon?: ReactNode;
  /** Auto-dismiss after this many ms. Defaults to 2600. Use 0 to persist. */
  durationMs?: number;
  /** Secondary line under the message. */
  detail?: ReactNode;
}

export interface ToastItem extends ToastOptions {
  id: number;
  message: ReactNode;
}

// ---- Module-level event bus -------------------------------------------------

type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Fire a toast from anywhere (components, reducers' side-effects, systems). */
export function toast(message: ReactNode, opts: ToastOptions = {}): number {
  const item: ToastItem = { id: nextId++, message, ...opts };
  listeners.forEach((l) => l(item));
  return item.id;
}

/** Convenience helpers. */
toast.good = (message: ReactNode, opts: ToastOptions = {}) =>
  toast(message, { kind: 'good', ...opts });
toast.bad = (message: ReactNode, opts: ToastOptions = {}) =>
  toast(message, { kind: 'bad', ...opts });
toast.warn = (message: ReactNode, opts: ToastOptions = {}) =>
  toast(message, { kind: 'warn', ...opts });
toast.accent = (message: ReactNode, opts: ToastOptions = {}) =>
  toast(message, { kind: 'accent', ...opts });

/** Subscribe to the toast bus. Returns an unsubscribe fn. */
export function onToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- Visual styling per kind ------------------------------------------------

const KIND_STYLES: Record<ToastKind, { border: string; bar: string; text: string }> = {
  info: { border: 'border-[#232c3e]', bar: 'bg-[#8a94a8]', text: 'text-[#e7ecf5]' },
  good: { border: 'border-[#34d399]/40', bar: 'bg-[#34d399]', text: 'text-[#34d399]' },
  bad: { border: 'border-[#f87171]/40', bar: 'bg-[#f87171]', text: 'text-[#f87171]' },
  warn: { border: 'border-[#fbbf24]/40', bar: 'bg-[#fbbf24]', text: 'text-[#fbbf24]' },
  accent: {
    border: 'border-[var(--accent)]/50',
    bar: 'bg-[var(--accent)]',
    text: 'text-[var(--accent)]',
  },
};

// ---- Single toast -----------------------------------------------------------

interface ToastNotificationProps {
  item: ToastItem;
  onDismiss: (id: number) => void;
}

export function ToastNotification({ item, onDismiss }: ToastNotificationProps) {
  const kind = item.kind ?? 'info';
  const styles = KIND_STYLES[kind];
  const duration = item.durationMs ?? 2600;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (duration <= 0) return;
    timerRef.current = window.setTimeout(() => onDismiss(item.id), duration);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [item.id, duration, onDismiss]);

  return (
    <div
      role="status"
      onClick={() => onDismiss(item.id)}
      className={`pointer-events-auto flex w-full cursor-pointer items-start gap-2.5
        overflow-hidden rounded-xl border ${styles.border} bg-[#151c2b]/95 backdrop-blur
        px-3 py-2.5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.8)] animate-slide-up`}
    >
      <span className={`w-1 self-stretch shrink-0 rounded-full ${styles.bar}`} aria-hidden />
      {item.icon !== undefined && (
        <span className="text-lg leading-none mt-0.5 shrink-0">{item.icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold leading-snug ${styles.text}`}>{item.message}</div>
        {item.detail !== undefined && (
          <div className="text-xs text-[#8a94a8] mt-0.5 leading-snug">{item.detail}</div>
        )}
      </div>
    </div>
  );
}

// ---- Host: mount once, listens to the bus -----------------------------------

export interface ToastHostProps {
  /** Maximum toasts visible at once (older ones drop). Defaults to 4. */
  max?: number;
}

export function ToastHost({ max = 4 }: ToastHostProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return onToast((t) => {
      setItems((prev) => {
        const next = [...prev, t];
        return next.length > max ? next.slice(next.length - max) : next;
      });
    });
  }, [max]);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex max-w-[440px] flex-col gap-2 px-3">
      {items.map((t) => (
        <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export default ToastNotification;
