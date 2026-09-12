'use client';

import { useLocale } from 'next-intl';
import {
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconMessage,
  IconTrash,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPhone } from '@/lib/phone';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { RsvpPill } from '../rsvp-pill';

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface GuestMobileCardProps {
  guest: GuestWithGroupApp;
  onSelect: (guest: GuestWithGroupApp) => void;
  onDelete: (guest: GuestWithGroupApp) => void;
  onMarkConfirmed: (guest: GuestWithGroupApp) => void;
  /** Resolved from guest.tableId by the list - the number lives on the table row */
  tableNumber?: number;
  t: TFn;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function GuestMobileCard({
  guest,
  onSelect,
  onDelete,
  onMarkConfirmed,
  tableNumber,
  t,
}: GuestMobileCardProps) {
  const isRTL = useLocale() === 'he';
  const status = guest.rsvpStatus;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(guest)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(guest);
        }
      }}
      className="bg-card flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
    >
      {/* Initials badge */}
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {getInitials(guest.name)}
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">
            {guest.name}
          </span>
          {guest.group && (
            <span className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 text-[11px]">
              {guest.group.name}
            </span>
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
          {guest.phone && (
            <>
              <a
                href={`tel:${guest.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-foreground -m-1 p-1"
                dir="ltr"
              >
                {formatPhone(guest.phone)}
              </a>
              <span className="text-border">·</span>
            </>
          )}
          <span>{t('mobile.seats', { count: guest.amount })}</span>
        </div>

        {(guest.side || tableNumber !== undefined) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {guest.side && (
              <Badge variant="outline">{t(`sides.${guest.side}`)}</Badge>
            )}
            {tableNumber !== undefined && (
              <Badge variant="outline">
                {t('table.tableNumber', { number: tableNumber })}
              </Badge>
            )}
          </div>
        )}

        {/* Guest-written comment from the RSVP page */}
        {guest.guestNotes && (
          <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <IconMessage size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{guest.guestNotes}</span>
          </div>
        )}
      </div>

      {/* Status pill */}
      <RsvpPill status={status} />

      {/* Options menu */}
      <DropdownMenu dir={isRTL ? 'rtl' : 'ltr'}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">{t('table.openMenu')}</span>
            <IconDotsVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
            onClick={() => onSelect(guest)}
          >
            <IconEdit size={20} />
            {t('table.editGuest')}
          </DropdownMenuItem>
          {status !== 'confirmed' && (
            <DropdownMenuItem
              className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
              onClick={() => onMarkConfirmed(guest)}
            >
              <IconCheck size={20} />
              {t('table.markConfirmed')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
            onClick={() => onDelete(guest)}
          >
            <IconTrash size={20} />
            {t('table.deleteGuest')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
