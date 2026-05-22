'use client';

import { cn } from '@/lib/utils';
import { type LandingTemplate } from '../types';
import { LiveTemplatePreview, type LivePreviewEventData } from './live-template-preview';

interface TemplatePreviewProps {
  template: LandingTemplate;
  coupleName?: string;
  eventDate?: string;
  size?: 'sm' | 'lg';
  className?: string;
  livePreviewData?: LivePreviewEventData;
  interactive?: boolean;
}

const DESIGN_WIDTH = 390;

export function TemplatePreview({
  template,
  coupleName = 'Sarah & James',
  eventDate = 'June 14, 2025',
  size = 'sm',
  className,
  livePreviewData,
  interactive = false,
}: TemplatePreviewProps) {
  const { palette } = template;
  const isLg = size === 'lg';

  if (template.kind === 'live') {
    // Compute scale to fit within the rendered container
    // sm: the card thumbnail is rendered at natural size then the parent clips/scales via CSS
    // We pass no scale here and let the parent container handle clipping
    return (
      <div className={cn('relative overflow-hidden', className)} style={{ background: '#fff' }}>
        <div
          style={{
            width: DESIGN_WIDTH,
            transformOrigin: 'top center',
            pointerEvents: interactive ? 'auto' : 'none',
          }}
        >
          <LiveTemplatePreview
            template={template}
            eventData={livePreviewData}
            interactive={interactive}
          />
        </div>
      </div>
    );
  }

  // Existing palette-based preview
  return (
    <div
      className={cn('relative flex flex-col overflow-hidden', className)}
      style={{ background: palette.bgGradient ?? palette.bg }}
    >
      <div className="w-full shrink-0" style={{ height: isLg ? '4px' : '2px', background: palette.accent, opacity: 0.7 }} />

      <div className={cn('flex flex-1 flex-col items-center justify-center text-center', isLg ? 'gap-5 px-10 py-10' : 'gap-2 px-4 py-4')}>
        <div
          className={cn('flex shrink-0 items-center justify-center rounded-full', isLg ? 'size-16 text-lg' : 'size-8 text-[9px]')}
          style={{
            background: `${palette.accent}18`,
            border: `${isLg ? 2 : 1}px solid ${palette.accent}40`,
            color: palette.accent,
            fontFamily: 'var(--font-plus-jakarta)',
            fontWeight: 700,
            letterSpacing: isLg ? '0.05em' : 0,
          }}
        >
          {isLg ? 'S & J' : 'S&J'}
        </div>

        <div style={{ color: palette.text, fontFamily: 'var(--font-plus-jakarta)', fontWeight: 700, fontSize: isLg ? '1.6rem' : '0.52rem', lineHeight: 1.2, letterSpacing: isLg ? '-0.02em' : 0 }}>
          {isLg ? coupleName : coupleName.replace(' & ', '\n&\n').split('\n').join(' ')}
        </div>

        <div className={cn('shrink-0', isLg ? 'w-12' : 'w-5')} style={{ height: isLg ? '1px' : '0.5px', background: `${palette.accent}60` }} />

        <div style={{ color: palette.muted, fontSize: isLg ? '0.875rem' : '0.38rem', letterSpacing: isLg ? '0.1em' : '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
          {eventDate}
        </div>

        <div className={cn('shrink-0', isLg ? 'mt-2' : 'mt-0')}
          style={{
            background: palette.button, color: '#ffffff', borderRadius: '999px',
            padding: isLg ? '0.625rem 2rem' : '0.2rem 0.6rem',
            fontSize: isLg ? '0.875rem' : '0.36rem', fontWeight: 600,
            letterSpacing: isLg ? '0.06em' : '0.02em', textTransform: 'uppercase',
          }}>
          RSVP
        </div>
      </div>

      <div className="w-full shrink-0" style={{ height: isLg ? '4px' : '2px', background: palette.accent, opacity: 0.7 }} />
    </div>
  );
}
