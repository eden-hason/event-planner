'use client';

import * as React from 'react';
import { useActionState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { upsertGuest, type UpsertGuestState } from '@/features/guests/actions';
import {
  type GuestUpsert,
  GuestUpsertSchema,
  GuestApp,
} from '@/features/guests/schemas';

interface GuestFormProps {
  eventId: string;
  guest?: GuestApp | null; // Optional - if provided, form is in edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GuestForm({
  eventId,
  guest,
  onSuccess,
  onCancel,
}: GuestFormProps) {
  const isEditMode = !!guest;

  // Set up react-hook-form with zodResolver
  const form = useForm({
    resolver: zodResolver(GuestUpsertSchema),
    defaultValues: {
      name: guest?.name || '',
      phone: guest?.phone || '',
      guestGroup: guest?.guestGroup || '',
      rsvpStatus:
        (guest?.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
        'pending',
      dietaryRestrictions: guest?.dietaryRestrictions || '',
      amount: guest?.amount || 1,
      notes: guest?.notes || '',
    },
  });

  // Update form when guest prop changes
  React.useEffect(() => {
    if (guest) {
      form.reset({
        name: guest.name || '',
        phone: guest.phone || '',
        guestGroup: guest.guestGroup || '',
        rsvpStatus:
          (guest.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
          'pending',
        dietaryRestrictions: guest.dietaryRestrictions || '',
        amount: guest.amount || 1,
        notes: guest.notes || '',
      });
    }
  }, [guest, form]);

  // Server action state management
  const [, formAction, isPending] = useActionState(
    async (prevState: UpsertGuestState | null, formData: FormData) => {
      try {
        const result = await upsertGuest(eventId, formData);

        if (result.success) {
          toast.success(result.message);
          onSuccess?.();
          // Reset form after successful creation
          if (!isEditMode) {
            form.reset();
          }
        } else {
          toast.error(result.message);
        }

        return result;
      } catch (error) {
        console.error('Form submission error:', error);
        return { success: false, message: 'An unexpected error occurred' };
      }
    },
    null,
  );

  // Handle form submission - convert form values to FormData
  const onSubmit = (values: GuestUpsert) => {
    const formData = new FormData();

    // Include guest ID if in edit mode
    if (isEditMode && guest?.id) {
      formData.append('id', guest.id);
    }

    Object.entries(values).forEach(([key, value]) => {
      // For optional fields like guestGroup, only include if value is truthy
      // Empty strings should be treated as undefined for optional fields
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Enter guest name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value =
                      e.target.value === ''
                        ? undefined
                        : Number(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="guestGroup"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Guest Group</FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="colleagues">Colleagues</SelectItem>
                    <SelectItem value="acquaintances">Acquaintances</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rsvpStatus"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>RSVP Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select RSVP status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dietaryRestrictions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dietary Restrictions</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Enter dietary restrictions (optional)"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes about this guest..."
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditMode
                ? 'Updating...'
                : 'Adding...'
              : isEditMode
                ? 'Update Guest'
                : 'Add Guest'}
          </Button>
          {isEditMode && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
