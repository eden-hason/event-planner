'use client';

import * as React from 'react';
import { useCollaboration } from '@/components/feature-layout';
import type { GuestPackageView } from '../types';
import { RecordPackageSheet } from './record-package-sheet';
import { TopUpSheet } from './top-up-sheet';

type OpenSheetOptions = {
  /** Lets the sheet offer "show the records" when the list is over the package. */
  onShowOutside?: () => void;
};

type RecordPackageValue = {
  /** Null when the event has no package: every package surface stays hidden. */
  view: GuestPackageView | null;
  /** The Guest Records outside the package, for the row tags and the filter. */
  outsideIds: ReadonlySet<string>;
  openSheet: (options?: OpenSheetOptions) => void;
  /**
   * Opens the Top-up sheet (ADR 0042). Null when the package cannot grow, or the viewer is
   * not the one who pays: then no surface offers to add records.
   */
  openTopUp: (() => void) | null;
};

const EMPTY: RecordPackageValue = {
  view: null,
  outsideIds: new Set(),
  openSheet: () => {},
  openTopUp: null,
};

const RecordPackageContext = React.createContext<RecordPackageValue>(EMPTY);

/**
 * Carries the Record Package down the Guests page, so the meter, the chips, every row and
 * the drawer read one answer without threading it through each layer (ADR 0027). It also
 * owns the one package sheet, so the package line and a record's drawer open the same one,
 * and the one Top-up sheet, so the package sheet and the outside banner do too.
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
  const [open, setOpen] = React.useState(false);
  // Kept after close, so the sheet does not change under its own closing animation.
  const [options, setOptions] = React.useState<OpenSheetOptions>({});
  const [topUpOpen, setTopUpOpen] = React.useState(false);
  const { canSeePayments } = useCollaboration();
  const topUpPlan = canSeePayments ? (view?.topUpPlan ?? null) : null;

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
            openSheet,
            openTopUp: topUpPlan ? () => setTopUpOpen(true) : null,
          }
        : EMPTY,
    [view, openSheet, topUpPlan],
  );

  return (
    <RecordPackageContext.Provider value={value}>
      {children}
      {view && (
        <RecordPackageSheet
          open={open}
          onOpenChange={setOpen}
          view={view}
          onShowOutside={options.onShowOutside}
          onTopUp={value.openTopUp ?? undefined}
        />
      )}
      {view && topUpPlan && (
        <TopUpSheet
          open={topUpOpen}
          onOpenChange={setTopUpOpen}
          view={view}
          plan={topUpPlan}
          eventName={eventName}
        />
      )}
    </RecordPackageContext.Provider>
  );
}

export function useRecordPackage(): RecordPackageValue {
  return React.useContext(RecordPackageContext);
}
