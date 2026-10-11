'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Runs a Back Office Server Action that answers `{ success, message }`: toasts
 * the message, and on success calls `onDone` (close the dialog) and refreshes.
 */
export function useControlAction(onDone: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onDone();
      router.refresh();
    });
  }
  return { pending, run };
}
