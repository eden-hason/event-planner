import { IconInfoCircle, type Icon } from '@tabler/icons-react';

import { cn } from '@/lib/utils';

type Tone = 'warning' | 'info' | 'success';

const TONE: Record<Tone, { box: string; chip: string; text: string }> = {
  warning: {
    box: 'bg-warning-tint border-warning-tint-border',
    chip: 'bg-warning-solid text-warning-foreground',
    text: 'text-warning-strong',
  },
  info: {
    box: 'bg-info-tint border-info-tint-border',
    chip: 'bg-info-solid text-white',
    text: 'text-info-strong',
  },
  success: {
    box: 'bg-rsvp-confirmed-tint border-rsvp-confirmed/30',
    chip: 'bg-rsvp-confirmed text-white',
    text: 'text-rsvp-confirmed-strong',
  },
};

/**
 * The one line a Schedule says about itself at the top of its pane: locked,
 * being worked, finished. An icon chip, a bold title and the sentence under it.
 * The tone says which kind of news it is; the words say the news.
 */
export function NoticeBanner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: Tone;
  icon: Icon;
  title: string;
  children: React.ReactNode;
}) {
  const styles = TONE[tone];

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5', styles.box)}>
      <span
        aria-hidden
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          styles.chip,
        )}
      >
        <Icon size={15} stroke={2.2} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn('text-sm font-bold', styles.text)}>{title}</p>
        <p className={cn('text-xs leading-relaxed', styles.text)}>{children}</p>
      </div>
    </div>
  );
}

/**
 * A quiet explanatory note, for the things a person would otherwise wonder
 * about ("who makes these calls?") and that need no action.
 */
export function ServiceNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-info-tint border-info-tint-border text-info-strong flex items-start gap-2.5 rounded-[14px] border p-3',
        className,
      )}
    >
      <IconInfoCircle size={16} className="mt-0.5 shrink-0" />
      <p className="text-[12.5px] leading-relaxed">{children}</p>
    </div>
  );
}
