'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'motion';

export function SpaceBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;

    let active = true;

    const drift = async () => {
      let current = 50; // Match initial CSS value — no jump on load

      while (active) {
        let next = Math.random() * 100;
        while (Math.abs(next - current) < 20) {
          next = Math.random() * 100;
        }
        const duration = 8 + Math.random() * 10; // 8–18s

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const animation = animate(
          el,
          { backgroundPositionX: `${next}%` } as any,
          { duration, ease: 'easeInOut' }
        );

        await animation.finished;
        current = next;
      }
    };

    drift();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 bg-cover bg-no-repeat"
      style={{
        backgroundImage: 'url(/landing_page_hero.png)',
        backgroundPositionX: '50%',
        backgroundPositionY: 'center',
      }}
    />
  );
}
