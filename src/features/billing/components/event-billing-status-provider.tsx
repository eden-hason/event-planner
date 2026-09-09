'use client';

import * as React from 'react';
import type { BillingHeaderStatus } from '../types';

const EventBillingStatusContext =
  React.createContext<BillingHeaderStatus | null>(null);

/**
 * Carries the current event's billing status down to the header pill.
 *
 * Sits in the `[eventId]` layout, which already loads the event, so the pill
 * costs no extra query. Null outside the provider - the pill renders nothing.
 */
export function EventBillingStatusProvider({
  value,
  children,
}: {
  value: BillingHeaderStatus;
  children: React.ReactNode;
}) {
  return (
    <EventBillingStatusContext.Provider value={value}>
      {children}
    </EventBillingStatusContext.Provider>
  );
}

export function useEventBillingStatus(): BillingHeaderStatus | null {
  return React.useContext(EventBillingStatusContext);
}
