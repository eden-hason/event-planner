'use client';

import { Component, type ReactNode } from 'react';

/**
 * Keeps one failing Home section from taking the page down with it: the Hero
 * should still paint when, say, the status strip's queries throw.
 */
export class SectionErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[home] Section failed to render:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
