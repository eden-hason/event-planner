'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface BottomNavContextValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const BottomNavContext = createContext<BottomNavContextValue | null>(null);

/**
 * Whether the phone's bottom nav is out of the way.
 *
 * The nav and the page it sits under are siblings in the event layout, so a
 * page that wants the whole bottom edge for itself (a full-screen pane with its
 * own Save) cannot reach the nav through props. It says so here instead, and
 * both the nav and `PageCard`'s bottom clearance read the answer.
 */
export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);

  return <BottomNavContext.Provider value={value}>{children}</BottomNavContext.Provider>;
}

export function useBottomNavHidden() {
  return useContext(BottomNavContext)?.hidden ?? false;
}

/** Hides the bottom nav for as long as `hidden` is true and the caller is mounted. */
export function useHideBottomNav(hidden: boolean) {
  const context = useContext(BottomNavContext);
  const setHidden = context?.setHidden;

  useEffect(() => {
    if (!setHidden || !hidden) return;
    setHidden(true);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
