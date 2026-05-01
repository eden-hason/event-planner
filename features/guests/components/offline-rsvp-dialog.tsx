'use client';

import { useTranslations } from 'next-intl';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { IconBellOff, IconInfoCircle, IconUsers } from '@tabler/icons-react';

interface OfflineRsvpDialogProps {
  open: boolean;
  newStatus: 'confirmed' | 'declined';
  guestName: string;
  nonOfflineCount?: number;
  capacity?: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OfflineRsvpDialog({
  open,
  newStatus,
  guestName,
  nonOfflineCount,
  capacity,
  onConfirm,
  onCancel,
}: OfflineRsvpDialogProps) {
  const t = useTranslations('guests');

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center rounded-full bg-primary/10 p-1">
              <IconInfoCircle size={20} className="text-primary" />
            </span>
            {t('offlineRsvpDialog.title')}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <div className="space-y-3">
            <p>
              {t('offlineRsvpDialog.description', {
                name: guestName,
                status: t(`rsvp.${newStatus}`),
              })}
            </p>
            <Card className="py-0 gap-0 overflow-hidden shadow-none bg-muted/40">
              <ItemGroup>
                <Item size="sm">
                  <ItemContent>
                    <ItemTitle>{t('offlineRsvpDialog.bullet1')}</ItemTitle>
                    <ItemDescription className="text-xs">{t('offlineRsvpDialog.bullet1Sub')}</ItemDescription>
                  </ItemContent>
                  <ItemMedia variant="icon" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <IconBellOff />
                  </ItemMedia>
                </Item>
                <ItemSeparator />
                <Item size="sm">
                  <ItemContent>
                    <ItemTitle>{t('offlineRsvpDialog.bullet2')}</ItemTitle>
                    <ItemDescription className="text-xs">{t('offlineRsvpDialog.bullet2Sub')}</ItemDescription>
                  </ItemContent>
                  <ItemMedia variant="icon" className="bg-green-500/10 border-green-500/20 text-green-600">
                    <IconUsers />
                  </ItemMedia>
                </Item>
              </ItemGroup>
            </Card>
            {nonOfflineCount !== undefined && (
              <div className="flex justify-end">
                <Badge variant="secondary" className="font-normal">
                  {capacity ? `${nonOfflineCount} / ${capacity}` : String(nonOfflineCount)}
                  {' '}{t('offlineRsvpDialog.capacityGuests')}
                </Badge>
              </div>
            )}
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t('offlineRsvpDialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t('offlineRsvpDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
