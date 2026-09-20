import { getTranslations } from 'next-intl/server';
import { IconMessage } from '@tabler/icons-react';

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScheduleLockBadge } from './schedule-lock-badge';

interface MessageTypeCardProps {
  /** Whether this schedule's family offers a note variant at all. */
  offersNote: boolean;
  /** Why the choice cannot be changed, or null when it simply cannot yet. */
  lockReason: 'locked' | 'sent' | null;
}

/**
 * Which message this Schedule sends.
 *
 * Today there is exactly one answer. `schedules.template_id` names a *family*
 * (key + channel + variant + language) and the resolver picks the row inside it
 * from the Event's configuration - table numbers, gifting, note, follow-up,
 * invitation image - so the organiser never chooses a row. What they could
 * choose is a *variant*: a different editorial take on the same message. Each
 * one needs its own Meta-approved template for every combination of those
 * axes, and only one variant per schedule type is authored.
 *
 * So this renders the single real option, labelled as the default, rather than
 * a picker that implies alternatives that do not exist. The list is built to
 * grow: when a second variant is approved, this becomes a real choice without
 * the surrounding layout changing.
 */
export async function MessageTypeCard({
  offersNote,
  lockReason,
}: MessageTypeCardProps) {
  const t = await getTranslations('schedules.messageType');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconMessage size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
        {lockReason && (
          <CardAction>
            <ScheduleLockBadge reason={lockReason} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label={t('cardTitle')}>
          {/* One option, and it is always the chosen one - so it is a checked,
              disabled radio rather than a group with nothing selectable in it.
              When a second Variant is approved this becomes a real choice
              without the surrounding markup changing. */}
          <div
            role="radio"
            aria-checked
            aria-disabled
            className="border-primary bg-primary/5 flex items-start gap-2.5 rounded-xl border-[1.5px] p-3"
          >
            <span
              aria-hidden
              className="border-primary mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
            >
              <span className="bg-primary size-[7px] rounded-full" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold">
                  {t('default.label')}
                </span>
                {offersNote && (
                  <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                    {t('supportsNote')}
                  </span>
                )}
              </div>
              {/* Deliberately not `message_templates.description`: that column
                  is operator-facing English for the Back Office, and it would
                  surface untranslated on a Hebrew page. */}
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t('default.description')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
