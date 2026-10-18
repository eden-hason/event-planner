'use client';

import * as React from 'react';

import { EventBillingStatusSheet } from './event-billing-status-sheet';
import { useEventBillingStatus } from './event-billing-status-provider';

/**
 * Opening the one sheet that explains the plan.
 *
 * Every billing surface - the schedules hero's lock card, the locked Schedule's
 * footer - has to answer the same question the same way, and checkout is a
 * conversation rather than a button, so there is exactly one place that
 * conversation starts. Each of them needs the same four things:
 * the status, an open flag, and the sheet itself.
 *
 * `canPrompt` is false before the provider has supplied a status; callers
 * render their action only when it is true.
 */
export function useBillingSheet() {
  const status = useEventBillingStatus();
  const [open, setOpen] = React.useState(false);

  const sheet = status ? (
    <EventBillingStatusSheet open={open} onOpenChange={setOpen} status={status} />
  ) : null;

  return {
    canPrompt: Boolean(status),
    openSheet: React.useCallback(() => setOpen(true), []),
    sheet,
  };
}
