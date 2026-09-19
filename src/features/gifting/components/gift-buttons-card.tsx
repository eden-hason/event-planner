'use client';

import { useTranslations } from 'next-intl';
import { Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/toggle-switch';
// Deep import: the schedules barrel carries Server Actions and the send
// helpers, and this is a client component. event-config is pure.
import { GIFT_BUTTON_DEFAULTS } from '@/features/schedules/utils/event-config';

/** The messages a gift button can be added to, in the order they are sent. */
const MESSAGES = ['event_reminder', 'post_event'] as const;

type GiftButtonMessage = (typeof MESSAGES)[number];

interface GiftButtonsCardProps {
  /** What is stored; a missing key means the message's default. */
  giftButtons: Partial<Record<string, boolean>>;
  /** The message whose toggle is saving, if any. */
  pending: string | null;
  onToggle: (scheduleTypeKey: string, on: boolean) => void;
}

/**
 * Which messages carry the "שליחת מתנה" button. Shown only once a provider is
 * connected: before that there is no gifting page for the button to open, and
 * the send path drops it regardless of what is chosen here.
 */
export function GiftButtonsCard({
  giftButtons,
  pending,
  onToggle,
}: GiftButtonsCardProps) {
  const t = useTranslations('gifting.messages');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gift className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h4 className="font-semibold">{t('heading')}</h4>
            <p className="text-sm text-muted-foreground text-pretty">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <ul className="flex flex-col divide-y rounded-lg border">
          {MESSAGES.map((key: GiftButtonMessage) => {
            const on = giftButtons[key] ?? GIFT_BUTTON_DEFAULTS[key] ?? false;
            const id = `gift-button-${key}`;
            return (
              <li key={key} className="flex items-center justify-between gap-4 p-4">
                <label htmlFor={id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{t(`${key}.label`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`${key}.description`)}
                  </span>
                </label>
                <Switch
                  id={id}
                  checked={on}
                  disabled={pending !== null}
                  onCheckedChange={(checked) => onToggle(key, checked)}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
