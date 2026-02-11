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
import { Check, X, Loader2 } from 'lucide-react';
import { submitConfirmation } from '../actions';
import { ConfirmationSuccess } from './confirmation-success';
import type { ConfirmationPageData } from '../schemas';

interface ConfirmationFormProps {
  token: string;
  data: ConfirmationPageData;
}

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

  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    data.responseData?.dietary_restrictions ?? guest.dietaryRestrictions ?? '',
  );

  const showDietaryField =
    rsvpStatus === 'confirmed' && event.guestExperience?.dietaryOptions;

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
              <Check className="size-5" />
              מגיע/ה
            </Button>
            <Button
              type="button"
              size="lg"
              variant={rsvpStatus === 'declined' ? 'destructive' : 'outline'}
              className="h-16 text-lg"
              onClick={() => setRsvpStatus('declined')}
            >
              <X className="size-5" />
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
                  data.responseData?.guest_count ?? guest.amount
                }
                className="text-center text-lg"
              />
            </div>
          )}

          {/* Dietary Restrictions */}
          {showDietaryField && (
            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions">העדפות תזונה</Label>
              <input
                type="hidden"
                name="dietaryRestrictions"
                value={dietaryRestrictions}
              />
              <Select
                value={dietaryRestrictions}
                onValueChange={setDietaryRestrictions}
              >
                <SelectTrigger id="dietaryRestrictions">
                  <SelectValue placeholder="בחר העדפה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">ללא הגבלה</SelectItem>
                  <SelectItem value="vegetarian">צמחוני</SelectItem>
                  <SelectItem value="vegan">טבעוני</SelectItem>
                  <SelectItem value="kosher">כשר</SelectItem>
                  <SelectItem value="gluten_free">ללא גלוטן</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
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
                <Loader2 className="size-5 animate-spin" />
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
