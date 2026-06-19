// The 16 adult Blobbi forms (Ditto adult-blobbi/types/adult.types.ts).
// The form is destiny: derived deterministically from the seed at egg
// creation, NOT chosen by care history.

export const ADULT_FORMS = [
  'bloomi', 'breezy', 'cacti', 'catti', 'cloudi', 'crysti', 'droppi', 'flammi',
  'froggi', 'leafy', 'mushie', 'owli', 'pandi', 'rocky', 'rosey', 'starri',
] as const;

export type AdultForm = (typeof ADULT_FORMS)[number];

export const DEFAULT_ADULT_FORM: AdultForm = 'catti';

/** Human-friendly label for a form id. */
export function adultFormLabel(form: string): string {
  return form.charAt(0).toUpperCase() + form.slice(1);
}

/**
 * Each form has a short flavor archetype, used for the pixel silhouette
 * (ears/crown/body shape). Keeps the 16 forms visually distinct.
 */
export const ADULT_FORM_ARCHETYPE: Record<AdultForm, string> = {
  bloomi: 'flower',
  breezy: 'wing',
  cacti: 'spiky',
  catti: 'ears',
  cloudi: 'puff',
  crysti: 'crystal',
  droppi: 'drop',
  flammi: 'flame',
  froggi: 'frog',
  leafy: 'leaf',
  mushie: 'mushroom',
  owli: 'owl',
  pandi: 'panda',
  rocky: 'rock',
  rosey: 'rose',
  starri: 'star',
};
