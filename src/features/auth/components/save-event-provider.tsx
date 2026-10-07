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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { classifyUpgradeError } from '../utils/visitor';
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
 * Saving the Event from anywhere in the workspace (ADR 0028). One dialog,
 * opened by the header pill or by any action that needs an account.
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
      classifyUpgradeError(hash.get('error_code')) === 'existing-account';
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

  return (
    <Context.Provider value={value}>
      {children}
      {isVisitor && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>
                {reason ? t(`reason.${reason}`) : t('subtitle')}
              </DialogDescription>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      )}
    </Context.Provider>
  );
}
