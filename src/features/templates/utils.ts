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

type HostDetails =
  | { bride?: { name?: string }; groom?: { name?: string } }
  | undefined;

type GuestExperience =
  | { dietaryOptions?: boolean; dietaryTypes?: string[] }
  | null
  | undefined;

export function buildCoupleName(hostDetails: HostDetails, eventTitle: string): string {
  const brideName = hostDetails?.bride?.name;
  const groomName = hostDetails?.groom?.name;
  return brideName && groomName
    ? `${brideName} & ${groomName}`
    : (brideName ?? groomName ?? eventTitle);
}

export function buildFormattedDate(eventDate: string): string {
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full' }).format(
    new Date(eventDate),
  );
}

export function buildTime(
  receptionTime?: string | null,
  ceremonyTime?: string | null,
): string | undefined {
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
