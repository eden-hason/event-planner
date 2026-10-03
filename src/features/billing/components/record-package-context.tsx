'use client';

import * as React from 'react';
import { useCollaboration } from '@/components/feature-layout';
import type { GuestPackageView } from '../types';
import { RecordPackageSheet } from './record-package-sheet';

type OpenSheetOptions = {
  /** Lets the sheet offer "show the records" when the list is over the package. */
  onShowOutside?: () => void;
};

type RecordPackageValue = {
  /** Null when the event has no package: every package surface stays hidden. */
  view: GuestPackageView | null;
  /** The Guest Records outside the package, for the row tags and the filter. */
  outsideIds: ReadonlySet<string>;
  /** Only the Owner has the package sheet: it is about buying records. */
  canOpenSheet: boolean;
  openSheet: (options?: OpenSheetOptions) => void;
};

const EMPTY: RecordPackageValue = {
  view: null,
  outsideIds: new Set(),
  canOpenSheet: false,
  openSheet: () => {},
};

const RecordPackageContext = React.createContext<RecordPackageValue>(EMPTY);

/**
 * Carries the Record Package down the Guests page, so the meter, the chips, every row and
 * the drawer read one answer without threading it through each layer (ADR 0027). It also
 * owns the one package sheet, so the package line and a record's drawer open the same one.
 */
export function RecordPackageProvider({
  view,
  eventName,
  children,
}: {
  view: GuestPackageView | null;
  eventName?: string;
  children: React.ReactNode;
}) {
  const { isOwner } = useCollaboration();
  const [open, setOpen] = React.useState(false);
  // Kept after close, so the sheet does not change under its own closing animation.
  const [options, setOptions] = React.useState<OpenSheetOptions>({});

  const canOpenSheet = Boolean(view) && isOwner;
  const openSheet = React.useCallback((next?: OpenSheetOptions) => {
    setOptions(next ?? {});
    setOpen(true);
  }, []);

  const value = React.useMemo<RecordPackageValue>(
    () =>
      view
        ? {
            view,
            outsideIds: new Set(view.outsideIds),
            canOpenSheet,
            openSheet,
          }
        : EMPTY,
    [view, canOpenSheet, openSheet],
  );

  return (
    <RecordPackageContext.Provider value={value}>
      {children}
      {view && canOpenSheet && (
        <RecordPackageSheet
          open={open}
          onOpenChange={setOpen}
          view={view}
          eventName={eventName}
          onShowOutside={options.onShowOutside}
        />
      )}
    </RecordPackageContext.Provider>
  );
}

export function useRecordPackage(): RecordPackageValue {
  return React.useContext(RecordPackageContext);
}
