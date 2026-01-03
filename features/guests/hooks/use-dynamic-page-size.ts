'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

const TABLE_ROW_HEIGHT = 49; // Height of each table row in pixels (py-4 = 16px * 2 + content)
const TABLE_HEADER_HEIGHT = 48; // Height of table header
const PAGINATION_HEIGHT = 40; // Height of pagination controls
const BUFFER = 40; // Extra buffer space

interface UseDynamicPageSizeOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  minPageSize?: number;
  maxPageSize?: number;
  rowHeight?: number;
}

export function useDynamicPageSize({
  containerRef,
  minPageSize = 5,
  maxPageSize = 50,
  rowHeight = TABLE_ROW_HEIGHT,
}: UseDynamicPageSizeOptions) {
  const [pageSize, setPageSize] = useState(minPageSize);

  const calculatePageSize = useCallback(() => {
    if (!containerRef.current) return;

    // Get the container's position relative to viewport
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate available height from container top to viewport bottom
    const viewportHeight = window.innerHeight;
    console.log('viewportHeight', viewportHeight);
    console.log('rect', rect);
    const availableHeight =
      viewportHeight -
      rect.top -
      TABLE_HEADER_HEIGHT -
      PAGINATION_HEIGHT -
      BUFFER;

    // Calculate how many rows fit
    const calculatedPageSize = Math.floor(availableHeight / rowHeight);

    // Clamp to min/max bounds
    const clampedPageSize = Math.max(
      minPageSize,
      Math.min(maxPageSize, calculatedPageSize),
    );

    setPageSize(clampedPageSize);
  }, [containerRef, minPageSize, maxPageSize, rowHeight]);

  useEffect(() => {
    // Initial calculation
    calculatePageSize();

    // Recalculate on resize
    const handleResize = () => {
      calculatePageSize();
    };

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      calculatePageSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculatePageSize, containerRef]);

  return pageSize;
}
