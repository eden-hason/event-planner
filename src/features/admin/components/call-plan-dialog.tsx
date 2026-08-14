'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type CallPlanFormValues = {
  /** ISO 8601, combining the chosen date and time in local terms */
  scheduledDate: string;
  /** HH:MM */
  scheduledTime: string;
  targetStatus: 'pending' | 'confirmed';
};

interface CallPlanDialogProps {
  open: boolean;
  mode: 'create' | 'reschedule';
  initialDate?: string;
  initialTime?: string;
  initialTarget?: 'pending' | 'confirmed';
  onOpenChange: (open: boolean) => void;
  onSave: (values: CallPlanFormValues) => void | Promise<void>;
}

function todayInput(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Plans a call round, or moves one that has not started yet.
 *
 * The back office is the only place a call round can be created after the setup
 * wizard has run, and the only place one can be rescheduled at all - the Owner
 * is blocked by a restrictive RLS policy. See docs/adr/0004.
 */
export function CallPlanDialog({
  open,
  mode,
  initialDate,
  initialTime,
  initialTarget,
  onOpenChange,
  onSave,
}: CallPlanDialogProps) {
  const [date, setDate] = useState(initialDate ?? todayInput());
  const [time, setTime] = useState(initialTime ?? '10:00');
  const [target, setTarget] = useState<'pending' | 'confirmed'>(initialTarget ?? 'pending');
  const [saving, setSaving] = useState(false);

  // Reset to whatever the caller is editing each time the dialog opens, so
  // reopening on a different plan never shows the previous one's values.
  useEffect(() => {
    if (!open) return;
    setDate(initialDate ?? todayInput());
    setTime(initialTime ?? '10:00');
    setTarget(initialTarget ?? 'pending');
  }, [open, initialDate, initialTime, initialTarget]);

  const handleSave = async () => {
    if (!date) return;
    const [hours, minutes] = time.split(':').map(Number);
    // Built from local components: a date input yields local midnight, and
    // setUTCHours would shift it a day back in positive-offset zones.
    const combined = new Date(`${date}T00:00:00`);
    combined.setHours(hours, minutes, 0, 0);

    setSaving(true);
    try {
      await onSave({
        scheduledDate: combined.toISOString(),
        scheduledTime: time,
        targetStatus: target,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="ltr" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reschedule' ? 'Reschedule call round' : 'Add call round'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'reschedule'
              ? 'Move this round to a different date. Only rounds that have not started can be moved'
              : 'Plans a round on the owner schedule. Starting it later loads the guests'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="call-plan-date">Date</Label>
              <Input
                id="call-plan-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-plan-time">Time</Label>
              <Input
                id="call-plan-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* The audience is fixed once the round exists, because it decides
              which guests get snapshotted at Start. */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="call-plan-target">Who gets called</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as 'pending' | 'confirmed')}
              >
                <SelectTrigger id="call-plan-target" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending guests</SelectItem>
                  <SelectItem value="confirmed">Confirmed guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !date}>
            {saving ? 'Saving…' : mode === 'reschedule' ? 'Reschedule' : 'Add round'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
