import { Skeleton } from '@/components/ui/skeleton';

export function HeroSkeleton() {
  return (
    <div className="-mx-4 -mt-4 flex flex-col gap-4 px-4 pt-10">
      <div className="flex items-start gap-4 px-1.5">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/5" />
        </div>
        <Skeleton className="h-16 w-14" />
      </div>
      <Skeleton className="h-[220px] rounded-3xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {title && <Skeleton className="h-5 w-28" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-2xl" />
      ))}
    </div>
  );
}

export function CardSkeleton({ height = 160 }: { height?: number }) {
  return <Skeleton className="rounded-2xl" style={{ height }} />;
}
