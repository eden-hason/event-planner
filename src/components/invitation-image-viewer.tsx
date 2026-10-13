'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ImageOff, Loader2, Maximize2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/** How far a tap zooms the full-screen image in. */
const ZOOM = 2.5;

/** Marks the history entry the open viewer pushed, so Back closes it. */
const HISTORY_KEY = 'invitationViewer';

/**
 * The invitation on the guest pages, opened full screen, where a tap zooms in
 * on the spot tapped and the guest pans by scrolling. An invitation is usually
 * a portrait card dense with small print - worth reading, too tall to show
 * whole in the page flow.
 *
 * Opened from `children` when given (the RSVP page's "view" button), otherwise
 * from a height-capped preview of the image itself (the save-the-date page).
 *
 * Zoom is a wider image in a scrolling box rather than a CSS transform, so
 * panning is the browser's own touch scrolling, with its momentum, and pinch
 * zoom still works on top of it.
 *
 * Guests open these pages on a phone, from an SMS, so the viewer behaves like
 * a screen of its own: the system Back gesture closes it instead of leaving
 * the page, and the image starts downloading on the first touch of the trigger
 * rather than on open.
 */
export function InvitationImageViewer({
  src,
  children,
}: {
  src: string;
  /** A single element to open the viewer with, in place of the preview. */
  children?: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);
  const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // Where the zoom-in tap landed, as fractions of the image, so the zoomed
  // view opens on that spot instead of the top-left corner.
  const focusRef = React.useRef({ x: 0.5, y: 0.5 });
  const preloadedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!zoomed || !scroller) return;
    const { x, y } = focusRef.current;
    scroller.scrollLeft = x * scroller.scrollWidth - scroller.clientWidth / 2;
    scroller.scrollTop = y * scroller.scrollHeight - scroller.clientHeight / 2;
  }, [zoomed]);

  // Back closes the viewer: opening pushes an entry, and leaving it - by the
  // system Back or by closing here, which pops it - closes the viewer. The
  // existing state is kept on the entry because the Next.js router reads its
  // own keys from it on every popstate.
  React.useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...window.history.state, [HISTORY_KEY]: true }, '');
    const onPopState = () => setOpen(false);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setZoomed(false);
      setStatus('loading');
      setOpen(true);
    } else if (window.history.state?.[HISTORY_KEY]) {
      // Popping the entry closes the viewer through the listener above.
      window.history.back();
    } else {
      setOpen(false);
    }
  }

  function preload() {
    if (preloadedRef.current) return;
    preloadedRef.current = true;
    new window.Image().src = src;
  }

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
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogPrimitive.Trigger asChild onPointerDown={preload} onFocus={preload}>
          {children}
        </DialogPrimitive.Trigger>
      ) : (
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
      )}

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/90" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 h-dvh outline-none"
        >
          <DialogPrimitive.Title className="sr-only">ההזמנה</DialogPrimitive.Title>

          {/* ltr: scroll offsets are negative in an rtl scroller, which would
              throw off the focus arithmetic above. The image has no direction. */}
          <div
            ref={scrollerRef}
            dir="ltr"
            className={cn(
              'flex size-full overflow-auto overscroll-contain',
              !zoomed &&
                'items-center justify-center px-4 pt-[max(72px,calc(env(safe-area-inset-top)+64px))] pb-[max(72px,calc(env(safe-area-inset-bottom)+64px))]',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="ההזמנה"
              onClick={status === 'loaded' ? toggleZoom : undefined}
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('error')}
              className={cn(
                'block shrink-0 transition-opacity duration-200 select-none',
                status === 'loaded' ? 'opacity-100' : 'opacity-0',
                zoomed
                  ? 'h-auto max-w-none cursor-zoom-out'
                  : 'max-h-full max-w-full cursor-zoom-in object-contain',
              )}
              style={zoomed ? { width: `${ZOOM * 100}%` } : undefined}
              draggable={false}
            />
          </div>

          {status !== 'loaded' ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
              {status === 'loading' ? (
                <Loader2 role="status" aria-label="טוען את ההזמנה" className="size-8 animate-spin" />
              ) : (
                <>
                  <ImageOff className="size-8" aria-hidden />
                  <span className="text-[15px] font-medium">לא הצלחנו לטעון את ההזמנה</span>
                </>
              )}
            </div>
          ) : null}

          <DialogPrimitive.Close
            aria-label="סגירה"
            className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          {/* On pills rather than bare: the image may be light where they sit. */}
          {status === 'loaded' ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] flex justify-center">
              <span className="rounded-full bg-black/55 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur">
                {zoomed ? 'הקישו להקטנה' : 'הקישו להגדלה'}
              </span>
            </p>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
