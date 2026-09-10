import { cva } from 'class-variance-authority';

/**
 * Extracted out of `alert.tsx` on purpose.
 *
 * `success` / `warning` / `info` are this app's additions, and they are the only
 * consumers of the `--success` and `--warning` tokens. Left inside the vendored
 * `alert.tsx`, an `npx shadcn add alert` would silently delete them and every
 * success and warning surface in the app would fall back to `default`.
 *
 * Here, that same re-vendor breaks the import instead - loudly, at build time.
 */
export const alertVariants = cva(
  "grid gap-0.5 rounded-lg border px-2.5 py-2 text-start text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pe-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        success:
          'border-success/20 bg-success/10 text-success *:data-[slot=alert-description]:text-success/90 *:[svg]:text-current',
        warning:
          'border-warning/20 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90 *:[svg]:text-current',
        info: 'border-primary/20 bg-primary/5 text-primary *:data-[slot=alert-description]:text-primary/90 *:[svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
