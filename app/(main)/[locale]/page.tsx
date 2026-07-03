import { setRequestLocale } from 'next-intl/server';
import { HomepageClient } from './_components/homepage-client';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomepageClient />;
}
