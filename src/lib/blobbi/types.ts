// Core Blobbi domain types — a faithful, self-contained port of Ditto's blobbi
// model (src/blobbi/core/types/blobbi.ts). Kept small and portable.

export type BlobbiLifeStage = 'egg' | 'baby' | 'adult';
export type BlobbiActivityState = 'active' | 'sleeping' | 'hibernating';
export type BlobbiProgressionState = 'none' | 'incubating' | 'evolving';

export type BlobbiPattern = 'solid' | 'spotted' | 'striped' | 'gradient';
export type BlobbiSpecialMark = 'none' | 'star' | 'heart' | 'sparkle' | 'blush';
export type BlobbiSize = 'small' | 'medium' | 'large';

/** The five care stats. All clamped to [1, 100]. */
export interface BlobbiStats {
  hunger: number;
  happiness: number;
  health: number;
  hygiene: number;
  energy: number;
}

export type StatKey = keyof BlobbiStats;

export const STAT_MIN = 1;
export const STAT_MAX = 100;
export const STAT_KEYS: readonly StatKey[] = ['hunger', 'happiness', 'health', 'hygiene', 'energy'];

export const DEFAULT_BLOBBI_STATS: BlobbiStats = {
  hunger: 100,
  happiness: 100,
  health: 100,
  hygiene: 100,
  energy: 100,
};

export interface BlobbiVisualTraits {
  baseColor: string;
  secondaryColor: string;
  eyeColor: string;
  pattern: BlobbiPattern;
  specialMark: BlobbiSpecialMark;
  size: BlobbiSize;
}

/** Per-blobbi progression mission (hatch/evolve gate). */
export interface BlobbiMissionProgress {
  id: string;
  label: string;
  current: number;
  target: number;
  /** 'tally' = care-action counter; 'stats' = dynamic all-stats-≥-threshold. */
  kind: 'tally' | 'stats';
}

/** The main Blobbi entity. */
export interface Blobbi {
  id: string;
  name: string;
  seed: string;
  ownerPubkey?: string;

  lifeStage: BlobbiLifeStage;
  state: BlobbiActivityState;
  progressionState: BlobbiProgressionState;

  stats: BlobbiStats;
  traits: BlobbiVisualTraits;

  /** Seed-derived adult form (one of ADULT_FORMS). Resolved at evolve time. */
  adultForm?: string;
  personality: string;
  favoriteFood: string;

  experience: number;
  generation: number;
  careStreak: number;
  careStreakLastDay?: string;

  createdAt: number;
  lastInteraction: number;
  lastDecayAt: number;
  progressionStartedAt?: number;

  /** Active hatch/evolve missions while incubating/evolving. */
  progressionMissions: BlobbiMissionProgress[];
}

export function clampStat(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return STAT_MIN;
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)));
}

export function applyStat(current: number | undefined, delta: number | undefined): number {
  return clampStat((current ?? STAT_MIN) + (delta ?? 0));
}

export function isEgg(b: Blobbi): boolean {
  return b.lifeStage === 'egg';
}
export function isBaby(b: Blobbi): boolean {
  return b.lifeStage === 'baby';
}
export function isAdult(b: Blobbi): boolean {
  return b.lifeStage === 'adult';
}
export function isSleeping(b: Blobbi): boolean {
  return b.state === 'sleeping';
}

export function nowSeconds(now = Date.now()): number {
  return Math.floor(now / 1000);
}
