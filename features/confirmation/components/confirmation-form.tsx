'use client';

import { useState, useActionState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitConfirmationResponse } from '@/features/confirmation/actions';
import type {
  ConfirmationPageData,
  ConfirmationActionState,
} from '@/features/confirmation/schemas';
import { EventDetailsCard } from './event-details-card';
import { SuccessMessage } from './success-message';

type Step = 'choose' | 'details' | 'submitted';

export function ConfirmationForm({
  data,
  token,
}: {
  data: ConfirmationPageData;
  token: string;
}) {
  const { guest, event, existingRsvp } = data;

  // If guest already responded, start in submitted state
  const [step, setStep] = useState<Step>(existingRsvp ? 'submitted' : 'choose');
  const [status, setStatus] = useState<'confirmed' | 'declined' | null>(
    existingRsvp?.status === 'confirmed' || existingRsvp?.status === 'declined'
      ? existingRsvp.status
      : null,
  );
  const [guestCount, setGuestCount] = useState<number>(
    existingRsvp?.guestCount ?? 1,
  );
  const [notes, setNotes] = useState<string>(existingRsvp?.notes ?? '');

  const actionWithToast = async (
    prevState: ConfirmationActionState | null,
    params: { formData: FormData },
  ): Promise<ConfirmationActionState | null> => {
    const promise = submitConfirmationResponse(
      token,
      params.formData,
    ).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to submit response.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: 'Submitting your response...',
      success: (result) => {
        setStep('submitted');
        return result.message || 'Response submitted!';
      },
      error: (err) =>
        err instanceof Error ? err.message : 'Something went wrong.',
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, formAction, isPending] = useActionState(actionWithToast, null);

  const handleChoose = (choice: 'confirmed' | 'declined') => {
    setStatus(choice);
    setStep('details');
  };

  const handleBack = () => {
    setStep('choose');
  };

  const handleUpdate = () => {
    setStep('choose');
    setStatus(null);
  };

  // Submitted state
  if (step === 'submitted' && (status || existingRsvp)) {
    const displayStatus = status ?? existingRsvp?.status;
    const displayCount =
      status === 'confirmed' ? guestCount : existingRsvp?.guestCount;

    return (
      <div className="space-y-4">
        <EventDetailsCard event={event} />
        <SuccessMessage
          status={displayStatus as 'confirmed' | 'declined'}
          guestCount={displayCount}
          eventTitle={event.title}
          onUpdate={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EventDetailsCard event={event} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {step === 'choose'
              ? `Hi ${guest.name}, will you be attending?`
              : status === 'confirmed'
                ? 'Confirm your attendance'
                : 'Decline invitation'}
          </CardTitle>
        </CardHeader>

        {step === 'choose' && (
          <CardContent className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => handleChoose('confirmed')}
            >
              Yes, I&apos;ll be there
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleChoose('declined')}
            >
              Sorry, I can&apos;t make it
            </Button>
          </CardContent>
        )}

        {step === 'details' && status && (
          <form action={(formData) => formAction({ formData })}>
            <input type="hidden" name="status" value={status} />

            <CardContent className="space-y-4">
              {status === 'confirmed' && guest.amount > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="guestCount">
                    How many guests? (max {guest.amount})
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setGuestCount((prev) => Math.max(1, prev - 1))
                      }
                      disabled={guestCount <= 1}
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      id="guestCount"
                      name="guestCount"
                      value={guestCount}
                      readOnly
                      className="border-input bg-background w-16 rounded-md border px-3 py-2 text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setGuestCount((prev) =>
                          Math.min(guest.amount, prev + 1),
                        )
                      }
                      disabled={guestCount >= guest.amount}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              {status === 'confirmed' && guest.amount === 1 && (
                <input type="hidden" name="guestCount" value="1" />
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {status === 'confirmed'
                    ? 'Any notes for the host? (optional)'
                    : 'Send a message (optional)'}
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    status === 'confirmed'
                      ? 'e.g., dietary restrictions, special requests...'
                      : 'e.g., congratulations, sorry I can\'t make it...'
                  }
                  maxLength={500}
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending
                  ? 'Submitting...'
                  : status === 'confirmed'
                    ? 'Confirm attendance'
                    : 'Submit response'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
