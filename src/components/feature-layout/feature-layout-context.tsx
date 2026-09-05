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
  action: ReactNode | null;
  setHeader: (config: FeatureHeaderConfig) => void;
  clearHeader: () => void;
}

interface FeatureHeaderConfig {
  title: string;
  action?: ReactNode;
}

const FeatureLayoutContext = createContext<FeatureLayoutContextType | null>(
  null,
);

export function FeatureLayoutProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  const [action, setAction] = useState<ReactNode | null>(null);

  const setHeader = useCallback((config: FeatureHeaderConfig) => {
    setTitle(config.title);
    setAction(config.action ?? null);
  }, []);

  const clearHeader = useCallback(() => {
    setTitle('');
    setAction(null);
  }, []);

  return (
    <FeatureLayoutContext.Provider
      value={{ title, action, setHeader, clearHeader }}
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
