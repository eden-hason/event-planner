import { type LandingTemplate } from '../types';
import { KULULU_CONFETTI_ID } from '../designs/kululu-confetti/constants';
import { DARK_ROMANTIC_ID } from '../designs/dark-romantic/constants';
import { IVORY_EDITORIAL_ID } from '../designs/ivory-editorial/constants';
import { LINEN_ID } from '../designs/linen/constants';

export const DEFAULT_TEMPLATE_ID = LINEN_ID;

export const TEMPLATE_LIBRARY: LandingTemplate[] = [
  {
    id: KULULU_CONFETTI_ID,
    name: 'Kululu Confetti',
    category: 'celebration',
    kind: 'live',
    accentPair: ['#FF6B6B', '#4ECDC4'],
    palette: {
      bg: '#FFFFFF',
      accent: '#FF6B6B',
      text: '#1A1A1A',
      muted: '#6B6B6B',
      button: '#FF6B6B',
    },
  },
  {
    id: DARK_ROMANTIC_ID,
    name: 'Dark Romantic',
    category: 'elegant',
    kind: 'live',
    accentPair: ['#E8A598', '#B8A9C9'],
    palette: {
      bg: '#0D1B2A',
      bgGradient: 'linear-gradient(180deg, #0A1622 0%, #0D1B2A 35%, #0F1F30 70%, #0B1825 100%)',
      accent: '#E8A598',
      text: '#F4E8DC',
      muted: '#8A8295',
      button: '#E8A598',
    },
  },
  {
    id: IVORY_EDITORIAL_ID,
    name: 'Ivory Editorial',
    category: 'classic',
    kind: 'live',
    accentPair: ['#C9A96E', '#B8954E'],
    palette: {
      bg: '#FAF6EE',
      accent: '#C9A96E',
      text: '#1A1614',
      muted: '#8A7E6E',
      button: '#C9A96E',
    },
  },
  {
    id: LINEN_ID,
    name: 'Linen',
    category: 'minimal',
    kind: 'live',
    accentPair: ['#D4427A', '#F082A8'],
    palette: {
      bg: '#FAFAFA',
      accent: '#D4427A',
      text: '#18181B',
      muted: '#71717A',
      button: '#D4427A',
    },
  },
];
