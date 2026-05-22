'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TemplatePreview } from './template-preview';
import { LiveTemplatePreview, type LivePreviewEventData } from './live-template-preview';
import { type LandingTemplate } from '../types';

interface TemplatePreviewDialogProps {
  template: LandingTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  livePreviewData?: LivePreviewEventData;
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onSelect,
  isSelected,
  livePreviewData,
}: TemplatePreviewDialogProps) {
  const t = useTranslations('templates');

  if (!template) return null;

  const handleSelect = () => {
    onSelect(template.id);
    onOpenChange(false);
  };

  const isLive = template.kind === 'live';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {isLive ? (
          // Full interactive live preview in dialog — scrollable phone frame
          <div className="max-h-[80vh] overflow-y-auto">
            <LiveTemplatePreview
              template={template}
              eventData={livePreviewData}
              interactive={false}
            />
          </div>
        ) : (
          <div className="aspect-[3/4] w-full">
            <TemplatePreview template={template} size="lg" className="h-full w-full" />
          </div>
        )}
        <div className="space-y-4 p-6">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-2">
              <DialogTitle
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-plus-jakarta)' }}
              >
                {template.name}
              </DialogTitle>
              <Badge variant="secondary" className="text-xs capitalize">
                {t(`categories.${template.category}`)}
              </Badge>
            </div>
          </DialogHeader>
          <Button onClick={handleSelect} disabled={isSelected} className="w-full">
            {isSelected ? t('card.selected') : t('dialog.use')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
