'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OWNER_MESSAGE_KIND_LABELS, type OwnerMessageKind } from '@/features/owner-messages';
import { sendOwnerMessageNowAdmin } from '../actions/owner-messages';
import { useControlAction } from './use-control-action';

/**
 * "Send now" for one kind of Owner Message. Confirmed first, because it goes to
 * a real person's WhatsApp and cannot be taken back, and it sends even when the
 * automatic one already went.
 */
export function SendOwnerMessageButton({
  eventId,
  kind,
  alreadySent,
}: {
  eventId: string;
  kind: OwnerMessageKind;
  alreadySent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useControlAction(() => setOpen(false));
  const label = OWNER_MESSAGE_KIND_LABELS[kind];

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          שליחת {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>לשלוח עכשיו את הודעת {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {alreadySent
              ? 'ההודעה הזו כבר נשלחה לבעלי האירוע. שליחה נוספת תגיע אליהם שוב בוואטסאפ'
              : 'ההודעה תישלח בוואטסאפ למי שיצר את האירוע'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>ביטול</AlertDialogCancel>
          <Button type="button" disabled={pending} onClick={() => run(() => sendOwnerMessageNowAdmin(eventId, kind))}>
            {pending ? 'שולחים' : 'שליחה'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
