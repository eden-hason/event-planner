import { HomeHeader } from '@/features/home';
// Server-only (reads queries directly), so imported here rather than through the barrel.
import { HomeSections } from '@/features/home/components/home-sections';

export default async function HomePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <>
      <HomeHeader />
      <HomeSections eventId={eventId} />
    </>
  );
}
