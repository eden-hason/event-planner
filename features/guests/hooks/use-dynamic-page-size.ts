'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

const TABLE_ROW_HEIGHT = 49; // Height of each table row in pixels (py-2 padding + content)
const TABLE_HEADER_HEIGHT = 48; // Height of table header
const PAGINATION_HEIGHT = 40; // Height of pagination controls
const BUFFER = 48; // Extra buffer space for margins, borders, and layout shifts

interface UseDynamicPageSizeOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  minPageSize?: number;
  maxPageSize?: number;
  rowHeight?: number;
}

interface DynamicPageSizeResult {
  pageSize: number;
  isCalculated: boolean;
}

export function useDynamicPageSize({
  containerRef,
  minPageSize = 5,
  maxPageSize = 50,
  rowHeight = TABLE_ROW_HEIGHT,
}: UseDynamicPageSizeOptions): DynamicPageSizeResult {
  // Start with null to indicate "not yet calculated"
  const [pageSize, setPageSize] = useState<number | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);

  const calculatePageSize = useCallback(() => {
    if (!containerRef.current) return;

    // Get the container's position relative to viewport
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate available height from container top to viewport bottom
    const viewportHeight = window.innerHeight;
    const availableHeight =
      viewportHeight -
      rect.top -
      TABLE_HEADER_HEIGHT -
      PAGINATION_HEIGHT -
      BUFFER;

    // Calculate how many rows fit - use consistent rounding
    const calculatedPageSize = Math.floor(availableHeight / rowHeight);

    // Clamp to min/max bounds
    const clampedPageSize = Math.max(
      minPageSize,
      Math.min(maxPageSize, calculatedPageSize),
    );

    setPageSize((prev) => {
      // Only update if the value has changed to prevent unnecessary re-renders
      if (prev === clampedPageSize) return prev;
      return clampedPageSize;
    });
    setIsCalculated(true);
  }, [containerRef, minPageSize, maxPageSize, rowHeight]);

  useEffect(() => {
    const rafIds: number[] = [];
    let timeoutId: NodeJS.Timeout;

    const deferredCalculation = () => {
      // Use a small timeout to ensure all layout shifts have completed
      // This is more reliable than double RAF for handling:
      // - Font loading
      // - Image loading
      // - CSS transitions
      // - React hydration
      timeoutId = setTimeout(() => {
        // Then use RAF to sync with the paint cycle
        const rafId = requestAnimationFrame(() => {
          calculatePageSize();
        });
        rafIds.push(rafId);
      }, 50);
    };

    deferredCalculation();

    // Debounced resize handler to prevent excessive recalculations
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculatePageSize();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce ResizeObserver calls too
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculatePageSize();
      }, 100);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      rafIds.forEach(cancelAnimationFrame);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculatePageSize, containerRef]);

  // Return minPageSize as fallback until calculation is done
  return {
    pageSize: pageSize ?? minPageSize,
    isCalculated,
  };
}
