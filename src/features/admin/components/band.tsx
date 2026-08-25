import { cn } from '@/lib/utils';

/**
 * The Overview's surface. Each band is one flat card with its label inside the
 * top edge and hairline-separated rows below - the label belongs to the card,
 * not to the page.
 */
export function Band({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'bg-card overflow-hidden rounded-xl border shadow-xs',
        className,
      )}
    >
      {/*
       * The action sits in the flow rather than absolutely over the heading, so
       * the header is sized by its tallest child. Centring a 32px control inside
       * a header cut for 11.5px text left it 4px of air and reading as cramped.
       */}
      <div className={cn('flex items-center justify-between gap-3 px-4', action ? 'py-2' : 'pt-3.5 pb-2.5')}>
        <h2 className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.07em] uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A row inside a Band. Rows carry the separator, so the card edge stays clean. */
export function BandRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('border-t px-4 py-4', className)}>{children}</div>;
}
