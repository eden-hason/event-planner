import { EventBandSkeleton } from '@/features/admin';

export default function Loading() {
  return <div className="flex flex-col gap-4"><EventBandSkeleton /><EventBandSkeleton /><EventBandSkeleton /></div>;
}
