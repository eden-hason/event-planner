'use client';

import * as React from 'react';

import {
  EventBillingStatusSheet,
  useEventBillingStatus,
} from '@/features/billing';
import { useCollaboration } from '@/components/feature-layout';

/**
 * Opening the one sheet that explains the plan.
 *
 * Every billing surface on this page - the timeline's upsell banner, the
 * locked Schedule's notice - has to answer the same question the same way, and
 * checkout is a conversation rather than a button, so there is exactly one
 * place that conversation starts. Each of them needs the same four things:
 * the status, whether the viewer is the one who would pay, an open flag, and
 * the sheet itself.
 *
 * `canPrompt` is false for a viewer with no billing decision to make (a
 * collaborator) or before the provider has supplied a status; callers render
 * their action only when it is true.
 */
export function useBillingSheet() {
  const status = useEventBillingStatus();
  const { isOwner } = useCollaboration();
  const [open, setOpen] = React.useState(false);

  const sheet = status ? (
    <EventBillingStatusSheet open={open} onOpenChange={setOpen} status={status} />
  ) : null;

  return {
    canPrompt: Boolean(status) && isOwner,
    openSheet: React.useCallback(() => setOpen(true), []),
    sheet,
  };
}
