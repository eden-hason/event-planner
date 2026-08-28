import { SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * What paints the instant a row is clicked, while getUserDetail runs. It lives
 * inside UserSheetShell, so the sheet itself is already open and animating -
 * only the contents are pending.
 *
 * It has to carry SheetTitle and SheetDescription itself. Radix takes the
 * dialog's accessible name and description from those two nodes, and while
 * this fallback is showing the real header does not exist yet; without them
 * the sheet announces as unlabelled for the whole fetch.
 */
export function UserSheetSkeleton() {
  return (
    <>
      <div className="flex items-start gap-3 border-b px-5 py-4 pe-12">
        <Skeleton className="size-[38px] shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <SheetTitle className="sr-only">Loading user</SheetTitle>
          <SheetDescription className="sr-only">Fetching this account from the directory</SheetDescription>
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 py-4">
        <SkeletonSection valueWidths={['w-44', 'w-28']} />
        <SkeletonSection valueWidths={['w-32', 'w-20', 'w-52']} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-20" />
          <div className="flex flex-col gap-px overflow-hidden rounded-lg border">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 px-3 py-3">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="ms-auto h-3 w-14" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-muted flex items-center gap-2.5 border-t px-5 py-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="ms-auto h-8 w-[164px] rounded-md" />
      </div>
    </>
  );
}

function SkeletonSection({ valueWidths }: { valueWidths: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-2.5 w-16" />
      {valueWidths.map((width, index) => (
        <div key={index} className="grid grid-cols-[96px_1fr] items-center gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className={`h-3 ${width}`} />
        </div>
      ))}
    </div>
  );
}
