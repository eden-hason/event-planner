// Components
export { InstallCard } from './components/install-card';
export { InstallDrawer } from './components/install-drawer';
export { InstallMoreRow } from './components/install-more-row';

// Hooks
export { useInstallability } from './hooks/use-installability';

// Utils
export { detectInstallPlatform } from './utils/platform';

// Types
export type { InstallPlatform, InstallSurface, DismissVia } from './types';

// Note: `utils/install-store` is imported directly by `instrumentation-client.ts`,
// which must not pull this barrel's React components into its bundle.
