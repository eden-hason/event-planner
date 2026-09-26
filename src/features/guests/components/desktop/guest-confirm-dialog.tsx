'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconArmchair, IconMessage, IconTrash } from '@tabler/icons-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { RsvpStatus } from '@/features/guests/utils';
import type {
  DeleteImpact,
  RsvpImpact,
} from '@/features/guests/utils/bulk-impact';
import { cn } from '@/lib/utils';

export type ConfirmRequest =
  | {
      kind: 'rsvp';
      status: RsvpStatus;
      impact: RsvpImpact;
      onConfirm: () => void;
    }
  | {
      kind: 'delete';
      impact: DeleteImpact;
      singleName?: string;
      onConfirm: () => void;
    };

/**
 * Every confirm the guest list asks for. Each one names the fallout in plain
 * words and lists only the lines that apply; none mentions billing (ADR 0025).
 * Radix puts focus on Cancel when it opens, which the delete-all form relies on.
 */
export function GuestConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent
        dir={dir}
        className="gap-3 rounded-2xl p-[22px] sm:max-w-[460px]"
      >
        {request?.kind === 'rsvp' && <RsvpConfirm request={request} />}
        {request?.kind === 'delete' && <DeleteConfirm request={request} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RsvpConfirm({
  request,
}: {
  request: Extract<ConfirmRequest, { kind: 'rsvp' }>;
}) {
  const t = useTranslations('guests.list.confirmRsvp');
  const { impact, status } = request;
  const lines = [
    impact.answeredThemselves > 0 && {
      icon: IconMessage,
      text: t(status === 'confirmed' ? 'answeredDeclined' : 'answered', {
        count: impact.answeredThemselves,
      }),
    },
    impact.losingSeat > 0 && {
      icon: IconArmchair,
      text: t('losingSeat', { count: impact.losingSeat }),
    },
  ].filter(Boolean) as { icon: typeof IconMessage; text: string }[];

  return (
    <>
      <AlertDialogHeader className="gap-3 text-start">
        <AlertDialogTitle className="text-lg leading-snug font-extrabold">
          {t(`title.${status}`, { count: impact.changing })}
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="flex flex-col gap-2">
            {lines.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="text-muted-foreground flex items-start gap-[9px] text-sm leading-normal"
              >
                <span className="bg-rsvp-pending-tint text-rsvp-pending-strong flex size-[22px] shrink-0 items-center justify-center rounded-[7px]">
                  <Icon size={13} stroke={2.2} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-2 gap-2">
        <AlertDialogCancel className="h-10 rounded-[10px] px-4">
          {t('cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          variant={status === 'declined' ? 'destructive' : 'default'}
          onClick={request.onConfirm}
          className="h-10 rounded-[10px] px-4 font-bold"
        >
          {t(`confirm.${status}`)}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

function DeleteConfirm({
  request,
}: {
  request: Extract<ConfirmRequest, { kind: 'delete' }>;
}) {
  const t = useTranslations('guests.list.confirmDelete');
  const { impact, singleName } = request;
  const strong = impact.isWholeList && impact.total > 1;

  const title = singleName
    ? t('titleOne', { name: singleName })
    : strong
      ? t('titleAll', { count: impact.total })
      : t('title', { count: impact.total });

  const { messaged, answeredThemselves: answered } = impact;
  const body = singleName
    ? messaged + answered > 0
      ? t('bodyOneHistory')
      : null
    : messaged > 0 && answered > 0
      ? t('bodyBoth', { messaged, answered })
      : messaged > 0
        ? t('bodyMessaged', { messaged })
        : answered > 0
          ? t('bodyAnswered', { answered })
          : null;

  return (
    <>
      <AlertDialogHeader className="gap-3 text-start">
        <div className="flex items-center gap-3">
          {strong && (
            <span className="bg-destructive/10 text-destructive flex size-11 shrink-0 items-center justify-center rounded-xl">
              <IconTrash size={22} />
            </span>
          )}
          <AlertDialogTitle className="text-lg leading-snug font-extrabold">
            {title}
          </AlertDialogTitle>
        </div>
        {body ? (
          <AlertDialogDescription className="text-sm leading-relaxed text-pretty">
            {body}
          </AlertDialogDescription>
        ) : (
          <AlertDialogDescription className="sr-only">
            {title}
          </AlertDialogDescription>
        )}
      </AlertDialogHeader>
      <AlertDialogFooter
        className={cn(
          'mt-2 gap-2',
          strong && 'flex-col-reverse sm:flex-col-reverse sm:justify-start',
        )}
      >
        <AlertDialogCancel
          className={cn('rounded-[10px]', strong ? 'h-11 w-full' : 'h-10 px-4')}
        >
          {t('cancel')}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={request.onConfirm}
          className={cn(
            'rounded-[10px] font-bold',
            strong ? 'h-11 w-full' : 'h-10 px-4',
          )}
        >
          {singleName
            ? t('confirmOne')
            : strong
              ? t('confirmAll', { count: impact.total })
              : t('confirm', { count: impact.total })}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
