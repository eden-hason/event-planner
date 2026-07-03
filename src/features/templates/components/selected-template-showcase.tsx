'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TemplatePreview } from './template-preview';
import { LiveTemplatePreview, type LivePreviewEventData } from './live-template-preview';
import { type LandingTemplate } from '../types';

interface SelectedTemplateShowcaseProps {
  template: LandingTemplate;
  onPreview: (template: LandingTemplate) => void;
  livePreviewData?: LivePreviewEventData;
}

const DESIGN_WIDTH = 390;
// At 192px (w-48) container width
const SHOWCASE_SCALE = 0.49;

export function SelectedTemplateShowcase({
  template,
  onPreview,
  livePreviewData,
}: SelectedTemplateShowcaseProps) {
  const t = useTranslations('templates');
  const isLive = template.kind === 'live';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <CardTitle className="text-xl font-bold">{t('showcase.title')}</CardTitle>
        </div>
        <CardDescription>{t('showcase.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-center sm:self-auto">
            <div className="relative aspect-[4/5] w-48 overflow-hidden rounded-xl border ring-2 ring-primary ring-offset-2">
              {isLive ? (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div style={{ width: DESIGN_WIDTH, position: 'absolute', left: '50%', marginLeft: `-${DESIGN_WIDTH / 2}px`, transformOrigin: 'top center', transform: `scale(${SHOWCASE_SCALE})` }}>
                    <LiveTemplatePreview template={template} eventData={livePreviewData} interactive={false} />
                  </div>
                </div>
              ) : (
                <TemplatePreview template={template} className="h-full w-full" />
              )}
            </div>
            <div className="animate-in fade-in-0 absolute end-2 top-2 duration-200">
              <Badge className="text-xs">{t('showcase.activeBadge')}</Badge>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3
                  className="text-2xl font-bold leading-none"
                  style={{ fontFamily: 'var(--font-plus-jakarta)' }}
                >
                  {template.name}
                </h3>
                <Badge variant="secondary" className="capitalize">
                  {t(`categories.${template.category}`)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onPreview(template)}>
                {t('showcase.preview')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
