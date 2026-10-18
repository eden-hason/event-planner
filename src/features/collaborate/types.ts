/** What the Co-planner Link's page shows before anyone signs in. */
export type CoPlannerLinkPreview = {
  eventId: string;
  eventTitle: string;
  /** The Owner who first shared the link; null when their profile has no name. */
  inviterName: string | null;
  /** The reader is already on the Event, so there is nothing to join. */
  alreadyMember: boolean;
};

/** The current user's standing on an Event, or null when they are not on it. */
export type CollaboratorAccess = {
  isCreator: boolean;
};
