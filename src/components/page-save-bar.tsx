'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconDeviceFloppy } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * The bar a page with unsaved edits shows at the bottom of the screen: what is
 * unsaved, Cancel, and Save. The page keeps it mounted, says when it is `open`
 * - while there is something to save - and how many changes there are. A
 * single change is named (`field`) rather than counted: "one unsaved change"
 * tells the Owner there is work left, not which.
 *
 * It slides up from the bottom edge as the first edit lands and back down once
 * it is saved or cancelled, which is why it stays mounted: an unmounted bar
 * has nothing left to slide out. On the way down it keeps the line it last
 * showed, rather than flashing "0 unsaved changes".
 *
 * Fixed rather than sticky, so it holds the bottom edge however short or long
 * the page is. It starts where the sidebar ends - the sidebar sits on the
 * start side, so `start` follows it into RTL - and narrows to the icon rail
 * when the sidebar is collapsed. Below md it rides on the bottom nav instead.
 * An in-flow spacer that grows and shrinks with it keeps the page's last field
 * from ending up underneath it.
 *
 * `onSave` left out makes Save the submit button of the form the bar sits in,
 * so Enter in a field saves too.
 */
export function PageSaveBar({
  open,
  count,
  field,
  isSaving,
  onCancel,
  onSave,
  saveDisabled = false,
  className,
}: {
  open: boolean;
  count: number;
  /** The one changed field's name, when there is exactly one. */
  field?: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  /** For the row inside the bar, e.g. to cap it at the page's content width. */
  className?: string;
}) {
  const t = useTranslations('common.saveBar');
  const message =
    count === 1 && field ? t('pendingSingle', { field }) : t('pending', { count });
  const [shown, setShown] = useState(message);
  if (open && message !== shown) setShown(message);

  return (
    <>
      <div
        aria-hidden
        className={cn(
          'shrink-0 transition-[height] duration-300 ease-out motion-reduce:transition-none',
          open ? 'h-14' : 'h-0',
        )}
      />
      <div
        // Tells floating buttons to lift clear of the bar - see AiAssistant.
        data-bottom-bar={open || undefined}
        inert={!open}
        className={cn(
          'bg-card fixed end-0 start-0 z-30 border-t px-4 py-3 md:px-6',
          // Closed, it drops by its own height: off the bottom edge from md,
          // and behind the bottom nav (which sits above it) on a phone.
          // `visibility` flips after the slide down and before the slide up.
          'transition-[translate,visibility] duration-300 ease-out motion-reduce:transition-none',
          open ? 'visible translate-y-0' : 'invisible translate-y-full',
          // Above the phone's bottom nav, which itself rides the visual
          // viewport (see MobileTabBar); from md the nav is gone.
          'bottom-[calc(var(--visual-viewport-bottom,0px)+var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] md:bottom-0',
          'md:start-(--sidebar-width) md:group-has-[[data-slot=sidebar][data-state=collapsed]]/sidebar-wrapper:start-(--sidebar-width-icon)',
        )}
      >
        <div className={cn('flex items-center gap-3', className)}>
          <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
            {shown}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            {t('cancel')}
          </Button>
          <Button
            type={onSave ? 'button' : 'submit'}
            size="sm"
            onClick={onSave}
            disabled={isSaving || saveDisabled}
          >
            <IconDeviceFloppy className="size-4" />
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </>
  );
}
