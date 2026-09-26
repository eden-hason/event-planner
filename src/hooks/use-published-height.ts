'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * Publishes an element's live height as a CSS variable on the document root,
 * so stacked sticky layers can sit under one another at whatever height each
 * one wraps to - `top-[var(--name)]` - without passing measurements around.
 * The variable is removed when the element goes, or when `enabled` turns off,
 * so a layer that is not there counts as zero.
 */
export function usePublishedHeight(
  ref: RefObject<HTMLElement | null>,
  name: `--${string}`,
  enabled = true,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || !enabled) return;
    // Set once up front so the first layout already has it, then only on a
    // real height change: a width-only resize would otherwise restyle the
    // whole document for nothing.
    let last = el.offsetHeight;
    root.style.setProperty(name, `${last}px`);
    const observer = new ResizeObserver(() => {
      if (el.offsetHeight === last) return;
      last = el.offsetHeight;
      root.style.setProperty(name, `${last}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [ref, name, enabled]);
}
