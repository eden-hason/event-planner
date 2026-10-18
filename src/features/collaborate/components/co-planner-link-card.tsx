'use client';

import * as React from 'react';
import { IconBrandWhatsapp, IconCheck, IconCopy, IconLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { useSaveEvent } from '@/features/auth';
import { cn } from '@/lib/utils';
import { buildWhatsAppShareUrl } from '../utils';

interface CoPlannerLinkCardProps {
  eventId: string;
  /** Null for a Visitor, who saves before inviting anyone (ADR 0028). */
  link: string | null;
  className?: string;
}

function capture(event: string, properties: Record<string, unknown>) {
  if (
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    posthog.capture(event, properties);
  }
}

/**
 * The Event's Co-planner Link and the two ways to send it (ADR 0041). The
 * inviter sends it themselves - a message from them is trusted, and Kululu
 * needs no phone number or email to deliver it.
 */
export function CoPlannerLinkCard({ eventId, link, className }: CoPlannerLinkCardProps) {
  const t = useTranslations('collaborate.link');
  const { requireSaved } = useSaveEvent();
  const [copied, setCopied] = React.useState(false);

  const whatsAppUrl = link
    ? buildWhatsAppShareUrl(t('whatsappMessage', { link }))
    : undefined;

  const handleWhatsApp = (event: React.MouseEvent) => {
    if (!link) {
      event.preventDefault();
      requireSaved('invite');
      return;
    }
    capture('co_planner_link_shared', { event_id: eventId, via: 'whatsapp' });
  };

  const handleCopy = async () => {
    if (!link) {
      requireSaved('invite');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t('copied'));
      capture('co_planner_link_shared', { event_id: eventId, via: 'copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <div className={cn('rounded-xl border bg-card p-5', className)}>
      <h3 className="text-base font-semibold">{t('title')}</h3>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {t('description')}
      </p>

      {link && (
        <div className="bg-muted/50 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2">
          <IconLink className="text-muted-foreground size-4 shrink-0" />
          <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
            {link}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
          <a
            href={whatsAppUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsApp}
          >
            <IconBrandWhatsapp className="size-5" />
            {t('sendOnWhatsApp')}
          </a>
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
          {copied ? t('copiedButton') : t('copy')}
        </Button>
      </div>
    </div>
  );
}
