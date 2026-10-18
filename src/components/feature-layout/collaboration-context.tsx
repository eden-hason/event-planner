'use client';

import * as React from 'react';

type CollaborationContextValue = {
  /**
   * May read the Event's payments: the Owner who created it. Payment RLS checks
   * `events.user_id`, so a co-planner who joined would see the money missing.
   */
  canSeePayments: boolean;
};

const CollaborationContext = React.createContext<CollaborationContextValue>({
  canSeePayments: true,
});

export function CollaborationProvider({
  isCreator,
  children,
}: {
  isCreator: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ canSeePayments: isCreator }), [isCreator]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  return React.useContext(CollaborationContext);
}
