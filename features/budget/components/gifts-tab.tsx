'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconGift } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { type GiftApp } from '../schemas/gifts';
import { formatCurrency } from '../types';
import { GiftRow } from './gift-row';
import { GiftSheet } from './gift-sheet';

interface GuestOption {
  id: string;
  name: string;
}

interface GiftsTabProps {
  gifts: GiftApp[];
  eventId: string;
  guests: GuestOption[];
  onAddGift: () => void;
}

export function GiftsTab({ gifts, eventId, guests, onAddGift }: GiftsTabProps) {
  const t = useTranslations('budget');
  const [editGift, setEditGift] = useState<GiftApp | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalAmount = gifts.reduce((s, g) => s + Number(g.amount), 0);
  const receivedAmount = gifts.filter((g) => g.isReceived).reduce((s, g) => s + Number(g.amount), 0);
  const avgAmount = gifts.length > 0 ? Math.round(totalAmount / gifts.length) : 0;

  const handleRowClick = (gift: GiftApp) => {
    setEditGift(gift);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditGift(null);
  };

  return (
    <>
      {gifts.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t('stats.totalReceived')}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-green-600">
              {formatCurrency(receivedAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('stats.ofPledged', { amount: formatCurrency(totalAmount) })}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t('stats.averageGift')}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(avgAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('stats.perGuest')}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{t('stats.totalGifts')}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{gifts.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('stats.giftsReceived', { count: gifts.filter((g) => g.isReceived).length })}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {gifts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <IconGift size={40} className="mb-3 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">{t('giftEmpty.title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('giftEmpty.description')}</p>
            <Button className="mt-4" onClick={onAddGift}>
              {t('giftEmpty.cta')}
            </Button>
          </div>
        ) : (
          gifts.map((g) => (
            <GiftRow key={g.id} gift={g} onClick={handleRowClick} />
          ))
        )}
      </div>

      <GiftSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        gift={editGift}
        eventId={eventId}
        guests={guests}
      />
    </>
  );
}
