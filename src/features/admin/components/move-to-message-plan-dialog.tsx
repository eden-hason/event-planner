'use client';

import { useState } from 'react';
import { TriangleAlert } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { moveEventToMessagePlanAdmin } from '../actions/message-plan';
import { MOVE_LOSSES, MOVE_SEEDS, moveBlockLabel, type MoveBlock } from '../utils/message-plan';
import { useControlAction } from './use-control-action';

/**
 * Moves a Classic Event onto the current Message Plan (ADR 0053). One way, and
 * it starts the plan over, so the dialog lists everything that is not carried
 * before the Operator confirms. Once anything was sent the trigger is disabled
 * and says why - the same check the move function refuses on.
 *
 * Rendered only for a Classic Event; on the current plan there is nothing to do.
 */
export function MoveToMessagePlanDialog({
  eventId,
  block,
}: {
  eventId: string;
  block: MoveBlock | null;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useControlAction(() => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !block && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="xs" className="h-auto p-0 text-[12px]" disabled={!!block}>
          מעבר לתוכנית החדשה
        </Button>
      </DialogTrigger>
      {block && <span className="text-muted-foreground truncate text-[12px]">{moveBlockLabel(block)}</span>}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>מעבר לתוכנית ההודעות החדשה</DialogTitle>
          <DialogDescription>
            כל התזמונים של ההודעות שעוד לא נשלחו נמחקים, ובמקומם נוצרים התזמונים של התוכנית החדשה: {MOVE_SEEDS}. לאירוע בלי תאריך או סוג הם ייווצרו כשיהיו לו
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>מה לא עובר לתוכנית החדשה</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 ps-4">
              {MOVE_LOSSES.map((loss) => (
                <li key={loss}>{loss}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="text-muted-foreground flex flex-col gap-1 text-[12.5px]">
          <p>בעלי האירוע מתחילים מחדש: את המועדים ואת הנוסח של כל הודעה הם קובעים שוב, ויראו את התוכנית החדשה בפעם הבאה שייכנסו</p>
          <p>סבבי השיחות לא משתנים. אי אפשר להחזיר את האירוע לתוכנית הקלאסית</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" variant="destructive" onClick={() => run(() => moveEventToMessagePlanAdmin(eventId))} disabled={pending}>
            {pending ? 'מעבירים' : 'מעבר לתוכנית החדשה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
