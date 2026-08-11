import { getTranslations } from 'next-intl/server';
import {
  IconCheck,
  IconPhone,
  IconPhoneOff,
  IconX,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
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

function StatChip({
  icon,
  label,
  value,
  hint,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  /** Secondary line - e.g. the headcount behind a count of guest records */
  hint?: string;
  colorClass: string;
}) {
  return (
    <div className="bg-muted/50 flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-2.5">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', colorClass)}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-foreground text-xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-muted-foreground text-[11px] tabular-nums">{hint}</span>}
    </div>
  );
}

export async function CallRoundResultsCard({ round }: { round: CallRoundSummary }) {
  const t = await getTranslations('calls');
  const results = await getCallRoundResults(round.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconPhone size={16} className="text-primary" />
          </div>
          {t('round', { number: round.roundNumber })}
        </CardTitle>
        <CardDescription>
          {round.status === 'completed' && round.completedAt
            ? t('completedOn', { date: new Date(round.completedAt).toLocaleDateString() })
            : t('startedOn', { date: new Date(round.createdAt).toLocaleDateString() })}
        </CardDescription>
        <CardAction>
          <RefreshButton label={t('refresh')} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex gap-2">
          <StatChip
            icon={<IconCheck size={13} strokeWidth={2.5} />}
            label={t('stats.confirmed')}
            value={results.summary.confirmed}
            hint={t('stats.confirmedGuests', { count: results.summary.confirmedGuests })}
            colorClass="text-green-600"
          />
          <StatChip
            icon={<IconX size={13} strokeWidth={2.5} />}
            label={t('stats.declined')}
            value={results.summary.declined}
            colorClass="text-red-500"
          />
          <StatChip
            icon={<IconPhoneOff size={13} strokeWidth={2.5} />}
            label={t('stats.noAnswer')}
            value={results.summary.noAnswer}
            colorClass="text-amber-600"
          />
        </div>
        <CallRoundResultsTable
          guests={results.guests}
          labels={{
            columnGuest: t('table.guest'),
            columnOutcome: t('table.outcome'),
            columnRsvp: t('table.rsvp'),
            columnAmount: t('table.amount'),
            outcomeConfirmed: t('outcome.confirmed'),
            outcomeDeclined: t('outcome.declined'),
            outcomeNoAnswer: t('outcome.noAnswer'),
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
