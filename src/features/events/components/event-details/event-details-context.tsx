'use client';

import * as React from 'react';
import type { NavHref } from '@/components/layout/nav-urls';
import type { EventTypeKey } from '../../schemas';
import type { ChangeKey } from '../../utils/event-details-form';

/** The anchor id of each section on the page. */
export const SECTION_IDS = {
  hosts: 'event-details-hosts',
  when: 'event-details-when',
  where: 'event-details-where',
  invitation: 'event-details-invitation',
  experience: 'event-details-experience',
} as const;

/** How much of the outreach plan a date change would leave behind. */
export interface DateChangeImpact {
  messageCount: number;
  includesEventReminder: boolean;
}

interface EventDetailsContextValue {
  eventId: string;
  eventType: EventTypeKey | undefined;
  /** Wedding and henna are hosted by two people; the mitzvas by one. */
  couple: boolean;
  /** A bat mitzva takes the feminine Hebrew copy, which matters. */
  female: boolean;
  /** Only a wedding has a chuppah, so only a wedding has a second time. */
  hasCeremony: boolean;
  /** The date as it is stored, so a pending change can be described against it. */
  savedEventDate: string | null;
  plan: DateChangeImpact;
  schedulesHref: NavHref;
  isSaving: boolean;
  /**
   * Saves just the named changes. Lets a focused editor (the names drawer)
   * commit its own fields without pushing whatever else is half-edited on the
   * page, and resolves `false` when the write did not land.
   */
  save: (keys: readonly ChangeKey[]) => Promise<boolean>;
  /** Reverts the named changes to their last-saved values. */
  revert: (keys: readonly ChangeKey[]) => void;
}

const EventDetailsContext = React.createContext<EventDetailsContextValue | null>(
  null,
);

export function EventDetailsProvider({
  value,
  children,
}: {
  value: EventDetailsContextValue;
  children: React.ReactNode;
}) {
  return (
    <EventDetailsContext.Provider value={value}>
      {children}
    </EventDetailsContext.Provider>
  );
}

export function useEventDetails() {
  const context = React.useContext(EventDetailsContext);
  if (!context) {
    throw new Error('useEventDetails must be used within an EventDetailsProvider');
  }
  return context;
}
