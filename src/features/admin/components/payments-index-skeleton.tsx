import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from './band';

/** Mirrors the Payments index - header, search, filter bar, six-column table - so nothing shifts on load. */
export function PaymentsIndexSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full max-w-[460px]" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <Surface>
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="bg-muted/35 flex h-10 items-center gap-6 border-b px-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-3 flex-1" />
              ))}
            </div>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex h-[61px] items-center gap-6 border-b px-4 last:border-b-0">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                {Array.from({ length: 5 }).map((__, cell) => (
                  <Skeleton key={cell} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Surface>
    </div>
  );
}
