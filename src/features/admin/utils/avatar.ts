/**
 * The Users table and sheet share one avatar treatment: a tinted initials
 * circle, no photos. The tint is derived from the User's id so it is stable
 * across a render rather than reshuffling on every page load.
 */
const TINTS = [
  ['oklch(0.94 0.03 333)', 'oklch(0.45 0.16 333)'],
  ['oklch(0.94 0.02 250)', 'oklch(0.44 0.09 250)'],
  ['oklch(0.94 0.03 160)', 'oklch(0.42 0.08 160)'],
  ['oklch(0.94 0.035 70)', 'oklch(0.44 0.09 70)'],
  ['oklch(0.945 0.004 286)', 'oklch(0.45 0.01 286)'],
] as const;

function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return value;
}

export function avatarTint(id: string): { background: string; color: string } {
  const [background, color] = TINTS[hash(id) % TINTS.length];
  return { background, color };
}

/**
 * Two letters from the name, or from the email when `full_name` is null - a
 * User is never rendered as "Unknown user". Hebrew names are supported: the
 * check is "is this a letter", not "is this ASCII".
 */
// Escapes rather than a literal range: U+0590 to U+05FF is the Hebrew block.
const NAME_LETTER = new RegExp('[A-Za-z\\u0590-\\u05FF]');

export function initialsFor(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter((part) => NAME_LETTER.test(part[0]));
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}
