// Care-action engine. Each action first applies accumulated decay, then the
// effect, then bookkeeping (last_decay_at, last_interaction, XP, streak,
// progression tally). Mirrors Ditto's action hooks. Pure: returns a new Blobbi.

import { applyBlobbiDecay } from './decay.js';
import {
  ACTION_XP,
  DIRECT_ACTION_HAPPINESS,
  type CareAction,
  CATEGORY_ACTION,
  shopItem,
} from './shop.js';
import { calculateStreakUpdate } from './streak.js';
import {
  applyStat,
  type Blobbi,
  type BlobbiStats,
  nowSeconds,
  STAT_MAX,
} from './types.js';

export interface ActionResult {
  blobbi: Blobbi;
  xp: number;
  error?: string;
}

const EGG_ALLOWED: CareAction[] = ['medicine', 'clean'];

/** Apply decay up to `now` and reset the decay checkpoint. */
function settleDecay(b: Blobbi, nowSec: number): Blobbi {
  const stats = applyBlobbiDecay({
    stage: b.lifeStage,
    state: b.state,
    stats: b.stats,
    lastDecayAt: b.lastDecayAt,
    now: nowSec,
  });
  return { ...b, stats, lastDecayAt: nowSec };
}

/** Update streak + interaction timestamp, and bump progression tally. */
function finalizeInteraction(b: Blobbi, nowMs: number): Blobbi {
  const nowSec = nowSeconds(nowMs);
  const streak = calculateStreakUpdate(b.careStreak, b.careStreakLastDay, nowMs);
  const progressionMissions = b.progressionState === 'none'
    ? b.progressionMissions
    : b.progressionMissions.map((m) =>
        m.kind === 'tally' && m.id === 'interactions'
          ? { ...m, current: Math.min(m.target, m.current + 1) }
          : m,
      );
  return {
    ...b,
    lastInteraction: nowSec,
    careStreak: streak.streak,
    careStreakLastDay: streak.lastDay,
    progressionMissions,
  };
}

/** Use an inventory/shop item on the Blobbi. */
export function applyItemAction(blobbi: Blobbi, itemId: string, nowMs = Date.now()): ActionResult {
  const item = shopItem(itemId);
  if (!item) return { blobbi, xp: 0, error: 'Unknown item' };
  const action = CATEGORY_ACTION[item.category];
  const nowSec = nowSeconds(nowMs);
  let b = settleDecay(blobbi, nowSec);

  if (b.lifeStage === 'egg') {
    if (!EGG_ALLOWED.includes(action)) {
      return { blobbi, xp: 0, error: 'Eggs can only be cleaned or given medicine' };
    }
    const next: BlobbiStats = { ...b.stats, hunger: STAT_MAX, energy: STAT_MAX };
    if (action === 'medicine') {
      if (!item.effect.health) return { blobbi, xp: 0, error: 'This medicine has no effect on eggs' };
      next.health = applyStat(next.health, item.effect.health);
    } else if (action === 'clean') {
      if (!item.effect.hygiene) return { blobbi, xp: 0, error: 'This has no cleaning effect on eggs' };
      next.hygiene = applyStat(next.hygiene, item.effect.hygiene);
      if (item.effect.happiness) next.happiness = applyStat(next.happiness, item.effect.happiness);
    }
    b = { ...b, stats: next };
    b = finalizeInteraction(b, nowMs);
    const xp = ACTION_XP[action] ?? 0;
    return { blobbi: { ...b, experience: b.experience + xp }, xp };
  }

  // Baby / adult
  if (action === 'play') {
    const energyCost = Math.abs(item.effect.energy ?? 0);
    if (energyCost > 0 && b.stats.energy < energyCost) {
      return { blobbi, xp: 0, error: `Needs at least ${energyCost} energy to play with this` };
    }
    if (b.stats.happiness >= STAT_MAX && energyCost === 0) {
      return { blobbi, xp: 0, error: 'Playing would have no effect right now' };
    }
  }

  const next: BlobbiStats = { ...b.stats };
  for (const [k, delta] of Object.entries(item.effect)) {
    const key = k as keyof BlobbiStats;
    next[key] = applyStat(next[key], delta as number);
  }
  b = { ...b, stats: next };
  b = finalizeInteraction(b, nowMs);
  const xp = ACTION_XP[action] ?? 0;
  return { blobbi: { ...b, experience: b.experience + xp }, xp };
}

/** Direct action with no item — play_music / sing (happiness only). */
export function applyDirectAction(blobbi: Blobbi, action: 'play_music' | 'sing', nowMs = Date.now()): ActionResult {
  const nowSec = nowSeconds(nowMs);
  let b = settleDecay(blobbi, nowSec);
  const before = b.stats.happiness;
  const next = { ...b.stats, happiness: applyStat(b.stats.happiness, DIRECT_ACTION_HAPPINESS[action]) };
  b = { ...b, stats: next };
  b = finalizeInteraction(b, nowMs);
  const happinessChanged = next.happiness !== before;
  const xp = happinessChanged ? ACTION_XP[action] ?? 0 : 0;
  return { blobbi: { ...b, experience: b.experience + xp }, xp };
}

/** Toggle sleep state. Settles decay at the toggle boundary. */
export function setSleeping(blobbi: Blobbi, sleeping: boolean, nowMs = Date.now()): Blobbi {
  const nowSec = nowSeconds(nowMs);
  const b = settleDecay(blobbi, nowSec);
  return { ...b, state: sleeping ? 'sleeping' : 'active' };
}

/** Refresh stats to `now` without an interaction (used by the tick loop). */
export function refreshDecay(blobbi: Blobbi, nowMs = Date.now()): Blobbi {
  return settleDecay(blobbi, nowSeconds(nowMs));
}
