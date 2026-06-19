// Stat decay engine — faithful port of Ditto's core/lib/blobbi-decay.ts.
// Continuous proportional decay computed purely from elapsed time. Rates are
// per hour. delta = rate * elapsedHours, then Math.trunc (toward zero), then
// clamp to [1, 100]. Eggs do not decay. Sleeping slows decay and regenerates
// energy. Health is derived from the post-decay values of the other 4 stats.

import {
  type BlobbiActivityState,
  type BlobbiLifeStage,
  type BlobbiStats,
  DEFAULT_BLOBBI_STATS,
  STAT_MAX,
  STAT_MIN,
} from './types.js';

const SLEEP_STAT_DECAY_FRACTION = 0.2;
const SLEEP_HEALTH_PENALTY_FRACTION = 0.25;
const BABY_SLEEP_ENERGY_REGEN = 40.0;
const ADULT_SLEEP_ENERGY_REGEN = 35.0;

interface AwakeRates {
  hunger: number;
  happiness: number;
  hygiene: number;
  energy: number;
}

const BABY_RATES: AwakeRates = { hunger: -8.0, happiness: -4.5, hygiene: -6.0, energy: -9.0 };
const ADULT_RATES: AwakeRates = { hunger: -5.0, happiness: -2.5, hygiene: -4.0, energy: -5.5 };

function clamp(v: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, v));
}

export interface DecayInput {
  stage: BlobbiLifeStage;
  state: BlobbiActivityState;
  stats: Partial<BlobbiStats>;
  lastDecayAt: number; // unix seconds
  now?: number; // unix seconds
}

/** Baby health delta per hour, evaluated against post-decay stats (≤ thresholds). */
function babyHealthDeltaPerHour(s: BlobbiStats, sleeping: boolean): number {
  let delta = sleeping ? 0 : -0.4;
  const penaltyScale = sleeping ? SLEEP_HEALTH_PENALTY_FRACTION : 1;
  for (const v of [s.hunger, s.hygiene, s.energy, s.happiness]) {
    let p = 0;
    if (v <= 50) p += -0.5;
    if (v <= 25) p += -1.0;
    delta += p * penaltyScale;
  }
  if (s.hunger >= 76 && s.happiness >= 76 && s.hygiene >= 76 && s.energy >= 76) {
    delta += 1.5;
  }
  return delta;
}

/** Adult health delta per hour, evaluated against post-decay stats (< thresholds). */
function adultHealthDeltaPerHour(s: BlobbiStats, sleeping: boolean): number {
  let delta = sleeping ? 0 : -0.25;
  const scale = sleeping ? SLEEP_HEALTH_PENALTY_FRACTION : 1;
  let p = 0;
  if (s.hunger < 60) p += -0.5;
  if (s.hunger < 30) p += -1.0;
  if (s.hygiene < 60) p += -0.5;
  if (s.hygiene < 30) p += -1.0;
  if (s.energy < 40) p += -0.4;
  if (s.energy < 20) p += -0.8;
  if (s.happiness < 40) p += -0.4;
  if (s.happiness < 20) p += -0.8;
  delta += p * scale;
  if (s.hunger >= 80 && s.happiness >= 80 && s.hygiene >= 80 && s.energy >= 80) {
    delta += 1.0;
  }
  return delta;
}

/** Apply accumulated decay and return the new stats. Pure. */
export function applyBlobbiDecay(input: DecayInput): BlobbiStats {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const stored: BlobbiStats = { ...DEFAULT_BLOBBI_STATS, ...input.stats };

  // Eggs do not decay; hunger/energy are pinned full.
  if (input.stage === 'egg') {
    return { ...stored, hunger: STAT_MAX, energy: STAT_MAX };
  }

  const elapsedSeconds = Math.max(0, now - input.lastDecayAt);
  if (elapsedSeconds === 0) return stored;
  const hours = elapsedSeconds / 3600;

  const sleeping = input.state === 'sleeping';
  const isBaby = input.stage === 'baby';
  const rates = isBaby ? BABY_RATES : ADULT_RATES;
  const statScale = sleeping ? SLEEP_STAT_DECAY_FRACTION : 1;

  const next: BlobbiStats = { ...stored };

  next.hunger = clamp(stored.hunger + Math.trunc(rates.hunger * statScale * hours));
  next.happiness = clamp(stored.happiness + Math.trunc(rates.happiness * statScale * hours));
  next.hygiene = clamp(stored.hygiene + Math.trunc(rates.hygiene * statScale * hours));

  if (sleeping) {
    const regen = isBaby ? BABY_SLEEP_ENERGY_REGEN : ADULT_SLEEP_ENERGY_REGEN;
    next.energy = clamp(stored.energy + Math.trunc(regen * hours));
  } else {
    next.energy = clamp(stored.energy + Math.trunc(rates.energy * hours));
  }

  // Health derived from post-decay values of the other four stats.
  const healthRate = isBaby
    ? babyHealthDeltaPerHour(next, sleeping)
    : adultHealthDeltaPerHour(next, sleeping);
  next.health = clamp(stored.health + Math.trunc(healthRate * hours));

  return next;
}
