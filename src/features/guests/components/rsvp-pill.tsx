'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  rsvpPresentation,
  RSVP_LABEL_NAMESPACE,
  type RsvpStatus,
} from '../utils/rsvp-presentation';

/**
 * A Guest Record's RSVP as a chip. Carries its own label, so colour is never
 * the only thing distinguishing one answer from another.
 */
export function RsvpPill({ status }: { status: RsvpStatus }) {
  const t = useTranslations(RSVP_LABEL_NAMESPACE);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        rsvpPresentation(status).chip,
      )}
    >
      {t(status)}
    </span>
  );
}
