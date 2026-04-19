'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useFeatureHeader } from '@/components/feature-layout';

interface EventDetailsHeaderProps {
  formId: string;
  isDirty: boolean;
  isPending?: boolean;
  onDiscard?: () => void;
}

export function EventDetailsHeader({
  formId,
  isDirty,
  isPending = false,
  onDiscard,
}: EventDetailsHeaderProps) {
  const t = useTranslations('eventDetails.header');

  const headerAction = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isPending}
          onClick={onDiscard}
        >
          <IconX className="size-4" />
          {t('discard')}
        </Button>
        <Button type="submit" form={formId} disabled={!isDirty || isPending}>
          <IconDeviceFloppy className="size-4" />
          {isPending ? t('saving') : t('save')}
        </Button>
      </div>
    ),
    [formId, isDirty, isPending, onDiscard, t],
  );

  const { setHeader } = useFeatureHeader({
    title: t('title'),
    description: t('description'),
    action: headerAction,
    containerClass: 'mx-auto w-full max-w-5xl',
  });

  useEffect(() => {
    setHeader({
      title: t('title'),
      description: t('description'),
      action: headerAction,
      containerClass: 'mx-auto w-full max-w-5xl',
    });
  }, [headerAction, setHeader, t]);

  return null;
}
