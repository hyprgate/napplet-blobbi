// Deterministic visual-trait derivation from a 64-char hex seed.
// Mirrors Ditto's seed-offset layout (core/lib/blobbi.ts):
//   [0..8] base color, [8..16] secondary, [12..20] eye, [16..24] pattern,
//   [24..32] special mark, [32..40] size, [40..48] adult form.

import type {
  BlobbiPattern,
  BlobbiSize,
  BlobbiSpecialMark,
  BlobbiVisualTraits,
} from './types.js';
import { ADULT_FORMS } from './forms.js';

const PATTERNS: BlobbiPattern[] = ['solid', 'spotted', 'striped', 'gradient'];
const SPECIAL_MARKS: BlobbiSpecialMark[] = ['none', 'star', 'heart', 'sparkle', 'blush'];
const SIZES: BlobbiSize[] = ['small', 'medium', 'large'];

export const PERSONALITIES = [
  'cheerful', 'shy', 'brave', 'curious', 'lazy', 'playful', 'grumpy', 'gentle',
] as const;
export const FAVORITE_FOODS = [
  'food_apple', 'food_burger', 'food_cake', 'food_pizza', 'food_sushi',
] as const;

/** Generate a fresh random 64-char hex seed. */
export function generateSeed(): string {
  const bytes = new Uint8Array(32);
  (globalThis.crypto ?? crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function slice(seed: string, start: number, end: number): number {
  const hex = seed.slice(start, end);
  const v = parseInt(hex, 16);
  return Number.isNaN(v) ? 0 : v;
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function deriveBaseHue(seed: string): number {
  return slice(seed, 0, 8) % 360;
}

export function deriveTraits(seed: string): BlobbiVisualTraits {
  const baseV = slice(seed, 0, 8);
  const secV = slice(seed, 8, 16);
  const eyeV = slice(seed, 12, 20);

  const baseHue = baseV % 360;
  const baseSat = 30 + (baseV % 71); // 30..100
  const baseLight = 30 + (Math.floor(baseV / 71) % 46); // 30..75
  const baseColor = hslToHex(baseHue, baseSat, baseLight);

  const secHue = baseHue + ((secV % 41) - 20); // ±20
  const secLight = Math.min(85, baseLight + 12 + (secV % 14)); // +12..+25
  const secondaryColor = hslToHex(secHue, baseSat, secLight);

  const eyeHue = eyeV % 360;
  const eyeSat = 40 + (eyeV % 61); // 40..100
  const eyeLight = 10 + (Math.floor(eyeV / 61) % 46); // 10..55
  const eyeColor = hslToHex(eyeHue, eyeSat, eyeLight);

  return {
    baseColor,
    secondaryColor,
    eyeColor,
    pattern: PATTERNS[slice(seed, 16, 24) % PATTERNS.length]!,
    specialMark: SPECIAL_MARKS[slice(seed, 24, 32) % SPECIAL_MARKS.length]!,
    size: SIZES[slice(seed, 32, 40) % SIZES.length]!,
  };
}

/** Deterministically pick the destiny adult form from the seed. */
export function deriveAdultForm(seed: string): string {
  return ADULT_FORMS[slice(seed, 40, 48) % ADULT_FORMS.length]!;
}

export function derivePersonality(seed: string): string {
  return PERSONALITIES[slice(seed, 48, 54) % PERSONALITIES.length]!;
}

export function deriveFavoriteFood(seed: string): string {
  return FAVORITE_FOODS[slice(seed, 54, 60) % FAVORITE_FOODS.length]!;
}
