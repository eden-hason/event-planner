import { GalleryVerticalEnd } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IconInnerShadowTop } from '@tabler/icons-react';

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (data.user) {
    redirect(next || '/app');
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
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
