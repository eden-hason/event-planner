'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { WhatsAppIcon } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/phone';
import {
  getHandDeliveryMessage,
  markHandDelivered,
  withdrawHandDelivered,
} from '../actions/hand-delivery';
import { useControlAction } from './use-control-action';

/**
 * A Hand Delivery for one Failed Delivery (CONTEXT.md, ADR 0052): the message
 * to send from a Kululu team phone, a link that opens WhatsApp with it typed
 * in, and the Operator's confirmation that it arrived. Opening WhatsApp records
 * nothing - only the confirmation does.
 */
export function HandDeliveryDialog({ deliveryId, guestName }: { deliveryId: string; guestName: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof getHandDeliveryMessage>> | null>(null);
  const [loading, startLoading] = useTransition();
  const { pending, run } = useControlAction(() => setOpen(false));
  const message = loaded?.ok ? loaded.message : null;
  const loadError = loaded && !loaded.ok ? loaded.message : null;

  function load() {
    startLoading(async () => setLoaded(await getHandDeliveryMessage(deliveryId)));
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="xs" className="shrink-0 gap-1">
          <WhatsAppIcon size={13} />
          וואטסאפ ידני
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>מסירה ידנית ל{guestName}</DialogTitle>
          <DialogDescription>
            שולחים את ההודעה מטלפון של צוות Kululu, ומסמנים כאן רק אחרי שהיא הגיעה לאורח. בעלי האירוע יראו שההודעה נמסרה על ידי הצוות
          </DialogDescription>
        </DialogHeader>

        {loading && !message && <Skeleton className="h-40 w-full" />}
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {message && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-[12.5px] tabular-nums">{formatPhone(message.phone)}</p>
            {message.text ? (
              <p dir="rtl" className="bg-muted max-h-64 overflow-y-auto rounded-md border px-3 py-2.5 text-[13px] whitespace-pre-wrap">
                {message.text}
              </p>
            ) : (
              <Alert>
                <AlertDescription>
                  {message.noTextReason}. הצ׳אט ייפתח ריק, וכותבים בו את ההודעה בעצמכם
                </AlertDescription>
              </Alert>
            )}
            {!message.text && message.rsvpUrl && <RsvpLink url={message.rsvpUrl} />}
            <Button asChild variant="outline" className="gap-1.5 self-start">
              <a href={message.chatUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={15} />
                {message.text ? 'פתיחה בוואטסאפ' : 'פתיחת צ׳אט ריק בוואטסאפ'}
              </a>
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>סגירה</Button>
          <Button
            onClick={() => run(() => markHandDelivered(deliveryId))}
            disabled={pending || !!loadError}
          >
            ההודעה הגיעה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The Guest's own RSVP page, to paste into a message written by hand */
function RsvpLink({ url }: { url: string }) {
  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success('הקישור לאישור ההגעה הועתק');
  }
  return (
    <div className="bg-muted flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-[7px]">
      <span className="text-muted-foreground shrink-0 text-[12px]">אישור הגעה:</span>
      <code dir="ltr" className="text-foreground/80 min-w-0 flex-1 truncate text-[12.5px]">{url}</code>
      <Button type="button" variant="link" size="xs" className="h-auto shrink-0 p-0" onClick={copy}>העתקה</Button>
    </div>
  );
}

/**
 * Takes back a Hand Delivery recorded by mistake. It is erased, so the Delivery
 * is Failed again and the Owner no longer sees it as reached.
 */
export function WithdrawHandDeliveryButton({ deliveryId, guestName }: { deliveryId: string; guestName: string }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useControlAction(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="xs" className="text-muted-foreground hover:text-foreground h-auto shrink-0 p-0">
          ביטול המסירה הידנית
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>לבטל את המסירה הידנית ל{guestName}?</DialogTitle>
          <DialogDescription>
            הסימון יימחק והשליחה תחזור למצב נכשל, גם אצל בעלי האירוע. תשובה שהאורח כבר נתן נשארת
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>השארה</Button>
          <Button
            variant="destructive"
            onClick={() => run(() => withdrawHandDelivered(deliveryId))}
            disabled={pending}
          >
            ביטול המסירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
