import { Eye } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { startImpersonation } from '../actions/impersonation';

/**
 * Drops the Operator into the Owner app as this event's owner, which is the
 * fastest way to answer "what is the couple actually looking at". The session
 * is read-only and `ImpersonationBanner` carries the way back out.
 *
 * A plain form rather than a client component: the same shape the banner's Exit
 * already uses, and it keeps the top bar free of client JavaScript.
 */
export function ImpersonateOwnerButton({
  ownerId,
  ownerName,
  label = 'View as owner',
}: {
  ownerId: string;
  ownerName: string;
  /** "View as owner" on the event workspace; the Users sheet says "View as user" instead. */
  label?: string;
}) {
  return (
    <form action={startImpersonation.bind(null, ownerId)}>
      <Button type="submit" variant="outline" size="sm" title={`Open the app as ${ownerName}`}>
        <Eye className="size-3.5" />
        {label}
      </Button>
    </form>
  );
}
