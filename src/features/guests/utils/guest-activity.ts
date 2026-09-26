/**
 * The guest drawer's Activity timeline: everything that happened to one Guest
 * Record, newest first. Read-only - it answers "did they get the invite?"
 * without leaving the guest list.
 */

export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'not_sent';
export type DeliveryChannel = 'whatsapp' | 'sms';
export type CallOutcome =
  | 'no_answer'
  | 'confirmed'
  | 'declined'
  | 'guest_will_update';

/**
 * What the Owner sees of a Delivery. The five Delivery states stay internal;
 * the Owner's word is "reached" (CONTEXT.md, Delivery).
 */
export type DeliveryOutcome =
  | 'seen'
  | 'reached'
  | 'on_its_way'
  | 'not_delivered'
  | 'no_phone';

export type ActivityDelivery = {
  scheduleTypeKey: string;
  status: DeliveryStatus;
  channel: DeliveryChannel | null;
  /** WhatsApp failed and the SMS Fallback is what went out. */
  viaFallback: boolean;
  at: string | null;
};

export type ActivityCall = {
  roundNumber: number;
  outcome: CallOutcome;
  at: string;
};

/** An RSVP the Guest gave themselves, in the chat or on the RSVP page. */
export type ActivityAnswer = {
  response: 'confirmed' | 'declined';
  count: number | null;
  channel: string | null;
  at: string;
};

/** The latest RSVP the Owner (or a collaborator) typed in, from the record's provenance. */
export type ActivityManualChange = {
  status: 'confirmed' | 'declined' | 'pending';
  /** How many are coming as of the change. */
  amount: number;
  at: string;
  byName: string | null;
  byCurrentUser: boolean;
};

export type GuestActivityInput = {
  deliveries: ActivityDelivery[];
  calls: ActivityCall[];
  answers: ActivityAnswer[];
  manualChange: ActivityManualChange | null;
};

export type GuestActivityItem =
  | ({ kind: 'delivery'; outcome: DeliveryOutcome } & ActivityDelivery)
  | ({ kind: 'call' } & ActivityCall)
  | ({ kind: 'answer' } & ActivityAnswer)
  | ({
      kind: 'rsvp';
      /**
       * The Owner changed only how many are coming: the answer before was
       * already "confirmed" (ADR 0026). Otherwise the change is a new answer.
       */
      countOnly: boolean;
    } & ActivityManualChange);

export function deliveryOutcome({
  status,
  channel,
}: Pick<ActivityDelivery, 'status' | 'channel'>): DeliveryOutcome {
  switch (status) {
    case 'read':
      return 'seen';
    case 'delivered':
      return 'reached';
    case 'sent':
      // SMS never reports past accepted, so accepted is as reached as SMS gets.
      return channel === 'sms' ? 'reached' : 'on_its_way';
    case 'pending':
      return 'on_its_way';
    case 'failed':
      return 'not_delivered';
    case 'not_sent':
      return 'no_phone';
  }
}

export function buildGuestActivity(
  input: GuestActivityInput,
): GuestActivityItem[] {
  const items: GuestActivityItem[] = [
    ...input.deliveries.map((delivery) => ({
      kind: 'delivery' as const,
      outcome: deliveryOutcome(delivery),
      ...delivery,
    })),
    ...input.calls.map((call) => ({ kind: 'call' as const, ...call })),
    ...input.answers.map((answer) => ({ kind: 'answer' as const, ...answer })),
    ...(input.manualChange
      ? [
          {
            kind: 'rsvp' as const,
            ...input.manualChange,
            countOnly: isCountOnlyChange(input, input.manualChange),
          },
        ]
      : []),
  ];
  // Newest first; a Delivery still waiting for its first attempt has no time and goes last.
  return items.sort((a, b) => {
    if (!a.at) return b.at ? 1 : 0;
    if (!b.at) return -1;
    return b.at.localeCompare(a.at);
  });
}

/**
 * The record keeps only its latest change and who made it, not what changed.
 * An Owner's change to "confirmed" that lands on a Guest whose last answer -
 * their own, or given on a call - was already "confirmed" can only have
 * changed the count.
 */
function isCountOnlyChange(
  input: GuestActivityInput,
  change: ActivityManualChange,
): boolean {
  if (change.status !== 'confirmed') return false;
  const earlier = [
    ...input.answers.map((answer) => ({
      at: answer.at,
      confirmed: answer.response === 'confirmed',
    })),
    ...input.calls
      .filter(
        (call) => call.outcome === 'confirmed' || call.outcome === 'declined',
      )
      .map((call) => ({
        at: call.at,
        confirmed: call.outcome === 'confirmed',
      })),
  ]
    .filter((answer) => answer.at < change.at)
    .sort((a, b) => b.at.localeCompare(a.at));
  return earlier[0]?.confirmed ?? false;
}
