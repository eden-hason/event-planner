/**
 * Who is signed in on the Partners host.
 *
 * Deliberately not a Partner *record* - there is no partners table yet. This
 * is the Supabase identity behind the session and nothing more, so that the
 * shape does not have to be unwound once admin-vetted Partner records exist.
 */
export type PartnerSession = {
  userId: string;
  email: string | null;
  phone: string | null;
};
