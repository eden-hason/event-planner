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
  GroupApp,
} from '@/features/guests/schemas';
import { GroupIcon } from './groups';
import {
  Contact,
  LayoutList,
  Utensils,
  StickyNote,
  Minus,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DIETARY_PRESETS = [
  'Vegan',
  'Vegetarian',
  'Gluten Free',
  'Nut Allergy',
  'Kosher',
  'Halal',
];

interface GuestFormProps {
  eventId: string;
  guest?: GuestApp | null;
  groups?: GroupApp[];
  onSuccess?: () => void;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
  onPendingChange?: (pending: boolean) => void;
}

export function GuestForm({
  eventId,
  guest,
  groups = [],
  onSuccess,
  onCancel,
  formId = 'guest-form',
  hideActions = false,
  onPendingChange,
}: GuestFormProps) {
  const isEditMode = !!guest;
  const [customChipInput, setCustomChipInput] = React.useState('');
  const [showCustomInput, setShowCustomInput] = React.useState(false);

  const form = useForm({
    resolver: zodResolver(GuestUpsertSchema),
    defaultValues: {
      name: guest?.name || '',
      phone: guest?.phone || '',
      groupId: guest?.groupId ?? null,
      rsvpStatus:
        (guest?.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
        'pending',
      dietaryRestrictions: guest?.dietaryRestrictions || '',
      amount: guest?.amount || 1,
      notes: guest?.notes || '',
    },
  });

  React.useEffect(() => {
    if (guest) {
      form.reset({
        name: guest.name || '',
        phone: guest.phone || '',
        groupId: guest.groupId ?? null,
        rsvpStatus:
          (guest.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
          'pending',
        dietaryRestrictions: guest.dietaryRestrictions || '',
        amount: guest.amount || 1,
        notes: guest.notes || '',
      });
    }
  }, [guest, form]);

  const [, formAction, isPending] = useActionState(
    async (
      _prevState: UpsertGuestState | null,
      formData: FormData,
    ): Promise<UpsertGuestState | null> => {
      const promise = upsertGuest(eventId, formData).then((result) => {
        if (!result.success) {
          throw new Error(result.message || 'Operation failed.');
        }
        return result;
      });

      toast.promise(promise, {
        loading: isEditMode ? 'Updating guest...' : 'Adding guest...',
        success: (data) => {
          if (!isEditMode) {
            form.reset();
          }
          return data.message || (isEditMode ? 'Guest updated.' : 'Guest added.');
        },
        error: (err) =>
          err instanceof Error ? err.message : 'Something went wrong.',
      });

      try {
        return await promise;
      } catch {
        return null;
      }
    },
    null,
  );

  React.useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const onSubmit = (values: GuestUpsert) => {
    const formData = new FormData();

    if (isEditMode && guest?.id) {
      formData.append('id', guest.id);
    }

    Object.entries(values).forEach(([key, value]) => {
      if (key === 'groupId') {
        formData.append(key, value ? String(value) : 'null');
        return;
      }
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    onSuccess?.(); // Close the sheet optimistically

    startTransition(() => {
      formAction(formData);
    });
  };

  const rawDietary = form.watch('dietaryRestrictions') || '';
  const selectedChips = rawDietary
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const amountValue = form.watch('amount') || 1;

  const toggleChip = (chip: string) => {
    const next = selectedChips.includes(chip)
      ? selectedChips.filter((c: string) => c !== chip)
      : [...selectedChips, chip];
    form.setValue('dietaryRestrictions', next.join(', '), {
      shouldDirty: true,
    });
  };

  const addCustomChip = () => {
    const trimmed = customChipInput.trim();
    if (trimmed && !selectedChips.includes(trimmed)) {
      const next = [...selectedChips, trimmed];
      form.setValue('dietaryRestrictions', next.join(', '), {
        shouldDirty: true,
      });
    }
    setCustomChipInput('');
    setShowCustomInput(false);
  };

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Card 1: Contact Information */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Contact className="size-4 text-muted-foreground" />
            Contact Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Guest name" {...field} />
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
                      placeholder="Phone number"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="amount"
            render={() => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() =>
                        form.setValue(
                          'amount',
                          Math.max(1, amountValue - 1),
                          { shouldDirty: true },
                        )
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-lg font-semibold">
                        {amountValue}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {amountValue === 1 ? 'person' : 'people'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() =>
                        form.setValue('amount', amountValue + 1, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Card 2: Event Details */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <LayoutList className="size-4 text-muted-foreground" />
            Event Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rsvpStatus"
              render={({ field }) => (
                <FormItem>
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
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => {
                const selectedGroup = groups.find((g) => g.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select group">
                            {selectedGroup ? (
                              <span className="flex items-center gap-2">
                                <GroupIcon
                                  iconName={selectedGroup.icon}
                                  size="sm"
                                />
                                {selectedGroup.name}
                              </span>
                            ) : (
                              'No group'
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No group</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <span className="flex items-center gap-2">
                              <GroupIcon iconName={group.icon} size="sm" />
                              {group.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>

        {/* Card 3: Dietary Restrictions */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Utensils className="size-4 text-muted-foreground" />
            Dietary Restrictions
          </h3>
          <FormField
            control={form.control}
            name="dietaryRestrictions"
            render={() => (
              <FormItem>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_PRESETS.map((chip) => {
                      const isActive = selectedChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          )}
                        >
                          {isActive && <Check className="size-3" />}
                          {chip}
                        </button>
                      );
                    })}
                    {/* Custom chips (non-preset selected values) */}
                    {selectedChips
                      .filter((c: string) => !DIETARY_PRESETS.includes(c))
                      .map((chip: string) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground transition-colors"
                        >
                          <Check className="size-3" />
                          {chip}
                        </button>
                      ))}
                    {/* Custom chip input toggle */}
                    {showCustomInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customChipInput}
                          onChange={(e) => setCustomChipInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomChip();
                            } else if (e.key === 'Escape') {
                              setShowCustomInput(false);
                              setCustomChipInput('');
                            }
                          }}
                          placeholder="Custom..."
                          className="h-7 w-24 rounded-full border border-dashed px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={addCustomChip}
                          className="inline-flex items-center justify-center size-7 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <Plus className="size-3" />
                        Custom
                      </button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Card 4: Notes */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <StickyNote className="size-4 text-muted-foreground" />
            Notes
          </h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
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
        </div>

        {!hideActions && (
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
        )}
      </form>
    </Form>
  );
}
