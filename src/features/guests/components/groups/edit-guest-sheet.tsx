'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconFolder, IconInfoCircle, IconX } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { upsertGuest } from '@/features/guests/actions/guests';
import type { GroupSide, GuestApp } from '@/features/guests/schemas';
import type { MembershipStanding } from '@/features/guests/types';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  amountDisplay,
  resolveAmounts,
} from '@/features/guests/utils/guest-amount';
import { describeUpsertFailure } from '@/features/guests/utils/upsert-error';
import { avatarTintFor } from '@/lib/avatar-tint';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

const SIDES = ['bride', 'groom', null] as const;

/**
 * A Guest Record's details, edited from inside the assign view without
 * leaving it: name, phone, side and how many are invited. Membership is not edited here - the strip
 * at the top says where the record stands in the open draft, and saving this
 * sheet writes only the details, so the draft is untouched. A bottom sheet on
 * a phone, a centred dialog on desktop.
 */
interface EditGuestProps {
  variant: 'mobile' | 'desktop';
  eventId: string;
  /**
   * The open group, where the record stands against its draft, and how many
   * moves the draft holds. Left out where there is no group or draft (the
   * "no group" list): the record reads as having no group.
   */
  groupName?: string;
  standing?: MembershipStanding | null;
  pendingMoves?: number;
}

export function EditGuestSheet({
  guest,
  onOpenChange,
  ...props
}: EditGuestProps & {
  /** `null` closes the sheet. */
  guest: GuestApp | null;
  onOpenChange: (open: boolean) => void;
}) {
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const open = guest !== null;
  const form = guest && (
    // Keyed so each record opens on its own saved values.
    <EditGuestForm
      key={guest.id}
      guest={guest}
      {...props}
      onClose={() => onOpenChange(false)}
    />
  );

  if (props.variant === 'desktop') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir={dir}
          showCloseButton={false}
          className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-[18px] p-0 sm:max-w-[480px]"
        >
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[80dvh] flex-col gap-0 overflow-clip rounded-t-[24px] border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 [&_[data-slot=sheet-close]]:hidden"
      >
        {form}
      </SheetContent>
    </Sheet>
  );
}

const GROUP_LINE_KEY: Record<MembershipStanding, string> = {
  in: 'inGroup',
  leaving: 'inGroupLeaving',
  out: 'noGroup',
  joining: 'noGroupJoining',
};

function EditGuestForm({
  variant,
  guest,
  eventId,
  groupName = '',
  standing: standingProp,
  pendingMoves = 0,
  onClose,
}: EditGuestProps & { guest: GuestApp; onClose: () => void }) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(guest.name);
  const standing = standingProp ?? 'out';
  const [phone, setPhone] = useState(() => formatPhone(guest.phone));
  const savedInvited = amountDisplay(guest).invited;
  const [invited, setInvited] = useState(savedInvited);
  const [side, setSide] = useState<GroupSide | null>(guest.side ?? null);
  const [saving, setSaving] = useState(false);
  const mobile = variant === 'mobile';

  const title = name.trim() || t('groups.editGuest.untitled');
  const noPhone = !phone.trim();
  const canSave = name.trim().length >= 2 && !saving;

  const groupLine = t(`groups.editGuest.${GROUP_LINE_KEY[standing]}`, {
    group: groupName,
  });

  const handleSave = async () => {
    if (!canSave) return;
    const formData = new FormData();
    formData.set('id', guest.id);
    formData.set('name', name.trim());
    formData.set('phone', phone.trim());
    formData.set('side', side ?? 'null');
    // Only a changed count is sent, so saving a name never touches it. The
    // answer moves with the invitation unless the record is confirmed, as in
    // the Guests tab's drawer (ADR 0026).
    if (invited !== savedInvited) {
      const amounts = resolveAmounts({
        rsvpStatus: guest.rsvpStatus,
        invited,
        coming: guest.amount,
      });
      formData.set('invitedAmount', String(amounts.invitedAmount));
      formData.set('amount', String(amounts.amount));
    }

    setSaving(true);
    const work = upsertGuest(eventId, formData).then((result) => {
      if (!result.success) throw new Error(describeUpsertFailure(result, t));
      return result;
    });
    toast.promise(work, {
      loading: t('groups.editGuest.saving', { name: name.trim() }),
      success: () => t('groups.editGuest.saved', { name: name.trim() }),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.editGuest.saveFailed'),
    });
    try {
      await work;
      onClose();
    } catch {
      // The toast has said why; the form stays open to fix it.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-[11px] border-b',
          mobile ? 'px-4 pt-5 pb-3.5' : 'gap-3 px-5 pt-[18px] pb-4',
        )}
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
            avatarTintFor(name || guest.name),
          )}
        >
          {title.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Radix's dialog title and description, which a Sheet is too */}
          <DialogTitle
            className={cn(
              'truncate leading-tight font-extrabold',
              mobile ? 'text-[18px]' : 'text-[19px]',
            )}
          >
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[12.5px]">
            {t('groups.editGuest.subtitle')}
          </DialogDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          aria-label={tCommon('close')}
        >
          <IconX size={16} />
        </button>
      </div>

      <form
        id="edit-guest-sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto',
          mobile ? 'px-4 py-3.5' : 'px-5 py-[18px]',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-[9px] rounded-xl px-3 py-2.5 text-[13px] leading-snug font-semibold',
            standing === 'joining'
              ? rsvpPresentation('confirmed').chip
              : standing === 'leaving'
                ? rsvpPresentation('pending').chip
                : 'bg-muted text-muted-foreground',
          )}
        >
          <IconFolder size={17} className="shrink-0" />
          <span className="flex-1">{groupLine}</span>
        </div>

        {/* Name and phone share a line on desktop */}
        <div
          className={cn(
            mobile
              ? 'contents'
              : 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start gap-3',
          )}
        >
          <label className="flex flex-col gap-[5px]">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('groups.editGuest.nameLabel')}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('groups.editGuest.namePlaceholder')}
              className="h-[42px] rounded-[11px] text-[15px] font-medium"
            />
          </label>

          <label className="flex flex-col gap-[5px]">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('groups.editGuest.phoneLabel')}
            </span>
            <Input
              dir="ltr"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-000-0000"
              className={cn(
                'h-[42px] rounded-[11px] text-end text-[15px] font-medium tabular-nums',
                noPhone && 'border-rsvp-pending border-[1.5px]',
              )}
            />
            {noPhone && (
              <span
                className={cn(
                  rsvpPresentation('pending').text,
                  'text-[12.5px] leading-normal',
                )}
              >
                {t('groups.editGuest.noPhoneHint')}
              </span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2.5">
          <div className="flex flex-col gap-[5px]">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('groups.editGuest.sideLabel')}
            </span>
            <div
              role="radiogroup"
              aria-label={t('groups.editGuest.sideLabel')}
              className="bg-muted flex h-[42px] gap-0.5 rounded-[11px] p-[3px]"
            >
              {SIDES.map((value) => {
                const on = side === value;
                return (
                  <button
                    key={value ?? 'none'}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSide(value)}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg text-[13.5px] transition-colors',
                      on
                        ? 'bg-card text-foreground font-bold shadow-sm'
                        : 'text-muted-foreground font-medium',
                    )}
                  >
                    {t(`list.sides.${value ?? 'none'}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('list.drawer.invited')}
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={invited}
              // Selected on focus, so typing replaces the count instead of
              // appending to it (an emptied field falls back to 1).
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const next = Math.floor(Number(e.target.value));
                setInvited(Number.isFinite(next) && next >= 1 ? next : 1);
              }}
              className="h-[42px] rounded-[11px] text-center text-[15px] font-medium tabular-nums"
            />
          </div>
        </div>
      </form>

      <div
        className={cn(
          'flex border-t',
          mobile
            ? 'flex-col gap-[9px] px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)]'
            : 'flex-row items-center gap-2 px-5 py-3',
        )}
      >
        <span
          className={cn(
            'text-muted-foreground flex items-center gap-1.5',
            mobile ? 'text-xs' : 'min-w-0 flex-1 text-[12.5px]',
          )}
        >
          <IconInfoCircle size={14} className="shrink-0" />
          {pendingMoves > 0
            ? t('groups.editGuest.draftKept', { count: pendingMoves })
            : t('groups.editGuest.detailsOnly')}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(mobile && 'flex-1')}
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-guest-sheet-form"
            disabled={!canSave}
            className={cn('font-bold', mobile && 'flex-[1.4]')}
          >
            {t('groups.editGuest.save')}
          </Button>
        </div>
      </div>
    </>
  );
}
