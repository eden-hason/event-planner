import { Skeleton } from '@/components/ui/skeleton';

/**
 * Server rendered per request (see docs/admin/ADMIN-CONTEXT.md), so this is
 * what actually paints while the query runs - a real skeleton, not a spinner.
 * Row rhythm and column widths already match the populated table.
 */
export function UsersIndexSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-9 w-[320px]" />
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3.5 border-b px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ms-auto h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3.5 border-b px-4 py-2.5 last:border-0">
            <Skeleton className="size-[30px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-44" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-11" />
          </div>
        ))}
      </div>
    </div>
  );
}
