import { LoginForm } from '@/components/login-form';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { IconInnerShadowTop } from '@tabler/icons-react';
import { LanguageSwitcher } from '@/components/language-switcher';

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
  const { data, error } = await supabase.auth.getUser();

  if (data.user) {
    redirect({ href: next || '/app', locale });
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="absolute end-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <IconInnerShadowTop className="!size-5" />
          Kululu Events
        </a>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
