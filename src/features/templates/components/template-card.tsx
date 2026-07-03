'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TemplatePreview } from './template-preview';
import { type LandingTemplate } from '../types';
import { type LivePreviewEventData } from './live-template-preview';
import { LiveTemplatePreview } from './live-template-preview';
import { DESIGN_NATURAL_WIDTH } from '../constants';

interface TemplateCardProps {
  template: LandingTemplate;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPreview: (template: LandingTemplate) => void;
  livePreviewData?: LivePreviewEventData;
}

export function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  livePreviewData,
}: TemplateCardProps) {
  const t = useTranslations('templates');
  const isLive = template.kind === 'live';
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / DESIGN_NATURAL_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={cardRef}
        className={cn(
          'group relative aspect-[4/5] overflow-hidden rounded-xl border transition-all duration-200',
          isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/40',
        )}
      >
        {isLive ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {scale !== null && (
              <div
                style={{
                  width: DESIGN_NATURAL_WIDTH,
                  position: 'absolute',
                  left: '50%',
                  marginLeft: `-${DESIGN_NATURAL_WIDTH / 2}px`,
                  transformOrigin: 'top center',
                  transform: `scale(${scale})`,
                }}
              >
                <LiveTemplatePreview
                  template={template}
                  eventData={livePreviewData}
                  interactive={false}
                />
              </div>
            )}
          </div>
        ) : (
          <TemplatePreview template={template} className="h-full w-full" />
        )}

        {isSelected && (
          <div className="animate-in fade-in-0 zoom-in-95 absolute start-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground duration-200">
            <Check className="size-3.5" />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-foreground/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button size="sm" variant="secondary" onClick={() => onPreview(template)} className="w-28">
            {t('card.preview')}
          </Button>
          <Button size="sm" onClick={() => onSelect(template.id)} disabled={isSelected} className="w-28">
            {isSelected ? t('card.selected') : t('card.select')}
          </Button>
        </div>
      </div>

      <div className="px-0.5">
        <p className="text-sm font-medium leading-none" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
          {template.name}
        </p>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {t(`categories.${template.category}`)}
        </p>
      </div>
    </div>
  );
}
