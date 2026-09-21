/**
 * An event detail a message can show, named the way the event details page
 * names it. Several placeholder sources can land on one detail: the Occasion
 * Phrase and its sibling lines are built from the hosts' names, so a missing
 * name reads as the names, not as a phrase the Owner never typed.
 */
export type MissingDetail =
  | 'eventDate'
  | 'venue'
  | 'receptionTime'
  | 'brideName'
  | 'groomName'
  | 'childName'
  | 'hosts';

/**
 * The lines built from the hosts' names (see withOccasionPhrase and
 * mapEventRow), so each is missing exactly when the names are.
 */
export const DERIVED_FROM_HOSTS: readonly string[] = [
  'event.occasionPhrase',
  'event.approachingLine',
  'event.todayLine',
];

function detailFor(source: string): MissingDetail | null {
  if (source === 'event.eventDate') return 'eventDate';
  if (source === 'event.receptionTime') return 'receptionTime';
  if (source.startsWith('event.location.')) return 'venue';
  if (source.startsWith('event.hostDetails.bride.')) return 'brideName';
  if (source.startsWith('event.hostDetails.groom.')) return 'groomName';
  if (source.startsWith('event.hostDetails.child.')) return 'childName';
  if (DERIVED_FROM_HOSTS.includes(source)) return 'hosts';
  return null;
}

/**
 * The details to ask for, in the order the message uses them and without
 * repeats. A source with no detail the Owner can fill in is left out.
 */
export function missingDetails(sources: string[]): MissingDetail[] {
  const details: MissingDetail[] = [];
  for (const source of sources) {
    const detail = detailFor(source);
    if (detail && !details.includes(detail)) details.push(detail);
  }
  return details;
}
