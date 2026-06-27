// ============================================================================
// ProgressBar  -  accent-filled track for countdowns / completion.
// `value` is a fraction in [0,1]. Optional label overlay + pulse on near-done.
// ============================================================================

interface ProgressBarProps {
  /** Fraction complete, 0..1. */
  value: number;
  className?: string;
  /** Height utility class, defaults to a slim 8px bar. */
  heightClass?: string;
  /** Centered label rendered over the track. */
  label?: string;
  /** Use the accent color (default) or an explicit color. */
  color?: string;
  /** Soft pulse animation when filling. */
  pulse?: boolean;
}

export function ProgressBar({
  value,
  className = '',
  heightClass = 'h-2',
  label,
  color = 'var(--accent)',
  pulse = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-[#0b101a] border border-[#232c3e] ${heightClass} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
          pulse ? 'animate-pulse' : ''
        }`}
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})`,
          boxShadow: `0 0 12px color-mix(in srgb, ${color} 55%, transparent)`,
        }}
      />
      {label !== undefined && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-mono font-semibold tabular-nums text-[#e7ecf5]">
          {label}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
