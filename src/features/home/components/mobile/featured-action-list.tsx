'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconCheck,
  IconChecklist,
  IconChevronRight,
  IconCoin,
  IconGift,
  IconLink,
  IconList,
  IconMessage,
  IconPhoto,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconUserPlus,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sendHomeTestMessage, type SendTestMessageState } from '../../actions/test-message';
import type { FeaturedActionKey } from '../../types';

export type FeaturedActionView = {
  key: FeaturedActionKey;
  label: string;
  why: string;
};

/**
 * How each Featured Action looks and where it goes. `path` is the page under
 * /app/[eventId] a card links to; an action without one plays out inline on
 * the card (see `onInlineClick`).
 */
const ACTION_UI: Record<FeaturedActionKey, { icon: Icon; path?: string; dominant?: boolean }> = {
  details: { icon: IconSettings, path: 'details' },
  addGuests: { icon: IconUsers, path: 'guests', dominant: true },
  groups: { icon: IconList, path: 'guests?tab=groups' },
  invitationImage: { icon: IconPhoto, path: 'details' },
  collaborator: { icon: IconUserPlus, path: 'collaborate' },
  health: { icon: IconChecklist },
  test: { icon: IconMessage },
  seating: { icon: IconUsers, path: 'seating' },
  gifting: { icon: IconGift, path: 'gifting' },
  preview: { icon: IconLink },
  budget: { icon: IconCoin, path: 'budget' },
  addGuest: { icon: IconPlus, path: 'guests?add=1' },
  ai: { icon: IconSparkles },
  viewList: { icon: IconUsers, path: 'guests' },
};

function HealthTile({
  count,
  label,
  hint,
  href,
  tone,
  noneFound,
}: {
  count: number;
  label: string;
  hint: string;
  href: string;
  tone: 'pending' | 'declined';
  noneFound: string;
}) {
  // A zero is not a finding: it gets no warning colour and nothing to open.
  if (count === 0) {
    return (
      <div className="bg-muted text-muted-foreground flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-start">
        <span className="flex items-center gap-1 text-xl font-extrabold">
          <IconCheck className="size-4" strokeWidth={2.5} />0
        </span>
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px]">{noneFound}</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-start',
        tone === 'pending'
          ? 'bg-rsvp-pending-tint text-rsvp-pending-strong'
          : 'bg-rsvp-declined-tint text-rsvp-declined-strong',
      )}
    >
      <span className="text-xl font-extrabold">{count}</span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[11px]">{hint}</span>
    </Link>
  );
}

type TestState =
  | { step: 'closed' }
  | { step: 'confirm'; error?: Extract<SendTestMessageState, { success: false }>['reason'] }
  | { step: 'sent'; phone: string };

export function FeaturedActionList({
  eventId,
  title,
  subtitle,
  actions,
  maskedPhone,
  previewUrl,
  health,
}: {
  eventId: string;
  title: string;
  subtitle: string;
  actions: FeaturedActionView[];
  maskedPhone: string | null;
  previewUrl: string | null;
  health: { duplicates: number; noPhone: number };
}) {
  const t = useTranslations('home.mobile');
  const [test, setTest] = useState<TestState>({ step: 'closed' });
  const [healthOpen, setHealthOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [sending, startSending] = useTransition();

  const needsPhone = !maskedPhone;
  const listHref = `/app/${eventId}/guests`;

  const sendTest = () => {
    startSending(async () => {
      const result = await sendHomeTestMessage(eventId, needsPhone ? phoneInput : undefined);
      if (result.success) {
        setTest({ step: 'sent', phone: maskedPhone ?? phoneInput });
      } else {
        setTest({ step: 'confirm', error: result.reason });
      }
    });
  };

  const sharePreview = async () => {
    if (!previewUrl) return;
    // The native sheet first on a phone - it is where WhatsApp lives. Only a
    // missing or failing share falls back to the clipboard; a dismissed sheet
    // is the Owner's choice and ends there.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('actions.preview.shareTitle'), url: previewUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Nothing to fall back to; the card simply does not flip.
    }
  };

  const onInlineClick = (key: FeaturedActionKey) => {
    if (key === 'test') {
      setTest((prev) => (prev.step === 'closed' ? { step: 'confirm' } : { step: 'closed' }));
    } else if (key === 'health') {
      setHealthOpen((open) => !open);
    } else if (key === 'preview') {
      void sharePreview();
    } else if (key === 'ai') {
      window.dispatchEvent(new Event('kululu:open-ai-assistant'));
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <span className="text-muted-foreground text-xs">{subtitle}</span>
      </div>

      {actions.map((action) => {
        const { icon: IconComponent, path, dominant = false } = ACTION_UI[action.key];
        const href = path ? `/app/${eventId}/${path}` : null;
        const isCopied = action.key === 'preview' && copied;
        const open =
          (action.key === 'test' && test.step !== 'closed') ||
          (action.key === 'health' && healthOpen);
        const badge = isCopied ? '✓' : action.key === 'test' ? t('actions.test.badge') : null;

        const inner = (
          <>
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-xl',
                dominant
                  ? 'size-[52px] bg-white/20 text-white'
                  : 'bg-primary/15 text-primary size-[42px]',
              )}
            >
              <IconComponent className={dominant ? 'size-[26px]' : 'size-[21px]'} strokeWidth={1.9} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'font-bold',
                    dominant ? 'text-[18px] text-white' : 'text-[15px]',
                  )}
                >
                  {isCopied ? t('actions.preview.copiedLabel') : action.label}
                </span>
                {badge && (
                  <span className="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[13px] leading-[1.45]',
                  dominant ? 'text-white/85' : 'text-muted-foreground',
                )}
              >
                {isCopied ? t('actions.preview.copiedWhy') : action.why}
              </span>
            </div>
            <IconChevronRight
              className={cn(
                'size-[18px] shrink-0 rtl:rotate-180',
                dominant ? 'text-white/70' : 'text-muted-foreground',
              )}
            />
          </>
        );

        const rowClass = cn(
          'flex w-full items-center gap-3',
          dominant ? 'px-4 py-[18px]' : 'p-3.5',
        );

        return (
          <div
            key={action.key}
            className={cn(
              'overflow-hidden rounded-2xl border',
              dominant
                ? 'bg-primary border-primary shadow-[0_10px_28px_color-mix(in_oklch,var(--primary)_28%,transparent)]'
                : cn('bg-card', open ? 'border-primary' : 'border-border'),
            )}
          >
            {href ? (
              <Link href={href} className={rowClass}>
                {inner}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onInlineClick(action.key)}
                aria-expanded={action.key === 'test' || action.key === 'health' ? open : undefined}
                className={rowClass}
              >
                {inner}
              </button>
            )}

            {action.key === 'test' && test.step === 'confirm' && (
              <div className="bg-muted mx-3.5 mb-3.5 flex flex-col gap-2.5 rounded-xl px-3.5 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong flex size-[26px] shrink-0 items-center justify-center rounded-full">
                    <IconCheck className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">
                      {needsPhone
                        ? t('testMessage.phoneTitle')
                        : t.rich('testMessage.confirmTitle', {
                            phone: maskedPhone,
                            ltr: (chunks) => <span dir="ltr">{chunks}</span>,
                          })}
                    </span>
                    <span className="text-muted-foreground text-[12.5px]">
                      {needsPhone ? t('testMessage.phoneHint') : t('testMessage.confirmBody')}
                    </span>
                  </div>
                </div>
                {needsPhone && (
                  <Input
                    type="tel"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={t('testMessage.phonePlaceholder')}
                    className="bg-card h-11 text-base"
                  />
                )}
                {test.error && (
                  <span className="text-rsvp-declined-strong text-[12.5px] font-medium">
                    {t(`testMessage.errors.${test.error}`)}
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={sending || (needsPhone && !phoneInput.trim())}
                    className="bg-primary text-primary-foreground h-[42px] flex-1 rounded-[10px] text-sm font-semibold disabled:opacity-60"
                  >
                    {sending ? t('testMessage.sending') : t('testMessage.send')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTest({ step: 'closed' })}
                    className="border-border h-[42px] rounded-[10px] border px-3.5 text-sm font-medium"
                  >
                    {t('testMessage.cancel')}
                  </button>
                </div>
              </div>
            )}

            {action.key === 'test' && test.step === 'sent' && (
              <div className="bg-rsvp-confirmed-tint mx-3.5 mb-3.5 flex items-center gap-2.5 rounded-xl px-3.5 py-3">
                <span className="bg-rsvp-confirmed flex size-[26px] shrink-0 items-center justify-center rounded-full text-white">
                  <IconCheck className="size-3.5" strokeWidth={2.5} />
                </span>
                <div className="text-rsvp-confirmed-strong flex flex-col gap-px">
                  <span className="text-sm font-bold">{t('testMessage.sentTitle')}</span>
                  <span className="text-[12.5px]">
                    {t.rich('testMessage.sentBody', {
                      phone: test.phone,
                      ltr: (chunks) => <span dir="ltr">{chunks}</span>,
                    })}
                  </span>
                </div>
              </div>
            )}

            {action.key === 'health' && healthOpen && (
              <div className="mx-3.5 mb-3.5 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <HealthTile
                    count={health.duplicates}
                    label={t('healthCheck.duplicates')}
                    hint={t('healthCheck.duplicatesHint')}
                    href={`${listHref}?issue=duplicates`}
                    tone="pending"
                    noneFound={t('healthCheck.noneFound')}
                  />
                  <HealthTile
                    count={health.noPhone}
                    label={t('healthCheck.noPhone')}
                    hint={t('healthCheck.noPhoneHint')}
                    href={`${listHref}?issue=no-phone`}
                    tone="declined"
                    noneFound={t('healthCheck.noneFound')}
                  />
                </div>
                <Link
                  href={`${listHref}?issue=all`}
                  className="border-border bg-card text-primary flex h-[42px] items-center justify-center gap-1 rounded-[10px] border text-[13.5px] font-semibold"
                >
                  {t('healthCheck.openList')}
                  <IconChevronRight className="size-4 rtl:rotate-180" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
