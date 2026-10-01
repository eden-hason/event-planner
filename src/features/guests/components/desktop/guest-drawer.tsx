'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconLink,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import type { TableOption } from '@/features/seating';
import { rsvpPresentation } from '@/features/guests/utils';
import { amountDisplay } from '@/features/guests/utils/guest-amount';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';
import { GuestForm } from '../guest-form';
import { GuestActivity } from './guest-activity';

const FORM_ID = 'guest-drawer-form';

/**
 * The `?guest=` drawer - the one editor of a Guest Record. A sheet with the
 * record's identity on top, the form in flat sections, then its read-only
 * Activity and invitation link. On desktop it floats in from the side; on a
 * phone it rises from the bottom to 92% of the screen (Guests Mobile design).
 */
export function GuestDrawer({
  open,
  guest,
  eventId,
  groups,
  tables,
  showDietary,
  onOpenChange,
  onSaved,
  onDelete,
  variant = 'desktop',
}: {
  variant?: 'desktop' | 'mobile';
  open: boolean;
  /** `null` is the add-guest form. */
  guest: GuestWithGroupApp | null;
  eventId: string;
  groups: GroupWithGuestsApp[];
  tables: TableOption[];
  showDietary: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (guestId: string | null) => void;
  onDelete: (guest: GuestWithGroupApp) => void;
}) {
  const t = useTranslations('guests.list');
  const [submitting, setSubmitting] = useState(false);
  const mobile = variant === 'mobile';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={mobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 [&>button:last-child]:hidden',
          mobile
            ? // The form's narrow columns (invited, coming, table) shrink to fit 390px.
              'h-[92dvh] rounded-t-[24px] border-0 [--narrow-col:64px]'
            : 'm-3 h-[calc(100dvh-1.5rem)] rounded-[18px] border sm:max-w-[480px]',
        )}
        onOpenAutoFocus={(event) => {
          if (guest || mobile) event.preventDefault();
        }}
      >
        {mobile && (
          <span className="bg-input mx-auto mt-2 h-1 w-[38px] shrink-0 rounded-full" />
        )}
        <DrawerHeader guest={guest} compact={mobile} />

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto',
            mobile ? 'gap-4 px-4 pt-3.5 pb-4' : 'gap-[18px] px-5 pt-4 pb-5',
          )}
        >
          <GuestForm
            key={guest?.id ?? 'new'}
            formId={FORM_ID}
            eventId={eventId}
            guest={guest}
            groups={groups}
            layout="sections"
            hideActions
            onPendingChange={setSubmitting}
            showDietary={showDietary}
            tables={tables}
            onSuccess={() => onSaved(guest?.id ?? null)}
            onCancel={() => onOpenChange(false)}
          />
          {guest && (
            <>
              <GuestActivity guestId={guest.id} />
              <InvitationLink token={guest.invitationToken} />
            </>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 border-t',
            mobile
              ? 'px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] [&_button]:h-12 [&_button]:rounded-xl [&_button]:text-[15px]'
              : 'px-5 py-3',
          )}
        >
          {guest && (
            <Button
              variant="ghost"
              onClick={() => onDelete(guest)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-[38px] gap-1.5 rounded-[10px] px-3 max-md:px-2"
            >
              <IconTrash size={16} />
              {t('drawer.delete')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-[38px] rounded-[10px] px-4"
          >
            {t('drawer.cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={submitting}
            className="h-[38px] rounded-[10px] px-[18px] font-bold"
          >
            {guest ? t('drawer.save') : t('drawer.add')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerHeader({
  guest,
  compact,
}: {
  guest: GuestWithGroupApp | null;
  compact?: boolean;
}) {
  const t = useTranslations('guests.list');

  const invited = guest ? (guest.invitedAmount ?? guest.amount) : 0;
  // Flagged only while it is the Guest's own answer: an Owner override is theirs.
  const count = guest ? amountDisplay(guest) : null;
  const above =
    count?.changedByGuest && count.value > invited ? count.value - invited : 0;

  return (
    <div
      className={cn(
        'flex items-start border-b',
        compact ? 'gap-[11px] px-4 pt-2.5 pb-3.5' : 'gap-3 px-5 pt-[18px] pb-4',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
          guest ? avatarTintFor(guest.name) : 'bg-muted text-muted-foreground',
        )}
      >
        {guest ? guest.name.charAt(0) : '+'}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <SheetTitle
          className={cn(
            'leading-tight font-extrabold',
            compact ? 'text-lg' : 'text-[19px]',
          )}
        >
          {guest ? guest.name : t('drawer.newGuest')}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {guest ? guest.name : t('drawer.newGuest')}
        </SheetDescription>
        {guest && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-[22px] items-center gap-[5px] rounded-full px-[9px] text-xs font-bold',
                rsvpPresentation(guest.rsvpStatus).chip,
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  rsvpPresentation(guest.rsvpStatus).solid,
                )}
              />
              {t(`status.${guest.rsvpStatus}`)}
            </span>
            {above > 0 && (
              <span
                title={t('aboveInvitedHint', { invited })}
                className="bg-violet-tint text-violet-strong inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-bold"
              >
                +{above}
              </span>
            )}
          </div>
        )}
      </div>
      <SheetClose
        aria-label={t('drawer.close')}
        className="bg-muted text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
      >
        <IconX size={16} stroke={2.2} />
      </SheetClose>
    </div>
  );
}

function InvitationLink({ token }: { token: string }) {
  const t = useTranslations('guests');
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/c/${token}`;

  const copy = () => {
    navigator.clipboard
      .writeText(`${t('sheet.copyInvitationLinkPrefix')}\n${url()}`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
      <IconLink size={16} className="text-primary shrink-0" />
      <span className="flex-1 text-[13px] font-semibold">
        {t('list.drawer.link')}
      </span>
      <button
        type="button"
        onClick={copy}
        className="bg-muted hover:bg-muted/70 flex h-[30px] items-center gap-[5px] rounded-lg px-2.5 text-[12.5px] font-semibold"
      >
        {copied ? (
          <IconCheck size={14} className="text-success" />
        ) : (
          <IconCopy size={14} />
        )}
        {copied ? t('list.drawer.copied') : t('list.drawer.copy')}
      </button>
      <a
        href={`/c/${token}`}
        target="_blank"
        rel="noreferrer"
        className="bg-muted hover:bg-muted/70 flex h-[30px] items-center gap-[5px] rounded-lg px-2.5 text-[12.5px] font-semibold"
      >
        <IconEye size={14} />
        {t('list.drawer.preview')}
      </a>
    </div>
  );
}
