'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  IconArrowRight,
  IconConfetti,
  IconHeart,
  IconFlame,
  IconStar,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationInput } from '@/components/ui/location-input';
import { createOnboardingEvent } from '@/features/events/actions';
import { PricingStep } from './pricing-step';
import type { LocationCoords } from '@/components/ui/google-map';
import type { EventType } from '@/features/events/utils/event-types';
import { cn } from '@/lib/utils';

type WizardStep = 1 | 2 | 3 | 4 | 'success';

interface WizardData {
  eventType: EventType | null;
  brideName: string;
  groomName: string;
  childName: string;
  eventDate: string;
  location: { name: string; coords?: LocationCoords } | null;
}

interface OnboardingWizardProps {
  showPricingStep: boolean;
}

const EVENT_TYPE_OPTIONS: {
  value: EventType;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  labelKey: 'wedding' | 'henna' | 'barMitzva' | 'batMitzva';
}[] = [
  { value: 'wedding', icon: IconHeart, labelKey: 'wedding' },
  { value: 'henna', icon: IconFlame, labelKey: 'henna' },
  { value: 'bar_mitzva', icon: IconStar, labelKey: 'barMitzva' },
  { value: 'bat_mitzva', icon: IconSparkles, labelKey: 'batMitzva' },
];

export function OnboardingWizard({ showPricingStep }: OnboardingWizardProps) {
  const router = useRouter();
  const t = useTranslations('newEvent');
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>({
    eventType: null,
    brideName: '',
    groomName: '',
    childName: '',
    eventDate: '',
    location: null,
  });
  const [isPending, setIsPending] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const totalSteps = showPricingStep ? 4 : 3;

  const getProgress = () => {
    if (showPricingStep) {
      return step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;
    }
    return step === 1 ? 33 : step === 2 ? 66 : 100;
  };

  const isCoupleEvent =
    data.eventType === 'wedding' || data.eventType === 'henna';

  const handleSubmit = async (planId?: string) => {
    setIsPending(true);

    const formData = new FormData();
    if (data.eventType) formData.set('eventType', data.eventType);
    if (isCoupleEvent) {
      if (data.brideName) formData.set('brideName', data.brideName);
      if (data.groomName) formData.set('groomName', data.groomName);
    } else {
      if (data.childName) formData.set('childName', data.childName);
    }
    formData.set('eventDate', data.eventDate);
    if (data.location) formData.set('location', JSON.stringify(data.location));
    if (planId) formData.set('pricingPlan', planId);

    const promise = createOnboardingEvent(formData).then((result) => {
      if (!result.success)
        throw new Error(result.message || t('toast.failed'));
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
          <div className="relative flex size-52 items-center justify-center">
            <div className="border-primary/20 absolute inset-0 rounded-full border" />
            <div className="border-primary/30 absolute inset-0 m-auto size-40 rounded-full border" />
            <div className="border-primary/50 absolute inset-0 m-auto size-28 rounded-full border" />
            <div className="bg-card border-primary relative z-10 flex size-16 items-center justify-center rounded-full border shadow-sm">
              <IconConfetti size={28} className="text-primary" />
            </div>
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
                {t('success.goToDashboard')}{' '}
                <IconArrowRight size={16} className="rtl:rotate-180" />
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
          <div className="mb-2 flex items-center justify-end">
            <span className="text-primary text-xs font-semibold tracking-widest">
              {t('stepOf', { step, total: totalSteps })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Event type selection */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="[animation:slide-up_0.35s_ease_both]">
              <h2 className="mb-1 text-xl font-bold">{t('step1.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('step1.description')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 [animation:slide-up_0.35s_ease_both] [animation-delay:60ms]">
              {EVENT_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
                const isSelected = data.eventType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        eventType: value,
                        brideName: '',
                        groomName: '',
                        childName: '',
                      }))
                    }
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all duration-150',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent',
                    )}
                  >
                    <Icon
                      size={28}
                      className={
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {t(`step1.${labelKey}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!data.eventType}
              className="w-full [animation:slide-up_0.35s_ease_both] [animation-delay:120ms]"
            >
              {t('step1.continue')}
            </Button>
          </div>
        )}

        {/* Step 2 — Names */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="[animation:slide-up_0.35s_ease_both]">
              <h2 className="mb-1 text-xl font-bold">{t('step2.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t(isCoupleEvent ? 'step2.description' : 'step2.descriptionChild')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {isCoupleEvent ? (
                <>
                  <div className="flex flex-col gap-1.5 [animation:slide-up_0.35s_ease_both] [animation-delay:60ms]">
                    <label className="text-muted-foreground text-xs font-medium">
                      {t('step2.brideLabel')}{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder={t('step2.bridePlaceholder')}
                      value={data.brideName}
                      onChange={(e) =>
                        setData((d) => ({ ...d, brideName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 [animation:slide-up_0.35s_ease_both] [animation-delay:120ms]">
                    <label className="text-muted-foreground text-xs font-medium">
                      {t('step2.groomLabel')}{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder={t('step2.groomPlaceholder')}
                      value={data.groomName}
                      onChange={(e) =>
                        setData((d) => ({ ...d, groomName: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 [animation:slide-up_0.35s_ease_both] [animation-delay:60ms]">
                  <label className="text-muted-foreground text-xs font-medium">
                    {t('step2.childLabel')}{' '}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder={t('step2.childPlaceholder')}
                    value={data.childName}
                    onChange={(e) =>
                      setData((d) => ({ ...d, childName: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 [animation:slide-up_0.35s_ease_both] [animation-delay:240ms]">
              <Button
                onClick={() => setStep(3)}
                disabled={isCoupleEvent ? !data.brideName || !data.groomName : !data.childName}
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

        {/* Step 3 — Date & Venue */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="[animation:slide-up_0.35s_ease_both]">
              <h2 className="mb-1 text-xl font-bold">{t('step3.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('step3.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 [animation:slide-up_0.35s_ease_both] [animation-delay:60ms]">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step3.dateLabel')}{' '}
                  <span className="text-destructive">*</span>
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
                  placeholder={t('step3.datePlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5 [animation:slide-up_0.35s_ease_both] [animation-delay:120ms]">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('step3.venueLabel')}
                </label>
                <LocationInput
                  value={data.location?.name || ''}
                  onChange={(value, _placeId, coords) => {
                    setData((d) => ({
                      ...d,
                      location: value ? { name: value, coords } : null,
                    }));
                  }}
                  placeholder={t('step3.venuePlaceholder')}
                />
                <p className="text-muted-foreground text-xs">
                  {t('step3.venueHelper')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 [animation:slide-up_0.35s_ease_both] [animation-delay:180ms]">
              <Button
                onClick={() => (showPricingStep ? setStep(4) : handleSubmit())}
                disabled={!data.eventDate || isPending}
                className="w-full"
              >
                {t('step3.continue')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-muted-foreground w-full"
              >
                {t('step3.goBack')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Pricing (optional) */}
        {step === 4 && showPricingStep && (
          <PricingStep
            onConfirm={(planId) => handleSubmit(planId)}
            onBack={() => setStep(3)}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}
