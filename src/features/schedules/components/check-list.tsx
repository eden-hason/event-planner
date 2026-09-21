import { IconCheck } from '@tabler/icons-react';

import { cn } from '@/lib/utils';

/**
 * A short list of promises, each on a small primary check. It is how an
 * info card says "this is what happens" in a few lines rather than a paragraph:
 * the call round's opening card and a message Schedule's delivery card both
 * read this way. `textClassName` sets the size of the lines, since the two
 * cards sit at different type scales.
 */
export function CheckList({
  items,
  textClassName,
}: {
  items: readonly string[];
  textClassName?: string;
}) {
  return (
    <ul className="flex flex-col gap-[7px]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span
            aria-hidden
            className="bg-primary/10 text-primary mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full"
          >
            <IconCheck size={11} stroke={2.6} />
          </span>
          <span
            className={cn(
              'text-muted-foreground text-[13px] leading-normal text-pretty',
              textClassName,
            )}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
