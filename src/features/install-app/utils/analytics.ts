import posthog from 'posthog-js';
import type { DismissVia, InstallPlatform, InstallSurface } from '../types';

type InstallEvent =
  | { name: 'install_card_shown' }
  | { name: 'install_card_tapped' }
  | { name: 'install_card_dismissed'; via: DismissVia }
  | { name: 'install_prompt_result'; outcome: 'accepted' | 'dismissed' };

/** The install funnel. Every event says which platform and which surface it came from. */
export function captureInstallEvent(
  { name, ...properties }: InstallEvent,
  context: { platform: Exclude<InstallPlatform, 'none'>; surface: InstallSurface },
) {
  if (
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    posthog.capture(name, {
      ...properties,
      platform: context.platform === 'android' ? 'android' : 'ios',
      browser: context.platform,
      surface: context.surface,
    });
  }
}
