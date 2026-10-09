/** "1 event", "1,204 events" - a count with its noun, for the Back Office index pages. */
export function countLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${value.toLocaleString('en-GB')} ${value === 1 ? singular : plural}`;
}
