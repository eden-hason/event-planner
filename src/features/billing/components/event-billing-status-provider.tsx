'use client';

import * as React from 'react';
import type { BillingHeaderStatus } from '../types';

type EventBillingContext = {
  status: BillingHeaderStatus;
  /** The event's title, for the messages a billing surface pre-fills. */
  eventName: string;
};

const EventBillingStatusContext = React.createContext<EventBillingContext | null>(null);

/**
 * Carries the current event's billing status down to the header pill.
 *
 * Sits in the `[eventId]` layout, which already loads the event, so the pill
 * costs no extra query. Null outside the provider - the pill renders nothing.
 */
export function EventBillingStatusProvider({
  value,
  eventName,
  children,
}: {
  value: BillingHeaderStatus;
  eventName: string;
  children: React.ReactNode;
}) {
  const context = React.useMemo(() => ({ status: value, eventName }), [value, eventName]);
  return (
    <EventBillingStatusContext.Provider value={context}>
      {children}
    </EventBillingStatusContext.Provider>
  );
}

export function useEventBillingStatus(): BillingHeaderStatus | null {
  return React.useContext(EventBillingStatusContext)?.status ?? null;
}

/** The current event's title, or an empty string outside the provider. */
export function useBillingEventName(): string {
  return React.useContext(EventBillingStatusContext)?.eventName ?? '';
}
