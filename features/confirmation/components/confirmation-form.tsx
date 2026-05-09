'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconCheck, IconLoader2, IconX } from '@tabler/icons-react';
import { submitConfirmation } from '../actions';
import { ConfirmationSuccess } from './confirmation-success';
import type { ConfirmationPageData } from '../schemas';

interface ConfirmationFormProps {
  token: string;
  data: ConfirmationPageData;
}

const DIETARY_TYPE_LABELS: Record<string, string> = {
  vegetarian: 'צמחונית',
  vegan: 'טבעונית',
  gluten_free: 'ללא גלוטן',
  strictly_kosher: 'כשר למהדרין',
};

const DEFAULT_DIETARY_TYPES = Object.keys(DIETARY_TYPE_LABELS);

export function ConfirmationForm({ token, data }: ConfirmationFormProps) {
  const { guest, event } = data;
  const alreadyResponded = !!data.respondedAt;
  const previousStatus = alreadyResponded ? guest.rsvpStatus : null;

  const [rsvpStatus, setRsvpStatus] = useState<
    'confirmed' | 'declined' | null
  >(previousStatus === 'pending' ? null : previousStatus);

  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<
    'confirmed' | 'declined' | null
  >(null);

  const [state, formAction, isPending] = useActionState(
    async (
      prevState: { success: boolean; message: string } | null,
      formData: FormData,
    ) => {
      const result = await submitConfirmation(prevState, formData);
      if (result.success) {
        setSubmittedStatus(formData.get('rsvpStatus') as 'confirmed' | 'declined');
        setShowSuccess(true);
      }
      return result;
    },
    null,
  );

  const [mealChoice, setMealChoice] = useState(
    data.responseData?.mealChoice ?? guest.mealChoice ?? '',
  );

  const showDietaryField =
    rsvpStatus === 'confirmed' && event.guestExperience?.dietaryOptions;

  const dietaryTypeOptions =
    event.guestExperience?.dietaryTypes?.length
      ? event.guestExperience.dietaryTypes
      : DEFAULT_DIETARY_TYPES;

  const lockGuestCount = event.guestExperience?.lockGuestCount ?? false;

  if (showSuccess && submittedStatus) {
    return (
      <ConfirmationSuccess
        status={submittedStatus}
        guestName={guest.name}
        guestCount={rsvpStatus === 'confirmed' ? guest.amount : undefined}
        onChangeResponse={() => setShowSuccess(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">אישור הגעה</CardTitle>
        <p className="text-muted-foreground">שלום {guest.name}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="rsvpStatus" value={rsvpStatus ?? ''} />

          {/* RSVP Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              size="lg"
              variant={rsvpStatus === 'confirmed' ? 'default' : 'outline'}
              className="h-16 text-lg"
              onClick={() => setRsvpStatus('confirmed')}
            >
              <IconCheck size={20} />
              מגיע/ה
            </Button>
            <Button
              type="button"
              size="lg"
              variant={rsvpStatus === 'declined' ? 'destructive' : 'outline'}
              className="h-16 text-lg"
              onClick={() => setRsvpStatus('declined')}
            >
              <IconX size={20} />
              לא מגיע/ה
            </Button>
          </div>

          {/* Guest Count */}
          {rsvpStatus === 'confirmed' && (
            <div className="space-y-2">
              <Label htmlFor="guestCount">כמה אורחים?</Label>
              <Input
                id="guestCount"
                name="guestCount"
                type="number"
                min={1}
                defaultValue={
                  data.responseData?.guestCount ?? guest.amount
                }
                readOnly={lockGuestCount}
                className="text-center text-lg"
              />
            </div>
          )}

          {/* Meal Selection */}
          {showDietaryField && (
            <div className="animate-in slide-in-from-top-1 fade-in-0 duration-200 space-y-2">
              <Label htmlFor="mealChoice">בחירת מנה</Label>
              <input
                type="hidden"
                name="mealChoice"
                value={mealChoice}
              />
              <Select
                value={mealChoice}
                onValueChange={setMealChoice}
              >
                <SelectTrigger id="mealChoice" className="w-full">
                  <SelectValue placeholder="בחר מנה" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {dietaryTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DIETARY_TYPE_LABELS[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error message */}
          {state && !state.success && (
            <p className="text-destructive text-center text-sm">
              {state.message}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg"
            disabled={!rsvpStatus || isPending}
          >
            {isPending ? (
              <>
                <IconLoader2 size={20} className="animate-spin" />
                שולח...
              </>
            ) : (
              'שליחה'
            )}
          </Button>

          {alreadyResponded && (
            <p className="text-muted-foreground text-center text-xs">
              כבר השבת לאישור זה. ניתן לשנות את תגובתך.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
