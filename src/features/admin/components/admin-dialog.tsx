'use client';

import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * DialogContent for the Back Office.
 *
 * Two things have to be corrected, and both are consequences of the Back Office
 * being LTR inside an app whose <html> is RTL:
 *
 * 1. The dialog portals to <body>, escaping the admin layout's `dir="ltr"`, so
 *    the direction has to be re-declared here.
 * 2. `dir="ltr"` is still not enough for the close button. Tailwind's `rtl:`
 *    variant compiles to `[dir="rtl"] *`, which matches every descendant of the
 *    RTL <html> regardless of a nearer `dir="ltr"` - CSS attribute selectors
 *    have no notion of "closest wins". So `rtl:right-auto rtl:left-4` keeps
 *    firing and pins the X to the left of an LTR dialog, on top of the title.
 *    Re-pinning it by data-slot fixes it without forking the shared primitive.
 */
export function AdminDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      dir="ltr"
      className={cn(
        '[&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:left-auto',
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}
