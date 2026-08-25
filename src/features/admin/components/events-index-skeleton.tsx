import { Skeleton } from '@/components/ui/skeleton';

export function EventsIndexSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-80" /></div>
      <Skeleton className="h-4 w-[430px]" />
      <div className="flex gap-2"><Skeleton className="h-9 w-[340px]" /><Skeleton className="h-9 w-60" /></div>
      <div className="bg-card rounded-xl border p-4">
        <Skeleton className="mb-4 h-5 w-full" />
        {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="mb-3 h-12 w-full last:mb-0" />)}
      </div>
    </div>
  );
}
