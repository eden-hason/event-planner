import posthog from 'posthog-js';
// A deep import on purpose: this file runs before hydration, and the feature's
// barrel would pull its React components into this bundle.
import {
  captureInstallPrompt,
  isRunningInstalled,
} from '@/features/install-app/utils/install-store';

// First, so Chrome's install event is never fired before anyone is listening.
captureInstallPrompt();

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken) {
  if (process.env.NODE_ENV === 'development') {
    throw new Error(
      'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
    );
  }
} else if (!apiHost) {
  if (process.env.NODE_ENV === 'development') {
    throw new Error(
      'NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured',
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
  // On every event, so we can see whether Owners who installed come back more.
  posthog.register({ display_mode: isRunningInstalled() ? 'standalone' : 'browser' });
}
