'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** What the open Schedule tells the page about its edits. */
type UnsavedEdits = { dirty: boolean; revert: () => void };

const UnsavedChangesContext = createContext<
  ((edits: UnsavedEdits | null) => void) | null
>(null);

/**
 * Keeps an open Schedule's unsaved edits from vanishing on the way out.
 *
 * The edits live in the Schedule's own settings provider, keyed by its id, so
 * anything that changes which Schedule is open - another card, the hero, the
 * back arrow - unmounts it and throws them away. `guard` wraps those moves in
 * a question while there is something unsaved. The same question stops a
 * click on any in-app link, and the browser's own prompt covers closing or
 * reloading the tab.
 *
 * The browser's back gesture is not covered: it changes the URL before the
 * page hears of it, and putting the URL back would remount the pane anyway.
 *
 * Returns the guard, the `report` to hand an UnsavedChangesProvider around the
 * pane, and the dialog to render.
 */
export function useUnsavedChangesGuard() {
  const t = useTranslations('schedules.detail.leave');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const router = useRouter();
  const edits = useRef<UnsavedEdits | null>(null);
  // Mirrors `edits.current.dirty` so the page-wide listeners below are only
  // attached while there is something to lose. A `beforeunload` listener keeps
  // some browsers from caching the page for back and forward.
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null);

  const report = useCallback((next: UnsavedEdits | null) => {
    edits.current = next;
    setDirty(Boolean(next?.dirty));
  }, []);

  const guard = useCallback((go: () => void) => {
    if (edits.current?.dirty) setLeaveTo(() => go);
    else go();
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only prompt when this is set.
      event.returnValue = '';
    };

    // Captured on the document, ahead of React's own listener on the root, so
    // a Next <Link> never starts its navigation.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(
        () => () => router.push(`${url.pathname}${url.search}${url.hash}`),
      );
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, router]);

  const leave = () => {
    const go = leaveTo;
    setLeaveTo(null);
    // Below md a closed pane can stay mounted (the default Schedule is always
    // rendered), so the edits are dropped rather than left behind it.
    edits.current?.revert();
    go?.();
  };

  const dialog = (
    <AlertDialog
      open={leaveTo !== null}
      onOpenChange={(open) => !open && setLeaveTo(null)}
    >
      <AlertDialogContent dir={dir} className="rounded-[18px] sm:max-w-[440px]">
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-[19px] font-extrabold">
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14.5px] leading-relaxed">
            {t('body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('keepEditing')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={leave}>
            {t('leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, report, dialog };
}

/** Where the open Schedule reports to: wraps whatever renders the pane. */
export function UnsavedChangesProvider({
  report,
  children,
}: {
  report: (edits: UnsavedEdits | null) => void;
  children: React.ReactNode;
}) {
  return (
    <UnsavedChangesContext.Provider value={report}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/** Tells the page's guard whether the open Schedule has unsaved edits. */
export function useReportUnsavedChanges(dirty: boolean, revert: () => void) {
  const report = useContext(UnsavedChangesContext);
  useEffect(() => {
    report?.({ dirty, revert });
    return () => report?.(null);
  }, [report, dirty, revert]);
}
