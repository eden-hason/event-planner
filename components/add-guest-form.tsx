'use client';

import { useActionState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { createGuest, GuestResult } from '@/app/actions/guests';

interface AddGuestFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export function AddGuestForm({ eventId, onSuccess }: AddGuestFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: GuestResult, formData: FormData) => {
      try {
        // Extract form data
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;
        const amount = Number(formData.get('amount'));
        const group = formData.get('group') as string;
        const rsvpStatus = formData.get('rsvpStatus') as
          | 'pending'
          | 'confirmed'
          | 'declined';
        const notes = formData.get('notes') as string;

        // Call server action
        const result = await createGuest(eventId, {
          name,
          phone,
          amount,
          group,
          rsvpStatus,
          notes,
        });

        if (result.success) {
          toast.success(result.message);
          onSuccess?.();
        } else {
          toast.error(result.message);
        }

        return result;
      } catch (error) {
        console.error('Form submission error:', error);
        return { success: false, message: 'An unexpected error occurred' };
      }
    },
    { success: false, message: '' },
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Enter guest name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Enter phone number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="1"
          placeholder="Enter amount"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group">Group</Label>
        <Select name="group" defaultValue="">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="friends">Friends</SelectItem>
            <SelectItem value="colleagues">Colleagues</SelectItem>
            <SelectItem value="acquaintances">Acquaintances</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rsvpStatus">RSVP Status</Label>
        <Select name="rsvpStatus" defaultValue="pending">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select RSVP status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Add any additional notes about this guest..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Adding...' : 'Add Guest'}
        </Button>
      </div>
    </form>
  );
}
