'use client';

import { useCallback } from 'react';
import posthog from 'posthog-js';
import { logout } from '@/features/auth';

/**
 * Signs the user out, resetting PostHog first so the next session on this
 * device is not stitched onto the one that just ended.
 *
 * Shared by every surface that offers a log-out row - the sidebar's user menu
 * and the mobile "More" page - so the reset can't be forgotten on one of them.
 */
export function useLogout() {
  return useCallback(async () => {
    if (
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.reset();
    }

    await logout();
  }, []);
}
