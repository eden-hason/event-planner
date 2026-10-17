import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPhone } from '@/lib/phone';
import {
  OWNER_MESSAGE_KINDS,
  OWNER_MESSAGE_KIND_LABELS,
  OWNER_MESSAGE_STATUS_LABELS,
  type OwnerMessageRow,
  type OwnerMessageStatus,
} from '@/features/owner-messages';
import { getEventOwnerMessages } from '../queries/owner-messages';
import { formatDateTime } from '../utils/format';
import { Band, BandRow } from './band';
import { BandFailure } from './event-workspace';
import { SendOwnerMessageButton } from './send-owner-message-button';

const TITLE = 'הודעות לבעלי האירוע';

const WENT_OUT: ReadonlySet<OwnerMessageStatus> = new Set(['accepted', 'delivered', 'read', 'unknown']);

function statusVariant(status: OwnerMessageStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive';
  if (status === 'expired' || status === 'unknown') return 'outline';
  if (status === 'delivered' || status === 'read') return 'default';
  return 'secondary';
}

/**
 * Owner Messages (ADR 0039): what Kululu sent the Event's creator, and "send
 * now" for each kind. A failed or expired message shows here and nowhere else -
 * it is not a Signal.
 */
export async function EventOwnerMessagesBand({ eventId }: { eventId: string }) {
  let rows: OwnerMessageRow[];
  try {
    rows = await getEventOwnerMessages(eventId);
  } catch (error) {
    console.error('Owner messages failed:', error);
    return <BandFailure title={TITLE} />;
  }

  return (
    <Band
      title={TITLE}
      action={
        <div className="flex shrink-0 gap-2">
          {OWNER_MESSAGE_KINDS.map((kind) => (
            <SendOwnerMessageButton
              key={kind}
              eventId={eventId}
              kind={kind}
              alreadySent={rows.some((row) => row.kind === kind && WENT_OUT.has(row.status))}
            />
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <BandRow>
          <p className="text-[13.5px] font-medium">עוד לא נשלחה הודעה</p>
          <p className="text-muted-foreground text-[12.5px]">
            ברוכים הבאים יוצאת בתשלום הראשון, ואחרי האירוע ב-18:00 ביום שאחריו
          </p>
        </BandRow>
      ) : (
        <BandRow className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">הודעה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>מתי</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead className="pe-4">פרטים</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="ps-4">
                    {OWNER_MESSAGE_KIND_LABELS[row.kind]}
                    {row.manual && <span className="text-muted-foreground ms-1.5 text-[12px]">ידנית</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{OWNER_MESSAGE_STATUS_LABELS[row.status]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateTime(row.status === 'expired' ? row.dueAt : row.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums" dir="ltr">
                    {row.phoneNumber ? formatPhone(row.phoneNumber) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-64 pe-4">
                    <span className="block truncate text-[12.5px]" title={row.errorMessage ?? undefined}>
                      {row.errorMessage ?? '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </BandRow>
      )}
    </Band>
  );
}
