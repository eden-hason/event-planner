import { redirect } from '@/i18n/navigation';

// The page was renamed to Home. Links already out in the world (collaborator
// invitation emails, bookmarks) still point here.
export default async function LegacyDashboardRedirect({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  redirect({ href: `/app/${eventId}/home`, locale });
}
