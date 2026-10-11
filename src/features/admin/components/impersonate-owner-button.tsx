import { Eye } from '@/components/icons';
import { Button } from '@/components/ui/button';

/**
 * Drops the Operator into the Owner app as this event's owner, which is the
 * fastest way to answer "what is the couple actually looking at". The session
 * is read-only and `ImpersonationBanner` carries the way back out.
 *
 * Opens in a new tab so the Back Office stays where it was. A native form
 * posting to a route handler rather than a Server Action, because React
 * submits an action itself and ignores `target`. It also keeps the top bar
 * free of client JavaScript.
 */
export function ImpersonateOwnerButton({
  ownerId,
  ownerName,
  label = 'צפייה כבעלים',
}: {
  ownerId: string;
  ownerName: string;
  /** "צפייה כבעלים" on the event workspace; the Users sheet says "צפייה כמשתמש" instead. */
  label?: string;
}) {
  return (
    <form action="/api/admin/impersonate" method="post" target="_blank">
      <input type="hidden" name="userId" value={ownerId} />
      <Button type="submit" variant="outline" size="sm" title={`פתיחת האפליקציה בתור ${ownerName}`}>
        <Eye className="size-3.5" />
        {label}
      </Button>
    </form>
  );
}
