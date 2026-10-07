'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { isExistingAccountError } from '../utils/visitor';
import { SaveEventForm } from './save-event-form';

/**
 * Why the dialog was opened. A gated action names itself, so the dialog can
 * say why saving comes first; the header pill opens it with no reason.
 */
export type SaveReason = 'send' | 'invite' | 'import' | 'pay' | 'share';

type SaveEventContext = {
  /** The person in this workspace is a Visitor who has not saved yet. */
  isVisitor: boolean;
  openSave: (reason?: SaveReason) => void;
  /**
   * For a gated action's click handler: true when it may go ahead. For a
   * Visitor it opens the save dialog instead and returns false.
   */
  requireSaved: (reason: SaveReason) => boolean;
};

const Context = createContext<SaveEventContext>({
  isVisitor: false,
  openSave: () => {},
  requireSaved: () => true,
});

export function useSaveEvent() {
  return useContext(Context);
}

/**
 * `onClick` for a link a Visitor must save before following - the WhatsApp
 * "talk to us about paying" links, which lead nowhere until there is an
 * account to pay for. Opens the save dialog instead of the link.
 */
export function useSaveGatedClick(reason: SaveReason) {
  const { requireSaved } = useSaveEvent();
  return useCallback(
    (event: { preventDefault: () => void }) => {
      if (!requireSaved(reason)) event.preventDefault();
    },
    [requireSaved, reason],
  );
}

/**
 * Saving the Event from anywhere in the workspace (ADR 0028). One form,
 * opened by the header pill or by any action that needs an account - a bottom
 * drawer on a phone, a dialog on desktop.
 *
 * Also picks up the return from Google: `?save=exists`, or Supabase's
 * `#error_code=email_exists`, means the Google account already has a Kululu
 * account, and the dialog opens on that question.
 */
export function SaveEventProvider({
  isVisitor,
  children,
}: {
  isVisitor: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('saveEvent');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SaveReason | undefined>();
  const [startAt, setStartAt] = useState<'details' | 'googleExists'>('details');

  useEffect(() => {
    if (!isVisitor) return;
    const params = new URLSearchParams(window.location.search);
    // Supabase reports a failed Google link in the fragment (`#error_code=`),
    // which never reaches the server - the callback route passes it through
    // to here untouched, so it is read in the browser.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hashError = hash.get('error_code') || hash.get('error');
    const exists =
      params.get('save') === 'exists' ||
      isExistingAccountError(hash.get('error_code'));
    if (!exists && !hashError) return;

    params.delete('save');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    if (exists) {
      setStartAt('googleExists');
      setOpen(true);
    } else {
      toast.error(tAuth('googleLoginFailed'));
    }
    // tAuth is stable; this reads the URL once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisitor]);

  const openSave = useCallback((why?: SaveReason) => {
    setReason(why);
    setStartAt('details');
    setOpen(true);
  }, []);

  const requireSaved = useCallback(
    (why: SaveReason) => {
      if (!isVisitor) return true;
      openSave(why);
      return false;
    },
    [isVisitor, openSave],
  );

  const value = useMemo(
    () => ({ isVisitor, openSave, requireSaved }),
    [isVisitor, openSave, requireSaved],
  );

  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;
  const body = (
    <>
      <div className="flex flex-col gap-2 text-start">
        <Title>{t('title')}</Title>
        <Description>{reason ? t(`reason.${reason}`) : t('subtitle')}</Description>
      </div>
      {/* Keyed so each opening starts fresh rather than mid-step. */}
      <SaveEventForm
        key={`${open}-${startAt}`}
        returnTo={pathname}
        startAt={startAt}
        onSaved={() => {
          setOpen(false);
          toast.success(t('saved'));
          router.refresh();
        }}
      />
    </>
  );

  return (
    <Context.Provider value={value}>
      {children}
      {isVisitor &&
        (isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="mx-auto max-h-[92vh] max-w-md">
              <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-3 pb-7">{body}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[420px]">{body}</DialogContent>
          </Dialog>
        ))}
    </Context.Provider>
  );
}
