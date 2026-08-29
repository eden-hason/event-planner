'use client';

import { Minus, Plus, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeatingCopy } from './use-seating-copy';

interface CanvasZoomControlsProps {
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function CanvasZoomControls({
  scale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onFit,
}: CanvasZoomControlsProps) {
  const { t } = useSeatingCopy();

  return (
    <div className="bg-card border-border absolute bottom-4 start-4 flex items-center gap-1 rounded-lg border p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t('zoom.out')}
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="text-muted-foreground w-11 text-center text-xs tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t('zoom.in')}
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t('zoom.fit')}
        onClick={onFit}
      >
        <Scan className="size-3.5" />
      </Button>
    </div>
  );
}
