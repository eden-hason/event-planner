'use client';

import * as React from 'react';
import type { GuestPackageView } from '../types';

type RecordPackageValue = {
  /** Null when the event has no package: every package surface stays hidden. */
  view: GuestPackageView | null;
  /** The Guest Records outside the package, for the row tags and the filter. */
  outsideIds: ReadonlySet<string>;
};

const EMPTY: RecordPackageValue = { view: null, outsideIds: new Set() };

const RecordPackageContext = React.createContext<RecordPackageValue>(EMPTY);

/**
 * Carries the Record Package down the Guests page, so the meter, the chips, every row and
 * the drawer read one answer without threading it through each layer (ADR 0027).
 */
export function RecordPackageProvider({
  view,
  children,
}: {
  view: GuestPackageView | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo<RecordPackageValue>(
    () => (view ? { view, outsideIds: new Set(view.outsideIds) } : EMPTY),
    [view],
  );
  return (
    <RecordPackageContext.Provider value={value}>{children}</RecordPackageContext.Provider>
  );
}

export function useRecordPackage(): RecordPackageValue {
  return React.useContext(RecordPackageContext);
}
