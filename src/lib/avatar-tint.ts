/**
 * Identity tints for avatars, keyed by a stable string so the same subject
 * keeps its colour between renders.
 *
 * These are deliberately raw palette classes, not semantic tokens: they carry
 * no meaning beyond "distinct from the neighbouring one", so there is nothing
 * for a token to name. What they must not be is duplicated - the event switcher
 * and the guest list each had their own divergent list, one with dark-mode
 * values and one without.
 */
const AVATAR_TINTS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300',
] as const;

export function avatarTintFor(key: string): string {
  let hash = 0;
  for (const char of key) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}
