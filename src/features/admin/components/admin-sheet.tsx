'use client';

import { SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * SheetContent for the Back Office, for exactly the reason AdminDialogContent
 * exists (see that file): the Sheet portals to <body>, escaping the admin
 * layout's `dir="ltr"`, and Tailwind's `rtl:` variant compiles to
 * `[dir="rtl"] *`, which matches every descendant of the RTL <html> regardless
 * of a nearer `dir="ltr"`. Both the direction and the close button's position
 * have to be re-declared here rather than relied on from the portal root.
 */
export function AdminSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      dir="ltr"
      className={cn(
        '[&_[data-slot=sheet-close]]:right-4 [&_[data-slot=sheet-close]]:left-auto',
        className,
      )}
      {...props}
    >
      {children}
    </SheetContent>
  );
}
