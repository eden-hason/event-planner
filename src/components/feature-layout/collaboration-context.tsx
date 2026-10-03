'use client';

import * as React from 'react';
import type { CollaboratorRole } from '@/features/collaborate/schemas';

type CollaborationContextValue = {
  role: CollaboratorRole;
  isCreator: boolean;
  isOwner: boolean;
  /**
   * May read the Event's payments: the Owner who created it. Payment RLS checks
   * `events.user_id`, so a co-owner collaborator would see the money missing.
   */
  canSeePayments: boolean;
};

const CollaborationContext = React.createContext<CollaborationContextValue>({
  role: 'owner',
  isCreator: true,
  isOwner: true,
  canSeePayments: true,
});

export function CollaborationProvider({
  role,
  isCreator,
  children,
}: {
  role: CollaboratorRole;
  isCreator: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({
      role,
      isCreator,
      isOwner: role === 'owner',
      canSeePayments: role === 'owner' && isCreator,
    }),
    [role, isCreator],
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
