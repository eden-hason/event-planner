'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addFollowUpAdmin } from '../actions/event-controls';
import { useControlAction } from './use-control-action';
import { ADD_FOLLOW_UP_LABEL } from '../utils/labels';

/**
 * Grants one more Follow-up on an Event on the current Message Plan - what an
 * Extra Schedule buys there (ADR 0053). It is added undated; the Owner dates
 * it like the others. Recording the payment is the package band's job.
 */
export function AddFollowUpDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useControlAction(() => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <Plus className="size-[15px]" />
          {ADD_FOLLOW_UP_LABEL}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{ADD_FOLLOW_UP_LABEL}</DialogTitle>
          <DialogDescription>
            עוד הודעה למי שעוד לא ענה, בלי מועד. בעלי האירוע יקבעו מתי היא יוצאת, כמו את האחרות
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-[12.5px]">
          זה מה שתזמון נוסף נותן באירוע על תוכנית ההודעות החדשה. את התשלום עליו רושמים בנפרד
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" onClick={() => run(() => addFollowUpAdmin(eventId))} disabled={pending}>
            {pending ? 'מוסיפים' : 'הוספה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
