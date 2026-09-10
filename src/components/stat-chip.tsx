import { cn } from '@/lib/utils';

/**
 * One count in a stat strip: an accented label above a number, with an optional
 * secondary line. Generic chrome - it owns the layout and the type sizes and
 * nothing else.
 *
 * `accentClassName` must come from a presentation module (for example
 * `callOutcomePresentation(outcome).accent`), never a hand-picked palette
 * class. It used to be a raw `colorClass` string and this component existed
 * byte-identically in two features, each choosing its own greens.
 */
export function StatChip({
  icon,
  label,
  value,
  hint,
  accentClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  /** Secondary line - e.g. the headcount behind a count of guest records */
  hint?: string;
  accentClassName: string;
}) {
  return (
    // min-w-0 lets the chips share a narrow row instead of forcing the stat
    // strip wider than the card.
    <div className="bg-muted/50 flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center sm:px-3">
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          accentClassName,
        )}
      >
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-foreground text-xl font-semibold tabular-nums">
        {value}
      </span>
      {hint && (
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {hint}
        </span>
      )}
    </div>
  );
}
