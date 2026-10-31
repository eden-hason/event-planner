'use client';

import { useState } from 'react';
import { CalendarClock, Ellipsis, MessageSquare, Send, Trash2, TriangleAlert } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { israelWallClockParts, israelWallClockToIso } from '@/lib/date-time';
import { DEFAULT_SEND_TIME } from '@/features/schedules';
import {
  convertInvitationToConfirmationAdmin,
  deleteInitialInvitationAdmin,
  sendScheduleNowAdmin,
  setScheduleDueTimeAdmin,
} from '../actions/event-controls';
import { useControlAction } from './use-control-action';
import type { EventTimelineRow } from '../types';

type Dialogs = 'dueTime' | 'sendNow' | 'convert' | 'delete' | null;

/**
 * The per-row overflow menu on the Back Office outreach timeline. Renders
 * nothing when the row has no control left to offer, so a sent Schedule shows
 * no dead menu.
 */
export function ScheduleControls({
  row,
  sendingEnabled,
}: {
  row: EventTimelineRow;
  sendingEnabled: boolean;
}) {
  const [open, setOpen] = useState<Dialogs>(null);
  if (!row.dueTimeEditable && !row.sendableNow && !row.convertible && !row.deletable) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`פעולות נוספות עבור ${row.title}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {row.dueTimeEditable && (
            <DropdownMenuItem onSelect={() => setOpen('dueTime')}>
              <CalendarClock />
              {row.scheduledDate ? 'שינוי מועד השליחה' : 'קביעת מועד שליחה'}
            </DropdownMenuItem>
          )}
          {row.sendableNow && (
            <DropdownMenuItem onSelect={() => setOpen('sendNow')}>
              <Send />
              שליחה עכשיו
            </DropdownMenuItem>
          )}
          {row.convertible && (
            <DropdownMenuItem onSelect={() => setOpen('convert')}>
              <MessageSquare />
              המרה להזמנה עם אישור הגעה
            </DropdownMenuItem>
          )}
          {row.deletable && (
            <>
              {(row.dueTimeEditable || row.sendableNow || row.convertible) && <DropdownMenuSeparator />}
              <DropdownMenuItem variant="destructive" onSelect={() => setOpen('delete')}>
                <Trash2 />
                מחיקת ההזמנה
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {row.dueTimeEditable && (
        <DueTimeDialog row={row} sendingEnabled={sendingEnabled} open={open === 'dueTime'} onOpenChange={(next) => setOpen(next ? 'dueTime' : null)} />
      )}
      {row.sendableNow && (
        <SendNowDialog row={row} open={open === 'sendNow'} onOpenChange={(next) => setOpen(next ? 'sendNow' : null)} />
      )}
      {row.convertible && (
        <ConvertDialog row={row} open={open === 'convert'} onOpenChange={(next) => setOpen(next ? 'convert' : null)} />
      )}
      {row.deletable && (
        <DeleteDialog row={row} open={open === 'delete'} onOpenChange={(next) => setOpen(next ? 'delete' : null)} />
      )}
    </>
  );
}

function DueTimeDialog({
  row,
  sendingEnabled,
  open,
  onOpenChange,
}: {
  row: EventTimelineRow;
  sendingEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const initial = row.scheduledDate ? israelWallClockParts(row.scheduledDate) : { date: '', time: DEFAULT_SEND_TIME };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const { pending, run } = useControlAction(() => onOpenChange(false));

  const iso = israelWallClockToIso(date, time);
  // A message past its time goes at the next Send Window; a call plan just
  // reads as overdue. Either way the Operator should know before saving.
  const inPast = iso !== null && Date.parse(iso) < Date.now();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setDate(initial.date);
          setTime(initial.time);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{row.scheduledDate ? 'שינוי מועד השליחה' : 'קביעת מועד שליחה'}</DialogTitle>
          <DialogDescription>{row.title}, לפי שעון ישראל</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
          <div className="space-y-2">
            <Label htmlFor={`due-date-${row.id}`}>תאריך</Label>
            <Input id={`due-date-${row.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`due-time-${row.id}`}>שעה</Label>
            <Input id={`due-time-${row.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="tabular-nums" />
          </div>
        </div>
        {!sendingEnabled && row.kind === 'message' ? (
          <p className="text-muted-foreground text-[12.5px]">
            השליחה עוד לא מופעלת לאירוע הזה. אם היא עדיין כבויה במועד הזה, ההודעה תחכה, ותפוג אחרי איחור של יותר מ-48 שעות
          </p>
        ) : inPast && (
          <p className="text-warning text-[12.5px]">
            {row.kind === 'call'
              ? 'המועד הזה כבר עבר, כך שתוכנית השיחות תוצג כבאיחור'
              : 'המועד הזה כבר עבר, כך שההודעה תצא ברגע שחלון השליחה ייפתח'}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ביטול</Button>
          <Button type="button" onClick={() => iso && run(() => setScheduleDueTimeAdmin(row.id, iso))} disabled={pending || !iso}>
            {pending ? 'שומרים' : 'שמירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendNowDialog({
  row,
  open,
  onOpenChange,
}: {
  row: EventTimelineRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useControlAction(() => onOpenChange(false));
  const nobody = row.audienceCount === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>לשלוח את {row.title} עכשיו?</DialogTitle>
          <DialogDescription>
            {row.audienceCount === 1 ? 'ההודעה תצא עכשיו לאורח אחד' : `ההודעה תצא עכשיו ל-${row.audienceCount} אורחים`},
            גם אם השעה מחוץ לחלון השליחה. מועד השליחה יעבור לעכשיו
          </DialogDescription>
        </DialogHeader>
        {nobody && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>אין אורחים בקהל היעד</AlertTitle>
            <AlertDescription>שליחה בלי אורחים תיכשל, והתזמון לא ייצא שוב. כדאי להוסיף אורחים קודם</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ביטול</Button>
          <Button type="button" onClick={() => run(() => sendScheduleNowAdmin(row.id))} disabled={pending || nobody}>
            {pending ? 'שולחים' : 'שליחה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({
  row,
  open,
  onOpenChange,
}: {
  row: EventTimelineRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useControlAction(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>להמיר להזמנה עם אישור הגעה?</DialogTitle>
          <DialogDescription>
            {row.title} תהפוך לאישור ההגעה הראשון: האורחים יקבלו את ההזמנה וגם יישאלו אם הם מגיעים.
            מועד השליחה נשאר, והיא עדיין נשלחת לכל האורחים
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-[13px]">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.07em] uppercase">אישורי ההגעה הבאים</p>
          {row.convertNarrows.length ? (
            <ul className="flex flex-col gap-1">
              {row.convertNarrows.map((title) => (
                <li key={title} className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground text-[12.5px]">כל האורחים ← רק הממתינים לתשובה</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-[12.5px]">אף אחד מהם לא נשלח לכל האורחים, כך שקהל היעד לא משתנה</p>
          )}
        </div>
        {/* Plan order decides the follow-up round (isFollowUpConfirmation). */}
        {row.convertsToFollowUp && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>אישור הגעה אחר מתוזמן לפני ההזמנה הזו</AlertTitle>
            <AlertDescription>ההזמנה אחרי ההמרה תישלח כתזכורת למי שלא ענה. כדאי להזיז את התאריכים כך שההזמנה תצא ראשונה</AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground text-[12px]">אי אפשר לבטל את זה ממערכת הניהול</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ביטול</Button>
          <Button type="button" onClick={() => run(() => convertInvitationToConfirmationAdmin(row.id))} disabled={pending}>
            {pending ? 'ממירים' : 'המרה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  row,
  open,
  onOpenChange,
}: {
  row: EventTimelineRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, run } = useControlAction(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>למחוק את {row.title}?</DialogTitle>
          <DialogDescription>
            ההזמנה תוסר מתוכנית השליחות של האירוע ולא תישלח לאורחים. שאר התזמונים נשארים כמו שהם
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>אי אפשר לבטל את המחיקה</AlertTitle>
          <AlertDescription>אי אפשר להחזיר את ההזמנה אחרי המחיקה, לא ממערכת הניהול ולא מצד בעלי האירוע</AlertDescription>
        </Alert>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>ביטול</Button>
          <Button type="button" variant="destructive" onClick={() => run(() => deleteInitialInvitationAdmin(row.id))} disabled={pending}>
            {pending ? 'מוחקים' : 'מחיקה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
