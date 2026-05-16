'use client';

import * as React from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface CanvasZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function CanvasZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFitView,
}: CanvasZoomControlsProps) {
  const t = useTranslations('seating');

  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-0.5 rounded-lg border bg-background p-1 shadow-sm">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onZoomIn}
        title={t('zoom.in')}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <span className="w-9 select-none text-center text-xs font-medium text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onZoomOut}
        title={t('zoom.out')}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <div className="my-0.5 h-px w-5 bg-border" />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onFitView}
        title={t('zoom.fit')}
      >
        <Maximize className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
