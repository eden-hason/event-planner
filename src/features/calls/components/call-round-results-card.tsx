import { getLocale, getTranslations } from 'next-intl/server';
import {
  IconCheck,
  IconMessage,
  IconPhone,
  IconPhoneOff,
  IconX,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { StatChip } from '@/components/stat-chip';
import { callOutcomePresentation } from '../utils';
import { RefreshButton } from '@/components/refresh-button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { getCallRoundResults } from '../queries/call-rounds';
import type { CallRoundSummary } from '../types';
import { CallRoundResultsTable } from './call-round-results-table';

export async function CallRoundResultsCard({
  round,
  label,
}: {
  round: CallRoundSummary;
  /**
   * The round's name, resolved from its plan's position in the timeline. Passed
   * in rather than derived from `round_number`, which is deprecated and null on
   * anything created after 2026-08-14 - and so that the card and the nav entry
   * beside it can never disagree about what this round is called.
   */
  label: string;
}) {
  const t = await getTranslations('calls');
  const results = await getCallRoundResults(round.id);
  // Server-rendered, so the locale has to be passed explicitly - see CallPlanCard.
  const locale = await getLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  // The fourth chip only earns its place once a call actually ended this way.
  // Three chips share one row comfortably; four would have to wrap to a 2x2
  // grid on phones, so the layout follows the chip rather than the reverse.
  const hasWillUpdate = results.summary.willUpdate > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconPhone size={16} className="text-primary" />
          </div>
          {label}
        </CardTitle>
        <CardDescription>
          {round.status === 'completed' && round.completedAt
            ? t('completedOn', { date: formatDate(round.completedAt) })
            : t('startedOn', { date: formatDate(round.createdAt) })}
        </CardDescription>
        <CardAction>
          <RefreshButton label={t('refresh')} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          className={cn(
            'grid gap-2',
            hasWillUpdate ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
          )}
        >
          <StatChip
            icon={<IconCheck size={13} strokeWidth={2.5} />}
            label={t('stats.confirmed')}
            value={results.summary.confirmed}
            hint={t('stats.confirmedGuests', { count: results.summary.confirmedGuests })}
            accentClassName={callOutcomePresentation('confirmed').accent}
          />
          <StatChip
            icon={<IconX size={13} strokeWidth={2.5} />}
            label={t('stats.declined')}
            value={results.summary.declined}
            accentClassName={callOutcomePresentation('declined').accent}
          />
          <StatChip
            icon={<IconPhoneOff size={13} strokeWidth={2.5} />}
            label={t('stats.noAnswer')}
            value={results.summary.noAnswer}
            accentClassName={callOutcomePresentation('no_answer').accent}
          />
          {hasWillUpdate && (
            <StatChip
              icon={<IconMessage size={13} strokeWidth={2.5} />}
              label={t('stats.willUpdate')}
              value={results.summary.willUpdate}
              accentClassName={callOutcomePresentation('guest_will_update').accent}
            />
          )}
        </div>
        <CallRoundResultsTable
          guests={results.guests}
          labels={{
            columnGuest: t('table.guest'),
            columnOutcome: t('table.outcome'),
            columnRsvp: t('table.rsvp'),
            columnAmount: t('table.amount'),
            columnNote: t('table.note'),
            outcomeConfirmed: t('outcome.confirmed'),
            outcomeDeclined: t('outcome.declined'),
            outcomeNoAnswer: t('outcome.noAnswer'),
            outcomeWillUpdate: t('outcome.willUpdate'),
            outcomeNotCalled: t('outcome.notCalled'),
            rsvpConfirmed: t('rsvp.confirmed'),
            rsvpDeclined: t('rsvp.declined'),
            rsvpPending: t('rsvp.pending'),
          }}
        />
      </CardContent>
    </Card>
  );
}
