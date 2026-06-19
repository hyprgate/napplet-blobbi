// Emotion taxonomy + derivation — faithful port of Ditto's ui/lib/emotions,
// status-reactions, needDetection and the special-reaction machines. The full
// emotion set is preserved so the pixel renderer can express every state.

import type { BlobbiStats } from './types.js';

/** Every emotional/behavioral state a Blobbi can express. */
export type BlobbiEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'boring'
  | 'dirty'
  | 'angry'
  | 'surprised'
  | 'sleepy'
  | 'curious'
  | 'dizzy'
  | 'excited'
  | 'mischievous'
  | 'adoring'
  | 'hungry'
  | 'blissful'
  | 'eating'
  | 'chewing'
  | 'sick'
  | 'annoyed'
  | 'furious'
  | 'nauseated';

export type Severity = 'normal' | 'warning' | 'high' | 'critical';

/** Reactive stats and their low-state label. */
export const STAT_EMOTION: Record<keyof BlobbiStats, BlobbiEmotion> = {
  energy: 'sleepy',
  health: 'sick',
  hunger: 'hungry',
  hygiene: 'dirty',
  happiness: 'sad',
};

export function getSeverity(v: number): Severity {
  if (v < 30) return 'critical';
  if (v < 50) return 'high';
  if (v < 70) return 'warning';
  return 'normal';
}

const SEVERITY_RANK: Record<Severity, number> = { normal: 0, warning: 1, high: 2, critical: 3 };

/** Priority order used to break ties between equally-severe low stats. */
const PRIORITY: (keyof BlobbiStats)[] = ['energy', 'health', 'hunger', 'hygiene', 'happiness'];

/**
 * Resolve the dominant status emotion from current stats. Returns the most
 * severe unmet need (priority-ordered), critical health → dizzy, or a positive
 * mood when everything is well.
 */
export function resolveStatusEmotion(stats: BlobbiStats, sleeping: boolean): BlobbiEmotion {
  if (sleeping) return 'sleepy';

  if (getSeverity(stats.health) === 'critical') return 'dizzy';

  let best: { stat: keyof BlobbiStats; rank: number } | null = null;
  for (const stat of PRIORITY) {
    const sev = getSeverity(stats[stat]);
    if (sev === 'normal') continue;
    const rank = SEVERITY_RANK[sev];
    if (!best || rank > best.rank) best = { stat, rank };
  }
  if (best) return STAT_EMOTION[best.stat];

  // All stats ≥ 70 → positive mood. Very high → happy, otherwise content.
  const avg = (stats.hunger + stats.happiness + stats.health + stats.hygiene + stats.energy) / 5;
  return avg >= 90 ? 'happy' : 'neutral';
}

/** Transient emotion shown right after an action (ACTION_EMOTION_MAP). */
export const ACTION_EMOTION: Record<string, BlobbiEmotion> = {
  feed: 'blissful',
  play: 'excited',
  clean: 'surprised',
  medicine: 'adoring',
  boost: 'happy',
  play_music: 'happy',
  sing: 'excited',
  pet: 'adoring',
};

/** Need thresholds (needDetection.ts). Stat < threshold ⇒ that need is active. */
export const NEED_THRESHOLDS: Record<keyof BlobbiStats, number> = {
  hunger: 40,
  happiness: 35,
  hygiene: 30,
  health: 50,
  energy: 25,
};

export function activeNeeds(stats: BlobbiStats): (keyof BlobbiStats)[] {
  return (Object.keys(NEED_THRESHOLDS) as (keyof BlobbiStats)[]).filter(
    (k) => stats[k] < NEED_THRESHOLDS[k],
  );
}

export const EMOTION_LABEL: Record<BlobbiEmotion, string> = {
  neutral: 'content', happy: 'happy', sad: 'sad', boring: 'bored', dirty: 'dirty',
  angry: 'angry', surprised: 'surprised', sleepy: 'sleepy', curious: 'curious',
  dizzy: 'dizzy', excited: 'excited', mischievous: 'mischievous', adoring: 'adoring',
  hungry: 'hungry', blissful: 'blissful', eating: 'eating', chewing: 'chewing',
  sick: 'sick', annoyed: 'annoyed', furious: 'furious', nauseated: 'queasy',
};
