import type { GroupSide } from '@/features/guests/schemas';

/** The Side as a dot: the bride's side magenta, the groom's violet, no side nothing. */
export function sideDotClass(side: GroupSide | null | undefined): string {
  if (side === 'bride') return 'bg-primary';
  if (side === 'groom') return 'bg-violet-strong';
  return 'bg-transparent';
}
