import { setRequestLocale } from 'next-intl/server';
import { InvalidCoPlannerLink } from '@/features/collaborate';

/**
 * Email invitations were replaced by the Co-planner Link (ADR 0041). An old
 * invitation link still opens, and says so, rather than a 404.
 */
export default async function RetiredInvitationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InvalidCoPlannerLink />;
}
