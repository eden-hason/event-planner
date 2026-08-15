'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { TemplatesHeader } from './templates-header';
import { SelectedTemplateShowcase } from './selected-template-showcase';
import { TemplateLibraryGrid } from './template-library-grid';
import { TemplatePreviewDialog } from './template-preview-dialog';
import { type LandingTemplate } from '../types';
import { type LivePreviewEventData } from './live-template-preview';
import { updateEventLandingTemplate } from '@/features/events/actions';
import posthog from 'posthog-js';

interface TemplatesPageProps {
  templates: LandingTemplate[];
  defaultSelectedId: string;
  eventId: string;
  livePreviewData?: LivePreviewEventData;
}

export function TemplatesPage({
  templates,
  defaultSelectedId,
  eventId,
  livePreviewData,
}: TemplatesPageProps) {
  const t = useTranslations('templates');
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const [previewTemplate, setPreviewTemplate] = useState<LandingTemplate | null>(null);
  const [, startTransition] = useTransition();

  const selectedTemplate = templates.find((t) => t.id === selectedId) ?? templates[0];

  const handleSelect = (id: string) => {
    const prev = selectedId;
    setSelectedId(id);
    startTransition(() => {
      const promise = updateEventLandingTemplate(eventId, id).then((result) => {
        if (!result.success) {
          setSelectedId(prev);
          throw new Error(result.message);
        }
        if (
          process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
          process.env.NEXT_PUBLIC_POSTHOG_HOST
        ) {
          posthog.capture('landing_template_selected', {
            event_id: eventId,
            template_id: id,
          });
        }
        return result;
      });
      toast.promise(promise, {
        loading: t('toast.saving'),
        success: t('toast.saved'),
        error: (err: Error) => err.message ?? t('toast.saveFailed'),
      });
    });
  };

  return (
    <>
      <TemplatesHeader />
      <SelectedTemplateShowcase
        template={selectedTemplate}
        onPreview={setPreviewTemplate}
        livePreviewData={livePreviewData}
      />
      <div>
        <TemplateLibraryGrid
          templates={templates}
          selectedId={selectedId}
          onSelect={handleSelect}
          onPreview={setPreviewTemplate}
          livePreviewData={livePreviewData}
        />
      </div>
      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewTemplate !== null}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onSelect={handleSelect}
        isSelected={previewTemplate?.id === selectedId}
        livePreviewData={livePreviewData}
      />
    </>
  );
}
