'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { Button } from '@/components/ui/button';
import { setUserTestAccountFlag } from '../actions/users';

/**
 * Lives in the sheet's footer, not the row - nothing this consequential sits
 * under a stray click. Marking and unmarking share one dialog because they
 * are the same act in both directions: a confirm that names, in plain words,
 * every count in the Back Office the flag controls. See the brief section 8.
 */
export function MarkTestAccountDialog({
  userId,
  userName,
  isTestAccount,
  testAccountsVisible,
  children,
}: {
  userId: string;
  userName: string;
  isTestAccount: boolean;
  /**
   * Whether the global toggle is currently showing flagged accounts. Only used
   * for the confirm copy: marking a User while it is off takes them out of the
   * directory the Operator is standing in, and the dialog is the last place
   * that can say so before it happens.
   */
  testAccountsVisible: boolean;
  children: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await setUserTestAccountFlag(userId, !isTestAccount);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);

      if (result.userHidden) {
        // The flag has just taken this User out of every Back Office read, so
        // the sheet behind this dialog is open on a row that is no longer
        // there. Dropping ?user= closes it; a plain refresh would leave the
        // Operator staring at "User not found" for a User they just marked.
        // The action revalidated /admin, so this navigation re-renders the
        // directory without them rather than serving a cached table.
        const params = new URLSearchParams(searchParams.toString());
        params.delete('user');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      {children(() => setOpen(true))}
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AdminDialogContent className="sm:max-w-[428px]">
          <DialogHeader>
            <DialogTitle>
              {isTestAccount ? 'Remove test account mark?' : 'Mark as test account?'}
            </DialogTitle>
            <DialogDescription>
              {isTestAccount ? (
                <>
                  {userName} returns to every count in the Back Office, including the Overview
                  cards and the events index
                </>
              ) : (
                <>
                  {userName} will be treated as a Kululu account, not a customer. This removes
                  them from every count in the Back Office
                  {!testAccountsVisible && (
                    <>
                      , and from this directory until you switch test accounts back on
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending
                ? 'Saving'
                : isTestAccount
                  ? 'Remove the mark'
                  : 'Mark as test account'}
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
