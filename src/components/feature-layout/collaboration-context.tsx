'use client';

import * as React from 'react';

type CollaborationContextValue = {
  /**
   * Created the Event. Every collaborator is an Owner (ADR 0041); the creator
   * is the one who cannot be removed.
   */
  isCreator: boolean;
  /**
   * May read the Event's payments: the Owner who created it. Payment RLS checks
   * `events.user_id`, so a co-owner collaborator would see the money missing.
   */
  canSeePayments: boolean;
};

const CollaborationContext = React.createContext<CollaborationContextValue>({
  isCreator: true,
  canSeePayments: true,
});

export function CollaborationProvider({
  isCreator,
  children,
}: {
  isCreator: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ isCreator, canSeePayments: isCreator }),
    [isCreator],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  return React.useContext(CollaborationContext);
}
