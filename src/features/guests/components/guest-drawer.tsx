'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconMessage, IconTrash, IconUser, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { GuestForm } from './guest-form';
import { GuestCommunication } from './guest-communication';
import { OutsidePackageNotice } from './package';

const FORM_ID = 'guest-drawer-form';

export type GuestDrawerTab = 'details' | 'communication';

/**
 * The `?guest=` drawer - the one editor of a Guest Record. A sheet with the
 * record's identity on top, then two tabs: Details, the form in flat sections
 * with its Save footer, and Communication, what every Schedule and Call Round
 * did for this guest (ADR 0050). Adding a guest is the form alone. On desktop it floats in from the end side - the
 * left in Hebrew - like the Call Round details; on a phone it rises from the
 * bottom to 92% of the screen (Guests Mobile design).
 */
export function GuestDrawer({
  open,
  guest,
  eventId,
  groups,
  tables,
  showDietary,
  showTransportation,
  onOpenChange,
  onSaved,
  onDelete,
  tab,
  onTabChange,
  variant = 'desktop',
}: {
  variant?: 'desktop' | 'mobile';
  open: boolean;
  /** `null` is the add-guest form. */
  guest: GuestWithGroupApp | null;
  /** The open tab, kept in the URL by the page (`?guestTab=`) */
  tab: GuestDrawerTab;
  onTabChange: (tab: GuestDrawerTab) => void;
  eventId: string;
  groups: GroupWithGuestsApp[];
  tables: TableOption[];
  showDietary: boolean;
  showTransportation: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (guestId: string | null) => void;
  onDelete: (guest: GuestWithGroupApp) => void;
}) {
  const t = useTranslations('guests.list');
  const tc = useTranslations('guests.list.communication');
  const [submitting, setSubmitting] = useState(false);
  const mobile = variant === 'mobile';
  const isRTL = useLocale() === 'he';

  const body = (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto',
        mobile ? 'gap-4 px-4 pt-3.5 pb-4' : 'gap-[18px] px-5 pt-4 pb-5',
      )}
    >
      {guest && <OutsidePackageNotice guestId={guest.id} />}
      <GuestForm
        key={guest?.id ?? 'new'}
        formId={FORM_ID}
        eventId={eventId}
        guest={guest}
        groups={groups}
        layout="sections"
        compact={mobile}
        hideActions
        onPendingChange={setSubmitting}
        showDietary={showDietary}
        showTransportation={showTransportation}
        tables={tables}
        onSuccess={() => onSaved(guest?.id ?? null)}
        onCancel={() => onOpenChange(false)}
      />
    </div>
  );

  const footer = (
    <div
      className={cn(
        'flex items-center gap-2 border-t',
        mobile
          ? 'px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]'
          : 'px-5 py-3',
      )}
    >
      {guest && (
        <Button
          variant="ghost"
          onClick={() => onDelete(guest)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <IconTrash size={16} />
          {t('drawer.delete')}
        </Button>
      )}
      <div className="flex-1" />
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        {t('drawer.cancel')}
      </Button>
      <Button type="submit" form={FORM_ID} disabled={submitting}>
        {guest ? t('drawer.save') : t('drawer.add')}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={mobile ? 'bottom' : isRTL ? 'left' : 'right'}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 [&>button:last-child]:hidden',
          mobile
            ? 'h-[92dvh] rounded-t-[24px] border-0'
            : 'm-3 h-[calc(100dvh-1.5rem)] rounded-[18px] border sm:max-w-[480px]',
        )}
        onOpenAutoFocus={(event) => {
          if (guest || mobile) event.preventDefault();
        }}
      >
        <DrawerHeader guest={guest} compact={mobile} />

        {guest ? (
          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value as GuestDrawerTab)}
            // Radix writes its own `dir`, `ltr` unless told - which would flip
            // the whole drawer body in Hebrew.
            dir={isRTL ? 'rtl' : 'ltr'}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div
              className={cn('border-b', mobile ? 'px-4 py-2.5' : 'px-5 py-3')}
            >
              <TabsList className="w-full">
                <TabsTrigger value="details">
                  <IconUser />
                  {tc('tabs.details')}
                </TabsTrigger>
                <TabsTrigger value="communication">
                  <IconMessage />
                  {tc('tabs.communication')}
                </TabsTrigger>
              </TabsList>
            </div>
            {/* Kept mounted while hidden, so an edit survives a look at the
                guest's messages. Save belongs to the form, so its footer too. */}
            <TabsContent
              value="details"
              forceMount
              className="flex min-h-0 flex-col data-[state=inactive]:hidden"
            >
              {body}
              {footer}
            </TabsContent>
            <TabsContent
              value="communication"
              className={cn(
                'min-h-0 overflow-y-auto',
                mobile
                  ? 'px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]'
                  : 'px-5 pt-4 pb-5',
              )}
            >
              <GuestCommunication
                guestId={guest.id}
                guestName={guest.name}
                invitationToken={guest.invitationToken}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {body}
            {footer}
          </>
        )}
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
        compact ? 'gap-[11px] px-4 pt-5 pb-3.5' : 'gap-3 px-5 pt-[18px] pb-4',
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
