'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Maximize2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/** How far a tap zooms the full-screen image in. */
const ZOOM = 2.5;

/**
 * The invitation on the save-the-date page: a height-capped preview that opens
 * full screen on tap, where a second tap zooms in on the spot tapped and the
 * guest pans by scrolling. An invitation is usually a portrait card dense with
 * small print - worth reading, too tall to show whole in the page flow.
 *
 * Zoom is a wider image in a scrolling box rather than a CSS transform, so
 * panning is the browser's own touch scrolling, with its momentum, and pinch
 * zoom still works on top of it.
 */
export function InvitationImageViewer({ src }: { src: string }) {
  const [zoomed, setZoomed] = React.useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // Where the zoom-in tap landed, as fractions of the image, so the zoomed
  // view opens on that spot instead of the top-left corner.
  const focusRef = React.useRef({ x: 0.5, y: 0.5 });

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!zoomed || !scroller) return;
    const { x, y } = focusRef.current;
    scroller.scrollLeft = x * scroller.scrollWidth - scroller.clientWidth / 2;
    scroller.scrollTop = y * scroller.scrollHeight - scroller.clientHeight / 2;
  }, [zoomed]);

  function toggleZoom(event: React.MouseEvent<HTMLImageElement>) {
    if (!zoomed) {
      const rect = event.currentTarget.getBoundingClientRect();
      focusRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    }
    setZoomed((value) => !value);
  }

  return (
    <DialogPrimitive.Root onOpenChange={(open) => !open && setZoomed(false)}>
      <DialogPrimitive.Trigger
        aria-label="הצגת ההזמנה במסך מלא"
        className="group relative block cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-20px_rgba(60,20,40,0.35)] ring-1 ring-black/5"
      >
        {/* Capped in height and shown whole: a portrait invitation would
            otherwise push everything else below the fold. Its own
            proportions are unknown, so the width follows from the cap. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="ההזמנה"
          className="block h-auto max-h-[min(44dvh,380px)] w-auto max-w-full"
        />
        <span className="absolute start-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-[oklch(0.21_0.006_285.9)] shadow-sm backdrop-blur transition-transform group-hover:scale-105">
          <Maximize2 className="size-4" />
        </span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/90" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">ההזמנה</DialogPrimitive.Title>

          {/* ltr: scroll offsets are negative in an rtl scroller, which would
              throw off the focus arithmetic above. The image has no direction. */}
          <div
            ref={scrollerRef}
            dir="ltr"
            className={cn(
              'flex size-full overflow-auto overscroll-contain',
              !zoomed && 'items-center justify-center p-4',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="ההזמנה"
              onClick={toggleZoom}
              className={cn(
                'block shrink-0 select-none',
                zoomed
                  ? 'h-auto max-w-none cursor-zoom-out'
                  : 'max-h-full max-w-full cursor-zoom-in object-contain',
              )}
              style={zoomed ? { width: `${ZOOM * 100}%` } : undefined}
              draggable={false}
            />
          </div>

          <DialogPrimitive.Close
            aria-label="סגירה"
            className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 flex size-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          {/* On pills rather than bare: the image may be light where they sit. */}
          <p className="pointer-events-none absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] flex justify-center">
            <span className="rounded-full bg-black/55 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur">
              {zoomed ? 'הקישו להקטנה' : 'הקישו להגדלה'}
            </span>
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
