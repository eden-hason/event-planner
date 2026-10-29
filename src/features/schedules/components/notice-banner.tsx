import { IconInfoCircle, type Icon } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';

type Tone = 'warning' | 'info' | 'success';

const TONE: Record<Tone, { box: string; text: string }> = {
  warning: {
    box: 'bg-warning-tint border-warning-tint-border',
    text: 'text-warning-strong',
  },
  info: {
    box: 'bg-info-tint border-info-tint-border',
    text: 'text-info-strong',
  },
  success: {
    box: 'bg-rsvp-confirmed-tint border-rsvp-confirmed/30',
    text: 'text-rsvp-confirmed-strong',
  },
};

/**
 * The one line a Schedule says about itself at the top of its pane: locked,
 * being worked, finished. An icon, a title and the sentence under it.
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
    <Item size="xs"className={cn('items-start rounded-xl', styles.box)}>
      <ItemMedia aria-hidden className={styles.text}>
        <Icon size={14} stroke={2.2} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className={styles.text}>{title}</ItemTitle>
        <ItemDescription className={cn('line-clamp-none text-pretty', styles.text)}>
          {children}
        </ItemDescription>
      </ItemContent>
    </Item>
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
