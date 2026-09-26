'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { setSearchParams } from '@/lib/shallow-navigation';
import {
  DEFAULT_GUEST_LIST_PARAMS,
  parseGuestListParams,
  writeGuestListParams,
  type GuestListParams,
} from '@/features/guests/utils/guest-list-params';

/**
 * The guest list's view, read from and written to the URL (shallowly - the
 * server never reads these). Filter changes push a history entry so back
 * steps through them; typing in search replaces, so back does not replay
 * every keystroke.
 */
export function useGuestListParams() {
  const searchParams = useSearchParams();
  const params = useMemo(
    () => parseGuestListParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const update = useCallback(
    (patch: Partial<GuestListParams>, mode: 'push' | 'replace' = 'push') => {
      setSearchParams((search) => {
        writeGuestListParams(
          { ...parseGuestListParams(search), ...patch },
          search,
        );
      }, mode);
    },
    [],
  );

  const reset = useCallback(() => update(DEFAULT_GUEST_LIST_PARAMS), [update]);

  return { params, update, reset };
}
