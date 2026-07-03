'use client';

import type { LandingTemplate } from '../types';
import type { DishOption } from '../utils';
import { renderTemplate } from '../registry';
import { DESIGN_NATURAL_WIDTH } from '../constants';

export type { DishOption };

export interface LivePreviewEventData {
  coupleName?: string;
  formattedDate?: string;
  time?: string;
  venue?: string;
  dishOptions?: DishOption[];
}

interface LiveTemplatePreviewProps {
  template: LandingTemplate;
  eventData?: LivePreviewEventData;
  /** Scale factor; default calculates to fit ~180px wide card */
  scale?: number;
  /** Whether the preview is interactive (dialog mode) */
  interactive?: boolean;
  className?: string;
}

export function LiveTemplatePreview({
  template,
  eventData = {},
  scale,
  interactive = false,
  className,
}: LiveTemplatePreviewProps) {
  const data = eventData;
  const palette = (template.accentPair ?? ['#FF6B6B', '#4ECDC4']) as [string, string];

  const wrapperStyle = {
    position: 'relative' as const,
    overflow: 'hidden',
    ...(scale !== undefined
      ? {
          width: DESIGN_NATURAL_WIDTH,
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
        }
      : {}),
  };

  return (
    <div className={className} style={wrapperStyle}>
      {!interactive && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }} />
      )}
      {renderTemplate(template.id, {
        coupleName: data.coupleName,
        formattedDate: data.formattedDate,
        time: data.time,
        venue: data.venue,
        dishOptions: data.dishOptions ?? [],
        palette,
        interactive,
        showConfetti: interactive,
      })}
    </div>
  );
}
