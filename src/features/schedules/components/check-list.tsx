import { IconCheck } from '@tabler/icons-react';

/**
 * A short list of promises, each on a small primary check. It is how an
 * info card says "this is what happens" in a few lines rather than a paragraph,
 * as the call round's opening card does.
 */
export function CheckList({ items }: { items: readonly string[] }) {
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
          <span className="text-muted-foreground text-[13px] leading-normal text-pretty">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
