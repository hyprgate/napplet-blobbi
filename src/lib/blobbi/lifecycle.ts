// Blobbi lifecycle: creation, hatch (egg→baby), evolve (baby→adult), and the
// progression gates. Mirrors Ditto's stage-transition semantics:
//   - hatch resets all baby stats to 100, then auto-starts evolution
//   - evolve preserves (decayed) stats and picks the seed-derived adult form

import {
  EVOLVE_REQUIRED_INTERACTIONS,
  EVOLVE_STAT_THRESHOLD,
  HATCH_REQUIRED_INTERACTIONS,
  makeEvolveMissions,
  makeHatchMissions,
} from './missions.js';
import {
  deriveAdultForm,
  deriveFavoriteFood,
  derivePersonality,
  deriveTraits,
  generateSeed,
} from './seed.js';
import {
  type Blobbi,
  DEFAULT_BLOBBI_STATS,
  nowSeconds,
  STAT_KEYS,
  STAT_MAX,
} from './types.js';

let counter = 0;
function makeId(): string {
  counter += 1;
  return `blobbi-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface CreateEggOptions {
  name?: string;
  seed?: string;
  ownerPubkey?: string;
  now?: number;
}

/** Create a fresh egg, already incubating with hatch missions seeded. */
export function createEgg(opts: CreateEggOptions = {}): Blobbi {
  const seed = opts.seed ?? generateSeed();
  const nowMs = opts.now ?? Date.now();
  const sec = nowSeconds(nowMs);
  return {
    id: makeId(),
    name: opts.name?.trim() || 'Blobbi',
    seed,
    ownerPubkey: opts.ownerPubkey,
    lifeStage: 'egg',
    state: 'active',
    progressionState: 'incubating',
    stats: { ...DEFAULT_BLOBBI_STATS },
    traits: deriveTraits(seed),
    personality: derivePersonality(seed),
    favoriteFood: deriveFavoriteFood(seed),
    experience: 0,
    generation: 1,
    careStreak: 1,
    careStreakLastDay: undefined,
    createdAt: sec,
    lastInteraction: sec,
    lastDecayAt: sec,
    progressionStartedAt: sec,
    progressionMissions: makeHatchMissions(),
  };
}

/** Recompute the dynamic maintain-stats mission from current stats. */
export function refreshProgressionMissions(b: Blobbi): Blobbi {
  if (b.progressionState === 'none') return b;
  const statsOk = STAT_KEYS.every((k) => b.stats[k] >= EVOLVE_STAT_THRESHOLD);
  const minStat = Math.min(...STAT_KEYS.map((k) => b.stats[k]));
  const progressionMissions = b.progressionMissions.map((m) =>
    m.kind === 'stats'
      ? { ...m, current: statsOk ? EVOLVE_STAT_THRESHOLD : minStat }
      : m,
  );
  return { ...b, progressionMissions };
}

export function hatchProgress(b: Blobbi): number {
  const m = b.progressionMissions.find((x) => x.id === 'interactions');
  return m ? Math.min(1, m.current / m.target) : 0;
}

export function canHatch(b: Blobbi): boolean {
  if (b.lifeStage !== 'egg' || b.progressionState !== 'incubating') return false;
  const m = b.progressionMissions.find((x) => x.id === 'interactions');
  return !!m && m.current >= HATCH_REQUIRED_INTERACTIONS;
}

export function canEvolve(b: Blobbi): boolean {
  if (b.lifeStage !== 'baby' || b.progressionState !== 'evolving') return false;
  const interactions = b.progressionMissions.find((x) => x.id === 'interactions');
  const interactionsOk = !!interactions && interactions.current >= EVOLVE_REQUIRED_INTERACTIONS;
  const statsOk = STAT_KEYS.every((k) => b.stats[k] >= EVOLVE_STAT_THRESHOLD);
  return interactionsOk && statsOk;
}

/** Egg → baby. Resets stats to 100 and auto-starts evolution. */
export function hatchToBaby(b: Blobbi, now = Date.now()): Blobbi {
  const sec = nowSeconds(now);
  return {
    ...b,
    lifeStage: 'baby',
    state: 'active',
    progressionState: 'evolving',
    stats: { ...DEFAULT_BLOBBI_STATS },
    lastDecayAt: sec,
    lastInteraction: sec,
    progressionStartedAt: sec,
    progressionMissions: makeEvolveMissions(),
  };
}

/** Baby → adult. Preserves stats; picks the seed-derived adult form. */
export function evolveToAdult(b: Blobbi, now = Date.now()): Blobbi {
  const sec = nowSeconds(now);
  return {
    ...b,
    lifeStage: 'adult',
    state: 'active',
    progressionState: 'none',
    adultForm: deriveAdultForm(b.seed),
    lastDecayAt: sec,
    lastInteraction: sec,
    progressionStartedAt: undefined,
    progressionMissions: [],
  };
}

export { STAT_MAX };
