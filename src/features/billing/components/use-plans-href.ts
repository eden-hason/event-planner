'use client';

import { useParams } from 'next/navigation';
import { useCollaboration } from '@/components/feature-layout';
import { useEventBillingStatus } from './event-billing-status-provider';

/**
 * Where every billing surface - the header pill, the More page's plan card, the
 * schedules hero's lock card, a locked Schedule's footer - sends the Owner: the
 * plans page, the one place the plan is explained and paid for.
 *
 * Null before the provider has supplied a status, and for anyone but the
 * Event's creator, whom the page would only send home; callers then render no
 * way there.
 */
export function usePlansHref(): string | null {
  const status = useEventBillingStatus();
  const { canSeePayments } = useCollaboration();
  const { eventId } = useParams<{ eventId?: string }>();

  if (!status || !canSeePayments || !eventId) return null;
  return `/app/${eventId}/package`;
}
