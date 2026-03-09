'use client';

import { useState } from 'react';
import {
  IconChevronRight,
  IconCircleCheckFilled,
  IconCircleDashed,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  actionHref: string;
}

function CircularProgress({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const strokeDashoffset = 100 - progress;

  return (
    <svg
      className="scale-y-[-1] -rotate-90"
      height="14"
      width="14"
      viewBox="0 0 14 14"
    >
      <circle
        className="stroke-muted"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
      />
      <circle
        className="stroke-primary"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray="100"
        strokeLinecap="round"
        style={{ strokeDashoffset }}
      />
    </svg>
  );
}

function StepIndicator({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <IconCircleCheckFilled
        className="text-primary mt-1 size-4.5 shrink-0"
        aria-hidden="true"
      />
    );
  }
  return (
    <IconCircleDashed
      className="stroke-muted-foreground/40 mt-1 size-5 shrink-0"
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

export function Onboarding({
  steps,
  title = 'Get started',
}: {
  steps: OnboardingStep[];
  title?: string;
}) {
  const [openStepId, setOpenStepId] = useState<string | null>(() => {
    const firstIncomplete = steps.find((s) => !s.completed);
    return firstIncomplete?.id ?? steps[0]?.id ?? null;
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const remainingCount = steps.length - completedCount;

  const handleStepClick = (stepId: string) => {
    setOpenStepId(openStepId === stepId ? null : stepId);
  };

  return (
    <div className="bg-card text-card-foreground h-full rounded-lg border p-4 shadow-xs">
      <div className="mr-2 mb-4 flex flex-col justify-between sm:flex-row sm:items-center">
        <h3 className="text-foreground ml-2 font-semibold text-balance">
          {title}
        </h3>
        <div className="mt-2 flex items-center justify-end sm:mt-0">
          <CircularProgress remaining={remainingCount} total={steps.length} />
          <div className="text-muted-foreground mr-3 ml-1.5 text-sm">
            <span className="text-foreground font-medium">
              {remainingCount}
            </span>{' '}
            out of{' '}
            <span className="text-foreground font-medium">
              {steps.length} steps
            </span>{' '}
            left
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const isOpen = openStepId === step.id;
          const isFirst = index === 0;
          const prevStep = steps[index - 1];
          const isPrevOpen = prevStep && openStepId === prevStep.id;

          const showBorderTop = !isFirst && !isOpen && !isPrevOpen;

          return (
            <div
              key={step.id}
              className={cn(
                'group',
                isOpen && 'rounded-lg',
                showBorderTop && 'border-border border-t',
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleStepClick(step.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStepClick(step.id);
                  }
                }}
                className={cn(
                  'focus-visible:ring-ring block w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  isOpen && 'rounded-lg',
                )}
              >
                <div
                  className={cn(
                    'relative overflow-hidden rounded-lg transition-colors',
                    isOpen && 'border-border bg-muted border',
                  )}
                >
                  <div className="relative flex items-center justify-between gap-3 py-3 pr-2 pl-4">
                    <div className="flex w-full gap-3">
                      <div className="shrink-0">
                        <StepIndicator completed={step.completed} />
                      </div>
                      <div className="mt-0.5 grow">
                        <h4
                          className={cn(
                            'font-semibold',
                            step.completed ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {step.title}
                        </h4>
                        <Collapsible open={isOpen}>
                          <CollapsibleContent>
                            <p className="text-muted-foreground mt-2 text-sm text-pretty sm:max-w-64 md:max-w-xs">
                              {step.description}
                            </p>
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={(e) => e.stopPropagation()}
                              asChild
                            >
                              <a href={step.actionHref}>{step.actionLabel}</a>
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                    {!isOpen && (
                      <IconChevronRight
                        className="text-muted-foreground h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
