'use client';

import { cn } from '@/lib/utils';
import { TABLE_SHAPES, type TableShape } from '../schemas';
import { seatLayout } from '../utils/seat-layout';
import { useSeatingCopy } from './use-seating-copy';

interface ShapePickerProps {
  value: TableShape;
  onChange: (shape: TableShape) => void;
}

/** A miniature of the real diagram, so the choice previews its own result. */
function ShapeGlyph({ shape }: { shape: TableShape }) {
  const layout = seatLayout(shape, 8);
  return (
    <svg viewBox={layout.viewBox} className="h-6 w-8" aria-hidden="true">
      {layout.top.kind === 'circle' ? (
        <circle
          cx={layout.top.cx}
          cy={layout.top.cy}
          r={layout.top.r}
          className="fill-none stroke-current"
          strokeWidth={6}
        />
      ) : (
        <rect
          x={layout.top.x}
          y={layout.top.y}
          width={layout.top.width}
          height={layout.top.height}
          rx={10}
          className="fill-none stroke-current"
          strokeWidth={6}
        />
      )}
    </svg>
  );
}

export function ShapePicker({ value, onChange }: ShapePickerProps) {
  const { t } = useSeatingCopy();

  return (
    <div className="grid grid-cols-3 gap-2">
      {TABLE_SHAPES.map((shape) => (
        <button
          key={shape}
          type="button"
          onClick={() => onChange(shape)}
          aria-pressed={value === shape}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 transition-colors',
            value === shape
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted/60',
          )}
        >
          <ShapeGlyph shape={shape} />
          <span className="text-xs font-medium">{t(`shapes.${shape}`)}</span>
        </button>
      ))}
    </div>
  );
}
