// Daily missions + progression (hatch/evolve) gates.
// Daily pool/targets/XP are verbatim from Ditto's daily-missions.ts. The
// hatch/evolve gates keep Ditto's interaction targets (7 / 21) and the
// maintain-stats gate (all ≥ 80); Ditto's theme/color-moment publish tasks are
// app-specific and are replaced by the care-interaction gate for this
// self-contained game.

import type { BlobbiLifeStage, BlobbiMissionProgress } from './types.js';

export type MissionTrigger =
  | 'interact' | 'feed' | 'clean' | 'medicine' | 'sing' | 'play_music' | 'sleep' | 'photo';

export interface DailyMissionDef {
  id: string;
  label: string;
  target: number;
  xp: number;
  weight: number;
  stages: BlobbiLifeStage[];
  trigger: MissionTrigger;
}

export interface DailyMission extends DailyMissionDef {
  current: number;
}

const BABY_ADULT: BlobbiLifeStage[] = ['baby', 'adult'];
const ALL_STAGES: BlobbiLifeStage[] = ['egg', 'baby', 'adult'];

export const DAILY_MISSION_POOL: DailyMissionDef[] = [
  { id: 'interact_3', label: 'Care for your Blobbi 3 times', target: 3, xp: 15, weight: 10, stages: BABY_ADULT, trigger: 'interact' },
  { id: 'interact_6', label: 'Care for your Blobbi 6 times', target: 6, xp: 30, weight: 8, stages: BABY_ADULT, trigger: 'interact' },
  { id: 'feed_1', label: 'Feed your Blobbi', target: 1, xp: 10, weight: 10, stages: BABY_ADULT, trigger: 'feed' },
  { id: 'feed_2', label: 'Feed your Blobbi twice', target: 2, xp: 20, weight: 8, stages: BABY_ADULT, trigger: 'feed' },
  { id: 'feed_3', label: 'Feed your Blobbi 3 times', target: 3, xp: 35, weight: 5, stages: BABY_ADULT, trigger: 'feed' },
  { id: 'sleep_1', label: 'Let your Blobbi sleep', target: 1, xp: 15, weight: 6, stages: BABY_ADULT, trigger: 'sleep' },
  { id: 'photo_1', label: 'Take a photo', target: 1, xp: 25, weight: 4, stages: BABY_ADULT, trigger: 'photo' },
  { id: 'photo_2', label: 'Take 2 photos', target: 2, xp: 40, weight: 2, stages: BABY_ADULT, trigger: 'photo' },
  { id: 'clean_1', label: 'Clean your Blobbi', target: 1, xp: 10, weight: 10, stages: ALL_STAGES, trigger: 'clean' },
  { id: 'clean_2', label: 'Clean your Blobbi twice', target: 2, xp: 20, weight: 6, stages: ALL_STAGES, trigger: 'clean' },
  { id: 'sing_1', label: 'Sing to your Blobbi', target: 1, xp: 15, weight: 6, stages: ALL_STAGES, trigger: 'sing' },
  { id: 'sing_2', label: 'Sing twice', target: 2, xp: 25, weight: 3, stages: ALL_STAGES, trigger: 'sing' },
  { id: 'play_music_1', label: 'Play music', target: 1, xp: 15, weight: 6, stages: ALL_STAGES, trigger: 'play_music' },
  { id: 'play_music_2', label: 'Play music twice', target: 2, xp: 25, weight: 3, stages: ALL_STAGES, trigger: 'play_music' },
  { id: 'medicine_1', label: 'Give medicine', target: 1, xp: 20, weight: 5, stages: ALL_STAGES, trigger: 'medicine' },
  { id: 'medicine_2', label: 'Give medicine twice', target: 2, xp: 35, weight: 3, stages: ALL_STAGES, trigger: 'medicine' },
];

export const DAILY_MISSION_COUNT = 3;
export const MAX_DAILY_REROLLS = 3;
export const DAILY_BONUS_XP = 50;

/** Deterministic per-day RNG so missions are stable across reloads. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function weightedPick(pool: DailyMissionDef[], rng: () => number): DailyMissionDef {
  const total = pool.reduce((a, m) => a + m.weight, 0);
  let r = rng() * total;
  for (const m of pool) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return pool[pool.length - 1]!;
}

/** Pick the day's missions, weighted, without replacement. Stage-filtered. */
export function selectDailyMissions(day: string, stage: BlobbiLifeStage): DailyMission[] {
  const rng = mulberry32(hashString(day));
  const available = DAILY_MISSION_POOL.filter((m) => m.stages.includes(stage));
  const chosen: DailyMissionDef[] = [];
  const used = new Set<string>();
  while (chosen.length < DAILY_MISSION_COUNT && used.size < available.length) {
    const remaining = available.filter((m) => !used.has(m.id));
    if (remaining.length === 0) break;
    const pick = weightedPick(remaining, rng);
    used.add(pick.id);
    chosen.push(pick);
  }
  return chosen.map((m) => ({ ...m, current: 0 }));
}

/** Pick a replacement mission excluding the given ids (reroll). */
export function selectReplacementMission(
  excludeIds: string[],
  stage: BlobbiLifeStage,
): DailyMission | null {
  const available = DAILY_MISSION_POOL.filter(
    (m) => m.stages.includes(stage) && !excludeIds.includes(m.id),
  );
  if (available.length === 0) return null;
  const pick = weightedPick(available, Math.random);
  return { ...pick, current: 0 };
}

export function missionComplete(m: DailyMission): boolean {
  return m.current >= m.target;
}

export function totalDailyXp(missions: DailyMission[]): number {
  const earned = missions.filter(missionComplete).reduce((a, m) => a + m.xp, 0);
  const bonus = missions.length > 0 && missions.every(missionComplete) ? DAILY_BONUS_XP : 0;
  return earned + bonus;
}

/** Which daily-mission triggers a given action fires. */
export function triggersForAction(action: string): MissionTrigger[] {
  switch (action) {
    case 'feed': return ['interact', 'feed'];
    case 'clean': return ['interact', 'clean'];
    case 'medicine': return ['interact', 'medicine'];
    case 'play': return ['interact'];
    case 'boost': return ['interact'];
    case 'play_music': return ['interact', 'play_music'];
    case 'sing': return ['interact', 'sing'];
    case 'sleep': return ['sleep'];
    case 'photo': return ['photo'];
    default: return [];
  }
}

export const HATCH_REQUIRED_INTERACTIONS = 7;
export const EVOLVE_REQUIRED_INTERACTIONS = 21;
export const EVOLVE_STAT_THRESHOLD = 80;

export function makeHatchMissions(): BlobbiMissionProgress[] {
  return [
    { id: 'interactions', label: `Care for your egg ${HATCH_REQUIRED_INTERACTIONS} times`, current: 0, target: HATCH_REQUIRED_INTERACTIONS, kind: 'tally' },
  ];
}

export function makeEvolveMissions(): BlobbiMissionProgress[] {
  return [
    { id: 'interactions', label: `Care for your Blobbi ${EVOLVE_REQUIRED_INTERACTIONS} times`, current: 0, target: EVOLVE_REQUIRED_INTERACTIONS, kind: 'tally' },
    { id: 'maintain_stats', label: `Get all stats to ${EVOLVE_STAT_THRESHOLD}+`, current: 0, target: EVOLVE_STAT_THRESHOLD, kind: 'stats' },
  ];
}
