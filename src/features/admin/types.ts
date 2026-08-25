/**
 * Back Office view models. Vocabulary is defined in CONTEXT.md - in particular
 * Signal, Operator and the Guest Record / Guest distinction.
 */

export type OverviewCounts = {
  users: number;
  /** Published events only. Draft Events are interest, not events. */
  events: number;
  /** Guest Records: one row per guest list entry, the billable unit. */
  guestRecords: number;
};

export type SignalKind = 'overdue_schedule' | 'failed_delivery' | 'stale_call_round';

/**
 * A condition derived at read time that an Operator should look at. Never
 * stored: there is no signals table and nothing to dismiss. A Signal exists
 * exactly as long as the condition producing it is true.
 */
export type Signal = {
  /** `${kind}:${sourceRowId}`. A React key only - never persist it or route on it. */
  id: string;
  kind: SignalKind;
  eventId: string;
  eventTitle: string;
  /** What is wrong, in one line */
  headline: string;
  /** The supporting fact */
  detail: string;
  /** When the condition began. Drives sort order and the age label. */
  occurredAt: string;
  /** Where the Operator goes to act on it */
  href: string;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventTypeName: string;
  ownerName: string;
  guestRecords: number;
  confirmed: number;
  /** 0-1, or null when there is no guest list yet. Never render null as 0%. */
  confirmationRate: number | null;
};

/**
 * One hit in the header search. Carries the owner because an Operator searching
 * "noa" is looking for a couple, not a title, and needs to see which event is
 * theirs before clicking.
 */
export type EventSearchResult = {
  id: string;
  title: string;
  eventDate: string | null;
  /** Draft Events are reachable by search but never counted. See CONTEXT.md. */
  isDraft: boolean;
  ownerName: string;
  ownerEmail: string | null;
};

export type EventsIndexStatus = 'all' | 'published' | 'draft';

export type EventsIndexFilters = {
  q: string;
  status: EventsIndexStatus;
  needsSetup: boolean;
  page: number;
};

export type EventIndexRow = {
  id: string;
  title: string;
  status: 'published' | 'draft';
  eventDate: string | null;
  eventTypeName: string;
  ownerName: string;
  ownerEmail: string | null;
  guestRecords: number;
  actualGuests: number;
  confirmedRecords: number;
  confirmationRate: number | null;
  setupReason: string | null;
  onboardingStep: string | null;
  messageSchedules: number;
  callPlans: number;
};

export type EventsIndexPage = {
  rows: EventIndexRow[];
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: {
    publishedEvents: number;
    draftEvents: number;
    guestRecords: number;
    actualGuests: number;
  };
};

export type EventIdentity = {
  id: string;
  title: string;
  status: 'published' | 'draft';
  eventTypeName: string;
  eventDate: string | null;
  daysFromToday: number | null;
  locationName: string | null;
  ceremonyTime: string | null;
  receptionTime: string | null;
  shortCode: string;
  canCreateSchedules: boolean;
  onboardingStep: string | null;
  createdAt: string;
  /** The account the event belongs to - the identity an Operator impersonates. */
  ownerId: string;
  owner: { name: string; email: string | null; phone: string | null };
  collaborators: { id: string; name: string; email: string | null; role: string }[];
  hostNames: string[];
};

export type EventRouteState = {
  status: 'published' | 'draft';
  canCreateSchedules: boolean;
};

export type EventGuestSummary = {
  guestRecords: number;
  actualGuests: number;
  groups: number;
  offlineRecords: number;
  confirmed: number;
  declined: number;
  pending: number;
  provenance: { label: string; confirmed: number; declined: number; total: number }[];
  unusablePhones: { id: string; name: string; groupName: string | null; phone: string | null }[];
};

export type EventWorkspaceSignal = {
  id: string;
  kind: SignalKind;
  headline: string;
  detail: string;
  href: string;
};

export type EventTimelineDelivery = {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  status: string;
  errorMessage: string | null;
  errorCode: number | null;
  createdAt: string;
  sentAt: string | null;
  triggeredBy: string | null;
};

export type EventTimelineRow = {
  id: string;
  kind: 'message' | 'call';
  title: string;
  status: 'planned' | 'sent' | 'cancelled' | 'in_progress' | 'completed';
  scheduledDate: string;
  scheduledTime: string | null;
  sentAt: string | null;
  targetStatus: string | null;
  channel: string | null;
  audienceCount: number;
  roundId: string | null;
  roundStartedAt: string | null;
  roundCompletedAt: string | null;
  calledCount: number;
  roundGuestCount: number;
  notesCount: number;
  deliveries: EventTimelineDelivery[];
};

/**
 * One item of planned work in the Operations queue. A call plan and a message
 * schedule are the same row shape deliberately: they are both `schedules` rows
 * with `status IS NULL`, and the queue's job is to show them in one chronology.
 * What differs is weight, which is the component's business, not this type's.
 */
export type PlannedWorkRow = {
  id: string;
  /** Derived from the schedule type's execution_kind, never from the title. */
  kind: 'call' | 'message';
  eventId: string;
  eventTitle: string;
  /**
   * Catalog name plus a positional index when the event has more than one of
   * that type, matching what the Owner sees in their own app. `schedules` has
   * no label column - see docs/design/back-office-operations-brief.md 3.10.
   */
  title: string;
  /** The supporting line: who it targets, or how it sends itself */
  detail: string;
  scheduledDate: string;
  /** `HH:MM:SS` from its own column, or null. Never parsed out of scheduledDate. */
  scheduledTime: string | null;
  /**
   * How late, in the Overview's own vocabulary ("7 days late", "3 hours late",
   * "Overdue" under the hour), or null when the row is not overdue. A row that
   * passed ten minutes ago must not claim to be a day late.
   */
  lateBy: string | null;
  /** Guest Records this row targets, for the confirm dialogs' recipient counts. */
  audienceCount: number;
  /** "92 pending records" - the unit is always named, never a bare number. */
  audienceLabel: string;
  /** "WhatsApp" / "SMS" for a message row, null for a call plan. */
  channel: string | null;
};

export type PlannedWorkGroup = {
  key: string;
  label: string;
  /** Pinned above the dated groups and the only group that takes colour. */
  isOverdue: boolean;
  rows: PlannedWorkRow[];
};

/**
 * The Operations queue. Counts are two buckets that partition the rows exactly,
 * so the strip always sums to what is on screen - overdue is a property of a
 * row, not a third bucket. See brief 3.9.
 */
export type PlannedWorkQueue = {
  groups: PlannedWorkGroup[];
  callRounds: number;
  messages: number;
};
