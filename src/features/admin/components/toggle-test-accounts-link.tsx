'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setTestAccountsVisible } from '../actions/test-accounts';

/**
 * The Users hidden-accounts footer flips the same global cookie as the top
 * bar's `TestAccountsToggle` - a page-local switch here would fork the state
 * two controls disagree about. Text rather than a track-and-knob because this
 * sits inline in a sentence, not in the top bar.
 */
export function ToggleTestAccountsLink({ visible }: { visible: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setTestAccountsVisible(!visible);
          router.refresh();
        })
      }
      className="text-primary decoration-primary/35 underline decoration-1 underline-offset-[3px] disabled:opacity-60"
    >
      {visible ? 'Hide them' : 'Show them'}
    </button>
  );
}
