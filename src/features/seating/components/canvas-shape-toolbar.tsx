'use client';

import * as React from 'react';
import { Move, Circle, Square, RectangleHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type CanvasTool = 'move' | 'round' | 'square' | 'rectangle';

interface CanvasShapeToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
}

const TOOLS: Array<{ id: CanvasTool; icon: React.ReactNode; labelKey: string; showLabel?: boolean }> = [
  { id: 'move', icon: <Move className="h-3.5 w-3.5" />, labelKey: 'tools.move', showLabel: true },
  { id: 'round', icon: <Circle className="h-3.5 w-3.5" />, labelKey: 'tools.round' },
  { id: 'square', icon: <Square className="h-3.5 w-3.5" />, labelKey: 'tools.square' },
  {
    id: 'rectangle',
    icon: <RectangleHorizontal className="h-3.5 w-3.5" />,
    labelKey: 'tools.rectangle',
  },
];

export function CanvasShapeToolbar({ tool, onToolChange }: CanvasShapeToolbarProps) {
  const t = useTranslations('seating');

  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border bg-background px-1.5 py-1.5 shadow-md">
      {TOOLS.map(({ id, icon, labelKey, showLabel }) => (
        <button
          key={id}
          type="button"
          title={t(labelKey)}
          onClick={() => onToolChange(id)}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
            tool === id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {icon}
          {showLabel && <span>{t(labelKey)}</span>}
        </button>
      ))}
    </div>
  );
}
