'use client';

import { useTranslations } from 'next-intl';
import { LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateCard } from './template-card';
import { type LandingTemplate } from '../types';
import { type LivePreviewEventData } from './live-template-preview';

interface TemplateLibraryGridProps {
  templates: LandingTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPreview: (template: LandingTemplate) => void;
  livePreviewData?: LivePreviewEventData;
}

export function TemplateLibraryGrid({
  templates,
  selectedId,
  onSelect,
  onPreview,
  livePreviewData,
}: TemplateLibraryGridProps) {
  const t = useTranslations('templates');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 shrink-0 text-primary" />
          <CardTitle className="text-xl font-bold">{t('library.title')}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t('library.description')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={template.id === selectedId}
              onSelect={onSelect}
              onPreview={onPreview}
              livePreviewData={livePreviewData}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
