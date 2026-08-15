import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AuthTakeover } from '@/features/auth/components/auth-takeover';

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { next } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect({ href: next || '/app', locale });
  }

  return <AuthTakeover next={next} />;
}
