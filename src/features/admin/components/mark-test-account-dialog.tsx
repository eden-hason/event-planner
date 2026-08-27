'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  children,
}: {
  userId: string;
  userName: string;
  isTestAccount: boolean;
  children: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
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
      router.refresh();
    });
  }

  return (
    <>
      {children(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
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
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {isTestAccount ? 'Remove the mark' : 'Mark as test account'}
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
