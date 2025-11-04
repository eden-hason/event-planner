'use client';

import * as React from 'react';
import { useActionState, startTransition } from 'react';
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import { Card, CardContent } from '@/components/ui/card';
import {
  updateOnboardingStep,
  type OnboardingStep,
} from '@/app/actions/onboarding';
import { ProfileStep } from '@/components/onboarding/profile-step';
import { EventStep } from '@/components/onboarding/event-step';
import { PricingStep } from '@/components/onboarding/pricing-step';
import { OnboardingFormData } from '@/lib/schemas/onboarding';

const steps = [
  {
    value: 'profile',
    title: 'Personal Details',
    description: `Let's get to know you!`,
  },
  {
    value: 'event',
    title: 'Event Details',
    description: 'Set up your event details',
  },
  {
    value: 'pricing',
    title: 'Pricing Options',
    description: 'Select your preferred pricing plan',
  },
];

interface OnboardingFormProps {
  initialData?: Partial<OnboardingFormData>;
}

export function OnboardingForm({ initialData }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = React.useState('profile');
  const [formData, setFormData] = React.useState<Partial<OnboardingFormData>>(
    initialData || {},
  );

  // Update formData when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const [stepState, stepAction, isStepPending] = useActionState(
    updateOnboardingStep,
    null,
  );

  // Navigate to a specific step (used by server-controlled navigation)
  const navigateToStep = React.useCallback((nextStep: OnboardingStep) => {
    setCurrentStep(nextStep);
  }, []);

  // Track previous nextStep value to detect transitions
  const prevNextStepRef = React.useRef<OnboardingStep | null | undefined>(
    undefined,
  );

  // Reset tracking when step changes manually
  React.useEffect(() => {
    prevNextStepRef.current = undefined;
  }, [currentStep]);

  // Automatically advance to next step when server action returns nextStep
  React.useEffect(() => {
    const nextStep = stepState?.nextStep;
    const prevNextStep = prevNextStepRef.current;
    const isSuccess = stepState?.success === true;

    // Only advance if:
    // 1. Submission was successful
    // 2. nextStep is available and not null
    // 3. nextStep has changed (new response received)
    // 4. Not currently pending (avoid race conditions)
    if (
      isSuccess &&
      nextStep !== null &&
      nextStep !== undefined &&
      nextStep !== prevNextStep &&
      !isStepPending
    ) {
      navigateToStep(nextStep);
    }

    // Update ref to track the current nextStep value
    if (nextStep !== undefined) {
      prevNextStepRef.current = nextStep;
    }
  }, [
    stepState?.nextStep,
    stepState?.success,
    isStepPending,
    navigateToStep,
  ]);

  const handlePrevious = () => {
    const currentIndex = steps.findIndex((step) => step.value === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].value);
    }
  };

  const handleStepChange = (value: string) => {
    setCurrentStep(value);
  };

  const handleStepSubmit = (stepData: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));

    const formDataObj = new FormData();
    formDataObj.append('step', currentStep);

    // Add step-specific data to form data
    Object.entries(stepData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formDataObj.append(key, JSON.stringify(value));
        } else if (value instanceof Date) {
          formDataObj.append(key, value.toISOString());
        } else if (typeof value === 'object') {
          // Handle objects (like file metadata)
          formDataObj.append(key, JSON.stringify(value));
        } else {
          formDataObj.append(key, String(value));
        }
      }
    });

    startTransition(() => {
      stepAction(formDataObj);
    });
  };

  const isLoading = isStepPending;

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="p-0">
        <div className="space-y-6">
          <Stepper
            orientation="vertical"
            value={currentStep}
            onValueChange={handleStepChange}
            className="w-full gap-16"
          >
            <StepperList className="flex flex-col gap-10">
              {steps.map((step) => (
                <StepperItem key={step.value} value={step.value}>
                  <StepperTrigger>
                    <StepperIndicator />
                    <div className="flex flex-col gap-1">
                      <StepperTitle>{step.title}</StepperTitle>
                      <StepperDescription>
                        {step.description}
                      </StepperDescription>
                    </div>
                  </StepperTrigger>
                </StepperItem>
              ))}
            </StepperList>
            {steps.map((step) => (
              <StepperContent
                key={step.value}
                value={step.value}
                className="flex flex-col items-center gap-4 rounded-md bg-card text-card-foreground"
              >
                <div className=" w-full gap-2 mb-6">
                  <h3 className="font-semibold text-xl">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                {step.value === 'profile' && (
                  <ProfileStep
                    data={formData}
                    onSubmit={handleStepSubmit}
                    isLoading={isLoading}
                  />
                )}

                {step.value === 'event' && (
                  <EventStep
                    data={formData}
                    onSubmit={handleStepSubmit}
                    onPrevious={handlePrevious}
                    isLoading={isLoading}
                  />
                )}

                {step.value === 'pricing' && (
                  <PricingStep
                    data={formData}
                    onSubmit={handleStepSubmit}
                    onPrevious={handlePrevious}
                    isLoading={isLoading}
                  />
                )}
              </StepperContent>
            ))}
          </Stepper>
        </div>
      </CardContent>
    </Card>
  );
}
