'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * A table row that opens `href` wherever it is clicked. The row should still
 * hold a real Link to the same place, for the keyboard, screen readers and
 * middle-click; this only catches clicks on the rest of the row.
 *
 * Not a stretched `::after` overlay on that Link: the overlay needs the <tr> to
 * be its containing block, and older Safari ignores `position: relative` on
 * rows. Every row's overlay then covers the whole table and the last row
 * catches every tap.
 */
export function LinkedTableRow({
  href,
  className,
  ...props
}: { href: string } & Omit<ComponentProps<typeof TableRow>, 'onClick'>) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    // The row's own links and buttons do their own thing.
    if ((event.target as Element).closest('a, button')) return;
    // Dragging across a phone number to copy it is not a click on the row.
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    router.push(href);
  }

  return <TableRow className={cn('cursor-pointer', className)} onClick={handleClick} {...props} />;
}
