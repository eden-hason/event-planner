'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const STEP_COUNT = 4;

interface ImportWizardShellProps {
  /** 0-indexed: upload, analyze, validate, summary. */
  stepIndex: number;
  /** The first two step names, when the source is not a file (e.g. WhatsApp's connect, choose). */
  leadingStepLabels?: [string, string];
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * The takeover chrome shared by every step of the mobile import wizard: a
 * back arrow, the step title, a 4-segment progress bar, and a scrolling body
 * with an optional sticky footer. Mirrors the shell `PageCard` renders for
 * every other page, but this route opts out of that chrome entirely (see
 * `isGuestImportRoute`) because the flow needs the whole viewport and its own
 * back semantics across four steps, not a page inside the app shell.
 */
export function ImportWizardShell({
  stepIndex,
  leadingStepLabels,
  onBack,
  children,
}: ImportWizardShellProps) {
  const t = useTranslations('guests.import');
  const tMobile = useTranslations('guests.import.mobile.header');

  const stepLabels = [
    ...(leadingStepLabels ?? [t('stepUpload'), t('stepAnalyze')]),
    t('stepValidate'),
    t('stepSummary'),
  ];

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <div className="bg-card flex shrink-0 flex-col gap-3 border-b px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label={tMobile('back')}
            className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
          >
            <ChevronLeft className="size-[18px] rtl:rotate-180" />
          </button>
          <span className="flex-1 truncate text-lg font-bold">{t('title')}</span>
          <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
            {tMobile('stepOf', { step: stepIndex + 1, total: STEP_COUNT })}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex flex-col gap-1">
              <span
                className={cn(
                  'h-1 rounded-full transition-colors duration-300',
                  i <= stepIndex ? 'bg-primary' : 'bg-border',
                )}
              />
              <span
                className={cn(
                  'truncate text-[11px] transition-colors duration-300',
                  i === stepIndex
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/*
        Each step fills this and owns its own scroll region - most are one
        scrollable panel, but validate and summary also pin a footer to the
        bottom, which only works if this wrapper isn't scrollable itself.
        The stepper above stays full width; on a wide screen the steps sit in
        a centered column instead of stretching edge to edge. `overflow-x-clip`
        (not `hidden`, which would make this a scroll container) keeps a step
        sliding in from the side from flashing a horizontal scrollbar.
      */}
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </div>
  );
}
