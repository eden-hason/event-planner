import { Skeleton } from '@/components/ui/skeleton';

export function HeroSkeleton() {
  return (
    <div className="home-wide:rounded-[28px] -mx-4 flex flex-col gap-4 px-4 md:mx-0 md:gap-0 md:overflow-hidden md:rounded-3xl md:border md:bg-card md:px-0">
      {/* Mirrors the Hero's lead band (see `home-hero.tsx`) so the real thing
          lands in place instead of shifting the sections below it. */}
      <div className="home-wide:min-h-[176px] home-wide:px-9 home-wide:pt-[34px] home-wide:pb-[30px] flex min-h-[calc(160px+env(safe-area-inset-top))] items-center gap-4 px-1.5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 md:min-h-[160px] md:px-[22px] md:pt-[26px]">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-4/5 md:w-1/2" />
          <Skeleton className="h-8 w-3/5 md:w-1/3" />
        </div>
        <Skeleton className="home-wide:h-20 home-wide:w-[72px] h-16 w-14" />
      </div>
      <Skeleton className="home-wide:mx-3.5 home-wide:mb-3.5 home-wide:h-[78px] h-[220px] rounded-3xl md:mx-3 md:mb-3" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {title && <Skeleton className="h-5 w-28" />}
      <div className="home-wide:grid home-wide:grid-cols-2 home-wide:gap-x-3 flex flex-col gap-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton
            key={i}
            // A single row (the status strip) is one card across both columns.
            className={rows === 1 ? 'home-wide:col-span-2 h-[72px] rounded-2xl' : 'h-[72px] rounded-2xl'}
          />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ height = 160 }: { height?: number }) {
  return <Skeleton className="rounded-2xl" style={{ height }} />;
}
