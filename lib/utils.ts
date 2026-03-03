import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cardHover = 'transition-all duration-200 hover:-translate-y-0.5 hover:[box-shadow:0_8px_24px_-4px_rgb(0_0_0/0.08)]';
