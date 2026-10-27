/**
 * A Server Action that redirects - to Google, or to the next page - throws on
 * the client as a NEXT_REDIRECT. That is the sign-in working, not an error.
 */
export function isRedirectError(error: unknown): boolean {
  return error instanceof Error && !!error.message?.includes('NEXT_REDIRECT');
}
