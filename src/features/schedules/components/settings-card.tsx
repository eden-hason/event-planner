import { cn } from '@/lib/utils';

/**
 * The plain card every settings block on an open Schedule sits in: a bold
 * title, an optional trailing note (a lock badge, a character count), and the
 * content. No icon and no shadow - the blocks are a list of questions, not a
 * dashboard of tiles.
 *
 * Deliberately not the shadcn `Card`: its header/content slots, padding and
 * shadow are built for dashboard tiles, and every override here would fight
 * them.
 */
export function SettingsCard({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-card flex flex-col gap-3 rounded-[14px] border p-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
