'use client';

import { useLocale } from 'next-intl';
import {
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconPhone,
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
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { GroupIcon } from '@/features/guests/components/groups';

type TFn = (key: string) => string;

interface GuestMobileCardProps {
  guest: GuestWithGroupApp;
  onSelect: (guest: GuestWithGroupApp) => void;
  onDelete: (guest: GuestWithGroupApp) => void;
  onMarkConfirmed: (guest: GuestWithGroupApp) => void;
  t: TFn;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  declined: 'bg-red-100 text-red-800 border-red-200',
};

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
      className="bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
    >
      {/* Initials badge */}
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 self-center items-center justify-center rounded-full text-sm font-semibold">
        {getInitials(guest.name)}
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate font-medium">{guest.name}</span>

        {guest.phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${guest.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('table.phone')}
            >
              <IconPhone size={16} />
            </a>
            <span dir="ltr" className="text-sm text-muted-foreground">
              {guest.phone}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={STATUS_BADGE[status] ?? STATUS_BADGE.pending}>
            {t(`rsvp.${status}`)}
          </Badge>
          {guest.side && (
            <Badge variant="outline">{t(`sides.${guest.side}`)}</Badge>
          )}
          {guest.group && (
            <Badge variant="outline" className="gap-1.5">
              <GroupIcon iconName={guest.group.icon} size="sm" />
              {guest.group.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Options menu */}
      <DropdownMenu dir={isRTL ? 'rtl' : 'ltr'}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 self-center"
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
