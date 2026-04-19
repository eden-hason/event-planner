'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { IconArrowLeft, IconArrowRight, IconConfetti } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationInput } from '@/components/ui/location-input';
import { createOnboardingEvent } from '@/features/events/actions';
import type { GuestsEstimate } from '@/features/events/schemas';
import type { LocationCoords } from '@/components/ui/google-map';
import { cn } from '@/lib/utils';

type WizardStep = 1 | 2 | 3 | 'success';

interface WizardData {
  brideName: string;
  groomName: string;
  eventDate: string;
  location: { name: string; coords?: LocationCoords } | null;
  guestsEstimate: GuestsEstimate | null;
}

const GUEST_OPTION_VALUES: GuestsEstimate[] = [
  'up_to_100',
  '100_200',
  '200_350',
  '350_plus',
];

export function OnboardingWizard() {
  const router = useRouter();
  const t = useTranslations('newEvent');
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>({
    brideName: '',
    groomName: '',
    eventDate: '',
    location: null,
    guestsEstimate: null,
  });
  const [isPending, setIsPending] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  const handleSubmit = async (guestsEstimate: GuestsEstimate | null) => {
    setIsPending(true);

    const formData = new FormData();
    if (data.brideName) formData.set('brideName', data.brideName);
    if (data.groomName) formData.set('groomName', data.groomName);
    formData.set('eventDate', data.eventDate);
    if (data.location) formData.set('location', JSON.stringify(data.location));
    if (guestsEstimate) formData.set('guestsEstimate', guestsEstimate);

    const promise = createOnboardingEvent(formData).then((result) => {
      if (!result.success)
        throw new Error(result.message || 'Failed to create event.');
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.creating'),
      success: (result) => {
        setCreatedEventId(result.eventId ?? null);
        setStep('success');
        return result.message || t('toast.created');
      },
      error: (err) =>
        err instanceof Error ? err.message : t('toast.error'),
    });

    try {
      await promise;
    } catch {
      // error handled by toast
    } finally {
      setIsPending(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
          {/* Success graphic */}
          <div className="relative flex size-52 items-center justify-center">
            {/* Outermost ring */}
            <div className="border-primary/20 absolute inset-0 rounded-full border" />
            {/* Middle ring */}
            <div className="border-primary/30 absolute inset-0 m-auto size-40 rounded-full border" />
            {/* Inner ring */}
            <div className="border-primary/50 absolute inset-0 m-auto size-28 rounded-full border" />
            {/* Center circle with icon */}
            <div className="bg-card border-primary relative z-10 flex size-16 items-center justify-center rounded-full border shadow-sm">
              <IconConfetti size={28} className="text-primary" />
            </div>

            {/* Floating decorative elements */}
            <span className="text-primary absolute -top-3 right-4 [animation:float_3s_ease-in-out_infinite] text-sm [animation-delay:0s]">
              ★
            </span>
            <span className="text-primary absolute top-1/4 -right-7 [animation:float_3s_ease-in-out_infinite] text-sm [animation-delay:0.5s]">
              ♥
            </span>
            <span className="text-primary absolute -right-2 bottom-4 [animation:float_3s_ease-in-out_infinite] text-xs [animation-delay:1s]">
              •
            </span>
            <span className="text-primary absolute -bottom-2 left-2 [animation:float_3s_ease-in-out_infinite] text-xs [animation-delay:1.5s]">
              •
            </span>
            <span className="text-primary absolute top-1/2 -left-7 [animation:float_3s_ease-in-out_infinite] text-sm [animation-delay:2s]">
              ♥
            </span>
            <span className="text-primary absolute -top-2 left-4 [animation:float_3s_ease-in-out_infinite] text-sm [animation-delay:2.5s]">
              ★
            </span>
          </div>

          <div className="flex w-full -translate-y-[50px] flex-col items-center gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold">{t('success.title')}</h1>
              <p className="text-muted-foreground max-w-xs text-base">
                {t('success.description')}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                onClick={() => router.push(`/app/${createdEventId}/dashboard`)}
                className="w-full gap-2"
              >
                {t('success.goToDashboard')} <IconArrowRight size={16} className="rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/app/${createdEventId}/details`)}
                className="w-full"
              >
                {t('success.viewDetails')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="bg-card border-border mx-auto w-full max-w-sm rounded-lg border p-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            {step !== 1 && (
              <button
                onClick={() =>
                  setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : s) as WizardStep)
                }
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
              >
                <IconArrowLeft size={14} /> {t('back')}
              </button>
            )}
            <span
              className={cn(
                'text-primary text-xs font-semibold tracking-widest',
                step === 1 && 'ml-auto',
              )}
            >
              {t('stepOf', { step })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-1 text-xl font-bold">{t('step1.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('step1.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step1.brideLabel')}
                </label>
                <Input
                  placeholder={t('step1.bridePlaceholder')}
                  value={data.brideName}
                  onChange={(e) =>
                    setData((d) => ({ ...d, brideName: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step1.groomLabel')}
                </label>
                <Input
                  placeholder={t('step1.groomPlaceholder')}
                  value={data.groomName}
                  onChange={(e) =>
                    setData((d) => ({ ...d, groomName: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Feature callout */}
            <div className="bg-accent border-border flex items-start gap-3 border p-4">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center text-sm">
                ✨
              </div>
              <div>
                <p className="text-xs font-semibold">{t('step1.featureTitle')}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t('step1.featureDescription')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => setStep(2)} className="w-full">
                {t('step1.continue')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-muted-foreground w-full"
              >
                {t('step1.skip')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-1 text-xl font-bold">{t('step2.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('step2.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step2.dateLabel')} <span className="text-destructive">*</span>
                </label>
                <DatePicker
                  date={
                    data.eventDate
                      ? new Date(data.eventDate + 'T00:00:00')
                      : undefined
                  }
                  onDateChange={(date) =>
                    setData((d) => ({
                      ...d,
                      eventDate: date ? format(date, 'yyyy-MM-dd') : '',
                    }))
                  }
                  placeholder={t('step2.datePlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step2.venueLabel')}
                </label>
                <LocationInput
                  value={data.location?.name || ''}
                  onChange={(value, _placeId, coords) => {
                    setData((d) => ({
                      ...d,
                      location: value ? { name: value, coords } : null,
                    }));
                  }}
                  placeholder={t('step2.venuePlaceholder')}
                />
                <p className="text-muted-foreground text-xs">
                  {t('step2.venueHelper')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setStep(3)}
                disabled={!data.eventDate}
                className="w-full"
              >
                {t('step2.continue')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-muted-foreground w-full"
              >
                {t('step2.goBack')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-1 text-xl font-bold">{t('step3.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('step3.description')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {GUEST_OPTION_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      guestsEstimate:
                        d.guestsEstimate === value ? null : value,
                    }))
                  }
                  className={cn(
                    'rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors',
                    data.guestsEstimate === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground hover:border-primary/40',
                  )}
                >
                  {t(`step3.guestOptions.${value}`)}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleSubmit(data.guestsEstimate)}
                disabled={isPending}
                className="w-full"
              >
                {t('step3.create')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleSubmit(null)}
                disabled={isPending}
                className="text-muted-foreground w-full"
              >
                {t('step3.skip')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
