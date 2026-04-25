'use client';

import { useTranslations } from 'next-intl';
import { IconGift } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item';
import { type GiftApp } from '../schemas/gifts';
import { formatCurrency } from '../types';

interface GiftRowProps {
  gift: GiftApp;
  onClick: (gift: GiftApp) => void;
}

export function GiftRow({ gift, onClick }: GiftRowProps) {
  const t = useTranslations('budget');

  return (
    <Item
      onClick={() => onClick(gift)}
      className="cursor-pointer rounded-none px-4 py-3.5 gap-3 hover:bg-muted/40 border-b-border last:border-b-0"
    >
      <ItemMedia className="size-10 self-center translate-y-0 rounded-xl bg-muted text-muted-foreground">
        <IconGift size={20} />
      </ItemMedia>

      <ItemContent>
        <ItemTitle className="w-full truncate">{gift.guestName}</ItemTitle>
        {gift.notes && (
          <ItemDescription className="mt-0.5 truncate text-xs line-clamp-none">
            {gift.notes}
          </ItemDescription>
        )}
      </ItemContent>

      <ItemActions>
        <p className="mr-2 text-sm font-semibold">{formatCurrency(gift.amount)}</p>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
            gift.isReceived ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
          )}
        >
          {gift.isReceived ? t('giftRow.received') : t('giftRow.pending')}
        </span>
      </ItemActions>
    </Item>
  );
}
