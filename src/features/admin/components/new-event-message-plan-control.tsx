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
import type { MessagePlan } from '@/features/schedules/utils/message-plan-kind';
import { setNewEventMessagePlanAdmin } from '../actions/message-plan';
import { MESSAGE_PLAN_NAMES } from '../utils/message-plan';
import { useControlAction } from './use-control-action';

/**
 * Flips which Message Plan new Events start on (ADR 0053), behind a
 * confirmation. It never touches an Event that already exists: those keep
 * their plan, and a single Event moves from its own page.
 */
export function NewEventMessagePlanControl({ plan }: { plan: MessagePlan }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useControlAction(() => setOpen(false));
  const next: MessagePlan = plan === 'current' ? 'classic' : 'current';

  return (
    <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
          {next === 'current' ? 'הפעלת התוכנית החדשה לאירועים חדשים' : 'חזרה לתוכנית הקלאסית לאירועים חדשים'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>אירועים חדשים יתחילו על {MESSAGE_PLAN_NAMES[next]}</DialogTitle>
          <DialogDescription>
            משפיע רק על אירועים שייווצרו מרגע השמירה. אירועים שכבר קיימים נשארים על התוכנית שלהם
          </DialogDescription>
        </DialogHeader>

        {next === 'current' ? (
          <Alert>
            <TriangleAlert />
            <AlertTitle>לפני שמפעילים</AlertTitle>
            <AlertDescription>
              כל תבניות התוכנית החדשה צריכות להיות מאושרות ב-Meta, והפיילוט על אירועים אמיתיים צריך לעבור נקי. אירוע שנוצר על התוכנית החדשה לא יכול לחזור לקלאסית
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground text-[12.5px]">
            אירועים שכבר נוצרו על התוכנית החדשה נשארים עליה
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" onClick={() => run(() => setNewEventMessagePlanAdmin(next))} disabled={pending}>
            {pending ? 'שומרים' : 'שמירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
