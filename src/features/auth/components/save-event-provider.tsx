'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { savePageHref, type SaveReason } from '../utils/visitor';

type SaveEventContext = {
  /** The person in this workspace is a Visitor who has not saved yet. */
  isVisitor: boolean;
  openSave: (reason?: SaveReason, returnParams?: Record<string, string>) => void;
  /**
   * For a gated action's click handler: true when it may go ahead. For a
   * Visitor it opens the save page instead and returns false. `returnParams`
   * are added to the page they come back to, so the action can pick up where
   * it left off once they have saved.
   */
  requireSaved: (reason: SaveReason, returnParams?: Record<string, string>) => boolean;
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
 * account to pay for. Opens the save page instead of the link.
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
 * Saving the Event from anywhere in the workspace (ADR 0028). The header pill,
 * and any action that needs an account, send a Visitor to the Save Event page,
 * which returns them here once they have saved - or when they go back.
 */
export function SaveEventProvider({
  isVisitor,
  children,
}: {
  isVisitor: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const openSave = useCallback(
    (reason?: SaveReason, returnParams?: Record<string, string>) => {
      // The query too, read at the moment of leaving so a filter or tab the
      // Visitor was on is still there when they come back.
      const search = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(returnParams ?? {})) search.set(key, value);
      const query = search.size > 0 ? `?${search}` : '';
      router.push(savePageHref(`${pathname}${query}`, { reason }));
    },
    [router, pathname],
  );

  const requireSaved = useCallback(
    (reason: SaveReason, returnParams?: Record<string, string>) => {
      if (!isVisitor) return true;
      openSave(reason, returnParams);
      return false;
    },
    [isVisitor, openSave],
  );

  const value = useMemo(
    () => ({ isVisitor, openSave, requireSaved }),
    [isVisitor, openSave, requireSaved],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
