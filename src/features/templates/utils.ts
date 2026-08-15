export interface DishOption {
  id: string;
  emoji: string;
  label: string;
}

export const DIETARY_EMOJI: Record<string, string> = {
  vegetarian: '🥗',
  vegan: '🌱',
  gluten_free: '🌾',
  strictly_kosher: '✡️',
};

export const DIETARY_LABEL: Record<string, string> = {
  vegetarian: 'צמחונית',
  vegan: 'טבעונית',
  gluten_free: 'ללא גלוטן',
  strictly_kosher: 'כשר למהדרין',
};

export type HostDetails =
  | {
      bride?: { name?: string };
      groom?: { name?: string };
      child?: { name?: string };
    }
  | undefined;

type GuestExperience =
  | { dietaryOptions?: boolean; dietaryTypes?: string[] }
  | null
  | undefined;

export function buildCoupleName(
  hostDetails: HostDetails,
  eventTitle: string,
  eventType?: string,
): string {
  const brideName = hostDetails?.bride?.name;
  const groomName = hostDetails?.groom?.name;
  if (brideName && groomName) return `${brideName} & ${groomName}`;

  // Non-couple events (Bar/Bat Mitzva) carry a single celebrant under `child`.
  const childName = hostDetails?.child?.name;
  if (eventType === 'bar_mitzva' && childName) return `בר המצווה של ${childName}`;

  return brideName ?? groomName ?? childName ?? eventTitle;
}

/**
 * Undefined for an event with no date yet. Every template treats the date as
 * optional and simply omits the pill, which is the honest rendering - an
 * invitation for an undated event cannot state a date.
 *
 * Pinned to UTC for the same reason the formatDate transformer is: event_date
 * is a calendar date held in a timestamptz column, always written at 00:00:00
 * UTC, so reading it back in UTC returns the day the organiser picked. This
 * one matters most on the confirmation page, which is a client component - it
 * formats in the *guest's* browser, so an unpinned render showed guests west
 * of UTC a different day than the SMS that sent them there.
 */
export function buildFormattedDate(
  eventDate: string | null | undefined,
): string | undefined {
  if (!eventDate) return undefined;
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(eventDate));
}

export function buildTime(
  receptionTime?: string | null,
  ceremonyTime?: string | null,
  eventType?: string,
): string | undefined {
  if (eventType === 'bar_mitzva') {
    const parts: string[] = [];
    if (receptionTime) parts.push(`עלייה לתורה - ${receptionTime}`);
    if (ceremonyTime) parts.push(`מסיבה וריקודים - ${ceremonyTime}`);
    return parts.length ? parts.join(' · ') : undefined;
  }
  if (receptionTime) return `קבלת פנים: ${receptionTime}`;
  if (ceremonyTime) return `חופה: ${ceremonyTime}`;
  return undefined;
}

export function buildDishOptions(guestExperience: GuestExperience): DishOption[] {
  if (!guestExperience?.dietaryOptions) return [];
  const types = guestExperience.dietaryTypes ?? Object.keys(DIETARY_LABEL);
  return types.map((type) => ({
    id: type,
    emoji: DIETARY_EMOJI[type] ?? '🍽️',
    label: DIETARY_LABEL[type] ?? type,
  }));
}
