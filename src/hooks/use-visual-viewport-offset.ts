'use client';

import { useEffect } from 'react';

/** Published on `:root`, so anything positioned against the viewport can read it. */
const CSS_VAR = '--visual-viewport-bottom';

/** Below this the browser is effectively unzoomed and reports rounding noise. */
const ZOOM_EPSILON = 1.01;

/**
 * Keeps a `position: fixed` bottom bar inside the *visible* part of the page
 * while the user is zoomed in.
 *
 * iOS lays fixed elements out against the layout viewport rather than the
 * visual one, so at any page scale above 1 a `bottom: 0` bar sits below the
 * visible area: reachable by pinching out, and gone again the moment the pinch
 * ends. Chrome for iOS restores a tab's scale when the user returns to it, so
 * the bar can come back missing from a session in which nobody zoomed at all.
 *
 * This publishes the gap between the two viewports as a CSS variable for the
 * bar to subtract. Only while zoomed: at scale 1 WebKit re-anchors fixed
 * elements itself, and offsetting there would make the bar ride up over the
 * on-screen keyboard, which shrinks the visual viewport the same way.
 */
export function useVisualViewportOffset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    let published = '';

    const measure = () => {
      frame = 0;

      // `documentElement.clientHeight` is the layout viewport. `innerHeight` is
      // not, on every iOS version, which is the one thing this must get right.
      const gap =
        viewport.scale > ZOOM_EPSILON
          ? root.clientHeight - (viewport.height + viewport.offsetTop)
          : 0;
      const next = `${Math.max(0, Math.round(gap))}px`;

      if (next === published) return;
      published = next;
      root.style.setProperty(CSS_VAR, next);
    };

    // A pinch fires these continuously, so coalesce to one write per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();

    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    // A back/forward-cache restore replays no viewport event of its own.
    window.addEventListener('pageshow', schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('pageshow', schedule);
      root.style.removeProperty(CSS_VAR);
    };
  }, []);
}
