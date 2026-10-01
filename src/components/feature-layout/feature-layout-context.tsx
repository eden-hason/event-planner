'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

interface FeatureLayoutContextType {
  title: string;
  subtitle: ReactNode | null;
  action: ReactNode | null;
  back: FeatureHeaderBack | null;
  sticky: boolean;
  setHeader: (config: FeatureHeaderConfig) => void;
  clearHeader: () => void;
}

/** A back arrow at the start of the header, for a page that opens a view over itself. */
interface FeatureHeaderBack {
  label: string;
  onClick: () => void;
  /** `close` draws an X - for a mode the page leaves rather than a view it goes back from. */
  icon?: 'back' | 'close';
}

interface FeatureHeaderConfig {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: FeatureHeaderBack;
  /**
   * Keep the header row pinned to the top while the page scrolls (`md` and
   * up), for a page whose own sticky controls stack under it. Its height is
   * published as `--page-header-h`.
   */
  sticky?: boolean;
}

const FeatureLayoutContext = createContext<FeatureLayoutContextType | null>(
  null,
);

export function FeatureLayoutProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState<ReactNode | null>(null);
  const [action, setAction] = useState<ReactNode | null>(null);
  const [back, setBack] = useState<FeatureHeaderBack | null>(null);
  const [sticky, setSticky] = useState(false);

  const setHeader = useCallback((config: FeatureHeaderConfig) => {
    setTitle(config.title);
    setSubtitle(config.subtitle ?? null);
    setAction(config.action ?? null);
    setBack(config.back ?? null);
    setSticky(config.sticky ?? false);
  }, []);

  const clearHeader = useCallback(() => {
    setTitle('');
    setSubtitle(null);
    setAction(null);
    setBack(null);
    setSticky(false);
  }, []);

  return (
    <FeatureLayoutContext.Provider
      value={{ title, subtitle, action, back, sticky, setHeader, clearHeader }}
    >
      {children}
    </FeatureLayoutContext.Provider>
  );
}

export function useFeatureLayoutContext() {
  const context = useContext(FeatureLayoutContext);
  if (!context) {
    throw new Error(
      'useFeatureLayoutContext must be used within a FeatureLayoutProvider',
    );
  }
  return context;
}

/**
 * Hook for pages to configure the feature header
 * Call this in your page's client component to set the header title and action
 */
export function useFeatureHeader(config: FeatureHeaderConfig) {
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  useEffect(() => {
    setHeader(config);
    return () => clearHeader();
  }, [config.title]);

  // Return setHeader for dynamic updates (e.g., changing action based on state)
  return { setHeader };
}
