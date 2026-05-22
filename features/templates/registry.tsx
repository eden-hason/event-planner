'use client';

import type { ReactNode } from 'react';
import { KululuConfettiDesign } from './designs/kululu-confetti/kululu-confetti-design';
import { KULULU_CONFETTI_ID } from './designs/kululu-confetti/constants';
import { DarkRomanticDesign } from './designs/dark-romantic/dark-romantic-design';
import { DARK_ROMANTIC_ID } from './designs/dark-romantic/constants';
import { IvoryEditorialDesign } from './designs/ivory-editorial/ivory-editorial-design';
import { IVORY_EDITORIAL_ID } from './designs/ivory-editorial/constants';
import { LinenDesign } from './designs/linen/linen-design';
import { LINEN_ID } from './designs/linen/constants';
import type { DishOption } from './utils';
import { TEMPLATE_LIBRARY } from './data/template-library';

export type { DishOption };

export interface SubmitValues {
  rsvpStatus: 'confirmed' | 'declined';
  guestCount: number;
  mealChoice: string;
  notes: string;
}

export interface DesignProps {
  coupleName?: string;
  formattedDate?: string;
  time?: string;
  venue?: string;
  mapsLink?: string;
  dishOptions?: DishOption[];
  palette?: [string, string];
  interactive?: boolean;
  showConfetti?: boolean;
  lockGuestCount?: boolean;
  guestName?: string;
  initialRsvpStatus?: 'pending' | 'confirmed' | 'declined';
  initialAmount?: number;
  initialMealChoice?: string;
  initialNotes?: string;
  onSubmit?: (values: SubmitValues) => Promise<{ success: boolean; message: string }>;
}

export function renderTemplate(templateId: string, props: DesignProps): ReactNode {
  const { palette: propPalette, showConfetti, ...common } = props;

  const templateMeta = TEMPLATE_LIBRARY.find((t) => t.id === templateId);
  const palette = propPalette ?? (templateMeta?.accentPair as [string, string] | undefined);

  if (templateId === KULULU_CONFETTI_ID) return <KululuConfettiDesign {...common} palette={palette} showConfetti={showConfetti} />;
  if (templateId === DARK_ROMANTIC_ID) return <DarkRomanticDesign {...common} />;
  if (templateId === IVORY_EDITORIAL_ID) return <IvoryEditorialDesign {...common} />;
  return <LinenDesign {...common} palette={palette} />;
}
