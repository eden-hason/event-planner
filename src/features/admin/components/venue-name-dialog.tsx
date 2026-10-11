'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setEventVenueNameAdmin } from '../actions/event-controls';
import { VENUE_NAME_MAX } from '../utils/venue';
import { useControlAction } from './use-control-action';

/**
 * Edits the venue text Guests read on the invitation, the RSVP page and the
 * messages. The map pin is not touched, so navigation still lands where the
 * Owner pinned it.
 */
export function VenueNameDialog({ eventId, locationName }: { eventId: string; locationName: string | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(locationName ?? '');
  const { pending, run } = useControlAction(() => setOpen(false));
  const trimmed = value.trim();
  const save = () => run(() => setEventVenueNameAdmin(eventId, trimmed));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) setValue(locationName ?? '');
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="xs" className="h-auto p-0 text-[12px]">
          עריכה
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>מקום האירוע</DialogTitle>
          <DialogDescription>השם שהאורחים רואים. המיקום במפה נשאר כפי שבעלי האירוע סימנו</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && trimmed !== locationName) save();
          }}
        >
          <Label htmlFor={`venue-${eventId}`}>שם המקום</Label>
          <Input id={`venue-${eventId}`} dir="auto" value={value} onChange={(e) => setValue(e.target.value)} maxLength={VENUE_NAME_MAX} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>ביטול</Button>
          <Button type="button" onClick={save} disabled={pending || !trimmed || trimmed === locationName}>
            {pending ? 'שומרים' : 'שמירה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
