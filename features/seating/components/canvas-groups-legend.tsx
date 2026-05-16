'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { groupColor } from '../utils/group-color';

const MAX_VISIBLE = 6;

interface Group {
  id: string;
  name: string;
}

interface CanvasGroupsLegendProps {
  groups: Group[];
  highlightGroupId: string | null;
  onHighlightChange: (id: string | null) => void;
}

export function CanvasGroupsLegend({
  groups,
  highlightGroupId,
  onHighlightChange,
}: CanvasGroupsLegendProps) {
  const t = useTranslations('seating');

  if (groups.length === 0) return null;

  const visible = groups.slice(0, MAX_VISIBLE);
  const overflow = groups.length - MAX_VISIBLE;

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('legend.groups')}
      </span>
      <div className="flex items-center gap-1.5">
        {visible.map((group) => {
          const color = groupColor(group.id);
          const isActive = !highlightGroupId || highlightGroupId === group.id;
          return (
            <button
              key={group.id}
              type="button"
              title={group.name}
              onClick={() =>
                onHighlightChange(highlightGroupId === group.id ? null : group.id)
              }
              className={cn(
                'h-3.5 w-3.5 rounded-full transition-opacity',
                !isActive && 'opacity-30',
              )}
              style={{ backgroundColor: color.bg }}
            />
          );
        })}
        {overflow > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('legend.moreCount', { count: overflow })}
          </span>
        )}
      </div>
    </div>
  );
}
