'use client';

import * as React from 'react';
import type { CollaboratorRole } from '@/features/collaborate/schemas';

type CollaborationContextValue = {
  role: CollaboratorRole;
  isCreator: boolean;
  isOwner: boolean;
};

const CollaborationContext = React.createContext<CollaborationContextValue>({
  role: 'owner',
  isCreator: true,
  isOwner: true,
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
