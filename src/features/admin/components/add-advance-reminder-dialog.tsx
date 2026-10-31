'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_SEND_TIME, lastDueDay } from '@/features/schedules';
import { createAdvanceReminderAdmin } from '../actions/event-controls';

/**
 * Adds an Advance Reminder to one Event (ADR 0051). Proposes the day before the
 * Event at the usual send hour, and the Operator may pick any earlier day.
 * Taking the Event Reminder away, for an Event reminded only in advance, is the
 * timeline's delete - this only adds.
 */
export function AddAdvanceReminderDialog({
  eventId,
  eventDate,
}: {
  eventId: string;
  eventDate: string;
}) {
  const lastDay = lastDueDay(eventDate, 'advance_reminder') ?? '';
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(lastDay);
  const [time, setTime] = useState(DEFAULT_SEND_TIME);

  function submit() {
    if (!date || !time) {
      toast.error('צריך לבחור תאריך ושעה');
      return;
    }

    startTransition(async () => {
      const result = await createAdvanceReminderAdmin({
        eventId,
        scheduledDate: date,
        scheduledTime: time,
      });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          <Plus className="size-[15px]" />
          הוספת תזכורת מוקדמת
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>הוספת תזכורת מוקדמת</DialogTitle>
          <DialogDescription>
            תזכורת לפני יום האירוע, שנשלחת לכל מי שלא סירב. מי שעוד לא ענה יכול לאשר הגעה ישר ממנה
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="advance-reminder-date">תאריך</Label>
              <Input
                id="advance-reminder-date"
                type="date"
                value={date}
                max={lastDay}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="advance-reminder-time">שעה</Label>
              <Input
                id="advance-reminder-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-[12.5px]">
            עד יום לפני האירוע. כדי שתחליף את התזכורת של יום האירוע, צריך למחוק את התזכורת ההיא מציר התקשורת
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'מוסיפים' : 'הוספה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
