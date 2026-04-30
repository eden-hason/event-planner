'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { IconBolt, IconCheck, IconLink } from '@tabler/icons-react';

interface GuestActionsSectionProps {
  invitationToken: string;
}

export function GuestActionsSection({ invitationToken }: GuestActionsSectionProps) {
  const t = useTranslations('guests.sheet');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/confirm/${invitationToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-foreground">
        <IconBolt size={16} className="text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t('actionsSection')}
        </span>
      </div>

      <button
        onClick={handleCopyLink}
        className={cn(
          'flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 text-start cursor-pointer transition-all duration-150',
          copied
            ? 'bg-green-50 border-green-200'
            : 'bg-muted/40 border-border hover:bg-purple-50 hover:border-purple-200',
        )}
      >
        <div
          className={cn(
            'size-[34px] rounded-lg shrink-0 flex items-center justify-center transition-colors duration-150',
            copied
              ? 'bg-green-100'
              : 'bg-muted hover:bg-purple-100',
          )}
        >
          {copied ? (
            <IconCheck size={15} className="text-green-600" strokeWidth={2.2} />
          ) : (
            <IconLink size={15} className="text-muted-foreground group-hover:text-purple-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-sm font-medium',
              copied ? 'text-green-700' : 'text-foreground',
            )}
          >
            {copied ? t('copied') : t('copyInvitationLink')}
          </div>
          <div
            className={cn(
              'text-[11.5px] mt-0.5 truncate',
              copied ? 'text-green-400' : 'text-muted-foreground',
            )}
          >
            {copied ? t('linkCopied') : t('copyInvitationLinkDescription')}
          </div>
        </div>

      </button>
    </div>
  );
}
