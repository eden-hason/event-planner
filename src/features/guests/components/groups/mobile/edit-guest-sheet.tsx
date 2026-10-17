'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconFolder, IconInfoCircle, IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { upsertGuest } from '@/features/guests/actions/guests';
import type { GroupSide, GuestApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { avatarTintFor } from '@/lib/avatar-tint';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

const SIDES = ['bride', 'groom', null] as const;

/**
 * A Guest Record's details, edited from inside the assign screen without
 * leaving it: name, phone and side. Membership is not edited here - the strip
 * at the top says where the record stands in the open draft, and saving this
 * sheet writes only the details, so the draft is untouched.
 */
export function EditGuestSheet({
  guest,
  eventId,
  groupName,
  inGroup,
  pending,
  draftChanges,
  onOpenChange,
}: {
  /** `null` closes the sheet. */
  guest: GuestApp | null;
  eventId: string;
  groupName: string;
  /** Whether the record is in the group as saved. */
  inGroup: boolean;
  /** Whether the draft moves the record. */
  pending: boolean;
  /** How many moves the open draft holds. */
  draftChanges: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={guest !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[80dvh] flex-col gap-0 overflow-clip rounded-t-[24px] border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 [&_[data-slot=sheet-close]]:hidden"
      >
        {guest && (
          // Keyed so each record opens on its own saved values.
          <EditGuestForm
            key={guest.id}
            guest={guest}
            eventId={eventId}
            groupName={groupName}
            inGroup={inGroup}
            pending={pending}
            draftChanges={draftChanges}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditGuestForm({
  guest,
  eventId,
  groupName,
  inGroup,
  pending,
  draftChanges,
  onClose,
}: {
  guest: GuestApp;
  eventId: string;
  groupName: string;
  inGroup: boolean;
  pending: boolean;
  draftChanges: number;
  onClose: () => void;
}) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(formatPhone(guest.phone));
  const [side, setSide] = useState<GroupSide | null>(guest.side ?? null);
  const [saving, setSaving] = useState(false);

  const title = name.trim() || t('groups.editGuest.untitled');
  const noPhone = !phone.trim();
  const canSave = name.trim().length >= 2 && !saving;

  const groupLine = inGroup
    ? pending
      ? t('groups.editGuest.inGroupLeaving', { group: groupName })
      : t('groups.editGuest.inGroup', { group: groupName })
    : pending
      ? t('groups.editGuest.noGroupJoining', { group: groupName })
      : t('groups.editGuest.noGroup');

  const handleSave = async () => {
    if (!canSave) return;
    const formData = new FormData();
    formData.set('id', guest.id);
    formData.set('name', name.trim());
    formData.set('phone', phone.trim());
    formData.set('side', side ?? 'null');

    setSaving(true);
    const work = upsertGuest(eventId, formData).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('groups.editGuest.saveFailed'));
      }
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
      <SheetHeader className="flex-row items-center gap-[11px] border-b px-4 pt-5 pb-3.5">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
            avatarTintFor(name || guest.name),
          )}
        >
          {title.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <SheetTitle className="truncate text-[18px] leading-tight font-extrabold">
            {title}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-[12.5px]">
            {t('groups.editGuest.subtitle')}
          </SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          aria-label={tCommon('close')}
        >
          <IconX size={16} />
        </button>
      </SheetHeader>

      <form
        id="edit-guest-sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3.5"
      >
        <div
          className={cn(
            'flex items-center gap-[9px] rounded-xl px-3 py-2.5 text-[13px] leading-snug font-semibold',
            pending
              ? rsvpPresentation(inGroup ? 'pending' : 'confirmed').chip
              : 'bg-muted text-muted-foreground',
          )}
        >
          <IconFolder size={17} className="shrink-0" />
          <span className="flex-1">{groupLine}</span>
        </div>

        <label className="flex flex-col gap-[5px]">
          <span className="text-muted-foreground text-xs font-semibold">
            {t('groups.editGuest.nameLabel')}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('groups.editGuest.namePlaceholder')}
            className="bg-card focus-visible:border-primary focus-visible:ring-primary/20 h-[42px] rounded-[11px] border px-3 text-[15px] font-medium outline-none focus-visible:ring-[3px]"
          />
        </label>

        <label className="flex flex-col gap-[5px]">
          <span className="text-muted-foreground text-xs font-semibold">
            {t('groups.editGuest.phoneLabel')}
          </span>
          <input
            dir="ltr"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-000-0000"
            className={cn(
              'bg-card h-[42px] rounded-[11px] border-[1.5px] px-3 text-end text-[15px] font-medium tabular-nums outline-none',
              noPhone
                ? 'border-rsvp-pending'
                : 'focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]',
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
              {t('groups.editGuest.seatsLabel')}
            </span>
            <span className="flex h-[42px] items-center rounded-[11px] border px-3 text-[15px] font-medium tabular-nums">
              {guest.amount}
            </span>
          </div>
        </div>
      </form>

      <SheetFooter className="flex-col gap-[9px] border-t px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <IconInfoCircle size={14} className="shrink-0" />
          {draftChanges > 0
            ? t('groups.editGuest.draftKept', { count: draftChanges })
            : t('groups.editGuest.detailsOnly')}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 text-[15px]"
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-guest-sheet-form"
            disabled={!canSave}
            className="h-12 flex-[1.4] text-[15px] font-bold"
          >
            {t('groups.editGuest.save')}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
