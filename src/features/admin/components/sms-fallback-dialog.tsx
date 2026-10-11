'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, MessageSquare, TriangleAlert } from '@/components/icons';
import { getSmsFallbackPlan, launchSmsFallback } from '../actions/sms-fallback';
import type { SmsFallbackPlan, SmsFallbackRecipient } from '../actions/sms-fallback';
import { MAX_BATCH_SIZE } from '../utils/sms-fallback';
import { formatPhone } from '@/lib/phone';

function RecipientRow({ recipient }: { recipient: SmsFallbackRecipient }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-3 py-2 text-[12.5px] last:border-b-0">
      <span className="min-w-0">
        <span className="block font-medium">{recipient.guestName}</span>
        <span className="text-muted-foreground block">{recipient.reason}</span>
      </span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {recipient.guestPhone ? formatPhone(recipient.guestPhone) : 'אין טלפון'}
      </span>
    </div>
  );
}

/**
 * The SMS Fallback for one schedule (CONTEXT.md, ADR 0012).
 *
 * The Operator confirms a count, not a list: who is eligible is the server's
 * answer, recomputed when the dialog opens and again when the batch is sent, so
 * a guest handled in between is simply no longer in it. Everyone left out is
 * listed with the reason, because a system-level failure is the Operator's cue
 * to fix the cause and resend on WhatsApp instead.
 */
export function SmsFallbackDialog({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<SmsFallbackPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();

  function load() {
    setLoadError(null);
    startLoading(async () => {
      const result = await getSmsFallbackPlan(scheduleId);
      if (result.ok) setPlan(result.plan);
      else setLoadError(result.message);
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
    else setPlan(null);
  }

  function send() {
    startSending(async () => {
      const promise = launchSmsFallback(scheduleId).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });
      toast.promise(promise, {
        loading: 'שולחים SMS',
        success: (result) => {
          if (result.plan) setPlan(result.plan);
          router.refresh();
          return result.message;
        },
        error: (error) => (error instanceof Error ? error.message : 'שליחת ה-SMS נכשלה'),
      });
      try {
        await promise;
      } catch {
        // The toast owns the visible error state
      }
    });
  }

  const eligibleCount = plan?.eligible.length ?? 0;
  const batchCount = Math.min(eligibleCount, MAX_BATCH_SIZE);
  const unavailable = plan?.unavailableReason ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="mt-3 ms-2">
          <MessageSquare /> שליחה ב-SMS
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>שליחה ב-SMS</DialogTitle>
          <DialogDescription>
            שולח את גרסת ה-SMS של ההודעה לאורחים שהוואטסאפ שלהם נכשל מסיבה שקשורה אליהם, או שהמסירה לא אושרה
          </DialogDescription>
        </DialogHeader>

        {loading && !plan ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : loadError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>לא הצלחנו לטעון את השליחה ב-SMS</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : plan ? (
          <div className="flex min-w-0 flex-col gap-3">
            {unavailable && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>אי אפשר לשלוח את התזמון הזה ב-SMS</AlertTitle>
                <AlertDescription>{unavailable}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 rounded-lg border px-3 py-2.5">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-muted-foreground text-[11.5px]">מתאימים</span>
                <span className="text-[17px] font-semibold tabular-nums">{eligibleCount}</span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-muted-foreground text-[11.5px]">לא נכללו</span>
                <span className="text-muted-foreground text-[17px] font-semibold tabular-nums">{plan.excluded.length}</span>
              </div>
            </div>

            {plan.preview && !unavailable && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[11.5px]">
                  תצוגה מקדימה - כפי ש{plan.eligible[0]?.guestName} יקבל/תקבל
                </span>
                <pre dir="auto" className="bg-muted max-h-40 overflow-auto rounded-md border px-3 py-2 font-sans text-[12.5px] whitespace-pre-wrap">
                  {plan.preview}
                </pre>
              </div>
            )}

            {eligibleCount > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium">
                  אורחים מתאימים ({eligibleCount}) <ChevronDown />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 max-h-56 overflow-auto rounded-lg border">
                  {plan.eligible.map((recipient) => (
                    <RecipientRow key={recipient.deliveryId} recipient={recipient} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {plan.excluded.length > 0 && (
              <Collapsible defaultOpen={eligibleCount === 0}>
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] font-medium">
                  לא נכללו ({plan.excluded.length}) <ChevronDown />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 max-h-56 overflow-auto rounded-lg border">
                  {plan.excluded.map((recipient) => (
                    <RecipientRow key={recipient.deliveryId} recipient={recipient} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {eligibleCount > MAX_BATCH_SIZE && (
              <p className="text-muted-foreground text-[11.5px]">
                כל סבב שליחה כולל עד {MAX_BATCH_SIZE}. צריך לשלוח שוב בשביל השאר
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            סגירה
          </Button>
          <Button onClick={send} disabled={sending || loading || !plan || !!unavailable || batchCount === 0}>
            {batchCount > 0 ? `שליחת ${batchCount} הודעות SMS עכשיו` : 'אין מה לשלוח'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
